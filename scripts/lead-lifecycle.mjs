#!/usr/bin/env node
// scripts/lead-lifecycle.mjs
// Motor de Ciclo de Vida y Expiración de 7 Días (TTL) sincronizado con Google Sheets (Col B = ID).
// - Renueva +7 días si el estado en Google Sheets avanzó respecto al .md.
// - Emite alertas de urgencia en los días 5 y 6 de inactividad (<48hs antes de baja).
// - Purga automáticamente /clients/{id}-*.md, /sites/{id}-* y /assets/{id}-* si lleva >=7 días
//   sin actividad o su estado en el Sheet es "Descartado" (protegiendo siempre _ficha-template.md y demo-*).

import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { fetchSheetRows, normalizePhone } from './sheets-sync.mjs';
import { addDaysToIsoDate } from './generate-client-fiche.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function isProtectedClientIdentifier(nameOrSlug = '') {
  const clean = String(nameOrSlug).trim().toLowerCase().replace(/\.md$/i, '');
  if (!clean) return true;
  if (clean === '_ficha-template' || clean.startsWith('_')) return true;
  if (clean.startsWith('demo-')) return true;
  return false;
}

function getStageRank(status = '') {
  const clean = String(status).trim().toLowerCase();
  const numMatch = clean.match(/^(\d+)/);
  if (numMatch) return Number(numMatch[1]);
  if (clean.includes('cerrado') || clean.includes('activo') || clean.includes('cliente')) return 5;
  if (clean.includes('reuni')) return 3;
  if (clean.includes('contactado') || clean.includes('respond')) return 2;
  return 1;
}

