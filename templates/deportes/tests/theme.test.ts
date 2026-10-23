import { test } from "node:test";
import assert from "node:assert/strict";
import { ars, luminance, onColor, themeVars, fontUrl, DEFAULT_THEME } from "../src/theme.ts";

test("ars formatea montos en ARS con separador de miles es-AR", () => {
  assert.equal(ars(0), "$0 ARS");
  assert.equal(ars(89000), "$89.000 ARS");
  assert.equal(ars(189999), "$189.999 ARS");
});

test("luminance devuelve 0 para negro y 1 para blanco", () => {
  assert.equal(luminance("#000000"), 0);
  assert.equal(luminance("#ffffff"), 1);
});

test("onColor elige texto claro sobre fondos oscuros", () => {
  assert.equal(onColor("#0f1419"), DEFAULT_THEME.tinta);
  assert.equal(onColor("#171d24"), DEFAULT_THEME.tinta);
});

test("onColor elige texto oscuro sobre fondos claros", () => {
  assert.equal(onColor("#10b981"), DEFAULT_THEME.fondo);
  assert.equal(onColor("#ffffff"), DEFAULT_THEME.fondo);
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
  const vars = themeVars({ primary: "#ff350d", fuente: "Teko" });
  assert.ok(vars.includes("--color-primary:#ff350d"));
  assert.ok(vars.includes('--font-display:"Teko"'));
});

test("on-primary calculado contra el primary override", () => {
  const vars = themeVars({ primary: "#ffffff" });
  assert.ok(vars.includes(`--color-on-primary:${DEFAULT_THEME.fondo}`));
});

test("onColor respeta tinta y fondo custom del tema", () => {
  assert.equal(onColor("#10b981", "#0f1419", "#ffffff"), "#0f1419");
  assert.equal(onColor("#0f1419", "#0f1419", "#ffffff"), "#ffffff");
});

test("themeVars usa tinta y fondo del tema para on-primary", () => {
  const vars = themeVars({ primary: "#10b981", tinta: "#ffffff", fondo: "#0f1419" });
  assert.ok(vars.includes("--color-on-primary:#0f1419"));
});

test("fontUrl incluye familias de fallback atlético", () => {
  const url = fontUrl({ fuente: "Barlow Semi Condensed" });
  assert.ok(url.includes("family=Barlow+Semi+Condensed"));
  assert.ok(url.includes("family=Chivo"));
  assert.ok(url.includes("family=Space+Mono"));
});
