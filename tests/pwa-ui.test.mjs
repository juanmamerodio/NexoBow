import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("N04 - public/index.html y manifest.webmanifest existen para la PWA móvil", async () => {
  const pwaHtml = join(REPO_ROOT, "public", "index.html");
  const pwaManifest = join(REPO_ROOT, "public", "manifest.webmanifest");

  assert.ok(existsSync(pwaHtml), "public/index.html debe existir");
  assert.ok(existsSync(pwaManifest), "public/manifest.webmanifest debe existir");

  const html = readFileSync(pwaHtml, "utf8");
  assert.ok(html.includes("NexoBow System"), "Debe tener título NexoBow System");
  assert.ok(html.includes("manifest.webmanifest"), "Debe enlazar al manifest de la PWA");
  assert.ok(html.includes("NEXOBOW_SYSTEM_KEY") || html.includes("token"), "Debe incluir soporte para Token/PIN");
  assert.ok(html.includes("wa.me"), "Debe soportar links directos de WhatsApp");

  const manifest = JSON.parse(readFileSync(pwaManifest, "utf8"));
  assert.equal(manifest.name, "NexoBow System");
  assert.equal(manifest.display, "standalone");
});
