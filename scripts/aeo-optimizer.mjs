// scripts/aeo-optimizer.mjs — NexoBow: módulo profundo 100% offline para AEO de prestadores (JSON-LD, /llms.txt, robots.txt e inyección HTML idempotente).

export const RUBRO_SCHEMA_MAP = Object.freeze({
  odontologo: "Dentist",
  clinica: "MedicalClinic",
  nutricionista: "Physician",
  psicologo: "Physician",
  dermatologia: "Physician",
  dermatologo: "Physician",
  estetica: "Physician",
  cirugia: "Physician",
  medico: "Physician",
  kinesiologo: "Physician",
  abogado: "LegalService",
  corporativo: "ProfessionalService",
  consultor: "ProfessionalService",
  tech: "ProfessionalService",
  software: "ProfessionalService",
  sistemas: "ProfessionalService",
  construccion: "ProfessionalService",
  pavimentacion: "ProfessionalService",
  vial: "ProfessionalService",
  ingenieria: "ProfessionalService",
  producto: "ProfessionalService",
  hardware: "ProfessionalService",
  deportes: "ProfessionalService",
  gym: "ProfessionalService",
  entrenador: "ProfessionalService",
  fitness: "ProfessionalService",
  propiedades: "ProfessionalService",
});

const MULTI_STAFF_NAME_RE =
  /\b(centro|cl[ií]nica|instituto|consultorios|equipo\s+m[eé]dico|salud\s+integral)\b/i;

const FQDN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,24}$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const RESERVED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHttpUrl(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return null;
  if (/^(javascript|data|vbscript|file):/i.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeJsonForHtmlScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Valida y normaliza un dominio productivo propio (sin ruta, puerto ni esquema ajeno).
 * Devuelve el hostname limpio (ej. "clinicaejemplo.com.ar") o null si es inválido.
 */
export function normalizeProductionDomain(rawDomain) {
  if (typeof rawDomain !== "string") return null;
  const trimmed = rawDomain.trim().toLowerCase();
  if (!trimmed) return null;

  if (/^(javascript|data|vbscript|ftp|file):/i.test(trimmed)) return null;
  if (/[\s?#\\@]/.test(trimmed)) return null;

  let candidate = trimmed;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      if (parsed.port || parsed.username || parsed.password) return null;
      if (parsed.pathname && parsed.pathname !== "/") return null;
      if (parsed.search || parsed.hash) return null;
      candidate = parsed.hostname.toLowerCase();
    } catch {
      return null;
    }
  } else {
    candidate = candidate.replace(/\/+$/, "");
    if (candidate.includes("/") || candidate.includes(":")) return null;
  }

  candidate = candidate.replace(/\.+$/, "");
  if (!candidate || candidate.length > 253) return null;
  if (RESERVED_LOCAL_HOSTS.has(candidate) || IPV4_RE.test(candidate)) return null;
  if (
    candidate.endsWith(".localhost") ||
    candidate.endsWith(".local") ||
    candidate.endsWith(".invalid")
  ) {
    return null;
  }

  const labels = candidate.split(".");
  if (labels.length < 2) return null;
  if (!labels.every((label) => FQDN_LABEL_RE.test(label))) return null;
  const tld = labels[labels.length - 1];
  if (!TLD_RE.test(tld)) return null;

  return candidate;
}

/**
 * Resuelve el tipo Schema.org según rubro y si se trata de un centro multipersonal.
 */
export function resolveSchemaType(
  rubro = "",
  { isMultiStaff = false, providerName = "" } = {}
) {
  const key = String(rubro || "")
    .toLowerCase()
    .trim();
  const baseType = RUBRO_SCHEMA_MAP[key] || "LocalBusiness";
  if (
    baseType === "Physician" &&
    (isMultiStaff === true || MULTI_STAFF_NAME_RE.test(String(providerName || "")))
  ) {
    return "MedicalBusiness";
  }
  return baseType;
}

function extractContentRoot(siteData = {}) {
  if (siteData && typeof siteData === "object" && siteData.content) {
    return siteData.content;
  }
  return siteData && typeof siteData === "object" ? siteData : {};
}

function resolveCanonicalTarget({ domain, canonicalUrl, siteUrl, slug }) {
  const explicitCanonical = sanitizeHttpUrl(canonicalUrl || siteUrl);
  if (explicitCanonical) return explicitCanonical;

  const cleanDomain = normalizeProductionDomain(domain || "");
  if (cleanDomain) return `https://${cleanDomain}/`;

  const cleanSlug = cleanText(slug).replace(/^\/+|\/+$/g, "");
  if (cleanSlug) return `https://preview.nexobow.site/${cleanSlug}/`;
  return "https://nexobow.site/";
}

function collectServices(content) {
  const rawCollections = [
    content.specialties?.items,
    content.areas?.items,
    content.pasos?.areas,
    content.services?.items,
    content.capabilities?.items,
    content.tratamientos?.items,
    content.treatment_protocol?.plans,
    content.strategic_grid?.items,
  ];
  const services = [];
  const seen = new Set();

  for (const list of rawCollections) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const name = cleanText(item?.nombre || item?.titulo || item?.title || item?.name);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const description = cleanText(item?.descripcion || item?.description || item?.detalle);
      services.push({
        "@type": "Service",
        name,
        ...(description ? { description } : {}),
      });
    }
  }

  const fallbackPlan = cleanText(content.booking?.plan || content.pricing?.plan);
  if (services.length === 0 && fallbackPlan) {
    services.push({
      "@type": "Service",
      name: fallbackPlan,
      ...(cleanText(content.booking?.bajada || content.pricing?.precio_label)
        ? {
            description: cleanText(
              content.booking?.bajada || content.pricing?.precio_label
            ),
          }
        : {}),
    });
  }

  return services;
}

