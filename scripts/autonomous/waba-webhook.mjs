// scripts/autonomous/waba-webhook.mjs — Seam puro 100% offline para Webhook Meta WABA, Debounce Redis & IntentClassifier (Ticket #61)

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const MIN_DEBOUNCE_MS = 8000;
export const MAX_DEBOUNCE_MS = 12000;
export const DEFAULT_DEBOUNCE_MS = 10000;

export const PATIENT_INTENTS = Object.freeze([
  "turno_nuevo",
  "confirmar_turno",
  "reprogramar_turno",
  "cancelar_turno",
  "consulta_arancel_obra_social",
  "baja_comunicaciones",
  "urgencia_clinica",
  "handoff_humano",
]);

const APPOINTMENT_CONTEXT_RE =
  /\b(turno|turnos|cita|consulta|consultor[ií]a|reserva)\b/i;
const COMMS_CONTEXT_RE =
  /\b(mensajes|avisos|recordatorios|comunicaciones|whatsapp)\b/i;

const EXPLICIT_OPT_OUT_SOLO_RE =
  /^\s*(?:baja|stop|unsubscribe)(?:\s+por\s+favor)?\s*[.!¡?¿]*\s*$/i;
const EXPLICIT_OPT_OUT_PHRASE_RE =
  /\b(?:darme\s+de\s+baja|quiero\s+(?:la\s+)?baja|dar\s+de\s+baja\s+(?:mis\s+|los\s+)?(?:mensajes|avisos|recordatorios|comunicaciones)|no\s+(?:quiero|deseo)\s+recibir\s+(?:m[aá]s\s+)?(?:mensajes|avisos|recordatorios|comunicaciones)|dejar\s+de\s+recibir\s+(?:mensajes|avisos|recordatorios|comunicaciones)|no\s+me\s+escriban\s+m[aá]s|desuscribir(?:me)?)\b/i;

const CLINICAL_URGENCY_PATTERNS = [
  /\bdolor\s+(?:de\s+|en\s+el\s+)?pecho\b|\bdolor\s+tor[aá]cico\b|\bopresi[oó]n\s+(?:en\s+el\s+)?pecho\b/i,
  /\bme\s+falta\s+el\s+aire\b|\bfalta\s+de\s+aire\b|\bdificultad\s+para\s+respirar\b|\bno\s+puedo\s+respirar\b|\bahogo\b/i,
  /\bsangrado\b|\bhemorragia\b|\bsangro\s+mucho\b|\bpierdo\s+sangre\b/i,
  /\bdesmayo\b|\bse\s+desmay[oó]\b|\bp[eé]rdida\s+de\s+conocimiento\b|\bconvulsi[oó]n(?:es)?\b/i,
  /\bfiebre\s+alta\b|\bfiebre\s+(?:de\s+)?(?:39|40|41|42)\b|\b(?:39|40|41|42)\s*grados\b/i,
  /\b(?:urgencia|emergencia|guardia\s+m[eé]dica|ambulancia)\b/i,
  /\bdolor\s+(?:agudo|insoportable|extremo|muy\s+fuerte)\b/i,
  /\breacci[oó]n\s+al[eé]rgica\b|\banafilaxia\b|\bse\s+(?:me\s+)?hinch[oó]\s+la\s+garganta\b/i,
  /\bfractura\b|\btraumatismo\b|\bgolpe\s+fuerte\s+en\s+la\s+cabeza\b/i,
  /\bquitarme\s+la\s+vida\b|\bsuicid|\bautolesi[oó]n\b/i,
];

function constantTimeStringEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  const digestA = createHash("sha256").update(bufA).digest();
  const digestB = createHash("sha256").update(bufB).digest();
  return timingSafeEqual(digestA, digestB) && bufA.length === bufB.length;
}

