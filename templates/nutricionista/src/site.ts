import site from "./site.json";

export const THEME = site.tema;
export const CONTENT = site.content;

export const ars = (n: number): string =>
  "$" + n.toLocaleString("es-AR") + " ARS";