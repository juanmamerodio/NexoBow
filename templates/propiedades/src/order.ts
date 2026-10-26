export const SECTION_KEYS = [
  "Hero",
  "PropertyShowcase",
  "DevelopmentSpecs",
  "InvestmentProcess",
  "PrivateTourBooking",
  "Problem",
  "Steps",
  "Reviews",
  "CaseStudy",
  "Pricing",
  "BookingSection",
  "Faq",
  "FinalCta",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_NAV = [
  { key: "PropertyShowcase", href: "#propiedades", label: "Colección Residencial" },
  { key: "DevelopmentSpecs", href: "#especificaciones", label: "Especificaciones Técnicas" },
  { key: "InvestmentProcess", href: "#proceso", label: "Fases de Adquisición" },
  { key: "PrivateTourBooking", href: "#visita", label: "Visita Privada" },
  { key: "Problem", href: "#especificaciones", label: "Especificaciones" },
  { key: "Steps", href: "#proceso", label: "Proceso" },
  { key: "Reviews", href: "#propiedades", label: "Colección" },
  { key: "CaseStudy", href: "#propiedades", label: "Proyectos" },
  { key: "Pricing", href: "#visita", label: "Inversión" },
  { key: "Faq", href: "#faq", label: "Preguntas Frecuentes" },
];

const ALIAS_MAP: Record<string, SectionKey> = {
  Problem: "DevelopmentSpecs",
  Steps: "InvestmentProcess",
  Reviews: "PropertyShowcase",
  CaseStudy: "PropertyShowcase",
  Pricing: "PrivateTourBooking",
  BookingSection: "PrivateTourBooking",
};

export function resolveOrder(order: string[]): SectionKey[] {
  const known = SECTION_KEYS as readonly string[];
  const out: SectionKey[] = [];
  for (const rawKey of [...order, "Faq", "FinalCta"]) {
    if (!known.includes(rawKey)) continue;
    const canonicalKey = ALIAS_MAP[rawKey] || (rawKey as SectionKey);
    if (!out.includes(canonicalKey)) {
      out.push(canonicalKey);
    }
  }
  return out;
}
