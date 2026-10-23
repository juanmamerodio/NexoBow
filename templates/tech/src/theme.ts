// theme.ts — Tokens y utilidades de color/tipografía para Think Company Tech & Digital Systems (tech-editorial-system).
// Soporta Bagoss + ABC Diatype + Space Mono nativos con fallback Google Fonts resiliente.

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
  primary: "#ff2c17",
  accent: "#b6ffff",
  fondo: "#fdffee",
  tinta: "#031b36",
  fuente: "Bagoss",
  fuente_sans: "ABC Diatype",
  fuente_mono: "Space Mono",
  orden_secciones: [
    "Hero",
    "SystemChallenges",
    "TransformationPhases",
    "ClientCaseStudies",
    "DiscoveryBooking",
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
  return luminance(bg) > 0.55 ? darkText : lightText;
}

export function themeVars(tema: Partial<Theme> = {}): string {
  const primary = tema.primary ?? DEFAULT_THEME.primary;
  const accent = tema.accent ?? DEFAULT_THEME.accent;
  const fondo = tema.fondo ?? DEFAULT_THEME.fondo;
  const tinta = tema.tinta ?? DEFAULT_THEME.tinta;
  const fuente = tema.fuente ?? DEFAULT_THEME.fuente;
  const fuenteSans = tema.fuente_sans ?? DEFAULT_THEME.fuente_sans;
  const fuenteMono = tema.fuente_mono ?? DEFAULT_THEME.fuente_mono ?? "Space Mono";
  const onPrimary = onColor(primary, tinta, fondo);

  return [
    `--color-primary:${primary}`,
    `--color-accent:${accent}`,
    `--color-paper:${fondo}`,
    `--color-ink:${tinta}`,
    `--color-on-primary:${onPrimary}`,
    `--color-surface-navy:#031b36`,
    `--color-surface-navy-light:#0b2c52`,
    `--color-cyan-glow:#b6ffff`,
    `--font-display:"${fuente}", "Syne", "Familjen Grotesk", Georgia, serif`,
    `--font-sans:"${fuenteSans}", "Inter", -apple-system, system-ui, sans-serif`,
    `--font-mono:"${fuenteMono}", monospace`,
  ].join(";");
}

export function fontUrl(tema: Partial<Theme> = {}): string {
  const fuente = (tema.fuente ?? DEFAULT_THEME.fuente).replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${fuente}:ital,wght@0,300..900;1,300..900&display=swap`;
}
