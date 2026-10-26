// theme.ts — Tokens y utilidades de color/tipografía para Lufte Propiedades & Bienes Raíces (architectural-spaces).
// Soporta Outfit + Manrope nativos con fallback Google Fonts (Outfit + Manrope + Plus Jakarta Sans).

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
  primary: "#854d0e", // Bronze Oak cálido
  accent: "#e7e5e4",  // Arena Neutra
  fondo: "#fbfbf9",   // Mineral Tiza
  tinta: "#1c1917",   // Stone Ink profundo
  fuente: "Outfit",
  fuente_sans: "Manrope",
  orden_secciones: [
    "Hero",
    "PropertyShowcase",
    "DevelopmentSpecs",
    "InvestmentProcess",
    "PrivateTourBooking",
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
    `--color-stone-border:${tinta === "#1c1917" ? "rgba(28, 25, 23, 0.12)" : "rgba(255, 255, 255, 0.15)"}`,
    `--font-display:"${fuente}", "Plus Jakarta Sans", sans-serif`,
    `--font-sans:"${fuenteSans}", "Plus Jakarta Sans", -apple-system, system-ui, sans-serif`,
  ].join(";");
}

export function fontUrl(tema: Partial<Theme> = {}): string {
  return `https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap`;
}
