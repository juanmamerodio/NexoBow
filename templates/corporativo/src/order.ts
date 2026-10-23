export const SECTION_KEYS = [
  "Hero",
  "StrategicGrid",
  "ConsultingRoadmap",
  "RoiMetrics",
  "BookingSection",
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
  { key: "StrategicGrid", href: "#servicios", label: "Áreas de Servicio" },
  { key: "ConsultingRoadmap", href: "#metodologia", label: "Metodología" },
  { key: "RoiMetrics", href: "#casos", label: "Casos & ROI" },
  { key: "BookingSection", href: "#agendar", label: "Diagnóstico" },
  { key: "Problem", href: "#servicios", label: "Áreas" },
  { key: "Steps", href: "#metodologia", label: "Método" },
  { key: "Reviews", href: "#casos", label: "Opiniones" },
  { key: "CaseStudy", href: "#casos", label: "Casos" },
  { key: "Pricing", href: "#precios", label: "Inversión" },
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
