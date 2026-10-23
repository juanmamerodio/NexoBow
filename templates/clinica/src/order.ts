export const SECTION_KEYS = [
  "Hero",
  "SpecialtiesShowcase",
  "TechnologyDiagnostics",
  "MedicalTeam",
  "PatientJourney",
  "FacilitiesShowcase",
  "ClinicalReviews",
  "BookingScheduler",
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
  { key: "SpecialtiesShowcase", href: "#especialidades", label: "Especialidades" },
  { key: "TechnologyDiagnostics", href: "#tecnologia", label: "Tecnología 3D" },
  { key: "MedicalTeam", href: "#equipo", label: "Equipo Médico" },
  { key: "PatientJourney", href: "#proceso", label: "El Proceso" },
  { key: "FacilitiesShowcase", href: "#instalaciones", label: "Instalaciones" },
  { key: "ClinicalReviews", href: "#casos", label: "Casos & Opiniones" },
  { key: "BookingScheduler", href: "#agendar", label: "Agendar" },
  { key: "Problem", href: "#especialidades", label: "Enfoque" },
  { key: "Steps", href: "#proceso", label: "Método" },
  { key: "Reviews", href: "#casos", label: "Opiniones" },
  { key: "CaseStudy", href: "#tecnologia", label: "Tecnología" },
  { key: "Pricing", href: "#agendar", label: "Consulta" },
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
