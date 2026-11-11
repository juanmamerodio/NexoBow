// scripts/deploy-previews.mjs — NexoBow: despliegue unificado de subrutas a Cloudflare Pages (preview.nexobow.site)
// Uso: node scripts/deploy-previews.mjs [--dry-run]
// Códigos de salida: 0 = ok · 1 = fallo técnico · 2 = parámetros o credenciales insuficientes

import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Cargar variables de entorno si existe .env
try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si no se puede cargar automáticamente
}

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      flags[key] = true;
    }
  }
  return flags;
}

function getWranglerBin() {
  const localBin = join(REPO_ROOT, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
  return existsSync(localBin) ? localBin : "npx";
}

function buildWranglerArgs(subArgs) {
  const bin = getWranglerBin();
  return bin === "npx" ? { cmd: "npx", args: ["wrangler", ...subArgs] } : { cmd: bin, args: subArgs };
}

export function bundleWebFunctions(distPreviewsDir) {
  const webFunctionsDir = join(REPO_ROOT, "web", "functions");
  if (!existsSync(webFunctionsDir)) return { bundled: false };

  const workerOutDir = join(distPreviewsDir, "_worker.js");
  mkdirSync(distPreviewsDir, { recursive: true });
  const { cmd, args } = buildWranglerArgs(["pages", "functions", "build", webFunctionsDir, "--outdir", workerOutDir]);
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (res.status !== 0) {
    throw new Error(`No se pudo compilar web/functions con Wrangler (código ${res.status}).`);
  }

  writeFileSync(
    join(distPreviewsDir, "_routes.json"),
    JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2) + "\n",
    "utf8"
  );

  return { bundled: true, workerOutDir };
}

async function main() {
  const flags = parseArgs();
  const isDryRun = Boolean(flags["dry-run"]);
  const distPreviewsDir = join(REPO_ROOT, "dist-previews");
  mkdirSync(distPreviewsDir, { recursive: true });

  // Sincronizar automáticamente el build de web/ a la raíz de dist-previews para nexobow.site/
  const webDistDir = join(REPO_ROOT, "web", "dist");
  if (existsSync(webDistDir)) {
    cpSync(webDistDir, distPreviewsDir, { recursive: true });
  }

  const entries = readdirSync(distPreviewsDir).filter((f) => {
    return statSync(join(distPreviewsDir, f)).isDirectory() && !["_astro", "_worker.js", "admin", "solicitud-enviada"].includes(f);
  });

  const projectName = "nexobow-previews";
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const customDomain = `preview.${rootDomain}`;
  const hasFunctions = existsSync(join(REPO_ROOT, "web", "functions"));

  console.log(`\x1b[36m[deploy-previews]\x1b[0m Preparando despliegue de \x1b[1m${entries.length} demos\x1b[0m hacia ${projectName}...`);

  if (isDryRun) {
    console.log(`\x1b[33m[deploy-previews DRY-RUN]\x1b[0m Modo de simulación activo.`);
    console.log(`- Proyecto Cloudflare Pages: ${projectName}`);
    console.log(`- Directorio raíz: ${distPreviewsDir}`);
    console.log(`- Pages Functions (API Inbound): ${hasFunctions ? "web/functions -> _worker.js (/api/*)" : "no detectadas"}`);
    console.log(`- Subrutas listas: ${entries.join(", ") || "(ninguna)"}`);
    console.log(`- Dominio unificado: https://${customDomain}`);
    console.log(`- URL ejemplo: https://${customDomain}/${entries[0] || "slug-demo"}/`);
    console.log(`\x1b[32m[deploy-previews ✓]\x1b[0m Verificación dry-run exitosa.`);
    process.exit(0);
  }

  if (hasFunctions) {
    console.log(`[deploy-previews] Compilando Pages Functions (web/functions -> _worker.js)...`);
    bundleWebFunctions(distPreviewsDir);
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!token || !accountId) {
    console.error(`\x1b[31m[deploy-previews ERROR]\x1b[0m Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID en .env.`);
    process.exit(2);
  }

  console.log(`[deploy-previews] Ejecutando: wrangler pages deploy dist-previews --project-name ${projectName} ...`);
  const { cmd, args } = buildWranglerArgs(["pages", "deploy", distPreviewsDir, "--project-name", projectName, "--commit-dirty=true"]);
  const deployRes = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    },
    shell: process.platform === "win32",
  });

  if (deployRes.status !== 0) {
    console.error(`\x1b[31m[deploy-previews ERROR]\x1b[0m Falló el despliegue a Cloudflare Pages.`);
    process.exit(1);
  }

  console.log(`
\x1b[32m=======================================================
✓ DESPLIEGUE UNIFICADO EXITOSO EN CLOUDFLARE PAGES
=======================================================\x1b[0m
- Proyecto: \x1b[1m${projectName}\x1b[0m
- Dominio: \x1b[36mhttps://${customDomain}\x1b[0m
- Demos desplegadas: ${entries.length}
`);
}

if (process.argv[1] && import.meta.url.endsWith("deploy-previews.mjs")) {
  main().catch((err) => {
    console.error(`\x1b[31m[deploy-previews ERROR FATAL]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
