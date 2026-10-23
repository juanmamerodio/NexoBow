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
  assert.equal(onColor("#0f172a"), DEFAULT_THEME.fondo);
  assert.equal(onColor("#0284c7"), DEFAULT_THEME.fondo);
});

test("onColor elige texto oscuro sobre fondos claros", () => {
  assert.equal(onColor("#f8fafc"), DEFAULT_THEME.tinta);
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
  const vars = themeVars({ primary: "#0d9488", fuente: "Poppins" });
  assert.ok(vars.includes("--color-primary:#0d9488"));
  assert.ok(vars.includes('--font-display:"Poppins"'));
});

test("on-primary calculado contra el primary override", () => {
  const vars = themeVars({ primary: "#ffffff" });
  assert.ok(vars.includes(`--color-on-primary:${DEFAULT_THEME.tinta}`));
});

test("onColor respeta tinta y fondo custom del tema", () => {
  assert.equal(onColor("#0284c7", "#0f172a", "#ffffff"), "#ffffff");
  assert.equal(onColor("#ffffff", "#0f172a", "#ffffff"), "#0f172a");
});

test("themeVars usa tinta y fondo del tema para on-primary", () => {
  const vars = themeVars({ primary: "#ffffff", tinta: "#0f172a", fondo: "#f8fafc" });
  assert.ok(vars.includes("--color-on-primary:#0f172a"));
});

test("fontUrl incluye familias de fallback clínico (Poppins, Figtree, DM Sans)", () => {
  const url = fontUrl({ fuente: "Poppins" });
  assert.ok(url.includes("family=Poppins"));
  assert.ok(url.includes("family=Figtree"));
  assert.ok(url.includes("family=DM+Sans"));
});
