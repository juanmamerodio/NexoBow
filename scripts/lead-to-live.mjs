// scripts/lead-to-live.mjs — NexoBow: orquestador maestro end-to-end (Lead -> Ficha -> Build -> Audit -> Deploy)
// Uso: node scripts/lead-to-live.mjs --query "NutriAr, Campana" [--slug nutriar] [--deploy] [--mock]
// Códigos de salida: 0 = pipeline completado · 1 = fallo en alguna fase

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function runStep(name, cmd, args) {
  console.log(`\n\x1b[35m[lead-to-live] ▶ FASE: ${name}\x1b[0m`);
  const res = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    console.error(`\x1b[31m[lead-to-live ERROR]\x1b[0m La fase "${name}" falló con código ${res.status}.`);
    process.exit(1);
  }
}

async function main() {
  const flags = parseArgs();
  const query = flags.query || flags.q;
  const isMock = Boolean(flags.mock);
  const shouldDeploy = Boolean(flags.deploy);

  if (!query && !isMock) {
    console.error(`\x1b[31m[lead-to-live ERROR]\x1b[0m Indicá la consulta de prospección o usá --mock:
  node scripts/lead-to-live.mjs --query "NutriAr, Belgrano 1221, Campana" [--deploy]
  o para prueba rápida:
  node scripts/lead-to-live.mjs --mock`);
    process.exit(2);
  }

  console.log(`
\x1b[35m=======================================================
⚡ NEXOBOW — PIPELINE AUTOMATIZADO LEAD-TO-LIVE
=======================================================\x1b[0m
- Modo: ${isMock ? "Demostración / Mock" : `Búsqueda real: "${query}"`}
- Despliegue: ${shouldDeploy ? "Producción Cloudflare Pages" : "Simulación Local (Dry-Run)"}
`);

  // 1. Scout Lead
  const scoutArgs = ["scripts/scout-lead.mjs"];
  if (isMock) scoutArgs.push("--mock");
  if (query) scoutArgs.push("--query", query);
  if (flags.slug) scoutArgs.push("--slug", flags.slug);
  runStep("1. Scout Lead (Extracción con Google Maps Platform)", "node", scoutArgs);

  // Determinar slug generado
  let slug = flags.slug;
  if (!slug) {
    // Si no se pasó slug explícito, buscar el archivo más recientemente creado en assets/
    if (isMock) slug = "demo-nutri-camila";
    else {
      slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 30);
    }
  }

  const rawJsonPath = join("assets", slug, "lead-raw.json");
  if (!existsSync(join(REPO_ROOT, rawJsonPath))) {
    console.error(`[lead-to-live ERROR] No se encontró el archivo raw en ${rawJsonPath}`);
    process.exit(1);
  }

  // 2. Generate Fiche
  runStep("2. Generate Client Fiche (Copywriting Hormozi & Compliance)", "node", [
    "scripts/generate-client-fiche.mjs",
    rawJsonPath,
  ]);

  const fichePath = join("clients", `${slug}.md`);

  // 3. Build Client Site
  runStep("3. Build Client Site (Clonado Astro, Assets & Tests)", "node", [
    "scripts/build-client-site.mjs",
    fichePath,
  ]);

  // 4. Audit Site
  runStep("4. Audit Code (Verificación 0 JS, Accesibilidad & Contraste)", "node", [
    "scripts/audit-site.mjs",
    slug,
  ]);

  // 5. Deploy Cloudflare
  const deployArgs = ["scripts/deploy-cloudflare.mjs", slug];
  if (!shouldDeploy) deployArgs.push("--dry-run");
  runStep("5. Deploy Cloudflare Pages", "node", deployArgs);

  console.log(`
\x1b[32m=======================================================
🎉 PIPELINE LEAD-TO-LIVE COMPLETADO CON ÉXITO
=======================================================\x1b[0m
- Cliente: \x1b[1m${slug}\x1b[0m
- Ficha: clients/${slug}.md
- Landing: sites/${slug}/dist/ (0 JS en cliente)
- URL: ${shouldDeploy ? `https://${slug}.pages.dev` : `https://${slug}.pages.dev (Modo Dry-Run listo para deploy)`}
- Estado del embudo: 100% operativo y listo para prospección.
`);
}

main().catch((err) => {
  console.error(`\x1b[31m[lead-to-live ERROR FATAL]\x1b[0m ${err.message}`);
  process.exit(1);
});
