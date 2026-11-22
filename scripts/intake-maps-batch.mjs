#!/usr/bin/env node
/**
 * scripts/intake-maps-batch.mjs
 * Orquestador Gate 0 de ingesta por lotes de 1 a 10 links directos de Google Maps:
 * Resolución URL -> Places API / Serper -> Scraping Email/Web (Cubeta A/B) -> Calificación -> Ficha + Preview + Supabase.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  defaultLeadStore,
  createInMemoryLeadStore,
  buildCorrelativeSlug,
  buildPreviewUrl,
  formatLeadToSheetRow,
  mapSheetRowToLeadEntity,
  normalizePhone,
  normalizeText,
} from "./sheets-sync.mjs";
import {
  buildFicheMarkdown,
  resolveLeadMetadata,
} from "./generate-client-fiche.mjs";
import {
  formatArgentinePhoneNumber,
  resolveRubroFromLead,
  cleanDisplayName,
} from "./prospect-in-conversation.mjs";
import { sendZohoOutreachEmail } from "./send-zoho-outreach.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si .env no está disponible o ya fue cargado
}

export const MAX_BATCH_LINKS = 10;
export const DEFAULT_SCRAPE_TIMEOUT_MS = 6000;

export const HIGH_TICKET_RUBROS = new Set([
  "odontologo",
  "clinica",
  "estetica",
  "dermatologia",
  "cirugia",
  "abogado",
  "kinesiologo",
  "nutricionista",
  "psicologo",
  "corporativo",
  "consultor",
]);

const CUBETA_A_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linktr.ee",
  "doctoralia.com",
  "doctoralia.com.ar",
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
  "beacons.ai",
  "taplink.cc",
];

const BLOCKED_EMAIL_DOMAINS = new Set([
  "sentry.io",
  "sentry.wixpress.com",
  "wixpress.com",
  "example.com",
  "example.org",
  "example.net",
  "domain.com",
  "yourdomain.com",
  "test.com",
  "w3.org",
  "schema.org",
  "googleapis.com",
  "googleusercontent.com",
  "localhost",
]);

const ASSET_EXTENSION_RE = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|woff2?|ttf|eot|otf|map|pdf)$/i;
const RETINA_TOKEN_RE = /@(2|3|4)x\b/i;

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "g_st",
  "entry",
  "ttu",
  "hl",
  "gl",
  "sa",
  "ved",
]);

function isShortMapsHost(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return host === "maps.app.goo.gl" || host === "goo.gl" || host.endsWith(".goo.gl");
}

function isGoogleMapsHost(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return (
    isShortMapsHost(host) ||
    host === "maps.google.com" ||
    host.endsWith(".google.com") ||
    host.endsWith(".google.com.ar")
  );
}

/**
 * Normaliza una URL para deduplicación determinista eliminando trailing slash y parámetros de tracking.
 */
export function normalizeMapsUrlForDedup(rawEntry = "") {
  const trimmed = String(rawEntry || "").trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    const pathname = parsed.pathname.replace(/\/+$/, "") || "";
    const search = parsed.searchParams.toString();
    return `${parsed.protocol.toLowerCase()}//${parsed.hostname.toLowerCase()}${pathname}${search ? `?${search}` : ""}`;
  } catch {
    return trimmed.toLowerCase().replace(/\s+/g, " ");
  }
}

/**
 * Extrae nombre de lugar, coordenadas (@lat,lng), CID y query desde una URL canónica de Google Maps.
 */
export function extractPlaceMetadataFromMapsUrl(urlStr = "") {
  const raw = String(urlStr || "").trim();
  let placeName = "";
  let coordinates = null;
  let cid = null;
  let query = "";

  try {
    const u = new URL(raw);
    const pathDecoded = decodeURIComponent(u.pathname || "");

    const placeMatch = pathDecoded.match(/\/maps\/place\/([^/]+)/i);
    if (placeMatch && placeMatch[1]) {
      placeName = placeMatch[1].replace(/\+/g, " ").replace(/\s+/g, " ").trim();
    }

    const coordMatch = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (coordMatch) {
      const latitude = Number(coordMatch[1]);
      const longitude = Number(coordMatch[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        coordinates = { latitude, longitude };
      }
    }

    const cidParam = u.searchParams.get("cid");
    if (cidParam && /^\d+$/.test(cidParam.trim())) {
      cid = cidParam.trim();
    } else {
      const hexCidMatch = raw.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i);
      if (hexCidMatch && hexCidMatch[1]) {
        cid = `0x${hexCidMatch[1]}`;
      }
    }

    const qParam = u.searchParams.get("q") || u.searchParams.get("query");
    if (qParam) {
      query = qParam.replace(/\+/g, " ").trim();
    }
  } catch {
    // Si no es una URL válida, tratar el texto completo como consulta puntual
    query = raw;
  }

  if (!query) {
    query = placeName || (cid ? `cid:${cid}` : raw);
  }

  return {
    placeName,
    coordinates,
    cid,
    query,
  };
}

/**
 * Seam 1: Parsea, valida límite duro 1..10 y deduplica un lote de links/consultas de Google Maps.
 */
