export const SECTION_KEYS = [
  "Hero",
  "AthleticAssessment",
  "TrainingPeriodization",
  "AthleteTransformations",
  "TrialBooking",
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
  { key: "AthleticAssessment", href: "#evaluacion", label: "Evaluación Atlética" },
  { key: "TrainingPeriodization", href: "#metodologia", label: "Periodización" },
  { key: "AthleteTransformations", href: "#resultados", label: "Atletas & Récords" },
  { key: "TrialBooking", href: "#agendar", label: "Sesión de Prueba" },
  { key: "Problem", href: "#evaluacion", label: "Diagnóstico" },
  { key: "Steps", href: "#metodologia", label: "Fases" },
  { key: "Reviews", href: "#resultados", label: "Atletas" },
  { key: "CaseStudy", href: "#resultados", label: "Récords" },
  { key: "Pricing", href: "#agendar", label: "Inversión" },
  { key: "Faq", href: "#faq", label: "Preguntas" },
];

const ALIAS_MAP: Record<string, SectionKey> = {
  Problem: "AthleticAssessment",
  Steps: "TrainingPeriodization",
  Reviews: "AthleteTransformations",
  CaseStudy: "AthleteTransformations",
  Pricing: "TrialBooking",
  BookingSection: "TrialBooking",
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
