// scripts/deploy-cloudflare.mjs — NexoBow: despliegue autónomo a Cloudflare Pages mediante Wrangler CLI
// Uso: node scripts/deploy-cloudflare.mjs <slug> [--dry-run]
// Códigos de salida: 0 = ok · 1 = fallo de despliegue · 2 = credenciales faltantes

import { existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
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
  let slug = null;
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      flags[key] = true;
    } else if (!slug) {
      slug = basename(args[i].replace(/[\\/]+$/, ""));
    }
  }
  return { slug, flags };
}

async function main() {
  const { slug, flags } = parseArgs();

  if (!slug) {
    console.error(`\x1b[31m[deploy-cf ERROR]\x1b[0m Falta el slug del sitio. Ejemplo:
  node scripts/deploy-cloudflare.mjs demo-nutri-sofia [--dry-run]`);
    process.exit(2);
  }

  const isDryRun = Boolean(flags["dry-run"]);
  const siteDir = join(REPO_ROOT, "sites", slug);
  const distDir = join(siteDir, "dist");

  if (!existsSync(siteDir)) {
    console.error(`\x1b[31m[deploy-cf ERROR]\x1b[0m No existe el directorio del sitio: ${siteDir}`);
    process.exit(1);
  }

  if (!existsSync(distDir)) {
    console.log(`[deploy-cf] dist/ no encontrado. Compilando Astro SSG en sites/${slug}...`);
    const buildRes = spawnSync("npm", ["run", "build"], { cwd: siteDir, stdio: "inherit" });
    if (buildRes.status !== 0) {
      console.error(`\x1b[31m[deploy-cf ERROR]\x1b[0m La compilación falló.`);
      process.exit(1);
    }
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.com";

  if (!isDryRun && (!token || !accountId)) {
    console.error(`\x1b[31m[deploy-cf ERROR]\x1b[0m Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID en .env.`);
    process.exit(2);
  }

  console.log(`\x1b[36m[deploy-cf]\x1b[0m Preparando despliegue de \x1b[1m${slug}\x1b[0m hacia Cloudflare Pages...`);

  if (isDryRun) {
    console.log(`\x1b[33m[deploy-cf DRY-RUN]\x1b[0m Modo de simulación activo.`);
    console.log(`- Proyecto: ${slug}`);
    console.log(`- Carpeta a publicar: ${distDir}`);
    console.log(`- URL esperada: https://${slug}.pages.dev`);
    if (rootDomain && rootDomain !== "-") {
      console.log(`- Subdominio esperado: https://${slug}.${rootDomain}`);
    }
    console.log(`\x1b[32m[deploy-cf ✓]\x1b[0m Verificación dry-run exitosa.`);
    process.exit(0);
  }

  // Despliegue con Wrangler
  console.log(`[deploy-cf] Ejecutando: npx wrangler pages deploy sites/${slug}/dist --project-name ${slug} ...`);
  const deployRes = spawnSync(
    "npx",
    ["wrangler", "pages", "deploy", distDir, "--project-name", slug, "--commit-dirty=true"],
    {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
      shell: process.platform === "win32",
    }
  );

  if (deployRes.status !== 0) {
    console.error(`\x1b[31m[deploy-cf ERROR]\x1b[0m Falló el despliegue a Cloudflare Pages (código ${deployRes.status}).`);
    process.exit(1);
  }

  const publicUrl = `https://${slug}.pages.dev`;
  console.log(`
\x1b[32m=======================================================
✓ DESPLIEGUE EXITOSO EN CLOUDFLARE PAGES
=======================================================\x1b[0m
- Proyecto: \x1b[1m${slug}\x1b[0m
- URL Pública: \x1b[36m${publicUrl}\x1b[0m
- Subdominio: ${rootDomain && rootDomain !== "-" ? `https://${slug}.${rootDomain}` : "Sin mapear"}
- Estado: Publicado en red global edge con SSL automático
`);
}

main().catch((err) => {
  console.error(`\x1b[31m[deploy-cf ERROR FATAL]\x1b[0m ${err.message}`);
  process.exit(1);
});
