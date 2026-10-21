import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  formatLeadToSheetRow,
  isExcludedWebsite,
  filterEligiblePlaces,
  buildCorrelativeSlug,
  getNextSheetId,
  createSheetsAdapter,
  SHEET_COLUMNS_COUNT,
  DEFAULT_SHEET_RANGE,
  DEFAULT_APPEND_ANCHOR
} from '../scripts/sheets-sync.mjs';
import { selectCopyAngle, selectContextualBranding, HORMOZI_PAIN_ANGLES } from '../scripts/generate-client-fiche.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('T02.1 - Constante SHEET_COLUMNS_COUNT debe ser 18 y rango en Columna B (B11:S1000)', () => {
  assert.equal(SHEET_COLUMNS_COUNT, 18);
  assert.match(DEFAULT_SHEET_RANGE, /B11:S1000/);
  assert.match(DEFAULT_APPEND_ANCHOR, /B11/);
});

test('T02.2 - isExcludedWebsite detecta webs corporativas vs redes/sin web', () => {
  // Sin web o vacíos -> Apto (no excluido)
  assert.equal(isExcludedWebsite(null), false);
  assert.equal(isExcludedWebsite(''), false);
  assert.equal(isExcludedWebsite(undefined), false);

  // Redes sociales o directorios -> Apto (no cuenta como web corporativa)
  assert.equal(isExcludedWebsite('https://www.instagram.com/dra.nutri'), false);
  assert.equal(isExcludedWebsite('https://instagram.com/abogados.campana'), false);
  assert.equal(isExcludedWebsite('https://facebook.com/estudiojuridico'), false);
  assert.equal(isExcludedWebsite('https://doctoralia.com.ar/profesional'), false);
  assert.equal(isExcludedWebsite('https://linktr.ee/abogada_ana'), false);

  // Web corporativa propia -> Excluido (ya tiene su web)
  assert.equal(isExcludedWebsite('https://www.estudiorodriguez.com.ar'), true);
  assert.equal(isExcludedWebsite('https://consultorioabogados.com'), true);
  assert.equal(isExcludedWebsite('http://nutricioncamilo.com.ar/inicio'), true);
});

test('T02.3 - filterEligiblePlaces filtra existentes, webs corporativas y limita a 10', () => {
  const existingNamesOrPhones = [
    'lic. sofía albarracín',
    'estudio martínez',
    '+5491144332211'
  ];

  const places = [
    // 1. Duplicado por nombre existente
    { displayName: 'Lic. Sofía Albarracín', nationalPhoneNumber: '011 5566-7788', websiteUri: '' },
    // 2. Duplicado por teléfono existente
    { displayName: 'Estudio Nuevo', nationalPhoneNumber: '+5491144332211', websiteUri: '' },
    // 3. Excluido porque ya tiene web corporativa
    { displayName: 'Estudio con Web', nationalPhoneNumber: '03489 123456', websiteUri: 'https://estudioconweb.com' },
    // 4. Elegible: sin web
    { displayName: 'Dr. Lucas Valenzuela', nationalPhoneNumber: '03489 445566', formattedAddress: 'Campana, Buenos Aires', websiteUri: '' },
    // 5. Elegible: con instagram (cuenta como sin web corporativa)
    { displayName: 'Dra. María Paz', nationalPhoneNumber: '03489 778899', formattedAddress: 'Campana, Buenos Aires', websiteUri: 'https://instagram.com/mariapaz' }
  ];

  const filtered = filterEligiblePlaces(places, existingNamesOrPhones, 10);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].displayName, 'Dr. Lucas Valenzuela');
  assert.equal(filtered[1].displayName, 'Dra. María Paz');
});

test('T02.4 - formatLeadToSheetRow produce una tupla exacta de 18 columnas comenzando por el ID en Col B y URL preview.nexobow.site', () => {
  const lead = {
    displayName: 'Estudio Jurídico Gómez & Asoc.',
    nicho: 'Abogacía',
    nationalPhoneNumber: '+54 9 11 9876-5432',
    formattedAddress: 'Campana, Buenos Aires, ARG',
    rating: 4.9,
    userRatingCount: 32,
    websiteUri: 'https://instagram.com/estudiogomez',
    slug: '4-estudio-gomez-abogado'
  };

  const nextIndex = 4;
  const row = formatLeadToSheetRow(lead, nextIndex);

  assert.equal(row.length, 18);
  assert.equal(row[0], 4); // Nº (Columna B)
  assert.equal(row[1], 'Estudio Jurídico Gómez & Asoc.'); // Prospecto (Columna C)
  assert.equal(row[2], 'Abogacía'); // Nicho (Columna D)
  assert.equal(row[3], 'WhatsApp'); // Canal Contacto (Columna E)
  assert.match(row[4], /^https:\/\/wa\.me\/5491198765432/); // WhatsApp link (Columna F)
  assert.equal(row[5], 'https://preview.nexobow.site/4-estudio-gomez-abogado'); // Web Demo URL (Columna G)
  assert.equal(row[7], 'Campana, Buenos Aires, ARG'); // Ubicación (Columna I)
  assert.equal(row[8], '1. Prospecto Identificado'); // Estado del Lead (Columna J)
  assert.equal(row[14], '$189.999 ARS'); // Valor Potencial (Columna P)
  assert.equal(row[15], 'En Proceso'); // Estado Negocio (Columna Q)
  assert.match(row[16], /Google Maps/); // Notas (Columna R)
});

