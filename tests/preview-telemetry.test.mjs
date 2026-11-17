import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TELEMETRY_EVENTS,
  buildTelemetryPayload,
  getTelemetryClientSnippet,
  validatePrivacyCompliance,
  injectTelemetrySnippetIntoHtml,
} from '../scripts/preview-telemetry.mjs';
import * as buildClientSite from '../scripts/build-client-site.mjs';
import { auditHtmlDocument } from '../scripts/audit-site.mjs';
import { onRequestOptions, onRequestPost } from '../web/functions/api/ping.ts';

describe('T37: preview-telemetry - Telemetría Pasiva sin Cookies', () => {
  test('T37.1: TELEMETRY_EVENTS define los 3 eventos esenciales de conversión', () => {
    assert.deepEqual(TELEMETRY_EVENTS, ['preview_view', 'theme_switch', 'cta_click']);
  });

  test('T37.2: buildTelemetryPayload genera estructura anónima sin cookies ni PII', () => {
    const payload = buildTelemetryPayload({
      event: 'theme_switch',
      slug: '20-martin-albarracin-abogado',
      theme: 'obsidian-gold',
      timestamp: 1729630000000
    });

    assert.equal(payload.event, 'theme_switch');
    assert.equal(payload.slug, '20-martin-albarracin-abogado');
    assert.equal(payload.meta.theme, 'obsidian-gold');
    assert.equal(payload.compliance, 'Ley 25.326 - 0 Cookies');
    assert.equal(payload.timestamp, 1729630000000);
  });

  test('T37.3: validatePrivacyCompliance rechaza payloads con IPs o datos sensibles', () => {
    // Caso compliant (anónimo)
    const cleanPayload = buildTelemetryPayload({
      event: 'preview_view',
      slug: '10-sofia-nutri'
    });
    assert.equal(validatePrivacyCompliance(cleanPayload), true);

    // Caso no-compliant (intento de inyectar IP o email)
    const dirtyPayload = {
      ...cleanPayload,
      ip: '190.210.45.12',
      email: 'lead@gmail.com'
    };
    assert.equal(validatePrivacyCompliance(dirtyPayload), false);
  });

  test('T37.4: getTelemetryClientSnippet genera script vanilla de menos de 1024 bytes (1 KB)', () => {
    const snippet = getTelemetryClientSnippet({
      slug: '22-alejandra-martinez-nutri',
      endpointUrl: 'https://telemetry.nexobow.site/api/ping'
    });

    const byteSize = Buffer.byteLength(snippet, 'utf8');
    assert.ok(byteSize < 1024, `El script debe pesar menos de 1 KB (actual: ${byteSize} bytes)`);
    assert.ok(snippet.includes('sendBeacon') || snippet.includes('fetch'));
    assert.ok(snippet.includes('22-alejandra-martinez-nutri'));
    assert.ok(!snippet.includes('document.cookie'), 'No debe tocar cookies');
  });

  test('T37.5 (Ticket #50): getTelemetryClientSnippet apunta por defecto a /api/ping (< 1 KB) y escucha theme-switched', () => {
    const snippet = getTelemetryClientSnippet({
      slug: '24-centro-odontologico-odonto'
    });

    const byteSize = Buffer.byteLength(snippet, 'utf8');
    assert.ok(byteSize < 1024, `El script debe pesar menos de 1 KB (actual: ${byteSize} bytes)`);
    assert.ok(snippet.includes('/api/ping'), 'El endpoint por defecto debe ser /api/ping');
    assert.ok(snippet.includes('theme-switched'), 'Debe escuchar el CustomEvent theme-switched');
    assert.ok(snippet.includes('Ley 25.326 - 0 Cookies'), 'Debe declarar cumplimiento Ley 25.326 - 0 Cookies');
    assert.ok(!snippet.includes('document.cookie'), 'Prohibido usar document.cookie');
  });

  test('T37.6 (Ticket #50): build-client-site inyecta snippet < 1 KB hacia /api/ping de forma idempotente y web/ mantiene 0 <script> ejecutables', () => {
    assert.equal(typeof injectTelemetrySnippetIntoHtml, 'function', 'preview-telemetry debe exportar injectTelemetrySnippetIntoHtml');
    assert.equal(typeof buildClientSite.injectTelemetrySnippetIntoHtml, 'function', 'build-client-site debe exportar injectTelemetrySnippetIntoHtml');
    assert.equal(typeof buildClientSite.injectTelemetryIntoSiteDist, 'function', 'build-client-site debe exportar injectTelemetryIntoSiteDist');

    // Seam de inyección sobre un directorio dist/ compilado de clon
    const tempDist = mkdtempSync(join(tmpdir(), 'nexobow-telemetry-dist-'));
    try {
      const indexHtmlPath = join(tempDist, 'index.html');
      const rawHtml = `<!doctype html>
<html lang="es-AR">
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
  <h1>Centro Odontológico</h1>
  <img src="/hero.jpg" alt="Consultorio">
  <a href="https://wa.me/5493489536088">WhatsApp</a>
</body>
</html>`;
      writeFileSync(indexHtmlPath, rawHtml, 'utf8');

      const res1 = buildClientSite.injectTelemetryIntoSiteDist(tempDist, '24-centro-odontologico-odonto');
      assert.equal(res1.injected, true);
      assert.ok(res1.snippetBytes < 1024, `El snippet inyectado debe ser < 1024 bytes (actual: ${res1.snippetBytes})`);

      const injectedHtml = readFileSync(indexHtmlPath, 'utf8');
      assert.ok(injectedHtml.includes('/api/ping'), 'El HTML compilado del clon debe incluir /api/ping');
      assert.ok(injectedHtml.includes('24-centro-odontologico-odonto'), 'El HTML compilado debe incluir el slug del clon');
      assert.ok(injectedHtml.includes('theme-switched'), 'El snippet inyectado debe escuchar theme-switched');

      // Idempotencia: segunda llamada no duplica el <script>
      buildClientSite.injectTelemetryIntoSiteDist(tempDist, '24-centro-odontologico-odonto');
      const twiceHtml = readFileSync(indexHtmlPath, 'utf8');
      const scriptMatches = twiceHtml.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
      assert.equal(scriptMatches.length, 1, 'No debe duplicar el snippet de telemetría si ya fue inyectado');

      const siteAudit = auditHtmlDocument(twiceHtml, { mode: 'site' });
      assert.equal(siteAudit.ok, true, `La auditoría del clon con telemetría falló: ${siteAudit.errors.join('; ')}`);
    } finally {
      rmSync(tempDist, { recursive: true, force: true });
    }

    // Verificar que scripts/build-client-site.mjs invoca injectTelemetryIntoSiteDist en su flujo principal
    const buildScriptSrc = readFileSync(join(process.cwd(), 'scripts', 'build-client-site.mjs'), 'utf8');
    assert.match(buildScriptSrc, /injectTelemetryIntoSiteDist\(/, 'build-client-site.mjs debe invocar injectTelemetryIntoSiteDist al compilar');

    // Guardrail 0-JS estricto en web/dist/index.html y web/dist/solicitud-enviada/index.html
    for (const relPath of ['web/dist/index.html', 'web/dist/solicitud-enviada/index.html']) {
      const fullPath = join(process.cwd(), relPath);
      assert.ok(existsSync(fullPath), `${relPath} debe existir`);
      const webHtml = readFileSync(fullPath, 'utf8');
      const webAudit = auditHtmlDocument(webHtml, { mode: 'web', requireWhatsappCta: false });
      assert.equal(webAudit.executableScriptCount, 0, `${relPath} debe tener exactamente 0 <script> ejecutables`);
      assert.equal(webAudit.ok, true, `Auditoría 0-JS falló en ${relPath}: ${webAudit.errors.join('; ')}`);
    }
  });

  test('T37.7 (Ticket #52): onRequestOptions y onRequestPost responden con cabeceras CORS válidas y 0 cookies', async () => {
    const optRes = await onRequestOptions({
      request: new Request('https://preview.nexobow.site/api/ping', { method: 'OPTIONS' }),
      env: {},
    });

    assert.ok(optRes.status === 200 || optRes.status === 204);
    assert.ok(optRes.headers.get('access-control-allow-origin'));
    assert.match(optRes.headers.get('access-control-allow-methods') || '', /POST/);
    assert.match(optRes.headers.get('access-control-allow-methods') || '', /OPTIONS/);
    assert.equal(optRes.headers.get('set-cookie'), null, 'OPTIONS no debe setear cookies');

    const badPostRes = await onRequestPost({
      request: new Request('https://preview.nexobow.site/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      }),
      env: {},
    });
    assert.ok(badPostRes.headers.get('access-control-allow-origin'));
    assert.equal(badPostRes.headers.get('set-cookie'), null, 'POST no debe setear cookies');
  });

  test('T37.8 (Ticket #52): onRequestPost rechaza con HTTP 400 payloads malformados o con claves prohibidas por Ley 25.326', async () => {
    const forbiddenPayloads = [
      'not-json',
      JSON.stringify({ event: 'preview_view' }), // falta slug
      JSON.stringify({ event: 'unknown_event', slug: '24-centro-odonto' }),
      JSON.stringify({ event: 'preview_view', slug: '24-centro-odonto', ip: '190.1.2.3' }),
      JSON.stringify({ event: 'preview_view', slug: '24-centro-odonto', email: 'test@gmail.com' }),
      JSON.stringify({ event: 'preview_view', slug: '24-centro-odonto', phone: '+5491155556666' }),
      JSON.stringify({ event: 'preview_view', slug: '24-centro-odonto', dni: '30123456' }),
      JSON.stringify({ event: 'preview_view', slug: '24-centro-odonto', cookie: 'sid=abc' }),
      JSON.stringify({
        event: 'theme_switch',
        slug: '24-centro-odonto',
        meta: { theme: 'Obsidian Gold', ip: '127.0.0.1' },
      }),
    ];

    for (const body of forbiddenPayloads) {
      const res = await onRequestPost({
        request: new Request('https://preview.nexobow.site/api/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
        env: {},
      });
      assert.equal(res.status, 400, `Payload debe ser rechazado con 400: ${body}`);
      assert.equal(res.headers.get('set-cookie'), null);
    }
  });

  test('T37.9 (Ticket #52): onRequestPost localiza lead por slug en Supabase mock, actualiza metadata.telemetry y dispara alerta Hot-Lead', async () => {
    const leadsDb = new Map([
      [
        '24-centro-odontologico-odonto',
        {
          id: 24,
          slug: '24-centro-odontologico-odonto',
          name: 'Centro Odontológico Palermo',
          niche: 'odontologo',
          whatsapp_link: 'https://wa.me/5491160001111',
          phone: '+5491160001111',
          metadata: {
            email: 'turnos@centropalermo.com.ar',
            telemetry: {
              views_count: 0,
              cta_clicks: 0,
              selected_theme: null,
              is_hot_lead: false,
            },
          },
        },
      ],
    ]);

    const mockSupabase = {
      from(table) {
        assert.equal(table, 'leads');
        return {
          select() {
            return {
              eq(col, val) {
                assert.equal(col, 'slug');
                return {
                  maybeSingle() {
                    const row = leadsDb.get(val) ? structuredClone(leadsDb.get(val)) : null;
                    return Promise.resolve({ data: row, error: null });
                  },
                };
              },
            };
          },
          update(patch) {
            return {
              eq(col, val) {
                const target = col === 'slug'
                  ? leadsDb.get(val)
                  : Array.from(leadsDb.values()).find((l) => l.id === val);
                if (target) {
                  leadsDb.set(target.slug, { ...target, ...patch });
                }
                return Promise.resolve({ data: target ? [leadsDb.get(target.slug)] : [], error: null });
              },
            };
          },
        };
      },
    };

    const alerts = [];
    const mockNotifyHotLead = async (alertPayload) => {
      alerts.push(alertPayload);
      return { ok: true, id: `alert-${alerts.length}` };
    };

    const env = {
      ADMIN_OWNER_EMAIL: 'juanma@nexobow.site',
      PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role',
    };

    // 1. Primera vista (views_count 0 -> 1): actualiza telemetry y dispara alerta Hot-Lead
    const res1 = await onRequestPost({
      request: new Request('https://preview.nexobow.site/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, // simula navigator.sendBeacon
        body: JSON.stringify({
          event: 'preview_view',
          slug: '24-centro-odontologico-odonto',
          timestamp: 1763390000000,
          meta: {},
          compliance: 'Ley 25.326 - 0 Cookies',
        }),
      }),
      env,
      supabaseClient: mockSupabase,
      notifyHotLead: mockNotifyHotLead,
    });

    assert.ok(res1.status === 200 || res1.status === 204);
    assert.equal(res1.headers.get('set-cookie'), null);

    let leadAfter = leadsDb.get('24-centro-odontologico-odonto');
    assert.equal(leadAfter.metadata.telemetry.views_count, 1);
    assert.equal(leadAfter.metadata.telemetry.last_event, 'preview_view');
    assert.ok(leadAfter.metadata.telemetry.last_viewed_at);
    assert.equal(leadAfter.metadata.telemetry.is_hot_lead, true);
    assert.equal(alerts.length, 1, 'Primera vista debe disparar alerta Hot-Lead');
    assert.equal(alerts[0].to, 'juanma@nexobow.site');
    assert.match(alerts[0].html + alerts[0].text, /\/admin\/crm/);
    assert.match(alerts[0].html + alerts[0].text, /wa\.me\/5491160001111/);

    // 2. Segunda vista repetida (views_count 1 -> 2): NO vuelve a disparar alerta de primera vista
    const res2 = await onRequestPost({
      request: new Request('https://preview.nexobow.site/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'preview_view',
          slug: '24-centro-odontologico-odonto',
          timestamp: 1763390010000,
          compliance: 'Ley 25.326 - 0 Cookies',
        }),
      }),
      env,
      supabaseClient: mockSupabase,
      notifyHotLead: mockNotifyHotLead,
    });
    assert.ok(res2.status === 200 || res2.status === 204);
    leadAfter = leadsDb.get('24-centro-odontologico-odonto');
    assert.equal(leadAfter.metadata.telemetry.views_count, 2);
    assert.equal(alerts.length, 1, 'Segunda preview_view no debe duplicar alerta de primera vista');

    // 3. theme_switch: guarda selected_theme y dispara alerta Hot-Lead
    const res3 = await onRequestPost({
      request: new Request('https://preview.nexobow.site/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'theme_switch',
          slug: '24-centro-odontologico-odonto',
          timestamp: 1763390020000,
          meta: { theme: 'Obsidian Gold' },
          compliance: 'Ley 25.326 - 0 Cookies',
        }),
      }),
      env,
      supabaseClient: mockSupabase,
      notifyHotLead: mockNotifyHotLead,
    });
    assert.ok(res3.status === 200 || res3.status === 204);
    leadAfter = leadsDb.get('24-centro-odontologico-odonto');
    assert.equal(leadAfter.metadata.telemetry.selected_theme, 'Obsidian Gold');
    assert.equal(leadAfter.metadata.telemetry.last_event, 'theme_switch');
    assert.equal(alerts.length, 2, 'theme_switch debe disparar alerta Hot-Lead');

    // 4. cta_click: incrementa cta_clicks y dispara alerta Hot-Lead
    const res4 = await onRequestPost({
      request: new Request('https://preview.nexobow.site/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'cta_click',
          slug: '24-centro-odontologico-odonto',
          timestamp: 1763390030000,
          meta: { ctaLabel: 'Solicitar Turno' },
          compliance: 'Ley 25.326 - 0 Cookies',
        }),
      }),
      env,
      supabaseClient: mockSupabase,
      notifyHotLead: mockNotifyHotLead,
    });
    assert.ok(res4.status === 200 || res4.status === 204);
    leadAfter = leadsDb.get('24-centro-odontologico-odonto');
    assert.equal(leadAfter.metadata.telemetry.cta_clicks, 1);
    assert.equal(leadAfter.metadata.telemetry.last_event, 'cta_click');
    assert.equal(alerts.length, 3, 'cta_click debe disparar alerta Hot-Lead');
  });
});
