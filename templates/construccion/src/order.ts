export const SECTION_KEYS = [
  "Hero",
  "IndustrialCapabilities",
  "CompletedProjects",
  "SafetyCertifications",
  "QuoteEstimationSection",
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
  { key: "IndustrialCapabilities", href: "#capacidades", label: "Capacidad Operativa" },
  { key: "CompletedProjects", href: "#obras", label: "Obras Ejecutadas" },
  { key: "SafetyCertifications", href: "#certificaciones", label: "Normativas & Seguridad" },
  { key: "QuoteEstimationSection", href: "#cotizar", label: "Cotización en Obra" },
  { key: "Problem", href: "#capacidades", label: "Capacidades" },
  { key: "Steps", href: "#obras", label: "Obras" },
  { key: "Reviews", href: "#obras", label: "Proyectos" },
  { key: "CaseStudy", href: "#obras", label: "Casos" },
  { key: "Pricing", href: "#cotizar", label: "Presupuesto" },
  { key: "Faq", href: "#faq", label: "Preguntas Técnicas" },
];

const ALIAS_MAP: Record<string, SectionKey> = {
  Problem: "IndustrialCapabilities",
  Steps: "CompletedProjects",
  Reviews: "CompletedProjects",
  CaseStudy: "CompletedProjects",
  Pricing: "QuoteEstimationSection",
  BookingSection: "QuoteEstimationSection",
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
