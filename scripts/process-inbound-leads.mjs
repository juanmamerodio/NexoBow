#!/usr/bin/env node
/**
 * scripts/process-inbound-leads.mjs
 * Orquestador CLI y API para entregas de preview terminada y secuencia de seguimiento
 * (Día 0 welcome, Día 1 preview_delivered, Día 4 ttl_reminder) coordinando Zoho Mail SMTP
 * y Resend API con enlaces de baja HMAC-SHA256 RFC 8058 y bloqueo skipped_unsubscribed.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { buildPreviewUrl } from "./sheets-sync.mjs";
import {
  createUnsubscribeTokenSync,
  createZohoSmtpTransport,
  isLeadUnsubscribed,
  OFFICIAL_WHATSAPP_NUMBER,
  sanitizeSmtpHeaderValue,
} from "./send-zoho-outreach.mjs";
import {
  buildUnsubscribeFooterHtml,
  buildUnsubscribeFooterText,
  buildUnsubscribeHeaders,
  buildUnsubscribeUrl,
  resolveUnsubscribeSecret,
} from "../web/src/lib/unsubscribe-token.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si .env no existe o ya fue cargado
}

function isValidEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || clean.length > 160) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$/i.test(clean);
}

function escapeHtml(text = "") {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveEmailFromLead(lead = {}) {
  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const raw = lead.email ?? meta.email ?? "";
  return String(raw || "").trim().toLowerCase();
}

export function resolveFollowupStage(lead = {}, options = {}) {
  if (options.stage) return options.stage;
  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const em = meta.email_marketing && typeof meta.email_marketing === "object"
    ? meta.email_marketing
    : {};

  const currentStage = em.followup_stage || "none";
  if (currentStage === "none" && !em.welcome_sent_at) {
    return lead.demo_url ? "preview_delivered" : "welcome";
  }
  if (currentStage === "welcome" || !em.preview_ready_sent_at) {
    return "preview_delivered";
  }
  if (currentStage === "preview_delivered" && !em.ttl_reminder_sent_at) {
    const refIso = em.preview_ready_sent_at || lead.created_at || lead.last_activity_at;
    if (refIso) {
      const nowDate = typeof options.now === "function" ? options.now() : new Date();
      const elapsedHours = (nowDate.getTime() - new Date(refIso).getTime()) / (1000 * 60 * 60);
      if (Number.isFinite(elapsedHours) && elapsedHours >= 72) {
        return "ttl_reminder";
      }
    }
  }
  return null;
}

export function buildFollowupEmail(lead = {}, stage = "preview_delivered", options = {}) {
  const rootDomain = options.rootDomain || process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const slug = String(lead.slug || "").trim();
  const email = resolveEmailFromLead(lead);
  const name = String(lead.name || lead.nombre || "Colega").trim();
  const previewUrl =
    lead.demo_url ||
    lead.previewUrl ||
    (slug ? buildPreviewUrl(slug, rootDomain) : `https://preview.${rootDomain}/`);

  const signingKey =
    options.unsubscribeSecret || resolveUnsubscribeSecret(process.env);
  if (!signingKey) {
    throw new Error("UNSUBSCRIBE_SECRET requerido en producción para firmar el enlace de baja.");
  }

  const nowSec = Math.floor(
    (typeof options.now === "function" ? options.now() : new Date()).getTime() / 1000
  );
  const token = createUnsubscribeTokenSync(
    { slug: slug || email, email },
    signingKey,
    { nowSeconds: nowSec }
  );
  const unsubscribeUrl = buildUnsubscribeUrl(token, rootDomain);
  const headers = buildUnsubscribeHeaders(unsubscribeUrl);

  const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola Juanma, vi mi muestra en ${previewUrl} y quiero consultar cómo activarla.`
  )}`;

  if (stage === "welcome") {
    const subject = "Recibimos tu pedido de muestra gratuita | NexoBow";
    const text = [
      `Hola ${name},`,
      "",
      "Confirmamos que recibimos tu solicitud de muestra gratuita en NexoBow. En menos de 24 horas hábiles te enviamos el enlace listo para probar.",
      "",
      `WhatsApp directo: https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}`,
      "",
      buildUnsubscribeFooterText(unsubscribeUrl),
    ].join("\n");
    const html = `<!doctype html><html lang="es-AR"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:30px;"><p style="margin:0 0 14px;">Hola <strong>${escapeHtml(name)}</strong>,</p><p style="margin:0 0 14px;">Confirmamos que recibimos tu pedido de muestra gratuita en NexoBow. En menos de <strong>24 horas hábiles</strong> te enviamos el enlace personalizado con 4 estilos de color.</p><p style="margin:0 0 16px;">WhatsApp directo: <a href="${escapeHtml(waUrl)}" style="color:#4928c2;font-weight:600;">+${OFFICIAL_WHATSAPP_NUMBER}</a></p><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="margin:0;font-size:13px;color:#4b5563;"><strong>Juanma Merodio</strong> · NexoBow</p>${buildUnsubscribeFooterHtml(unsubscribeUrl)}</div></body></html>`;
    return { to: email, subject, html, text, previewUrl, unsubscribeUrl, headers };
  }

  if (stage === "ttl_reminder") {
    const subject = "Te quedan 3 días para revisar tu muestra web | NexoBow";
    const text = [
      `Hola ${name},`,
      "",
      `Te recordamos con tranquilidad que tu muestra web en NexoBow vence en 3 días (${previewUrl}).`,
      "Al cumplirse los 7 días la damos de baja del servidor temporal.",
      "",
      `Si querés activarla con tu dominio propio o ajustar algún texto, respondeme este mail o escribime por WhatsApp: ${waUrl}`,
      "",
      "Un saludo,",
      "Juanma Merodio · NexoBow",
      "",
      buildUnsubscribeFooterText(unsubscribeUrl),
    ].join("\n");
    const html = `<!doctype html><html lang="es-AR"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;line-height:1.6;"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:30px;"><p style="margin:0 0 14px;">Hola <strong>${escapeHtml(name)}</strong>,</p><p style="margin:0 0 14px;">Te recordamos que tu muestra web sigue activa y le quedan <strong>3 días</strong> antes de archivarse del servidor temporal.</p><div style="margin:20px 0;"><a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0b0d12;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">Revisar mi muestra web →</a></div><p style="margin:0 0 16px;font-size:14px;color:#374151;">Si querés activarla o sumar algún cambio, respondeme este correo o escribime por <a href="${escapeHtml(waUrl)}" style="color:#4928c2;font-weight:600;">WhatsApp (+54 9 3489 53-6088)</a>.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="margin:0;font-size:13px;color:#4b5563;"><strong>Juanma Merodio</strong> · NexoBow</p>${buildUnsubscribeFooterHtml(unsubscribeUrl)}</div></body></html>`;
    return { to: email, subject, html, text, previewUrl, unsubscribeUrl, headers };
  }

  // Día 1: entrega formal de preview terminada
  const subject = "Tu muestra interactiva de NexoBow ya está lista";
  const text = [
    `Hola ${name},`,
    "",
    `Ya compilamos y subimos tu muestra interactiva de NexoBow:`,
    `-> ${previewUrl}`,
    "",
    "Podés probar las 4 paletas de color abajo a la derecha y el simulador de recepción por WhatsApp.",
    "Queda reservada durante 7 días corridos para que la evalúes sin compromiso.",
    "",
    `Contame qué versión te gustó más respondiendo este correo o por WhatsApp: ${waUrl}`,
    "",
    "Un saludo cordial,",
    "Juanma Merodio · NexoBow",
    "",
    buildUnsubscribeFooterText(unsubscribeUrl),
  ].join("\n");

  const html = `<!doctype html><html lang="es-AR"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;line-height:1.6;"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:30px;"><p style="margin:0 0 14px;">Hola <strong>${escapeHtml(name)}</strong>,</p><p style="margin:0 0 14px;"><strong>Tu muestra interactiva de NexoBow ya está lista</strong> para que la revises desde el celular o la computadora.</p><div style="margin:22px 0;"><a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0b0d12;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">Ver mi muestra interactiva (7 días) →</a><p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Enlace directo: <a href="${escapeHtml(previewUrl)}" style="color:#4928c2;">${escapeHtml(previewUrl)}</a></p></div><p style="margin:0 0 16px;font-size:14px;color:#374151;">Probá el selector flotante de <strong>4 combinaciones de color</strong> abajo a la derecha. Si querés que avancemos con tu dominio propio y fotos reales, respondeme este mail o escribime por <a href="${escapeHtml(waUrl)}" style="color:#4928c2;font-weight:600;">WhatsApp (+54 9 3489 53-6088)</a>.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="margin:0;font-size:13px;color:#4b5563;"><strong>Juanma Merodio</strong> · NexoBow</p>${buildUnsubscribeFooterHtml(unsubscribeUrl)}</div></body></html>`;

  return { to: email, subject, html, text, previewUrl, unsubscribeUrl, headers };
}

export async function sendViaResend(mailPayload, options = {}) {
  const fetchFn = options.fetchImpl || globalThis.fetch;
  const resendApiKey = options.resendApiKey || process.env.RESEND_API_KEY || "";
  const fromEmail =
    options.resendFromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    "NexoBow <hola@nexobow.site>";

  if (!resendApiKey) {
    throw new Error("Falta RESEND_API_KEY para enviar vía Resend API.");
  }

  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [sanitizeSmtpHeaderValue(mailPayload.to)],
      subject: sanitizeSmtpHeaderValue(mailPayload.subject),
      html: mailPayload.html,
      text: mailPayload.text,
      headers: mailPayload.headers,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend HTTP ${res.status}: ${errText}`);
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data?.id || null };
}

async function persistEmailMarketingToSupabase(supabaseClient, lead, nextMetadata) {
  if (!supabaseClient || typeof supabaseClient.from !== "function") return;
  try {
    const updater = supabaseClient.from("leads").update({ metadata: nextMetadata });
    if (lead.slug) {
      await updater.eq("slug", lead.slug);
    } else if (lead.id !== undefined && lead.id !== null) {
      await updater.eq("id", lead.id);
    }
  } catch {
    // Best-effort en persistencia secundaria
  }
}

export async function dispatchInboundLeadEmail(lead = {}, options = {}) {
  const currentMeta =
    lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const currentEmailMarketing =
    currentMeta.email_marketing && typeof currentMeta.email_marketing === "object"
      ? currentMeta.email_marketing
      : {};

  if (isLeadUnsubscribed(lead)) {
    return {
      ok: true,
      skipped: true,
      status: "skipped_unsubscribed",
      stage: null,
      provider: null,
      lead,
    };
  }

  const email = resolveEmailFromLead(lead);
  if (!isValidEmail(email)) {
    return {
      ok: true,
      skipped: true,
      status: "skipped_no_email",
      stage: null,
      provider: null,
      lead,
    };
  }

  const stage = resolveFollowupStage(lead, options);
  if (!stage) {
    return {
      ok: true,
      skipped: true,
      status: "skipped_no_pending_stage",
      stage: null,
      provider: null,
      lead,
    };
  }

  const provider =
    options.provider || (stage === "preview_delivered" ? "zoho_mail" : "resend");
  const mailPayload = buildFollowupEmail({ ...lead, email }, stage, options);

  if (options.dryRun) {
    return {
      ok: true,
      skipped: false,
      status: "dry_run",
      stage,
      provider,
      email: mailPayload,
      lead,
    };
  }

  const nowIso = (
    typeof options.now === "function" ? options.now() : new Date()
  ).toISOString();

  try {
    let sendRes = { messageId: null };
    if (provider === "zoho_mail") {
      const transport =
        options.zohoTransport || createZohoSmtpTransport(options.smtpConfig || {});
      sendRes = await transport.sendMail({
        to: mailPayload.to,
        subject: mailPayload.subject,
        html: mailPayload.html,
        text: mailPayload.text,
        replyTo:
          options.smtpConfig?.user || process.env.ZOHO_SMTP_USER || undefined,
        headers: mailPayload.headers,
      });
    } else {
      sendRes = await sendViaResend(mailPayload, options);
    }

    const nextEmailMarketing = {
      ...currentEmailMarketing,
      unsubscribed: false,
      followup_stage: stage,
      provider_last: provider,
      welcome_sent_at:
        stage === "welcome" ? nowIso : (currentEmailMarketing.welcome_sent_at ?? null),
      preview_ready_sent_at:
        stage === "preview_delivered"
          ? nowIso
          : (currentEmailMarketing.preview_ready_sent_at ?? null),
      ttl_reminder_sent_at:
        stage === "ttl_reminder"
          ? nowIso
          : (currentEmailMarketing.ttl_reminder_sent_at ?? null),
    };

    const nextMetadata = {
      ...currentMeta,
      email_marketing: nextEmailMarketing,
    };
    const updatedLead = { ...lead, metadata: nextMetadata };
    await persistEmailMarketingToSupabase(options.supabaseClient, updatedLead, nextMetadata);

    return {
      ok: true,
      skipped: false,
      status: "sent",
      stage,
      provider,
      messageId: sendRes?.messageId || null,
      email: mailPayload,
      lead: updatedLead,
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      status: "error",
      stage,
      provider,
      error: err instanceof Error ? err.message : String(err),
      email: mailPayload,
      lead,
    };
  }
}

export async function processInboundLeadsBatch(leads = [], options = {}) {
  const results = [];
  let sent = 0;
  let skippedUnsubscribed = 0;
  let skippedNoEmail = 0;
  let skippedNoStage = 0;
  let dryRun = 0;
  let errors = 0;

  for (const lead of leads) {
    const res = await dispatchInboundLeadEmail(lead, options);
    results.push(res);

    if (res.status === "sent") sent++;
    else if (res.status === "skipped_unsubscribed") skippedUnsubscribed++;
    else if (res.status === "skipped_no_email") skippedNoEmail++;
    else if (res.status === "skipped_no_pending_stage") skippedNoStage++;
    else if (res.status === "dry_run") dryRun++;
    else if (res.status === "error") errors++;
  }

  return {
    total: leads.length,
    sent,
    skippedUnsubscribed,
    skippedNoEmail,
    skippedNoStage,
    dryRun,
    errors,
    results,
  };
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") flags.list = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--json") flags.json = true;
    else if (arg === "--slug" && argv[i + 1]) flags.slug = argv[++i];
    else if (arg === "--stage" && argv[i + 1]) flags.stage = argv[++i];
    else if (arg === "--provider" && argv[i + 1]) flags.provider = argv[++i];
  }
  return flags;
}

function loadLocalFiche(slug) {
  const path = join(REPO_ROOT, "clients", `${slug}.md`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const parsed = parseYaml(fm[1]) || {};
  return {
    id: parsed.id,
    slug: parsed.slug || slug,
    name: parsed.nombre,
    niche: parsed.rubro,
    demo_url: parsed.subdominio ? `https://${String(parsed.subdominio).replace(/^https?:\/\//, "")}` : null,
    created_at: parsed.created_at,
    last_activity_at: parsed.last_activity_at,
    metadata: {
      source: parsed.source || "inbound_web",
      email: parsed.email || null,
      email_marketing: parsed.email_marketing || undefined,
    },
  };
}

async function main() {
  const flags = parseCliArgs();
  let supabaseClient = null;
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  let leads = [];
  if (flags.slug) {
    let leadObj = loadLocalFiche(flags.slug) || { slug: flags.slug, metadata: {} };
    if (supabaseClient) {
      const { data } = await supabaseClient
        .from("leads")
        .select("*")
        .eq("slug", flags.slug)
        .maybeSingle();
      if (data) leadObj = { ...leadObj, ...data };
    }
    leads = [leadObj];
  } else if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("leads")
      .select("*")
      .order("id", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    leads = (data || []).filter((l) => l.metadata?.email);
  } else {
    console.error(
      `\x1b[31m[process-inbound ERROR]\x1b[0m Indicá --slug <slug> o configurá credenciales Supabase para listar/procesar leads.`
    );
    process.exit(2);
  }

  if (flags.list) {
    const summary = leads.map((l) => ({
      id: l.id,
      slug: l.slug,
      email: resolveEmailFromLead(l),
      unsubscribed: isLeadUnsubscribed(l),
      nextStage: resolveFollowupStage(l, { stage: flags.stage }),
    }));
    if (flags.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    console.log(`\n\x1b[36m[process-inbound]\x1b[0m Leads con email: ${summary.length}`);
    for (const item of summary) {
      console.log(
        ` - ${item.slug}: ${item.email || "sin-email"} | next=${item.nextStage || "ninguno"} | unsubscribed=${item.unsubscribed}`
      );
    }
    return;
  }

  const batchRes = await processInboundLeadsBatch(leads, {
    dryRun: Boolean(flags.dryRun),
    stage: flags.stage,
    provider: flags.provider,
    supabaseClient,
  });

  if (flags.json) {
    console.log(JSON.stringify(batchRes, null, 2));
    return;
  }

  console.log(
    `\n\x1b[36m[process-inbound]\x1b[0m Procesados: ${batchRes.total} | Enviados: ${batchRes.sent} | Dry-Run: ${batchRes.dryRun} | Dados de baja: ${batchRes.skippedUnsubscribed} | Sin etapa: ${batchRes.skippedNoStage} | Errores: ${batchRes.errors}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\x1b[31m[process-inbound ERROR]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
