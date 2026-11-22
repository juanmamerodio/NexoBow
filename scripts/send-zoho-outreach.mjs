#!/usr/bin/env node
/**
 * scripts/send-zoho-outreach.mjs
 * Outbound ejecutivo B2B desde Zoho Mail para prospectos Gate 0 con email válido.
 * Soporta envío SMTP TLS configurable por env vars, --dry-run, protección contra
 * duplicados (--force) y persistencia en lead.metadata.email_outreach de Supabase.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHmac } from "node:crypto";
import tls from "node:tls";
import net from "node:net";
import { parse as parseYaml } from "yaml";
import { buildPreviewUrl } from "./sheets-sync.mjs";
import {
  buildUnsubscribeFooterHtml,
  buildUnsubscribeFooterText,
  buildUnsubscribeHeaders,
  buildUnsubscribeUrl,
  DEFAULT_UNSUBSCRIBE_TTL_SECONDS,
  resolveUnsubscribeSecret,
  toBase64Url,
} from "../web/src/lib/unsubscribe-token.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si .env no existe o ya fue cargado
}

export const OFFICIAL_WHATSAPP_NUMBER = "5493489536088";
export const DEFAULT_ZOHO_SMTP_HOST = "smtp.zoho.com";
export const DEFAULT_ZOHO_SMTP_PORT = 465;
export const DEFAULT_ZOHO_FROM_NAME = "Juanma Merodio · NexoBow";

const SIGNAL_DESCRIPTIONS_ES = {
  no_https: "hoy no tiene certificado de seguridad HTTPS (el navegador la marca como 'No es seguro')",
  missing_mobile_viewport: "no está adaptada cómodamente para la pantalla del celular",
  heavy_legacy_stack: "corre sobre una plantilla pesada que demora varios segundos en abrir desde datos móviles",
  missing_whatsapp_or_booking_cta: "no tiene un botón directo a WhatsApp o reserva de turnos visible al instante",
  no_website: "todavía no cuenta con una web propia conectada directo a tus turnos",
  social_or_directory_only: "depende únicamente de redes sociales o directorios externos donde el paciente se distrae",
};

function isValidEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || clean.length > 160) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$/i.test(clean);
}

export function sanitizeSmtpHeaderValue(value = "") {
  return String(value ?? "")
    .replace(/[\r\n\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLeadUnsubscribed(lead = {}) {
  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const emailMarketing =
    (meta.email_marketing && typeof meta.email_marketing === "object"
      ? meta.email_marketing
      : null) ||
    (lead.email_marketing && typeof lead.email_marketing === "object"
      ? lead.email_marketing
      : {});
  return Boolean(
    lead.unsubscribed === true ||
      meta.unsubscribed === true ||
      emailMarketing.unsubscribed === true
  );
}

export function createUnsubscribeTokenSync(input = {}, secret = "", options = {}) {
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET requerido para firmar el enlace de baja.");
  }
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_UNSUBSCRIBE_TTL_SECONDS;
  const exp =
    typeof input.exp === "number" && Number.isFinite(input.exp)
      ? Math.floor(input.exp)
      : nowSeconds + ttlSeconds;

  const canonicalPayload = {
    slug: String(input.slug || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    exp,
  };
  const payloadB64 = toBase64Url(Buffer.from(JSON.stringify(canonicalPayload), "utf8"));
  const sigBytes = new Uint8Array(
    createHmac("sha256", secret).update(payloadB64, "utf8").digest()
  );
  return `${payloadB64}.${toBase64Url(sigBytes)}`;
}

function escapeHtml(text = "") {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveLeadField(lead = {}, key, fallback = null) {
  if (lead[key] !== undefined && lead[key] !== null && lead[key] !== "") {
    return lead[key];
  }
  if (lead.metadata && typeof lead.metadata === "object") {
    const metaVal = lead.metadata[key];
    if (metaVal !== undefined && metaVal !== null && metaVal !== "") {
      return metaVal;
    }
  }
  return fallback;
}

function resolvePlaceNoun(rubro = "") {
  const lower = String(rubro || "").toLowerCase();
  if (lower.includes("abog") || lower.includes("jurid") || lower.includes("legal")) {
    return "tu estudio jurídico";
  }
  if (lower.includes("clin") || lower.includes("centro")) {
    return "tu clínica";
  }
  if (lower.includes("consultor") || lower.includes("corporat")) {
    return "tu consultora";
  }
  return "tu consultorio";
}

function buildBucketDiagnosis(lead = {}) {
  const bucketRaw = String(
    resolveLeadField(lead, "website_bucket", resolveLeadField(lead, "websiteBucket", "cubeta_a"))
  ).toLowerCase();
  const bucket = bucketRaw === "cubeta_b" ? "cubeta_b" : "cubeta_a";
  const websiteUrl = resolveLeadField(lead, "website_url", resolveLeadField(lead, "websiteUrl", ""));
  const audit = resolveLeadField(lead, "website_audit", resolveLeadField(lead, "websiteAudit", {})) || {};
  const signals = Array.isArray(audit.signals) ? audit.signals : [];

  if (bucket === "cubeta_b") {
    const mappedSignals = signals
      .map((sig) => SIGNAL_DESCRIPTIONS_ES[sig])
      .filter(Boolean);
    const findingText =
      mappedSignals.length > 0
        ? `Diagnóstico Cubeta B sobre tu web actual${websiteUrl ? ` (${websiteUrl})` : ""}: detectamos que ${mappedSignals.join(" y ")}. Eso hace que muchos pacientes cierren la pestaña antes de escribirte.`
        : `Diagnóstico Cubeta B sobre tu web actual${websiteUrl ? ` (${websiteUrl})` : ""}: hoy no tiene un flujo directo hacia WhatsApp y turnos automáticos, lo que frena consultas listas para agendar.`;
    return { bucket, bucketLabel: "Cubeta B", findingText };
  }

  const findingText =
    "Diagnóstico Cubeta A: tenés muy buena reputación en Google Maps pero sin web propia (solo redes o directorios), por lo que estás perdiendo consultas de pacientes que buscan en Google y prefieren agendar en 2 toques sin dar vueltas.";
  return { bucket, bucketLabel: "Cubeta A", findingText };
}

/**
 * Seam 1a: Construye asunto, HTML y texto plano B2B en voseo argentino sin palabras gatillo de spam.
 */