export function parseGoogleMapsUrlInput(rawInput, { maxLinks = MAX_BATCH_LINKS } = {}) {
  let rawItems = [];
  if (Array.isArray(rawInput)) {
    rawItems = rawInput.map((item) => String(item ?? ""));
  } else if (typeof rawInput === "string") {
    rawItems = rawInput.split(/[\r\n;]+/);
  } else if (rawInput != null) {
    rawItems = [String(rawInput)];
  }

  const cleanedItems = rawItems
    .map((line) =>
      line
        .trim()
        .replace(/^(?:\d+[.)]\s+|[-*•]\s+)/, "")
        .trim()
    )
    .filter(Boolean);

  if (cleanedItems.length === 0) {
    throw new Error(
      `El lote debe incluir entre 1 y ${maxLinks} links o consultas de Google Maps (se recibieron 0).`
    );
  }

  const seen = new Set();
  const deduped = [];

  for (const item of cleanedItems) {
    const dedupKey = normalizeMapsUrlForDedup(item);
    if (!dedupKey || seen.has(dedupKey)) {
      continue;
    }
    seen.add(dedupKey);

    let hostname = "";
    let isUrl = false;
    try {
      const u = new URL(item);
      hostname = u.hostname.toLowerCase();
      isUrl = true;
    } catch {
      isUrl = false;
    }

    const isShortUrl = isUrl && isShortMapsHost(hostname);
    const isGoogleMapsUrl = isUrl && isGoogleMapsHost(hostname);
    const meta = extractPlaceMetadataFromMapsUrl(item);

    deduped.push({
      raw: item,
      normalizedUrl: dedupKey,
      isUrl,
      isShortUrl,
      isGoogleMapsUrl,
      ...meta,
    });
  }

  if (deduped.length === 0) {
    throw new Error(
      `El lote debe incluir entre 1 y ${maxLinks} links o consultas de Google Maps.`
    );
  }

  if (deduped.length > maxLinks) {
    throw new Error(
      `Límite duro excedido: se permiten máximo ${maxLinks} links por lote (se recibieron ${deduped.length}).`
    );
  }

  return deduped;
}

/**
 * Seam 1b: Resuelve links cortos (maps.app.goo.gl, goo.gl/maps) mediante redirección HTTP estándar
 * sin evadir controles ni CAPTCHAs, y extrae nombre, query, coordenadas y CID.
 */
export async function resolveGoogleMapsUrl(
  inputUrlOrItem,
  { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_SCRAPE_TIMEOUT_MS } = {}
) {
  const item =
    typeof inputUrlOrItem === "string"
      ? { raw: inputUrlOrItem.trim(), ...extractPlaceMetadataFromMapsUrl(inputUrlOrItem.trim()) }
      : { ...inputUrlOrItem };

  const rawUrl = String(item.raw || "").trim();
  let resolvedUrl = rawUrl;
  let blocked = false;

  let isShort = Boolean(item.isShortUrl);
  try {
    const parsed = new URL(rawUrl);
    isShort = isShort || isShortMapsHost(parsed.hostname);
  } catch {
    return {
      ...item,
      resolvedUrl: rawUrl,
      blocked: false,
    };
  }

  if (isShort && typeof fetchImpl === "function") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, DEFAULT_SCRAPE_TIMEOUT_MS));
    try {
      const res = await fetchImpl(rawUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "NexoBow-Gate0-Intake/1.0 (+https://nexobow.site)",
        },
      });

      const locationHeader = res?.headers?.get ? res.headers.get("location") : null;
      if (locationHeader) {
        resolvedUrl = new URL(locationHeader, rawUrl).toString();
      } else if (res?.url) {
        resolvedUrl = res.url;
      }

      if (/\/sorry\/|captcha|recaptcha/i.test(resolvedUrl)) {
        blocked = true;
      }
    } catch {
      // Tolerancia ante timeout o red sin romper el lote
      resolvedUrl = rawUrl;
    } finally {
      clearTimeout(timer);
    }
  }

  const meta = extractPlaceMetadataFromMapsUrl(resolvedUrl);
  return {
    ...item,
    resolvedUrl,
    blocked,
    placeName: meta.placeName || item.placeName || "",
    coordinates: meta.coordinates || item.coordinates || null,
    cid: meta.cid || item.cid || null,
    query: meta.query || item.query || rawUrl,
  };
}

