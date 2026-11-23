// tests/autonomous-ingest-e2e.test.mjs — Suite TDD Seam 6 (Ticket #62: Edge Ingest /api/v1/autonomous/ingest sin PII, Salud Gate 1 en Settings & Cierre Frente I)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INGEST_PATH = join(
  REPO_ROOT,
  "web",
  "functions",
  "api",
  "v1",
  "autonomous",
  "ingest.ts"
);
const SETTINGS_LIB_PATH = join(REPO_ROOT, "web", "src", "lib", "settings.ts");
const SETTINGS_VIEW_PATH = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "SettingsView.tsx"
);
const ENV_EXAMPLE_PATH = join(REPO_ROOT, ".env.example");

const VALID_AUTONOMOUS_EVENT_TYPES = [
  "heartbeat",
  "appointment_confirmed",
  "appointment_rescheduled",
  "appointment_cancelled",
  "waitlist_filled",
  "review_invite_sent",
  "human_handoff",
];

function createMockSupabaseForAutonomous(initialRows = []) {
  const inserted = [];
  const rows = initialRows.map((r) => structuredClone(r));

  return {
    inserted,
    rows,
    from(table) {
      assert.equal(table, "autonomous_events");
      return {
        insert(payload) {
          const items = Array.isArray(payload) ? payload : [payload];
          const stored = items.map((item, idx) => ({
            id: `evt-mock-${rows.length + idx + 1}`,
            ...structuredClone(item),
          }));
          for (const rec of stored) {
            rows.push(rec);
            inserted.push(rec);
          }
          return {
            select() {
              return Promise.resolve({ data: stored, error: null });
            },
            then(onFulfilled, onRejected) {
              return Promise.resolve({ data: stored, error: null }).then(
                onFulfilled,
                onRejected
              );
            },
          };
        },
      };
    },
  };
}

