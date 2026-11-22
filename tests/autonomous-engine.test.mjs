// tests/autonomous-engine.test.mjs — Suite TDD Seam 5 (Ticket #61: WABA Webhook, Debounce Redis, IntentClassifier, Recordatorios 24h/2h, Lista de Espera FIFO & 3 Workflows n8n JSON)
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WABA_MODULE_PATH = join(REPO_ROOT, "scripts", "autonomous", "waba-webhook.mjs");
const REMINDERS_MODULE_PATH = join(
  REPO_ROOT,
  "scripts",
  "autonomous",
  "appointment-reminders.mjs"
);
const ENV_EXAMPLE_PATH = join(
  REPO_ROOT,
  "infra",
  "autonomous",
  ".env.autonomous.example"
);
const WORKFLOWS_DIR = join(REPO_ROOT, "workflows", "n8n");
const WORKFLOW_FILES = [
  "01-waba-receptionist.json",
  "02-reminders-waitlist.json",
  "03-review-booster.json",
];

// Patrones de Ticket #55 construidos por fragmentos para cumplir con copy-humanization.test.mjs
const HUMANIZATION_GUARDS = [
  {
    label: "guard-01",
    regex: new RegExp(["si" + "lla", "vac[ií]a"].join("\\s+"), "i"),
  },
  {
    label: "guard-02",
    regex: new RegExp(["si" + "llas", "vac[ií]as"].join("\\s+"), "i"),
  },
  {
    label: "guard-03",
    regex: new RegExp(["an" + "ti-si" + "lla", "vac[ií]a"].join("\\s+"), "i"),
  },
  {
    label: "guard-04",
    regex: new RegExp("ce" + "ro-" + "secre" + "taria", "i"),
  },
  {
    label: "guard-05",
    regex: new RegExp(["esta" + "llar", "tu", "agenda"].join("\\s+"), "i"),
  },
  {
    label: "guard-06",
    regex: new RegExp("\\b" + "revoluc" + "ionario\\b", "i"),
  },
  {
    label: "guard-07",
    regex: new RegExp("\\b" + "secr" + "etos\\b", "i"),
  },
  {
    label: "guard-08",
    regex: new RegExp("\\b" + "disrup" + "tivo\\b", "i"),
  },
];

const GOOGLE_PROHIBITED_INCENTIVES_RE =
  /descuento|sorteo|premio|regalo|cup[oó]n|gratis|reintegro|cashback|a cambio de/i;

const PII_FORBIDDEN_KEYS = new Set([
  "phone",
  "telefono",
  "patient_phone",
  "patient_phone_e164",
  "patient_name",
  "patient_first_name",
  "email",
  "dni",
  "cuit",
  "message_text",
  "audio_transcript",
]);

const VALID_AUTONOMOUS_EVENT_TYPES = new Set([
  "heartbeat",
  "appointment_confirmed",
  "appointment_rescheduled",
  "appointment_cancelled",
  "waitlist_filled",
  "review_invite_sent",
  "human_handoff",
]);

function collectHumanizationHits(text, fileLabel) {
  const hits = [];
  const lines = String(text || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const guard of HUMANIZATION_GUARDS) {
      const m = lines[i].match(guard.regex);
      if (m) {
        hits.push(`${fileLabel}:${i + 1} [${guard.label}] -> ${m[0]}`);
      }
    }
  }
  return hits;
}

function parseSimpleEnvKeys(text) {
  const keys = new Set();
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      keys.add(line.slice(0, eqIdx).trim());
    }
  }
  return keys;
}

function signMetaPayload(rawBody, appSecret) {
  const hex = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return `sha256=${hex}`;
}

