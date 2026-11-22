// web/functions/api/ping.ts — Cloudflare Pages Function
// Recibe telemetría pasiva (< 1 KB, 0 cookies, Ley 25.326 compliant),
// actualiza metadata.telemetry en public.leads y dispara alertas Hot-Lead.

export interface PingEnv {
  PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_OWNER_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  HOT_LEAD_WEBHOOK_URL?: string;
  NEXOBOW_ROOT_DOMAIN?: string;
  PING_ALLOWED_ORIGINS?: string;
}

export type TelemetryEventType = "preview_view" | "theme_switch" | "cta_click";

export interface TelemetryPayload {
  event: TelemetryEventType;
  slug: string;
  timestamp?: number;
  meta?: {
    theme?: string;
    ctaLabel?: string;
    [key: string]: unknown;
  };
  compliance?: string;
}

export interface LeadTelemetryState {
  views_count: number;
  cta_clicks: number;
  selected_theme: string | null;
  last_event: TelemetryEventType;
  last_viewed_at: string;
  is_hot_lead: boolean;
}

export interface LeadRecord {
  id?: number | string;
  slug: string;
  name?: string;
  niche?: string;
  whatsapp_link?: string | null;
  demo_url?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface HotLeadAlertPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  event: TelemetryEventType;
  slug: string;
  selectedTheme: string | null;
}

export interface SupabaseLikeQuery {
  select(columns?: string): {
    eq(
      column: string,
      value: string | number
    ): {
      maybeSingle(): Promise<{ data: LeadRecord | null; error: { message: string } | null }>;
    };
  };
  update(patch: Record<string, unknown>): {
    eq(
      column: string,
      value: string | number
    ): Promise<{ data: LeadRecord[] | null; error: { message: string } | null }>;
  };
}

export interface SupabaseLikeClient {
  from(table: string): SupabaseLikeQuery;
}

export interface PingContext {
  request: Request;
  env?: PingEnv;
  supabaseClient?: SupabaseLikeClient;
  notifyHotLead?: (alert: HotLeadAlertPayload) => Promise<unknown>;
  fetchImpl?: typeof fetch;
}

export const MAX_PING_BODY_BYTES = 2 * 1024;
export const MAX_META_FIELD_LENGTH = 80;

const textEncoder = new TextEncoder();

const VALID_EVENTS = new Set<string>(["preview_view", "theme_switch", "cta_click"]);
const FORBIDDEN_KEYS = new Set<string>([
  "ip",
  "email",
  "phone",
  "telefono",
  "dni",
  "cuit",
  "cookie",
  "cookies",
]);

function parseCustomAllowedOrigins(env: PingEnv = {}): string[] {
  return String(env.PING_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        return new URL(entry).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function isAllowedPingOrigin(origin: string, env: PingEnv = {}): boolean {
  const cleanOrigin = String(origin || "").trim();
  if (!cleanOrigin) return false;
  let parsed: URL;
  try {
    parsed = new URL(cleanOrigin);
  } catch {
    return false;
  }
  if (parsed.origin !== cleanOrigin) return false;

  const customAllowed = parseCustomAllowedOrigins(env);
  if (customAllowed.includes(parsed.origin)) {
    return true;
  }

  if (parsed.protocol !== "https:" || parsed.port !== "") {
    return false;
  }

  const rootDomain = (env.NEXOBOW_ROOT_DOMAIN || "nexobow.site").trim().toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === `preview.${rootDomain}`
  ) {
    return true;
  }

  if (/^(?:[a-z0-9-]+\.)?(?:nexobow[a-z0-9-]*|demo-[a-z0-9-]+)\.pages\.dev$/i.test(hostname)) {
    return true;
  }

  return false;
}

function resolveRequestOriginPolicy(
  request: Request | undefined,
  env: PingEnv = {}
): { allowed: boolean; allowOriginHeader: string | null } {
  const originHeader = request?.headers.get("origin")?.trim() || "";
  if (originHeader) {
    if (!isAllowedPingOrigin(originHeader, env)) {
      return { allowed: false, allowOriginHeader: null };
    }
    return { allowed: true, allowOriginHeader: originHeader };
  }

  const refererHeader = request?.headers.get("referer")?.trim() || "";
  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin;
      if (!isAllowedPingOrigin(refererOrigin, env)) {
        return { allowed: false, allowOriginHeader: null };
      }
    } catch {
      return { allowed: false, allowOriginHeader: null };
    }
  }

  return { allowed: true, allowOriginHeader: null };
}