test('T02.5 - buildCorrelativeSlug genera formato {id}-{nombre}-{apellido}-{rubro}', () => {
  assert.equal(
    buildCorrelativeSlug({ id: 22, displayName: 'Lic. Alejandra Martínez', nicho: 'nutricionista' }),
    '22-alejandra-martinez-nutri'
  );
  assert.equal(
    buildCorrelativeSlug({ id: 7, displayName: 'Dr. Lucas Valenzuela', nicho: 'Psicología' }),
    '7-lucas-valenzuela-psico'
  );
  assert.equal(
    buildCorrelativeSlug({ id: 15, displayName: 'Dra. Silvina Rodríguez - Asuntos Civiles', nicho: 'Abogacía' }),
    '15-silvina-rodriguez-abogado'
  );
});

test('T02.6 - generate-client-fiche inyecta sheet_id, template_version, lead_status, created_at, last_activity_at y expires_at (+7d)', () => {
  const slug = '22-alejandra-martinez-nutri';
  const assetsDir = join(REPO_ROOT, 'assets', slug);
  const rawPath = join(assetsDir, 'lead-raw.json');
  const fichePath = join(REPO_ROOT, 'clients', `${slug}.md`);

  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(
    rawPath,
    JSON.stringify({
      slug,
      sheet_id: 22,
      created_at: '2026-10-20',
      last_activity_at: '2026-10-20',
      nombre: 'Lic. Alejandra Martínez',
      rubro: 'nutricionista',
      telefono: '+54 9 11 5555-2222',
      rating: 4.9,
      userRatingCount: 28,
      reviews: []
    }),
    'utf8'
  );

  const res = spawnSync('node', ['scripts/generate-client-fiche.mjs', `assets/${slug}/lead-raw.json`], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });

  assert.equal(res.status, 0);
  assert.ok(existsSync(fichePath));

  const md = readFileSync(fichePath, 'utf8');
  assert.match(md, /sheet_id:\s*22/);
  assert.match(md, /template_version:\s*"nutricionista@1\.0\.0"/);
  assert.match(md, /lead_status:\s*"1\. Prospecto Identificado"/);
  assert.match(md, /created_at:\s*"2026-10-20"/);
  assert.match(md, /last_activity_at:\s*"2026-10-20"/);
  assert.match(md, /expires_at:\s*"2026-10-27"/);
  assert.match(md, /## Problema/);

  rmSync(assetsDir, { recursive: true, force: true });
  rmSync(fichePath, { force: true });
});

test('T02.7 - getNextSheetId auto-incrementa desde Columna B y createSheetsAdapter desacopla el almacenamiento', () => {
  assert.equal(getNextSheetId([]), 1);
  assert.equal(getNextSheetId([[1, 'A'], [4, 'B'], [21, 'C']]), 22);

  const memoryRows = [[10, 'Lic. Sofía']];
  const adapter = createSheetsAdapter({
    readRows: () => memoryRows,
    appendRow: (r) => memoryRows.push(r)
  });

  assert.equal(adapter.getNextId(), 11);
  const inserted = adapter.appendLead({
    displayName: 'Lic. Alejandra Martínez',
    nicho: 'nutricionista',
    nationalPhoneNumber: '+54 9 11 4444-5555'
  });
  assert.equal(inserted.id, 11);
  assert.equal(inserted.slug, '11-alejandra-martinez-nutri');
  assert.equal(memoryRows.length, 2);
});

test('T02.8 - Motor de Copywriting Multivariante rota entre 4 ángulos de dolor Hormozi y asigna branding contextual', () => {
  assert.equal(HORMOZI_PAIN_ANGLES.length, 4);

  const angles = [1, 2, 3, 4].map((id) => selectCopyAngle({ sheet_id: id, nombre: `Profesional ${id}` }));
  const uniqueAngleIds = new Set(angles.map((a) => a.angleId));
  assert.equal(uniqueAngleIds.size, 4, 'Debe rotar por los 4 ángulos de dolor de Alex Hormozi');

  const b1 = selectContextualBranding({ sheet_id: 1, rubro: 'nutricionista', rating: 4.9, userRatingCount: 60 });
  const b2 = selectContextualBranding({ sheet_id: 2, rubro: 'nutricionista', rating: 4.7, userRatingCount: 15 });
  assert.ok(b1.primary && b1.fondo && b1.tinta && b1.fuente);
  assert.notEqual(b1.primary, '#040607', 'Nunca debe usar la paleta Soft-Obsidian de NexoBow');
  assert.notEqual(b1.primary, '#BF40FA', 'Nunca debe usar el acento de NexoBow');
  assert.notDeepEqual(b1, b2, 'Prestadores consecutivos deben recibir variaciones contextuales de paleta/tipografía');
});

