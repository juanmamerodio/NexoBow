import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { INTERNAL_WEB_DIRS } from "../scripts/deploy-previews.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("N02 - deploy-previews despliega dist-previews/ hacia Cloudflare Pages en modo dry-run", () => {
  // Asegurar que existe dist-previews/ con al menos 1 preview
  const distPreviewsDir = join(REPO_ROOT, "dist-previews");
  const testPreviewDir = join(distPreviewsDir, "test-preview-deploy");
  mkdirSync(testPreviewDir, { recursive: true });
  writeFileSync(join(testPreviewDir, "index.html"), "<html><body>Demo Test</body></html>", "utf8");

  try {
    const res = spawnSync("node", ["scripts/deploy-previews.mjs", "--dry-run"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
    });

    assert.equal(res.status, 0, `deploy-previews falló: ${res.stderr || res.stdout}`);
    assert.ok(res.stdout.includes("DRY-RUN"), "La salida debe confirmar modo DRY-RUN");
    assert.ok(res.stdout.includes("nexobow-previews"), "Debe apuntar al proyecto unificado nexobow-previews");
    assert.ok(res.stdout.includes("preview.nexobow."), "Debe mostrar el dominio preview.nexobow.*");

    const subroutesMatch = res.stdout.match(/- Subrutas listas:\s*(.+)/);
    assert.ok(subroutesMatch, "La salida debe listar Subrutas listas:");
    const listedRoutes = subroutesMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    assert.ok(
      listedRoutes.includes("test-preview-deploy"),
      "Subrutas listas debe incluir test-preview-deploy"
    );

    for (const internalDir of [
      "terminos",
      "privacidad",
      "baja-email",
      "images",
      "admin",
      "solicitud-enviada",
      "_astro",
      "_worker.js",
    ]) {
      assert.equal(
        INTERNAL_WEB_DIRS.has(internalDir),
        true,
        `INTERNAL_WEB_DIRS debe incluir ${internalDir}`
      );
      assert.equal(
        listedRoutes.includes(internalDir),
        false,
        `Subrutas listas no debe incluir directorio interno ${internalDir}`
      );
    }
  } finally {
    rmSync(testPreviewDir, { recursive: true, force: true });
  }
});
