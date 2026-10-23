// theme.ts — Tokens y utilidades de color/tipografía para The Performance Lab Deporte & Gym (kinetic-performance).
// Soporta display + diatype + mono atléticos nativos con fallback Google Fonts resiliente.

export interface Theme {
  primary: string;
  accent: string;
  fondo: string;
  tinta: string;
  fuente: string;
  fuente_sans: string;
  fuente_mono?: string;
  orden_secciones?: string[];
}

export const DEFAULT_THEME: Theme = {
  primary: "#10b981", // Kinetic Emerald Green
  accent: "#ffffff",
  fondo: "#0f1419",   // Dark Carbon
  tinta: "#ffffff",
  fuente: "display",
  fuente_sans: "diatype",
  fuente_mono: "mono",
  orden_secciones: [
    "Hero",
    "AthleticAssessment",
    "TrainingPeriodization",
    "AthleteTransformations",
    "TrialBooking",
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
  darkText = "#0f1419",
  lightText = "#ffffff"
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
  const fuenteMono = tema.fuente_mono ?? DEFAULT_THEME.fuente_mono ?? "mono";
  const onPrimary = onColor(primary, fondo, tinta);

  return [
    `--color-primary:${primary}`,
    `--color-accent:${accent}`,
    `--color-paper:${fondo}`,
    `--color-ink:${tinta}`,
    `--color-on-primary:${onPrimary}`,
    `--color-carbon-surface:#171d24`,
    `--color-carbon-surface-light:#1f2937`,
    `--color-carbon-border:#2a3642`,
    `--color-graphite-grey:#1f2937`,
    `--color-kinetic-green:#10b981`,
    `--color-performance-red:#ff350d`,
    `--font-display:"${fuente}", "Barlow Semi Condensed", "Teko", -apple-system, sans-serif`,
    `--font-sans:"${fuenteSans}", "Inter", -apple-system, system-ui, sans-serif`,
    `--font-mono:"${fuenteMono}", "Space Mono", monospace`,
  ].join(";");
}

export function fontUrl(tema: Partial<Theme> = {}): string {
  const fuente = (tema.fuente ?? DEFAULT_THEME.fuente).replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;600;700;800&family=Chivo:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap`;
}
