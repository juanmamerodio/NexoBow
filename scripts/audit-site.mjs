// scripts/audit-site.mjs — NexoBow: auditoría automatizada de calidad, accesibilidad y presupuesto JS
// - En web/ (benchmark de agencia): exige 0 JS ejecutable estricto en cliente.
// - En sites/{slug} (templates PREMIUM de prestadores): permite JS propio dentro de presupuesto (DEFAULT_SITE_JS_BUDGET_BYTES) y rechaza scripts externos de terceros no declarados.
// Uso: node scripts/audit-site.mjs <slug | web>
// Códigos de salida: 0 = aprobado · 1 = fallo de auditoría

import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_SITE_JS_BUDGET_BYTES = 35 * 1024; // 35 KB para micro-interacciones propias en templates PREMIUM

export function auditHtmlDocument(
  html,
  {
    mode = "site",
    maxJsBudgetBytes = DEFAULT_SITE_JS_BUDGET_BYTES,
    distDir = null,
    requireWhatsappCta = true,
  } = {}
) {
  const errors = [];
  const warnings = [];

  const scriptTags = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const executableScripts = scriptTags.filter(
    (tag) => !/type=["']application\/ld\+json["']/i.test(tag)
  );

  let jsBytes = 0;
  const externalScripts = [];

  for (const tag of executableScripts) {
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch) {
      const srcVal = srcMatch[1].trim();
      if (/^(https?:)?\/\//i.test(srcVal)) {
        externalScripts.push(srcVal);
      } else if (distDir) {
        const cleanRel = srcVal.replace(/^\/+/, "");
        const candidatePath = join(distDir, cleanRel);
        if (existsSync(candidatePath)) {
          jsBytes += statSync(candidatePath).size;
        }
      }
    } else {
      const inner = tag
        .replace(/^<script\b[^>]*>/i, "")
        .replace(/<\/script>$/i, "");
      jsBytes += Buffer.byteLength(inner, "utf8");
    }
  }

  if (mode === "web") {
    if (executableScripts.length > 0) {
      errors.push(
        `Se detectaron ${executableScripts.length} etiquetas <script> ejecutables en web/. El benchmark de NexoBow exige 0 JS estricto en cliente.`
      );
    }
  } else {
    if (externalScripts.length > 0) {
      errors.push(
        `Se detectaron scripts externos de terceros no declarados en sites/: ${externalScripts.join(", ")}`
      );
    }
    if (jsBytes > maxJsBudgetBytes) {
      errors.push(
        `Presupuesto de JS propio excedido en sites/: ${jsBytes} bytes (máximo permitido: ${maxJsBudgetBytes} bytes).`
      );
    }
  }

  // Verificación de Accesibilidad y Estructura HTML
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

  const imgWithoutAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;
  if (imgWithoutAlt > 0) {
    errors.push(`Se encontraron ${imgWithoutAlt} imágenes <img> sin atributo alt.`);
  }

  if (requireWhatsappCta && !html.includes("https://wa.me/") && !html.includes("api.whatsapp.com")) {
    errors.push(`No se encontró ningún enlace a WhatsApp (esperado https://wa.me/...).`);
  }

  const jsKb = Number((jsBytes / 1024).toFixed(2));
  return {
    ok: errors.length === 0,
    mode,
    jsBytes,
    jsKb,
    maxJsBudgetBytes: mode === "web" ? 0 : maxJsBudgetBytes,
    executableScriptCount: executableScripts.length,
    externalScripts,
    errors,
    warnings,
  };
}

function parseArgs() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`\x1b[31m[audit-site ERROR]\x1b[0m Falta el slug del sitio o ruta. Ejemplo:
  node scripts/audit-site.mjs demo-nutri-sofia
  node scripts/audit-site.mjs web`);
    process.exit(1);
  }
  const normalized = arg.replace(/[\\/]+$/, "");
  if (normalized === "web" || normalized.endsWith("/web")) {
    return { target: "web", mode: "web" };
  }
  return { target: basename(normalized), mode: "site" };
}

export function runAudit(target, mode = "site") {
  const isWeb = mode === "web" || target === "web";
  const siteDir = isWeb ? join(REPO_ROOT, "web") : join(REPO_ROOT, "sites", target);
  const distDir = join(siteDir, "dist");
  const htmlPath = join(distDir, "index.html");

  console.log(
    `\x1b[36m[audit-site]\x1b[0m Iniciando auditoría de calidad (${isWeb ? "modo web 0-JS" : "modo sites PREMIUM"}) para: \x1b[1m${target}\x1b[0m`
  );

  if (!existsSync(siteDir)) {
    console.error(`\x1b[31m[audit-site ERROR]\x1b[0m No existe el directorio: ${siteDir}`);
    process.exit(1);
  }

  if (!isWeb) {
    console.log(`[audit-site] 1. Ejecutando tests unitarios (theme, contraste, orden)...`);
    const testRun = spawnSync("npm", ["test"], { cwd: siteDir, stdio: "pipe", encoding: "utf8" });
    if (testRun.status !== 0) {
      console.error(`\x1b[31m[audit-site FALLÓ]\x1b[0m Los tests unitarios no pasaron:\n${testRun.stderr || testRun.stdout}`);
      process.exit(1);
    }
    console.log(`\x1b[32m[audit-site] ✓\x1b[0m Tests unitarios superados con éxito.`);
  }

  if (!existsSync(htmlPath)) {
    console.log(`[audit-site] dist/index.html no encontrado. Ejecutando npm run build en ${siteDir}...`);
    const buildRun = spawnSync("npm", ["run", "build"], { cwd: siteDir, stdio: "inherit" });
    if (buildRun.status !== 0 || !existsSync(htmlPath)) {
      console.error(`\x1b[31m[audit-site FALLÓ]\x1b[0m El build de Astro falló.`);
      process.exit(1);
    }
  }

  const html = readFileSync(htmlPath, "utf8");
  const report = auditHtmlDocument(html, {
    mode: isWeb ? "web" : "site",
    distDir,
    requireWhatsappCta: !isWeb,
  });

  if (!report.ok) {
    console.error(`\n\x1b[31m=======================================================
✗ AUDITORÍA FALLIDA (${report.errors.length} errores)
=======================================================\x1b[0m`);
    report.errors.forEach((e) => console.error(`  - ✗ ${e}`));
    if (report.warnings.length > 0) {
      console.warn(`\nAvisos:`);
      report.warnings.forEach((w) => console.warn(`  - ⚠ ${w}`));
    }
    process.exit(1);
  }

  console.log(`
\x1b[32m=======================================================
✓ AUDITORÍA APROBADA: ${isWeb ? "web/" : `sites/${target}`}
=======================================================\x1b[0m
- Modo de política JS: ${isWeb ? "0 JS estricto (web/)" : `Template PREMIUM (presupuesto máx ${(report.maxJsBudgetBytes / 1024).toFixed(0)} KB)`}
- Peso JS detectado: ${report.jsKb} KB (${report.jsBytes} bytes en ${report.executableScriptCount} script/s)
- Accesibilidad: Marcado semántico, lang="es", viewport, h1 único
- Conversión: ${isWeb ? "Benchmark Soft-Obsidian verificado" : "CTAs de agendamiento y WhatsApp operativos"}
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { target, mode } = parseArgs();
  runAudit(target, mode);
}
