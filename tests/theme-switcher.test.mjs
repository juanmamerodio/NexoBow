// tests/theme-switcher.test.mjs — Suite TDD para NexoBow Preview Studio HUD 10x, Paletas Alternativas y Fix WhatsApp (Ticket #50)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  generateAlternativePalettes,
  DEFAULT_ALTERNATIVE_PALETTES,
} from "../scripts/generate-client-fiche.mjs";

const TEN_TEMPLATES = [
  "abogado",
  "clinica",
  "construccion",
  "corporativo",
  "deportes",
  "dermatologia",
  "nutricionista",
  "producto",
  "propiedades",
  "tech",
];

function collectSourceFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(astro|ts|tsx|mjs|js|json)$/i.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

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

test("T-THEME-03 (Ticket #50): 0 ocurrencias de 5491100000000 y presencia del WhatsApp oficial 5493489536088 en los 10 templates", () => {
  for (const rubro of TEN_TEMPLATES) {
    const switcherPath = join(process.cwd(), "templates", rubro, "src", "components", "ThemeSwitcher.astro");
    assert.ok(existsSync(switcherPath), `ThemeSwitcher.astro debe existir en templates/${rubro}/src/components/`);

    const content = readFileSync(switcherPath, "utf8");
    assert.equal(
      content.includes("5491100000000"),
      false,
      `templates/${rubro}/src/components/ThemeSwitcher.astro no debe contener el placeholder 5491100000000`
    );
    assert.match(
      content,
      /juanmaWaPhone\s*=\s*["']5493489536088["']/,
      `templates/${rubro} debe definir juanmaWaPhone = "5493489536088" en Astro`
    );
    assert.match(
      content,
      /JUANMA_PHONE\s*=\s*["']5493489536088["']/,
      `templates/${rubro} debe definir JUANMA_PHONE = "5493489536088" en el script cliente`
    );
    assert.match(
      content,
      /https:\/\/wa\.me\/\$\{juanmaWaPhone\}/,
      `templates/${rubro} debe apuntar el href SSR del botón WhatsApp al número de Juanma`
    );

    const srcFiles = collectSourceFiles(join(process.cwd(), "templates", rubro, "src"));
    for (const filePath of srcFiles) {
      const fileContent = readFileSync(filePath, "utf8");
      assert.equal(
        fileContent.includes("5491100000000"),
        false,
        `El archivo fuente ${filePath} aún contiene el placeholder 5491100000000`
      );
    }
  }
});

test("T-THEME-04 (Ticket #50): Los 10 templates implementan los 5 bloques del NexoBow Preview Studio HUD 10x y despachan theme-switched", () => {
  for (const rubro of TEN_TEMPLATES) {
    const switcherPath = join(process.cwd(), "templates", rubro, "src", "components", "ThemeSwitcher.astro");
    const content = readFileSync(switcherPath, "utf8");

    // Bloque 1: Dock discreto con badge PROTOTIPO CONCEPTUAL · 20% e indicador TTL 7 días
    assert.match(content, /NexoBow Preview Studio HUD/, `templates/${rubro}: falta título/etiqueta NexoBow Preview Studio HUD`);
    assert.match(content, /PROTOTIPO CONCEPTUAL\s*·\s*20%/, `templates/${rubro}: falta badge PROTOTIPO CONCEPTUAL · 20%`);
    assert.match(content, /Reservado 7 días \(TTL\)/, `templates/${rubro}: falta indicador Reservado 7 días (TTL)`);

    // Bloque 2: Aviso contextual sobre fotos ilustrativas
    assert.match(
      content,
      /📸 Foto ilustrativa de prototipo — Se reemplaza por fotos reales de tu consultorio y equipo/,
      `templates/${rubro}: falta aviso contextual de foto ilustrativa`
    );

    // Bloque 3: Modal/drawer comparativo 20% vs. 10x
    assert.match(
      content,
      /✨ Preview \(20%\) vs\. Tu Sistema Final \(10x\)/,
      `templates/${rubro}: falta modal comparativo Preview (20%) vs. Tu Sistema Final (10x)`
    );
    assert.match(content, /subdominio temporal/i, `templates/${rubro}: falta contraste de subdominio temporal (20%)`);
    assert.match(content, /Recepcionista IA 24\/7/i, `templates/${rubro}: falta detalle de Recepcionista IA 24/7 (10x)`);
    assert.match(content, /Recordatorios automáticos 24h\/2h/i, `templates/${rubro}: falta Recordatorios automáticos 24h/2h (10x)`);
    assert.match(content, /lista de espera/i, `templates/${rubro}: falta lista de espera (10x)`);
    assert.match(content, /Posicionamiento AEO/i, `templates/${rubro}: falta Posicionamiento AEO (10x)`);

    // Bloque 4: Mini-simulador interactivo en voseo argentino
    assert.match(
      content,
      /🤖 Probar cómo atiende tu Recepcionista IA/,
      `templates/${rubro}: falta trigger/panel del mini-simulador Recepcionista IA`
    );
    assert.match(content, /Audio/i, `templates/${rubro}: falta referencia a audio/consulta en el simulador`);
    assert.match(content, /turno automatizado confirmado/i, `templates/${rubro}: falta confirmación automática en el simulador`);

    // Bloque 5: Selector de paletas + localStorage + CSS vars + CustomEvent("theme-switched")
    assert.match(content, /localStorage\.setItem/, `templates/${rubro}: falta persistencia en localStorage`);
    assert.match(content, /nexobow_theme/, `templates/${rubro}: falta clave nexobow_theme`);
    assert.match(content, /--color-primary/, `templates/${rubro}: falta mutación de --color-primary`);
    assert.match(content, /--color-accent/, `templates/${rubro}: falta mutación de --color-accent`);
    assert.match(content, /--color-paper/, `templates/${rubro}: falta mutación de --color-paper`);
    assert.match(content, /--color-bg/, `templates/${rubro}: falta mutación de --color-bg`);
    assert.match(content, /--color-ink/, `templates/${rubro}: falta mutación de --color-ink`);
    assert.match(
      content,
      /new\s+CustomEvent\(\s*["']theme-switched["']\s*,\s*\{\s*detail:\s*\{\s*theme:/,
      `templates/${rubro}: debe despachar CustomEvent("theme-switched", { detail: { theme } })`
    );
    assert.match(content, /window\.dispatchEvent/, `templates/${rubro}: debe llamar a window.dispatchEvent`);

    const scriptMatch = content.match(/<script[\s\S]*?<\/script>/);
    assert.ok(scriptMatch, `templates/${rubro}: debe tener bloque <script>`);
    assert.ok(
      scriptMatch[0].length < 2500,
      `templates/${rubro}: el script del ThemeSwitcher debe ser < 2500 bytes (actual: ${scriptMatch[0].length})`
    );
  }
});
