export const SECTION_KEYS = [
  "Hero",
  "OpticalEngineering",
  "MaterialsCraftsmanship",
  "CustomerExperiences",
  "OrderCheckoutSection",
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
  { key: "OpticalEngineering", href: "#ingenieria-optica", label: "Ingeniería Óptica" },
  { key: "MaterialsCraftsmanship", href: "#materiales", label: "Materiales & Despiece" },
  { key: "CustomerExperiences", href: "#experiencias", label: "Líderes & Premios" },
  { key: "OrderCheckoutSection", href: "#configurar", label: "Especificaciones & Pedido" },
  { key: "Problem", href: "#ingenieria-optica", label: "Óptica" },
  { key: "Steps", href: "#materiales", label: "Despiece" },
  { key: "Reviews", href: "#experiencias", label: "Reseñas" },
  { key: "CaseStudy", href: "#experiencias", label: "Premios" },
  { key: "Pricing", href: "#configurar", label: "Inversión" },
  { key: "Faq", href: "#faq", label: "Garantía & FAQ" },
];

const ALIAS_MAP: Record<string, SectionKey> = {
  Problem: "OpticalEngineering",
  Steps: "MaterialsCraftsmanship",
  Reviews: "CustomerExperiences",
  CaseStudy: "CustomerExperiences",
  Pricing: "OrderCheckoutSection",
  BookingSection: "OrderCheckoutSection",
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
