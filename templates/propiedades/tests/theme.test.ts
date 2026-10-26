import { test } from "node:test";
import assert from "node:assert/strict";
import { ars, luminance, onColor, themeVars, fontUrl, DEFAULT_THEME } from "../src/theme.ts";

test("ars formatea montos en ARS con separador de miles es-AR", () => {
  assert.equal(ars(0), "$0 ARS");
  assert.equal(ars(89000), "$89.000 ARS");
  assert.equal(ars(135000), "$135.000 ARS");
  assert.equal(ars(189999), "$189.999 ARS");
});

test("luminance devuelve 0 para negro y 1 para blanco", () => {
  assert.equal(luminance("#000000"), 0);
  assert.equal(luminance("#ffffff"), 1);
});

test("onColor elige texto claro sobre fondos oscuros", () => {
  assert.equal(onColor("#1c1917"), DEFAULT_THEME.fondo);
  assert.equal(onColor("#854d0e"), DEFAULT_THEME.fondo);
});

test("onColor elige texto oscuro sobre fondos claros", () => {
  assert.equal(onColor("#fbfbf9"), DEFAULT_THEME.tinta);
  assert.equal(onColor("#ffffff"), DEFAULT_THEME.tinta);
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
  const vars = themeVars({ primary: "#eb663c", fuente: "Outfit" });
  assert.ok(vars.includes("--color-primary:#eb663c"));
  assert.ok(vars.includes('--font-display:"Outfit"'));
});

test("on-primary calculado contra el primary override", () => {
  const vars = themeVars({ primary: "#ffffff" });
  assert.ok(vars.includes(`--color-on-primary:${DEFAULT_THEME.tinta}`));
});

test("onColor respeta tinta y fondo custom del tema", () => {
  assert.equal(onColor("#854d0e", "#1c1917", "#ffffff"), "#ffffff");
  assert.equal(onColor("#ffffff", "#1c1917", "#ffffff"), "#1c1917");
});

test("themeVars usa tinta y fondo del tema para on-primary", () => {
  const vars = themeVars({ primary: "#ffffff", tinta: "#1c1917", fondo: "#fbfbf9" });
  assert.ok(vars.includes("--color-on-primary:#1c1917"));
});

test("fontUrl incluye familias arquitectónicas (Outfit, Manrope, Plus Jakarta Sans)", () => {
  const url = fontUrl({ fuente: "Outfit" });
  assert.ok(url.includes("family=Outfit"));
  assert.ok(url.includes("family=Manrope"));
  assert.ok(url.includes("family=Plus+Jakarta+Sans"));
});
