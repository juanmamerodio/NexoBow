#!/usr/bin/env node
/**
 * scripts/sheets-sync.mjs
 * Módulo de integración ligera con Google Sheets mediante CLI nativo 'gsheets'.
 * Gestiona deduplicación, filtro de sitios web existentes, correlatividad de slugs
 * y formateo a 18 columnas comenzando en la Columna B ('Prospección NexoBow'!B11:S1000).
 */

import { execFileSync } from 'node:child_process';

export const SHEET_COLUMNS_COUNT = 18;
export const DEFAULT_SPREADSHEET_ID = '1fIr3Lug-AALrlGN-Lr3N1syYmMVYTTCaNy0vfXEH2qY';
export const DEFAULT_SHEET_TAB = 'Prospección NexoBow';
export const DEFAULT_SHEET_RANGE = `'${DEFAULT_SHEET_TAB}'!B11:S1000`;
export const DEFAULT_APPEND_ANCHOR = `'${DEFAULT_SHEET_TAB}'!B11`;

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
    'asoc',
    'asociados'
  ]);

  const tokens = basePart
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !stopTitles.has(tok));

  const nameTokens = tokens.length >= 2 ? tokens.slice(0, 2) : tokens.length === 1 ? tokens : ['profesional'];
  const rubroShort = abbreviateRubro(nicho);

  return `${cleanId}-${nameTokens.join('-')}-${rubroShort}`;
}

/**
 * Determina si una URL corresponde a un sitio web corporativo propio existente.
 * Retorna true si tiene web propia (excluyendo redes sociales o directorios).
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

  return !allowedDirectoriesOrSocials.some(domain => clean.includes(domain));
}

/**
 * Filtra prospectos elegibles deduplicando contra el Sheet y omitiendo webs corporativas.
 */
export function filterEligiblePlaces(places, existingKeys = [], limit = 10) {
  const normalizedExisting = new Set(existingKeys.map(k => normalizeText(k)));

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
 * Formatea un prospecto al esquema oficial de 18 columnas de 'Prospección NexoBow' (Columna B a S).
 */
export function formatLeadToSheetRow(lead, rowNumber, customPitchTemplate = null) {
  const normPhone = normalizePhone(lead.nationalPhoneNumber);
  const waDigits = normPhone.replace(/\+/g, '');
  const resolvedSlug =
    lead.slug ||
    buildCorrelativeSlug({
      id: rowNumber,
      displayName: lead.displayName,
      nicho: lead.nicho
    });
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || 'nexobow.site';
  const demoUrl = resolvedSlug ? `https://preview.${rootDomain}/${resolvedSlug}` : '';

  let rawMessage = `Hola ${lead.displayName || ''}! Estuve viendo su perfil y preparé una propuesta para agendar consultas sin depender de secretaría. Se las dejo acá: ${demoUrl}`;
  if (customPitchTemplate) {
    rawMessage = customPitchTemplate
      .replace(/{nombre}/g, lead.displayName || '')
      .replace(/{demoUrl}/g, demoUrl);
  }

  const pitchText = encodeURIComponent(rawMessage);
  const waLink = waDigits ? `https://wa.me/${waDigits}?text=${pitchText}` : '';

  const today = new Date().toISOString().split('T')[0];
  const ratingStr = lead.rating ? `★ ${lead.rating} (${lead.userRatingCount || 0} reseñas Google Maps)` : 'Google Maps';
  const notes = `${ratingStr}. Sin web propia detectada.`;

  return [
    rowNumber,                                // 1 (Col B). Nº / ID
    lead.displayName || 'Profesional',        // 2 (Col C). Prospecto / Clínica
    lead.nicho || 'Salud / Servicios',        // 3 (Col D). Nicho
    'WhatsApp',                               // 4 (Col E). Canal Contacto
    waLink,                                   // 5 (Col F). WhatsApp (link)
    demoUrl,                                  // 6 (Col G). Web Demo URL
    lead.instagram || '',                     // 7 (Col H). Usuario / Enlace
    lead.formattedAddress || 'Buenos Aires',  // 8 (Col I). Ubicación
    '1. Prospecto Identificado',               // 9 (Col J). Estado del Lead
    today,                                    // 10 (Col K). 1er Contacto
    '',                                       // 11 (Col L). Último Contacto
    'Sin Contactar',                          // 12 (Col M). Respuesta
    'No',                                     // 13 (Col N). Reunión?
    '',                                       // 14 (Col O). Fecha Reunión
    '$189.999 ARS',                           // 15 (Col P). Valor Potencial
    'En Proceso',                             // 16 (Col Q). Estado Negocio
    notes,                                    // 17 (Col R). Próximo Paso / Notas
    ''                                        // 18 (Col S). Observaciones extra
  ];
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
 * Lee los prospectos existentes del Google Sheet (desde Columna B) para deduplicación.
 */
export function fetchExistingSheetKeys(spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  try {
    const stdout = execFileSync('gsheets', ['readonly', 'read', spreadsheetId, `'${tab}'!B11:F1000`, '--json'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const parsed = JSON.parse(stdout);
    const keys = [];

    if (Array.isArray(parsed)) {
      for (const row of parsed) {
        if (!Array.isArray(row)) continue;
        const name = row[1]; // Columna C: Prospecto / Clínica
        const phone = row[4]; // Columna F: WhatsApp (link)
        if (name) keys.push(String(name));
        if (phone) keys.push(normalizePhone(phone));
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Añade una fila al Google Sheet anclando en la Columna B ('Prospección NexoBow'!B11).
 */
export function appendRowToSheet(row, spreadsheetId = DEFAULT_SPREADSHEET_ID, tab = DEFAULT_SHEET_TAB) {
  const escapedRow = row.map(val => String(val ?? '').replace(/,/g, '\\,')).join(',');
  execFileSync('gsheets', ['mutate', 'append', spreadsheetId, `'${tab}'!B11`, escapedRow], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit']
  });
}