function getCorsHeaders(allowedOrigin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
  };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }
  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  allowedOrigin: string | null = null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(allowedOrigin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function sanitizeMetaField(value: unknown, maxLen = MAX_META_FIELD_LENGTH): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function sanitizeSafeHttpUrl(rawUrl: unknown, fallback: string): string {
  const clean = String(rawUrl || "").trim();
  if (!clean) return fallback;
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Fallback abajo
  }
  return fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasForbiddenKeys(obj: Record<string, unknown>): string | null {
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      return key;
    }
    const nested = obj[key];
    if (isPlainObject(nested)) {
      const nestedHit = hasForbiddenKeys(nested);
      if (nestedHit) return nestedHit;
    }
  }
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveIsoTimestamp(rawTimestamp: unknown): string {
  if (typeof rawTimestamp === "number" && Number.isFinite(rawTimestamp) && rawTimestamp > 0) {
    const parsed = new Date(rawTimestamp);
    if (!Number.isNaN(parsed.getTime()) && parsed.getUTCFullYear() >= 2020) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function buildRestSupabaseAdapter(
  supabaseUrl: string,
  supabaseKey: string,
  fetchFn: typeof fetch
): SupabaseLikeClient {
  const baseHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  return {
    from(table: string): SupabaseLikeQuery {
      const cleanBase = supabaseUrl.replace(/\/+$/, "");
      return {
        select(columns = "*") {
          return {
            eq(column: string, value: string | number) {
              return {
                async maybeSingle() {
                  const queryUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(columns)}&${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}&limit=1`;
                  const res = await fetchFn(queryUrl, {
                    method: "GET",
                    headers: baseHeaders,
                  });
                  if (!res.ok) {
                    const errText = await res.text().catch(() => "");
                    return { data: null, error: { message: `HTTP ${res.status}: ${errText}` } };
                  }
                  const rows = (await res.json()) as LeadRecord[];
                  return { data: Array.isArray(rows) && rows.length > 0 ? rows[0] : null, error: null };
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            async eq(column: string, value: string | number) {
              const patchUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}`;
              const res = await fetchFn(patchUrl, {
                method: "PATCH",
                headers: {
                  ...baseHeaders,
                  Prefer: "return=representation",
                },
                body: JSON.stringify(patch),
              });
              if (!res.ok) {
                const errText = await res.text().catch(() => "");
                return { data: null, error: { message: `HTTP ${res.status}: ${errText}` } };
              }
              const updated = (await res.json().catch(() => [])) as LeadRecord[];
              return { data: updated, error: null };
            },
          };
        },
      };
    },
  };
}

function buildHotLeadAlert(
  lead: LeadRecord,
  event: TelemetryEventType,
  telemetry: LeadTelemetryState,
  meta: { theme?: string; ctaLabel?: string },
  env: PingEnv
): HotLeadAlertPayload {
  const rootDomain = env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const ownerEmail = env.ADMIN_OWNER_EMAIL || "juanma@nexobow.site";
  const leadName = sanitizeMetaField(String(lead.name || lead.slug || "Prospecto"), 120) || "Prospecto";
  const crmUrl = `https://${rootDomain}/admin/crm`;
  const defaultPreviewUrl = `https://preview.${rootDomain}/${lead.slug}/`;
  const previewUrl = sanitizeSafeHttpUrl(lead.demo_url, defaultPreviewUrl);
  const digits = String(lead.phone || "").replace(/\D/g, "");
  const fallbackWa = digits ? `https://wa.me/${digits}` : "https://wa.me/5493489536088";
  const waDirectUrl = sanitizeSafeHttpUrl(lead.whatsapp_link, fallbackWa);

  const safeTheme = sanitizeMetaField(
    telemetry.selected_theme || meta.theme || "Personalizada",
    MAX_META_FIELD_LENGTH
  );
  const safeCtaLabel = sanitizeMetaField(meta.ctaLabel || "WhatsApp / Turno", MAX_META_FIELD_LENGTH);

  const eventLabelMap: Record<TelemetryEventType, string> = {
    preview_view: "Abrió su preview por primera vez",
    theme_switch: `Cambió de paleta a "${safeTheme || "Personalizada"}"`,
    cta_click: `Hizo clic en CTA (${safeCtaLabel || "WhatsApp / Turno"})`,
  };
  const eventDescription = eventLabelMap[event];
  const subject = `🔥 Hot-Lead: ${leadName} — ${eventDescription}`.replace(/[\r\n]+/g, " ").trim();

  const text = [
    `Alerta Hot-Lead NexoBow`,
    `Prospecto: ${leadName} (${lead.slug})`,
    `Evento: ${eventDescription}`,
    `Vistas totales: ${telemetry.views_count} | Clics CTA: ${telemetry.cta_clicks}`,
    `Paleta elegida: ${telemetry.selected_theme || "Original"}`,
    `Preview: ${previewUrl}`,
    `Abrir CRM: ${crmUrl}`,
    `Escribir por WhatsApp: ${waDirectUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="es-AR">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px;color:#111827;">
  <h2 style="margin:0 0 12px;color:#4928c2;">🔥 Hot-Lead Detectado: ${escapeHtml(leadName)}</h2>
  <p style="margin:0 0 12px;"><strong>Actividad:</strong> ${escapeHtml(eventDescription)}</p>
  <ul style="margin:0 0 18px;padding-left:18px;">
    <li><strong>Slug:</strong> ${escapeHtml(lead.slug)}</li>
    <li><strong>Vistas:</strong> ${telemetry.views_count} | <strong>Clics CTA:</strong> ${telemetry.cta_clicks}</li>
    <li><strong>Paleta preferida:</strong> ${escapeHtml(telemetry.selected_theme || "Original")}</li>
  </ul>
  <p style="margin:0 0 10px;">
    <a href="${escapeHtml(waDirectUrl)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:8px;">
      💬 Abrir WhatsApp ahora
    </a>
    <a href="${escapeHtml(crmUrl)}" style="display:inline-block;padding:10px 16px;background:#0b0d12;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
      Ver en /admin/crm →
    </a>
  </p>
  <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Preview: ${escapeHtml(previewUrl)}</p>
</body>
</html>`;

  return {
    to: ownerEmail,
    subject,
    html,
    text,
    event,
    slug: lead.slug,
    selectedTheme: telemetry.selected_theme,
  };
}

export const onRequestOptions = async (context: Partial<PingContext> = {}): Promise<Response> => {
  const { request, env = {} } = context;
  const originPolicy = resolveRequestOriginPolicy(request, env);
  if (!originPolicy.allowed) {
    return jsonResponse({ ok: false, error: "Origen no autorizado" }, 403, null);
  }
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(originPolicy.allowOriginHeader),
  });
};

export const onRequestPost = async (context: PingContext): Promise<Response> => {
  const { request, env = {}, supabaseClient, notifyHotLead, fetchImpl = globalThis.fetch } = context;

  const originPolicy = resolveRequestOriginPolicy(request, env);
  if (!originPolicy.allowed) {
    return jsonResponse({ ok: false, error: "Origen no autorizado" }, 403, null);
  }
  const allowedOrigin = originPolicy.allowOriginHeader;

  let parsed: unknown;
  try {
    const rawBody = await request.text();
    if (textEncoder.encode(rawBody).byteLength > MAX_PING_BODY_BYTES) {
      return jsonResponse(
        { ok: false, error: "Payload excede el tamaño máximo permitido (2 KB)" },
        413,
        allowedOrigin
      );
    }
    if (!rawBody || !rawBody.trim()) {
      return jsonResponse({ ok: false, error: "Payload JSON requerido" }, 400, allowedOrigin);
    }
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: "JSON malformado" }, 400, allowedOrigin);
  }

  if (!isPlainObject(parsed)) {
    return jsonResponse({ ok: false, error: "Payload debe ser un objeto JSON" }, 400, allowedOrigin);
  }

  const forbiddenKey = hasForbiddenKeys(parsed);
  if (forbiddenKey) {
    return jsonResponse(
      {
        ok: false,
        error: `Campo prohibido por Ley 25.326 detectado: ${forbiddenKey}`,
      },
      400,
      allowedOrigin
    );
  }

  const rawEvent = typeof parsed.event === "string" ? parsed.event.trim() : "";
  if (!VALID_EVENTS.has(rawEvent)) {
    return jsonResponse({ ok: false, error: "Evento de telemetría inválido" }, 400, allowedOrigin);
  }
  const event = rawEvent as TelemetryEventType;

  const rawSlug = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
  if (!rawSlug || !/^[a-zA-Z0-9_-]{1,140}$/.test(rawSlug)) {
    return jsonResponse({ ok: false, error: "Slug inválido o ausente" }, 400, allowedOrigin);
  }

  if (parsed.meta !== undefined && !isPlainObject(parsed.meta)) {
    return jsonResponse({ ok: false, error: "El campo meta debe ser un objeto" }, 400, allowedOrigin);
  }
  const meta = isPlainObject(parsed.meta) ? parsed.meta : {};

  let db = supabaseClient;
  if (!db) {
    const supabaseUrl = (env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
    const supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ ok: false, error: "Persistencia Supabase no configurada" }, 503, allowedOrigin);
    }
    db = buildRestSupabaseAdapter(supabaseUrl, supabaseKey, fetchImpl);
  }

  const { data: lead, error: selectError } = await db
    .from("leads")
    .select("id, slug, name, niche, whatsapp_link, demo_url, phone, metadata")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (selectError) {
    return jsonResponse({ ok: false, error: "Error consultando lead en Supabase" }, 500, allowedOrigin);
  }

  if (!lead) {
    return jsonResponse({ ok: false, error: "Lead no encontrado" }, 404, allowedOrigin);
  }

  const currentMeta = isPlainObject(lead.metadata) ? lead.metadata : {};
  const currentTelemetry = isPlainObject(currentMeta.telemetry) ? currentMeta.telemetry : {};

  const previousViews = Number(currentTelemetry.views_count || 0);
  const previousClicks = Number(currentTelemetry.cta_clicks || 0);
  const nextViews = event === "preview_view" ? previousViews + 1 : previousViews;
  const nextClicks = event === "cta_click" ? previousClicks + 1 : previousClicks;
  const incomingTheme = sanitizeMetaField(meta.theme, MAX_META_FIELD_LENGTH);
  const incomingCtaLabel = sanitizeMetaField(meta.ctaLabel, MAX_META_FIELD_LENGTH);
  const existingTheme = sanitizeMetaField(currentTelemetry.selected_theme, MAX_META_FIELD_LENGTH);
  const selectedTheme =
    event === "theme_switch" && incomingTheme
      ? incomingTheme
      : existingTheme || null;
  const viewedAtIso = resolveIsoTimestamp(parsed.timestamp);

  const nextTelemetry: LeadTelemetryState = {
    ...currentTelemetry,
    views_count: nextViews,
    cta_clicks: nextClicks,
    selected_theme: selectedTheme,
    last_event: event,
    last_viewed_at: viewedAtIso,
    is_hot_lead: true,
  };

  const nextMetadata = {
    ...currentMeta,
    telemetry: nextTelemetry,
  };

  const { error: updateError } = await db
    .from("leads")
    .update({
      metadata: nextMetadata,
      last_activity_at: viewedAtIso,
    })
    .eq("slug", rawSlug);

  if (updateError) {
    return jsonResponse({ ok: false, error: "Error actualizando telemetría" }, 500, allowedOrigin);
  }

  const isFirstView = event === "preview_view" && previousViews === 0;
  const shouldAlert = isFirstView || event === "theme_switch" || event === "cta_click";
  let hotLeadAlertSent = false;

  if (shouldAlert) {
    const alertPayload = buildHotLeadAlert(
      lead,
      event,
      nextTelemetry,
      { theme: incomingTheme, ctaLabel: incomingCtaLabel },
      env
    );
    try {
      if (typeof notifyHotLead === "function") {
        await notifyHotLead(alertPayload);
        hotLeadAlertSent = true;
      } else if (env.RESEND_API_KEY) {
        const resendRes = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL || "NexoBow Radar <onboarding@resend.dev>",
            to: [alertPayload.to],
            subject: alertPayload.subject,
            html: alertPayload.html,
            text: alertPayload.text,
          }),
        });
        hotLeadAlertSent = resendRes.ok;
      } else if (env.HOT_LEAD_WEBHOOK_URL) {
        const webhookRes = await fetchImpl(env.HOT_LEAD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alertPayload),
        });
        hotLeadAlertSent = webhookRes.ok;
      }
    } catch {
      hotLeadAlertSent = false;
    }
  }

  return jsonResponse(
    {
      ok: true,
      slug: rawSlug,
      event,
      hotLeadAlertSent,
      telemetry: nextTelemetry,
    },
    200,
    allowedOrigin
  );
};