test("T61 (Seam 5): Motores Puros NexoBow Autonomous & 3 Workflows n8n JSON 100% Offline", async (t) => {
  await t.test(
    "1. verifyMetaWebhookChallenge (GET 200/403) y verifyMetaSignature (HMAC-SHA256 en tiempo constante)",
    async () => {
      assert.ok(existsSync(WABA_MODULE_PATH), `Falta ${WABA_MODULE_PATH}`);
      const wabaSource = readFileSync(WABA_MODULE_PATH, "utf8");
      assert.match(wabaSource, /\btimingSafeEqual\b/);
      assert.match(wabaSource, /\bcreateHmac\b/);
      assert.doesNotMatch(wabaSource, /\bfetch\s*\(/, "waba-webhook.mjs no debe ejecutar llamadas de red");
      assert.equal(
        collectHumanizationHits(wabaSource, "scripts/autonomous/waba-webhook.mjs").length,
        0
      );

      const waba = await import("../scripts/autonomous/waba-webhook.mjs");
      const verifyToken = "nb_waba_verify_token_prueba_2026";

      // Formato plano y formato crudo Meta hub.*
      const okFlat = waba.verifyMetaWebhookChallenge(
        { mode: "subscribe", token: verifyToken, challenge: "984312045" },
        verifyToken
      );
      assert.equal(okFlat.ok, true);
      assert.equal(okFlat.status, 200);
      assert.equal(okFlat.challenge, "984312045");
      assert.equal(okFlat.body, "984312045");

      const okMetaHub = waba.verifyMetaWebhookChallenge(
        {
          "hub.mode": "subscribe",
          "hub.verify_token": verifyToken,
          "hub.challenge": "ch_meta_7711",
        },
        verifyToken
      );
      assert.equal(okMetaHub.ok, true);
      assert.equal(okMetaHub.status, 200);
      assert.equal(okMetaHub.body, "ch_meta_7711");

      const okParams = waba.verifyMetaWebhookChallenge(
        new URLSearchParams({
          "hub.mode": "subscribe",
          "hub.verify_token": verifyToken,
          "hub.challenge": "ch_params_99",
        }),
        verifyToken
      );
      assert.equal(okParams.ok, true);
      assert.equal(okParams.status, 200);
      assert.equal(okParams.body, "ch_params_99");

      // Rechazos 403
      for (const badQuery of [
        { mode: "unsubscribe", token: verifyToken, challenge: "123" },
        { mode: "subscribe", token: "nb_waba_verify_token_prueba_2027", challenge: "123" },
        { mode: "subscribe", token: "corto", challenge: "123" },
        { mode: "subscribe", token: "", challenge: "123" },
        { mode: "subscribe", token: verifyToken, challenge: "" },
      ]) {
        const res = waba.verifyMetaWebhookChallenge(badQuery, verifyToken);
        assert.equal(res.ok, false);
        assert.equal(res.status, 403);
      }
      assert.equal(
        waba.verifyMetaWebhookChallenge(
          { mode: "subscribe", token: verifyToken, challenge: "123" },
          ""
        ).status,
        403
      );

      // HMAC-SHA256
      const appSecret = "nb_app_secret_super_seguro_2026";
      const rawBody = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [{ id: "1", changes: [] }],
      });
      const validHeader = signMetaPayload(rawBody, appSecret);

      assert.equal(waba.verifyMetaSignature(rawBody, validHeader, appSecret), true);
      assert.equal(
        waba.verifyMetaSignature(Buffer.from(rawBody, "utf8"), validHeader.toUpperCase(), appSecret),
        true
      );

      // Alteraciones y ausencias rechazadas
      const flippedChar =
        validHeader.slice(0, -1) + (validHeader.endsWith("a") ? "b" : "a");
      assert.equal(waba.verifyMetaSignature(rawBody, flippedChar, appSecret), false);
      assert.equal(waba.verifyMetaSignature(rawBody + " ", validHeader, appSecret), false);
      assert.equal(waba.verifyMetaSignature(rawBody, "", appSecret), false);
      assert.equal(waba.verifyMetaSignature(rawBody, undefined, appSecret), false);
      assert.equal(waba.verifyMetaSignature(rawBody, validHeader.replace("sha256=", "sha1="), appSecret), false);
      assert.equal(waba.verifyMetaSignature(rawBody, validHeader.slice(0, 20), appSecret), false);
      assert.equal(waba.verifyMetaSignature(rawBody, validHeader, ""), false);
    }
  );

  await t.test(
    "2. normalizeWabaIncomingPayload normaliza texto, audio con transcriptor inyectable, botones interactivos, 'baja' y tolera statuses",
    async () => {
      const waba = await import("../scripts/autonomous/waba-webhook.mjs");

      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-acc-1",
            changes: [
              {
                field: "messages",
                value: {
                  metadata: {
                    display_phone_number: "5493489536088",
                    phone_number_id: "pn-101",
                  },
                  contacts: [
                    {
                      wa_id: "5491155551111",
                      profile: { name: "Carolina Gómez" },
                    },
                    {
                      wa_id: "5491155552222",
                      profile: { name: "Eduardo Paz" },
                    },
                  ],
                  messages: [
                    {
                      from: "5491155551111",
                      id: "wamid.txt.1",
                      timestamp: "1763800000",
                      type: "text",
                      text: { body: "Hola, quería saber si tienen turno esta semana" },
                    },
                    {
                      from: "5491155551111",
                      id: "wamid.aud.2",
                      timestamp: "1763800005",
                      type: "audio",
                      audio: { id: "media-aud-99", mime_type: "audio/ogg; codecs=opus" },
                    },
                    {
                      from: "5491155551111",
                      id: "wamid.btn.confirm",
                      timestamp: "1763800010",
                      type: "interactive",
                      interactive: {
                        type: "button_reply",
                        button_reply: {
                          id: "confirmar_24h_apt1",
                          title: "Confirmar turno",
                        },
                      },
                    },
                    {
                      from: "5491155551111",
                      id: "wamid.btn.reprog",
                      timestamp: "1763800015",
                      type: "interactive",
                      interactive: {
                        type: "button_reply",
                        button_reply: {
                          id: "reprogramar_24h_apt1",
                          title: "Reprogramar",
                        },
                      },
                    },
                    {
                      from: "5491155551111",
                      id: "wamid.btn.cancel",
                      timestamp: "1763800020",
                      type: "interactive",
                      interactive: {
                        type: "button_reply",
                        button_reply: {
                          id: "cancelar_apt1",
                          title: "Cancelar",
                        },
                      },
                    },
                    {
                      from: "5491155552222",
                      id: "wamid.optout.1",
                      timestamp: "1763800025",
                      type: "text",
                      text: { body: "Baja" },
                    },
                    {
                      from: "5491155552222",
                      id: "wamid.clin.1",
                      timestamp: "1763800030",
                      type: "text",
                      text: { body: "Tengo presión baja desde ayer" },
                    },
                  ],
                  statuses: [
                    {
                      id: "wamid.prev.1",
                      status: "delivered",
                      timestamp: "1763799990",
                      recipient_id: "5491155551111",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const normalized = await waba.normalizeWabaIncomingPayload(payload, {
        transcribeAudio: async ({ mediaId }) =>
          `Necesito horario por la tarde (${mediaId})`,
      });

      assert.equal(normalized.length, 7);

      const msgText = normalized[0];
      assert.equal(msgText.messageId, "wamid.txt.1");
      assert.equal(msgText.from, "5491155551111");
      assert.match(msgText.patientPhoneHash, /^[a-f0-9]{64}$/);
      assert.equal(msgText.patientName, "Carolina Gómez");
      assert.equal(msgText.type, "text");
      assert.equal(msgText.isOptOut, false);

      const msgAudio = normalized[1];
      assert.equal(msgAudio.type, "audio");
      assert.equal(msgAudio.text, "Necesito horario por la tarde (media-aud-99)");
      assert.equal(msgAudio.audio.mediaId, "media-aud-99");
      assert.equal(msgAudio.audio.transcriptionStatus, "transcribed");

      assert.equal(normalized[2].type, "interactive");
      assert.equal(normalized[2].action, "confirmar");
      assert.equal(normalized[2].buttonTitle, "Confirmar turno");

      assert.equal(normalized[3].type, "interactive");
      assert.equal(normalized[3].action, "reprogramar");
      assert.equal(normalized[3].buttonTitle, "Reprogramar");

      assert.equal(normalized[4].type, "interactive");
      assert.equal(normalized[4].action, "cancelar");

      assert.equal(normalized[5].isOptOut, true);
      assert.equal(normalized[6].isOptOut, false, "'Tengo presión baja' no debe disparar opt-out");

      // Tolerancia a notificación exclusiva de statuses y fallo controlado en transcriptor
      const statusesOnly = await waba.normalizeWabaIncomingPayload({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "1",
            changes: [{ field: "messages", value: { statuses: [{ id: "s1", status: "read" }] } }],
          },
        ],
      });
      assert.deepEqual(statusesOnly, []);

      const audioFailure = await waba.normalizeWabaIncomingPayload(
        {
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        from: "5491155551111",
                        id: "wamid.aud.fail",
                        type: "audio",
                        audio: { id: "media-fail" },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          transcribeAudio: async () => {
            throw new Error("transcriptor caído");
          },
        }
      );
      assert.equal(audioFailure.length, 1);
      assert.equal(audioFailure[0].audio.transcriptionStatus, "failed");
    }
  );

  await t.test(
    "3. bufferIncomingMessages sobre createInMemoryRedisStore consolida ráfagas 8-12s sin duplicar respuestas",
    async () => {
      const waba = await import("../scripts/autonomous/waba-webhook.mjs");
      let currentMs = 1_763_800_000_000;
      const store = waba.createInMemoryRedisStore({ clock: () => currentMs });
      const key = "waba:debounce:clinica-del-parque:hash123";

      const r1 = await waba.bufferIncomingMessages({
        store,
        key,
        message: { messageId: "m1", text: "Hola" },
        now: currentMs,
      });
      assert.equal(r1.readyToProcess, false);
      assert.equal(r1.debounceMs, 10000);
      assert.equal(r1.pendingCount, 1);

      currentMs += 3000;
      const r2 = await waba.bufferIncomingMessages({
        store,
        key,
        message: { messageId: "m2", text: "Quería consultar por turno" },
        now: currentMs,
      });
      assert.equal(r2.readyToProcess, false);
      assert.equal(r2.pendingCount, 2);

      // Reintento duplicado de webhook con mismo messageId no duplica texto
      currentMs += 1000;
      const r2Dup = await waba.bufferIncomingMessages({
        store,
        key,
        message: { messageId: "m2", text: "Quería consultar por turno" },
        now: currentMs,
      });
      assert.equal(r2Dup.pendingCount, 2);

      currentMs += 3000; // t = +7000ms
      const r3 = await waba.bufferIncomingMessages({
        store,
        key,
        message: { messageId: "m3", text: "Para el jueves a la tarde" },
        now: currentMs,
      });
      assert.equal(r3.readyToProcess, false);
      assert.equal(r3.pendingCount, 3);

      // Antes de los 10s desde el último mensaje (t = +12000ms < +17000ms) sigue esperando
      currentMs += 5000;
      const earlyCheck = await waba.bufferIncomingMessages({
        store,
        key,
        message: null,
        now: currentMs,
      });
      assert.equal(earlyCheck.readyToProcess, false);

      // Pasados los 10s desde el último mensaje (t = +17000ms) consolida y limpia
      currentMs += 5000;
      const flushed = await waba.bufferIncomingMessages({
        store,
        key,
        message: null,
        now: currentMs,
      });
      assert.equal(flushed.readyToProcess, true);
      assert.equal(flushed.pendingCount, 3);
      assert.equal(flushed.messages.length, 3);
      assert.equal(
        flushed.mergedText,
        "Hola\nQuería consultar por turno\nPara el jueves a la tarde"
      );

      // Segundo chequeo inmediato no emite respuesta duplicada
      currentMs += 10;
      const secondFlush = await waba.bufferIncomingMessages({
        store,
        key,
        message: null,
        now: currentMs,
      });
      assert.equal(secondFlush.readyToProcess, false);
      assert.equal(secondFlush.pendingCount, 0);
      assert.equal(secondFlush.mergedText, "");

      // Clamping de ventana 8-12s
      const minClamp = await waba.bufferIncomingMessages({
        store,
        key: "k-min",
        message: { messageId: "c1", text: "Uno" },
        debounceMs: 1000,
        now: currentMs,
      });
      assert.equal(minClamp.debounceMs, 8000);

      const maxClamp = await waba.bufferIncomingMessages({
        store,
        key: "k-max",
        message: { messageId: "c2", text: "Dos" },
        debounceMs: 30000,
        now: currentMs,
      });
      assert.equal(maxClamp.debounceMs, 12000);
    }
  );

  await t.test(
    "4. classifyPatientIntent clasifica las 8 intenciones $0, impone handoff en urgencias y soporta customClassifier con fallback seguro",
    async () => {
      const waba = await import("../scripts/autonomous/waba-webhook.mjs");

      assert.deepEqual([...waba.PATIENT_INTENTS], [
        "turno_nuevo",
        "confirmar_turno",
        "reprogramar_turno",
        "cancelar_turno",
        "consulta_arancel_obra_social",
        "baja_comunicaciones",
        "urgencia_clinica",
        "handoff_humano",
      ]);

      const cases = [
        ["Quisiera sacar turno para primera consulta esta semana", "turno_nuevo", false],
        ["Sí, confirmo el turno de mañana a las 10", "confirmar_turno", false],
        ["Necesito reprogramar el turno para otro horario", "reprogramar_turno", false],
        ["Voy a cancelar el turno del viernes porque no llego", "cancelar_turno", false],
        ["Quiero dar de baja mi turno del jueves", "cancelar_turno", false],
        ["¿Cuánto sale la consulta particular y atienden por OSDE?", "consulta_arancel_obra_social", false],
        ["baja", "baja_comunicaciones", false],
        ["Quiero darme de baja de estos mensajes", "baja_comunicaciones", false],
        ["Tengo dolor de pecho fuerte y me falta el aire", "urgencia_clinica", true],
        ["Necesito hablar con una persona de secretaría por favor", "handoff_humano", true],
      ];

      for (const [text, expectedIntent, expectedHandoff] of cases) {
        const res = await waba.classifyPatientIntent(text);
        assert.equal(res.intent, expectedIntent, `Texto: "${text}"`);
        assert.equal(res.requiresHumanHandoff, expectedHandoff, `Handoff para: "${text}"`);
        assert.ok(res.confidence > 0 && res.confidence <= 1);
      }

      // Hook customClassifier válido en caso no urgente
      const customOk = await waba.classifyPatientIntent("Hola buen día", {
        customClassifier: async () => ({
          intent: "turno_nuevo",
          confidence: 0.91,
          requiresHumanHandoff: false,
          reason: "Saludo inicial con contexto de agenda",
        }),
      });
      assert.equal(customOk.intent, "turno_nuevo");
      assert.equal(customOk.source, "custom_classifier");

      // Fallback seguro si customClassifier falla o retorna contrato inválido
      const customThrows = await waba.classifyPatientIntent("¿Atienden por Swiss Medical?", {
        customClassifier: async () => {
          throw new Error("timeout LLM");
        },
      });
      assert.equal(customThrows.intent, "consulta_arancel_obra_social");
      assert.equal(customThrows.source, "deterministic_fallback");

      const customInvalid = await waba.classifyPatientIntent("Confirmo mi turno", {
        customClassifier: async () => ({
          intent: "categoria_inventada",
          confidence: 5,
        }),
      });
      assert.equal(customInvalid.intent, "confirmar_turno");
      assert.equal(customInvalid.source, "deterministic_fallback");

      // Guardarraíl inamovible: ni un customClassifier adverso ni una respuesta sin handoff pueden anular urgencia clínica
      let customCalledOnUrgency = false;
      const urgencyGuarded = await waba.classifyPatientIntent(
        "Tengo dolor de pecho y sangrado abundante",
        {
          customClassifier: async () => {
            customCalledOnUrgency = true;
            return {
              intent: "turno_nuevo",
              confidence: 0.99,
              requiresHumanHandoff: false,
            };
          },
        }
      );
      assert.equal(customCalledOnUrgency, false, "La urgencia clínica debe interceptarse antes del customClassifier");
      assert.equal(urgencyGuarded.intent, "urgencia_clinica");
      assert.equal(urgencyGuarded.requiresHumanHandoff, true);

      const customUrgencyWithoutFlag = await waba.classifyPatientIntent("Consulta", {
        customClassifier: async () => ({
          intent: "urgencia_clinica",
          confidence: 0.88,
          requiresHumanHandoff: false,
        }),
      });
      assert.equal(customUrgencyWithoutFlag.intent, "urgencia_clinica");
      assert.equal(customUrgencyWithoutFlag.requiresHumanHandoff, true);
    }
  );

  await t.test(
    "5. selectDueReminders (ventanas 24h/2h idempotentes) y buildReminderDispatchMessage (voseo +40 con botones)",
    async () => {
      assert.ok(existsSync(REMINDERS_MODULE_PATH), `Falta ${REMINDERS_MODULE_PATH}`);
      const remSource = readFileSync(REMINDERS_MODULE_PATH, "utf8");
      assert.doesNotMatch(
        remSource,
        /\bfetch\s*\(/,
        "appointment-reminders.mjs no debe ejecutar llamadas de red"
      );
      assert.equal(
        collectHumanizationHits(
          remSource,
          "scripts/autonomous/appointment-reminders.mjs"
        ).length,
        0
      );

      const rem = await import("../scripts/autonomous/appointment-reminders.mjs");
      const now = new Date("2026-11-23T12:00:00.000Z");

      const appointments = [
        {
          id: "apt-24h-due",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-p1",
          patient_phone_e164: "+5491155550001",
          patient_first_name: "Marta",
          specialty: "Odontología",
          scheduled_at: "2026-11-24T12:10:00.000Z", // +24h 10m
          status: "pendiente",
          confirmed_24h: false,
          confirmed_2h: false,
        },
        {
          id: "apt-24h-already-flag",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-p2",
          patient_phone_e164: "+5491155550002",
          patient_first_name: "Jorge",
          specialty: "Odontología",
          scheduled_at: "2026-11-24T12:00:00.000Z", // +24h exactas pero flag true
          status: "confirmado",
          confirmed_24h: true,
          confirmed_2h: false,
        },
        {
          id: "apt-24h-already-dispatched",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-p3",
          patient_phone_e164: "+5491155550003",
          patient_first_name: "Silvia",
          specialty: "Odontología",
          scheduled_at: "2026-11-24T11:50:00.000Z", // +23h 50m pero ya registrado en reminder_dispatches
          status: "pendiente",
          confirmed_24h: false,
          confirmed_2h: false,
        },
        {
          id: "apt-2h-due",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-p4",
          patient_phone_e164: "+5491155550004",
          patient_first_name: "Roberto",
          specialty: "Odontología",
          scheduled_at: "2026-11-23T14:05:00.000Z", // +2h 05m
          status: "confirmado",
          confirmed_24h: true,
          confirmed_2h: false,
        },
        {
          id: "apt-cancelled",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-p5",
          patient_phone_e164: "+5491155550005",
          patient_first_name: "Ana",
          specialty: "Odontología",
          scheduled_at: "2026-11-24T12:00:00.000Z",
          status: "cancelado",
          confirmed_24h: false,
          confirmed_2h: false,
        },
        {
          id: "apt-out-of-window",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-p6",
          patient_phone_e164: "+5491155550006",
          patient_first_name: "Luis",
          specialty: "Odontología",
          scheduled_at: "2026-11-26T12:00:00.000Z",
          status: "pendiente",
          confirmed_24h: false,
          confirmed_2h: false,
        },
      ];

      const dispatches = [
        {
          appointment_id: "apt-24h-already-dispatched",
          reminder_type: "24h",
          status: "enviado",
        },
      ];

      const due = rem.selectDueReminders(appointments, {
        now,
        windowMinutes: 30,
        dispatches,
      });

      assert.equal(due.length, 2);
      assert.equal(due[0].appointmentId, "apt-2h-due");
      assert.equal(due[0].reminderType, "2h");
      assert.equal(due[1].appointmentId, "apt-24h-due");
      assert.equal(due[1].reminderType, "24h");

      // Mensajes voseo +40
      const msg24 = rem.buildReminderDispatchMessage({
        appointment: appointments[0],
        reminderType: "24h",
        providerName: "Centro Odonto Palermo",
      });
      assert.equal(msg24.reminderType, "24h");
      assert.match(msg24.text, /\bMarta\b/);
      assert.match(msg24.text, /Centro Odonto Palermo/);
      assert.match(msg24.text, /\b(estás|confirmá|avisanos|necesitás|preferís|respondé)\b/i);
      assert.match(msg24.text, /\bbaja\b/i);
      assert.equal(
        collectHumanizationHits(msg24.text, "buildReminderDispatchMessage(24h)").length,
        0
      );
      assert.deepEqual(
        msg24.buttons.map((b) => b.title),
        ["Confirmar turno", "Reprogramar"]
      );

      const msg2 = rem.buildReminderDispatchMessage({
        appointment: appointments[3],
        reminderType: "2h",
        providerName: "Centro Odonto Palermo",
      });
      assert.equal(msg2.reminderType, "2h");
      assert.equal(
        collectHumanizationHits(msg2.text, "buildReminderDispatchMessage(2h)").length,
        0
      );
      assert.deepEqual(
        msg2.buttons.map((b) => b.title),
        ["Confirmar turno", "Reprogramar"]
      );
    }
  );

  await t.test(
    "6. processPatientAppointmentResponse y advanceExpiredWaitlistOffers aplican FIFO estricto con consentimiento Ley 25.326 y TTL de oferta",
    async () => {
      const rem = await import("../scripts/autonomous/appointment-reminders.mjs");
      const now = new Date("2026-11-23T15:00:00.000Z");

      const baseAppointment = {
        id: "slot-100",
        client_slug: "24-centro-odonto-palermo",
        patient_phone_hash: "hash-cancelador",
        patient_phone_e164: "+5491155559999",
        patient_first_name: "Marta",
        specialty: "Odontología",
        scheduled_at: "2026-11-24T15:00:00.000Z",
        status: "pendiente",
        confirmed_24h: false,
        confirmed_2h: false,
      };

      const waitlistQueue = [
        {
          id: "wl-no-consent",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-wl-1",
          patient_phone_e164: "+5491155551001",
          patient_first_name: "Carlos",
          specialty: "Odontología",
          consent_waitlist: false, // Sin consentimiento Ley 25.326
          opted_out: false,
          status: "esperando",
          created_at: "2026-11-20T09:00:00.000Z",
        },
        {
          id: "wl-opted-out",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-wl-2",
          patient_phone_e164: "+5491155551002",
          patient_first_name: "Beatriz",
          specialty: "Odontología",
          consent_waitlist: true,
          opted_out: true, // Dado de baja
          status: "esperando",
          created_at: "2026-11-20T09:05:00.000Z",
        },
        {
          id: "wl-second-fifo",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-wl-3",
          patient_phone_e164: "+5491155551003",
          patient_first_name: "Graciela",
          specialty: "Odontología",
          consent_waitlist: true,
          opted_out: false,
          status: "esperando",
          created_at: "2026-11-20T10:30:00.000Z", // Posterior
        },
        {
          id: "wl-first-fifo",
          client_slug: "24-centro-odonto-palermo",
          patient_phone_hash: "hash-wl-4",
          patient_phone_e164: "+5491155551004",
          patient_first_name: "Héctor",
          specialty: "Odontología",
          consent_waitlist: true,
          opted_out: false,
          status: "esperando",
          created_at: "2026-11-20T10:00:00.000Z", // Más antiguo elegible aunque venga después en el array
        },
      ];

      // Confirmación
      const confirmedRes = rem.processPatientAppointmentResponse({
        appointment: baseAppointment,
        action: "confirmar",
        reminderType: "24h",
        waitlistQueue,
        now,
      });
      assert.equal(confirmedRes.updatedAppointment.status, "confirmado");
      assert.equal(confirmedRes.updatedAppointment.confirmed_24h, true);
      assert.equal(confirmedRes.cancelEscalation, true);
      assert.equal(confirmedRes.releasedSlot, null);
      assert.equal(confirmedRes.waitlistOffer, null);
      assert.equal(confirmedRes.telemetryEvent.event_type, "appointment_confirmed");

      // Cancelación libera hueco y ofrece al primero FIFO con consentimiento
      const cancelledRes = rem.processPatientAppointmentResponse({
        appointment: baseAppointment,
        action: "cancelar",
        waitlistQueue,
        now,
        offerTtlMinutes: 45,
      });
      assert.equal(cancelledRes.updatedAppointment.status, "cancelado");
      assert.equal(cancelledRes.releasedSlot.appointmentId, "slot-100");
      assert.ok(cancelledRes.waitlistOffer);
      assert.equal(cancelledRes.waitlistOffer.waitlistEntryId, "wl-first-fifo");
      assert.equal(cancelledRes.waitlistOffer.patientFirstName, "Héctor");
      assert.equal(
        cancelledRes.waitlistOffer.offerExpiresAt,
        "2026-11-23T15:45:00.000Z"
      );
      assert.equal(cancelledRes.telemetryEvent.event_type, "appointment_cancelled");
      assert.equal(
        collectHumanizationHits(cancelledRes.waitlistOffer.messageText, "waitlistOffer").length,
        0
      );

      // Verifica inmutabilidad de entrada
      assert.equal(baseAppointment.status, "pendiente");
      assert.equal(waitlistQueue[3].status, "esperando");

      // Reprogramación también libera y oferta
      const rescheduledRes = rem.processPatientAppointmentResponse({
        appointment: baseAppointment,
        action: "reprogramar",
        waitlistQueue,
        now,
        offerTtlMinutes: 30,
      });
      assert.equal(rescheduledRes.updatedAppointment.status, "reprogramado");
      assert.equal(rescheduledRes.waitlistOffer.waitlistEntryId, "wl-first-fifo");
      assert.equal(
        rescheduledRes.waitlistOffer.offerExpiresAt,
        "2026-11-23T15:30:00.000Z"
      );

      // Expiración automática tras 45 minutos -> rota hacia Graciela (wl-second-fifo)
      const after46Min = new Date("2026-11-23T15:46:00.000Z");
      const rotated = rem.advanceExpiredWaitlistOffers({
        waitlistQueue: cancelledRes.updatedWaitlistQueue,
        now: after46Min,
        offerTtlMinutes: 45,
      });
      assert.equal(rotated.expiredOffers.length, 1);
      assert.equal(rotated.expiredOffers[0].id, "wl-first-fifo");
      assert.equal(rotated.promotedOffers.length, 1);
      assert.equal(rotated.promotedOffers[0].waitlistEntryId, "wl-second-fifo");
      assert.equal(rotated.promotedOffers[0].scheduledAt, baseAppointment.scheduled_at);
      assert.equal(
        rotated.promotedOffers[0].offerExpiresAt,
        "2026-11-23T16:31:00.000Z"
      );
      assert.equal(rotated.unfilledSlots.length, 0);

      // Segunda expiración sin más elegibles -> unfilledSlots
      const afterAnother46Min = new Date("2026-11-23T16:32:00.000Z");
      const exhausted = rem.advanceExpiredWaitlistOffers({
        waitlistQueue: rotated.updatedWaitlistQueue,
        now: afterAnother46Min,
        offerTtlMinutes: 45,
      });
      assert.equal(exhausted.expiredOffers.length, 1);
      assert.equal(exhausted.promotedOffers.length, 0);
      assert.equal(exhausted.unfilledSlots.length, 1);
      assert.equal(exhausted.unfilledSlots[0].appointmentId, "slot-100");
    }
  );

  await t.test(
    "7. Los 3 workflows JSON en workflows/n8n/ son válidos, usan solo {{$env.*}} sin credenciales literales, respetan 0 PII, SQL VPS y paridad review-booster.mjs",
    async () => {
      const envKeys = parseSimpleEnvKeys(readFileSync(ENV_EXAMPLE_PATH, "utf8"));
      const { buildReviewBoosterWorkflowPayload } = await import("../scripts/review-booster.mjs");

      const expectedBooster = buildReviewBoosterWorkflowPayload({
        slug: "24-centro-odonto-palermo",
        provider_name: "Centro Odonto Palermo",
        niche: "odontologo",
        tier: "autonomous_tier2",
        maps_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
      });
      assert.equal(expectedBooster.workflow_id, "03-review-booster");

      const realSecretPatterns = [
        /sk_live_[A-Za-z0-9]+/i,
        /EAA[A-Za-z0-9]{20,}/,
        /ghp_[A-Za-z0-9]{20,}/,
        /re_[A-Za-z0-9]{20,}/,
        /eyJ[A-Za-z0-9_-]{10,}\./,
        /AKIA[0-9A-Z]{16}/,
        /AIza[0-9A-Za-z_-]{25,}/,
      ];

      const requiredEnvByWorkflow = {
        "01-waba-receptionist.json": [
          "META_WABA_VERIFY_TOKEN",
          "META_WABA_APP_SECRET",
          "META_WABA_ACCESS_TOKEN",
          "NEXOBOW_INGEST_URL",
          "AUTONOMOUS_INGEST_KEY",
        ],
        "02-reminders-waitlist.json": [
          "META_WABA_ACCESS_TOKEN",
          "NEXOBOW_INGEST_URL",
          "AUTONOMOUS_INGEST_KEY",
        ],
        "03-review-booster.json": [
          "META_WABA_ACCESS_TOKEN",
          "NEXOBOW_INGEST_URL",
          "AUTONOMOUS_INGEST_KEY",
        ],
      };

      for (const fileName of WORKFLOW_FILES) {
        const fullPath = join(WORKFLOWS_DIR, fileName);
        assert.ok(existsSync(fullPath), `Falta workflow ${fullPath}`);
        const raw = readFileSync(fullPath, "utf8");

        assert.equal(
          collectHumanizationHits(raw, `workflows/n8n/${fileName}`).length,
          0,
          `${fileName} no debe contener frases prohibidas Ticket #55`
        );

        for (const pat of realSecretPatterns) {
          assert.equal(pat.test(raw), false, `${fileName} contiene patrón de credencial real`);
        }

        const wf = JSON.parse(raw);
        assert.ok(wf && typeof wf === "object");
        assert.ok(typeof wf.name === "string" && wf.name.length > 3);
        assert.equal(wf.active, false, `${fileName} debe versionarse inactivo (active: false)`);
        assert.equal(wf.settings?.timezone, "America/Argentina/Buenos_Aires");
        assert.ok(Array.isArray(wf.nodes) && wf.nodes.length >= 4);

        const nodeNames = new Set(wf.nodes.map((n) => n.name));
        assert.equal(nodeNames.size, wf.nodes.length, `${fileName} tiene nombres de nodos duplicados`);
        assert.ok(wf.connections && typeof wf.connections === "object");
        for (const [src, branches] of Object.entries(wf.connections)) {
          assert.ok(nodeNames.has(src), `${fileName} conecta desde nodo inexistente: ${src}`);
          for (const branchList of Object.values(branches || {})) {
            for (const links of branchList || []) {
              for (const target of links || []) {
                assert.ok(
                  nodeNames.has(target.node),
                  `${fileName} conecta hacia nodo inexistente: ${target.node}`
                );
              }
            }
          }
        }

        // Todas las $env.* referenciadas existen en .env.autonomous.example
        const referencedEnv = [...raw.matchAll(/\$env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
        assert.ok(referencedEnv.length > 0, `${fileName} debe referenciar variables $env`);
        for (const envName of referencedEnv) {
          assert.ok(
            envKeys.has(envName),
            `${fileName} referencia $env.${envName} ausente en .env.autonomous.example`
          );
        }
        for (const reqEnv of requiredEnvByWorkflow[fileName]) {
          assert.ok(
            referencedEnv.includes(reqEnv),
            `${fileName} debe referenciar $env.${reqEnv}`
          );
        }

        // Nodo HTTP hacia NEXOBOW_INGEST_URL sin PII y con X-Autonomous-Key
        const ingestNodes = wf.nodes.filter((n) =>
          JSON.stringify(n.parameters || {}).includes("$env.NEXOBOW_INGEST_URL")
        );
        assert.equal(
          ingestNodes.length,
          1,
          `${fileName} debe tener exactamente 1 nodo de envío agregado hacia $env.NEXOBOW_INGEST_URL`
        );
        const ingestParamsStr = JSON.stringify(ingestNodes[0].parameters || {});
        assert.match(ingestParamsStr, /"method"\s*:\s*"POST"/i);
        assert.match(ingestParamsStr, /X-Autonomous-Key/i);
        assert.match(ingestParamsStr, /\$env\.AUTONOMOUS_INGEST_KEY/);

        for (const piiKey of PII_FORBIDDEN_KEYS) {
          assert.equal(
            new RegExp(`["']${piiKey}["']`, "i").test(ingestParamsStr),
            false,
            `${fileName} no debe enviar clave PII (${piiKey}) hacia /api/v1/autonomous/ingest`
          );
        }

        const eventMatches = [...ingestParamsStr.matchAll(/event_type\\?"\s*:\s*\\?"([a-z0-9_]+)|"event_type"\s*:\s*"([a-z0-9_]+)"/gi)];
        for (const em of eventMatches) {
          const evType = em[1] || em[2];
          if (evType) {
            assert.ok(
              VALID_AUTONOMOUS_EVENT_TYPES.has(evType),
              `${fileName} usa event_type inválido: ${evType}`
            );
          }
        }
      }

      // Verificaciones específicas de dominio por workflow
      const wf1Raw = readFileSync(join(WORKFLOWS_DIR, "01-waba-receptionist.json"), "utf8");
      assert.match(wf1Raw, /X-Hub-Signature-256/i);
      assert.match(wf1Raw, /conversation_state/i);
      assert.match(wf1Raw, /urgencia_clinica/);
      assert.match(wf1Raw, /ignoreStatusOnly/);
      assert.match(wf1Raw, /"operation"\s*:\s*"get"/);
      assert.match(wf1Raw, /"operation"\s*:\s*"set"/);
      assert.match(wf1Raw, /"operation"\s*:\s*"delete"/);
      assert.match(wf1Raw, /latestMessageId/);
      assert.match(wf1Raw, /try\s*\{\s*maybeAudio\s*=\s*\$\('Consolidar Texto Nota de Voz'\)/);

      const wf2Raw = readFileSync(join(WORKFLOWS_DIR, "02-reminders-waitlist.json"), "utf8");
      const wf2Obj = JSON.parse(wf2Raw);
      assert.match(wf2Raw, /appointments/i);
      assert.match(wf2Raw, /reminder_dispatches/i);
      assert.match(wf2Raw, /waitlist_entries/i);
      assert.match(wf2Raw, /consent_waitlist\s*=\s*true/i);
      assert.match(wf2Raw, /opted_out\s*=\s*false/i);
      assert.match(wf2Raw, /ORDER\s+BY\s+created_at\s+ASC/i);
      assert.match(wf2Raw, /ROW_NUMBER\(\)\s+OVER\s*\(\s*PARTITION\s+BY\s+client_slug,\s*specialty/i);
      assert.match(wf2Raw, /cand\.specialty\s*=\s*u\.specialty/i);
      assert.match(wf2Raw, /DO\s+UPDATE\s+SET[\s\S]*reminder_dispatches\.status\s*=\s*'fallido'/i);
      assert.match(wf2Raw, /Validar X-Autonomous-Key Respuestas/);
      assert.match(wf2Raw, /constantTimeHexEqual/);
      assert.equal(
        wf2Obj.connections?.["Enviar Oferta Lista Espera WABA"],
        undefined,
        "02-reminders-waitlist.json no debe duplicar telemetría reenviando Enviar Oferta Lista Espera WABA hacia Preparar Resumen Agregado Sin PII"
      );
      assert.match(wf2Raw, /Confirmar turno/);
      assert.match(wf2Raw, /Reprogramar/);

      const wf3Raw = readFileSync(join(WORKFLOWS_DIR, "03-review-booster.json"), "utf8");
      const wf3Obj = JSON.parse(wf3Raw);
      const wf3CodeText = wf3Obj.nodes
        .map((n) => n.parameters?.jsCode || "")
        .join("\n");
      assert.match(wf3Raw, /03-review-booster/);
      assert.match(wf3Raw, /review_5star/);
      assert.match(wf3Raw, /review_invite_sent/);
      assert.match(wf3Raw, /review_requested_at\s+IS\s+NULL/i);
      assert.match(wf3Raw, /review_booster:config:/);
      assert.match(wf3Raw, /maps_place_id/);
      assert.match(wf3Raw, /Validar Clave y Payload Config/);
      assert.match(wf3CodeText, /constantTimeHexEqual/);
      assert.match(wf3CodeText, /GOOGLE_MAPS_URL_RE/);
      assert.match(wf3CodeText, /maps\\\.app\\\.goo\\\.gl/);
      assert.match(wf3Raw, /DO\s+UPDATE\s+SET[\s\S]*reminder_dispatches\.status\s*=\s*'fallido'/i);
      assert.match(wf3Raw, /writereview\?placeid=/);
      assert.match(wf3Raw, /2\s*hours/i);
      assert.match(wf3Raw, /4\s*hours/i);
      assert.match(wf3Raw, /\bbaja\b/i);
      assert.doesNotMatch(
        wf3Raw,
        GOOGLE_PROHIBITED_INCENTIVES_RE,
        "03-review-booster.json no debe contener incentivos económicos prohibidos por Google"
      );
    }
  );
});