function readQueryField(query, keys) {
  if (!query) return "";
  if (typeof query.get === "function") {
    for (const key of keys) {
      const val = query.get(key);
      if (val !== null && val !== undefined) return String(val);
    }
    return "";
  }
  if (typeof query === "object") {
    for (const key of keys) {
      if (Object.hasOwn(query, key) && query[key] !== undefined && query[key] !== null) {
        return String(query[key]);
      }
    }
  }
  return "";
}

function clampDebounceMs(debounceMs) {
  if (typeof debounceMs !== "number" || !Number.isFinite(debounceMs)) {
    return DEFAULT_DEBOUNCE_MS;
  }
  return Math.min(MAX_DEBOUNCE_MS, Math.max(MIN_DEBOUNCE_MS, Math.round(debounceMs)));
}

export function hashPatientPhone(phone) {
  const digits = String(phone || "").replace(/\D+/g, "");
  if (!digits) return "";
  return createHash("sha256").update(digits, "utf8").digest("hex");
}

export function isExplicitOptOutText(text) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  if (EXPLICIT_OPT_OUT_SOLO_RE.test(clean)) return true;
  if (APPOINTMENT_CONTEXT_RE.test(clean) && !COMMS_CONTEXT_RE.test(clean)) {
    return false;
  }
  return EXPLICIT_OPT_OUT_PHRASE_RE.test(clean);
}

/**
 * Valida el handshake GET de Meta WhatsApp Cloud API en tiempo constante.
 */
export function verifyMetaWebhookChallenge(query, expectedVerifyToken) {
  const mode = readQueryField(query, ["hub.mode", "mode"]).trim();
  const token = readQueryField(query, ["hub.verify_token", "verify_token", "token"]);
  const challenge = readQueryField(query, ["hub.challenge", "challenge"]);
  const expected = typeof expectedVerifyToken === "string" ? expectedVerifyToken : "";

  if (!expected) {
    return {
      ok: false,
      status: 403,
      body: "Forbidden",
      error: "missing_expected_verify_token",
    };
  }

  const tokenMatches = token.length > 0 && constantTimeStringEqual(token, expected);
  if (mode !== "subscribe" || !challenge || !tokenMatches) {
    return {
      ok: false,
      status: 403,
      body: "Forbidden",
      error: "invalid_webhook_verification",
    };
  }

  return {
    ok: true,
    status: 200,
    body: challenge,
    challenge,
  };
}

/**
 * Verifica la cabecera X-Hub-Signature-256 (sha256=<hex>) en tiempo constante.
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (typeof appSecret !== "string" || !appSecret) return false;
  if (typeof signatureHeader !== "string" || !signatureHeader) return false;
  if (rawBody === null || rawBody === undefined) return false;

  let bodyBuf;
  if (typeof rawBody === "string") {
    bodyBuf = Buffer.from(rawBody, "utf8");
  } else if (Buffer.isBuffer(rawBody)) {
    bodyBuf = rawBody;
  } else if (rawBody instanceof Uint8Array) {
    bodyBuf = Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength);
  } else {
    return false;
  }

  const match = signatureHeader.trim().match(/^sha256=([0-9a-f]{64})$/i);
  if (!match) return false;

  const expectedDigest = createHmac("sha256", appSecret).update(bodyBuf).digest();
  const providedDigest = Buffer.from(match[1], "hex");
  if (providedDigest.length !== expectedDigest.length) return false;

  return timingSafeEqual(providedDigest, expectedDigest);
}

function resolveInteractiveAction(buttonId, buttonTitle) {
  const combined = `${String(buttonId || "")} ${String(buttonTitle || "")}`.toLowerCase();
  if (/\b(confirmar|confirmo|tomar)\b/.test(combined)) return "confirmar";
  if (/\b(reprogramar|reagendar|cambiar|postergar)\b/.test(combined)) return "reprogramar";
  if (/\b(cancelar|anular)\b/.test(combined)) return "cancelar";
  if (/\bbaja\b/.test(combined)) return "baja";
  return null;
}

/**
 * Normaliza eventos entrantes de Meta WABA (texto, audio, botones interactivos y baja),
 * tolerando payloads exclusivos de statuses sin fallar.
 */