export function buildZohoOutreachEmail(lead = {}, options = {}) {
  const rootDomain = options.rootDomain || process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const nombre =
    sanitizeSmtpHeaderValue(lead.nombre || lead.name || lead.displayName || "Colega") || "Colega";
  const slug = String(lead.slug || "").trim();
  const email = String(resolveLeadField(lead, "email", "") || "").trim().toLowerCase();
  const rubro = String(lead.rubro || lead.niche || lead.nicho || "salud").trim();
  const ciudad = String(lead.ciudad || lead.city || "").trim();
  const ratingRaw = resolveLeadField(lead, "rating", null);
  const rating = ratingRaw !== null && Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : null;
  const reviewsRaw = resolveLeadField(
    lead,
    "reviews_count",
    resolveLeadField(lead, "reviewsCount", resolveLeadField(lead, "userRatingCount", 0))
  );
  const reviewsCount = Number.isFinite(Number(reviewsRaw)) ? Number(reviewsRaw) : 0;

  const previewUrl =
    lead.previewUrl ||
    lead.demo_url ||
    (slug ? buildPreviewUrl(slug, rootDomain) : `https://preview.${rootDomain}/`);

  const placeNoun = resolvePlaceNoun(rubro);
  const cityBit = ciudad ? ` en ${ciudad}` : "";
  const mapsSummary = rating
    ? `${rating}★ y ${reviewsCount} reseñas reales en Google Maps`
    : `${reviewsCount > 0 ? `${reviewsCount} reseñas` : "presencia activa"} en Google Maps`;

  const { bucket, bucketLabel, findingText } = buildBucketDiagnosis(lead);
  const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola Juanma, vi el mail y mi preview en ${previewUrl}. Quiero consultar cómo activar el sistema.`
  )}`;

  const subject = sanitizeSmtpHeaderValue(
    rating
      ? `Prototipo privado para ${nombre} (${rating}★ en Google Maps)`
      : `Prototipo privado reservado para ${nombre}`
  );

  const valueAnchor =
    "En la práctica, con solo recuperar 2 consultas por mes que hoy se pierden sin respuesta, el sistema ya se paga solo.";

  const signingKey =
    options.unsubscribeSecret || resolveUnsubscribeSecret(process.env);
  if (!signingKey) {
    throw new Error("UNSUBSCRIBE_SECRET requerido en producción para firmar el enlace de baja.");
  }
  const unsubToken = createUnsubscribeTokenSync(
    { slug: slug || email, email },
    signingKey
  );
  const unsubscribeUrl = buildUnsubscribeUrl(unsubToken, rootDomain);
  const headers = buildUnsubscribeHeaders(unsubscribeUrl);

  const text = [
    `Hola ${nombre},`,
    "",
    `Soy Juanma Merodio de NexoBow. Estuve revisando el perfil público de ${placeNoun}${cityBit} (hoy con ${mapsSummary}) y te armé un prototipo privado listo para probar:`,
    "",
    `-> Preview reservada por 7 días: ${previewUrl}`,
    "",
    `Qué encontramos en tu auditoría (${bucketLabel}):`,
    findingText,
    "",
    `Cómo lo resolvemos para lograr orden de consultas y turnos confirmados:`,
    `- Ordenamos las consultas de Google Maps e Instagram antes de que lleguen a tu agenda.`,
    `- Recordatorios automáticos 24h y 2h antes con lista de espera para cubrir cancelaciones.`,
    `- ${valueAnchor}`,
    "",
    `Tenés esta preview reservada de forma exclusiva durante 7 días para mirar las 4 paletas de diseño y probar el simulador de recepción.`,
    "",
    `Si querés que te cuente en 2 minutos cómo lo activamos con tu dominio propio y fotos reales, respondeme directo a este correo o escribime por WhatsApp al +${OFFICIAL_WHATSAPP_NUMBER} (${waUrl}).`,
    "",
    `Un saludo cordial,`,
    `Juanma Merodio · NexoBow`,
    `WhatsApp directo: https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}`,
    "",
    buildUnsubscribeFooterText(unsubscribeUrl),
  ].join("\n");

  const html = `<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;">
    <p style="margin:0 0 16px;font-size:15px;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;">
      Soy Juanma Merodio de NexoBow. Estuve revisando el perfil público de ${escapeHtml(placeNoun)}${escapeHtml(cityBit)}
      (hoy con <strong>${escapeHtml(mapsSummary)}</strong>) y te armé sin cargo un prototipo interactivo para mostrar cómo convertir esas búsquedas en turnos confirmados.
    </p>

    <div style="margin:20px 0;padding:16px 20px;background-color:#f8fafc;border-left:4px solid #4928c2;border-radius:8px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4928c2;margin-bottom:6px;">
        Auditoría Google Maps · ${escapeHtml(bucketLabel)}
      </div>
      <p style="margin:0;font-size:14px;color:#1f2937;">
        ${escapeHtml(findingText)}
      </p>
    </div>

    <div style="margin:24px 0;text-align:left;">
      <a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background-color:#0b0d12;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
        Ver tu prototipo privado (reservado 7 días) →
      </a>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
        Enlace directo: <a href="${escapeHtml(previewUrl)}" style="color:#4928c2;">${escapeHtml(previewUrl)}</a>
      </p>
    </div>

    <p style="margin:0 0 14px;font-size:15px;">
      El sistema ordena tus consultas con <strong>recordatorios automáticos 24h/2h y lista de espera</strong> para filtrar interesados, confirmar turnos y cubrir cancelaciones sin sumar trabajo administrativo.
      <strong>${escapeHtml(valueAnchor)}</strong>
    </p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;">
      Tenés la preview reservada por <strong>7 días</strong> para probar los estilos y el simulador. Si te sirve evaluarlo para ${escapeHtml(placeNoun)}, podés responderme este mismo correo o escribirme directo por WhatsApp:
    </p>

    <p style="margin:0 0 24px;font-size:14px;">
      WhatsApp directo: <a href="${escapeHtml(waUrl)}" style="color:#4928c2;font-weight:600;">+${OFFICIAL_WHATSAPP_NUMBER}</a>
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="margin:0;font-size:13px;color:#4b5563;">
      <strong>Juanma Merodio</strong> · NexoBow<br />
      Sistemas de Captación y Turnos para Profesionales<br />
      <a href="https://nexobow.site" style="color:#6b7280;text-decoration:none;">nexobow.site</a> · WhatsApp ${OFFICIAL_WHATSAPP_NUMBER}
    </p>
    ${buildUnsubscribeFooterHtml(unsubscribeUrl)}
  </div>
</body>
</html>`;

  return {
    to: email,
    subject,
    html,
    text,
    previewUrl,
    bucket,
    unsubscribeUrl,
    headers,
  };
}

