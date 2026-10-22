import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("T-SAFARI-01: Layout de web/ debe definir compatibilidad visual con Safari/iOS", () => {
  const layoutPath = join(REPO_ROOT, "web", "src", "layouts", "Layout.astro");
  assert.ok(existsSync(layoutPath), "Layout.astro debe existir");
  const content = readFileSync(layoutPath, "utf8");

  // Meta theme-color para evitar pantalla blanca antes de render
  assert.ok(content.includes('name="theme-color"'), "Debe incluir meta theme-color para Safari/iOS");
  assert.ok(content.includes('#040607'), "El theme-color debe coincidir con la paleta de fondo Soft-Obsidian (#040607)");
});

test("T-SAFARI-02: global.css debe incluir aceleración por hardware / antialiasing para Webkit", () => {
  const cssPath = join(REPO_ROOT, "web", "src", "styles", "global.css");
  assert.ok(existsSync(cssPath), "global.css debe existir");
  const content = readFileSync(cssPath, "utf8");

  assert.ok(content.includes("-webkit-font-smoothing"), "Debe definir -webkit-font-smoothing");
  assert.ok(content.includes("backdrop-filter"), "Debe declarar prefijo o soporte para backdrop-filter");
});
