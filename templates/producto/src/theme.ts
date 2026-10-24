// theme.ts — Tokens y utilidades de color/tipografía para Heavn One Hardware & Producto Específico (minimalist-hardware).
// Soporta Space Grotesk/Plus Jakarta Sans + Open Sans nativa con fallback Google Fonts resiliente.

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
  primary: "#2563eb", // Laser Blue
  accent: "#60a5fa",  // Laser Light Blue
  fondo: "#0a0a0a",   // Deep Matte Black
  tinta: "#fafafa",   // Pure White
  fuente: "Averta",
  fuente_sans: "Averta",
  fuente_mono: "Space Mono",
  orden_secciones: [
    "Hero",
    "OpticalEngineering",
    "MaterialsCraftsmanship",
    "CustomerExperiences",
    "OrderCheckoutSection",
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
  darkText = "#0a0a0a",
  lightText = "#fafafa"
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
  const onPrimary = onColor(primary, fondo, tinta);

  return [
    `--color-primary:${primary}`,
    `--color-accent:${accent}`,
    `--color-paper:${fondo}`,
    `--color-ink:${tinta}`,
    `--color-on-primary:${onPrimary}`,
    `--color-hardware-surface:#141417`,
    `--color-hardware-surface-light:#1c1c21`,
    `--color-hardware-border:#27272a`,
    `--color-metallic-edge:#3f3f46`,
    `--font-display:"${fuente}", "Averta", -apple-system, sans-serif`,
    `--font-sans:"${fuenteSans}", "Averta", -apple-system, system-ui, sans-serif`,
    `--font-mono:"${fuenteMono}", "Space Mono", monospace`,
  ].join(";");
}

export function fontUrl(tema: Partial<Theme> = {}): string {
  return `https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap`;
}
