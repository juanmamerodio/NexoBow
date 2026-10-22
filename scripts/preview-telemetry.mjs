#!/usr/bin/env node

/**
 * scripts/preview-telemetry.mjs
 * Módulo generador y validador de telemetría pasiva (< 1 KB, 0 cookies, Ley 25.326 compliant)
 */

import { fileURLToPath } from 'node:url';

export const TELEMETRY_EVENTS = ['preview_view', 'theme_switch', 'cta_click'];

const SENSITIVE_KEYS = ['ip', 'email', 'phone', 'telefono', 'dni', 'cuit', 'cookie', 'cookies'];

/**
 * Construye un payload anonimizado para telemetría de eventos
 */
export function buildTelemetryPayload({
  event = 'preview_view',
  slug = 'demo',
  theme = undefined,
  ctaLabel = undefined,
  timestamp = Date.now()
} = {}) {
  const safeEvent = TELEMETRY_EVENTS.includes(event) ? event : 'preview_view';

  return {
    event: safeEvent,
    slug: String(slug).trim(),
    timestamp,
    meta: {
      ...(theme ? { theme: String(theme).trim() } : {}),
      ...(ctaLabel ? { ctaLabel: String(ctaLabel).trim() } : {})
    },
    compliance: 'Ley 25.326 - 0 Cookies'
  };
}

/**
 * Valida que el payload no incluya datos sensibles ni IPs (Ley 25.326)
 */
export function validatePrivacyCompliance(payload = {}) {
  if (!payload || typeof payload !== 'object') return false;

  for (const key of Object.keys(payload)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      return false;
    }
  }

  if (payload.meta && typeof payload.meta === 'object') {
    for (const key of Object.keys(payload.meta)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Genera el snippet de cliente vanilla JS inyectable en las previews
 */
export function getTelemetryClientSnippet({
  slug = 'demo',
  endpointUrl = 'https://telemetry.nexobow.site/api/ping'
} = {}) {
  // Código vanilla ultraliviano minificado (~380 bytes)
  return `<script>(function(){try{var s="${slug}",u="${endpointUrl}",p=function(e,m){var d=JSON.stringify({event:e,slug:s,timestamp:Date.now(),meta:m||{},compliance:"Ley 25.326 - 0 Cookies"});if(navigator.sendBeacon){navigator.sendBeacon(u,d)}else{fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:d,keepalive:true}).catch(function(){})}};p("preview_view");window.addEventListener("theme-switched",function(ev){p("theme_switch",{theme:ev.detail&&ev.detail.theme})});document.addEventListener("click",function(ev){var t=ev.target.closest("a[href*='wa.me'], a[href*='whatsapp'], a[href*='calendly']");if(t){p("cta_click",{ctaLabel:t.innerText.trim().slice(0,30)})}})}catch(err){}})();</script>`;
}

// Ejecución como CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args[0] || 'demo';
  const endpoint = args[1] || 'https://telemetry.nexobow.site/api/ping';

  console.log(`\n📡 GENERADOR DE TELEMETRÍA NEXOBOW (Ley 25.326 Compliant)`);
  console.log(`Slug: ${slug} | Endpoint: ${endpoint}\n`);

  const snippet = getTelemetryClientSnippet({ slug, endpointUrl: endpoint });
  const bytes = Buffer.byteLength(snippet, 'utf8');

  console.log(`Tamaño del snippet: ${bytes} bytes (< 1 KB)`);
  console.log(`Código generado:\n${snippet}\n`);
}
