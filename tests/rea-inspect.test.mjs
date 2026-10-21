// tests/rea-inspect.test.mjs — Suite de pruebas TDD para el Inspector REA y Extractor Estético (Issue 16)
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  mapToGoogleFont,
  parseColorPalette,
  extractThemeTokens,
  inspectReaTarget,
  normalizeHexColor,
} from "../scripts/rea-inspect.mjs";

test("T16.1 - normalizeHexColor convierte formatos rgb y hex a hex 6 dígitos normalizado", () => {
  assert.equal(normalizeHexColor("#FFF"), "#ffffff");
  assert.equal(normalizeHexColor("#040607"), "#040607");
  assert.equal(normalizeHexColor("rgb(231, 0, 37)"), "#e70025");
  assert.equal(normalizeHexColor("rgba(252, 243, 237, 0.9)"), "#fcf3ed");
});

test("T16.2 - mapToGoogleFont mapea tipografías comerciales a alternativas abiertas de Google Fonts", () => {
  // Fuentes comerciales de display
  const displayMap = mapToGoogleFont("Trade Gothic Next", "display");
  assert.equal(displayMap.family, "Archivo");
  assert.match(displayMap.googleFontsUrl, /family=Archivo/);

  const futuraMap = mapToGoogleFont("Futura PT", "display");
  assert.equal(futuraMap.family, "Jost");

  const helveticaMap = mapToGoogleFont("Helvetica Neue", "sans");
  assert.equal(helveticaMap.family, "Inter");

  // Si ya es una fuente abierta reconocida o nativa
  const frauncesMap = mapToGoogleFont("Fraunces", "display");
  assert.equal(frauncesMap.family, "Fraunces");

  // Fallback si no se reconoce
  const unknownDisplay = mapToGoogleFont("SuperCustomClosedFont", "display");
  assert.equal(unknownDisplay.family, "Fraunces"); // Serif display default

  const unknownSans = mapToGoogleFont("SuperCustomClosedFont", "sans");
  assert.equal(unknownSans.family, "Inter"); // Sans body default
});

test("T16.3 - parseColorPalette extrae paleta armónica 60-30-10 (fondo, tinta, primary, accent)", () => {
  const cssSample = `
    :root {
      --bg: #fcf3ed;
      --text: #35221a;
      --brand: #e70025;
      --accent: #e3c1ad;
    }
    body {
      background-color: #fcf3ed;
      color: #35221a;
    }
    .hero {
      background: #fcf3ed;
    }
    .cta-btn {
      background-color: #e70025;
      color: #fcf3ed;
      border: 1px solid #e3c1ad;
    }
    p {
      color: #35221a;
    }
  `;

  const palette = parseColorPalette(cssSample);
  assert.ok(palette.fondo, "Debe tener color fondo");
  assert.ok(palette.tinta, "Debe tener color tinta");
  assert.ok(palette.primary, "Debe tener color primary");
  assert.ok(palette.accent, "Debe tener color accent");

  // El fondo debe ser claro (#fcf3ed o cercano) y la tinta oscura (#35221a)
  assert.equal(palette.fondo.toLowerCase(), "#fcf3ed");
  assert.equal(palette.tinta.toLowerCase(), "#35221a");
  assert.equal(palette.primary.toLowerCase(), "#e70025");
});

test("T16.4 - extractThemeTokens devuelve bloque compatible con site.json tema", () => {
  const htmlSample = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <style>
        body { background-color: #FAF6F0; color: #2C2523; font-family: 'Helvetica Neue', sans-serif; }
        h1, h2 { font-family: 'Playfair Display', serif; color: #B45309; }
        .btn { background: #B45309; color: #ffffff; border-radius: 9999px; }
        .badge { background: #FDE68A; }
      </style>
    </head>
    <body>
      <h1>Psicología Clínica y Terapia Cognitiva</h1>
      <p>Consultorio presencial y online.</p>
      <button class="btn">Agendar sesión</button>
    </body>
    </html>
  `;

  const tokens = extractThemeTokens(htmlSample);
  assert.ok(tokens.tema, "Debe incluir clave tema");
  const tema = tokens.tema;

  assert.equal(typeof tema.primary, "string");
  assert.equal(typeof tema.accent, "string");
  assert.equal(typeof tema.fondo, "string");
  assert.equal(typeof tema.tinta, "string");
  assert.equal(typeof tema.fuente, "string");
  assert.equal(typeof tema.fuente_sans, "string");
  assert.ok(Array.isArray(tema.orden_secciones));
  assert.deepEqual(tema.orden_secciones, [
    "Hero",
    "Problem",
    "Steps",
    "Reviews",
    "CaseStudy",
    "Pricing",
  ]);
});

test("T16.5 - inspectReaTarget analiza archivo local y maneja fallos con fallback limpio sin crashear", async () => {
  // 1. Archivo local existente
  const tmpFile = join(tmpdir(), `rea-test-${Date.now()}.html`);
  writeFileSync(
    tmpFile,
    `<style>body{background:#0F172A;color:#F8FAFC;} a{color:#0284C7;}</style><h1>Clinical</h1>`
  );

  const result = await inspectReaTarget(tmpFile);
  unlinkSync(tmpFile);

  assert.equal(result.ok, true);
  assert.ok(result.tema);
  assert.equal(typeof result.tema.primary, "string");
  assert.equal(typeof result.tema.fondo, "string");

  // 2. Ruta inexistente o fallo de red
  const errorResult = await inspectReaTarget("https://invalida-dominio-inexistente-123456789.xyz/fail");
  assert.equal(errorResult.ok, false);
  assert.ok(errorResult.fallback);
  assert.ok(errorResult.fallback.tema);
  assert.equal(errorResult.fallback.tema.fuente, "Fraunces");
  assert.ok(errorResult.message.includes("Fallo de conexión") || errorResult.message.includes("fallback"));
});
