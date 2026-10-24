import { test } from "node:test";
import assert from "node:assert/strict";
import { ars, luminance, onColor, themeVars, fontUrl, DEFAULT_THEME } from "../src/theme.ts";

test("ars formatea montos en ARS con separador de miles es-AR", () => {
  assert.equal(ars(0), "$0 ARS");
  assert.equal(ars(189999), "$189.999 ARS");
  assert.equal(ars(1250000), "$1.250.000 ARS");
});

test("luminance devuelve 0 para negro y 1 para blanco", () => {
  assert.equal(luminance("#000000"), 0);
  assert.equal(luminance("#ffffff"), 1);
});

test("onColor elige texto claro sobre fondos oscuros", () => {
  assert.equal(onColor("#0a0a0a"), DEFAULT_THEME.tinta);
  assert.equal(onColor("#2563eb"), DEFAULT_THEME.tinta);
});

test("onColor elige texto oscuro sobre fondos claros", () => {
  assert.equal(onColor("#ffffff"), DEFAULT_THEME.fondo);
  assert.equal(onColor("#fafafa"), DEFAULT_THEME.fondo);
});

test("themeVars aplica defaults del arquetipo cuando el tema no define tokens", () => {
  const vars = themeVars({});
  assert.ok(vars.includes(`--color-primary:${DEFAULT_THEME.primary}`));
  assert.ok(vars.includes(`--color-paper:${DEFAULT_THEME.fondo}`));
  assert.ok(vars.includes(`--color-ink:${DEFAULT_THEME.tinta}`));
  assert.ok(vars.includes(`--font-display:"${DEFAULT_THEME.fuente}"`));
  assert.ok(vars.includes(`--font-sans:"${DEFAULT_THEME.fuente_sans}"`));
});

test("themeVars respeta overrides del tema", () => {
  const vars = themeVars({ primary: "#38bdf8", fuente: "Averta" });
  assert.ok(vars.includes("--color-primary:#38bdf8"));
  assert.ok(vars.includes('--font-display:"Averta"'));
});

test("fontUrl incluye familias de precisión técnica (Space Mono)", () => {
  const url = fontUrl({ fuente: "Averta" });
  assert.ok(url.includes("family=Space+Mono"));
});
