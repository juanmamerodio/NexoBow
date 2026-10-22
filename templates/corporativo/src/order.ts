export const SECTION_KEYS = [
  "Hero",
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
  { key: "Problem", href: "#problema", label: "El problema" },
  { key: "Steps", href: "#metodo", label: "Método" },
  { key: "Reviews", href: "#opiniones", label: "Opiniones" },
  { key: "CaseStudy", href: "#casos", label: "Casos" },
  { key: "Pricing", href: "#precios", label: "Precios" },
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
