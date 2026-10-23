export const SECTION_KEYS = [
  "Hero",
  "SymptomAssessment",
  "TreatmentProtocol",
  "ClinicalOutcomes",
  "MedicalBooking",
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
  { key: "SymptomAssessment", href: "#sintomas", label: "Signos Clínicos" },
  { key: "TreatmentProtocol", href: "#protocolos", label: "Protocolos" },
  { key: "ClinicalOutcomes", href: "#ventajas", label: "Ventajas Clínicas" },
  { key: "MedicalBooking", href: "#agendar", label: "Agendar Consulta" },
  { key: "Problem", href: "#sintomas", label: "Diagnóstico" },
  { key: "Steps", href: "#protocolos", label: "Tratamiento" },
  { key: "Reviews", href: "#ventajas", label: "Casos" },
  { key: "CaseStudy", href: "#ventajas", label: "Evidencia" },
  { key: "Pricing", href: "#agendar", label: "Aranceles" },
  { key: "Faq", href: "#faq", label: "Preguntas Frecuentes" },
];

const ALIAS_MAP: Record<string, SectionKey> = {
  Problem: "SymptomAssessment",
  Steps: "TreatmentProtocol",
  Reviews: "ClinicalOutcomes",
  CaseStudy: "ClinicalOutcomes",
  Pricing: "MedicalBooking",
  BookingSection: "MedicalBooking",
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
