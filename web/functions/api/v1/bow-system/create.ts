// web/functions/api/v1/bow-system/create.ts — Cloudflare Pages Function
// Maneja el formulario inbound de solicitud de preview gratuita desde la web oficial

import {
  buildUnsubscribeFooterHtml,
  buildUnsubscribeFooterText,
  buildUnsubscribeHeaders,
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  resolveUnsubscribeSecret,
} from "../../../../src/lib/unsubscribe-token.ts";

export interface CreateBowEnv {
  PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_OWNER_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  UNSUBSCRIBE_SECRET?: string;
  NEXOBOW_ROOT_DOMAIN?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  CF_PAGES?: string;
}

export interface LeadComplianceMetadata {
  source: string;
  email: string | null;
  maps_url: string | null;
  modalidad: "presencial" | "mixto" | "online";
  tipo_consulta: "consultar" | "arancelada" | "gratuita";
  canal_agenda: "whatsapp_secretaria" | "calendly" | "google_calendar" | "turnero_externo";
  terms_accepted: boolean;
  terms_accepted_at: string;
  terms_version: string;
  marketing_opt_in: boolean;
  email_marketing: {
    unsubscribed: boolean;
    unsubscribed_at: string | null;
    welcome_sent_at: string | null;
    preview_ready_sent_at: string | null;
    followup_stage: "none" | "welcome" | "preview_delivered" | "ttl_reminder";
    provider_last: "zoho_mail" | "resend" | null;
  };
}

export interface OutboundEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface CreateSupabaseLikeClient {
  from(table: string): {
    select(columns?: string): {
      order(
        column: string,
        opts?: { ascending?: boolean }
      ): {
        limit(count: number): Promise<{
          data: Array<{ id?: number }> | null;
          error: { message: string } | null;
        }>;
      };
    };
    insert(payload: Record<string, unknown>): Promise<{
      data: Array<Record<string, unknown>> | null;
      error: { message: string } | null;
    }>;
    update?(patch: Record<string, unknown>): {
      eq(
        column: string,
        value: string | number
      ): Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  };
}

export interface CreateBowContext {
  request: Request;
  env?: CreateBowEnv;
  supabaseClient?: CreateSupabaseLikeClient;
  fetchImpl?: typeof fetch;
  sendEmail?: (mail: OutboundEmailPayload) => Promise<unknown>;
  now?: () => Date;
}

export const MAX_CREATE_BODY_BYTES = 8 * 1024;
export const TERMS_VERSION = "2026-11";

const textEncoder = new TextEncoder();

function slugifyPart(text: string, fallback: string): string {
  const clean = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 28);
  return clean || fallback;
}

export function sanitizePlainText(text: string, maxLen = 240): string {
  return String(text || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isValidEmail(raw: string): boolean {
  const clean = String(raw || "").trim().toLowerCase();
  if (!clean || clean.length > 160) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$/i.test(clean);
}

export function isAcceptedTermsValue(val: unknown): boolean {
  if (val === true) return true;
  if (typeof val === "string") {
    const clean = val.trim().toLowerCase();
    return clean === "true" || clean === "on" || clean === "1" || clean === "yes" || clean === "si";
  }
  return false;
}

export function normalizeArgentineWhatsApp(rawPhone: string): string | null {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits || digits.length < 8 || digits.length > 16) return null;

  if (digits.startsWith("549")) {
    const clean = digits.length >= 10 && digits.length <= 15 ? digits : "";
    return clean ? `+${clean}` : null;
  }

  if (digits.startsWith("54")) {
    let rest = digits.slice(2).replace(/^0+/, "");
    if (rest.startsWith("1115") && rest.length >= 12) {
      rest = `11${rest.slice(4)}`;
    } else if (rest.startsWith("15") && rest.length >= 10) {
      rest = `11${rest.slice(2)}`;
    }
    const combined = `549${rest}`;
    return combined.length >= 11 && combined.length <= 15 ? `+${combined}` : null;
  }

  digits = digits.replace(/^0+/, "");
  if (!digits || digits.length < 8) return null;

  if (digits.startsWith("15") && digits.length >= 9) {
    digits = `11${digits.slice(2)}`;
  }

  if (digits.startsWith("11")) {
    let local = digits.slice(2);
    if (local.startsWith("15") && local.length === 10) {
      local = local.slice(2);
    }
    if (local.length < 7) return null;
    return `+54911${local}`;
  }

  if (digits.length === 12) {
    if (digits.slice(4, 6) === "15") {
      digits = digits.slice(0, 4) + digits.slice(6);
    } else if (digits.slice(3, 5) === "15") {
      digits = digits.slice(0, 3) + digits.slice(5);
    }
  } else if (digits.length === 11 && digits.slice(3, 5) === "15") {
    digits = digits.slice(0, 3) + digits.slice(5);
  }

  const combined = `549${digits}`;
  return combined.length >= 11 && combined.length <= 15 ? `+${combined}` : null;
}

export function validateOptionalMapsUrl(rawUrl: string): { valid: boolean; value: string } {
  const clean = String(rawUrl || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!clean) return { valid: true, value: "" };

  const compactLower = clean.replace(/\s+/g, "").toLowerCase();
  if (/^(javascript|data|vbscript|file):/.test(compactLower)) {
    return { valid: false, value: "" };
  }

  if (clean.startsWith("@")) {
    return { valid: true, value: sanitizePlainText(clean, 120) };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(clean)) {
    try {
      const parsed = new URL(clean);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { valid: false, value: "" };
      }
      return { valid: true, value: parsed.toString().replace(/[<>]/g, "").slice(0, 300) };
    } catch {
      return { valid: false, value: "" };
    }
  }

  return { valid: true, value: sanitizePlainText(clean, 300) };
}

