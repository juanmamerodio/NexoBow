// theme.ts — Tokens y utilidades de color/tipografía para Reliable Paving Construcción & Pavimentación (industrial-authority).
// Soporta tipografía de alto impacto industrial con fuentes originales Tahoma/Roboto y fallback Google Fonts resiliente.

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
  primary: "#f59e0b", // Safety Amber
  accent: "#44403c",  // Heavy Steel
  fondo: "#1c1917",   // Asphalt Dark
  tinta: "#fafaf9",   // Concrete White
  fuente: "Tahoma",
  fuente_sans: "Barlow",
  fuente_mono: "Space Mono",
  orden_secciones: [
    "Hero",
    "IndustrialCapabilities",
    "CompletedProjects",
    "SafetyCertifications",
    "QuoteEstimationSection",
    "Faq",
    "FinalCta",
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
  darkText = "#1c1917",
  lightText = "#fafaf9"
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
  const fuenteMono = tema.fuente_mono ?? DEFAULT_THEME.fuente_mono ?? "Space Mono";
  const onPrimary = onColor(primary, "#1c1917", "#fafaf9");

  return [
    `--color-primary:${primary}`,
    `--color-accent:${accent}`,
    `--color-paper:${fondo}`,
    `--color-ink:${tinta}`,
    `--color-on-primary:${onPrimary}`,
    `--color-asphalt-dark:#1c1917`,
    `--color-asphalt-surface:#292524`,
    `--color-asphalt-border:#44403c`,
    `--color-safety-amber:#f59e0b`,
    `--color-safety-warning:#fbbf24`,
    `--color-heavy-steel:#44403c`,
    `--color-concrete-white:#fafaf9`,
    `--font-display:"${fuente}", "Oswald", "Chakra Petch", -apple-system, sans-serif`,
    `--font-sans:"${fuenteSans}", "Barlow", -apple-system, system-ui, sans-serif`,
    `--font-mono:"${fuenteMono}", "Space Mono", monospace`,
  ].join(";");
}

export function fontUrl(tema: Partial<Theme> = {}): string {
  return `https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Oswald:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap`;
}
