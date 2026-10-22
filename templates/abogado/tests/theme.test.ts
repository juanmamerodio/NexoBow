import { test } from "node:test";
import assert from "node:assert/strict";
import { ars, luminance, onColor, themeVars, fontUrl, DEFAULT_THEME } from "../src/theme.ts";

test("ars formatea montos en ARS con separador de miles es-AR", () => {
  assert.equal(ars(0), "$0 ARS");
  assert.equal(ars(186000), "$186.000 ARS");
  assert.equal(ars(10000), "$10.000 ARS");
});

test("luminance devuelve 0 para negro y 1 para blanco", () => {
  assert.equal(luminance("#000000"), 0);
  assert.equal(luminance("#ffffff"), 1);
});

test("onColor elige texto claro sobre primarios oscuros", () => {
  assert.equal(onColor("#090D16"), DEFAULT_THEME.fondo);
  assert.equal(onColor("#111111"), DEFAULT_THEME.fondo);
});

test("onColor elige texto oscuro sobre fondos claros", () => {
  assert.equal(onColor("#f6f6f4"), DEFAULT_THEME.tinta);
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
  const vars = themeVars({ primary: "#0f7a3d", fuente: "Lora" });
  assert.ok(vars.includes("--color-primary:#0f7a3d"));
  assert.ok(vars.includes('--font-display:"Lora"'));
});

test("on-primary calculado contra el primary override", () => {
  const vars = themeVars({ primary: "#fcf3ed" });
  assert.ok(vars.includes(`--color-on-primary:${DEFAULT_THEME.tinta}`));
});

test("onColor respeta tinta y fondo custom del tema", () => {
  assert.equal(onColor("#e70025", "#111111", "#eeeeee"), "#eeeeee");
  assert.equal(onColor("#fcf3ed", "#111111", "#eeeeee"), "#111111");
});

test("themeVars usa tinta y fondo del tema para on-primary", () => {
  const vars = themeVars({ primary: "#e70025", tinta: "#111111", fondo: "#eeeeee" });
  assert.ok(vars.includes("--color-on-primary:#eeeeee"));
});

test("fontUrl escapa espacios del nombre de fuente", () => {
  const url = fontUrl({ fuente: "Playfair Display" });
  assert.ok(url.includes("family=Playfair+Display"));
  assert.ok(url.includes("ital,wght@0,300..900;1,300..900"));
});