function buildRestSupabaseAdapter(
  supabaseUrl: string,
  supabaseKey: string,
  fetchFn: typeof fetch
): CreateSupabaseLikeClient {
  const cleanBase = supabaseUrl.replace(/\/+$/, "");
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  return {
    from(table: string) {
      return {
        select(columns = "*") {
          return {
            order(column: string, opts: { ascending?: boolean } = {}) {
              return {
                async limit(count: number) {
                  const dir = opts.ascending ? "asc" : "desc";
                  const queryUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(columns)}&order=${encodeURIComponent(column)}.${dir}&limit=${Number(count)}`;
                  const res = await fetchFn(queryUrl, { method: "GET", headers });
                  if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    return { data: null, error: { message: `HTTP ${res.status}: ${txt}` } };
                  }
                  const rows = (await res.json()) as Array<{ id?: number }>;
                  return { data: rows, error: null };
                },
              };
            },
          };
        },
        async insert(payload: Record<string, unknown>) {
          const res = await fetchFn(`${cleanBase}/rest/v1/${encodeURIComponent(table)}`, {
            method: "POST",
            headers: {
              ...headers,
              Prefer: "return=minimal",
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            return { data: null, error: { message: `HTTP ${res.status}: ${txt}` } };
          }
          return { data: [payload], error: null };
        },
        update(patch: Record<string, unknown>) {
          return {
            async eq(column: string, value: string | number) {
              const patchUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}`;
              const res = await fetchFn(patchUrl, {
                method: "PATCH",
                headers: {
                  ...headers,
                  Prefer: "return=minimal",
                },
                body: JSON.stringify(patch),
              });
              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                return { data: null, error: { message: `HTTP ${res.status}: ${txt}` } };
              }
              return { data: [], error: null };
            },
          };
        },
      };
    },
  };
}

