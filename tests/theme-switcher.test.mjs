// tests/theme-switcher.test.mjs — Suite TDD para Theme Switcher y Paletas Alternativas (AC-02 / AC-03 / TICK-02 / TICK-03)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  generateAlternativePalettes,
  DEFAULT_ALTERNATIVE_PALETTES,
} from "../scripts/generate-client-fiche.mjs";

test("T-THEME-01: generateAlternativePalettes genera 4 paletas precalibradas incluyendo la original", () => {
  const mainPalette = {
    nombre: "Editorial Delta",
    fondo: "#fcf3ed",
    tinta: "#35221a",
    primary: "#e70025",
    accent: "#e3c1ad",
  };

  const palettes = generateAlternativePalettes(mainPalette);

  assert.equal(Array.isArray(palettes), true);
  assert.equal(palettes.length, 4);

  // 1. Primera paleta es la Original
  assert.equal(palettes[0].nombre, "Editorial Delta");
  assert.equal(palettes[0].fondo, "#fcf3ed");
  assert.equal(palettes[0].primary, "#e70025");

  // 2. Obsidian Gold
  const obsidian = palettes.find((p) => p.nombre.toLowerCase().includes("obsidian"));
  assert.ok(obsidian, "Debe incluir Obsidian Gold");
  assert.equal(obsidian.fondo, "#090D16");
  assert.equal(obsidian.primary, "#D97706");

  // 3. Clinical Cyan
  const clinical = palettes.find((p) => p.nombre.toLowerCase().includes("clinical"));
  assert.ok(clinical, "Debe incluir Clinical Cyan");
  assert.equal(clinical.fondo, "#F8FAFC");
  assert.equal(clinical.primary, "#0284C7");

  // 4. Warm Terracotta / Sand
  const warm = palettes.find((p) => p.nombre.toLowerCase().includes("warm"));
  assert.ok(warm, "Debe incluir Warm Sand / Terracotta");
  assert.equal(warm.fondo, "#FAF6F0");
  assert.equal(warm.primary, "#B45309");

  // Todas deben tener fondo, tinta, primary, accent
  for (const pal of palettes) {
    assert.ok(pal.nombre, "Cada paleta debe tener nombre");
    assert.ok(pal.fondo, "Cada paleta debe tener fondo");
    assert.ok(pal.tinta, "Cada paleta debe tener tinta");
    assert.ok(pal.primary, "Cada paleta debe tener primary");
    assert.ok(pal.accent, "Cada paleta debe tener accent");
  }
});

test("T-THEME-02: Componente ThemeSwitcher.astro existe y cumple con el estándar anti-rebote", () => {
  const switcherPath = join(process.cwd(), "templates", "nutricionista", "src", "components", "ThemeSwitcher.astro");
  assert.ok(existsSync(switcherPath), "ThemeSwitcher.astro debe existir en templates/nutricionista/src/components/");

  const content = readFileSync(switcherPath, "utf8");

  // Debe contener persistencia en localStorage
  assert.match(content, /localStorage\.getItem/);
  assert.match(content, /nexobow_theme/);
  assert.match(content, /localStorage\.setItem/);

  // Debe contener link a WhatsApp de Juanma con mensaje precalibrado
  assert.match(content, /wa\.me/);
  assert.match(content, /me encantó la combinación/);

  // Debe manipular CSS custom properties
  assert.match(content, /--color-primary/);
  assert.match(content, /--color-paper/);
  assert.match(content, /--color-ink/);
  assert.match(content, /--color-accent/);

  // Peso de script debe ser ultra liviano (< 2.5 KB)
  const scriptMatch = content.match(/<script[\s\S]*?<\/script>/);
  assert.ok(scriptMatch, "Debe tener bloque <script> embebido");
  assert.ok(scriptMatch[0].length < 2500, "El script del ThemeSwitcher debe ser ultra liviano (< 2.5 KB)");
});
