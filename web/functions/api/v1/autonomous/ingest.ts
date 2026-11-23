// web/functions/api/v1/autonomous/ingest.ts — Cloudflare Pages Function
// Recibe métricas agregadas y latidos de salud desde VPS Gate 1 (n8n 2.0) hacia public.autonomous_events.
// Privacidad por diseño (Ley 25.326): rechaza recursivamente cualquier campo personal de pacientes y falla cerrada sin clave.

import { constantTimeEqual } from "../../../../src/lib/unsubscribe-token.ts";

export interface AutonomousIngestEnv {
  PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  AUTONOMOUS_INGEST_KEY?: string;
  ENVIRONMENT?: string;
  CF_PAGES?: string;
}

export type AutonomousEventType =
  | "heartbeat"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "waitlist_filled"
  | "review_invite_sent"
  | "human_handoff";

export const AUTONOMOUS_EVENT_TYPES: readonly AutonomousEventType[] = [
  "heartbeat",
  "appointment_confirmed",
  "appointment_rescheduled",
  "appointment_cancelled",
  "waitlist_filled",
  "review_invite_sent",
  "human_handoff",
] as const;

const AUTONOMOUS_EVENT_TYPE_SET = new Set<string>(AUTONOMOUS_EVENT_TYPES);

export const MAX_AUTONOMOUS_INGEST_BODY_BYTES = 4 * 1024;
export const MAX_COUNT_DELTA = 10_000;
const MAX_JSON_DEPTH = 12;

const ALLOWED_ROOT_KEYS = new Set<string>([
  "client_slug",
  "event_type",
  "period_date",
  "count_delta",
  "engine_version",
  "summary",
]);

export const FORBIDDEN_PII_KEYS = new Set<string>([
  "phone",
  "telefono",
  "celular",
  "whatsapp",
  "patient_phone",
  "patient_phone_e164",
  "patient_phone_hash",
  "patient_name",
  "patient_first_name",
  "patient_last_name",
  "patient_email",
  "patient_dni",
  "email",
  "correo",
  "dni",
  "cuit",
  "cuil",
  "message_text",
  "audio_transcript",
  "first_name",
  "last_name",
  "full_name",
  "nombre_paciente",
  "apellido_paciente",
  "ip",
  "ip_address",
  "cookie",
  "cookies",
]);

export interface AutonomousEventInsertRecord {
  id?: string;
  client_slug: string;
  event_type: AutonomousEventType;
  period_date: string;
  count_delta: number;
  engine_version: string;
  summary: Record<string, unknown>;
  received_at: string;
}

export interface AutonomousInsertResponse {
  data: AutonomousEventInsertRecord[] | null;
  error: { message: string } | null;
}

export interface AutonomousSupabaseClient {
  from(table: string): {
    insert(
      payload: AutonomousEventInsertRecord | AutonomousEventInsertRecord[]
    ):
      | Promise<AutonomousInsertResponse>
      | {
          select(): Promise<AutonomousInsertResponse>;
        };
  };
}

export interface AutonomousIngestContext {
  request: Request;
  env?: AutonomousIngestEnv;
  supabaseClient?: AutonomousSupabaseClient;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const textEncoder = new TextEncoder();

function baseSecurityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
  };
}

