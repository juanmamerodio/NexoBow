import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("N01 - prospect-batch genera previews en dist-previews/{slug}/ con reporte JSON", async () => {
  // Ejecutamos scripts/prospect-batch.mjs en modo mock con count=2
  const res = spawnSync("node", ["scripts/prospect-batch.mjs", "--mock", "--count", "2"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  assert.equal(res.status, 0, `El script falló con error: ${res.stderr || res.stdout}`);

  // Verificar que la salida estándar contenga un JSON estructurado
  const stdout = res.stdout.trim();
  const jsonMatch = stdout.match(/\{[\s\S]*"leads"[\s\S]*\}/);
  assert.ok(jsonMatch, "La salida estándar debe contener un bloque JSON con 'leads'");

  const report = JSON.parse(jsonMatch[0]);
  assert.equal(report.status, "completed");
  assert.equal(report.total, 2);
  assert.ok(Array.isArray(report.leads));
  assert.equal(report.leads.length, 2);

  for (const lead of report.leads) {
    assert.ok(lead.slug, "Cada lead debe tener un slug");
    assert.ok(lead.previewUrl.startsWith("https://preview.nexobow."), "La previewUrl debe apuntar a preview.nexobow.*");
    
    // Verificar que exista dist-previews/{slug}/index.html
    const previewIndex = join(REPO_ROOT, "dist-previews", lead.slug, "index.html");
    assert.ok(existsSync(previewIndex), `Debe existir ${previewIndex}`);

    const html = readFileSync(previewIndex, "utf8");
    // Verificar 0 scripts en cliente (SSG puro)
    assert.ok(!html.includes("<script"), `La landing demo ${lead.slug} no debe incluir tags <script>`);
    assert.ok(html.includes(lead.nombre), `La landing demo debe incluir el nombre del profesional ${lead.nombre}`);

    // Limpiar artefactos mock generados por el test
    const fichePath = join(REPO_ROOT, "clients", `${lead.slug}.md`);
    const assetsDir = join(REPO_ROOT, "assets", lead.slug);
    const siteDir = join(REPO_ROOT, "sites", lead.slug);
    const previewDir = join(REPO_ROOT, "dist-previews", lead.slug);
    if (existsSync(fichePath)) rmSync(fichePath, { force: true });
    if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true, force: true });
    if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });
    if (existsSync(previewDir)) rmSync(previewDir, { recursive: true, force: true });
  }
  const manifestPath = join(REPO_ROOT, "dist-previews", "manifest.json");
  if (existsSync(manifestPath)) rmSync(manifestPath, { force: true });
});