function encodeMimeHeader(value = "") {
  const str = sanitizeSmtpHeaderValue(value);
  if (/^[\x20-\x7e]*$/.test(str)) return str;
  return `=?UTF-8?B?${Buffer.from(str, "utf8").toString("base64")}?=`;
}

export function buildMimeMessage({
  fromEmail,
  fromName,
  to,
  replyTo,
  subject,
  text,
  html,
  messageId,
  headers = {},
}) {
  const boundary = `----=_NexoBow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanFromEmail = sanitizeSmtpHeaderValue(fromEmail);
  const cleanTo = sanitizeSmtpHeaderValue(to);
  const cleanReplyTo = sanitizeSmtpHeaderValue(replyTo || cleanFromEmail);
  const cleanMessageId = sanitizeSmtpHeaderValue(messageId);
  const formattedFrom = fromName
    ? `${encodeMimeHeader(fromName)} <${cleanFromEmail}>`
    : cleanFromEmail;

  const extraHeaderLines = [];
  for (const [k, v] of Object.entries(headers || {})) {
    const cleanKey = sanitizeSmtpHeaderValue(k).replace(/[:\s]+/g, "");
    const cleanVal = sanitizeSmtpHeaderValue(v);
    if (cleanKey && cleanVal && /^[A-Za-z0-9-]+$/.test(cleanKey)) {
      extraHeaderLines.push(`${cleanKey}: ${cleanVal}`);
    }
  }

  const lines = [
    `From: ${formattedFrom}`,
    `To: ${cleanTo}`,
    `Reply-To: ${cleanReplyTo}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${cleanMessageId}`,
    ...extraHeaderLines,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    ...(Buffer.from(text, "utf8").toString("base64").match(/.{1,76}/g) || [""]),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    ...(Buffer.from(html, "utf8").toString("base64").match(/.{1,76}/g) || [""]),
    ``,
    `--${boundary}--`,
    ``,
  ];

  // Dot-stuffing según RFC 5321
  return lines
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function createSmtpResponseReader(socket, timeoutMs = 15000) {
  let buffer = "";
  const waiters = [];

  const cleanup = () => {
    socket.removeListener("data", onData);
    socket.removeListener("error", onError);
    socket.removeListener("close", onClose);
  };

  const failAll = (err) => {
    cleanup();
    while (waiters.length > 0) {
      const w = waiters.shift();
      clearTimeout(w.timer);
      w.reject(err);
    }
  };

  const tryFlush = () => {
    while (waiters.length > 0) {
      const lines = buffer.split("\r\n");
      // Necesitamos al menos una línea completa (terminada en \r\n) que no tenga '-' en el índice 3
      let completeEndIdx = -1;
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (/^\d{3} /.test(line)) {
          completeEndIdx = i;
          break;
        }
      }
      if (completeEndIdx === -1) break;

      const matched = lines.slice(0, completeEndIdx + 1).join("\r\n");
      buffer = lines.slice(completeEndIdx + 1).join("\r\n");
      const code = Number(matched.slice(0, 3));
      const waiter = waiters.shift();
      clearTimeout(waiter.timer);
      waiter.resolve({ code, text: matched });
    }
  };

  const onData = (chunk) => {
    buffer += chunk.toString("utf8");
    tryFlush();
  };
  const onError = (err) => failAll(err);
  const onClose = () => {
    if (waiters.length > 0) {
      failAll(new Error("Conexión SMTP cerrada inesperadamente"));
    }
  };

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  const readReply = () =>
    new Promise((resolveReply, rejectReply) => {
      const timer = setTimeout(() => {
        const idx = waiters.findIndex((w) => w.resolve === resolveReply);
        if (idx !== -1) waiters.splice(idx, 1);
        rejectReply(new Error("Timeout esperando respuesta del servidor SMTP Zoho"));
      }, timeoutMs);
      waiters.push({ resolve: resolveReply, reject: rejectReply, timer });
      tryFlush();
    });

  const sendCmd = async (cmd, expectedCodes) => {
    const safeCmd = String(cmd || "");
    if (/[\r\n]/.test(safeCmd)) {
      throw new Error("Comando SMTP inválido (salto CRLF detectado).");
    }
    socket.write(`${safeCmd}\r\n`);
    const reply = await readReply();
    if (!expectedCodes.includes(reply.code)) {
      throw new Error(`SMTP error (${reply.code}): ${reply.text}`);
    }
    return reply;
  };

  return { readReply, sendCmd, cleanup };
}

/**
 * Crea un transporte SMTP TLS nativo (sin dependencias externas) configurado por variables de entorno Zoho.
 */
export function createZohoSmtpTransport(config = {}) {
  const host = config.host || process.env.ZOHO_SMTP_HOST || DEFAULT_ZOHO_SMTP_HOST;
  const port = Number(config.port || process.env.ZOHO_SMTP_PORT || DEFAULT_ZOHO_SMTP_PORT);
  const user = config.user || process.env.ZOHO_SMTP_USER || "";
  const pass = config.pass || process.env.ZOHO_SMTP_PASS || "";
  const fromName = config.fromName || process.env.ZOHO_FROM_NAME || DEFAULT_ZOHO_FROM_NAME;
  const timeoutMs = Number(config.timeoutMs || 15000);

  return {
    config: { host, port, user, fromName },
    async sendMail({ to, subject, html, text, replyTo, headers = {} }) {
      if (!user || !pass) {
        throw new Error(
          "Faltan credenciales Zoho Mail (ZOHO_SMTP_USER / ZOHO_SMTP_PASS) en el entorno."
        );
      }

      const cleanUser = sanitizeSmtpHeaderValue(user);
      const cleanFromName = sanitizeSmtpHeaderValue(fromName);
      const cleanTo = sanitizeSmtpHeaderValue(to);
      if (!isValidEmail(cleanTo)) {
        throw new Error("Destinatario SMTP inválido.");
      }
      const cleanReplyTo = sanitizeSmtpHeaderValue(replyTo || cleanUser);
      const cleanSubject = sanitizeSmtpHeaderValue(subject);
      const domain = cleanUser.includes("@") ? cleanUser.split("@")[1] : "nexobow.site";
      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2, 10)}@${domain}>`;
      const mimeBody = buildMimeMessage({
        fromEmail: cleanUser,
        fromName: cleanFromName,
        to: cleanTo,
        replyTo: cleanReplyTo,
        subject: cleanSubject,
        text,
        html,
        messageId,
        headers,
      });

      let socket =
        port === 465
          ? tls.connect({ host, port, servername: host })
          : net.connect({ host, port });

      await new Promise((resolveConn, rejectConn) => {
        const onErr = (err) => rejectConn(err);
        socket.once("error", onErr);
        const readyEvent = port === 465 ? "secureConnect" : "connect";
        socket.once(readyEvent, () => {
          socket.removeListener("error", onErr);
          resolveConn();
        });
      });

      let reader = createSmtpResponseReader(socket, timeoutMs);
      try {
        const greeting = await reader.readReply();
        if (greeting.code !== 220) {
          throw new Error(`SMTP greeting inesperado (${greeting.code}): ${greeting.text}`);
        }

        await reader.sendCmd(`EHLO ${domain}`, [250]);

        if (port !== 465) {
          await reader.sendCmd("STARTTLS", [220]);
          reader.cleanup();
          socket = tls.connect({ socket, servername: host });
          await new Promise((resolveTls, rejectTls) => {
            socket.once("error", rejectTls);
            socket.once("secureConnect", resolveTls);
          });
          reader = createSmtpResponseReader(socket, timeoutMs);
          await reader.sendCmd(`EHLO ${domain}`, [250]);
        }

        await reader.sendCmd("AUTH LOGIN", [334]);
        await reader.sendCmd(Buffer.from(user, "utf8").toString("base64"), [334]);
        await reader.sendCmd(Buffer.from(pass, "utf8").toString("base64"), [235]);
        await reader.sendCmd(`MAIL FROM:<${sanitizeSmtpHeaderValue(user)}>`, [250]);
        await reader.sendCmd(`RCPT TO:<${cleanTo}>`, [250, 251]);
        await reader.sendCmd("DATA", [354]);

        socket.write(`${mimeBody}\r\n.\r\n`);
        const dataReply = await reader.readReply();
        if (dataReply.code !== 250) {
          throw new Error(`SMTP DATA rechazado (${dataReply.code}): ${dataReply.text}`);
        }

        try {
          await reader.sendCmd("QUIT", [221, 250]);
        } catch {
          // Ignorar cierre limpio tras envío confirmado
        }

        return {
          messageId,
          response: dataReply.text,
        };
      } finally {
        reader.cleanup();
        socket.end();
      }
    },
  };
}