function isValidExtractedEmail(candidate = "") {
  const clean = String(candidate || "").trim().toLowerCase();
  if (!clean || clean.length > 120) return false;
  if (RETINA_TOKEN_RE.test(clean) || ASSET_EXTENSION_RE.test(clean)) return false;

  const match = clean.match(/^([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,12})$/);
  if (!match) return false;

  const localPart = match[1];
  const domain = match[2];

  if (ASSET_EXTENSION_RE.test(localPart)) return false;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  for (const blockedDomain of BLOCKED_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blockedDomain}`)) return false;
  }

  return true;
}

/**
 * Seam 2: Extrae emails válidos desde enlaces mailto: y texto HTML visible, filtrando falsos positivos.
 */
export function extractEmailsFromHtml(html = "") {
  if (!html || typeof html !== "string") return [];

  const seen = new Set();
  const ordered = [];

  const pushIfValid = (rawEmail) => {
    let decoded = String(rawEmail || "");
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // mantener original si el encoding está roto
    }
    const clean = decoded.split("?")[0].trim().toLowerCase();
    if (isValidExtractedEmail(clean) && !seen.has(clean)) {
      seen.add(clean);
      ordered.push(clean);
    }
  };

  // 1. Priorizar enlaces explícitos mailto:
  const mailtoRe = /mailto:([^"'\s<>?#]+(?:\?[^"'\s<>]*)?)/gi;
  for (const m of html.matchAll(mailtoRe)) {
    pushIfValid(m[1]);
  }

  // 2. Escanear texto HTML visible (removiendo scripts/styles y tags)
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const emailRe = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,12}\b/gi;
  for (const m of visibleText.matchAll(emailRe)) {
    pushIfValid(m[0]);
  }

  return ordered;
}

/**
 * Extrae links públicos de redes sociales y agendas desde HTML.
 */
export function extractSocialLinksFromHtml(html = "") {
  const socials = {
    instagram: null,
    facebook: null,
    whatsapp: null,
    linkedin: null,
    calendly: null,
  };
  if (!html || typeof html !== "string") return socials;

  const hrefRe = /href=["']([^"']+)["']/gi;
  for (const m of html.matchAll(hrefRe)) {
    const href = String(m[1] || "").trim();
    const lower = href.toLowerCase();
    if (!socials.instagram && lower.includes("instagram.com/")) {
      socials.instagram = href;
    } else if (!socials.facebook && (lower.includes("facebook.com/") || lower.includes("fb.com/"))) {
      socials.facebook = href;
    } else if (!socials.whatsapp && (lower.includes("wa.me/") || lower.includes("api.whatsapp.com/"))) {
      socials.whatsapp = href;
    } else if (!socials.linkedin && lower.includes("linkedin.com/")) {
      socials.linkedin = href;
    } else if (!socials.calendly && lower.includes("calendly.com/")) {
      socials.calendly = href;
    }
  }
  return socials;
}

/**
 * Seam 2b: Clasifica un sitio web en Cubeta A (sin web o solo redes/directorios) vs Cubeta B (dominio propio)
 * y detecta señales objetivas de obsolescencia técnica o comercial.
 */
export function classifyWebsiteBucket(websiteUrl = "", htmlOrAudit = null) {
  const cleanUrl = String(websiteUrl || "").trim();
  const isExternalAuditObj =
    htmlOrAudit !== null && typeof htmlOrAudit === "object" && !Array.isArray(htmlOrAudit);

  if (isExternalAuditObj && htmlOrAudit.bucket) {
    return {
      bucket: htmlOrAudit.bucket,
      has_https: Boolean(htmlOrAudit.has_https),
      has_mobile_viewport: Boolean(htmlOrAudit.has_mobile_viewport),
      signals: Array.isArray(htmlOrAudit.signals) ? [...htmlOrAudit.signals] : [],
    };
  }

  const html = typeof htmlOrAudit === "string" ? htmlOrAudit : "";
  const lowerUrl = cleanUrl.toLowerCase();

  let hostname = "";
  let hasHttps = lowerUrl.startsWith("https://");
  try {
    if (cleanUrl) {
      const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
      hostname = parsed.hostname.toLowerCase();
      hasHttps = parsed.protocol === "https:";
    }
  } catch {
    hostname = "";
  }

  const isCubetaADomain =
    !cleanUrl ||
    !hostname ||
    CUBETA_A_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));

  if (isCubetaADomain) {
    const signals = [!cleanUrl ? "no_website" : "social_or_directory_only"];
    return {
      bucket: "cubeta_a",
      has_https: cleanUrl ? hasHttps : false,
      has_mobile_viewport: true,
      signals,
    };
  }

  const signals = [];
  if (!hasHttps) {
    signals.push("no_https");
  }

  let hasMobileViewport = true;
  if (html) {
    hasMobileViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
    if (!hasMobileViewport) {
      signals.push("missing_mobile_viewport");
    }
    if (/(wp-content|wp-includes|wordpress|elementor|wix\.com|wixstatic|jimdo|weebly)/i.test(html)) {
      signals.push("heavy_legacy_stack");
    }
    if (!/(wa\.me\/|api\.whatsapp\.com|whatsapp|calendly\.com|cal\.com|doctoralia|turnos?|reservar)/i.test(html)) {
      signals.push("missing_whatsapp_or_booking_cta");
    }
  }

  return {
    bucket: "cubeta_b",
    has_https: hasHttps,
    has_mobile_viewport: hasMobileViewport,
    signals,
  };
}

function findContactLinkInHtml(html = "", baseUrl = "") {
  if (!html || !baseUrl) return null;
  let origin = "";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return null;
  }

  const hrefRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(hrefRe)) {
    const href = String(m[1] || "").trim();
    const anchorText = String(m[2] || "").replace(/<[^>]+>/g, " ").trim().toLowerCase();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    try {
      const target = new URL(href, baseUrl);
      if (target.origin !== origin) continue;
      if (
        /\/(contacto|contact|contactanos|turnos)(\b|\/|\?|#|$)/i.test(target.pathname) ||
        /\b(contacto|contact)\b/i.test(anchorText)
      ) {
        return target.toString();
      }
    } catch {
      // ignorar href malformado
    }
  }
  return null;
}

async function fetchHtmlWithTimeout(url, fetchImpl, timeoutMs) {
  const effectiveTimeout = Math.min(Number(timeoutMs) || DEFAULT_SCRAPE_TIMEOUT_MS, DEFAULT_SCRAPE_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "NexoBow-Gate0-Scraper/1.0 (+https://nexobow.site)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res || !res.ok) return { ok: false, html: "", finalUrl: url };
    const html = await res.text();
    return { ok: true, html: String(html || "").slice(0, 512000), finalUrl: res.url || url };
  } catch {
    return { ok: false, html: "", finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

const SKIP_SCRAPE_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "doctoralia.com",
  "doctoralia.com.ar",
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
];

function shouldSkipHtmlScrape(websiteUrl = "") {
  if (!websiteUrl) return true;
  try {
    const u = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    const host = u.hostname.toLowerCase();
    return SKIP_SCRAPE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return true;
  }
}

/**
 * Seam 2c: Inspecciona el HTML público de la web/bio (timeout <= 6s, máximo 1 salto a /contacto o /contact)
 * para capturar emails válidos, redes sociales y diagnóstico técnico Cubeta A/B.
 */
export async function extractContactFromWebsite(
  websiteUrl,
  { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_SCRAPE_TIMEOUT_MS } = {}
) {
  const initialBucket = classifyWebsiteBucket(websiteUrl);
  if (!websiteUrl || shouldSkipHtmlScrape(websiteUrl) || typeof fetchImpl !== "function") {
    return {
      primaryEmail: null,
      emails: [],
      socials: extractSocialLinksFromHtml(""),
      audit: {
        has_https: initialBucket.has_https,
        has_mobile_viewport: initialBucket.has_mobile_viewport,
        signals: initialBucket.signals,
      },
      bucket: initialBucket.bucket,
      visitedUrls: [],
    };
  }

  const visitedUrls = [websiteUrl];
  const homeRes = await fetchHtmlWithTimeout(websiteUrl, fetchImpl, timeoutMs);
  let allHtml = homeRes.html;
  let emails = extractEmailsFromHtml(homeRes.html);
  let socials = extractSocialLinksFromHtml(homeRes.html);

  // Máximo 1 salto interno hacia /contacto o /contact si la home no expuso correo
  if (emails.length === 0 && homeRes.ok) {
    const contactUrl = findContactLinkInHtml(homeRes.html, homeRes.finalUrl || websiteUrl);
    if (contactUrl && contactUrl !== websiteUrl) {
      visitedUrls.push(contactUrl);
      const contactRes = await fetchHtmlWithTimeout(contactUrl, fetchImpl, timeoutMs);
      if (contactRes.ok && contactRes.html) {
        emails = extractEmailsFromHtml(contactRes.html);
        const contactSocials = extractSocialLinksFromHtml(contactRes.html);
        socials = {
          instagram: socials.instagram || contactSocials.instagram,
          facebook: socials.facebook || contactSocials.facebook,
          whatsapp: socials.whatsapp || contactSocials.whatsapp,
          linkedin: socials.linkedin || contactSocials.linkedin,
          calendly: socials.calendly || contactSocials.calendly,
        };
        allHtml = `${homeRes.html}\n${contactRes.html}`;
      }
    }
  }

  const bucketAudit = classifyWebsiteBucket(homeRes.finalUrl || websiteUrl, allHtml || homeRes.html);
  if (socials.whatsapp || socials.calendly) {
    bucketAudit.signals = bucketAudit.signals.filter((s) => s !== "missing_whatsapp_or_booking_cta");
  }

  return {
    primaryEmail: emails[0] || null,
    emails,
    socials,
    audit: {
      has_https: bucketAudit.has_https,
      has_mobile_viewport: bucketAudit.has_mobile_viewport,
      signals: bucketAudit.signals,
    },
    bucket: bucketAudit.bucket,
    visitedUrls,
  };
}

function isValidArgentineWhatsApp(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return false;
  if (digits.startsWith("549") && digits.length >= 12) return true;
  if (digits.startsWith("54") && digits.length >= 11) return true;
  if (/^(11|15|2\d{2,3}|3\d{2,3})\d{6,8}$/.test(digits)) return true;
  return false;
}

/**
 * Seam 2d: Calcula puntaje determinista Gate 0 (0-100), grado A/B/C, tier recomendado y metadata comercial.
 */
export function qualifyLeadForGate0(leadInput = {}) {
  const rubro = resolveRubroFromLead(leadInput.rubro || leadInput.nicho || leadInput.niche || "");
  const phone = leadInput.telefono || leadInput.phone || leadInput.whatsapp || "";
  const rating = Number(leadInput.rating ?? 0);
  const reviewsCount = Number(leadInput.reviews_count ?? leadInput.userRatingCount ?? 0);
  const email = leadInput.email ? String(leadInput.email).trim() : "";
  const bucket = leadInput.website_bucket || classifyWebsiteBucket(leadInput.website_url || leadInput.website || "").bucket;
  const audit = leadInput.website_audit || classifyWebsiteBucket(leadInput.website_url || leadInput.website || "");

  let score = 0;
  const reasons = [];

  if (isValidArgentineWhatsApp(phone)) {
    score += 35;
    reasons.push("+35 WhatsApp argentino válido detectado");
  }

  if (Number.isFinite(rating) && rating >= 4.3 && Number.isFinite(reviewsCount) && reviewsCount >= 5) {
    score += 20;
    reasons.push(`+20 Reputación sólida en Maps (${rating}★ · ${reviewsCount} reseñas)`);
  }

  if (HIGH_TICKET_RUBROS.has(rubro)) {
    score += 20;
    reasons.push(`+20 Nicho High-Ticket (${rubro})`);
  }

  const hasCubetaBFaults =
    bucket === "cubeta_b" &&
    (!audit.has_https || !audit.has_mobile_viewport || (Array.isArray(audit.signals) && audit.signals.length > 0));

  if (bucket === "cubeta_a") {
    score += 15;
    reasons.push("+15 Cubeta A: sin web propia (oportunidad directa)");
  } else if (hasCubetaBFaults) {
    score += 15;
    reasons.push(`+15 Cubeta B: web propia con señales de mejora (${(audit.signals || []).join(", ")})`);
  }

  if (email && isValidExtractedEmail(email)) {
    score += 10;
    reasons.push(`+10 Email corporativo extraído (${email})`);
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 75 ? "A" : score >= 50 ? "B" : "C";

  const recommended_tier =
    score >= 85 && (bucket === "cubeta_b" || reviewsCount >= 40)
      ? "tier_2_autonomous"
      : "tier_1_starter";

  const resolvedMeta = resolveLeadMetadata({
    ...leadInput,
    rubro,
  });

  return {
    score,
    grade,
    recommended_tier,
    reasons,
    modalidad: resolvedMeta.modalidad,
    tipo_consulta: resolvedMeta.tipo_consulta,
    canal_agenda: resolvedMeta.canal_agenda,
    pain_angle: "Orden de consultas y turnos confirmados",
  };
}

/**
 * Genera el mensaje inicial de WhatsApp en voseo argentino y su link wa.me directo.
 */
export function buildGate0WhatsAppOutreach(lead = {}) {
  const nombre = cleanDisplayName(lead.nombre || lead.displayName || lead.name || "Profesional");
  const rubro = resolveRubroFromLead(lead.rubro || lead.nicho || "");
  const isLawyer = rubro === "abogado";
  const placeNoun = isLawyer ? "tu estudio jurídico" : "tu consultorio";
  const city = lead.city || lead.ciudad || "";
  const cityBit = city ? ` en ${city}` : "";
  const previewUrl = lead.previewUrl || buildPreviewUrl(lead.slug || "");
  const ratingText =
    lead.rating && Number(lead.reviews_count ?? lead.userRatingCount ?? 0) > 0
      ? ` con ${lead.rating}★ y ${lead.reviews_count ?? lead.userRatingCount} reseñas en Google Maps`
      : "";
  const bucketObservation =
    lead.websiteBucket === "cubeta_b" || lead.website_bucket === "cubeta_b"
      ? "Vi que hoy tu web actual no tiene un embudo directo a WhatsApp y podés estar perdiendo consultas rápidas."
      : "Vi que todavía no tenés una landing propia conectada directo a tus turnos.";
  const emailMention = lead.email
    ? ` (Te dejé también el detalle por mail a ${lead.email}.)`
    : "";

  const message =
    `Hola ${nombre}! Soy Juanma de NexoBow. Estuve viendo el perfil de ${placeNoun}${cityBit}${ratingText}. ` +
    `${bucketObservation} Te armé sin cargo un prototipo interactivo enfocado en orden de consultas y turnos confirmados con recordatorios automáticos 24h/2h: ${previewUrl}${emailMention} ` +
    `Lo tenés reservado 7 días para probar los estilos — ¿querés que te mande un audio corto contándote cómo funcionaría para vos?`;

  const phoneDigits = String(lead.telefono || lead.phone || "").replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
    : "";

  return {
    message,
    whatsappUrl,
  };
}

/**
 * Genera el guion cronometrado de 35 segundos para nota de voz en WhatsApp.
 */
export function buildGate0AudioScript35s(lead = {}) {
  const nombre = cleanDisplayName(lead.nombre || lead.displayName || lead.name || "Colega");
  const rubro = resolveRubroFromLead(lead.rubro || lead.nicho || "");
  const placeNoun = rubro === "abogado" ? "tu estudio" : "tu consultorio";
  const previewUrl = lead.previewUrl || buildPreviewUrl(lead.slug || "");
  const bucketHook =
    lead.websiteBucket === "cubeta_b" || lead.website_bucket === "cubeta_b"
      ? "Vi tu web actual y noté que quien entra desde el celular no tiene un botón directo para resolver el turno al instante."
      : "Vi tu ficha en Google Maps con muy buenas reseñas, pero sin una página propia para convertir esas búsquedas en turnos.";

  return (
    `[GUION AUDIO 35s] "Hola ${nombre}, ¿cómo estás? Te habla Juanma, te grabo este audio rápido para no robarte tiempo. ` +
    `${bucketHook} Por eso te armé un prototipo real en ${previewUrl} enfocado en orden de consultas y turnos confirmados: ` +
    `básicamente ordena las consultas que entran de Maps o Instagram, filtra a los pacientes/clientes antes de agendar ` +
    `y recuerda los turnos para que no te queden huecos en la agenda. Chusmealo tranquilo desde el celu y contame qué paleta te gustó más."`
  );
}