export async function normalizeWabaIncomingPayload(
  payload,
  { transcribeAudio, now } = {}
) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.entry)) {
    return [];
  }

  const normalizedMessages = [];
  const defaultTs = String(
    Math.floor((typeof now === "number" && Number.isFinite(now) ? now : Date.now()) / 1000)
  );

  for (const entry of payload.entry) {
    if (!entry || !Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      const value = change?.value;
      if (!value || typeof value !== "object") continue;

      const contactsByWaId = new Map();
      if (Array.isArray(value.contacts)) {
        for (const contact of value.contacts) {
          const waId = String(contact?.wa_id || "").trim();
          if (waId) {
            contactsByWaId.set(waId, String(contact?.profile?.name || "").trim() || null);
          }
        }
      }

      if (!Array.isArray(value.messages)) {
        continue;
      }

      const phoneNumberId = value.metadata?.phone_number_id
        ? String(value.metadata.phone_number_id)
        : null;

      for (const msg of value.messages) {
        if (!msg || typeof msg !== "object") continue;

        const from = String(msg.from || "").trim();
        const messageId = String(msg.id || "").trim();
        const rawType = String(msg.type || "unknown").toLowerCase();
        const patientPhoneHash = hashPatientPhone(from);
        const patientName = contactsByWaId.get(from) || null;
        const timestamp = msg.timestamp ? String(msg.timestamp) : defaultTs;

        const record = {
          messageId,
          from,
          patientPhoneHash,
          patientName,
          phoneNumberId,
          timestamp,
          type: rawType,
          text: "",
          action: null,
          buttonId: null,
          buttonTitle: null,
          audio: null,
          isOptOut: false,
        };

        if (rawType === "text") {
          record.text = String(msg.text?.body || "").trim();
          record.isOptOut = isExplicitOptOutText(record.text);
        } else if (rawType === "audio") {
          const mediaId = msg.audio?.id ? String(msg.audio.id) : null;
          const mimeType = msg.audio?.mime_type ? String(msg.audio.mime_type) : null;
          let transcript = typeof msg.audio?.transcript === "string" ? msg.audio.transcript.trim() : "";
          let transcriptionStatus = transcript ? "transcribed" : "unavailable";
          let transcriptionError = null;

          if (typeof transcribeAudio === "function") {
            try {
              const out = await transcribeAudio({ mediaId, mimeType, message: msg });
              if (typeof out === "string") {
                transcript = out.trim();
              } else if (out && typeof out === "object" && typeof out.text === "string") {
                transcript = out.text.trim();
              }
              transcriptionStatus = transcript ? "transcribed" : "unavailable";
            } catch (err) {
              transcript = "";
              transcriptionStatus = "failed";
              transcriptionError = err instanceof Error ? err.message : String(err);
            }
          }

          record.text = transcript;
          record.audio = {
            mediaId,
            mimeType,
            transcriptionStatus,
            ...(transcriptionError ? { error: transcriptionError } : {}),
          };
          record.isOptOut = isExplicitOptOutText(record.text);
        } else if (rawType === "interactive" || rawType === "button") {
          const reply =
            msg.interactive?.button_reply ||
            msg.interactive?.list_reply ||
            msg.button ||
            {};
          const buttonId = reply.id ? String(reply.id).trim() : null;
          const buttonTitle = reply.title
            ? String(reply.title).trim()
            : reply.text
              ? String(reply.text).trim()
              : null;

          record.buttonId = buttonId;
          record.buttonTitle = buttonTitle;
          record.text = buttonTitle || buttonId || "";
          record.action = resolveInteractiveAction(buttonId, buttonTitle);
          record.isOptOut =
            record.action === "baja" || isExplicitOptOutText(record.text);
        }

        normalizedMessages.push(record);
      }
    }
  }

  return normalizedMessages;
}

/**
 * Crea un store en memoria compatible con operaciones Redis (get, set, del, clear, keys, size)
 * y reloj inyectable para pruebas deterministas 100% offline.
 */
