export const SECTION_KEYS = [
  "Hero",
  "SystemChallenges",
  "TransformationPhases",
  "ClientCaseStudies",
  "DiscoveryBooking",
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
  { key: "SystemChallenges", href: "#desafios", label: "Desafíos de Sistemas" },
  { key: "TransformationPhases", href: "#fases", label: "Fases de Ingeniería" },
  { key: "ClientCaseStudies", href: "#casos", label: "Casos & ROI" },
  { key: "DiscoveryBooking", href: "#agendar", label: "Descubrimiento" },
  { key: "Problem", href: "#desafios", label: "Desafíos" },
  { key: "Steps", href: "#fases", label: "Fases" },
  { key: "Reviews", href: "#casos", label: "Opiniones" },
  { key: "CaseStudy", href: "#casos", label: "Casos" },
  { key: "Pricing", href: "#agendar", label: "Inversión" },
  { key: "Faq", href: "#faq", label: "Preguntas" },
];

export function resolveOrder(order: string[]): SectionKey[] {
  const known = SECTION_KEYS as readonly string[];
  const out: string[] = [];
  for (const key of [...order, "Faq", "FinalCta"]) {
    if (known.includes(key) && !out.includes(key)) out.push(key);
  }
  return out as SectionKey[];
}