function inferRubroFromQueryOrPlace(placeName = "", fallback = "nutricionista") {
  const combined = `${placeName} ${fallback}`;
  return resolveRubroFromLead(combined);
}

async function fetchSerperPlaceForLink(query, apiKey, fetchImpl) {
  const res = await fetchImpl("https://google.serper.dev/places", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, gl: "ar", hl: "es", num: 3 }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const p = data?.places?.[0];
  if (!p) return null;
  return {
    placeId: p.cid || p.title,
    nombre: cleanDisplayName(p.title || query),
    rubro: inferRubroFromQueryOrPlace(p.title, query),
    direccion: p.address || "",
    telefono: p.phoneNumber || "",
    websiteUri: p.website || "",
    rating: p.rating || null,
    userRatingCount: p.ratingCount || 0,
    reviews: [],
  };
}

async function fetchGooglePlaceForLink(query, apiKey, fetchImpl) {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.reviews",
    "places.location",
  ].join(",");

  const res = await fetchImpl("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({ textQuery: query, languageCode: "es" }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const p = data?.places?.[0];
  if (!p) return null;
  return {
    placeId: p.id || query,
    nombre: cleanDisplayName(p.displayName?.text || query),
    rubro: inferRubroFromQueryOrPlace(p.displayName?.text, query),
    direccion: p.formattedAddress || "",
    telefono: p.internationalPhoneNumber || p.nationalPhoneNumber || "",
    websiteUri: p.websiteUri || "",
    rating: p.rating || null,
    userRatingCount: p.userRatingCount || 0,
    location: p.location || null,
    reviews: (p.reviews || []).slice(0, 5).map((r) => ({
      author: r.authorAttribution?.displayName || "Paciente Verificado",
      rating: r.rating || 5,
      text: r.text?.text || r.originalText?.text || "",
    })),
  };
}

