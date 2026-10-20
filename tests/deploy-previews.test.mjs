import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("N02 - deploy-previews despliega dist-previews/ hacia Cloudflare Pages en modo dry-run", async () => {
  // Asegurar que existe dist-previews/ con al menos 1 preview
  const distPreviewsDir = join(REPO_ROOT, "dist-previews");
  const testPreviewDir = join(distPreviewsDir, "test-preview-deploy");
  mkdirSync(testPreviewDir, { recursive: true });
  writeFileSync(join(testPreviewDir, "index.html"), "<html><body>Demo Test</body></html>", "utf8");

  const res = spawnSync("node", ["scripts/deploy-previews.mjs", "--dry-run"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  assert.equal(res.status, 0, `deploy-previews falló: ${res.stderr || res.stdout}`);
  assert.ok(res.stdout.includes("DRY-RUN"), "La salida debe confirmar modo DRY-RUN");
  assert.ok(res.stdout.includes("nexobow-previews"), "Debe apuntar al proyecto unificado nexobow-previews");
  assert.ok(res.stdout.includes("preview.nexobow."), "Debe mostrar el dominio preview.nexobow.*");
});