export function createInMemoryRedisStore({ clock = () => Date.now() } = {}) {
  const map = new Map();

  function pruneIfExpired(key) {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && clock() >= entry.expiresAt) {
      map.delete(key);
      return null;
    }
    return entry;
  }

  return {
    async get(key) {
      const entry = pruneIfExpired(String(key));
      if (!entry) return null;
      return structuredClone(entry.value);
    },
    async set(key, value, options = {}) {
      let ttlMs = null;
      if (typeof options === "number" && Number.isFinite(options) && options > 0) {
        ttlMs = options;
      } else if (options && typeof options === "object") {
        if (typeof options.ttlMs === "number" && Number.isFinite(options.ttlMs) && options.ttlMs > 0) {
          ttlMs = options.ttlMs;
        } else if (typeof options.PX === "number" && Number.isFinite(options.PX) && options.PX > 0) {
          ttlMs = options.PX;
        } else if (typeof options.EX === "number" && Number.isFinite(options.EX) && options.EX > 0) {
          ttlMs = options.EX * 1000;
        }
      }
      const expiresAt = ttlMs !== null ? clock() + ttlMs : null;
      map.set(String(key), { value: structuredClone(value), expiresAt });
      return "OK";
    },
    async del(key) {
      return map.delete(String(key)) ? 1 : 0;
    },
    async clear() {
      map.clear();
    },
    async keys() {
      const active = [];
      for (const k of [...map.keys()]) {
        if (pruneIfExpired(k)) active.push(k);
      }
      return active;
    },
    size() {
      let count = 0;
      for (const k of [...map.keys()]) {
        if (pruneIfExpired(k)) count++;
      }
      return count;
    },
  };
}

function normalizeBufferItem(message) {
  if (typeof message === "string") {
    return {
      messageId: "",
      text: message.trim(),
      type: "text",
      action: null,
      timestamp: null,
    };
  }
  return {
    messageId: String(message?.messageId || message?.id || "").trim(),
    text: String(message?.text || "").trim(),
    type: String(message?.type || "text"),
    action: message?.action || null,
    timestamp: message?.timestamp ? String(message.timestamp) : null,
  };
}

/**
 * Consolida ráfagas de mensajes en una ventana de 8-12s (default 10000ms) sobre un store Redis inyectable.
 */
export async function bufferIncomingMessages({
  store,
  key,
  message = null,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  now = Date.now(),
  flush = false,
} = {}) {
  if (!store || typeof store.get !== "function" || typeof store.set !== "function" || typeof store.del !== "function") {
    throw new TypeError("Se requiere un store Redis compatible con get/set/del.");
  }
  const cleanKey = String(key || "").trim();
  if (!cleanKey) {
    throw new TypeError("Se requiere una clave de buffer válida.");
  }

  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const effectiveDebounceMs = clampDebounceMs(debounceMs);

  const rawExisting = await store.get(cleanKey);
  let existing = null;
  if (typeof rawExisting === "string") {
    try {
      existing = JSON.parse(rawExisting);
    } catch {
      existing = null;
    }
  } else if (rawExisting && typeof rawExisting === "object") {
    existing = rawExisting;
  }

  const messages = Array.isArray(existing?.messages) ? [...existing.messages] : [];

  if (message !== null && message !== undefined) {
    const item = normalizeBufferItem(message);
    const isDuplicate =
      item.messageId.length > 0 &&
      messages.some((prev) => prev.messageId === item.messageId);
    if (!isDuplicate) {
      messages.push(item);
    }

    const flushAt = nowMs + effectiveDebounceMs;
    const mergedText = messages
      .map((m) => m.text)
      .filter(Boolean)
      .join("\n");

    if (flush) {
      await store.del(cleanKey);
      return {
        readyToProcess: true,
        key: cleanKey,
        messages,
        mergedText,
        pendingCount: messages.length,
        waitUntilMs: null,
        debounceMs: effectiveDebounceMs,
      };
    }

    await store.set(
      cleanKey,
      { messages, flushAt, updatedAt: nowMs },
      { ttlMs: effectiveDebounceMs * 6 }
    );

    return {
      readyToProcess: false,
      key: cleanKey,
      messages,
      mergedText,
      pendingCount: messages.length,
      waitUntilMs: flushAt,
      debounceMs: effectiveDebounceMs,
    };
  }

  if (messages.length === 0) {
    return {
      readyToProcess: false,
      key: cleanKey,
      messages: [],
      mergedText: "",
      pendingCount: 0,
      waitUntilMs: null,
      debounceMs: effectiveDebounceMs,
    };
  }

  const mergedText = messages
    .map((m) => m.text)
    .filter(Boolean)
    .join("\n");
  const flushAt = Number(existing?.flushAt ?? nowMs);

  if (flush || nowMs >= flushAt) {
    await store.del(cleanKey);
    return {
      readyToProcess: true,
      key: cleanKey,
      messages,
      mergedText,
      pendingCount: messages.length,
      waitUntilMs: null,
      debounceMs: effectiveDebounceMs,
    };
  }

  return {
    readyToProcess: false,
    key: cleanKey,
    messages,
    mergedText,
    pendingCount: messages.length,
    waitUntilMs: flushAt,
    debounceMs: effectiveDebounceMs,
  };
}