async function persistEmailOutreachToSupabase(supabaseClient, lead, emailOutreach) {
  if (!supabaseClient || typeof supabaseClient.from !== "function") return;
  const slug = String(lead.slug || "").trim();
  const nextMetadata = {
    ...(lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {}),
    email_outreach: emailOutreach,
  };

  try {
    const table = supabaseClient.from("leads");
    if (!table || typeof table.update !== "function") return;
    const updater = table.update({ metadata: nextMetadata });
    if (slug) {
      await updater.eq("slug", slug);
    } else if (lead.id !== undefined && lead.id !== null) {
      await updater.eq("id", lead.id);
    }
  } catch {
    // No abortar flujo por fallo secundario de persistencia si fue invocado en best-effort
  }
}

/**
 * Seam 1b: Ejecuta el envío de correo Zoho para un prospecto con control de duplicados,
 * skip limpio sin email, soporte --dry-run y registro completo en metadata.email_outreach.
 */
export async function sendZohoOutreachEmail(lead = {}, options = {}) {
  const {
    dryRun = false,
    force = false,
    transport = null,
    smtpConfig = {},
    supabaseClient = null,
    now = () => new Date(),
  } = options;

  const rawEmail = String(resolveLeadField(lead, "email", "") || "").trim().toLowerCase();
  const currentMeta =
    lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const existingOutreach = currentMeta.email_outreach || lead.email_outreach || null;

  if (isLeadUnsubscribed(lead)) {
    const emailOutreach = {
      ...(existingOutreach && typeof existingOutreach === "object" ? existingOutreach : {}),
      status: "skipped_unsubscribed",
      provider: "zoho_mail",
      error: null,
    };
    const updatedLead = {
      ...lead,
      metadata: { ...currentMeta, email_outreach: emailOutreach },
    };
    return {
      ok: true,
      skipped: true,
      duplicate: false,
      status: "skipped_unsubscribed",
      emailOutreach,
      lead: updatedLead,
    };
  }

  if (!isValidEmail(rawEmail)) {
    const emailOutreach = {
      status: "skipped_no_email",
      provider: "zoho_mail",
      sent_at: null,
      message_id: null,
      subject: null,
      error: null,
    };
    const updatedLead = {
      ...lead,
      metadata: { ...currentMeta, email_outreach: emailOutreach },
    };
    await persistEmailOutreachToSupabase(supabaseClient, updatedLead, emailOutreach);
    return {
      ok: true,
      skipped: true,
      duplicate: false,
      status: "skipped_no_email",
      emailOutreach,
      lead: updatedLead,
    };
  }

  if (existingOutreach && existingOutreach.status === "sent" && !force) {
    return {
      ok: true,
      skipped: true,
      duplicate: true,
      status: "sent",
      emailOutreach: existingOutreach,
      lead,
    };
  }

  const emailPayload = buildZohoOutreachEmail({ ...lead, email: rawEmail }, options);

  if (dryRun) {
    const emailOutreach = {
      status: "dry_run",
      provider: "zoho_mail",
      sent_at: null,
      message_id: null,
      subject: emailPayload.subject,
      error: null,
    };
    const updatedLead = {
      ...lead,
      metadata: { ...currentMeta, email_outreach: emailOutreach },
    };
    return {
      ok: true,
      skipped: false,
      duplicate: false,
      status: "dry_run",
      emailOutreach,
      email: emailPayload,
      lead: updatedLead,
    };
  }

  const activeTransport = transport || createZohoSmtpTransport(smtpConfig);

  try {
    const smtpRes = await activeTransport.sendMail({
      to: emailPayload.to,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      replyTo: smtpConfig.user || process.env.ZOHO_SMTP_USER || undefined,
      headers: emailPayload.headers,
    });

    const sentAt = (typeof now === "function" ? now() : new Date()).toISOString();
    const emailOutreach = {
      status: "sent",
      provider: "zoho_mail",
      sent_at: sentAt,
      message_id: smtpRes?.messageId || null,
      subject: emailPayload.subject,
      error: null,
    };
    const updatedLead = {
      ...lead,
      metadata: { ...currentMeta, email_outreach: emailOutreach },
    };
    await persistEmailOutreachToSupabase(supabaseClient, updatedLead, emailOutreach);

    return {
      ok: true,
      skipped: false,
      duplicate: false,
      status: "sent",
      emailOutreach,
      email: emailPayload,
      lead: updatedLead,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const emailOutreach = {
      status: "error",
      provider: "zoho_mail",
      sent_at: null,
      message_id: null,
      subject: emailPayload.subject,
      error: errorMessage,
    };
    const updatedLead = {
      ...lead,
      metadata: { ...currentMeta, email_outreach: emailOutreach },
    };
    await persistEmailOutreachToSupabase(supabaseClient, updatedLead, emailOutreach);

    return {
      ok: false,
      skipped: false,
      duplicate: false,
      status: "error",
      emailOutreach,
      email: emailPayload,
      lead: updatedLead,
    };
  }
}

/**
 * Envía en secuencia controlada un lote de hasta 10 leads (o lista provista).
 */
export async function sendZohoOutreachBatch(leads = [], options = {}) {
  const {
    delayMs = options.transport || options.dryRun ? 0 : 1200,
    ...singleOptions
  } = options;

  const results = [];
  let sent = 0;
  let skippedNoEmail = 0;
  let skippedUnsubscribed = 0;
  let duplicates = 0;
  let dryRunCount = 0;
  let errors = 0;

  for (let i = 0; i < leads.length; i++) {
    const res = await sendZohoOutreachEmail(leads[i], singleOptions);
    results.push(res);

    if (res.duplicate) duplicates++;
    else if (res.status === "sent") sent++;
    else if (res.status === "skipped_unsubscribed") skippedUnsubscribed++;
    else if (res.status === "skipped_no_email") skippedNoEmail++;
    else if (res.status === "dry_run") dryRunCount++;
    else if (res.status === "error") errors++;

    if (delayMs > 0 && i < leads.length - 1 && !res.skipped && !options.dryRun) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return {
    total: leads.length,
    sent,
    skippedNoEmail,
    skippedUnsubscribed,
    duplicates,
    dryRun: dryRunCount,
    errors,
    results,
  };
}

function loadLeadFromFiche(fichePath) {
  const raw = readFileSync(fichePath, "utf8");
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    throw new Error(`Frontmatter YAML no encontrado en ${fichePath}`);
  }
  return parseYaml(fmMatch[1]) || {};
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--slug" && argv[i + 1]) {
      flags.slug = argv[++i];
    } else if (arg === "--fiche" && argv[i + 1]) {
      flags.fiche = argv[++i];
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--force") {
      flags.force = true;
    } else if (arg === "--json") {
      flags.json = true;
    } else if (arg === "--all-pending") {
      flags.allPending = true;
    }
  }
  return flags;
}

