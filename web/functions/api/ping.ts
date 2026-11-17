// web/functions/api/ping.ts — Cloudflare Pages Function
// Recibe telemetría pasiva (< 1 KB, 0 cookies, Ley 25.326 compliant),
// actualiza metadata.telemetry en public.leads y dispara alertas Hot-Lead.

export interface PingEnv {
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_OWNER_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  HOT_LEAD_WEBHOOK_URL?: string;
  NEXOBOW_ROOT_DOMAIN?: string;
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

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
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
  meta: Record<string, unknown>,
  env: PingEnv
): HotLeadAlertPayload {
  const rootDomain = env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const ownerEmail = env.ADMIN_OWNER_EMAIL || "juanma@nexobow.site";
  const leadName = String(lead.name || lead.slug || "Prospecto").trim();
  const crmUrl = `https://${rootDomain}/admin/crm`;
  const previewUrl = lead.demo_url || `https://preview.${rootDomain}/${lead.slug}/`;
  const digits = String(lead.phone || "").replace(/\D/g, "");
  const waDirectUrl =
    lead.whatsapp_link || (digits ? `https://wa.me/${digits}` : "https://wa.me/5493489536088");

  const eventLabelMap: Record<TelemetryEventType, string> = {
    preview_view: "Abrió su preview por primera vez",
    theme_switch: `Cambió de paleta a "${telemetry.selected_theme || String(meta.theme || "Personalizada")}"`,
    cta_click: `Hizo clic en CTA (${String(meta.ctaLabel || "WhatsApp / Turno")})`,
  };
  const eventDescription = eventLabelMap[event];
  const subject = `🔥 Hot-Lead: ${leadName} — ${eventDescription}`;

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

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
};

export const onRequestPost = async (context: PingContext): Promise<Response> => {
  const { request, env = {}, supabaseClient, notifyHotLead, fetchImpl = globalThis.fetch } = context;

  let parsed: unknown;
  try {
    const rawBody = await request.text();
    if (!rawBody || !rawBody.trim()) {
      return jsonResponse({ ok: false, error: "Payload JSON requerido" }, 400);
    }
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: "JSON malformado" }, 400);
  }

  if (!isPlainObject(parsed)) {
    return jsonResponse({ ok: false, error: "Payload debe ser un objeto JSON" }, 400);
  }

  const forbiddenKey = hasForbiddenKeys(parsed);
  if (forbiddenKey) {
    return jsonResponse(
      {
        ok: false,
        error: `Campo prohibido por Ley 25.326 detectado: ${forbiddenKey}`,
      },
      400
    );
  }

  const rawEvent = typeof parsed.event === "string" ? parsed.event.trim() : "";
  if (!VALID_EVENTS.has(rawEvent)) {
    return jsonResponse({ ok: false, error: "Evento de telemetría inválido" }, 400);
  }
  const event = rawEvent as TelemetryEventType;

  const rawSlug = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
  if (!rawSlug || !/^[a-zA-Z0-9_-]{1,140}$/.test(rawSlug)) {
    return jsonResponse({ ok: false, error: "Slug inválido o ausente" }, 400);
  }

  if (parsed.meta !== undefined && !isPlainObject(parsed.meta)) {
    return jsonResponse({ ok: false, error: "El campo meta debe ser un objeto" }, 400);
  }
  const meta = isPlainObject(parsed.meta) ? parsed.meta : {};

  let db = supabaseClient;
  if (!db) {
    const supabaseUrl = env.PUBLIC_SUPABASE_URL || "https://henpyuwguwvflhgbxmvn.supabase.co";
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseKey) {
      return jsonResponse({ ok: false, error: "Persistencia Supabase no configurada" }, 503);
    }
    db = buildRestSupabaseAdapter(supabaseUrl, supabaseKey, fetchImpl);
  }

  const { data: lead, error: selectError } = await db
    .from("leads")
    .select("id, slug, name, niche, whatsapp_link, demo_url, phone, metadata")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (selectError) {
    return jsonResponse({ ok: false, error: "Error consultando lead en Supabase" }, 500);
  }

  if (!lead) {
    return jsonResponse({ ok: false, error: "Lead no encontrado" }, 404);
  }

  const currentMeta = isPlainObject(lead.metadata) ? lead.metadata : {};
  const currentTelemetry = isPlainObject(currentMeta.telemetry) ? currentMeta.telemetry : {};

  const previousViews = Number(currentTelemetry.views_count || 0);
  const previousClicks = Number(currentTelemetry.cta_clicks || 0);
  const nextViews = event === "preview_view" ? previousViews + 1 : previousViews;
  const nextClicks = event === "cta_click" ? previousClicks + 1 : previousClicks;
  const incomingTheme = typeof meta.theme === "string" ? meta.theme.trim() : "";
  const selectedTheme =
    event === "theme_switch" && incomingTheme
      ? incomingTheme
      : typeof currentTelemetry.selected_theme === "string"
        ? currentTelemetry.selected_theme
        : null;
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
    return jsonResponse({ ok: false, error: "Error actualizando telemetría" }, 500);
  }

  const isFirstView = event === "preview_view" && previousViews === 0;
  const shouldAlert = isFirstView || event === "theme_switch" || event === "cta_click";
  let hotLeadAlertSent = false;

  if (shouldAlert) {
    const alertPayload = buildHotLeadAlert(lead, event, nextTelemetry, meta, env);
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
    200
  );
};
