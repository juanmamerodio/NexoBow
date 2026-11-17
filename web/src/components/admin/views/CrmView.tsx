// web/src/components/admin/views/CrmView.tsx — Workstation CRM & Prospección Gate 0 con Kanban, Data Table, Lote 10 Maps y WhatsApp/Audio 35s 1-Clic
import React, { useState, useEffect, useMemo } from "react";
import { getBrowserSupabaseClient } from "../../../lib/supabase";
import {
  Columns,
  Table as TableIcon,
  Search,
  ExternalLink,
  Clock,
  RotateCw,
  X,
  AlertTriangle,
  Save,
  Trash2,
  MessageCircle,
  Sparkles,
  Plus,
  Globe,
  Mail,
  Flame,
  Copy,
  Check,
  Zap,
  Star,
  Volume2,
  MapPin,
} from "lucide-react";

export interface LeadMetadata {
  source?: "inbound_web" | "scout_maps" | "intake_batch" | "manual_crm" | string;
  email: string | null;
  maps_url: string | null;
  modalidad: "presencial" | "mixto" | "online";
  tipo_consulta: "consultar" | "arancelada" | "gratuita";
  canal_agenda: "whatsapp_secretaria" | "calendly" | "google_calendar" | "turnero_externo";
  arancel_consulta_ars: number;
  tier_interes?: "tier_1_starter" | "tier_2_autonomous" | "tier_3_growth";
  website_url: string | null;
  website_bucket: "cubeta_a" | "cubeta_b";
  website_audit: {
    has_https: boolean;
    has_mobile_viewport: boolean;
    signals: string[];
  };
  rating: number | null;
  reviews_count: number;
  reviews_summary: Array<{ author: string; rating?: number; text: string }>;
  qualification: {
    score: number;
    grade: "A" | "B" | "C";
    recommended_tier: "tier_1_starter" | "tier_2_autonomous" | "tier_3_growth";
    reasons: string[];
  };
  email_outreach: {
    status: "sent" | "skipped_no_email" | "dry_run" | "error" | "pending";
    provider: "zoho_mail";
    sent_at: string | null;
    message_id: string | null;
    subject: string | null;
    error: string | null;
  };
  telemetry: {
    views_count: number;
    last_event: "preview_view" | "theme_switch" | "cta_click" | null;
    last_viewed_at: string | null;
    selected_theme: string | null;
    cta_clicks: number;
    is_hot_lead: boolean;
  };
  audio_script_35s: string;
  [key: string]: any;
}

export interface LeadEntity {
  id: number;
  slug: string;
  name: string;
  niche: string;
  contact_channel: string;
  whatsapp_link?: string | null;
  demo_url?: string | null;
  social_link?: string | null;
  location: string;
  city: string;
  funnel_status: string;
  first_contact_date?: string | null;
  last_contact_date?: string | null;
  response_status: string;
  meeting_booked: boolean;
  meeting_date?: string | null;
  potential_value: string;
  business_status: string;
  notes?: string | null;
  phone?: string | null;
  created_at?: string;
  last_activity_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export type WhatsAppScriptMode =
  | "initial"
  | "audio_script"
  | "followup_hot"
  | "objecion_presencial"
  | "objecion_arancelada";

const CUBETA_A_HOST_FRAGMENTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linktr.ee",
  "doctoralia.com",
  "wa.me",
  "whatsapp.com",
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

function inferWebsiteBucketFromUrl(websiteUrl = ""): "cubeta_a" | "cubeta_b" {
  const clean = String(websiteUrl || "").trim();
  if (!clean) return "cubeta_a";
  try {
    const parsed = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
    const host = parsed.hostname.toLowerCase();
    const isSocialOrDir = CUBETA_A_HOST_FRAGMENTS.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );
    return isSocialOrDir ? "cubeta_a" : "cubeta_b";
  } catch {
    return "cubeta_a";
  }
}

function cleanLeadDisplayName(rawName = ""): string {
  return (
    String(rawName || "Profesional")
      .replace(/^(Lic\.|Dr\.|Dra\.|Mg\.|Abog\.)\s*/i, "")
      .trim() || "Profesional"
  );
}

function resolvePlaceNounByNiche(niche = ""): { isLegal: boolean; placeNoun: string } {
  const lower = String(niche || "").toLowerCase();
  const isLegal = ["abogado", "juridico", "legal", "estudio"].some((k) => lower.includes(k));
  return {
    isLegal,
    placeNoun: isLegal ? "tu estudio jurídico" : "tu consultorio",
  };
}

function buildDefaultAudioScript35s(
  lead: Partial<LeadEntity> = {},
  websiteBucket: "cubeta_a" | "cubeta_b" = "cubeta_a"
): string {
  const name = cleanLeadDisplayName(lead.name);
  const slug = String(lead.slug || "").trim();
  const demoUrl =
    lead.demo_url || (slug ? `https://preview.nexobow.site/${slug}/` : "https://preview.nexobow.site/");
  const bucketHook =
    websiteBucket === "cubeta_b"
      ? "Vi tu web actual y noté que quien entra desde el celular no tiene un embudo directo para coordinar turno al instante."
      : "Vi tu ficha en Google Maps con muy buenas referencias, pero sin una página propia para convertir esas búsquedas en turnos.";

  return (
    `[GUION AUDIO 35s] "Hola ${name}, ¿cómo estás? Te habla Juanma de NexoBow, te grabo este audio rápido para no robarte tiempo. ` +
    `${bucketHook} Por eso te armé un prototipo real en ${demoUrl} enfocado en el sistema Anti-Silla Vacía & Cero-Secretaria: ` +
    `ordena las consultas de Maps o Instagram, filtra antes de agendar y confirma turnos para evitar huecos en tu agenda. ` +
    `Chusmealo tranquilo desde el celu y contame qué paleta te gustó más."`
  );
}