async function main() {
  const flags = parseCliArgs();

  let supabaseClient = null;
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  let targetLeads = [];
  if (flags.fiche) {
    const absFiche = resolve(process.cwd(), flags.fiche);
    targetLeads.push(loadLeadFromFiche(absFiche));
  } else if (flags.slug) {
    const localFiche = join(REPO_ROOT, "clients", `${flags.slug}.md`);
    let leadObj = existsSync(localFiche) ? loadLeadFromFiche(localFiche) : { slug: flags.slug };
    if (supabaseClient) {
      const { data } = await supabaseClient
        .from("leads")
        .select("*")
        .eq("slug", flags.slug)
        .maybeSingle();
      if (data) {
        leadObj = {
          ...leadObj,
          ...data,
          email: data.metadata?.email || leadObj.email || null,
        };
      }
    }
    targetLeads.push(leadObj);
  } else if (flags.allPending && supabaseClient) {
    const { data, error } = await supabaseClient
      .from("leads")
      .select("*")
      .order("id", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    targetLeads = (data || []).filter((l) => l.metadata?.email);
  } else {
    console.error(
      `\x1b[31m[send-zoho-outreach ERROR]\x1b[0m Indicá --slug <slug>, --fiche <ruta.md> o --all-pending [--dry-run] [--force]`
    );
    process.exit(2);
  }

  const batchResult = await sendZohoOutreachBatch(targetLeads, {
    dryRun: Boolean(flags.dryRun),
    force: Boolean(flags.force),
    supabaseClient,
  });

  if (flags.json) {
    console.log(JSON.stringify(batchResult, null, 2));
    return;
  }

  console.log(`\n\x1b[36m[send-zoho-outreach]\x1b[0m Procesados: ${batchResult.total} | Enviados: ${batchResult.sent} | Dry-Run: ${batchResult.dryRun} | Sin Email: ${batchResult.skippedNoEmail} | Duplicados: ${batchResult.duplicates} | Errores: ${batchResult.errors}`);
  for (const r of batchResult.results) {
    const slugLabel = r.lead?.slug || r.lead?.name || "lead";
    console.log(` - ${slugLabel}: status=${r.status}${r.emailOutreach?.message_id ? ` (${r.emailOutreach.message_id})` : ""}${r.emailOutreach?.error ? ` -> ${r.emailOutreach.error}` : ""}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\x1b[31m[send-zoho-outreach ERROR]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
