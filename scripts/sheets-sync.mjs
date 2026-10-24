#!/usr/bin/env node
/**
 * scripts/sheets-sync.mjs
 * Capa de almacenamiento de leads (LeadStore) con adaptadores para Google Sheets ('gsheets' CLI)
 * y en memoria para pruebas deterministas.
 * Ningún módulo externo invoca el CLI 'gsheets' directamente.
 */

import { execFileSync } from 'node:child_process';

export const SHEET_COLUMNS_COUNT = 18;
export const DEFAULT_SPREADSHEET_ID = '1fIr3Lug-AALrlGN-Lr3N1syYmMVYTTCaNy0vfXEH2qY';
export const DEFAULT_SHEET_TAB = 'Prospección NexoBow';
export const DEFAULT_SHEET_RANGE = `'${DEFAULT_SHEET_TAB}'!B11:S1000`;
export const DEFAULT_APPEND_ANCHOR = `'${DEFAULT_SHEET_TAB}'!B11`;
export const DEFAULT_KPI_RANGE = `'${DEFAULT_SHEET_TAB}'!A1:S10`;

/**
 * Construye la URL pública oficial de preview con barra final obligatoria.
 */
export function buildPreviewUrl(slug = '', rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || 'nexobow.site') {
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) return '';
  return `https://preview.${rootDomain}/${cleanSlug}/`;
}

/**
 * Normaliza teléfonos quitando espacios, guiones y signos para comparación.
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^\d+]/g, '');
}

/**
 * Normaliza nombres quitando puntuación y mayúsculas.
 */
export function normalizeText(text) {
  if (!text) return '';
  return String(text).toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
}

/**
 * Abrevia el rubro o nicho para el slug correlativo ({id}-{nombre}-{apellido}-{rubro}).
 */
export function abbreviateRubro(nicho = '') {
  const clean = String(nicho)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (clean.includes('nutri')) return 'nutri';
  if (clean.includes('psico')) return 'psico';
  if (clean.includes('abog') || clean.includes('jurid') || clean.includes('legal')) return 'abogado';
  if (clean.includes('odont')) return 'odonto';
  if (clean.includes('kine')) return 'kine';
  if (clean.includes('med') || clean.includes('clin')) return 'medico';
  if (clean.includes('cont')) return 'contador';

  const firstToken = clean.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)[0];
  return firstToken || 'servicios';
}

/**
 * Construye el slug correlativo 1 a 1 entre la fila del Google Sheet y el archivo Markdown:
 * Ejemplo: { id: 22, displayName: "Lic. Alejandra Martínez", nicho: "nutricionista" } -> "22-alejandra-martinez-nutri"
 */
export function buildCorrelativeSlug({ id, displayName = '', nicho = 'nutricionista' } = {}) {
  const cleanId = String(id ?? '0').trim() || '0';
  const basePart = String(displayName)
    .split(/\s+[-|—–]\s+|,/)[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const stopTitles = new Set([
    'lic',
    'licenciada',
    'licenciado',
    'dr',
    'dra',
    'doctor',
    'doctora',
    'mg',
    'esp',
    'odont',
    'kgo',
    'ing',
    'cont',
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'y',
    'e',
    'en',
    'asoc',
    'asociados',
    'nutricion',
    'nutricionista'
  ]);

  const rawTokens = basePart
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !stopTitles.has(tok));

  // Omitir iniciales de una sola letra (ej: "m" en "lucia m vega") si hay más de 2 tokens
  const tokens =
    rawTokens.length > 2
      ? rawTokens.filter((tok) => tok.length > 1)
      : rawTokens;

  const nameTokens = tokens.length >= 2 ? tokens.slice(0, 2) : tokens.length === 1 ? tokens : ['profesional'];
  const rubroShort = abbreviateRubro(nicho);

  return `${cleanId}-${nameTokens.join('-')}-${rubroShort}`;
}

/**
 * Determina si una URL corresponde a un sitio web corporativo propio existente.
 */
