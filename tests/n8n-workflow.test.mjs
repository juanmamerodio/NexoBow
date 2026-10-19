import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("N05 - workflows/n8n-daily-prospecting.json existe y es un workflow válido de n8n", async () => {
  const workflowPath = join(REPO_ROOT, "workflows", "n8n-daily-prospecting.json");
  const readmePath = join(REPO_ROOT, "workflows", "README.md");

  assert.ok(existsSync(workflowPath), "workflows/n8n-daily-prospecting.json debe existir");
  assert.ok(existsSync(readmePath), "workflows/README.md debe existir");

  const workflow = JSON.parse(readFileSync(workflowPath, "utf8"));
  assert.ok(Array.isArray(workflow.nodes), "El workflow debe tener array de nodes");
  assert.ok(workflow.nodes.some((n) => n.type.includes("scheduleTrigger") || n.type.includes("cron")), "Debe incluir un trigger programado (cron)");
  assert.ok(workflow.nodes.some((n) => n.type.includes("httpRequest")), "Debe incluir nodo HTTP Request para llamar a NexoBow System API");
  assert.ok(workflow.nodes.some((n) => n.type.includes("googleSheets")), "Debe incluir nodo de Google Sheets para sincronizar filas");
});
