// web/functions/api/v1/email/send-preview.ts — Cloudflare Pages Function
// Despacha desde /admin/crm la entrega oficial de preview terminada o recordatorio vía Resend respetando unsubscribed y RFC 8058

import {
  buildUnsubscribeFooterHtml,
  buildUnsubscribeFooterText,
  buildUnsubscribeHeaders,
  buildUnsubscribeUrl,
  constantTimeEqual,
  createUnsubscribeToken,
  resolveUnsubscribeSecret,
} from "../../../../src/lib/unsubscribe-token.ts";

export interface SendPreviewEnv {
  PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_OWNER_EMAIL?: string;
  ADMIN_API_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  UNSUBSCRIBE_SECRET?: string;
  NEXOBOW_ROOT_DOMAIN?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  CF_PAGES?: string;
}

export interface PreviewLeadRow {
  id: number | string;
  slug: string;
  name?: string;
  niche?: string;
  demo_url?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SendPreviewSupabaseClient {
  from(table: string): {
    select(columns?: string): {
      eq(
        column: string,
        value: string | number
      ): {
        maybeSingle(): Promise<{ data: PreviewLeadRow | null; error: { message: string } | null }>;
      };
    };
    update(patch: Record<string, unknown>): {
      eq(
        column: string,
        value: string | number
      ): Promise<{ data: PreviewLeadRow[] | null; error: { message: string } | null }>;
    };
  };
}

export interface OutboundPreviewMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export interface SendPreviewContext {
  request: Request;
  env?: SendPreviewEnv;
  supabaseClient?: SendPreviewSupabaseClient;
  fetchImpl?: typeof fetch;
  sendEmail?: (mail: OutboundPreviewMail) => Promise<{ ok?: boolean; id?: string } | unknown>;
  verifyAdmin?: (
    bearerToken: string,
    env: SendPreviewEnv
  ) => Promise<{ ok: boolean; email?: string; status?: number }>;
  now?: () => Date;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(raw: string): boolean {
  const clean = String(raw || "").trim().toLowerCase();
  if (!clean || clean.length > 160) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$/i.test(clean);
}

export const MAX_SEND_PREVIEW_BODY_BYTES = 4 * 1024;
const textEncoder = new TextEncoder();

function safeEqualKey(a: string, b: string): boolean {
  if (!a || !b) return false;
  return constantTimeEqual(textEncoder.encode(a), textEncoder.encode(b));
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

function sanitizeSingleLine(text: string, maxLen = 180): string {
  return String(text || "")
    .replace(/[\r\n\u0000-\u001f\u007f]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function jsonNoStore(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function buildRestSupabaseAdapter(
  supabaseUrl: string,
  supabaseKey: string,
  fetchFn: typeof fetch
): SendPreviewSupabaseClient {
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
            eq(column: string, value: string | number) {
              return {
                async maybeSingle() {
                  const queryUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(columns)}&${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}&limit=1`;
                  const res = await fetchFn(queryUrl, { method: "GET", headers });
                  if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    return { data: null, error: { message: `HTTP ${res.status}: ${txt}` } };
                  }
                  const rows = (await res.json()) as PreviewLeadRow[];
                  return {
                    data: Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
                    error: null,
                  };
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
                  ...headers,
                  Prefer: "return=representation",
                },
                body: JSON.stringify(patch),
              });
              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                return { data: null, error: { message: `HTTP ${res.status}: ${txt}` } };
              }
              const updated = (await res.json().catch(() => [])) as PreviewLeadRow[];
              return { data: updated, error: null };
            },
          };
        },
      };
    },
  };
}

async function authorizeAdminRequest(
  request: Request,
  env: SendPreviewEnv,
  fetchFn: typeof fetch,
  customVerifier?: SendPreviewContext["verifyAdmin"]
): Promise<{ authorized: boolean; status: number; error?: string }> {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = match?.[1]?.trim() || "";

  if (!bearerToken) {
    return { authorized: false, status: 401, error: "Autorización requerida." };
  }

  if (typeof customVerifier === "function") {
    const verified = await customVerifier(bearerToken, env);
    if (verified?.ok) {
      return { authorized: true, status: 200 };
    }
    return {
      authorized: false,
      status: verified?.status || 403,
      error: "Acceso denegado.",
    };
  }

  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const adminKey = (env.ADMIN_API_SECRET || "").trim();
  if ((serviceKey && safeEqualKey(bearerToken, serviceKey)) || (adminKey && safeEqualKey(bearerToken, adminKey))) {
    return { authorized: true, status: 200 };
  }

  const supabaseUrl = (env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const anonKey = (env.PUBLIC_SUPABASE_ANON_KEY || serviceKey).trim();
  const ownerEmail = (env.ADMIN_OWNER_EMAIL || "juanma@nexobow.site").trim().toLowerCase();

  if (!supabaseUrl || !anonKey) {
    return { authorized: false, status: 401, error: "No se pudo validar la sesión." };
  }

  try {
    const userRes = await fetchFn(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (!userRes.ok) {
      return { authorized: false, status: 401, error: "Sesión inválida o expirada." };
    }
    const userData = (await userRes.json()) as { email?: string };
    const userEmail = String(userData?.email || "").trim().toLowerCase();
    if (!userEmail || userEmail !== ownerEmail) {
      return { authorized: false, status: 403, error: "Acceso exclusivo del propietario." };
    }
    return { authorized: true, status: 200 };
  } catch {
    return { authorized: false, status: 401, error: "Error verificando sesión administrativa." };
  }
}

export function buildPreviewDeliveryEmail(params: {
  to: string;
  name: string;
  previewUrl: string;
  stage: "preview_delivered" | "ttl_reminder";
  unsubscribeUrl: string;
  headers: Record<string, string>;
}): OutboundPreviewMail {
  const { to, name, previewUrl, stage, unsubscribeUrl, headers } = params;
  const cleanName = sanitizeSingleLine(String(name || "Colega"), 120) || "Colega";
  const safePreviewUrl = sanitizeSafeHttpUrl(previewUrl, "https://nexobow.site/");

  if (stage === "ttl_reminder") {
    const subject = sanitizeSingleLine(`Te quedan 3 días para revisar tu muestra web | NexoBow`, 180);
    const text = [
      `Hola ${cleanName},`,
      ``,
      `Te escribo para recordarte con calma que tu muestra interactiva de NexoBow vence en 3 días (${safePreviewUrl}).`,
      `Después de los 7 días la damos de baja del servidor temporal para liberar espacio.`,
      ``,
      `Si querés que la dejemos online con tu dominio propio o probar algún ajuste de texto o colores, respondeme este correo o escribime por WhatsApp al +54 9 3489 53-6088.`,
      ``,
      `Un saludo,`,
      `Juanma Merodio · NexoBow`,
      ``,
      buildUnsubscribeFooterText(unsubscribeUrl),
    ].join("\n");

    const html = `<!doctype html>
<html lang="es-AR">
<body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:30px;">
    <p style="margin:0 0 14px;font-size:15px;">Hola <strong>${escapeHtml(cleanName)}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;">
      Te recordamos que tu muestra web en NexoBow sigue disponible y en <strong>3 días</strong> se archiva del servidor temporal.
    </p>
    <div style="margin:20px 0;">
      <a href="${escapeHtml(safePreviewUrl)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#0b0d12;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
        Abrir mi muestra interactiva →
      </a>
    </div>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      Si te sirvió y querés pasarla a tu dominio o sumar ajustes, respondeme este mail o escribime por
      <a href="https://wa.me/5493489536088" style="color:#4928c2;font-weight:600;">WhatsApp (+54 9 3489 53-6088)</a>.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="margin:0;font-size:13px;color:#4b5563;"><strong>Juanma Merodio</strong> · NexoBow</p>
    ${buildUnsubscribeFooterHtml(unsubscribeUrl)}
  </div>
</body>
</html>`;

    return { to, subject, html, text, headers };
  }

  const subject = `Tu muestra interactiva de NexoBow ya está lista`;
  const text = [
    `Hola ${cleanName},`,
    ``,
    `Ya compilamos y subimos tu muestra interactiva de NexoBow:`,
    `-> ${safePreviewUrl}`,
    ``,
    `Qué podés probar ahora desde el celular o la computadora:`,
    `- El botón flotante abajo a la derecha te deja alternar entre 4 estilos de color en tiempo real.`,
    `- Incluye simulador de atención ordenada por WhatsApp y estructura lista para convertir búsquedas en turnos.`,
    `- Queda reservada por 7 días corridos para que la revises sin apuro.`,
    ``,
    `Contame qué estilo te representó mejor respondiendo este correo o por WhatsApp: https://wa.me/5493489536088`,
    ``,
    `Un saludo cordial,`,
    `Juanma Merodio · NexoBow`,
    ``,
    buildUnsubscribeFooterText(unsubscribeUrl),
  ].join("\n");

  const html = `<!doctype html>
<html lang="es-AR">
<body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:30px;">
    <p style="margin:0 0 14px;font-size:15px;">Hola <strong>${escapeHtml(cleanName)}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;">
      <strong>Tu muestra interactiva de NexoBow ya está lista</strong> para que la pruebes desde el celular o la computadora.
    </p>
    <div style="margin:22px 0;">
      <a href="${escapeHtml(safePreviewUrl)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#0b0d12;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
        Ver mi muestra interactiva (7 días) →
      </a>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
        Enlace directo: <a href="${escapeHtml(safePreviewUrl)}" style="color:#4928c2;">${escapeHtml(safePreviewUrl)}</a>
      </p>
    </div>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:14px;color:#374151;">
      <li>Podés cambiar entre <strong>4 combinaciones de color</strong> en vivo desde el selector inferior derecho.</li>
      <li>Incluye un simulador práctico de atención y derivación a turnos por WhatsApp.</li>
      <li>Tenés la muestra reservada durante <strong>7 días corridos</strong> sin cargo ni compromiso.</li>
    </ul>
    <p style="margin:0 0 18px;font-size:14px;color:#374151;">
      Cuando la veas, contame cuál versión te gustó más respondiendo este correo o escribiéndome por
      <a href="https://wa.me/5493489536088" style="color:#4928c2;font-weight:600;">WhatsApp (+54 9 3489 53-6088)</a>.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="margin:0;font-size:13px;color:#4b5563;"><strong>Juanma Merodio</strong> · NexoBow</p>
    ${buildUnsubscribeFooterHtml(unsubscribeUrl)}
  </div>
</body>
</html>`;

  return { to, subject, html, text, headers };
}

export const onRequestPost = async (context: SendPreviewContext): Promise<Response> => {
  const {
    request,
    env = {},
    supabaseClient,
    fetchImpl = globalThis.fetch,
    sendEmail,
    verifyAdmin,
    now = () => new Date(),
  } = context;

  const authCheck = await authorizeAdminRequest(request, env, fetchImpl, verifyAdmin);
  if (!authCheck.authorized) {
    return jsonNoStore({ ok: false, error: authCheck.error || "No autorizado." }, authCheck.status);
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (textEncoder.encode(raw).byteLength > MAX_SEND_PREVIEW_BODY_BYTES) {
      return jsonNoStore(
        { ok: false, error: "Payload excede el tamaño máximo permitido (4 KB)." },
        413
      );
    }
    if (raw.trim()) {
      const parsed: unknown = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return jsonNoStore({ ok: false, error: "Payload JSON inválido." }, 400);
      }
      body = parsed;
    }
  } catch {
    return jsonNoStore({ ok: false, error: "Payload JSON inválido." }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const leadId = body.leadId !== undefined && body.leadId !== null ? body.leadId : null;
  const stage: "preview_delivered" | "ttl_reminder" =
    body.stage === "ttl_reminder" ? "ttl_reminder" : "preview_delivered";

  if (!slug && leadId === null) {
    return jsonNoStore({ ok: false, error: "Se requiere slug o leadId." }, 400);
  }

  let db = supabaseClient;
  if (!db) {
    const supabaseUrl = (env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
    const supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!supabaseUrl || !supabaseKey) {
      return jsonNoStore({ ok: false, error: "Supabase no configurado." }, 503);
    }
    db = buildRestSupabaseAdapter(supabaseUrl, supabaseKey, fetchImpl);
  }

  const queryCol = slug ? "slug" : "id";
  const queryVal = slug ? slug : (leadId as string | number);
  const { data: lead, error: selectError } = await db
    .from("leads")
    .select("*")
    .eq(queryCol, queryVal)
    .maybeSingle();

  if (selectError) {
    return jsonNoStore({ ok: false, error: "Error consultando el lead en Supabase." }, 500);
  }
  if (!lead) {
    return jsonNoStore({ ok: false, error: "Lead no encontrado." }, 404);
  }

  const currentMeta = isPlainObject(lead.metadata) ? lead.metadata : {};
  const currentEmailMarketing = isPlainObject(currentMeta.email_marketing)
    ? currentMeta.email_marketing
    : {};

  const recipientEmail = String(currentMeta.email || (lead as Record<string, unknown>).email || "")
    .trim()
    .toLowerCase();

  if (!isValidEmail(recipientEmail)) {
    return jsonNoStore(
      { ok: true, skipped: true, status: "skipped_no_email", slug: lead.slug },
      200
    );
  }

  const isLeadUnsubscribed =
    (lead as Record<string, unknown>).unsubscribed === true ||
    currentMeta.unsubscribed === true ||
    currentEmailMarketing.unsubscribed === true;

  if (isLeadUnsubscribed) {
    return jsonNoStore(
      { ok: true, skipped: true, status: "skipped_unsubscribed", slug: lead.slug },
      200
    );
  }

  const signingKey = resolveUnsubscribeSecret(env as Record<string, string | undefined>);
  if (!signingKey) {
    return jsonNoStore(
      { ok: false, error: "UNSUBSCRIBE_SECRET no configurado en producción." },
      503
    );
  }

  const rootDomain = (env.NEXOBOW_ROOT_DOMAIN || "nexobow.site").trim();
  const defaultPreviewUrl = `https://preview.${rootDomain}/${lead.slug}/`;
  const previewUrl = sanitizeSafeHttpUrl(lead.demo_url, defaultPreviewUrl);
  const currentDate = now();
  const nowIso = currentDate.toISOString();

  const token = await createUnsubscribeToken(
    { slug: lead.slug, email: recipientEmail },
    signingKey,
    { nowSeconds: Math.floor(currentDate.getTime() / 1000) }
  );
  const unsubscribeUrl = buildUnsubscribeUrl(token, rootDomain);
  const unsubscribeHeaders = buildUnsubscribeHeaders(unsubscribeUrl);

  const mailPayload = buildPreviewDeliveryEmail({
    to: recipientEmail,
    name: String(lead.name || "Colega"),
    previewUrl,
    stage,
    unsubscribeUrl,
    headers: unsubscribeHeaders,
  });

  let messageId: string | null = null;
  try {
    if (typeof sendEmail === "function") {
      const customRes = (await sendEmail(mailPayload)) as { id?: string } | null;
      messageId = customRes?.id || null;
    } else if (env.RESEND_API_KEY) {
      const resendRes = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL || "NexoBow <hola@nexobow.site>",
          to: [mailPayload.to],
          subject: mailPayload.subject,
          html: mailPayload.html,
          text: mailPayload.text,
          headers: mailPayload.headers,
        }),
      });
      if (!resendRes.ok) {
        const errTxt = await resendRes.text().catch(() => "");
        return jsonNoStore(
          { ok: false, error: `Error enviando vía Resend (${resendRes.status}): ${errTxt}` },
          502
        );
      }
      const resendJson = (await resendRes.json().catch(() => ({}))) as { id?: string };
      messageId = resendJson?.id || null;
    } else {
      return jsonNoStore({ ok: false, error: "RESEND_API_KEY no configurada." }, 503);
    }
  } catch (err) {
    return jsonNoStore(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      502
    );
  }

  const nextEmailMarketing = {
    ...currentEmailMarketing,
    unsubscribed: false,
    preview_ready_sent_at:
      stage === "preview_delivered"
        ? nowIso
        : (currentEmailMarketing.preview_ready_sent_at ?? null),
    followup_stage: stage,
    provider_last: "resend",
  };

  const nextMetadata = {
    ...currentMeta,
    email_marketing: nextEmailMarketing,
  };

  await db
    .from("leads")
    .update({ metadata: nextMetadata })
    .eq("slug", lead.slug);

  return jsonNoStore(
    {
      ok: true,
      skipped: false,
      status: "sent",
      slug: lead.slug,
      stage,
      email: recipientEmail,
      message_id: messageId,
      email_marketing: nextEmailMarketing,
    },
    200
  );
};
