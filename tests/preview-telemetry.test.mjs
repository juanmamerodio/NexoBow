import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TELEMETRY_EVENTS,
  buildTelemetryPayload,
  getTelemetryClientSnippet,
  validatePrivacyCompliance
} from '../scripts/preview-telemetry.mjs';

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
});