export function resolveLeadMetadata(lead: Partial<LeadEntity> = {}): LeadMetadata {
  const rawMeta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const niche = String(lead.niche || "").toLowerCase();
  const isPresencial = [
    "odontologo",
    "clinica",
    "estetica",
    "dermatologia",
    "cirugia",
    "kinesiologo",
  ].some((k) => niche.includes(k));
  const isLegal = ["abogado", "juridico", "legal", "contador", "corporativo", "consultor"].some(
    (k) => niche.includes(k)
  );

  const rawAny = lead as Record<string, any>;
  const emailRaw = rawAny.email ?? rawMeta.email ?? null;
  const email = emailRaw ? String(emailRaw).trim().toLowerCase() : null;

  const mapsUrlRaw = rawAny.maps_url ?? rawMeta.maps_url ?? rawAny.google_maps ?? null;
  const maps_url = mapsUrlRaw ? String(mapsUrlRaw).trim() : null;

  const websiteUrlRaw =
    rawAny.website_url ?? rawMeta.website_url ?? rawAny.website ?? lead.social_link ?? null;
  const website_url = websiteUrlRaw ? String(websiteUrlRaw).trim() : null;

  const rawBucket = rawAny.website_bucket ?? rawMeta.website_bucket;
  const website_bucket: "cubeta_a" | "cubeta_b" =
    rawBucket === "cubeta_b" || rawBucket === "cubeta_a"
      ? rawBucket
      : inferWebsiteBucketFromUrl(website_url || "");

  const rawAudit =
    (rawAny.website_audit && typeof rawAny.website_audit === "object"
      ? rawAny.website_audit
      : null) ||
    (rawMeta.website_audit && typeof rawMeta.website_audit === "object"
      ? rawMeta.website_audit
      : {});
  const website_audit = {
    has_https:
      rawAudit.has_https !== undefined
        ? Boolean(rawAudit.has_https)
        : Boolean(website_url && String(website_url).toLowerCase().startsWith("https://")),
    has_mobile_viewport:
      rawAudit.has_mobile_viewport !== undefined ? Boolean(rawAudit.has_mobile_viewport) : true,
    signals: Array.isArray(rawAudit.signals) ? [...rawAudit.signals] : [],
  };

  const ratingRaw = rawAny.rating ?? rawMeta.rating;
  const rating =
    ratingRaw !== undefined && ratingRaw !== null && Number.isFinite(Number(ratingRaw))
      ? Number(ratingRaw)
      : null;

  const reviewsCountRaw =
    rawAny.reviews_count ?? rawMeta.reviews_count ?? rawAny.userRatingCount ?? 0;
  const reviews_count = Number.isFinite(Number(reviewsCountRaw)) ? Number(reviewsCountRaw) : 0;

  const rawReviews = rawAny.reviews_summary ?? rawMeta.reviews_summary ?? rawAny.reviews;
  const reviews_summary = Array.isArray(rawReviews)
    ? rawReviews.map((r: any) => ({
        author: String(r?.author || "Google Maps").trim(),
        rating: r?.rating !== undefined ? Number(r.rating) : undefined,
        text: String(r?.text || "").trim(),
      }))
    : [];

  const rawQual =
    (rawAny.qualification && typeof rawAny.qualification === "object"
      ? rawAny.qualification
      : null) ||
    (rawMeta.qualification && typeof rawMeta.qualification === "object"
      ? rawMeta.qualification
      : {});
  const score = Number.isFinite(Number(rawQual.score)) ? Number(rawQual.score) : 0;
  const grade: "A" | "B" | "C" =
    rawQual.grade === "A" || rawQual.grade === "B" || rawQual.grade === "C"
      ? rawQual.grade
      : score >= 75
        ? "A"
        : score >= 50
          ? "B"
          : "C";
  const recommended_tier: "tier_1_starter" | "tier_2_autonomous" | "tier_3_growth" =
    rawQual.recommended_tier ||
    (String(lead.potential_value || "").includes("549.999")
      ? "tier_2_autonomous"
      : "tier_1_starter");
  const qualification = {
    score,
    grade,
    recommended_tier,
    reasons: Array.isArray(rawQual.reasons) ? [...rawQual.reasons] : [],
  };

  const rawOutreach =
    (rawAny.email_outreach && typeof rawAny.email_outreach === "object"
      ? rawAny.email_outreach
      : null) ||
    (rawMeta.email_outreach && typeof rawMeta.email_outreach === "object"
      ? rawMeta.email_outreach
      : {});
  const email_outreach = {
    status: (rawOutreach.status || (email ? "pending" : "skipped_no_email")) as
      | "sent"
      | "skipped_no_email"
      | "dry_run"
      | "error"
      | "pending",
    provider: (rawOutreach.provider || "zoho_mail") as "zoho_mail",
    sent_at: rawOutreach.sent_at ?? null,
    message_id: rawOutreach.message_id ?? null,
    subject: rawOutreach.subject ?? null,
    error: rawOutreach.error ?? null,
  };

  const rawTel =
    (rawAny.telemetry && typeof rawAny.telemetry === "object" ? rawAny.telemetry : null) ||
    (rawMeta.telemetry && typeof rawMeta.telemetry === "object" ? rawMeta.telemetry : {});
  const views_count = Number.isFinite(Number(rawTel.views_count)) ? Number(rawTel.views_count) : 0;
  const cta_clicks = Number.isFinite(Number(rawTel.cta_clicks)) ? Number(rawTel.cta_clicks) : 0;
  const selected_theme = rawTel.selected_theme ? String(rawTel.selected_theme) : null;
  const telemetry = {
    views_count,
    last_event: (rawTel.last_event ?? null) as
      | "preview_view"
      | "theme_switch"
      | "cta_click"
      | null,
    last_viewed_at: rawTel.last_viewed_at ?? null,
    selected_theme,
    cta_clicks,
    is_hot_lead: Boolean(rawTel.is_hot_lead || views_count > 0 || cta_clicks > 0 || selected_theme),
  };

  const rawAudio = rawAny.audio_script_35s ?? rawMeta.audio_script_35s;
  const audio_script_35s =
    typeof rawAudio === "string" && rawAudio.trim()
      ? rawAudio.trim()
      : buildDefaultAudioScript35s(lead, website_bucket);

  return {
    ...rawMeta,
    modalidad: rawMeta.modalidad || (isPresencial ? "presencial" : "mixto"),
    tipo_consulta: rawMeta.tipo_consulta || (isLegal ? "arancelada" : "consultar"),
    canal_agenda: rawMeta.canal_agenda || "whatsapp_secretaria",
    arancel_consulta_ars: Number(rawAny.arancel_consulta_ars ?? rawMeta.arancel_consulta_ars ?? 0),
    email,
    maps_url,
    website_url,
    website_bucket,
    website_audit,
    rating,
    reviews_count,
    reviews_summary,
    qualification,
    email_outreach,
    telemetry,
    audio_script_35s,
  };
}