function makeIngestRequest(body, headers = {}, method = "POST") {
  const finalHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };
  return new Request("https://nexobow.site/api/v1/autonomous/ingest", {
    method,
    headers: finalHeaders,
    body:
      method === "OPTIONS" || body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

test("T62 (Seam 6): Endpoint /api/v1/autonomous/ingest (Sin PII), Salud Gate 1 en Settings & .env.example", async (t) => {
  const TEST_INGEST_KEY = "nb_ingest_key_test_64_hex_0123456789abcdef0123456789abcdef";
  const FIXED_NOW = new Date("2026-11-23T03:00:00.000Z");

  await t.test(
    "1. Falla cerrada HTTP 503 con Cache-Control: no-store si falta AUTONOMOUS_INGEST_KEY (CF_PAGES=1, ENVIRONMENT=production u offline) y OPTIONS 204 sin wildcard",
    async () => {
      assert.ok(existsSync(INGEST_PATH), `Debe existir ${INGEST_PATH}`);
      const ingestMod = await import("../web/functions/api/v1/autonomous/ingest.ts");

      const validPayload = {
        client_slug: "24-centro-odonto-palermo",
        event_type: "heartbeat",
        period_date: "2026-11-23",
        count_delta: 1,
      };

      for (const envCase of [
        { CF_PAGES: "1" },
        { ENVIRONMENT: "production" },
        {},
      ]) {
        const dbMock = createMockSupabaseForAutonomous();
        const res = await ingestMod.onRequestPost({
          request: makeIngestRequest(validPayload, {
            "X-Autonomous-Key": TEST_INGEST_KEY,
          }),
          env: envCase,
          supabaseClient: dbMock,
          now: () => FIXED_NOW,
        });
        assert.equal(
          res.status,
          503,
          `Sin AUTONOMOUS_INGEST_KEY (${JSON.stringify(envCase)}) debe fallar cerrado con 503`
        );
        assert.equal(res.headers.get("Cache-Control"), "no-store");
        assert.equal(dbMock.inserted.length, 0);
      }

      const optRes = await ingestMod.onRequestOptions({
        request: makeIngestRequest(undefined, {}, "OPTIONS"),
        env: { AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY },
      });
      assert.equal(optRes.status, 204);
      assert.equal(optRes.headers.get("Cache-Control"), "no-store");
      assert.notEqual(optRes.headers.get("Access-Control-Allow-Origin"), "*");
    }
  );

  await t.test(
    "2. Rechazo 401/403 con X-Autonomous-Key ausente o inválida vía constantTimeEqual, 0 imports node:* y 0 fallback anon",
    async () => {
      const ingestSrc = readFileSync(INGEST_PATH, "utf8");
      assert.match(
        ingestSrc,
        /constantTimeEqual/,
        "ingest.ts debe reutilizar constantTimeEqual desde unsubscribe-token.ts"
      );
      assert.match(
        ingestSrc,
        /unsubscribe-token\.ts/,
        "ingest.ts debe importar constantTimeEqual desde unsubscribe-token.ts"
      );
      assert.doesNotMatch(
        ingestSrc,
        /\bfrom\s+["']node:/i,
        "ingest.ts no debe contener imports node:* para compatibilidad Cloudflare Workers"
      );
      assert.doesNotMatch(
        ingestSrc,
        /\b(?:import|require)\s*\(\s*["']node:/i,
        "ingest.ts no debe importar dinámicamente módulos node:*"
      );
      assert.doesNotMatch(
        ingestSrc,
        /PUBLIC_SUPABASE_ANON_KEY/,
        "ingest.ts no debe referenciar ni hacer fallback a PUBLIC_SUPABASE_ANON_KEY"
      );

      const ingestMod = await import("../web/functions/api/v1/autonomous/ingest.ts");
      const dbMock = createMockSupabaseForAutonomous();
      const baseEnv = { AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY, CF_PAGES: "1" };
      const body = {
        client_slug: "clinica-ejemplo",
        event_type: "heartbeat",
        period_date: "2026-11-23",
        count_delta: 1,
      };

      const resMissing = await ingestMod.onRequestPost({
        request: makeIngestRequest(body),
        env: baseEnv,
        supabaseClient: dbMock,
      });
      assert.equal(resMissing.status, 401);
      assert.equal(resMissing.headers.get("Cache-Control"), "no-store");
      const textMissing = await resMissing.text();
      assert.ok(!textMissing.includes(TEST_INGEST_KEY));

      const almostValid = TEST_INGEST_KEY.slice(0, -1) + "0";
      for (const badKey of ["clave-incorrecta", "nb_ingest", almostValid]) {
        const resInvalid = await ingestMod.onRequestPost({
          request: makeIngestRequest(body, { "X-Autonomous-Key": badKey }),
          env: baseEnv,
          supabaseClient: dbMock,
        });
        assert.ok(
          resInvalid.status === 401 || resInvalid.status === 403,
          `Clave inválida debe responder 401/403 (actual: ${resInvalid.status})`
        );
        assert.equal(resInvalid.headers.get("Cache-Control"), "no-store");
        const txt = await resInvalid.text();
        assert.ok(!txt.includes(TEST_INGEST_KEY), "No debe filtrar la clave esperada");
        assert.ok(!txt.includes(badKey), "No debe reflejar la clave recibida");
      }

      assert.equal(dbMock.inserted.length, 0);
    }
  );

  await t.test(
    "3. Rechazo HTTP 413 para cuerpos > 4 KB y HTTP 400 para JSON vacío, malformado o no-objeto",
    async () => {
      const ingestMod = await import("../web/functions/api/v1/autonomous/ingest.ts");
      const dbMock = createMockSupabaseForAutonomous();
      const env = { AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY };
      const headers = { "X-Autonomous-Key": TEST_INGEST_KEY };

      const bigBody = JSON.stringify({
        client_slug: "clinica-ejemplo",
        event_type: "heartbeat",
        period_date: "2026-11-23",
        count_delta: 1,
        summary: { pad: "a".repeat(4200) },
      });
      assert.ok(Buffer.byteLength(bigBody, "utf8") > 4096);

      const res413 = await ingestMod.onRequestPost({
        request: makeIngestRequest(bigBody, headers),
        env,
        supabaseClient: dbMock,
      });
      assert.equal(res413.status, 413);
      assert.equal(res413.headers.get("Cache-Control"), "no-store");

      for (const badRaw of ["", "   ", "{json-roto", "[]", '"texto"']) {
        const resBad = await ingestMod.onRequestPost({
          request: makeIngestRequest(badRaw, headers),
          env,
          supabaseClient: dbMock,
        });
        assert.equal(resBad.status, 400);
        assert.equal(resBad.headers.get("Cache-Control"), "no-store");
      }

      assert.equal(dbMock.inserted.length, 0);
    }
  );

  await t.test(
    "4. Escaneo recursivo anti-PII Ley 25.326 rechaza con HTTP 400 cualquier clave personal en raíz, subobjetos o arreglos",
    async () => {
      const ingestMod = await import("../web/functions/api/v1/autonomous/ingest.ts");
      const dbMock = createMockSupabaseForAutonomous();
      const env = { AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY };
      const headers = { "X-Autonomous-Key": TEST_INGEST_KEY };

      const piiSamples = [
        ["phone", "+5491155556666"],
        ["telefono", "1144445555"],
        ["Teléfono", "1144445555"],
        ["patient_phone", "+5491160001111"],
        ["patient_phone_e164", "+5491160001111"],
        ["patient_name", "Laura Gómez"],
        ["Patient_First_Name", "Laura"],
        ["email", "paciente@ejemplo.com.ar"],
        ["EMAIL", "paciente@ejemplo.com.ar"],
        ["dni", "30111222"],
        ["cuit", "27301112224"],
        ["message_text", "Hola quiero turno el martes"],
        ["audio_transcript", "Necesito reprogramar para la tarde"],
      ];

      for (const [piiKey, piiVal] of piiSamples) {
        // Caso A: en raíz
        const rootPayload = {
          client_slug: "clinica-ejemplo",
          event_type: "appointment_confirmed",
          period_date: "2026-11-23",
          count_delta: 1,
          [piiKey]: piiVal,
        };
        const rootRes = await ingestMod.onRequestPost({
          request: makeIngestRequest(rootPayload, headers),
          env,
          supabaseClient: dbMock,
        });
        assert.equal(
          rootRes.status,
          400,
          `Debe rechazar con 400 clave PII en raíz: ${piiKey}`
        );
        assert.equal(rootRes.headers.get("Cache-Control"), "no-store");
        const rootTxt = await rootRes.text();
        assert.ok(
          !rootTxt.includes(piiVal),
          `La respuesta 400 no debe hacer eco del valor PII (${piiKey})`
        );

        // Caso B: anidado profundo dentro de summary y dentro de array
        const nestedPayload = {
          client_slug: "clinica-ejemplo",
          event_type: "appointment_confirmed",
          period_date: "2026-11-23",
          count_delta: 1,
          summary: {
            workflow_id: "01-waba-receptionist",
            nested: {
              records: [{ [piiKey]: piiVal }],
            },
          },
        };
        const nestedRes = await ingestMod.onRequestPost({
          request: makeIngestRequest(nestedPayload, headers),
          env,
          supabaseClient: dbMock,
        });
        assert.equal(
          nestedRes.status,
          400,
          `Debe rechazar con 400 clave PII anidada en summary: ${piiKey}`
        );
        assert.equal(nestedRes.headers.get("Cache-Control"), "no-store");
        const nestedTxt = await nestedRes.text();
        assert.ok(
          !nestedTxt.includes(piiVal),
          `La respuesta 400 anidada no debe hacer eco del valor PII (${piiKey})`
        );
      }

      assert.equal(dbMock.inserted.length, 0);
    }
  );

  await t.test(
    "5. Validación estricta de client_slug, enum event_type, count_delta (0..10000) y period_date (YYYY-MM-DD)",
    async () => {
      const ingestMod = await import("../web/functions/api/v1/autonomous/ingest.ts");
      const dbMock = createMockSupabaseForAutonomous();
      const env = { AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY };
      const headers = { "X-Autonomous-Key": TEST_INGEST_KEY };

      const invalidPayloads = [
        { client_slug: "", event_type: "heartbeat", period_date: "2026-11-23", count_delta: 1 },
        { client_slug: "con espacios", event_type: "heartbeat", period_date: "2026-11-23", count_delta: 1 },
        { client_slug: "../etc", event_type: "heartbeat", period_date: "2026-11-23", count_delta: 1 },
        { client_slug: "5491155556666", event_type: "heartbeat", period_date: "2026-11-23", count_delta: 1 },
        { client_slug: "clinica-ok", event_type: "evento_inexistente", period_date: "2026-11-23", count_delta: 1 },
        { client_slug: "clinica-ok", event_type: "", period_date: "2026-11-23", count_delta: 1 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-11-23", count_delta: -1 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-11-23", count_delta: 10001 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-11-23", count_delta: 1.5 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-11-23", count_delta: "3" },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-02-30", count_delta: 1 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-13-01", count_delta: 1 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "23/11/2026", count_delta: 1 },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-11-23", summary: ["no-obj"] },
        { client_slug: "clinica-ok", event_type: "heartbeat", period_date: "2026-11-23", extra_unknown: true },
      ];

      for (const bad of invalidPayloads) {
        const res = await ingestMod.onRequestPost({
          request: makeIngestRequest(bad, headers),
          env,
          supabaseClient: dbMock,
          now: () => FIXED_NOW,
        });
        assert.equal(
          res.status,
          400,
          `Payload inválido debe responder 400: ${JSON.stringify(bad)}`
        );
        assert.equal(res.headers.get("Cache-Control"), "no-store");
      }

      assert.equal(dbMock.inserted.length, 0);

      for (let i = 0; i < VALID_AUTONOMOUS_EVENT_TYPES.length; i++) {
        const eventType = VALID_AUTONOMOUS_EVENT_TYPES[i];
        const countDelta = i === 0 ? 0 : i === VALID_AUTONOMOUS_EVENT_TYPES.length - 1 ? 10000 : i;
        const res = await ingestMod.onRequestPost({
          request: makeIngestRequest(
            {
              client_slug: "24-centro-odonto-palermo",
              event_type: eventType,
              period_date: "2026-11-23",
              count_delta: countDelta,
              engine_version: "gate1-v1",
              summary: {
                workflow_id: "01-waba-receptionist",
                requires_human_handoff: eventType === "human_handoff",
              },
            },
            headers
          ),
          env,
          supabaseClient: dbMock,
          now: () => FIXED_NOW,
        });
        assert.ok(
          res.status === 200 || res.status === 201,
          `Evento válido ${eventType} debe responder 200/201 (actual: ${res.status})`
        );
        assert.equal(res.headers.get("Cache-Control"), "no-store");
      }

      assert.equal(dbMock.inserted.length, VALID_AUTONOMOUS_EVENT_TYPES.length);
      assert.equal(dbMock.inserted[0].count_delta, 0);
      assert.equal(dbMock.inserted[VALID_AUTONOMOUS_EVENT_TYPES.length - 1].count_delta, 10000);
      assert.equal(dbMock.inserted[0].received_at, FIXED_NOW.toISOString());
    }
  );

  await t.test(
    "6. Persistencia REST en public.autonomous_events usa únicamente SUPABASE_SERVICE_ROLE_KEY (sin fallback anon -> 503)",
    async () => {
      const ingestMod = await import("../web/functions/api/v1/autonomous/ingest.ts");
      const headers = { "X-Autonomous-Key": TEST_INGEST_KEY };
      const body = {
        client_slug: "clinica-ejemplo",
        event_type: "appointment_confirmed",
        period_date: "2026-11-23",
        count_delta: 2,
        summary: { workflow_id: "02-reminders-waitlist" },
      };

      // Sin SUPABASE_SERVICE_ROLE_KEY (aun teniendo PUBLIC_SUPABASE_ANON_KEY) -> falla cerrado 503 sin invocar fetch
      let fetchCallsWithoutService = 0;
      const resNoService = await ingestMod.onRequestPost({
        request: makeIngestRequest(body, headers),
        env: {
          CF_PAGES: "1",
          AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY,
          PUBLIC_SUPABASE_URL: "https://demo-project.supabase.co",
          PUBLIC_SUPABASE_ANON_KEY: "anon-key-not-allowed",
        },
        fetchImpl: async () => {
          fetchCallsWithoutService++;
          return new Response("[]", { status: 201 });
        },
      });
      assert.equal(resNoService.status, 503);
      assert.equal(resNoService.headers.get("Cache-Control"), "no-store");
      assert.equal(fetchCallsWithoutService, 0);

      // Con SUPABASE_SERVICE_ROLE_KEY -> POST /rest/v1/autonomous_events con Bearer serviceKey -> 201
      const restCalls = [];
      const resRestOk = await ingestMod.onRequestPost({
        request: makeIngestRequest(body, headers),
        env: {
          CF_PAGES: "1",
          AUTONOMOUS_INGEST_KEY: TEST_INGEST_KEY,
          PUBLIC_SUPABASE_URL: "https://demo-project.supabase.co/",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
        },
        now: () => FIXED_NOW,
        fetchImpl: async (url, init) => {
          const parsedBody = JSON.parse(String(init?.body || "[]"));
          restCalls.push({ url: String(url), init, parsedBody });
          return new Response(
            JSON.stringify([{ id: "uuid-rest-1", ...parsedBody[0] }]),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            }
          );
        },
      });

      assert.equal(resRestOk.status, 201);
      assert.equal(resRestOk.headers.get("Cache-Control"), "no-store");
      assert.equal(restCalls.length, 1);
      assert.equal(
        restCalls[0].url,
        "https://demo-project.supabase.co/rest/v1/autonomous_events"
      );
      assert.equal(restCalls[0].init.method, "POST");
      assert.equal(restCalls[0].init.headers.apikey, "service-role-test-key");
      assert.equal(
        restCalls[0].init.headers.Authorization,
        "Bearer service-role-test-key"
      );
      assert.equal(restCalls[0].parsedBody[0].client_slug, "clinica-ejemplo");
      assert.equal(restCalls[0].parsedBody[0].event_type, "appointment_confirmed");
      assert.equal(restCalls[0].parsedBody[0].count_delta, 2);
      assert.equal(restCalls[0].parsedBody[0].received_at, FIXED_NOW.toISOString());
    }
  );

  await t.test(
    "7. resolveGate1EngineStatus({ events, envConfigured, now }) en settings.ts resuelve Preparado -> Operativo -> Requiere revisión",
    async () => {
      assert.ok(existsSync(SETTINGS_LIB_PATH));
      const settingsMod = await import("../web/src/lib/settings.ts");
      assert.equal(
        typeof settingsMod.resolveGate1EngineStatus,
        "function",
        "settings.ts debe exportar resolveGate1EngineStatus"
      );

      const now = new Date("2026-11-23T12:00:00.000Z");

      // A. Sin eventos recientes ni error de configuración -> Preparado (Gate 0 · $0 VPS)
      const prepared = settingsMod.resolveGate1EngineStatus({
        events: [],
        envConfigured: true,
        now,
      });
      assert.equal(prepared.status, "Preparado (Gate 0 · $0 VPS)");
      assert.equal(prepared.code, "prepared_gate0");
      assert.equal(prepared.totalEvents, 0);
      assert.equal(prepared.lastHeartbeatAt, null);

      // B. Heartbeat válido dentro de las últimas 24h (incluso con count_delta: 0) -> Operativo
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const operationalHeartbeat = settingsMod.resolveGate1EngineStatus({
        events: [
          {
            id: "evt-hb-1",
            client_slug: "clinica-ejemplo",
            event_type: "heartbeat",
            period_date: "2026-11-23",
            count_delta: 0,
            engine_version: "gate1-v1",
            summary: { workflow_id: "01-waba-receptionist" },
            received_at: twoHoursAgo,
          },
        ],
        envConfigured: true,
        now,
      });
      assert.equal(operationalHeartbeat.status, "Operativo");
      assert.equal(operationalHeartbeat.code, "operational");
      assert.equal(operationalHeartbeat.lastHeartbeatAt, twoHoursAgo);

      // C. Evento de negocio válido dentro de las últimas 24h -> Operativo
      const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();
      const operationalEvent = settingsMod.resolveGate1EngineStatus({
        events: [
          {
            id: "evt-app-1",
            client_slug: "clinica-ejemplo",
            event_type: "appointment_confirmed",
            period_date: "2026-11-23",
            count_delta: 4,
            engine_version: "gate1-v1",
            summary: {},
            received_at: fiveHoursAgo,
          },
        ],
        envConfigured: true,
        now,
      });
      assert.equal(operationalEvent.status, "Operativo");
      assert.equal(operationalEvent.byType.appointment_confirmed, 4);
      assert.equal(operationalEvent.lastEventAt, fiveHoursAgo);

      // D. envConfigured === false -> Requiere revisión
      const badEnv = settingsMod.resolveGate1EngineStatus({
        events: [
          {
            id: "evt-hb-2",
            client_slug: "clinica-ejemplo",
            event_type: "heartbeat",
            period_date: "2026-11-23",
            count_delta: 1,
            engine_version: "gate1-v1",
            summary: {},
            received_at: twoHoursAgo,
          },
        ],
        envConfigured: false,
        now,
      });
      assert.equal(badEnv.status, "Requiere revisión");
      assert.equal(badEnv.code, "needs_review");

      // E. Último latido > 24h con Gate 1 ya activo -> Requiere revisión
      const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
      const stale = settingsMod.resolveGate1EngineStatus({
        events: [
          {
            id: "evt-stale-1",
            client_slug: "clinica-ejemplo",
            event_type: "heartbeat",
            period_date: "2026-11-22",
            count_delta: 1,
            engine_version: "gate1-v1",
            summary: {},
            received_at: thirtyHoursAgo,
          },
        ],
        envConfigured: true,
        gate1Active: true,
        now,
      });
      assert.equal(stale.status, "Requiere revisión");
      assert.equal(stale.code, "needs_review");
    }
  );

  await t.test(
    "8. SettingsView.tsx integra el panel 'Motor Gate 1 (NexoBow Autonomous)' sin exponer claves ni PII y .env.example documenta AUTONOMOUS_INGEST_KEY",
    () => {
      assert.ok(existsSync(SETTINGS_VIEW_PATH));
      const settingsViewSrc = readFileSync(SETTINGS_VIEW_PATH, "utf8");
      assert.match(
        settingsViewSrc,
        /Motor Gate 1 \(NexoBow Autonomous\)/,
        "SettingsView.tsx debe renderizar el panel 'Motor Gate 1 (NexoBow Autonomous)'"
      );
      assert.match(
        settingsViewSrc,
        /resolveGate1EngineStatus/,
        "SettingsView.tsx debe usar resolveGate1EngineStatus"
      );
      assert.match(
        settingsViewSrc,
        /fetchAutonomousEvents/,
        "SettingsView.tsx debe cargar autonomous_events vía fetchAutonomousEvents"
      );
      assert.doesNotMatch(
        settingsViewSrc,
        /AUTONOMOUS_INGEST_KEY|SUPABASE_SERVICE_ROLE_KEY|patient_phone|patient_name|message_text|audio_transcript/,
        "SettingsView.tsx no debe exponer claves privadas ni campos de pacientes"
      );

      assert.ok(existsSync(ENV_EXAMPLE_PATH));
      const envExampleSrc = readFileSync(ENV_EXAMPLE_PATH, "utf8");
      const ingestMatch = envExampleSrc.match(
        /^AUTONOMOUS_INGEST_KEY=["']?([^"'\r\n#]+)["']?/m
      );
      assert.ok(
        ingestMatch && ingestMatch[1],
        ".env.example debe documentar AUTONOMOUS_INGEST_KEY"
      );
      assert.match(
        ingestMatch[1],
        /reemplazar/i,
        "AUTONOMOUS_INGEST_KEY en .env.example debe usar un placeholder explícito"
      );
      assert.match(
        envExampleSrc,
        /clave\s+privada\s+compartida/i,
        ".env.example debe describir AUTONOMOUS_INGEST_KEY como 'clave privada compartida'"
      );
      assert.doesNotMatch(
        ingestMatch[1],
        /^(?:sk_live_|re_[A-Za-z0-9]{15,}|eyJ[A-Za-z0-9_-]{10,}|[0-9a-f]{64})$/i,
        ".env.example no debe contener claves reales"
      );
    }
  );
});