export function diffDays(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildUrgencyWhatsAppLink({ nombre = 'Profesional', whatsapp = '', slug = '' } = {}) {
  const digits = normalizePhone(whatsapp).replace(/\+/g, '');
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || 'nexobow.site';
  const demoUrl = slug ? `https://preview.${rootDomain}/${slug}` : 'tu demo personalizada';
  const msg = `Hola ${nombre}! Te escribo cortito para avisarte que en 48 hs nuestro sistema da de baja automática la demo que armé para tu consultorio (${demoUrl}) para liberar espacio en el servidor. Si querés que la mantengamos activa con los 3 bonos bonificados, avisame por acá.`;
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : '';
}

/**
 * Evalúa de forma pura el estado de todos los prospectos locales contra las filas de Google Sheets.
 */
export function evaluateLeadLifecycle({ clients = [], sheetRows = [], today = new Date().toISOString().split('T')[0] } = {}) {
  const sheetById = new Map();
  const sheetBySlug = new Map();

  for (const row of sheetRows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const rowId = Number(row[0]);
    const demoUrl = String(row[5] || '');
    const leadStatus = String(row[8] || '').trim();
    const businessStatus = String(row[15] || '').trim();
    const effectiveStatus =
      leadStatus.toLowerCase().includes('descartado') || businessStatus.toLowerCase().includes('descartado')
        ? 'Descartado'
        : leadStatus || '1. Prospecto Identificado';

    if (!Number.isNaN(rowId) && rowId > 0) {
      sheetById.set(rowId, { rowId, status: effectiveStatus, rawRow: row });
    }
    const slugMatch = demoUrl.match(/\/([^/?#]+)$/);
    if (slugMatch) {
      sheetBySlug.set(slugMatch[1], { rowId, status: effectiveStatus, rawRow: row });
    }
  }

  const active = [];
  const renewed = [];
  const alerts = [];
  const toPurge = [];
  const skippedProtected = [];

  for (const client of clients) {
    const identifier = client.slug || client.fileName || '';
    if (isProtectedClientIdentifier(identifier) || client.estado === 'activo') {
      skippedProtected.push(client);
      continue;
    }

    const sheetMatch =
      (client.sheet_id && sheetById.get(Number(client.sheet_id))) ||
      sheetBySlug.get(client.slug) ||
      null;

    const currentLocalStatus = String(client.lead_status || '1. Prospecto Identificado').trim();
    const sheetStatus = sheetMatch ? sheetMatch.status : currentLocalStatus;

    // 1. Si en el Sheet se marcó como "Descartado", purga inmediata
    if (sheetStatus.toLowerCase().includes('descartado')) {
      toPurge.push({
        ...client,
        reason: 'Marcado como Descartado en Google Sheets',
        sheetStatus,
        targetSheetStatus: 'Descartado (Expiró 7d)'
      });
      continue;
    }

    // 2. Si el estado en el Sheet cambió positivamente respecto al archivo .md, renovar +7 días
    const isPositiveChange =
      sheetMatch &&
      sheetStatus &&
      sheetStatus !== currentLocalStatus &&
      getStageRank(sheetStatus) >= getStageRank(currentLocalStatus);

    if (isPositiveChange) {
      const newExpiresAt = addDaysToIsoDate(today, 7);
      renewed.push({
        ...client,
        previousStatus: currentLocalStatus,
        newStatus: sheetStatus,
        last_activity_at: today,
        expires_at: newExpiresAt
      });
      continue;
    }

    // 3. Evaluar días de inactividad desde last_activity_at (o created_at)
    const lastActivity = client.last_activity_at || client.created_at || today;
    const inactivityDays = diffDays(lastActivity, today);

    if (inactivityDays >= 7) {
      toPurge.push({
        ...client,
        inactivityDays,
        reason: `Inactividad de ${inactivityDays} días (>= 7 días TTL)`,
        targetSheetStatus: 'Descartado (Expiró 7d)'
      });
    } else if (inactivityDays >= 5) {
      alerts.push({
        ...client,
        inactivityDays,
        daysRemaining: 7 - inactivityDays,
        urgencyWaLink: buildUrgencyWhatsAppLink({
          nombre: client.nombre,
          whatsapp: client.whatsapp,
          slug: client.slug
        })
      });
    } else {
      active.push({
        ...client,
        inactivityDays,
        daysRemaining: 7 - inactivityDays
      });
    }
  }

  return {
    today,
    active,
    renewed,
    alerts,
    toPurge,
    skippedProtected
  };
}

function loadLocalClients(clientsDir = join(REPO_ROOT, 'clients')) {
  if (!existsSync(clientsDir)) return [];
  const files = readdirSync(clientsDir).filter((f) => f.endsWith('.md'));
  const list = [];

  for (const fileName of files) {
    const fullPath = join(clientsDir, fileName);
    const raw = readFileSync(fullPath, 'utf8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    const data = m ? parseYaml(m[1]) ?? {} : {};
    const slug = data.slug || fileName.replace(/\.md$/i, '');
    list.push({
      fileName,
      fullPath,
      raw,
      slug,
      sheet_id: data.sheet_id ?? data.id ?? 0,
      nombre: data.nombre || slug,
      whatsapp: data.whatsapp || '',
      estado: data.estado || 'prospecto',
      lead_status: data.lead_status || '1. Prospecto Identificado',
      created_at: data.created_at || '',
      last_activity_at: data.last_activity_at || '',
      expires_at: data.expires_at || ''
    });
  }
  return list;
}

function updateRenewedClientFile(renewedItem) {
  if (!renewedItem.fullPath || !existsSync(renewedItem.fullPath)) return;
  let content = readFileSync(renewedItem.fullPath, 'utf8');

  const replaceOrInsert = (key, valStr) => {
    const regex = new RegExp(`^${key}:.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}: ${valStr}`);
    } else {
      content = content.replace(/^---\r?\n/, `---\n${key}: ${valStr}\n`);
    }
  };

  replaceOrInsert('lead_status', `"${renewedItem.newStatus}"`);
  replaceOrInsert('last_activity_at', `"${renewedItem.last_activity_at}"`);
  replaceOrInsert('expires_at', `"${renewedItem.expires_at}"`);

  writeFileSync(renewedItem.fullPath, content, 'utf8');
}

function purgeExpiredLeadResources(item, repoRoot = REPO_ROOT) {
  if (isProtectedClientIdentifier(item.slug) || isProtectedClientIdentifier(item.fileName)) {
    return;
  }
  const fichePath = join(repoRoot, 'clients', `${item.slug}.md`);
  const siteDir = join(repoRoot, 'sites', item.slug);
  const assetsDir = join(repoRoot, 'assets', item.slug);

  if (existsSync(fichePath)) rmSync(fichePath, { force: true });
  if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });
  if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true, force: true });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n\x1b[36m⏱️  NexoBow — Motor de Ciclo de Vida & Expiración 7 Días (${today})\x1b[0m`);
  const clients = loadLocalClients();
  const sheetRows = fetchSheetRows();

  const report = evaluateLeadLifecycle({ clients, sheetRows, today });

  console.log(`- Fichas protegidas (templates/demos/activos): ${report.skippedProtected.length}`);
  console.log(`- Leads dentro de ventana activa (0–4 días): ${report.active.length}`);
  console.log(`- Leads renovados (+7 días por avance en Sheet): ${report.renewed.length}`);
  console.log(`- Leads en ventana de alerta (5–6 días · <48hs): ${report.alerts.length}`);
  console.log(`- Leads candidatos a purga (>=7 días o Descartado): ${report.toPurge.length}\n`);

  for (const r of report.renewed) {
    console.log(`\x1b[32m[RENOVADO +7d]\x1b[0m ${r.slug}: ${r.previousStatus} → ${r.newStatus} (vence ${r.expires_at})`);
    if (!dryRun) updateRenewedClientFile(r);
  }

  for (const a of report.alerts) {
    console.log(`\x1b[33m[ALERTA <48HS]\x1b[0m ${a.nombre} (${a.slug}) — ${a.inactivityDays} días sin actividad.`);
    console.log(`   👉 Seguimiento Urgencia WhatsApp: ${a.urgencyWaLink}`);
  }

  for (const p of report.toPurge) {
    console.log(
      `\x1b[31m[PURGA 7D]\x1b[0m ${p.slug} (Sheet ID #${p.sheet_id || '?'}) — Motivo: ${p.reason} → Marcar en Sheet como: "${p.targetSheetStatus}"`
    );
    if (!dryRun) {
      purgeExpiredLeadResources(p);
      console.log(`   ✓ Eliminados clients/${p.slug}.md, sites/${p.slug}/ y assets/${p.slug}/`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[lead-lifecycle ERROR] ${err.message}`);
    process.exit(1);
  });
}
