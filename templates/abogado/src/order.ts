export const SECTION_KEYS = [
  "Hero",
  "ValueProposition",
  "PracticeAreas",
  "Attorneys",
  "CaseResults",
  "ConsultationCta",
  "Problem",
  "Steps",
  "Reviews",
  "CaseStudy",
  "Pricing",
  "Faq",
  "FinalCta",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_NAV = [
  { key: "ValueProposition", href: "#enfoque", label: "Enfoque" },
  { key: "PracticeAreas", href: "#practicas", label: "Áreas de Práctica" },
  { key: "Attorneys", href: "#socios", label: "Socios & Equipo" },
  { key: "CaseResults", href: "#casos", label: "Casos & Insights" },
  { key: "ConsultationCta", href: "#consulta", label: "Honorarios" },
  { key: "Problem", href: "#enfoque", label: "El problema" },
  { key: "Steps", href: "#practicas", label: "Método" },
  { key: "Reviews", href: "#socios", label: "Opiniones" },
  { key: "CaseStudy", href: "#casos", label: "Casos" },
  { key: "Pricing", href: "#consulta", label: "Consulta" },
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
