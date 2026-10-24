import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME,
  ars,
  luminance,
  onColor,
  themeVars,
  fontUrl,
} from "../src/theme.ts";

test("DEFAULT_THEME contiene los tokens industriales auténticos de Reliable Paving", () => {
  assert.equal(DEFAULT_THEME.primary, "#f59e0b");
  assert.equal(DEFAULT_THEME.accent, "#44403c");
  assert.equal(DEFAULT_THEME.fondo, "#1c1917");
  assert.equal(DEFAULT_THEME.tinta, "#fafaf9");
  assert.equal(DEFAULT_THEME.fuente, "Tahoma");
  assert.equal(DEFAULT_THEME.fuente_sans, "Barlow");
  assert.equal(DEFAULT_THEME.fuente_mono, "Space Mono");
});

test("ars formatea valores en pesos argentinos con sufijo ARS explícito", () => {
  assert.match(ars(189999), /^\$189\.999\sARS$/);
  assert.match(ars(12259), /^\$12\.259\sARS$/);
});

test("luminance calcula luminancia relativa de colores hex", () => {
  assert.ok(luminance("#ffffff") > 0.99);
  assert.ok(luminance("#000000") < 0.01);
  assert.ok(luminance("#1c1917") < 0.1);
  assert.ok(luminance("#f59e0b") > 0.4);
});

test("onColor devuelve color con contraste accesible según el fondo", () => {
  assert.equal(onColor("#ffffff"), "#1c1917");
  assert.equal(onColor("#1c1917"), "#fafaf9");
  // Safety Amber (#f59e0b) tiene luminancia ~0.46, requiere texto oscuro para legibilidad
  assert.equal(onColor("#f59e0b"), "#1c1917");
});

test("themeVars genera variables CSS con la paleta de asfalto y seguridad vial", () => {
  const vars = themeVars({
    primary: "#f59e0b",
    fondo: "#1c1917",
    tinta: "#fafaf9",
  });
  assert.ok(vars.includes("--color-primary:#f59e0b"));
  assert.ok(vars.includes("--color-paper:#1c1917"));
  assert.ok(vars.includes("--color-ink:#fafaf9"));
  assert.ok(vars.includes("--color-asphalt-dark:#1c1917"));
  assert.ok(vars.includes("--color-safety-amber:#f59e0b"));
  assert.ok(vars.includes("--font-display:"));
  assert.ok(vars.includes("--font-sans:"));
});

test("fontUrl genera la URL de Google Fonts con familias industriales", () => {
  const url = fontUrl();
  assert.ok(url.includes("family=Chakra+Petch"));
  assert.ok(url.includes("family=Oswald"));
  assert.ok(url.includes("family=Barlow"));
  assert.ok(url.includes("family=Space+Mono"));
});
