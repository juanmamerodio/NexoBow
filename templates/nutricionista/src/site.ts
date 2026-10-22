import site from "./site.json";
import type { ThemeTokens } from "./theme";
import { ars, fontUrl, onColor, themeVars } from "./theme";

export const THEME: ThemeTokens & { orden_secciones: string[] } = site.tema;
export const CONTENT = site.content;
export const PALETAS_ALTERNATIVAS = (site as { paletas_alternativas?: any[] }).paletas_alternativas || [];

export { ars, fontUrl, onColor, themeVars };
