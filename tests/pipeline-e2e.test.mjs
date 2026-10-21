// tests/pipeline-e2e.test.mjs — Test End-to-End completo de la suite Lead-to-Live
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("E2E Pipeline Lead-to-Live Completo", () => {
  const testSlug = "e2e-nutri-test";
  const assetsDir = join(REPO_ROOT, "assets", testSlug);
  const fichePath = join(REPO_ROOT, "clients", `${testSlug}.md`);
  const siteDir = join(REPO_ROOT, "sites", testSlug);

  // Limpieza previa
  if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true, force: true });
  if (existsSync(fichePath)) rmSync(fichePath, { force: true });
  if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });

  console.log("Ejecutando orquestador maestro lead-to-live en modo mock...");
  const e2eRes = spawnSync(
    "node",
    ["scripts/lead-to-live.mjs", "--mock", "--slug", testSlug],
    { cwd: REPO_ROOT, encoding: "utf8" }
  );

  assert.equal(e2eRes.status, 0, `lead-to-live falló con código ${e2eRes.status}:\n${e2eRes.stderr}\n${e2eRes.stdout}`);

  // Verificaciones de artefactos producidos
  assert.ok(existsSync(join(assetsDir, "lead-raw.json")), "lead-raw.json debe existir");
  assert.ok(existsSync(fichePath), "clients/{slug}.md debe existir");
  assert.ok(existsSync(join(siteDir, "src", "site.json")), "site.json debe existir en el sitio clonado");
  assert.ok(existsSync(join(siteDir, "dist", "index.html")), "dist/index.html debe haberse compilado");

  // Verificar 0 scripts en el HTML
  const html = readFileSync(join(siteDir, "dist", "index.html"), "utf8");
  const scripts = (html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []).filter(
    (t) => !/type=["']application\/ld\+json["']/i.test(t)
  );
  assert.equal(scripts.length, 0, "No debe haber ningún script de cliente en el HTML");

  // Limpieza posterior
  rmSync(assetsDir, { recursive: true, force: true });
  rmSync(fichePath, { force: true });
  rmSync(siteDir, { recursive: true, force: true });
  rmSync(join(REPO_ROOT, "dist-previews", testSlug), { recursive: true, force: true });
});