function extractFaqs(content) {
  const rawFaq = Array.isArray(content.faq?.items)
    ? content.faq.items
    : Array.isArray(content.faq)
      ? content.faq
      : [];

  return rawFaq
    .map((item) => ({
      q: cleanText(item?.q || item?.question),
      a: cleanText(item?.a || item?.answer),
    }))
    .filter((item) => item.q && item.a);
}

/**
 * Genera el arreglo determinista [EntitySchema, FAQPage] en JSON-LD para un prestador.
 */
export function buildProviderJsonLd(siteData = {}, options = {}) {
  const content = extractContentRoot(siteData);
  const prestador = content.prestador || {};
  const booking = content.booking || {};
  const footer = content.footer || {};
  const meta = content.meta || {};

  const providerName =
    cleanText(options.name || prestador.nombre || meta.title) || "Profesional de Servicios";
  const schemaType = resolveSchemaType(options.rubro || content.rubro, {
    isMultiStaff: Boolean(
      options.isMultiStaff ?? (Array.isArray(content.team?.members) && content.team.members.length > 1)
    ),
    providerName,
  });

  const targetUrl = resolveCanonicalTarget({
    domain: options.domain,
    canonicalUrl: options.canonicalUrl,
    siteUrl: options.siteUrl,
    slug: options.slug,
  });

  const description =
    cleanText(
      prestador.bajada || meta.description || prestador.enfoque || prestador.bio
    ) || `${providerName} — Atención especializada y turnos online.`;

  const telephone = cleanText(prestador.telefono || footer.telefono);
  const streetAddress = cleanText(prestador.ubicacion || footer.direccion);
  const areaServed = cleanText(options.areaServed) || "Argentina";

  const services = collectServices(content);
  const rawInstagram = String(options.instagram || "").trim();
  const normalizedInstagram = rawInstagram
    ? /^https?:\/\//i.test(rawInstagram)
      ? rawInstagram
      : /^@?[a-z0-9._]{1,64}$/i.test(rawInstagram)
        ? `https://www.instagram.com/${rawInstagram.replace(/^@/, "")}`
        : null
    : null;
  const sameAs = [
    options.googleMaps,
    normalizedInstagram,
    content.links?.calendly,
  ]
    .map(sanitizeHttpUrl)
    .filter(Boolean);

  const entitySchema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: providerName,
    description,
    url: targetUrl,
    ...(telephone ? { telephone } : {}),
    areaServed,
    ...(streetAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressCountry: "AR",
          },
        }
      : {}),
    ...(booking.precio_texto ? { priceRange: cleanText(booking.precio_texto) } : {}),
    ...(services.length > 0
      ? {
          availableService: services,
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `Servicios de ${providerName}`,
            itemListElement: services.map((svc) => ({
              "@type": "Offer",
              itemOffered: svc,
            })),
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs: Array.from(new Set(sameAs)) } : {}),
  };

  const faqEntries = extractFaqs(content);
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return [entitySchema, faqPage];
}

function formatModalityLabel(modalidad) {
  const value = String(modalidad || "").toLowerCase().trim();
  if (value === "presencial") return "Atención presencial";
  if (value === "online") return "Atención online / videollamada";
  if (value === "mixto") return "Atención presencial y online";
  return cleanText(modalidad) || "Consultar modalidad de atención";
}

/**
 * Genera el archivo /llms.txt estructurado en español rioplatense para asistentes de IA.
 */
