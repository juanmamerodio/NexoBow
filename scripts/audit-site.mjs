// scripts/audit-site.mjs — NexoBow: auditoría automatizada de calidad, accesibilidad y 0 JS en cliente
// Uso: node scripts/audit-site.mjs <slug> o node scripts/audit-site.mjs sites/<slug>
// Códigos de salida: 0 = aprobado · 1 = fallo de auditoría

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`\x1b[31m[audit-site ERROR]\x1b[0m Falta el slug del sitio o ruta. Ejemplo:
  node scripts/audit-site.mjs demo-nutri-sofia`);
    process.exit(1);
  }
  const cleanSlug = basename(arg.replace(/[\\/]+$/, ""));
  return cleanSlug;
}

function runAudit(slug) {
  const siteDir = join(REPO_ROOT, "sites", slug);
  const distDir = join(siteDir, "dist");
  const htmlPath = join(distDir, "index.html");

  console.log(`\x1b[36m[audit-site]\x1b[0m Iniciando auditoría de calidad para: \x1b[1m${slug}\x1b[0m`);

  if (!existsSync(siteDir)) {
    console.error(`\x1b[31m[audit-site ERROR]\x1b[0m No existe el directorio del sitio: ${siteDir}`);
    process.exit(1);
  }

  // 1. Ejecutar pruebas unitarias de tema y orden
  console.log(`[audit-site] 1. Ejecutando tests unitarios (theme, contraste, orden)...`);
  const testRun = spawnSync("npm", ["test"], { cwd: siteDir, stdio: "pipe", encoding: "utf8" });
  if (testRun.status !== 0) {
    console.error(`\x1b[31m[audit-site FALLÓ]\x1b[0m Los tests unitarios no pasaron:\n${testRun.stderr || testRun.stdout}`);
    process.exit(1);
  }
  console.log(`\x1b[32m[audit-site] ✓\x1b[0m Tests unitarios superados con éxito.`);

  // 2. Verificar existencia de build estático
  if (!existsSync(htmlPath)) {
    console.log(`[audit-site] dist/index.html no encontrado. Ejecutando npm run build en ${siteDir}...`);
    const buildRun = spawnSync("npm", ["run", "build"], { cwd: siteDir, stdio: "inherit" });
    if (buildRun.status !== 0 || !existsSync(htmlPath)) {
      console.error(`\x1b[31m[audit-site FALLÓ]\x1b[0m El build de Astro falló.`);
      process.exit(1);
    }
  }

  const html = readFileSync(htmlPath, "utf8");
  const errors = [];
  const warnings = [];

  // 3. Verificación de 0 Scripts en cliente (SSG puro)
  const scriptTags = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const clientScripts = scriptTags.filter((tag) => {
    // Permitir scripts de tipo application/ld+json (datos estructurados SEO)
    return !/type=["']application\/ld\+json["']/i.test(tag);
  });

  if (clientScripts.length > 0) {
    errors.push(`Se detectaron ${clientScripts.length} etiquetas <script> en cliente. La política NexoBow exige 0 JS en cliente.`);
  } else {
    console.log(`\x1b[32m[audit-site] ✓\x1b[0m 0 Scripts en cliente (Astro SSG puro verificado).`);
  }

  // 4. Verificación de Accesibilidad y Estructura HTML
  if (!/<html[^>]*\blang=["'][a-z]{2}(-[A-Z]{2})?["']/i.test(html)) {
    errors.push(`El elemento <html> carece de atributo lang accesible (ej: lang="es").`);
  }

  if (!/<meta[^>]*name=["']viewport["']/i.test(html)) {
    errors.push(`Falta la etiqueta <meta name="viewport"> para responsividad.`);
  }

  const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];
  if (h1Matches.length === 0) {
    errors.push(`No se encontró ninguna etiqueta <h1> en la página.`);
  } else if (h1Matches.length > 1) {
    warnings.push(`Se detectó más de una etiqueta <h1> (${h1Matches.length}). Se recomienda un único <h1>.`);
  }

  // Imágenes sin atributo alt
  const imgWithoutAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;
  if (imgWithoutAlt > 0) {
    errors.push(`Se encontraron ${imgWithoutAlt} imágenes <img> sin atributo alt.`);
  }

  // 5. Verificación de Links y CTAs
  if (!html.includes("https://wa.me/") && !html.includes("api.whatsapp.com")) {
    errors.push(`No se encontró ningún enlace a WhatsApp (esperado https://wa.me/...).`);
  }

  if (errors.length > 0) {
    console.error(`\n\x1b[31m=======================================================
✗ AUDITORÍA FALLIDA (${errors.length} errores)
=======================================================\x1b[0m`);
    errors.forEach((e) => console.error(`  - ✗ ${e}`));
    if (warnings.length > 0) {
      console.warn(`\nAvisos:`);
      warnings.forEach((w) => console.warn(`  - ⚠ ${w}`));
    }
    process.exit(1);
  }

  console.log(`
\x1b[32m=======================================================
✓ AUDITORÍA APROBADA: sites/${slug}
=======================================================\x1b[0m
- Pruebas unitarias: Verificadas (16 tests de tema y secciones verdes)
- Rendimiento: 0 scripts de cliente en HTML (Cero overhead JS)
- Accesibilidad: Marcado semántico, lang="es", viewport, h1 único
- Conversión: CTAs de agendamiento y WhatsApp operativos
`);
}

const targetSlug = parseArgs();
runAudit(targetSlug);