function detectClinicalUrgency(text) {
  if (!text) return false;
  return CLINICAL_URGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

function classifyDeterministic(text, source = "deterministic_rules") {
  const clean = String(text || "").trim();
  if (!clean) {
    return {
      intent: "handoff_humano",
      confidence: 0.3,
      requiresHumanHandoff: true,
      reason: "Mensaje vacío derivado a atención humana.",
      source,
    };
  }

  if (detectClinicalUrgency(clean)) {
    return {
      intent: "urgencia_clinica",
      confidence: 0.99,
      requiresHumanHandoff: true,
      reason: "Derivación humana obligatoria por posible urgencia clínica.",
      source,
    };
  }

  if (
    /\b(?:cancelar|anular|suspender|dar\s+de\s+baja)\b.*\b(?:turno|cita|consulta|consultor[ií]a|reserva)\b|\b(?:no\s+voy\s+a\s+poder\s+ir|no\s+puedo\s+asistir|cancelo\s+(?:el\s+|mi\s+)?turno|anulo\s+(?:el\s+|mi\s+)?turno)\b/i.test(
      clean
    )
  ) {
    return {
      intent: "cancelar_turno",
      confidence: 0.94,
      requiresHumanHandoff: false,
      reason: "Solicitud explícita de cancelación de turno.",
      source,
    };
  }

  if (isExplicitOptOutText(clean)) {
    return {
      intent: "baja_comunicaciones",
      confidence: 0.98,
      requiresHumanHandoff: false,
      reason: "Solicitud explícita de baja de comunicaciones bajo Ley 25.326.",
      source,
    };
  }

  if (
    /\b(?:hablar\s+con\s+(?:una\s+persona|alguien|secretar[ií]a|recepcionista|un\s+humano|el\s+doctor|la\s+doctora)|atenci[oó]n\s+humana|derivame|pasame\s+con\s+alguien|operador\s+humano|persona\s+real)\b/i.test(
      clean
    )
  ) {
    return {
      intent: "handoff_humano",
      confidence: 0.95,
      requiresHumanHandoff: true,
      reason: "El paciente solicitó hablar con una persona del equipo.",
      source,
    };
  }

  if (
    /\b(?:reprogramar|reagendar|cambiar|mover|pasar|postergar)\b.*\b(?:turno|horario|d[ií]a|fecha|consulta)\b|\b(?:quiero\s+reprogramar|necesito\s+reprogramar|otro\s+horario|cambiar\s+el\s+d[ií]a)\b/i.test(
      clean
    )
  ) {
    return {
      intent: "reprogramar_turno",
      confidence: 0.93,
      requiresHumanHandoff: false,
      reason: "Solicitud de cambio de fecha u horario de turno.",
      source,
    };
  }

  if (
    /\b(?:confirmar|confirmo|confirmado|asisto|voy\s+a\s+ir|all[ií]\s+estar[eé]|ah[ií]\s+estar[eé]|s[ií],?\s*confirmo)\b/i.test(
      clean
    )
  ) {
    return {
      intent: "confirmar_turno",
      confidence: 0.94,
      requiresHumanHandoff: false,
      reason: "Confirmación de asistencia a turno.",
      source,
    };
  }

  if (
    /\b(?:arancel|aranceles|precio|precios|valor|costo|cu[aá]nto\s+(?:sale|cuesta|cobran)|honorarios|obra\s+social|obras\s+sociales|prepaga|osde|swiss\s+medical|galeno|ioma|pami|reintegro|particular|medios\s+de\s+pago)\b/i.test(
      clean
    )
  ) {
    return {
      intent: "consulta_arancel_obra_social",
      confidence: 0.91,
      requiresHumanHandoff: false,
      reason: "Consulta sobre aranceles o cobertura de obra social.",
      source,
    };
  }

  if (
    /\b(?:sacar|pedir|reservar|agendar|solicitar|necesito|quiero)\b.*\b(?:turno|consulta|consultor[ií]a|evaluaci[oó]n|primera\s+vez)\b|\b(?:tienen\s+disponibilidad|hay\s+turnos|turnos\s+disponibles)\b/i.test(
      clean
    )
  ) {
    return {
      intent: "turno_nuevo",
      confidence: 0.9,
      requiresHumanHandoff: false,
      reason: "Solicitud de turno nuevo o disponibilidad inicial.",
      source,
    };
  }

  return {
    intent: "handoff_humano",
    confidence: 0.4,
    requiresHumanHandoff: true,
    reason: "Consulta no clasificada automáticamente; se deriva a revisión humana.",
    source,
  };
}

/**
 * Clasificador de intenciones $0 por reglas deterministas con hook inyectable customClassifier
 * para Gate 2 y guardarraíl inamovible de derivación humana ante urgencia clínica.
 */
export async function classifyPatientIntent(
  text,
  { customClassifier, context = {} } = {}
) {
  const cleanText = String(text || "").trim();

  // Guardarraíl clínico inamovible previo a cualquier adaptador externo
  if (detectClinicalUrgency(cleanText)) {
    return {
      intent: "urgencia_clinica",
      confidence: 0.99,
      requiresHumanHandoff: true,
      reason: "Derivación humana obligatoria por posible urgencia clínica.",
      source: typeof customClassifier === "function" ? "safety_guardrail" : "deterministic_rules",
    };
  }

  if (typeof customClassifier === "function") {
    try {
      const candidate = await customClassifier(cleanText, {
        ...context,
        allowedIntents: PATIENT_INTENTS,
      });
      const validIntent =
        candidate &&
        typeof candidate === "object" &&
        PATIENT_INTENTS.includes(candidate.intent);
      const validConfidence =
        validIntent &&
        typeof candidate.confidence === "number" &&
        Number.isFinite(candidate.confidence) &&
        candidate.confidence >= 0 &&
        candidate.confidence <= 1;

      if (validIntent && validConfidence) {
        const mustHandoff =
          candidate.intent === "urgencia_clinica" ||
          candidate.intent === "handoff_humano";
        return {
          intent: candidate.intent,
          confidence: Number(candidate.confidence),
          requiresHumanHandoff: mustHandoff
            ? true
            : Boolean(candidate.requiresHumanHandoff),
          reason: String(
            candidate.reason || "Clasificado por adaptador externo validado."
          ),
          source: "custom_classifier",
        };
      }
    } catch {
      // Fallback determinista seguro ante fallo de conector externo
    }
    return classifyDeterministic(cleanText, "deterministic_fallback");
  }

  return classifyDeterministic(cleanText, "deterministic_rules");
}