function jsonNoStore(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...baseSecurityHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePiiKeyName(rawKey: string): string {
  return String(rawKey || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findForbiddenPiiKey(value: unknown, depth = 0): string | null {
  if (depth > MAX_JSON_DEPTH) {
    return "__max_depth_exceeded__";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findForbiddenPiiKey(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const normalized = normalizePiiKeyName(key);
      if (FORBIDDEN_PII_KEYS.has(normalized)) {
        return key;
      }
      const nestedHit = findForbiddenPiiKey(nested, depth + 1);
      if (nestedHit) return nestedHit;
    }
  }
  return null;
}

export function isValidPeriodDate(rawDate: string): boolean {
  const match = String(rawDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

async function sha256Digest(value: string): Promise<Uint8Array> {
  const buffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(value)
  );
  return new Uint8Array(buffer);
}

async function verifyIngestKeyConstantTime(
  providedKey: string,
  expectedKey: string
): Promise<boolean> {
  if (!providedKey || !expectedKey) return false;
  const [providedHash, expectedHash] = await Promise.all([
    sha256Digest(providedKey),
    sha256Digest(expectedKey),
  ]);
  return constantTimeEqual(providedHash, expectedHash);
}

function isValidHttpsSupabaseUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function buildServiceRoleSupabaseAdapter(
  supabaseUrl: string,
  serviceRoleKey: string,
  fetchFn: typeof fetch
): AutonomousSupabaseClient {
  const cleanBase = supabaseUrl.replace(/\/+$/, "");
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  return {
    from(table: string) {
      return {
        insert(payload: AutonomousEventInsertRecord | AutonomousEventInsertRecord[]) {
          const runInsert = async (): Promise<AutonomousInsertResponse> => {
            const rows = Array.isArray(payload) ? payload : [payload];
            const res = await fetchFn(
              `${cleanBase}/rest/v1/${encodeURIComponent(table)}`,
              {
                method: "POST",
                headers,
                body: JSON.stringify(rows),
              }
            );
            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              return {
                data: null,
                error: { message: `HTTP ${res.status}: ${errText}` },
              };
            }
            const inserted = (await res
              .json()
              .catch(() => [])) as AutonomousEventInsertRecord[];
            return { data: inserted, error: null };
          };

          return {
            select: runInsert,
            then<TResult1 = AutonomousInsertResponse, TResult2 = never>(
              onfulfilled?:
                | ((value: AutonomousInsertResponse) => TResult1 | PromiseLike<TResult1>)
                | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
            ): Promise<TResult1 | TResult2> {
              return runInsert().then(onfulfilled, onrejected);
            },
          };
        },
      };
    },
  };
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: {
      ...baseSecurityHeaders(),
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Autonomous-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
};

export const onRequestPost = async (
  context: AutonomousIngestContext
): Promise<Response> => {
  const {
    request,
    env = {},
    supabaseClient,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
  } = context;

  // 1. Falla cerrada si falta AUTONOMOUS_INGEST_KEY (obligatorio en CF_PAGES=1, production y ejecución general)
  const expectedKey = String(env.AUTONOMOUS_INGEST_KEY || "").trim();
  if (!expectedKey) {
    return jsonNoStore(
      { ok: false, error: "Ingesta autónoma no configurada." },
      503
    );
  }

  // 2. Autenticación mediante cabecera X-Autonomous-Key en tiempo constante
  const providedKey = String(request.headers.get("x-autonomous-key") || "").trim();
  if (!providedKey) {
    return jsonNoStore(
      { ok: false, error: "Cabecera X-Autonomous-Key requerida." },
      401
    );
  }

  const authorized = await verifyIngestKeyConstantTime(providedKey, expectedKey);
  if (!authorized) {
    return jsonNoStore(
      { ok: false, error: "Credencial de ingesta autónoma inválida." },
      403
    );
  }

  // 3. Límite estricto de tamaño <= 4 KB y parseo JSON seguro
  const rawContentLen = request.headers.get("content-length");
  if (rawContentLen !== null) {
    const parsedLen = Number(rawContentLen);
    if (Number.isFinite(parsedLen) && parsedLen > MAX_AUTONOMOUS_INGEST_BODY_BYTES) {
      return jsonNoStore(
        { ok: false, error: "Payload excede el tamaño máximo permitido (4 KB)." },
        413
      );
    }
  }

  let parsed: unknown;
  try {
    const rawBody = await request.text();
    if (textEncoder.encode(rawBody).byteLength > MAX_AUTONOMOUS_INGEST_BODY_BYTES) {
      return jsonNoStore(
        { ok: false, error: "Payload excede el tamaño máximo permitido (4 KB)." },
        413
      );
    }
    if (!rawBody || !rawBody.trim()) {
      return jsonNoStore({ ok: false, error: "Payload JSON requerido." }, 400);
    }
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonNoStore({ ok: false, error: "JSON malformado." }, 400);
  }

  if (!isPlainObject(parsed)) {
    return jsonNoStore(
      { ok: false, error: "El cuerpo debe ser un objeto JSON plano." },
      400
    );
  }

  // 4. Escaneo recursivo anti-PII bajo Ley 25.326
  const piiHit = findForbiddenPiiKey(parsed);
  if (piiHit) {
    return jsonNoStore(
      {
        ok: false,
        code: "pii_rejected",
        error:
          "Payload rechazado por contener campos personales restringidos (Ley 25.326).",
      },
      400
    );
  }

  // 5. Validación de claves raíz permitidas y contrato de public.autonomous_events
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_ROOT_KEYS.has(key)) {
      return jsonNoStore(
        { ok: false, error: "Campo raíz no permitido en el esquema de eventos." },
        400
      );
    }
  }

  const clientSlug =
    typeof parsed.client_slug === "string" ? parsed.client_slug.trim() : "";
  if (
    !clientSlug ||
    clientSlug.length < 2 ||
    clientSlug.length > 120 ||
    !/^[a-z0-9][a-z0-9_-]{1,119}$/i.test(clientSlug) ||
    !/[a-z]/i.test(clientSlug)
  ) {
    return jsonNoStore(
      { ok: false, error: "client_slug inválido o ausente." },
      400
    );
  }

  const eventType =
    typeof parsed.event_type === "string" ? parsed.event_type.trim() : "";
  if (!AUTONOMOUS_EVENT_TYPE_SET.has(eventType)) {
    return jsonNoStore(
      { ok: false, error: "event_type fuera del enum permitido." },
      400
    );
  }

  let countDelta = 1;
  if (parsed.count_delta !== undefined) {
    if (
      typeof parsed.count_delta !== "number" ||
      !Number.isInteger(parsed.count_delta) ||
      parsed.count_delta < 0 ||
      parsed.count_delta > MAX_COUNT_DELTA
    ) {
      return jsonNoStore(
        { ok: false, error: "count_delta debe ser un entero entre 0 y 10000." },
        400
      );
    }
    countDelta = parsed.count_delta;
  }

  const currentDate = now();
  let periodDate = currentDate.toISOString().slice(0, 10);
  if (parsed.period_date !== undefined) {
    if (typeof parsed.period_date !== "string" || !isValidPeriodDate(parsed.period_date)) {
      return jsonNoStore(
        { ok: false, error: "period_date debe tener formato válido YYYY-MM-DD." },
        400
      );
    }
    periodDate = parsed.period_date.trim();
  }

  let engineVersion = "gate1-v1";
  if (parsed.engine_version !== undefined) {
    if (
      typeof parsed.engine_version !== "string" ||
      !/^[a-zA-Z0-9._-]{1,40}$/.test(parsed.engine_version.trim())
    ) {
      return jsonNoStore(
        { ok: false, error: "engine_version inválido." },
        400
      );
    }
    engineVersion = parsed.engine_version.trim();
  }

  let summary: Record<string, unknown> = {};
  if (parsed.summary !== undefined) {
    if (!isPlainObject(parsed.summary)) {
      return jsonNoStore(
        { ok: false, error: "summary debe ser un objeto JSON plano sin PII." },
        400
      );
    }
    summary = parsed.summary;
  }

  // 6. Persistencia estricta usando únicamente SUPABASE_SERVICE_ROLE_KEY
  let db = supabaseClient;
  if (!db) {
    const supabaseUrl = String(env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
    const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!isValidHttpsSupabaseUrl(supabaseUrl) || !serviceRoleKey) {
      return jsonNoStore(
        { ok: false, error: "Persistencia Supabase no configurada." },
        503
      );
    }
    db = buildServiceRoleSupabaseAdapter(supabaseUrl, serviceRoleKey, fetchImpl);
  }

  const record: AutonomousEventInsertRecord = {
    client_slug: clientSlug,
    event_type: eventType as AutonomousEventType,
    period_date: periodDate,
    count_delta: countDelta,
    engine_version: engineVersion,
    summary,
    received_at: currentDate.toISOString(),
  };

  try {
    const insertCall = db.from("autonomous_events").insert([record]);
    const insertRes =
      insertCall && typeof (insertCall as { select?: () => Promise<AutonomousInsertResponse> }).select === "function"
        ? await (insertCall as { select(): Promise<AutonomousInsertResponse> }).select()
        : await (insertCall as Promise<AutonomousInsertResponse>);

    if (insertRes?.error) {
      return jsonNoStore(
        { ok: false, error: "Error registrando evento agregado en Supabase." },
        500
      );
    }

    const storedEvent =
      Array.isArray(insertRes?.data) && insertRes.data.length > 0
        ? insertRes.data[0]
        : record;

    return jsonNoStore({ ok: true, event: storedEvent }, 201);
  } catch {
    return jsonNoStore(
      { ok: false, error: "Error registrando evento agregado en Supabase." },
      500
    );
  }
};
