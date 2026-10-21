import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateLeadLifecycle,
  isProtectedClientIdentifier,
  buildUrgencyWhatsAppLink,
  purgeExpiredLeadResources
} from '../scripts/lead-lifecycle.mjs';
import { computeSheetMetricsSummary } from '../scripts/continuous-improvement.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('T-SYS-02.1 - isProtectedClientIdentifier protege _ficha-template.md y demos', () => {
  assert.equal(isProtectedClientIdentifier('_ficha-template.md'), true);
  assert.equal(isProtectedClientIdentifier('_ficha-template'), true);
  assert.equal(isProtectedClientIdentifier('demo-nutri-sofia.md'), true);
  assert.equal(isProtectedClientIdentifier('demo-nutri-sofia'), true);
  assert.equal(isProtectedClientIdentifier('22-alejandra-martinez-nutri.md'), false);
  assert.equal(isProtectedClientIdentifier('22-alejandra-martinez-nutri'), false);
});

test('T-SYS-02.2 - evaluateLeadLifecycle clasifica renovados, alertas (5-6d), purgas (>=7d o Descartado) y protegidos', () => {
  const today = '2026-10-20';

  const clients = [
    // 1. Protegido (_ficha-template y demo-*)
    {
      fileName: '_ficha-template.md',
      slug: '_ficha-template',
      sheet_id: 0,
      nombre: 'Template',
      lead_status: '1. Prospecto Identificado',
      last_activity_at: '2026-01-01'
    },
    {
      fileName: 'demo-nutri-sofia.md',
      slug: 'demo-nutri-sofia',
      sheet_id: 1,
      nombre: 'Lic. Sofía Ramos',
      lead_status: '1. Prospecto Identificado',
      last_activity_at: '2026-09-01'
    },
    // 2. Cambio de estado positivo en el Sheet (pasa de 1. Prospecto Identificado a 2. Contactado) -> Renovar +7d
    {
      fileName: '10-lucas-valenzuela-psico.md',
      slug: '10-lucas-valenzuela-psico',
      sheet_id: 10,
      nombre: 'Dr. Lucas Valenzuela',
      whatsapp: '5491144445555',
      lead_status: '1. Prospecto Identificado',
      last_activity_at: '2026-10-14',
      expires_at: '2026-10-21'
    },
    // 3. Inactivo hace 5 días (sin cambio en Sheet) -> Alerta (<48hs) con link WA de urgencia
    {
      fileName: '11-maria-paz-nutri.md',
      slug: '11-maria-paz-nutri',
      sheet_id: 11,
      nombre: 'Lic. María Paz',
      whatsapp: '5491166667777',
      lead_status: '1. Prospecto Identificado',
      last_activity_at: '2026-10-15',
      expires_at: '2026-10-22'
    },
    // 4. Inactivo hace 8 días (>=7 días) -> Purgar
    {
      fileName: '12-carlos-gomez-abogado.md',
      slug: '12-carlos-gomez-abogado',
      sheet_id: 12,
      nombre: 'Dr. Carlos Gómez',
      whatsapp: '5491188889999',
      lead_status: '1. Prospecto Identificado',
      last_activity_at: '2026-10-12',
      expires_at: '2026-10-19'
    },
    // 5. Reciente (2 días), pero marcado como "Descartado" en Google Sheets -> Purgar inmediatamente
    {
      fileName: '13-ana-lopez-odonto.md',
      slug: '13-ana-lopez-odonto',
      sheet_id: 13,
      nombre: 'Dra. Ana López',
      whatsapp: '5491122223333',
      lead_status: '1. Prospecto Identificado',
      last_activity_at: '2026-10-18',
      expires_at: '2026-10-25'
    }
  ];

  // Filas de Google Sheets (B11:S1000 -> índice 0 es Col B = ID, índice 8 es Col J = Estado del Lead)
  const sheetRows = [
    [10, 'Dr. Lucas Valenzuela', 'Psicología', 'WhatsApp', '', '', '', '', '2. Contactado'],
    [11, 'Lic. María Paz', 'Nutrición', 'WhatsApp', '', '', '', '', '1. Prospecto Identificado'],
    [12, 'Dr. Carlos Gómez', 'Abogacía', 'WhatsApp', '', '', '', '', '1. Prospecto Identificado'],
    [13, 'Dra. Ana López', 'Odontología', 'WhatsApp', '', '', '', '', 'Descartado']
  ];

  const report = evaluateLeadLifecycle({ clients, sheetRows, today });

  // Protegidos
  assert.equal(report.skippedProtected.length, 2);

  // Renovado (#10)
  assert.equal(report.renewed.length, 1);
  assert.equal(report.renewed[0].slug, '10-lucas-valenzuela-psico');
  assert.equal(report.renewed[0].newStatus, '2. Contactado');
  assert.equal(report.renewed[0].last_activity_at, '2026-10-20');
  assert.equal(report.renewed[0].expires_at, '2026-10-27');

  // Alerta 5-6 días (#11)
  assert.equal(report.alerts.length, 1);
  assert.equal(report.alerts[0].slug, '11-maria-paz-nutri');
  assert.equal(report.alerts[0].inactivityDays, 5);
  assert.match(report.alerts[0].urgencyWaLink, /^https:\/\/wa\.me\/5491166667777\?text=/);
  assert.match(decodeURIComponent(report.alerts[0].urgencyWaLink), /48\s*hs/i);

  // Purga (#12 por >=7 días y #13 por Descartado)
  assert.equal(report.toPurge.length, 2);
  const purgeSlugs = report.toPurge.map((p) => p.slug);
  assert.deepEqual(purgeSlugs, ['12-carlos-gomez-abogado', '13-ana-lopez-odonto']);
});

