export type ThemeTokens = {
  primary?: string;
  accent?: string;
  fondo?: string;
  tinta?: string;
  fuente?: string;
  fuente_sans?: string;
};

export const DEFAULT_THEME = {
  primary: "#D97706",
  accent: "#F7F788",
  fondo: "#090D16",
  tinta: "#F1F5F9",
  fuente: "Archivo",
  fuente_sans: "Inter",
} as const;

export const ars = (n: number): string =>
  "$" + n.toLocaleString("es-AR") + " ARS";

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return [r, g, b];
};

export const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const onColor = (hex: string, tinta = DEFAULT_THEME.tinta, fondo = DEFAULT_THEME.fondo): string =>
  luminance(hex) > 0.18 ? tinta : fondo;

export function themeVars(tema: ThemeTokens): string {
  const t = { ...DEFAULT_THEME, ...tema };
  return [
    `--color-primary:${t.primary}`,
    `--color-accent:${t.accent}`,
    `--color-paper:${t.fondo}`,
    `--color-ink:${t.tinta}`,
    `--color-on-primary:${onColor(t.primary, t.tinta, t.fondo)}`,
    `--font-display:"${t.fuente}",Georgia,serif`,
    `--font-sans:"${t.fuente_sans}",system-ui,sans-serif`,
  ].join(";");
}

export function fontUrl(tema: ThemeTokens): string {
  const t = { ...DEFAULT_THEME, ...tema };
  const display = t.fuente.trim().replace(/ /g, "+");
  const sans = t.fuente_sans.trim().replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${display}:ital,wght@0,300..900;1,300..900&family=${sans}:ital,wght@0,300..900;1,300..900&display=swap`;
}
