#!/usr/bin/env node
/**
 * scripts/continuous-improvement.mjs
 * Motor de Mejora Continua basado en lectura integral de Google Sheets ('Prospección NexoBow').
 * Analiza tanto el bloque superior de KPIs (A1:S10) como la tabla de prospectos (B11:S1000)
 * para calcular tasas de respuesta, conversión a reuniones por nicho y recomendaciones de pitch.
 */

import { pathToFileURL } from 'node:url';
import {
  defaultLeadStore,
  fetchSheetKpiBlock
} from './sheets-sync.mjs';

export { fetchSheetKpiBlock };

/**
 * Calcula métricas de embudo comercial y recomendaciones a partir de las filas B11:S1000.
 */
export function computeSheetMetricsSummary({ rows = [], kpiRows = [] } = {}) {
  const validRows = rows.filter((r) => Array.isArray(r) && r.length >= 2 && String(r[1] || '').trim() !== '');
  const totalLeads = validRows.length;

  let contactedCount = 0;
  let repliedCount = 0;
  let meetingsCount = 0;
  let discardedCount = 0;
  let uncontactedCount = 0;

  const byNiche = {};

  for (const row of validRows) {
    const nicho = String(row[2] || 'General').trim();
    const leadStatus = String(row[8] || '1. Prospecto Identificado').trim();
    const replyText = String(row[11] || 'Sin Contactar').trim();
    const hasMeeting = String(row[12] || 'No').trim().toLowerCase();
    const bizStatus = String(row[15] || '').trim();

    if (!byNiche[nicho]) {
      byNiche[nicho] = {
        total: 0,
        contacted: 0,
        replied: 0,
        meetings: 0,
        discarded: 0,
        responseRatePct: 0
      };
    }

    byNiche[nicho].total += 1;

    const isDiscarded =
      leadStatus.toLowerCase().includes('descartado') ||
      bizStatus.toLowerCase().includes('descartado');
    if (isDiscarded) {
      discardedCount += 1;
      byNiche[nicho].discarded += 1;
    }

    const isUncontacted =
      leadStatus.startsWith('1.') &&
      (replyText === '' || replyText.toLowerCase() === 'sin contactar');

    if (isUncontacted) {
      uncontactedCount += 1;
    } else {
      contactedCount += 1;
      byNiche[nicho].contacted += 1;
    }

    const hasPositiveReply =
      !isUncontacted &&
      !isDiscarded &&
      replyText !== '' &&
      !['sin contactar', 'sin respuesta', 'no respondio', 'no respondió'].includes(replyText.toLowerCase());

    if (hasPositiveReply || leadStatus.startsWith('3.') || leadStatus.startsWith('4.')) {
      repliedCount += 1;
      byNiche[nicho].replied += 1;
    }

    if (hasMeeting === 'sí' || hasMeeting === 'si' || leadStatus.toLowerCase().includes('reunión')) {
      meetingsCount += 1;
      byNiche[nicho].meetings += 1;
    }
  }

  for (const n of Object.values(byNiche)) {
    n.responseRatePct = n.contacted > 0 ? Math.round((n.replied / n.contacted) * 100) : 0;
  }

  const responseRatePct = contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0;
  const meetingRatePct = contactedCount > 0 ? Math.round((meetingsCount / contactedCount) * 100) : 0;

  const recommendations = [];

  if (uncontactedCount > 0) {
    recommendations.push(
      `Tenés ${uncontactedCount} prospecto(s) en estado '1. Prospecto Identificado' sin primer contacto enviado. Priorizá el envío del link de WhatsApp con demo.`
    );
  }

  const sortedNiches = Object.entries(byNiche).sort(
    (a, b) => b[1].responseRatePct - a[1].responseRatePct
  );
  if (sortedNiches.length > 0) {
    const [bestNiche, stats] = sortedNiches[0];
    recommendations.push(
      `El nicho con mejor tasa de respuesta actual es '${bestNiche}' (${stats.responseRatePct}% de respuesta, ${stats.meetings} reunión/es). Duplicá el lote de prospección en este vertical.`
    );
  }

  if (responseRatePct < 25 && contactedCount >= 3) {
    recommendations.push(
      `La tasa de respuesta global (${responseRatePct}%) es menor al 25%. Activá el mensaje de seguimiento de urgencia de 48hs antes de la expiración de 7 días.`
    );
  } else {
    recommendations.push(
      `Mantené la cadencia de seguimiento a los días 5 y 6 para capitalizar la política de expiración de demos a los 7 días.`
    );
  }

  return {
    totalLeads,
    contactedCount,
    uncontactedCount,
    repliedCount,
    meetingsCount,
    discardedCount,
    responseRatePct,
    meetingRatePct,
    kpiHeaderCaptured: kpiRows.length > 0,
    byNiche,
    recommendations
  };
}

async function main() {
  console.log(`\n\x1b[36m📈 NexoBow — Motor de Mejora Continua (Google Sheets Analytics)\x1b[0m`);
  const kpiRows = defaultLeadStore.readKpiRows();
  const rows = defaultLeadStore.readRows();
  const summary = computeSheetMetricsSummary({ rows, kpiRows });

  console.log(`- Total Prospectos (Col B11:S1000): ${summary.totalLeads}`);
  console.log(`- Contactados: ${summary.contactedCount} | Pendientes de 1er Contacto: ${summary.uncontactedCount}`);
  console.log(`- Respuestas Activas: ${summary.repliedCount} (${summary.responseRatePct}%)`);
  console.log(`- Reuniones / Consultorías Agendadas: ${summary.meetingsCount} (${summary.meetingRatePct}%)`);
  console.log(`- Descartados / Expirados: ${summary.discardedCount}\n`);

  console.log(`\x1b[1mRecomendaciones Accionables:\x1b[0m`);
  summary.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[continuous-improvement ERROR] ${err.message}`);
    process.exit(1);
  });
}