function getMockPlaceForItem(resolvedItem, index, fallbackRubro = "") {
  const baseName = resolvedItem.placeName || resolvedItem.query || `Profesional Demo ${index + 1}`;
  const cleanName = cleanDisplayName(baseName.replace(/^cid:\S+$/i, `Profesional Gate0 ${index + 1}`));
  const inferredRubro = fallbackRubro
    ? resolveRubroFromLead(fallbackRubro)
    : inferRubroFromQueryOrPlace(cleanName, "odontologo");
  return {
    placeId: resolvedItem.cid || `mock_${index + 1}`,
    nombre: cleanName,
    rubro: inferredRubro,
    direccion: "Av. Santa Fe 2450, CABA, Buenos Aires",
    telefono: `+549115500${String(1000 + index)}`,
    websiteUri: index % 2 === 0 ? "https://instagram.com/consultorio.demo" : "",
    rating: 4.8,
    userRatingCount: 22 + index * 3,
    reviews: [
      {
        author: "Paciente Verificado",
        rating: 5,
        text: "Atención puntual, clara y muy humana desde la primera consulta.",
      },
    ],
  };
}

async function resolvePlaceDetails(resolvedItem, index, options) {
  const { placeResolver, mock, fetchImpl = globalThis.fetch, nicho = "", rubro = "" } = options;

  if (typeof placeResolver === "function") {
    return await placeResolver(resolvedItem, index);
  }

  const serperKey = process.env.SERPER_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mock && (googleKey || serperKey)) {
    if (googleKey) {
      const gp = await fetchGooglePlaceForLink(resolvedItem.query, googleKey, fetchImpl);
      if (gp) return gp;
    }
    if (serperKey) {
      const sp = await fetchSerperPlaceForLink(resolvedItem.query, serperKey, fetchImpl);
      if (sp) return sp;
    }
  }

  return getMockPlaceForItem(resolvedItem, index, rubro || nicho);
}

