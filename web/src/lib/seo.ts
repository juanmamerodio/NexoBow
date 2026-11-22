export const SITE_ORIGIN = "https://nexobow.site";

export interface FaqItem {
  q: string;
  a: string;
  linkHref?: string;
  linkLabel?: string;
  secondaryLinkHref?: string;
  secondaryLinkLabel?: string;
}

/**
 * Garantiza que todo título público incluya explícitamente la marca "NexoBow".
 */
export function normalizeBrandTitle(rawTitle: string): string {
  const clean = (rawTitle || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return "NexoBow";
  }
  if (/nexobow/i.test(clean)) {
    return clean;
  }
  return `${clean} | NexoBow`;
}

/**
 * Construye una URL canónica absoluta con barra final consistente en rutas públicas.
 */
export function buildCanonicalUrl(
  pathname: string,
  baseSite: string = SITE_ORIGIN
): string {
  const origin = baseSite.replace(/\/+$/, "");
  const cleanPath = (pathname || "/").split("?")[0].split("#")[0].trim() || "/";
  if (cleanPath === "/") {
    return `${origin}/`;
  }
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  if (/\.[a-z0-9]+$/i.test(normalizedPath)) {
    return `${origin}${normalizedPath}`;
  }
  return `${origin}${normalizedPath.replace(/\/+$/, "")}/`;
}

/**
 * Genera los esquemas JSON-LD principales (ProfessionalService + FAQPage) orientados a búsquedas reales +40.
 */
export function buildHomeJsonLd(faqs: FaqItem[]): Record<string, unknown>[] {
  const professionalService = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "NexoBow",
    url: SITE_ORIGIN,
    description:
      "Diseño de páginas web para consultorios médicos, odontólogos, nutricionistas, psicólogos y estudios jurídicos en Argentina. Sistema de turnos online por WhatsApp y optimización en Google Maps.",
    telephone: "+54 9 3489 53-6088",
    email: "juanma@nexobow.site",
    areaServed: "Argentina",
    serviceArea: ["CABA", "Zona Norte", "Campana", "Zárate", "Argentina"],
    priceRange: "$189.999 ARS - $549.999 ARS",
    founder: {
      "@type": "Person",
      name: "Juanma Merodio",
      url: "https://juanmamerodio.github.io/cv",
    },
    serviceType: [
      "Página web para consultorio médico",
      "Diseño web para nutricionistas y psicólogos",
      "Página web para odontólogos argentina",
      "Página web para estudio jurídico y abogados en Argentina",
      "Sistema de turnos online con WhatsApp",
      "Optimización de ficha en Google Maps para consultorios",
    ],
    sameAs: ["https://www.afterbow.com", "https://juanmamerodio.github.io/cv"],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return [professionalService, faqPage];
}