async function dispatchResendEmail(
  mail: OutboundEmailPayload,
  env: CreateBowEnv,
  fetchFn: typeof fetch,
  customSender?: (mail: OutboundEmailPayload) => Promise<unknown>
): Promise<{ sent: boolean; error: string | null }> {
  try {
    if (typeof customSender === "function") {
      await customSender(mail);
      return { sent: true, error: null };
    }
    if (!env.RESEND_API_KEY) {
      return { sent: false, error: "RESEND_API_KEY no configurada" };
    }
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "NexoBow <hola@nexobow.site>",
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.headers ? { headers: mail.headers } : {}),
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { sent: false, error: `HTTP ${res.status}: ${errBody}` };
    }
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildAdminAlertMail(params: {
  ownerEmail: string;
  leadId: number;
  slug: string;
  name: string;
  rubro: string;
  email: string;
  normalizedPhone: string;
  waDigits: string;
  mapsUrl: string;
  rootDomain: string;
  termsAcceptedAt: string;
}): OutboundEmailPayload {
  const {
    ownerEmail,
    leadId,
    slug,
    name,
    rubro,
    email,
    normalizedPhone,
    waDigits,
    mapsUrl,
    rootDomain,
  } = params;
  const waDirectUrl = `https://wa.me/${waDigits}`;
  const crmUrl = `https://${rootDomain}/admin/crm`;
  const subject = `📥 Nueva solicitud de muestra web (#${leadId}): ${name}`
    .replace(/[\r\n]+/g, " ")
    .trim();

  const text = [
    `Nueva solicitud inbound en NexoBow`,
    `ID / Slug: #${leadId} (${slug})`,
    `Profesional: ${name}`,
    `Especialidad: ${rubro}`,
    `Email: ${email}`,
    `WhatsApp: ${normalizedPhone} (${waDirectUrl})`,
    `Maps / Web: ${mapsUrl || "No informado"}`,
    `Términos aceptados: ${params.termsAcceptedAt} (${TERMS_VERSION})`,
    `Abrir CRM: ${crmUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="es-AR">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;background:#f4f4f5;color:#111827;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
    <h2 style="margin:0 0 12px;color:#4928c2;">📥 Nueva solicitud de muestra gratuita</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">Ingresó un pedido desde el formulario público de <strong>nexobow.site</strong>.</p>
    <ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.6;">
      <li><strong>Lead:</strong> #${leadId} (${escapeHtml(slug)})</li>
      <li><strong>Nombre:</strong> ${escapeHtml(name)}</li>
      <li><strong>Especialidad:</strong> ${escapeHtml(rubro)}</li>
      <li><strong>Email:</strong> ${escapeHtml(email)}</li>
      <li><strong>WhatsApp:</strong> ${escapeHtml(normalizedPhone)}</li>
      <li><strong>Maps / Instagram / Web:</strong> ${escapeHtml(mapsUrl || "No informado")}</li>
      <li><strong>Consentimiento T&amp;C:</strong> Aceptado (${escapeHtml(params.termsAcceptedAt)})</li>
    </ul>
    <p style="margin:0;">
      <a href="${escapeHtml(waDirectUrl)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:8px;">
        💬 Abrir WhatsApp
      </a>
      <a href="${escapeHtml(crmUrl)}" style="display:inline-block;padding:10px 16px;background:#0b0d12;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
        Ver en /admin/crm →
      </a>
    </p>
  </div>
</body>
</html>`;

  return { to: ownerEmail, subject, html, text };
}

function buildProspectReceiptMail(params: {
  to: string;
  name: string;
  rubro: string;
  unsubscribeUrl: string;
  headers: Record<string, string>;
}): OutboundEmailPayload {
  const { to, name, rubro, unsubscribeUrl, headers } = params;
  const subject = `Recibimos tu pedido de muestra gratuita | NexoBow`;

  const text = [
    `Hola ${name},`,
    ``,
    `Confirmamos que recibimos correctamente tu solicitud para armar la muestra gratuita de ${rubro}.`,
    ``,
    `Cómo seguimos en menos de 24 horas hábiles:`,
    `- Revisamos tus datos públicos y preparamos tu página de muestra con 4 combinaciones de color.`,
    `- Te enviamos el enlace privado (reservado durante 7 días) por WhatsApp y por este correo.`,
    `- Todo sin costo ni compromiso de contratación.`,
    ``,
    `Un saludo cordial,`,
    `Juanma Merodio · NexoBow`,
    `WhatsApp: https://wa.me/5493489536088`,
    ``,
    buildUnsubscribeFooterText(unsubscribeUrl),
  ].join("\n");

  const html = `<!doctype html>
<html lang="es-AR">
<body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:30px;">
    <p style="margin:0 0 14px;font-size:15px;">Hola <strong>${escapeHtml(name)}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;">
      Confirmamos que recibimos tu solicitud para preparar la muestra gratuita de <strong>${escapeHtml(rubro)}</strong>.
    </p>
    <div style="margin:18px 0;padding:16px;background-color:#f8fafc;border-left:4px solid #4928c2;border-radius:8px;font-size:14px;">
      <strong>Qué incluye tu entrega en menos de 24 horas hábiles:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;">
        <li>Muestra personalizada con tus datos públicos y diseño adaptado a tu especialidad.</li>
        <li>Selector en vivo con 4 paletas de color para probar desde el celular.</li>
        <li>Reserva privada por 7 días corridos, sin costo ni compromiso.</li>
      </ul>
    </div>
    <p style="margin:0 0 18px;font-size:14px;color:#374151;">
      Si querés sumar fotos, matrícula o detalles específicos de tus horarios antes de que la compilemos, podés responder directo a este correo o escribirme por
      <a href="https://wa.me/5493489536088" style="color:#4928c2;font-weight:600;">WhatsApp (+54 9 3489 53-6088)</a>.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="margin:0;font-size:13px;color:#4b5563;">
      <strong>Juanma Merodio</strong> · NexoBow · <a href="https://nexobow.site" style="color:#6b7280;">nexobow.site</a>
    </p>
    ${buildUnsubscribeFooterHtml(unsubscribeUrl)}
  </div>
</body>
</html>`;

  return { to, subject, html, text, headers };
}

function errorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const onRequestPost = async (context: CreateBowContext): Promise<Response> => {
  const {
    request,
    env = {},
    supabaseClient,
    fetchImpl = globalThis.fetch,
    sendEmail,
    now = () => new Date(),
  } = context;
  const url = new URL(request.url);
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  const isJsonRequest = contentType.includes("application/json");

  try {
    const rawBody = await request.text();
    if (textEncoder.encode(rawBody).byteLength > MAX_CREATE_BODY_BYTES) {
      return errorResponse(413, "El envío supera el tamaño máximo permitido (8 KB).");
    }

    let rawFields: Record<string, unknown> = {};
    if (isJsonRequest) {
      try {
        const parsed = JSON.parse(rawBody || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return errorResponse(400, "Formato JSON inválido.");
        }
        rawFields = parsed as Record<string, unknown>;
      } catch {
        return errorResponse(400, "No pudimos leer los datos JSON enviados.");
      }
    } else {
      const params = new URLSearchParams(rawBody);
      rawFields = Object.fromEntries(params.entries());
    }

    // 1. Verificación honeypot antispam
    const websiteConfirm = String(rawFields.website_confirm || "").trim();
    if (websiteConfirm !== "") {
      return errorResponse(400, "Solicitud rechazada por validación de seguridad.");
    }

    // 2. Verificación obligatoria de aceptación de T&C y Política de Privacidad
    const acceptTermsRaw = rawFields.accept_terms;
    if (!isAcceptedTermsValue(acceptTermsRaw)) {
      return errorResponse(
        400,
        "Debés aceptar los Términos y Condiciones y la Política de Privacidad para continuar."
      );
    }

    // 3. Sanitización y validación de campos obligatorios
    const name = sanitizePlainText(String(rawFields.name || rawFields.nombre || ""), 120);
    if (!name || name.length < 2) {
      return errorResponse(400, "Ingresá tu nombre y apellido.");
    }

    const rubro =
      sanitizePlainText(String(rawFields.rubro || rawFields.especialidad || ""), 120) ||
      "Salud / Servicios";

    const rawEmail = String(rawFields.email || "").trim().toLowerCase();
    if (!isValidEmail(rawEmail)) {
      return errorResponse(400, "Ingresá un email válido para enviarte la confirmación.");
    }

    const rawWhatsapp = String(rawFields.whatsapp || rawFields.telefono || "").trim().slice(0, 40);
    const normalizedPhone = normalizeArgentineWhatsApp(rawWhatsapp);
    if (!normalizedPhone) {
      return errorResponse(
        400,
        "Ingresá un número de WhatsApp argentino válido (ej: +54 9 11 1234-5678)."
      );
    }
    const waDigits = normalizedPhone.replace(/\D/g, "");

    const rawMapsUrl = String(rawFields.maps_url || rawFields.link || "").trim();
    const mapsValidation = validateOptionalMapsUrl(rawMapsUrl);
    if (!mapsValidation.valid) {
      return errorResponse(400, "El enlace de Google Maps o sitio web tiene un formato inválido.");
    }
    const mapsUrl = mapsValidation.value;

    const currentDate = now();
    const nowIso = currentDate.toISOString();
    const expiresIso = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabaseUrl = (env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
    const supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    const db =
      supabaseClient ||
      (supabaseUrl && supabaseKey ? buildRestSupabaseAdapter(supabaseUrl, supabaseKey, fetchImpl) : null);

    if (!db) {
      return errorResponse(503, "Persistencia Supabase no configurada.");
    }

    let nextId = Math.floor(currentDate.getTime() % 100000);
    try {
      const latestRes = await db
        .from("leads")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const maxId = Number(latestRes?.data?.[0]?.id || 0);
      if (Number.isFinite(maxId) && maxId >= 0) {
        nextId = maxId + 1;
      }
    } catch {
      // Conservar nextId calculado
    }

    const nameToken = slugifyPart(name, "inbound");
    const rubroToken = slugifyPart(rubro, "salud");
    const slug = `${nextId}-${nameToken}-${rubroToken}`;

    const metadata: LeadComplianceMetadata = {
      source: "inbound_web",
      email: rawEmail,
      maps_url: mapsUrl || null,
      modalidad: "presencial",
      tipo_consulta: "consultar",
      canal_agenda: "whatsapp_secretaria",
      terms_accepted: true,
      terms_accepted_at: nowIso,
      terms_version: TERMS_VERSION,
      marketing_opt_in: true,
      email_marketing: {
        unsubscribed: false,
        unsubscribed_at: null,
        welcome_sent_at: null,
        preview_ready_sent_at: null,
        followup_stage: "welcome",
        provider_last: "resend",
      },
    };

    const notes = sanitizePlainText(
      `Solicitud Inbound Web. Email: ${rawEmail}. Rubro: ${rubro}. Maps/IG: ${mapsUrl || "No provisto"}. T&C: ${nowIso}`,
      600
    );

    const insertPayload = {
      id: nextId,
      slug,
      name,
      niche: rubro,
      contact_channel: "WhatsApp",
      whatsapp_link: `https://wa.me/${waDigits}`,
      social_link: mapsUrl || null,
      location: "Argentina / LATAM",
      city: "Argentina",
      funnel_status: "1. Prospecto Identificado",
      response_status: "Sin Contactar",
      potential_value: "$189.999 ARS",
      business_status: "En Proceso",
      phone: normalizedPhone,
      notes,
      last_activity_at: nowIso,
      expires_at: expiresIso,
      metadata,
    };

    const insertRes = await db.from("leads").insert(insertPayload);
    if (insertRes.error) {
      console.error("Error al registrar lead en Supabase:", insertRes.error.message);
    }

    // 4. Envío paralelo vía Resend (alerta a Juanma independiente de signingKey + confirmación con baja HMAC)
    const rootDomain = (env.NEXOBOW_ROOT_DOMAIN || "nexobow.site").trim();
    const ownerEmail = (env.ADMIN_OWNER_EMAIL || "juanma@nexobow.site").trim();
    const signingKey = resolveUnsubscribeSecret(env as Record<string, string | undefined>);
    const canSendEmail = Boolean(sendEmail || env.RESEND_API_KEY);

    let adminNotifyResult = { sent: false, error: null as string | null };
    let prospectNotifyResult = { sent: false, error: null as string | null };

    if (canSendEmail) {
      const adminMail = buildAdminAlertMail({
        ownerEmail,
        leadId: nextId,
        slug,
        name,
        rubro,
        email: rawEmail,
        normalizedPhone,
        waDigits,
        mapsUrl,
        rootDomain,
        termsAcceptedAt: nowIso,
      });

      const sendTasks: Array<
        Promise<{ kind: "admin" | "prospect"; res: { sent: boolean; error: string | null } }>
      > = [
        dispatchResendEmail(adminMail, env, fetchImpl, sendEmail).then((res) => ({
          kind: "admin",
          res,
        })),
      ];

      if (signingKey) {
        const token = await createUnsubscribeToken(
          { slug, email: rawEmail },
          signingKey,
          { nowSeconds: Math.floor(currentDate.getTime() / 1000) }
        );
        const unsubscribeUrl = buildUnsubscribeUrl(token, rootDomain);
        const unsubscribeHeaders = buildUnsubscribeHeaders(unsubscribeUrl);

        const prospectMail = buildProspectReceiptMail({
          to: rawEmail,
          name,
          rubro,
          unsubscribeUrl,
          headers: unsubscribeHeaders,
        });

        sendTasks.push(
          dispatchResendEmail(prospectMail, env, fetchImpl, sendEmail).then((res) => ({
            kind: "prospect",
            res,
          }))
        );
      }

      const settled = await Promise.allSettled(sendTasks);
      for (const item of settled) {
        if (item.status === "fulfilled") {
          if (item.value.kind === "admin") adminNotifyResult = item.value.res;
          if (item.value.kind === "prospect") prospectNotifyResult = item.value.res;
        }
      }

      if (prospectNotifyResult.sent && typeof db.from("leads").update === "function") {
        const updatedMetadata: LeadComplianceMetadata = {
          ...metadata,
          email_marketing: {
            ...metadata.email_marketing,
            welcome_sent_at: nowIso,
            provider_last: "resend",
          },
        };
        try {
          await db.from("leads").update!({ metadata: updatedMetadata }).eq("slug", slug);
        } catch {
          // Best-effort sin bloquear la confirmación al visitante
        }
      }
    }

    if (isJsonRequest) {
      return new Response(
        JSON.stringify({
          ok: true,
          slug,
          redirect: "/solicitud-enviada/",
          notifications: {
            admin_sent: adminNotifyResult.sent,
            prospect_sent: prospectNotifyResult.sent,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${url.origin}/solicitud-enviada/`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error en endpoint /api/v1/bow-system/create:", error);
    return errorResponse(500, "Ocurrió un error al procesar tu solicitud. Intentá nuevamente.");
  }
};