export function isExcludedWebsite(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return false;
  }
  const clean = url.trim().toLowerCase();
  const allowedDirectoriesOrSocials = [
    'instagram.com',
    'facebook.com',
    'linktr.ee',
    'doctoralia.com',
    'linkedin.com',
    'wa.me',
    'whatsapp.com',
    'google.com',
    'maps.google.com'
  ];

  return !allowedDirectoriesOrSocials.some((domain) => clean.includes(domain));
}

/**
 * Filtra prospectos elegibles deduplicando contra el Sheet y omitiendo webs corporativas.
 */
export function filterEligiblePlaces(places, existingKeys = [], limit = 10) {
  const normalizedExisting = new Set(existingKeys.map((k) => normalizeText(k)));

  const eligible = [];
  for (const place of places) {
    if (eligible.length >= limit) break;

    const normName = normalizeText(place.displayName);
    const normPhone = normalizePhone(place.nationalPhoneNumber);

    if (normName && normalizedExisting.has(normName)) {
      continue;
    }
    if (normPhone && normalizedExisting.has(normPhone)) {
      continue;
    }

    if (isExcludedWebsite(place.websiteUri)) {
      continue;
    }

    eligible.push(place);
  }

  return eligible;
}

/**
 * Escapa comas y comillas de cada celda para escritura atómica de 18 columnas.
 */
export function escapeSheetRowValues(row = []) {
  return row
    .map((val) =>
      String(val ?? '')
        .replace(/\r?\n/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/,/g, '\\,')
    )
    .join(',');
}

/**
 * Formatea un prospecto al esquema oficial de 18 columnas de 'Prospección NexoBow' (Columna B a S).
 */
export function formatLeadToSheetRow(lead, rowNumber, customPitchTemplate = null) {
  const normPhone = normalizePhone(lead.nationalPhoneNumber || lead.telefono || lead.whatsapp);
  const waDigits = normPhone.replace(/\+/g, '');
  const resolvedSlug =
    lead.slug ||
    buildCorrelativeSlug({
      id: rowNumber,
      displayName: lead.displayName || lead.nombre,
      nicho: lead.nicho || lead.rubro
    });
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || 'nexobow.site';
  const demoUrl = resolvedSlug ? buildPreviewUrl(resolvedSlug, rootDomain) : '';

  let rawMessage = `Hola ${lead.displayName || lead.nombre || ''}! Estuve viendo su perfil y preparé una propuesta para agendar consultas sin depender de secretaría. Se las dejo acá: ${demoUrl}`;
  if (customPitchTemplate) {
    rawMessage = customPitchTemplate
      .replace(/{nombre}/g, lead.displayName || lead.nombre || '')
      .replace(/{demoUrl}/g, demoUrl);
  }

  const pitchText = encodeURIComponent(rawMessage);
  const waLink = waDigits ? `https://wa.me/${waDigits}?text=${pitchText}` : '';

  const today = new Date().toISOString().split('T')[0];
  const ratingStr = lead.rating ? `★ ${lead.rating} (${lead.userRatingCount || 0} reseñas Google Maps)` : 'Google Maps';
  const notes = `${ratingStr}. Sin web propia detectada.`;

  return [
    rowNumber,                                                  // 1 (Col B). Nº / ID
    lead.displayName || lead.nombre || 'Profesional',           // 2 (Col C). Prospecto / Clínica
    lead.nicho || lead.rubro || 'Salud / Servicios',            // 3 (Col D). Nicho
    'WhatsApp',                                                 // 4 (Col E). Canal Contacto
    waLink,                                                     // 5 (Col F). WhatsApp (link)
    demoUrl,                                                    // 6 (Col G). Web Demo URL
    lead.instagram || '',                                       // 7 (Col H). Usuario / Enlace
    lead.formattedAddress || lead.direccion || 'Buenos Aires',  // 8 (Col I). Ubicación
    '1. Prospecto Identificado',                                // 9 (Col J). Estado del Lead
    today,                                                      // 10 (Col K). 1er Contacto
    '',                                                         // 11 (Col L). Último Contacto
    'Sin Contactar',                                            // 12 (Col M). Respuesta
    'No',                                                       // 13 (Col N). Reunión?
    '',                                                         // 14 (Col O). Fecha Reunión
    '$189.999 ARS',                                             // 15 (Col P). Valor Potencial
    'En Proceso',                                               // 16 (Col Q). Estado Negocio
    notes,                                                      // 17 (Col R). Próximo Paso / Notas
    normPhone                                                   // 18 (Col S). Teléfono normalizado / Observaciones
  ];
}