export const KANBAN_STAGES = [
  { id: "1. Prospecto Identificado", label: "1. Identificado", color: "#6366F1", bg: "rgba(99, 102, 241, 0.1)" },
  { id: "2. Contactado", label: "2. Contactado", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
  { id: "3. Reunión Agendada", label: "3. Reunión", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  { id: "4. Propuesta Enviada", label: "4. Propuesta", color: "#EC4899", bg: "rgba(236, 72, 153, 0.1)" },
  { id: "5. Negociación / Cierre", label: "5. Negociación", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
  { id: "6. Descartado", label: "6. Descartado", color: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" },
];

export const RESPONSE_STATUSES = [
  "Sin Contactar",
  "Esperando Respuesta",
  "Interesado",
  "No Interesado",
  "Respondio",
];

// Leads iniciales de muestra basados en las fichas reales (solo para modo offline o carga explícita)
export const INITIAL_DEMO_LEADS: LeadEntity[] = [
  {
    id: 23,
    slug: "23-mari-calcagno-nutri",
    name: "Lic. Mari Calcagno",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491124908956",
    demo_url: "https://preview.nexobow.site/23-mari-calcagno-nutri/",
    location: "Palermo, CABA",
    city: "Palermo",
    funnel_status: "1. Prospecto Identificado",
    first_contact_date: "2026-10-26",
    response_status: "Sin Contactar",
    meeting_booked: false,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5491124908956",
    notes: "Especialista en nutrición deportiva y funcional.",
    expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { modalidad: "mixto", tipo_consulta: "consultar", canal_agenda: "whatsapp_secretaria" },
  },
  {
    id: 22,
    slug: "22-daniela-ramunno-nutri",
    name: "Lic. Daniela Ramunno",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491124908956",
    demo_url: "https://preview.nexobow.site/22-daniela-ramunno-nutri/",
    location: "Av. Córdoba 5869, Palermo, CABA",
    city: "Palermo",
    funnel_status: "2. Contactado",
    first_contact_date: "2026-10-26",
    response_status: "Esperando Respuesta",
    meeting_booked: false,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5491124908956",
    notes: "Educación alimentaria sin juicios con marcas de súper.",
    expires_at: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { modalidad: "mixto", tipo_consulta: "consultar", canal_agenda: "whatsapp_secretaria" },
  },
  {
    id: 55,
    slug: "55-gonzalo-benitez-abogado",
    name: "Dr. Gonzalo Benítez",
    niche: "abogado",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491148209123",
    demo_url: "https://preview.nexobow.site/55-gonzalo-benitez-abogado/",
    location: "Retiro, CABA",
    city: "CABA",
    funnel_status: "1. Prospecto Identificado",
    first_contact_date: "2026-10-22",
    response_status: "Sin Contactar",
    meeting_booked: false,
    potential_value: "$549.999 ARS",
    business_status: "En Proceso",
    phone: "+5491148209123",
    notes: "Estudio societario y contractual de alta gama.",
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { modalidad: "mixto", tipo_consulta: "arancelada", canal_agenda: "whatsapp_secretaria" },
  },
];

export function calculateDaysRemaining(expiresAt?: string | null): {
  days: number;
  hours: number;
  isExpired: boolean;
  isUrgent: boolean;
  label: string;
} {
  if (!expiresAt) {
    return { days: 7, hours: 168, isExpired: false, isUrgent: false, label: "7 días" };
  }
  const now = new Date().getTime();
  const exp = new Date(expiresAt).getTime();
  const diffMs = exp - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, isExpired: true, isUrgent: false, label: "Vencido (TTL)" };
  }

  const hours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isUrgent = hours <= 48;

  if (hours < 24) {
    return { days: 0, hours, isExpired: false, isUrgent: true, label: `${hours} hs (<24h)` };
  }
  if (isUrgent) {
    return { days: 1, hours, isExpired: false, isUrgent: true, label: `${hours} hs (<48h)` };
  }
  return { days, hours, isExpired: false, isUrgent: false, label: `${days} días` };
}

export function buildVoseoWhatsAppMessage(
  lead: Partial<LeadEntity>,
  mode: WhatsAppScriptMode = "initial"
): string {
  const meta = resolveLeadMetadata(lead);
  const demoUrl = lead.demo_url || `https://preview.nexobow.site/${lead.slug || ""}/`;
  const name = cleanLeadDisplayName(lead.name);
  const city = lead.city || lead.location || "tu zona";
  const { isLegal, placeNoun } = resolvePlaceNounByNiche(lead.niche);

  if (mode === "audio_script") {
    return meta.audio_script_35s;
  }

  if (mode === "followup_hot") {
    const themeLabel = meta.telemetry.selected_theme || "Original";
    return (
      `Hola ${name}! Soy Juanma de NexoBow. Vi que recién estuviste chusmeando la demo de ${placeNoun} en ${city} ` +
      `y probaste la paleta "${themeLabel}". ¿Qué te pareció la idea del sistema Anti-Silla Vacía & Cero-Secretaria ` +
      `para filtrar consultas y evitar huecos en agenda? Si te gustó cómo queda, en 48 hs la activamos con tus fotos reales: ${demoUrl}`
    );
  }

  if (mode === "objecion_presencial") {
    const placePresencial = isLegal ? "tu estudio jurídico presencial" : "tu consultorio presencial";
    return (
      `Totalmente ${name}, por eso configuramos la web como vidriera profesional de ${placePresencial} en ${city}, ` +
      `con mapa interactivo y el sistema Anti-Silla Vacía & Cero-Secretaria conectado directo al WhatsApp para coordinar turnos presenciales sin intermediarios: ${demoUrl}`
    );
  }

  if (mode === "objecion_arancelada") {
    return (
      `Exacto ${name}, la web presenta tu trayectoria en ${city}, filtra curiosos con el sistema Cero-Secretaria ` +
      `y deja claro desde el primer clic que la primera consulta de valoración es arancelada antes de pasar al WhatsApp: ${demoUrl}`
    );
  }

  // Modo "initial" (Gate 0: zona + rating/Maps + preview 10x + Anti-Silla Vacía & Cero-Secretaria + mención sutil a Zoho si fue enviado)
  const mapsRef = meta.rating
    ? ` (${meta.rating}★${meta.reviews_count > 0 ? ` · ${meta.reviews_count} reseñas en Google Maps` : " en Google Maps"})`
    : "";
  const bucketHook =
    meta.website_bucket === "cubeta_b"
      ? "Vi que hoy tu web actual no tiene un embudo directo a WhatsApp y podés estar perdiendo consultas rápidas."
      : "Vi que todavía no tenés una web propia optimizada para convertir búsquedas en turnos.";
  const zohoMention =
    meta.email_outreach.status === "sent"
      ? ` (Te dejé también el detalle por correo desde Zoho Mail${meta.email ? ` a ${meta.email}` : ""}.)`
      : "";

  return (
    `Hola ${name}! Soy Juanma de NexoBow. Estuve viendo el perfil de ${placeNoun} en ${city}${mapsRef}. ` +
    `${bucketHook} Te armé una muestra 10x con el sistema Anti-Silla Vacía & Cero-Secretaria para filtrar consultas ` +
    `y confirmar turnos directo por WhatsApp: ${demoUrl}${zohoMention} ` +
    `La tenés reservada 7 días — ¿querés que te mande un audio corto de 35s contándote cómo funcionaría para ${placeNoun}?`
  );
}

export function buildVoseoWhatsAppUrl(
  lead: Partial<LeadEntity>,
  mode: WhatsAppScriptMode = "initial"
): string {
  const digits = String(lead.phone || lead.whatsapp_link || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const message = buildVoseoWhatsAppMessage(lead, mode);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildCanonicalSlug(id: number, name: string, niche: string): string {
  const cleanName = name
    .replace(/^(Lic\.|Dr\.|Dra\.|Mg\.|Abog\.)\s*/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const cleanNiche = niche
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return `${id}-${cleanName || "profesional"}-${cleanNiche || "salud"}`;
}

export function parseBatchMapsInputForCrm(rawInput: string): {
  valid: boolean;
  error: string | null;
  items: Array<{ rawUrl: string; placeName: string; isShortUrl: boolean }>;
} {
  const lines = String(rawInput || "")
    .split(/[\r\n;]+/)
    .map((l) => l.trim().replace(/^(?:\d+[.)]\s+|[-*•]\s+)/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { valid: false, error: "Pegá entre 1 y 10 links de Google Maps.", items: [] };
  }

  const seen = new Set<string>();
  const items: Array<{ rawUrl: string; placeName: string; isShortUrl: boolean }> = [];

  for (const line of lines) {
    let key = line.replace(/\/+$/, "").toLowerCase();
    let placeName = "";
    let isShortUrl = false;
    try {
      const u = new URL(line);
      const keptParams = new URLSearchParams();
      for (const paramName of ["cid", "q", "query"]) {
        const val = u.searchParams.get(paramName);
        if (val) keptParams.set(paramName, val.trim());
      }
      const queryStr = keptParams.toString();
      key = `${u.origin.toLowerCase()}${u.pathname.replace(/\/+$/, "").toLowerCase()}${queryStr ? `?${queryStr.toLowerCase()}` : ""}`;
      const host = u.hostname.toLowerCase();
      isShortUrl = host === "maps.app.goo.gl" || host === "goo.gl";
      const match = decodeURIComponent(u.pathname).match(/\/maps\/place\/([^/]+)/i);
      if (match?.[1]) {
        placeName = match[1].replace(/\+/g, " ").trim();
      }
    } catch {
      placeName = line;
    }
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      rawUrl: line,
      placeName: placeName || `Prospecto Maps #${items.length + 1}`,
      isShortUrl,
    });
  }

  if (items.length > 10) {
    return {
      valid: false,
      error: `Límite máximo Gate 0: hasta 10 links por lote (ingresaste ${items.length}).`,
      items: items.slice(0, 10),
    };
  }

  return { valid: true, error: null, items };
}

export const CrmView: React.FC<{ onNavigate?: (path: string) => void }> = () => {
  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedFunnel, setSelectedFunnel] = useState<string>("all");
  const [selectedBucket, setSelectedBucket] = useState<"all" | "cubeta_a" | "cubeta_b">("all");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [filterInboundOnly, setFilterInboundOnly] = useState(false);
  const [filterHasEmailOnly, setFilterHasEmailOnly] = useState(false);
  const [filterHotLeadsOnly, setFilterHotLeadsOnly] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadEntity | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Cargar prospectos desde Supabase (Single Source of Truth)
  useEffect(() => {
    let mounted = true;
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const supabase = getBrowserSupabaseClient();
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("id", { ascending: false });

        if (mounted) {
          if (error) {
            setLeads(INITIAL_DEMO_LEADS);
            setIsOffline(true);
          } else {
            setLeads((data as LeadEntity[]) || []);
            setIsOffline(false);
          }
        }
      } catch {
        if (mounted) {
          setLeads(INITIAL_DEMO_LEADS);
          setIsOffline(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLeads();
    return () => {
      mounted = false;
    };
  }, []);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleCopyText = async (text: string, label: string, leadId?: number) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Fallback silencioso en entornos sin permiso de portapapeles
    }
    if (leadId !== undefined) {
      setCopiedLeadId(leadId);
      setTimeout(() => setCopiedLeadId((cur) => (cur === leadId ? null : cur)), 2000);
    }
    showNotification(`✓ ${label} copiado al portapapeles`);
  };

  const handleCreateLead = async (newLeadInput: {
    name: string;
    niche: string;
    city: string;
    phone: string;
    email?: string;
    potential_value: string;
    modalidad: "presencial" | "online" | "mixto";
    tipo_consulta: "consultar" | "arancelada" | "gratuita";
    canal_agenda: "whatsapp_secretaria" | "calendly" | "google_calendar";
  }) => {
    const nextId =
      leads.length > 0 ? Math.max(...leads.map((l) => Number(l.id) || 0)) + 1 : 1;
    const slug = buildCanonicalSlug(nextId, newLeadInput.name, newLeadInput.niche);
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const cleanDigits = newLeadInput.phone.replace(/\D/g, "");
    const cleanEmail = newLeadInput.email?.trim().toLowerCase() || null;

    const metadata = resolveLeadMetadata({
      id: nextId,
      slug,
      name: newLeadInput.name.trim(),
      niche: newLeadInput.niche.trim().toLowerCase(),
      city: newLeadInput.city.trim(),
      demo_url: `https://preview.nexobow.site/${slug}/`,
      potential_value: newLeadInput.potential_value || "$189.999 ARS",
      metadata: {
        source: "manual_crm",
        email: cleanEmail,
        modalidad: newLeadInput.modalidad,
        tipo_consulta: newLeadInput.tipo_consulta,
        canal_agenda: newLeadInput.canal_agenda,
      },
    });

    const created: LeadEntity = {
      id: nextId,
      slug,
      name: newLeadInput.name.trim(),
      niche: newLeadInput.niche.trim().toLowerCase(),
      contact_channel: "WhatsApp",
      whatsapp_link: cleanDigits ? `https://wa.me/${cleanDigits}` : null,
      demo_url: `https://preview.nexobow.site/${slug}/`,
      location: newLeadInput.city.trim(),
      city: newLeadInput.city.trim(),
      funnel_status: "1. Prospecto Identificado",
      first_contact_date: now.toISOString().split("T")[0],
      response_status: "Sin Contactar",
      meeting_booked: false,
      potential_value: newLeadInput.potential_value || "$189.999 ARS",
      business_status: "En Proceso",
      phone: newLeadInput.phone.trim(),
      notes: "Creado desde Admin CRM.",
      created_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      expires_at: expires.toISOString(),
      metadata,
    };

    setLeads((prev) => [created, ...prev]);
    setShowNewLeadModal(false);

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.from("leads").upsert(created);
    } catch {
      // Fallback local
    }

    showNotification(`✓ Prospecto #${created.id} (${created.slug}) creado en Supabase`);
  };

  const handleBatchMapsRegister = async (payload: {
    items: Array<{ rawUrl: string; placeName: string; isShortUrl: boolean }>;
    defaultNiche: string;
    defaultCity: string;
  }) => {
    const startId =
      leads.length > 0 ? Math.max(...leads.map((l) => Number(l.id) || 0)) + 1 : 1;
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const createdBatch: LeadEntity[] = payload.items.map((item, idx) => {
      const id = startId + idx;
      const slug = buildCanonicalSlug(id, item.placeName, payload.defaultNiche);
      const demoUrl = `https://preview.nexobow.site/${slug}/`;
      const metadata = resolveLeadMetadata({
        id,
        slug,
        name: item.placeName,
        niche: payload.defaultNiche,
        city: payload.defaultCity,
        demo_url: demoUrl,
        metadata: {
          source: "intake_batch",
          maps_url: item.rawUrl,
          website_bucket: "cubeta_a",
          qualification: {
            score: 55,
            grade: "B",
            recommended_tier: "tier_1_starter",
            reasons: ["Ingesta directa Gate 0 desde link Maps (pendiente scraping CLI)"],
          },
        },
      });

      return {
        id,
        slug,
        name: item.placeName,
        niche: payload.defaultNiche,
        contact_channel: "WhatsApp",
        whatsapp_link: null,
        demo_url: demoUrl,
        social_link: item.rawUrl,
        location: payload.defaultCity,
        city: payload.defaultCity,
        funnel_status: "1. Prospecto Identificado",
        first_contact_date: now.toISOString().split("T")[0],
        response_status: "Sin Contactar",
        meeting_booked: false,
        potential_value: "$189.999 ARS",
        business_status: "En Proceso",
        phone: null,
        notes: `Lote Gate 0 Maps: ${item.rawUrl}`,
        created_at: now.toISOString(),
        last_activity_at: now.toISOString(),
        expires_at: expires.toISOString(),
        metadata,
      };
    });

    setLeads((prev) => [...createdBatch, ...prev]);
    setShowBatchModal(false);

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.from("leads").upsert(createdBatch);
    } catch {
      // Fallback local
    }

    showNotification(
      `✓ Lote de ${createdBatch.length} link(s) Maps registrado en CRM & Supabase`
    );
  };

  // Acciones de 1 Clic
  const handleRenewTtl = async (id: number) => {
    const now = new Date();
    const newExpires = new Date(now);
    newExpires.setDate(newExpires.getDate() + 7);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              last_activity_at: now.toISOString(),
              expires_at: newExpires.toISOString(),
            }
          : l
      )
    );

    if (selectedLead && selectedLead.id === id) {
      setSelectedLead((prev) =>
        prev
          ? {
              ...prev,
              last_activity_at: now.toISOString(),
              expires_at: newExpires.toISOString(),
            }
          : null
      );
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase
        .from("leads")
        .update({
          last_activity_at: now.toISOString(),
          expires_at: newExpires.toISOString(),
        })
        .eq("id", id);
    } catch {
      // Ignorar en local
    }

    showNotification(`✓ TTL de lead #${id} renovado por +7 días`);
  };

  const handleUpdateStage = async (id: number, newStage: string) => {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              funnel_status: newStage,
              last_activity_at: now,
            }
          : l
      )
    );

    if (selectedLead && selectedLead.id === id) {
      setSelectedLead((prev) =>
        prev ? { ...prev, funnel_status: newStage, last_activity_at: now } : null
      );
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase
        .from("leads")
        .update({
          funnel_status: newStage,
          last_activity_at: now,
        })
        .eq("id", id);
    } catch {
      // Ignorar en local
    }

    showNotification(`✓ Etapa de lead #${id} actualizada a: ${newStage}`);
  };

  const handleSaveLead = async (updated: LeadEntity) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.from("leads").upsert(updated);
    } catch {
      // Ignorar en local
    }

    showNotification(`✓ Cambios de #${updated.id} guardados correctamente`);
  };

  // Listas únicas para filtros
  const niches = useMemo(() => {
    const set = new Set(leads.map((l) => l.niche).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  const cities = useMemo(() => {
    const set = new Set(leads.map((l) => l.city).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  // Filtrado reactivo de leads (incluye filtros Gate 0)
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const meta = resolveLeadMetadata(lead);

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(term);
        const matchPhone = (lead.phone || "").toLowerCase().includes(term);
        const matchSlug = lead.slug.toLowerCase().includes(term);
        const matchLocation = (lead.location || "").toLowerCase().includes(term);
        const matchEmail = (meta.email || "").toLowerCase().includes(term);
        const matchWeb = (meta.website_url || "").toLowerCase().includes(term);
        if (
          !matchName &&
          !matchPhone &&
          !matchSlug &&
          !matchLocation &&
          !matchEmail &&
          !matchWeb
        ) {
          return false;
        }
      }

      if (selectedNiche !== "all" && lead.niche !== selectedNiche) return false;
      if (selectedCity !== "all" && lead.city !== selectedCity) return false;
      if (selectedFunnel !== "all" && lead.funnel_status !== selectedFunnel) return false;
      if (selectedBucket !== "all" && meta.website_bucket !== selectedBucket) return false;

      if (filterHasEmailOnly && !meta.email) return false;
      if (filterHotLeadsOnly && !meta.telemetry.is_hot_lead) return false;

      if (filterUrgentOnly) {
        const ttl = calculateDaysRemaining(lead.expires_at);
        if (!ttl.isUrgent && !ttl.isExpired) return false;
      }

      if (filterInboundOnly) {
        if (lead.metadata?.source !== "inbound_web") return false;
      }

      return true;
    });
  }, [
    leads,
    searchTerm,
    selectedNiche,
    selectedCity,
    selectedFunnel,
    selectedBucket,
    filterHasEmailOnly,
    filterHotLeadsOnly,
    filterUrgentOnly,
    filterInboundOnly,
  ]);

  const gate0Stats = useMemo(() => {
    let withEmail = 0;
    let zohoSent = 0;
    let hotCount = 0;
    for (const l of leads) {
      const m = resolveLeadMetadata(l);
      if (m.email) withEmail++;
      if (m.email_outreach.status === "sent") zohoSent++;
      if (m.telemetry.is_hot_lead) hotCount++;
    }
    return { withEmail, zohoSent, hotCount };
  }, [leads]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 py-3 px-5 rounded-xl border text-xs font-semibold shadow-2xl animate-fade-in"
          style={{
            backgroundColor: "#0B0D12",
            borderColor: "#BF40FA",
            color: "#E3D9FC",
          }}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Encabezado Principal y Barra de Control */}
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b"
        style={{ borderColor: "#1A1D26" }}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
              style={{
                backgroundColor: isOffline
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                color: isOffline ? "#F59E0B" : "#10B981",
              }}
            >
              {isOffline
                ? "Modo Offline (Demo)"
                : leads.length === 0
                  ? "Supabase Live (0 registros)"
                  : "Supabase Live"}
            </span>
            <span className="text-zinc-500 text-xs font-mono">
              {loading ? "Sincronizando..." : `${filteredLeads.length} leads activos`}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              • {gate0Stats.withEmail} con email • {gate0Stats.zohoSent} Zoho •{" "}
              <span className={gate0Stats.hotCount > 0 ? "text-amber-300 font-semibold" : ""}>
                {gate0Stats.hotCount} Hot-Leads
              </span>
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            CRM & Prospección Comercial Gate 0
          </h1>
          <p className="text-xs text-zinc-400">
            Workstation de lotes 10 Maps: email extraído, Zoho Mail, Cubeta A/B, telemetría /api/ping y WhatsApp/Audio 35s 1-clic.
          </p>
        </div>

        {/* Acciones Principales: Lote 10 Links Maps, + Nuevo Prospecto & Kanban vs Table */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-200 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Lote 10 Links Maps</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewLeadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
            style={{
              backgroundColor: "#BF40FA",
              boxShadow: "0 4px 14px rgba(191, 64, 250, 0.3)",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Prospecto</span>
          </button>

          <div
            className="flex items-center p-1 rounded-xl border"
            style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
          >
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-purple-600/30 text-white border border-purple-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-purple-600/30 text-white border border-purple-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, web, teléfono, ciudad o slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            aria-label="Filtrar por nicho"
            className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">Todos los Nichos ({niches.length})</option>
            {niches.map((n) => (
              <option key={n} value={n}>
                {n.charAt(0).toUpperCase() + n.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            aria-label="Filtrar por ciudad"
            className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">Todas las Ciudades ({cities.length})</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedFunnel}
            onChange={(e) => setSelectedFunnel(e.target.value)}
            aria-label="Filtrar por etapa del embudo"
            className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">Todas las Etapas (6)</option>
            {KANBAN_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Selector Cubeta A / B */}
          <select
            value={selectedBucket}
            onChange={(e) => setSelectedBucket(e.target.value as "all" | "cubeta_a" | "cubeta_b")}
            aria-label="Filtrar por Cubeta A / B"
            className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">Cubeta A / B (Todas)</option>
            <option value="cubeta_a">Cubeta A (Sin Web / Redes)</option>
            <option value="cubeta_b">Cubeta B (Web Obsoleta)</option>
          </select>
        </div>

        {/* Toggles Rápidos Gate 0 & Operativos */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-900">
          <button
            type="button"
            onClick={() => setFilterHasEmailOnly(!filterHasEmailOnly)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filterHasEmailOnly
                ? "bg-sky-500/20 text-sky-300 border-sky-500/50"
                : "bg-black/40 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Con Email</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterHotLeadsOnly(!filterHotLeadsOnly)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filterHotLeadsOnly
                ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                : "bg-black/40 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Hot-Leads (Vistos)</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterInboundOnly(!filterInboundOnly)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filterInboundOnly
                ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                : "bg-black/40 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>Inbound Web</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filterUrgentOnly
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-black/40 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Urgencia &lt;48h / Vencidos</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: TABLERO KANBAN */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.funnel_status === stage.id);
            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-2xl border min-h-[500px]"
                style={{
                  backgroundColor: "#0B0D12",
                  borderColor: "#1A1D26",
                }}
              >
                <div
                  className="p-3 border-b flex items-center justify-between"
                  style={{ borderColor: "#1A1D26" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-xs font-bold text-zinc-200 truncate">{stage.label}</span>
                  </div>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: stage.bg, color: stage.color }}
                  >
                    {stageLeads.length}
                  </span>
                </div>

                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[72vh]">
                  {stageLeads.map((lead) => {
                    const ttl = calculateDaysRemaining(lead.expires_at);
                    const meta = resolveLeadMetadata(lead);
                    const waMode: WhatsAppScriptMode = meta.telemetry.is_hot_lead
                      ? "followup_hot"
                      : "initial";
                    const waMessage = buildVoseoWhatsAppMessage(lead, waMode);
                    const waUrl = buildVoseoWhatsAppUrl(lead, waMode);
                    const isInbound = lead.metadata?.source === "inbound_web";
                    const zohoStatusLabel = !meta.email
                      ? "Sin Email"
                      : meta.email_outreach.status === "sent"
                        ? "✉️ Zoho Enviado"
                        : "⏳ Pendiente";

                    return (
                      <div
                        key={lead.id}
                        className="p-3 rounded-xl border transition-all hover:border-purple-500/40 group relative space-y-2"
                        style={{
                          backgroundColor: "#040607",
                          borderColor: meta.telemetry.is_hot_lead
                            ? "rgba(249, 115, 22, 0.45)"
                            : ttl.isUrgent
                              ? "rgba(245, 158, 11, 0.4)"
                              : "#1A1D26",
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                              style={{
                                backgroundColor: "rgba(91, 42, 98, 0.3)",
                                borderColor: "rgba(191, 64, 250, 0.3)",
                                color: "#E3D9FC",
                              }}
                            >
                              #{lead.id}
                            </span>
                            {isInbound && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Inbound Web
                              </span>
                            )}
                            {meta.telemetry.is_hot_lead && (
                              <span
                                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40"
                                title={`Vistas: ${meta.telemetry.views_count} | Paleta: ${meta.telemetry.selected_theme || "Original"}`}
                              >
                                🔥 Hot-Lead ({meta.telemetry.views_count}v)
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                              ttl.isExpired
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : ttl.isUrgent
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {ttl.label}
                          </span>
                        </div>

                        <div>
                          <h4
                            onClick={() => setSelectedLead(lead)}
                            className="font-bold text-xs text-white group-hover:text-purple-300 cursor-pointer transition-colors truncate"
                          >
                            {lead.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <span className="capitalize truncate">{lead.niche}</span>
                            <span>•</span>
                            <span className="truncate">{lead.city}</span>
                          </div>
                        </div>

                        {/* Fila Gate 0: Cubeta A/B, Rating Maps, Score & Paleta vista */}
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px] font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded border font-semibold ${
                              meta.website_bucket === "cubeta_b"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                            }`}
                          >
                            {meta.website_bucket === "cubeta_b" ? "Cubeta B" : "Cubeta A"}
                          </span>

                          {meta.rating !== null && (
                            <span className="text-amber-300 font-semibold flex items-center gap-0.5">
                              ★ {meta.rating} · {meta.reviews_count}
                            </span>
                          )}

                          {meta.qualification.score > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              {meta.qualification.score}pts
                            </span>
                          )}
                        </div>

                        {/* Email + Badge Zoho Mail */}
                        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-900 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                !meta.email
                                  ? "bg-zinc-900 text-zinc-500 border-zinc-800"
                                  : meta.email_outreach.status === "sent"
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {zohoStatusLabel}
                            </span>
                            {meta.telemetry.selected_theme && (
                              <span className="text-[9px] font-mono text-purple-300 truncate max-w-[90px]">
                                🎨 {meta.telemetry.selected_theme}
                              </span>
                            )}
                          </div>
                          {meta.email && (
                            <div className="text-[10px] font-mono text-zinc-400 truncate">
                              {meta.email}
                            </div>
                          )}
                          {(meta.website_url || meta.maps_url) && (
                            <div className="flex items-center gap-2 text-[10px]">
                              {meta.website_url && (
                                <a
                                  href={meta.website_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-400 hover:underline truncate"
                                >
                                  Web original
                                </a>
                              )}
                              {meta.maps_url && (
                                <a
                                  href={meta.maps_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-zinc-400 hover:text-white truncate"
                                >
                                  Maps
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-900">
                          <span>Potencial:</span>
                          <span className="text-white font-semibold">{lead.potential_value}</span>
                        </div>

                        {/* Acciones de 1 Clic: Copiar Mensaje WA + Abrir WhatsApp + Preview + TTL */}
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(waMessage, `Mensaje WA #${lead.id}`, lead.id)
                            }
                            className="w-full py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-purple-500/50 hover:text-white transition-all cursor-pointer"
                          >
                            {copiedLeadId === lead.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <span>📋 Copiar Mensaje WA</span>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Abrir WhatsApp con voseo prearmado"
                                className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all"
                                style={{
                                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                                  color: "#10B981",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                }}
                              >
                                <span>💬 Abrir WhatsApp</span>
                              </a>
                            )}

                            {lead.demo_url && (
                              <a
                                href={lead.demo_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver preview web en preview.nexobow.site"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRenewTtl(lead.id)}
                              title="Renovar TTL (+7 días)"
                              className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 transition-colors border border-zinc-800 cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div className="p-6 text-center text-zinc-600 text-[11px] font-mono border border-dashed border-zinc-800 rounded-xl my-4">
                      Sin prospectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 2: DATA TABLE DE ALTA DENSIDAD */}
      {viewMode === "table" && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="border-b text-zinc-400 font-mono text-[11px]"
                  style={{ borderColor: "#1A1D26" }}
                >
                  <th className="py-3 px-4 font-semibold">ID</th>
                  <th className="py-3 px-4 font-semibold">Prospecto</th>
                  <th className="py-3 px-4 font-semibold">Email & Zoho</th>
                  <th className="py-3 px-4 font-semibold">Web / Maps & Score</th>
                  <th className="py-3 px-4 font-semibold">Etapa del Embudo</th>
                  <th className="py-3 px-4 font-semibold">TTL Expiración</th>
                  <th className="py-3 px-4 font-semibold">Valor</th>
                  <th className="py-3 px-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {filteredLeads.map((lead) => {
                  const ttl = calculateDaysRemaining(lead.expires_at);
                  const meta = resolveLeadMetadata(lead);
                  const waMode: WhatsAppScriptMode = meta.telemetry.is_hot_lead
                    ? "followup_hot"
                    : "initial";
                  const waMessage = buildVoseoWhatsAppMessage(lead, waMode);
                  const waUrl = buildVoseoWhatsAppUrl(lead, waMode);
                  const isInbound = lead.metadata?.source === "inbound_web";
                  const zohoStatusLabel = !meta.email
                    ? "Sin Email"
                    : meta.email_outreach.status === "sent"
                      ? "✉️ Zoho Enviado"
                      : "⏳ Pendiente";

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">#{lead.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{lead.name}</span>
                          {isInbound && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Inbound Web
                            </span>
                          )}
                          {meta.telemetry.is_hot_lead && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                              🔥 Hot-Lead ({meta.telemetry.views_count}v
                              {meta.telemetry.selected_theme
                                ? ` · ${meta.telemetry.selected_theme}`
                                : ""}
                              )
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          <span className="capitalize">{lead.niche}</span> • {lead.city} •{" "}
                          {lead.phone || "Sin tel"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="mb-1">
                          <span
                            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                              !meta.email
                                ? "bg-zinc-900 text-zinc-500 border-zinc-800"
                                : meta.email_outreach.status === "sent"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {zohoStatusLabel}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 truncate max-w-[180px]">
                          {meta.email || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                              meta.website_bucket === "cubeta_b"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                            }`}
                          >
                            {meta.website_bucket === "cubeta_b" ? "Cubeta B" : "Cubeta A"}
                          </span>
                          {meta.rating !== null && (
                            <span className="text-[11px] font-mono text-amber-300">
                              ★ {meta.rating} · {meta.reviews_count}
                            </span>
                          )}
                          {meta.qualification.score > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              Score {meta.qualification.score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          {meta.website_url && (
                            <a
                              href={meta.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:underline truncate max-w-[130px]"
                            >
                              Web
                            </a>
                          )}
                          {meta.maps_url && (
                            <a
                              href={meta.maps_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-white"
                            >
                              Maps
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor:
                              KANBAN_STAGES.find((s) => s.id === lead.funnel_status)?.bg ||
                              "rgba(255,255,255,0.1)",
                            color:
                              KANBAN_STAGES.find((s) => s.id === lead.funnel_status)?.color ||
                              "#FFF",
                          }}
                        >
                          {lead.funnel_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            ttl.isExpired
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : ttl.isUrgent
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {ttl.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300 font-medium">
                        {lead.potential_value}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(waMessage, `Mensaje WA #${lead.id}`, lead.id)
                            }
                            title="Copiar Mensaje WA listo"
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir WhatsApp con voseo"
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.demo_url && (
                            <a
                              href={lead.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver preview web"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRenewTtl(lead.id)}
                            title="Renovar TTL (+7 días)"
                            className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-900/30 transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL + NUEVO PROSPECTO */}
      {showNewLeadModal && (
        <NewLeadModal
          onClose={() => setShowNewLeadModal(false)}
          onCreate={handleCreateLead}
        />
      )}

      {/* MODAL ⚡ LOTE 10 LINKS MAPS */}
      {showBatchModal && (
        <BatchMapsIntakeModal
          onClose={() => setShowBatchModal(false)}
          onRegisterBatch={handleBatchMapsRegister}
          onCopyCommand={(cmd) => handleCopyText(cmd, "Comando CLI Gate 0")}
        />
      )}

      {/* DRAWER LATERAL DE EDICIÓN RÁPIDA Y GATE 0 */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
          onRenewTtl={() => handleRenewTtl(selectedLead.id)}
          onUpdateStage={(stage) => handleUpdateStage(selectedLead.id, stage)}
          onCopy={(text, label) => handleCopyText(text, label, selectedLead.id)}
        />
      )}
    </div>
  );
};

interface NewLeadModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    niche: string;
    city: string;
    phone: string;
    email?: string;
    potential_value: string;
    modalidad: "presencial" | "online" | "mixto";
    tipo_consulta: "consultar" | "arancelada" | "gratuita";
    canal_agenda: "whatsapp_secretaria" | "calendly" | "google_calendar";
  }) => void;
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("odontologo");
  const [city, setCity] = useState("CABA");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [potentialValue, setPotentialValue] = useState("$189.999 ARS");
  const [modalidad, setModalidad] = useState<"presencial" | "online" | "mixto">("presencial");
  const [tipoConsulta, setTipoConsulta] = useState<"consultar" | "arancelada" | "gratuita">(
    "consultar"
  );
  const [canalAgenda, setCanalAgenda] = useState<
    "whatsapp_secretaria" | "calendly" | "google_calendar"
  >("whatsapp_secretaria");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name,
      niche,
      city,
      phone,
      email,
      potential_value: potentialValue,
      modalidad,
      tipo_consulta: tipoConsulta,
      canal_agenda: canalAgenda,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        <div
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: "#1A1D26" }}
        >
          <h3 className="text-base font-bold text-white">+ Nuevo Prospecto Comercial</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Nombre / Consultorio / Estudio
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Dra. Valeria Gómez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Rubro</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white"
              >
                <option value="odontologo">Odontología</option>
                <option value="clinica">Clínica / Medicina</option>
                <option value="estetica">Estética / Dermatología</option>
                <option value="nutricionista">Nutrición</option>
                <option value="psicologo">Psicología</option>
                <option value="abogado">Estudio Jurídico</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Ciudad / Barrio
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">WhatsApp</label>
              <input
                type="text"
                placeholder="+54911..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Email (Opcional Zoho)
              </label>
              <input
                type="email"
                placeholder="turnos@consultorio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Tier / Valor Potencial
            </label>
            <select
              value={potentialValue}
              onChange={(e) => setPotentialValue(e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white font-mono"
            >
              <option value="$189.999 ARS">Tier 1 Starter ($189.999 ARS)</option>
              <option value="$549.999 ARS">Tier 2 Autonomous ($549.999 ARS)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Modalidad</label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as any)}
                className="w-full py-1.5 px-2 rounded-lg text-[11px] bg-black/40 border border-zinc-800 text-white"
              >
                <option value="presencial">Presencial</option>
                <option value="mixto">Mixto</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Consulta</label>
              <select
                value={tipoConsulta}
                onChange={(e) => setTipoConsulta(e.target.value as any)}
                className="w-full py-1.5 px-2 rounded-lg text-[11px] bg-black/40 border border-zinc-800 text-white"
              >
                <option value="consultar">A coordinar</option>
                <option value="arancelada">Arancelada</option>
                <option value="gratuita">Gratuita</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                Canal Agenda
              </label>
              <select
                value={canalAgenda}
                onChange={(e) => setCanalAgenda(e.target.value as any)}
                className="w-full py-1.5 px-2 rounded-lg text-[11px] bg-black/40 border border-zinc-800 text-white"
              >
                <option value="whatsapp_secretaria">WA Secretaría</option>
                <option value="calendly">Calendly</option>
                <option value="google_calendar">Google Calendar</option>
              </select>
            </div>
          </div>

          <div
            className="flex justify-end gap-2 pt-3 border-t"
            style={{ borderColor: "#1A1D26" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
              style={{ backgroundColor: "#BF40FA" }}
            >
              Crear Prospecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BatchMapsIntakeModalProps {
  onClose: () => void;
  onRegisterBatch: (payload: {
    items: Array<{ rawUrl: string; placeName: string; isShortUrl: boolean }>;
    defaultNiche: string;
    defaultCity: string;
  }) => void;
  onCopyCommand: (cmd: string) => void;
}

const BatchMapsIntakeModal: React.FC<BatchMapsIntakeModalProps> = ({
  onClose,
  onRegisterBatch,
  onCopyCommand,
}) => {
  const [rawLinks, setRawLinks] = useState("");
  const [defaultNiche, setDefaultNiche] = useState("odontologo");
  const [defaultCity, setDefaultCity] = useState("CABA");

  const parsed = useMemo(() => parseBatchMapsInputForCrm(rawLinks), [rawLinks]);
  const cliCommand = useMemo(() => {
    const joined = parsed.items.map((i) => i.rawUrl).join("\\n");
    return `printf "${joined}\\n" | npm run intake-maps -- --send-zoho`;
  }, [parsed.items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.valid || parsed.items.length === 0) return;
    onRegisterBatch({
      items: parsed.items,
      defaultNiche,
      defaultCity,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-4"
        style={{ backgroundColor: "#0B0D12", borderColor: "rgba(245, 158, 11, 0.35)" }}
      >
        <div
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: "#1A1D26" }}
        >
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>⚡ Lote 10 Links Maps (Gate 0)</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Pegá hasta 10 URLs de Google Maps (cortas o /maps/place/) para pre-cargar al CRM o generar el comando completo de scraping + Zoho Mail.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-zinc-300">
                Links de Google Maps (1 por línea)
              </label>
              <span
                className={`text-[11px] font-mono font-bold ${
                  parsed.items.length > 10 ? "text-red-400" : "text-amber-300"
                }`}
              >
                {parsed.items.length} / 10 links
              </span>
            </div>
            <textarea
              rows={6}
              value={rawLinks}
              onChange={(e) => setRawLinks(e.target.value)}
              placeholder={`https://maps.app.goo.gl/...\nhttps://www.google.com/maps/place/...`}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-mono bg-black/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            {rawLinks.trim() && parsed.error && (
              <p className="text-[11px] text-red-400 mt-1">{parsed.error}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Rubro base (fallback)
              </label>
              <select
                value={defaultNiche}
                onChange={(e) => setDefaultNiche(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white"
              >
                <option value="odontologo">Odontología</option>
                <option value="estetica">Estética / Dermatología</option>
                <option value="clinica">Clínica / Medicina</option>
                <option value="nutricionista">Nutrición</option>
                <option value="abogado">Estudio Jurídico</option>
                <option value="psicologo">Psicología</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Zona / Ciudad base
              </label>
              <input
                type="text"
                value={defaultCity}
                onChange={(e) => setDefaultCity(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white"
              />
            </div>
          </div>

          {parsed.items.length > 0 && (
            <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-1.5 max-h-32 overflow-y-auto">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Vista previa del lote ({parsed.items.length})
              </span>
              {parsed.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-200 truncate">{idx + 1}. {it.placeName}</span>
                  <span className="text-zinc-500 text-[10px]">
                    {it.isShortUrl ? "Link corto" : "Place URL"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-900">
            <button
              type="button"
              disabled={!parsed.valid}
              onClick={() => onCopyCommand(cliCommand)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Comando CLI Pipeline</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!parsed.valid}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 cursor-pointer"
              >
                Registrar Lote en CRM
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface LeadDrawerProps {
  lead: LeadEntity;
  onClose: () => void;
  onSave: (lead: LeadEntity) => void;
  onRenewTtl: () => void;
  onUpdateStage: (stage: string) => void;
  onCopy: (text: string, label: string) => void;
}

const LeadDrawer: React.FC<LeadDrawerProps> = ({
  lead,
  onClose,
  onSave,
  onRenewTtl,
  onUpdateStage,
  onCopy,
}) => {
  const initialMeta = resolveLeadMetadata(lead);
  const [formData, setFormData] = useState<LeadEntity>({
    ...lead,
    metadata: initialMeta,
  });
  const [activeWaMode, setActiveWaMode] = useState<WhatsAppScriptMode>(
    initialMeta.telemetry.is_hot_lead ? "followup_hot" : "initial"
  );

  const ttl = calculateDaysRemaining(formData.expires_at);
  const currentMeta = resolveLeadMetadata(formData);
  const activeWaMessage = buildVoseoWhatsAppMessage(formData, activeWaMode);
  const activeWaUrl = buildVoseoWhatsAppUrl(formData, activeWaMode);
  const waUrlPresencial = buildVoseoWhatsAppUrl(formData, "objecion_presencial");
  const waUrlArancelada = buildVoseoWhatsAppUrl(formData, "objecion_arancelada");

  const handleChange = (field: keyof LeadEntity, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleMetaChange = (metaField: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...resolveLeadMetadata(prev),
        [metaField]: val,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const zohoStatusLabel = !currentMeta.email
    ? "Sin Email"
    : currentMeta.email_outreach.status === "sent"
      ? "✉️ Zoho Enviado"
      : "⏳ Pendiente";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl h-full flex flex-col border-l shadow-2xl p-6 overflow-y-auto"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        <div
          className="flex items-center justify-between pb-4 border-b"
          style={{ borderColor: "#1A1D26" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs font-bold text-purple-400">#{formData.id}</span>
              <span className="text-zinc-500 text-xs font-mono truncate">{formData.slug}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  currentMeta.website_bucket === "cubeta_b"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                }`}
              >
                {currentMeta.website_bucket === "cubeta_b" ? "Cubeta B" : "Cubeta A"}
              </span>
              {currentMeta.telemetry.is_hot_lead && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                  🔥 Hot-Lead ({currentMeta.telemetry.views_count} vistas)
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white truncate">{formData.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Gate 0: Email, Zoho Mail, Maps, Reseñas & Telemetría /api/ping */}
        <div
          className="my-4 p-3.5 rounded-xl border space-y-3"
          style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                  !currentMeta.email
                    ? "bg-zinc-900 text-zinc-500 border-zinc-800"
                    : currentMeta.email_outreach.status === "sent"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {zohoStatusLabel}
              </span>
              {currentMeta.qualification.score > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Score {currentMeta.qualification.score}/100 ({currentMeta.qualification.grade})
                </span>
              )}
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                ttl.isExpired
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : ttl.isUrgent
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              TTL: {ttl.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-900">
              <span className="text-zinc-500 block text-[10px]">Email Extraído</span>
              <span className="text-zinc-200 font-mono truncate block">
                {currentMeta.email || "Sin Email"}
              </span>
              {currentMeta.email_outreach.sent_at && (
                <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                  Enviado: {currentMeta.email_outreach.sent_at.slice(0, 16)}
                </span>
              )}
            </div>
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-900">
              <span className="text-zinc-500 block text-[10px]">Telemetría /api/ping</span>
              <span className="text-zinc-200 font-mono block">
                Vistas: {currentMeta.telemetry.views_count} · Clics:{" "}
                {currentMeta.telemetry.cta_clicks}
              </span>
              <span className="text-[10px] text-purple-300 font-mono block mt-0.5">
                Paleta: {currentMeta.telemetry.selected_theme || "Original"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {currentMeta.rating !== null && (
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {currentMeta.rating} ★ ({currentMeta.reviews_count} reseñas en Maps)
              </span>
            )}
            {currentMeta.website_url && (
              <a
                href={currentMeta.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1"
              >
                <Globe className="w-3 h-3" />
                Web Original
              </a>
            )}
            {currentMeta.maps_url && (
              <a
                href={currentMeta.maps_url}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-300 hover:text-white flex items-center gap-1"
              >
                <MapPin className="w-3 h-3 text-purple-400" />
                Google Maps
              </a>
            )}
          </div>

          {currentMeta.website_audit.signals.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentMeta.website_audit.signals.map((sig) => (
                <span
                  key={sig}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  {sig}
                </span>
              ))}
            </div>
          )}

          {currentMeta.reviews_summary.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-zinc-900">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Reseñas Reales de Google Maps ({currentMeta.reviews_summary.length})
              </span>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {currentMeta.reviews_summary.map((rev, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-900 text-[11px] text-zinc-300"
                  >
                    <span className="font-semibold text-white">{rev.author}</span>
                    {rev.rating ? <span className="text-amber-300 ml-1">({rev.rating}★)</span> : null}:{" "}
                    <span className="text-zinc-400">"{rev.text}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Centro Táctico WhatsApp (5 Modos) + Guion Audio 35s */}
        <div
          className="mb-4 p-3.5 rounded-xl border space-y-3"
          style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              WhatsApp Táctico (Anti-Silla Vacía &amp; Cero-Secretaria)
            </span>
            <button
              type="button"
              onClick={onRenewTtl}
              className="py-1 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-purple-300 bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 cursor-pointer"
            >
              <RotateCw className="w-3 h-3 text-purple-400" />
              <span>Renovar +7 Días</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "initial", label: "Inicial" },
                { id: "audio_script", label: "Audio 35s" },
                { id: "followup_hot", label: "🔥 Follow-up Hot" },
                { id: "objecion_presencial", label: "Solo Presencial" },
                { id: "objecion_arancelada", label: "Arancelada" },
              ] as Array<{ id: WhatsAppScriptMode; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveWaMode(tab.id)}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                  activeWaMode === tab.id
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {activeWaMessage}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onCopy(activeWaMessage, `Mensaje WA (${activeWaMode})`)}
              className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-zinc-200 bg-zinc-900 border border-zinc-700 hover:border-purple-500 cursor-pointer"
            >
              <span>📋 Copiar Mensaje WA</span>
            </button>

            {activeWaUrl ? (
              <a
                href={activeWaUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <span>💬 Abrir WhatsApp</span>
              </a>
            ) : (
              <span className="py-2 px-3 rounded-lg text-xs font-mono text-zinc-500 bg-zinc-900/50 border border-zinc-800 text-center">
                Sin teléfono cargado
              </span>
            )}
          </div>

          {/* Guion de Audio de 35s siempre visible */}
          <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-purple-300 font-bold flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                Guion de Audio 35s (Nota de Voz WhatsApp)
              </span>
              <button
                type="button"
                onClick={() => onCopy(currentMeta.audio_script_35s, "Guion Audio 35s")}
                className="text-[10px] font-semibold text-purple-300 hover:text-white cursor-pointer"
              >
                Copiar guion
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              {currentMeta.audio_script_35s}
            </p>
          </div>

          {/* Botones Tácticos Anti-Objeción Directos */}
          {activeWaUrl && (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={waUrlPresencial}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300"
              >
                <span>Objeción: Solo Presencial</span>
              </a>
              <a
                href={waUrlArancelada}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300"
              >
                <span>Objeción: Consulta Arancelada</span>
              </a>
            </div>
          )}

          {formData.demo_url && (
            <a
              href={formData.demo_url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-zinc-300 bg-zinc-900 border border-zinc-800 hover:text-white hover:border-zinc-700"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>Ver Landing en preview.nexobow.site</span>
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Nombre / Razón Social
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Nicho</label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => handleChange("niche", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Ciudad</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Selectores de Embudo Realista (Modalidad, Tipo Consulta, Canal Agenda) */}
          <div className="p-3 rounded-xl border border-zinc-800/80 bg-black/30 space-y-2.5">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold">
              Configuración de Embudo y Turnos
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Modalidad</label>
                <select
                  value={currentMeta.modalidad}
                  onChange={(e) => handleMetaChange("modalidad", e.target.value)}
                  className="w-full py-1.5 px-2 rounded-lg text-[11px] bg-black/60 border border-zinc-800 text-white"
                >
                  <option value="presencial">Presencial</option>
                  <option value="mixto">Mixto</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Tipo Consulta</label>
                <select
                  value={currentMeta.tipo_consulta}
                  onChange={(e) => handleMetaChange("tipo_consulta", e.target.value)}
                  className="w-full py-1.5 px-2 rounded-lg text-[11px] bg-black/60 border border-zinc-800 text-white"
                >
                  <option value="consultar">A coordinar</option>
                  <option value="arancelada">Arancelada</option>
                  <option value="gratuita">Gratuita</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Canal Agenda</label>
                <select
                  value={currentMeta.canal_agenda}
                  onChange={(e) => handleMetaChange("canal_agenda", e.target.value)}
                  className="w-full py-1.5 px-2 rounded-lg text-[11px] bg-black/60 border border-zinc-800 text-white"
                >
                  <option value="whatsapp_secretaria">WA Secretaría</option>
                  <option value="calendly">Calendly</option>
                  <option value="google_calendar">Google Calendar</option>
                  <option value="turnero_externo">Turnero Externo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Email (Zoho Outreach)
              </label>
              <input
                type="email"
                value={currentMeta.email || ""}
                onChange={(e) => handleMetaChange("email", e.target.value || null)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Cubeta Web
              </label>
              <select
                value={currentMeta.website_bucket}
                onChange={(e) => handleMetaChange("website_bucket", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="cubeta_a">Cubeta A (Sin Web / Redes)</option>
                <option value="cubeta_b">Cubeta B (Web Obsoleta)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Teléfono</label>
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Valor Potencial
              </label>
              <input
                type="text"
                value={formData.potential_value}
                onChange={(e) => handleChange("potential_value", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Etapa del Embudo
            </label>
            <select
              value={formData.funnel_status}
              onChange={(e) => {
                handleChange("funnel_status", e.target.value);
                onUpdateStage(e.target.value);
              }}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
            >
              {KANBAN_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Estado de Respuesta
            </label>
            <select
              value={formData.response_status}
              onChange={(e) => handleChange("response_status", e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
            >
              {RESPONSE_STATUSES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Notas / Próximo Paso
            </label>
            <textarea
              rows={3}
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Detalles de la conversación o requerimientos del cliente..."
            />
          </div>

          <div
            className="pt-4 border-t flex items-center justify-between gap-3"
            style={{ borderColor: "#1A1D26" }}
          >
            <button
              type="button"
              onClick={() => {
                handleChange("funnel_status", "6. Descartado");
                onUpdateStage("6. Descartado");
              }}
              className="py-2 px-3 rounded-xl text-xs font-semibold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar Lead</span>
            </button>

            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
              style={{
                backgroundColor: "#BF40FA",
                color: "#FFFFFF",
                boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
              }}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
