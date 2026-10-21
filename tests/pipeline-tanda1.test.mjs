// tests/pipeline-tanda1.test.mjs — Test de integración para Tanda 1 (scout-lead -> generate-fiche -> build-site)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Pipeline Tanda 1: Scout Lead -> Generate Fiche -> Build Site", async (t) => {
  const testSlug = "test-nutri-valenzuela";
  const assetsDir = join(REPO_ROOT, "assets", testSlug);
  const rawJsonPath = join(assetsDir, "lead-raw.json");
  const fichePath = join(REPO_ROOT, "clients", `${testSlug}.md`);
  const siteDir = join(REPO_ROOT, "sites", testSlug);

  // Limpieza inicial si existían restos previos
  if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true, force: true });
  if (existsSync(fichePath)) rmSync(fichePath, { force: true });
  if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });

  await t.test("Paso 1: scout-lead genera lead-raw.json con modo mock / Places API data", () => {
    const scoutRes = spawnSync(
      "node",
      ["scripts/scout-lead.mjs", "--mock", "--slug", testSlug],
      { cwd: REPO_ROOT, encoding: "utf8" }
    );
    assert.equal(scoutRes.status, 0, `scout-lead falló con código ${scoutRes.status}:\n${scoutRes.stderr}`);
    assert.ok(existsSync(rawJsonPath), "lead-raw.json debe existir en assets/{slug}");

    const raw = JSON.parse(readFileSync(rawJsonPath, "utf8"));
    assert.equal(raw.slug, testSlug);
    assert.ok(raw.nombre.length > 0, "Debe tener nombre");
    assert.ok(raw.telefono.length > 0, "Debe tener teléfono");
    assert.ok(Array.isArray(raw.reviews) && raw.reviews.length >= 2, "Debe tener reseñas");
  });

  await t.test("Paso 2: generate-client-fiche genera ficha .md con compliance y fallback", () => {
    const genRes = spawnSync(
      "node",
      ["scripts/generate-client-fiche.mjs", `assets/${testSlug}/lead-raw.json`],
      { cwd: REPO_ROOT, encoding: "utf8" }
    );
    assert.equal(genRes.status, 0, `generate-client-fiche falló con código ${genRes.status}:\n${genRes.stderr}`);
    assert.ok(existsSync(fichePath), "La ficha clients/{slug}.md debe existir");

    const content = readFileSync(fichePath, "utf8");
    assert.match(content, /rubro:\s*nutricionista/i);
    assert.match(content, /slug:\s*"test-nutri-valenzuela"/);
    assert.match(content, /consentimiento_testimonios:\s*false/);
    assert.match(content, /Google Maps/);
    assert.match(content, /## Bio/);
    assert.match(content, /## Enfoque/);
    assert.match(content, /## Reseñas/);
    assert.match(content, /## Casos de éxito/);
    assert.match(content, /## Preguntas frecuentes/);
  });

  await t.test("Paso 3: build-client-site clona, copia assets, pasa 16 tests unitarios y compila Astro SSG", () => {
    const buildRes = spawnSync(
      "node",
      ["scripts/build-client-site.mjs", `clients/${testSlug}.md`],
      { cwd: REPO_ROOT, encoding: "utf8" }
    );
    assert.equal(buildRes.status, 0, `build-client-site falló con código ${buildRes.status}:\n${buildRes.stderr}`);

    const siteJsonPath = join(siteDir, "src", "site.json");
    assert.ok(existsSync(siteJsonPath), "site.json debe existir en el clon");

    const distHtml = join(siteDir, "dist", "index.html");
    assert.ok(existsSync(distHtml), "dist/index.html debe haberse generado tras build");
  });

  // Limpieza post-test para no dejar residuos en el working tree
  if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true, force: true });
  if (existsSync(fichePath)) rmSync(fichePath, { force: true });
  if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });
  rmSync(join(REPO_ROOT, "dist-previews", testSlug), { recursive: true, force: true });
});