test('T-SYS-02.3 - computeSheetMetricsSummary calcula tasas por nicho y recomendaciones accionables', () => {
  const rows = [
    [1, 'Lic. Ana', 'Nutrición', 'WhatsApp', '', '', '', 'CABA', '3. Reunión Agendada', '2026-10-15', '2026-10-16', 'Interesada', 'Sí', '2026-10-21', '$189.999', 'En Proceso', '', ''],
    [2, 'Lic. Carla', 'Nutrición', 'WhatsApp', '', '', '', 'CABA', '2. Contactado', '2026-10-16', '2026-10-17', 'Pidió info', 'No', '', '$189.999', 'En Proceso', '', ''],
    [3, 'Dr. Pedro', 'Abogacía', 'WhatsApp', '', '', '', 'Campana', '1. Prospecto Identificado', '2026-10-18', '', 'Sin Contactar', 'No', '', '$189.999', 'En Proceso', '', ''],
    [4, 'Dr. Jorge', 'Abogacía', 'WhatsApp', '', '', '', 'Campana', 'Descartado', '2026-10-10', '', 'No le interesa', 'No', '', '$0', 'Descartado', '', '']
  ];

  const summary = computeSheetMetricsSummary({ rows });

  assert.equal(summary.totalLeads, 4);
  assert.equal(summary.contactedCount, 3);
  assert.equal(summary.repliedCount, 2);
  assert.equal(summary.meetingsCount, 1);
  assert.equal(summary.discardedCount, 1);
  assert.ok(summary.byNiche['Nutrición']);
  assert.equal(summary.byNiche['Nutrición'].total, 2);
  assert.equal(summary.byNiche['Nutrición'].meetings, 1);
  assert.ok(Array.isArray(summary.recommendations) && summary.recommendations.length > 0);
});

test('T-SYS-02.4 - purgeExpiredLeadResources elimina clients, sites, assets y dist-previews del lead vencido', () => {
  const slug = '98-test-purge-nutri';
  const fichePath = join(REPO_ROOT, 'clients', `${slug}.md`);
  const siteDir = join(REPO_ROOT, 'sites', slug);
  const assetsDir = join(REPO_ROOT, 'assets', slug);
  const previewDir = join(REPO_ROOT, 'dist-previews', slug);

  writeFileSync(fichePath, '---\nslug: 98-test-purge-nutri\n---', 'utf8');
  mkdirSync(siteDir, { recursive: true });
  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(previewDir, { recursive: true });

  purgeExpiredLeadResources({ slug, fileName: `${slug}.md` }, REPO_ROOT);

  assert.equal(existsSync(fichePath), false);
  assert.equal(existsSync(siteDir), false);
  assert.equal(existsSync(assetsDir), false);
  assert.equal(existsSync(previewDir), false, 'Debe eliminar también dist-previews/{slug}');
});

