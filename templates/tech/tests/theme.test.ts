import { test } from "node:test";
import assert from "node:assert/strict";
import { ars, luminance, onColor, themeVars, fontUrl, DEFAULT_THEME } from "../src/theme.ts";

test("ars formatea montos en ARS con separador de miles es-AR", () => {
  assert.equal(ars(0), "$0 ARS");
  assert.equal(ars(1250000), "$1.250.000 ARS");
  assert.equal(ars(85000), "$85.000 ARS");
});

test("luminance devuelve 0 para negro y 1 para blanco", () => {
  assert.equal(luminance("#000000"), 0);
  assert.equal(luminance("#ffffff"), 1);
});

test("onColor elige texto claro sobre fondos oscuros", () => {
  assert.equal(onColor("#031b36"), DEFAULT_THEME.fondo);
  assert.equal(onColor("#0b2c52"), DEFAULT_THEME.fondo);
});

test("onColor elige texto oscuro sobre fondos claros", () => {
  assert.equal(onColor("#fdffee"), DEFAULT_THEME.tinta);
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
  const vars = themeVars({ primary: "#ff2c17", fuente: "Syne" });
  assert.ok(vars.includes("--color-primary:#ff2c17"));
  assert.ok(vars.includes('--font-display:"Syne"'));
});

test("on-primary calculado contra el primary override", () => {
  const vars = themeVars({ primary: "#fdffee" });
  assert.ok(vars.includes(`--color-on-primary:${DEFAULT_THEME.tinta}`));
});

test("onColor respeta tinta y fondo custom del tema", () => {
  assert.equal(onColor("#ff2c17", "#031b36", "#fdffee"), "#fdffee");
  assert.equal(onColor("#fdffee", "#031b36", "#fdffee"), "#031b36");
});

test("themeVars usa tinta y fondo del tema para on-primary", () => {
  const vars = themeVars({ primary: "#ff2c17", tinta: "#031b36", fondo: "#fdffee" });
  assert.ok(vars.includes("--color-on-primary:#fdffee"));
});

test("fontUrl escapa espacios del nombre de fuente", () => {
  const url = fontUrl({ fuente: "Familjen Grotesk" });
  assert.ok(url.includes("family=Familjen+Grotesk"));
  assert.ok(url.includes("ital,wght@0,300..900;1,300..900"));
});
