// theme.ts — Tokens y utilidades de color/tipografía para Lipedema Guru Dermatología & Médicos (clinical-pure).
// Soporta GothicCompact + GroteskText + GroteskMedium nativos con fallback Google Fonts (Poppins / Plus Jakarta Sans + Inter).

export interface Theme {
  primary: string;
  accent: string;
  fondo: string;
  tinta: string;
  fuente: string;
  fuente_sans: string;
  orden_secciones?: string[];
}

export const DEFAULT_THEME: Theme = {
  primary: "#0284c7", // Clinical Medical Blue
  accent: "#e0f2fe",  // Soft Ice
  fondo: "#f8fafc",   // Pure Clinical White
  tinta: "#0f172a",   // Slate Navy profundo
  fuente: "GothicCompact",
  fuente_sans: "GroteskText",
  orden_secciones: [
    "Hero",
    "SymptomAssessment",
    "TreatmentProtocol",
    "ClinicalOutcomes",
    "MedicalBooking",
  ],
};

export function ars(val: number): string {
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(val);
  return `$${formatted} ARS`;
}

export function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function onColor(
  bg: string,
  darkText = DEFAULT_THEME.tinta,
  lightText = DEFAULT_THEME.fondo
): string {
  return luminance(bg) > 0.45 ? darkText : lightText;
}

export function themeVars(tema: Partial<Theme> = {}): string {
  const primary = tema.primary ?? DEFAULT_THEME.primary;
  const accent = tema.accent ?? DEFAULT_THEME.accent;
  const fondo = tema.fondo ?? DEFAULT_THEME.fondo;
  const tinta = tema.tinta ?? DEFAULT_THEME.tinta;
  const fuente = tema.fuente ?? DEFAULT_THEME.fuente;
  const fuenteSans = tema.fuente_sans ?? DEFAULT_THEME.fuente_sans;
  const onPrimary = onColor(primary, tinta, fondo);

  return [
    `--color-primary:${primary}`,
    `--color-accent:${accent}`,
    `--color-paper:${fondo}`,
    `--color-ink:${tinta}`,
    `--color-on-primary:${onPrimary}`,
    `--color-clinical-white:#ffffff`,
    `--color-clinical-border:#e2e8f0`,
    `--color-clinical-blue:#0284c7`,
    `--color-clinical-ice:#e0f2fe`,
    `--color-slate-navy:#0f172a`,
    `--font-display:"${fuente}", "Poppins", -apple-system, sans-serif`,
    `--font-sans:"${fuenteSans}", "Figtree", "DM Sans", -apple-system, system-ui, sans-serif`,
  ].join(";");
}

export function fontUrl(tema: Partial<Theme> = {}): string {
  return `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap`;
}