export function buildProviderLlmsTxt(siteData = {}, options = {}) {
  const content = extractContentRoot(siteData);
  const prestador = content.prestador || {};
  const booking = content.booking || {};
  const pricing = content.pricing || {};
  const footer = content.footer || {};

  const name = cleanText(options.name || prestador.nombre) || "Consultorio Profesional";
  const specialty =
    cleanText(prestador.rol || prestador.subtitulo || options.rubro) ||
    "Atención profesional especializada";
  const summary =
    cleanText(prestador.bajada || content.meta?.description || prestador.bio) ||
    "Atención profesional personalizada con agenda ordenada.";
  const bio = cleanText(prestador.bio);
  const enfoque = cleanText(prestador.enfoque);
  const location = cleanText(prestador.ubicacion || footer.direccion) || "Argentina";
  const modality = formatModalityLabel(booking.modalidad || content.hero?.modalidad);
  const feeText =
    cleanText(booking.precio_texto || pricing.precio_texto) ||
    (booking.tipo_consulta === "gratuita"
      ? "Primera valoración informativa sin cargo"
      : "Arancel a consultar");
  const targetUrl = resolveCanonicalTarget({
    domain: options.domain,
    canonicalUrl: options.canonicalUrl,
    siteUrl: options.siteUrl,
    slug: options.slug,
  });

  const phone = cleanText(prestador.telefono || footer.telefono);
  const whatsappUrl = sanitizeHttpUrl(content.links?.whatsapp || prestador.whatsapp);
  const bookingUrl = sanitizeHttpUrl(prestador.bookingUrl || content.links?.calendly);
  const services = collectServices(content);
  const faqs = extractFaqs(content);

  const lines = [
    `# ${name}`,
    "",
    `> ${specialty}. ${summary}`,
    "",
    "## Datos Principales",
    `- **Sitio oficial:** ${targetUrl}`,
    `- **Especialidad:** ${specialty}`,
    `- **Ubicación y cobertura:** ${location}`,
    `- **Modalidad de atención:** ${modality}`,
    `- **Valor / tipo de consulta:** ${feeText}`,
  ];

  if (phone) lines.push(`- **Teléfono:** ${phone}`);
  if (bookingUrl) lines.push(`- **Canal de agenda:** ${bookingUrl}`);
  if (whatsappUrl && whatsappUrl !== bookingUrl) {
    lines.push(`- **Contacto directo por WhatsApp:** ${whatsappUrl}`);
  }

  if (bio || enfoque) {
    lines.push("", "## Perfil y Criterio Profesional");
    if (bio) lines.push(bio);
    if (enfoque && enfoque !== bio) lines.push("", enfoque);
  }

  if (services.length > 0) {
    lines.push("", "## Especialidades y Prestaciones");
    for (const svc of services) {
      lines.push(
        svc.description
          ? `- **${svc.name}:** ${svc.description}`
          : `- **${svc.name}**`
      );
    }
  }

  if (faqs.length > 0) {
    lines.push("", "## Preguntas Frecuentes");
    for (const item of faqs) {
      lines.push(`- **${item.q}** ${item.a}`);
    }
  }

  lines.push(
    "",
    "## Privacidad y Normativa",
    "- Este sitio cumple con la Ley 25.326 de Protección de Datos Personales de la República Argentina.",
    "- Los datos de consulta se utilizan exclusivamente para responder pedidos de información y coordinar turnos."
  );

  return `${lines.join("\n")}\n`;
}

/**
 * Genera el contenido de robots.txt según el modo productivo o preview no indexable.
 */
export function buildProviderRobotsTxt({
  origin = "",
  allowIndexing = true,
  includeSitemap = false,
} = {}) {
  if (!allowIndexing) {
    return "User-agent: *\nDisallow: /\n";
  }

  const safeOrigin = sanitizeHttpUrl(origin);
  const cleanOrigin = safeOrigin ? safeOrigin.replace(/\/+$/, "") : "";
  const lines = ["User-agent: *", "Allow: /", "Allow: /llms.txt"];

  if (cleanOrigin) {
    lines.push("", `# Índice legible por asistentes de IA: ${cleanOrigin}/llms.txt`);
    if (includeSitemap) {
      lines.push(`Sitemap: ${cleanOrigin}/sitemap.xml`);
    }
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Inyecta de forma idempotente <link rel="canonical">, <meta name="robots"> y JSON-LD en <head>
 * sin agregar JavaScript ejecutable.
 */
export function injectAeoIntoHtml(
  html,
  { jsonLd = null, canonicalUrl = "", indexable = true } = {}
) {
  const source = String(html || "");
  if (!source) return source;

  let cleaned = source
    .replace(/[ \t]*<link\b[^>]*rel=["']canonical["'][^>]*>[ \t]*\r?\n?/gi, "")
    .replace(/[ \t]*<meta\b[^>]*name=["']robots["'][^>]*>[ \t]*\r?\n?/gi, "")
    .replace(
      /[ \t]*<script\b(?=[^>]*\btype=["']application\/ld\+json["'])(?=[^>]*\bdata-nexobow-aeo=["']true["'])[^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi,
      ""
    );

  const tags = [];
  const safeCanonical = sanitizeHttpUrl(canonicalUrl);
  if (safeCanonical) {
    tags.push(`<link rel="canonical" href="${escapeHtmlAttr(safeCanonical)}" />`);
  }

  const robotsContent = indexable ? "index, follow" : "noindex, nofollow";
  tags.push(`<meta name="robots" content="${robotsContent}" />`);

  if (jsonLd !== null && jsonLd !== undefined) {
    tags.push(
      `<script type="application/ld+json" data-nexobow-aeo="true">${safeJsonForHtmlScript(jsonLd)}</script>`
    );
  }

  const block = `${tags.map((t) => `    ${t}`).join("\n")}\n`;
  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/([ \t]*<\/head>)/i, (_match, closing) => `${block}${closing}`);
  }
  return `${block}${cleaned}`;
}
