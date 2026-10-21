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
  buildPreviewUrl,
  escapeSheetRowValues,
  getNextSheetId,
  createSheetsAdapter,
  createInMemoryLeadStore,
  SHEET_COLUMNS_COUNT,
  DEFAULT_SHEET_RANGE,
  DEFAULT_APPEND_ANCHOR
} from '../scripts/sheets-sync.mjs';
import {
  selectCopyAngle,
  selectContextualBranding,
  HORMOZI_PAIN_ANGLES,
  RUBRO_BRANDING_MAP
} from '../scripts/generate-client-fiche.mjs';
import { syncBuildPreviewUrlToStore } from '../scripts/build-client-site.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('T02.1 - Constante SHEET_COLUMNS_COUNT debe ser 18 y rango en Columna B (B11:S1000)', () => {
  assert.equal(SHEET_COLUMNS_COUNT, 18);
  assert.match(DEFAULT_SHEET_RANGE, /B11:S1000/);
  assert.match(DEFAULT_APPEND_ANCHOR, /B11/);
  assert.equal(buildPreviewUrl('22-alejandra-martinez-nutri'), 'https://preview.nexobow.site/22-alejandra-martinez-nutri/');
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

test('T02.4 - formatLeadToSheetRow produce una tupla exacta de 18 columnas comenzando por el ID en Col B y URL preview.nexobow.site/{slug}/', () => {
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
  assert.equal(row[5], 'https://preview.nexobow.site/4-estudio-gomez-abogado/'); // Web Demo URL (Columna G)
  assert.equal(row[7], 'Campana, Buenos Aires, ARG'); // Ubicación (Columna I)
  assert.equal(row[8], '1. Prospecto Identificado'); // Estado del Lead (Columna J)
  assert.equal(row[14], '$189.999 ARS'); // Valor Potencial (Columna P)
  assert.equal(row[15], 'En Proceso'); // Estado Negocio (Columna Q)
  assert.match(row[16], /Google Maps/); // Notas (Columna R)
  assert.equal(row[17], '+5491198765432'); // Teléfono limpio normalizado (Columna S)
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

test('T02.6 - generate-client-fiche inyecta sheet_id, template_version, subdominio con barra final y rubro del lead', () => {
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
  assert.match(md, /subdominio:\s*"preview\.nexobow\.site\/22-alejandra-martinez-nutri\/"/);
  assert.match(md, /lead_status:\s*"1\. Prospecto Identificado"/);
  assert.match(md, /created_at:\s*"2026-10-20"/);
  assert.match(md, /last_activity_at:\s*"2026-10-20"/);
  assert.match(md, /expires_at:\s*"2026-10-27"/);
  assert.match(md, /## Problema/);

  rmSync(assetsDir, { recursive: true, force: true });
  rmSync(fichePath, { force: true });
});

test('T02.7 - LeadStore en memoria: max(Col B) + 1 con filas vacías, colisión de ID atómica, escape de comillas y escritura en Columna G sin pisar Columna L', () => {
  // Incluye fila con ID en Col B pero sin nombre ni teléfono
  assert.equal(getNextSheetId([]), 1);
  assert.equal(getNextSheetId([[1, 'A'], [25, '', ''], [14, 'B']]), 26);

  // Escape de comillas simples, dobles, comas y saltos de línea
  const escaped = escapeSheetRowValues([1, 'Dr. O\'Connor "El Mejor", Centro\nSur']);
  assert.equal(typeof escaped, 'string');
  assert.ok(escaped.startsWith('1,'));
  assert.ok(!escaped.includes('\n'));

  const store = createInMemoryLeadStore({
    initialRows: [
      [10, 'Lic. Sofía', 'Nutrición', 'WhatsApp', 'https://wa.me/1', '', 'Pitch', 'CABA', '2. Contactado', '2026-10-18', '2026-10-19', 'Interesada', 'No', '-', '$189.999 ARS', 'En Proceso', 'Nota', '5491111111111']
    ]
  });

  assert.equal(store.getNextId(), 11);

  // Simular colisión: se pasa expectedId: 10 (que ya está ocupado en Col B) -> debe reintentar con max(Col B) + 1 = 11
  const inserted = store.appendLead(
    {
      displayName: 'Lic. Alejandra Martínez',
      nicho: 'nutricionista',
      nationalPhoneNumber: '+54 9 11 4444-5555'
    },
    { expectedId: 10 }
  );
  assert.equal(inserted.id, 11);
  assert.equal(inserted.collisionRetried, true);
  assert.equal(inserted.slug, '11-alejandra-martinez-nutri');
  assert.equal(inserted.row[5], 'https://preview.nexobow.site/11-alejandra-martinez-nutri/');

  // Verificar escritura de Preview URL en Columna G (índice 5) sin pisar Columna L (índice 10, Último Contacto)
  const syncRes1 = syncBuildPreviewUrlToStore({
    fm: { sheet_id: 10, slug: '10-sofia-nutri' },
    slug: '10-sofia-nutri',
    leadStore: store
  });
  assert.equal(syncRes1.updated, true);
  assert.equal(syncRes1.cell, 'G11');
  const rowsAfterG = store.readRows();
  assert.equal(rowsAfterG[0][5], 'https://preview.nexobow.site/10-sofia-nutri/');
  assert.equal(rowsAfterG[0][10], '2026-10-19', 'Columna L (Último Contacto) no debe modificarse al compilar el sitio');

  // Recompilar el mismo sitio es idempotente
  const syncRes2 = syncBuildPreviewUrlToStore({
    fm: { sheet_id: 10, slug: '10-sofia-nutri' },
    slug: '10-sofia-nutri',
    leadStore: store
  });
  assert.equal(syncRes2.updated, false);
  assert.equal(syncRes2.reason, 'unchanged');

  // Lead ausente en Sheet (ej: demo-*) emite aviso y no falla
  const syncDemo = syncBuildPreviewUrlToStore({
    fm: { sheet_id: 0, slug: 'demo-nutri-test' },
    slug: 'demo-nutri-test',
    leadStore: store
  });
  assert.equal(syncDemo.updated, false);
  assert.equal(syncDemo.reason, 'not-found');
});

test('T02.8 - Motor de Copywriting Multivariante rota de forma determinista por slug entre los 4 ángulos Hormozi y asigna branding por rubro y reputación', () => {
  assert.equal(HORMOZI_PAIN_ANGLES.length, 4);
  assert.ok(RUBRO_BRANDING_MAP.nutricionista && RUBRO_BRANDING_MAP.abogado && RUBRO_BRANDING_MAP.psicologo);

  // Determinismo por slug: misma ficha = mismo ángulo
  const angleRun1 = selectCopyAngle({ slug: '22-alejandra-martinez-nutri', nombre: 'Lic. Alejandra Martínez' });
  const angleRun2 = selectCopyAngle({ slug: '22-alejandra-martinez-nutri', nombre: 'Lic. Alejandra Martínez' });
  assert.deepEqual(angleRun1, angleRun2, 'La selección de ángulo debe ser 100% determinista a partir del slug');

  // Cobertura de los 4 ángulos en voseo argentino
  const slugs = ['1-ana-nutri', '2-beto-nutri', '3-carla-nutri', '4-diego-nutri'];
  const angles = slugs.map((slug) => selectCopyAngle({ slug, nombre: `Profesional ${slug}` }));
  const uniqueAngleIds = new Set(angles.map((a) => a.angleId));
  assert.equal(uniqueAngleIds.size, 4, 'Debe cubrir los 4 ángulos de dolor de Alex Hormozi');

  // Variación de paleta/tipografía por rubro y por reputación (rating + userRatingCount)
  const bNutriLow = selectContextualBranding({ slug: '1-ana-nutri', rubro: 'nutricionista', rating: 4.6, userRatingCount: 12 });
  const bNutriHigh = selectContextualBranding({ slug: '1-ana-nutri', rubro: 'nutricionista', rating: 4.9, userRatingCount: 80 });
  const bAbogado = selectContextualBranding({ slug: '1-ana-abogado', rubro: 'abogado', rating: 4.6, userRatingCount: 12 });

  assert.notEqual(bNutriLow.primary, '#040607', 'Nunca debe usar la paleta Soft-Obsidian de NexoBow');
  assert.notEqual(bNutriLow.primary, '#BF40FA', 'Nunca debe usar el acento de NexoBow');
  assert.notDeepEqual(bNutriLow, bNutriHigh, 'La reputación de Maps debe variar la paleta y el orden de secciones');
  assert.notEqual(bNutriLow.primary, bAbogado.primary, 'Distintos rubros deben mapear a paletas iniciales distintas');
});