/**
 * Seam 3: Orquestador end-to-end del lote de 1 a 10 links de Google Maps.
 */
export async function runIntakeMapsBatch(options = {}) {
  const {
    links,
    rawInput,
    nicho = "",
    rubro = "",
    noDeploy = false,
    dryRun = false,
    skipBuild = false,
    mock = false,
    outputRoot = REPO_ROOT,
    fetchImpl = null,
    placeResolver = null,
    leadStore = defaultLeadStore,
    supabaseClient = null,
    buildSiteFn = null,
    deployFn = null,
    zohoOutreachFn = null,
    sendZoho = false,
    zohoDryRun = false,
    zohoTransport = null,
  } = options;

  const effectiveFetch = fetchImpl ?? (mock ? null : globalThis.fetch);
  const parsedItems = parseGoogleMapsUrlInput(rawInput ?? links, { maxLinks: MAX_BATCH_LINKS });

  const existingKeys = new Set(
    (typeof leadStore?.getExistingKeys === "function" ? leadStore.getExistingKeys() : []).map((k) =>
      normalizeText(k)
    )
  );

  let maxSupabaseId = 0;
  if (!mock && supabaseClient && typeof supabaseClient.from === "function") {
    try {
      const queryRes = await supabaseClient.from("leads").select("id, name, phone");
      const resolvedRes =
        queryRes && !("data" in queryRes) && typeof queryRes.order === "function"
          ? await queryRes.order("id", { ascending: false })
          : queryRes;
      const sbRows = resolvedRes?.data;
      if (Array.isArray(sbRows)) {
        for (const r of sbRows) {
          const numericId = Number(r?.id);
          if (Number.isFinite(numericId) && numericId > maxSupabaseId) {
            maxSupabaseId = numericId;
          }
          if (r?.name) existingKeys.add(normalizeText(r.name));
          if (r?.phone) existingKeys.add(normalizePhone(r.phone));
        }
      }
    } catch {
      // Continuar con las claves disponibles en leadStore
    }
  }

  const leads = [];
  const skippedDuplicates = [];
  const supabasePayloads = [];
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";

  for (let i = 0; i < parsedItems.length; i++) {
    const parsedItem = parsedItems[i];
    const resolvedItem = await resolveGoogleMapsUrl(parsedItem, { fetchImpl: effectiveFetch });
    const place = await resolvePlaceDetails(resolvedItem, i, {
      placeResolver,
      mock,
      fetchImpl: effectiveFetch,
      nicho,
      rubro,
    });

    if (!place) continue;

    const cleanName = cleanDisplayName(place.nombre || place.displayName || resolvedItem.placeName || `Lead ${i + 1}`);
    const normalizedPhone = formatArgentinePhoneNumber(place.telefono || place.nationalPhoneNumber || "");
    const cleanPhoneDigits = normalizedPhone.replace(/\D/g, "");
    const normNameKey = normalizeText(cleanName);
    const normPhoneKey = normalizePhone(normalizedPhone);

    if ((normNameKey && existingKeys.has(normNameKey)) || (normPhoneKey && existingKeys.has(normPhoneKey))) {
      skippedDuplicates.push({ nombre: cleanName, phone: normalizedPhone, url: resolvedItem.resolvedUrl });
      continue;
    }
    if (normNameKey) existingKeys.add(normNameKey);
    if (normPhoneKey) existingKeys.add(normPhoneKey);

    const resolvedRubro = resolveRubroFromLead(place.rubro || rubro || nicho || cleanName);
    const websiteUrl = String(place.websiteUri || place.website || "").trim();
    const websiteContact = await extractContactFromWebsite(websiteUrl, {
      fetchImpl: effectiveFetch,
      timeoutMs: DEFAULT_SCRAPE_TIMEOUT_MS,
    });

    const primaryEmail = place.email || websiteContact.primaryEmail || null;
    const websiteBucket = websiteContact.bucket;
    const websiteAudit = websiteContact.audit;
    const reviewsCount = Number(place.userRatingCount ?? place.reviews_count ?? (place.reviews?.length || 0));
    const rating = place.rating != null ? Number(place.rating) : null;
    const reviewsSummary = (place.reviews || []).slice(0, 5).map((r) => ({
      author: r.author || "Paciente Verificado",
      rating: r.rating ?? 5,
      text: String(r.text || "").trim(),
    }));

    const qualification = qualifyLeadForGate0({
      rubro: resolvedRubro,
      telefono: normalizedPhone,
      rating,
      reviews_count: reviewsCount,
      email: primaryEmail,
      website_url: websiteUrl || null,
      website_bucket: websiteBucket,
      website_audit: websiteAudit,
    });

    let leadId;
    let slug;
    let sheetRow;

    if (dryRun) {
      const nextStoreId = typeof leadStore?.getNextId === "function" ? leadStore.getNextId() : 1;
      const nextBaseId = Math.max(nextStoreId, maxSupabaseId + 1);
      leadId = nextBaseId + leads.length;
      slug = buildCorrelativeSlug({ id: leadId, displayName: cleanName, nicho: resolvedRubro });
      sheetRow = formatLeadToSheetRow(
        {
          displayName: cleanName,
          nicho: resolvedRubro,
          rubro: resolvedRubro,
          nationalPhoneNumber: normalizedPhone,
          formattedAddress: place.direccion || "",
          rating,
          userRatingCount: reviewsCount,
          instagram: websiteContact.socials?.instagram || (websiteBucket === "cubeta_a" ? websiteUrl : ""),
          slug,
        },
        leadId
      );
    } else {
      const nextStoreId = typeof leadStore?.getNextId === "function" ? leadStore.getNextId() : 1;
      const preferredId = maxSupabaseId > 0 ? Math.max(nextStoreId, maxSupabaseId + 1) : undefined;
      const appendPayload = {
        displayName: cleanName,
        nicho: resolvedRubro,
        rubro: resolvedRubro,
        nationalPhoneNumber: normalizedPhone,
        formattedAddress: place.direccion || "",
        rating,
        userRatingCount: reviewsCount,
        instagram: websiteContact.socials?.instagram || (websiteBucket === "cubeta_a" ? websiteUrl : ""),
      };
      if (preferredId !== undefined) {
        appendPayload.id = preferredId;
      }
      const appended = leadStore.appendLead(appendPayload);
      leadId = appended.id <= maxSupabaseId ? maxSupabaseId + 1 : appended.id;
      if (leadId !== appended.id) {
        slug = buildCorrelativeSlug({ id: leadId, displayName: cleanName, nicho: resolvedRubro });
        sheetRow = formatLeadToSheetRow(
          {
            ...appendPayload,
            slug,
          },
          leadId
        );
      } else {
        slug = appended.slug;
        sheetRow = appended.row;
      }
      maxSupabaseId = Math.max(maxSupabaseId, leadId);
    }

    const previewUrl = buildPreviewUrl(slug, rootDomain);
    const audioScript35s = buildGate0AudioScript35s({
      nombre: cleanName,
      rubro: resolvedRubro,
      slug,
      previewUrl,
      websiteBucket,
    });

    const waOutreach = buildGate0WhatsAppOutreach({
      nombre: cleanName,
      rubro: resolvedRubro,
      slug,
      previewUrl,
      telefono: cleanPhoneDigits,
      rating,
      reviews_count: reviewsCount,
      websiteBucket,
      email: primaryEmail,
      ciudad: place.direccion,
    });

    const clientsDir = join(outputRoot, "clients");
    const assetsDir = join(outputRoot, "assets", slug);
    const fichePath = join(clientsDir, `${slug}.md`);

    if (!dryRun) {
      mkdirSync(clientsDir, { recursive: true });
      mkdirSync(assetsDir, { recursive: true });

      const rawLeadData = {
        source: "intake_batch",
        slug,
        sheet_id: leadId,
        nombre: cleanName,
        rubro: resolvedRubro,
        direccion: place.direccion || "",
        telefono: cleanPhoneDigits,
        telefonoFormato: normalizedPhone,
        email: primaryEmail,
        maps_url: resolvedItem.resolvedUrl,
        website_url: websiteUrl || null,
        website: websiteUrl || "",
        website_bucket: websiteBucket,
        website_audit: websiteAudit,
        rating,
        reviews_count: reviewsCount,
        userRatingCount: reviewsCount,
        reviews: reviewsSummary,
        qualification,
        modalidad: qualification.modalidad,
        tipo_consulta: qualification.tipo_consulta,
        canal_agenda: qualification.canal_agenda,
        instagram: websiteContact.socials?.instagram || (websiteBucket === "cubeta_a" ? websiteUrl : ""),
        audio_script_35s: audioScript35s,
        placeId: place.placeId || resolvedItem.cid || slug,
      };

      writeFileSync(join(assetsDir, "lead-raw.json"), JSON.stringify(rawLeadData, null, 2) + "\n", "utf8");
      const mdContent = buildFicheMarkdown(rawLeadData, { "sheet-id": leadId });
      writeFileSync(fichePath, mdContent, "utf8");

      if (!skipBuild) {
        if (typeof buildSiteFn === "function") {
          await buildSiteFn({ fichePath, slug, leadId, rawLeadData });
        } else {
          const buildRes = spawnSync("node", ["scripts/build-client-site.mjs", fichePath], {
            cwd: REPO_ROOT,
            stdio: "inherit",
            shell: process.platform === "win32",
          });
          if (buildRes.status !== 0) {
            throw new Error(`build-client-site falló para ${slug} con código ${buildRes.status}`);
          }
        }
      }
    }

    const baseEntity = mapSheetRowToLeadEntity(sheetRow) || {
      id: leadId,
      slug,
      name: cleanName,
      niche: resolvedRubro,
      phone: normalizedPhone,
      demo_url: previewUrl,
    };

    const gate0Metadata = resolveLeadMetadata({
      rubro: resolvedRubro,
      modalidad: qualification.modalidad,
      tipo_consulta: qualification.tipo_consulta,
      canal_agenda: qualification.canal_agenda,
      metadata: {
        ...(baseEntity.metadata || {}),
        source: "intake_batch",
        email: primaryEmail,
        maps_url: resolvedItem.resolvedUrl,
        website_url: websiteUrl || null,
        website_bucket: websiteBucket,
        website_audit: websiteAudit,
        rating,
        reviews_count: reviewsCount,
        reviews_summary: reviewsSummary,
        qualification,
        audio_script_35s: audioScript35s,
        socials: websiteContact.socials,
      },
    });

    const supabaseRecord = {
      ...baseEntity,
      slug,
      demo_url: previewUrl,
      metadata: gate0Metadata,
    };
    supabasePayloads.push(supabaseRecord);

    leads.push({
      id: leadId,
      slug,
      nombre: cleanName,
      rubro: resolvedRubro,
      telefono: normalizedPhone,
      email: primaryEmail,
      mapsUrl: resolvedItem.resolvedUrl,
      websiteUrl: websiteUrl || null,
      websiteBucket,
      websiteAudit,
      rating,
      reviewsCount,
      reviewsSummary,
      qualification,
      previewUrl,
      fichePath,
      whatsappMessage: waOutreach.message,
      whatsappUrl: waOutreach.whatsappUrl,
      audioScript35s,
      socials: websiteContact.socials,
    });
  }

  if (!dryRun && supabaseClient && typeof supabaseClient.from === "function" && supabasePayloads.length > 0) {
    const { error } = await supabaseClient.from("leads").upsert(supabasePayloads, { onConflict: "id" });
    if (error) {
      throw new Error(`Error sincronizando lote en Supabase: ${error.message}`);
    }
  }

  let deployed = false;
  if (!dryRun && !noDeploy && !skipBuild && leads.length > 0) {
    if (typeof deployFn === "function") {
      await deployFn({ leads });
      deployed = true;
    } else {
      const deployRes = spawnSync("npm", ["run", "deploy-previews"], {
        cwd: REPO_ROOT,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      deployed = deployRes.status === 0;
    }
  }

  if (!dryRun && leads.length > 0) {
    if (typeof zohoOutreachFn === "function") {
      await zohoOutreachFn({ leads });
    } else if (sendZoho) {
      for (let idx = 0; idx < leads.length; idx++) {
        const leadItem = leads[idx];
        const baseMeta = supabasePayloads[idx]?.metadata || leadItem.metadata || {};
        const zohoRes = await sendZohoOutreachEmail(
          { ...leadItem, metadata: baseMeta },
          {
            dryRun: Boolean(zohoDryRun),
            transport: zohoTransport,
            supabaseClient,
          }
        );
        leadItem.emailOutreach = zohoRes.emailOutreach;
        if (supabasePayloads[idx]) {
          supabasePayloads[idx].metadata = zohoRes.lead.metadata;
        }
      }
    }
  }

  return {
    processedCount: leads.length,
    skippedDuplicatesCount: skippedDuplicates.length,
    skippedDuplicates,
    deployed,
    dryRun,
    leads,
  };
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {
    links: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--links" && argv[i + 1]) {
      flags.links.push(argv[++i]);
    } else if (arg === "--file" && argv[i + 1]) {
      flags.file = argv[++i];
    } else if (arg === "--nicho" && argv[i + 1]) {
      flags.nicho = argv[++i];
    } else if (arg === "--rubro" && argv[i + 1]) {
      flags.rubro = argv[++i];
    } else if (arg === "--no-deploy") {
      flags.noDeploy = true;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--skip-build") {
      flags.skipBuild = true;
    } else if (arg === "--mock") {
      flags.mock = true;
    } else if (arg === "--send-zoho") {
      flags.sendZoho = true;
    } else if (arg === "--zoho-dry-run") {
      flags.sendZoho = true;
      flags.zohoDryRun = true;
    } else if (arg === "--json") {
      flags.json = true;
    } else if (!arg.startsWith("--")) {
      flags.links.push(arg);
    }
  }
  return flags;
}

async function main() {
  const flags = parseCliArgs();
  let rawInput = flags.links.join("\n");
  if (flags.file) {
    const absFile = resolve(process.cwd(), flags.file);
    rawInput = readFileSync(absFile, "utf8");
  }

  if (!rawInput.trim()) {
    console.error(
      `\x1b[31m[intake-maps-batch ERROR]\x1b[0m Especificá entre 1 y 10 links con --links "..." o --file ruta.txt`
    );
    process.exit(2);
  }

  let supabaseClient = null;
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!flags.mock && !flags.dryRun && supabaseUrl && supabaseKey) {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  const result = await runIntakeMapsBatch({
    rawInput,
    nicho: flags.nicho || "",
    rubro: flags.rubro || "",
    noDeploy: Boolean(flags.noDeploy),
    dryRun: Boolean(flags.dryRun),
    skipBuild: Boolean(flags.skipBuild),
    mock: Boolean(flags.mock),
    sendZoho: Boolean(flags.sendZoho),
    zohoDryRun: Boolean(flags.zohoDryRun),
    leadStore: flags.mock ? createInMemoryLeadStore() : defaultLeadStore,
    supabaseClient,
  });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n\x1b[32m=======================================================`);
  console.log(`✓ LOTE GATE 0 PROCESADO (${result.processedCount} leads · deploy=${result.deployed})`);
  console.log(`=======================================================\x1b[0m\n`);

  result.leads.forEach((l, idx) => {
    console.log(`${idx + 1}. \x1b[1m${l.nombre}\x1b[0m [${l.qualification.grade} · ${l.qualification.score}/100 · ${l.websiteBucket.toUpperCase()} · ${l.qualification.recommended_tier}]`);
    console.log(`   - Preview URL: ${l.previewUrl}`);
    console.log(`   - Email: ${l.email || "Sin email extraído"}${l.emailOutreach ? ` [Zoho: ${l.emailOutreach.status}]` : ""}`);
    console.log(`   - WhatsApp Link: ${l.whatsappUrl || "Sin teléfono válido"}`);
    console.log(`   - Mensaje WA: ${l.whatsappMessage}`);
    console.log(`   - ${l.audioScript35s}\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\x1b[31m[intake-maps-batch ERROR]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