/**
 * Calcula el próximo ID correlativo leyendo la Columna B (índice 0) de las filas existentes,
 * incluso si hay filas sin nombre o sin teléfono.
 */
export function getNextSheetId(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return 1;
  let maxId = 0;
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const idNum = Number(String(row[0] ?? '').trim());
    if (Number.isFinite(idNum) && idNum > maxId) {
      maxId = idNum;
    }
  }
  return maxId + 1;
}

/**
 * Lee todas las filas de prospectos en el rango oficial B11:S1000.
 */
export function fetchSheetRows(spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  try {
    const stdout = execFileSync('gsheets', ['readonly', 'read', spreadsheetId, `'${tab}'!B11:S1000`, '--json'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed.filter(Array.isArray) : [];
  } catch {
    return [];
  }
}

/**
 * Lee el bloque superior de KPIs (A1:S10) del Google Sheet.
 */
export function fetchSheetKpiBlock(spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  try {
    const stdout = execFileSync('gsheets', ['readonly', 'read', spreadsheetId, `'${tab}'!A1:S10`, '--json'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Extrae las claves existentes (nombres y teléfonos) a partir de un conjunto de filas o desde el Sheet.
 */
export function extractExistingKeysFromRows(rows = []) {
  const keys = [];
  if (!Array.isArray(rows)) return keys;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const name = row[1]; // Columna C: Prospecto / Clínica
    const waCol = row[4]; // Columna F: WhatsApp (link)
    const rawPhoneCol = row[17]; // Columna S: Teléfono normalizado
    if (name) keys.push(String(name));
    if (rawPhoneCol) keys.push(normalizePhone(rawPhoneCol));
    else if (waCol) keys.push(normalizePhone(waCol));
  }
  return keys;
}

/**
 * Lee los prospectos existentes del Google Sheet (desde Columna B) para deduplicación.
 */
export function fetchExistingSheetKeys(spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  const rows = fetchSheetRows(spreadsheetId, tab);
  return extractExistingKeysFromRows(rows);
}

/**
 * Añade una fila de 18 columnas al Google Sheet en una sola operación anclando en Columna B ('Prospección NexoBow'!B11).
 */
export function appendRowToSheet(row, spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  const escapedRow = escapeSheetRowValues(row);
  execFileSync('gsheets', ['mutate', 'append', spreadsheetId, `'${tab}'!B11`, escapedRow], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit']
  });
}

/**
 * Actualiza una celda individual (ej. G15) en Google Sheets.
 */
export function updateSheetCell(cellA1, value, spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  execFileSync('gsheets', ['mutate', 'write', spreadsheetId, `'${tab}'!${cellA1}`, String(value ?? '')], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
}

/**
 * Construye una instancia de la interfaz LeadStore sobre callbacks inyectables.
 */
export function createSheetsAdapter({
  readRows = () => fetchSheetRows(),
  readKpiRows = () => fetchSheetKpiBlock(),
  appendRow = (row) => appendRowToSheet(row),
  updateCell = (cellA1, value) => updateSheetCell(cellA1, value)
} = {}) {
  return {
    readRows,
    readKpiRows,
    appendRow,
    updateCell,
    getExistingKeys() {
      return extractExistingKeysFromRows(readRows());
    },
    getNextId() {
      return getNextSheetId(readRows());
    },
    appendLead(lead = {}, optionsOrPitch = null) {
      const isOptionsObj =
        optionsOrPitch !== null && typeof optionsOrPitch === 'object' && !Array.isArray(optionsOrPitch);
      const customPitchTemplate = isOptionsObj ? optionsOrPitch.pitchOverride || null : optionsOrPitch;
      const expectedId = isOptionsObj ? optionsOrPitch.expectedId : undefined;
      const abortOnCollision = Boolean(
        lead.abortOnCollision || (isOptionsObj && optionsOrPitch.abortOnCollision)
      );

      const currentRows = readRows();
      const takenIds = new Set(
        currentRows
          .filter(Array.isArray)
          .map((r) => Number(String(r[0] ?? '').trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      );

      let requestedId = Number(expectedId ?? lead.id ?? lead.sheet_id);
      let collisionResolved = false;

      if (!Number.isFinite(requestedId) || requestedId <= 0) {
        requestedId = getNextSheetId(currentRows);
      } else if (takenIds.has(requestedId)) {
        if (abortOnCollision) {
          throw new Error(`Colisión de ID en Columna B: el ID #${requestedId} ya fue tomado.`);
        }
        requestedId = getNextSheetId(currentRows);
        collisionResolved = true;
      }

      const slug =
        !collisionResolved && lead.slug
          ? lead.slug
          : buildCorrelativeSlug({
              id: requestedId,
              displayName: lead.displayName || lead.nombre || '',
              nicho: lead.nicho || lead.rubro || 'nutricionista'
            });

      const row = formatLeadToSheetRow({ ...lead, slug }, requestedId, customPitchTemplate);
      appendRow(row);
      return {
        id: requestedId,
        slug,
        row,
        collisionResolved,
        collisionRetried: collisionResolved
      };
    },
    updatePreviewUrl({ sheetId, slug, previewUrl } = {}) {
      const rows = readRows();
      const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
      const targetUrl = previewUrl || buildPreviewUrl(cleanSlug);
      if (!targetUrl) return { updated: false, reason: 'missing-url' };

      const targetId = Number(sheetId);
      let rowIndex = -1;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!Array.isArray(r)) continue;
        const rowId = Number(String(r[0] ?? '').trim());
        const existingDemo = String(r[5] ?? '');
        if ((Number.isFinite(targetId) && targetId > 0 && rowId === targetId) || (cleanSlug && existingDemo.includes(cleanSlug))) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        return { updated: false, reason: 'not-found' };
      }

      const sheetRowNumber = 11 + rowIndex;
      const cell = `G${sheetRowNumber}`;
      const currentCellVal = String(rows[rowIndex]?.[5] ?? '');
      if (currentCellVal === targetUrl) {
        return { updated: false, reason: 'unchanged', rowIndex, sheetRowNumber, cell, previewUrl: targetUrl };
      }

      updateCell(cell, targetUrl, rowIndex, 5);
      return { updated: true, rowIndex, sheetRowNumber, cell, previewUrl: targetUrl };
    }
  };
}

/**
 * Crea un LeadStore en memoria para tests deterministas sin red.
 */
export function createInMemoryLeadStore({ initialRows = [], initialKpiRows = [] } = {}) {
  const rows = initialRows.map((r) => [...r]);
  const kpiRows = initialKpiRows.map((r) => [...r]);

  return createSheetsAdapter({
    readRows: () => rows,
    readKpiRows: () => kpiRows,
    appendRow: (row) => {
      rows.push([...row]);
    },
    updateCell: (_cellA1, value, rowIndex, colIndex) => {
      if (rowIndex !== undefined && colIndex !== undefined && rows[rowIndex]) {
        rows[rowIndex][colIndex] = value;
      }
    }
  });
}

/**
 * Instancia por defecto conectada al Google Sheet de producción.
 */
export const defaultLeadStore = createSheetsAdapter();
