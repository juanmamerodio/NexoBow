// build-client-site.mjs — NexoBow: clona template + inyecta ficha + build con soporte de template_version inmutable.
// Uso: node scripts/build-client-site.mjs <ruta-a-ficha.md> [--base /slug/] [--upgrade-template] [--skip-build]
// Códigos de salida: 0 = ok · 1 = error técnico · 2 = ficha inválida (Gate Ask-First)

import { readFileSync, writeFileSync, cpSync, existsSync, rmSync, statSync, symlinkSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { defaultLeadStore, buildPreviewUrl } from "./sheets-sync.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  "rubro",
  "slug",
  "nombre",
  "whatsapp",
  "subdominio",
  "consentimiento_testimonios",
];

function fail(msg, code = 1) {
  console.error(`\x1b[31m[build-site ERROR]\x1b[0m ${msg}`);
  process.exit(code);
}

export function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { data: parseYaml(m[1]) ?? {}, body: m[2] ?? "" };
}

export const RUBRO_TO_ARCHETYPE_MAP = {
  nutricionista: "editorial-classic",
  psicologo: "editorial-classic",
  abogado: "obsidian-authority",
  odontologo: "editorial-classic",
  kinesiologo: "editorial-classic",
  estetica: "editorial-classic",
  clinica: "architectural-prestige",
};

export const ARCHETYPE_ALIASES = {
  "editorial-classic": ["nutricionista", "editorial-classic"],
  "obsidian-authority": ["abogado", "obsidian-authority"],
  "architectural-prestige": ["clinica", "architectural-prestige"],
  "minimalist-pure": ["odontologo", "minimalist-pure"],
  "kinetic-cards": ["kinesiologo", "kinetic-cards"],
};

export function resolveTemplateArchetype(fm = {}) {
  if (fm.template_archetype && String(fm.template_archetype).trim()) {
    return String(fm.template_archetype).trim();
  }
  const rubro = (fm.rubro || "nutricionista").toLowerCase().trim();
  return RUBRO_TO_ARCHETYPE_MAP[rubro] || "editorial-classic";
}

export function resolveTemplateSourceDirectory(nameOrArchetype, repoRoot = REPO_ROOT) {
  const directPath = join(repoRoot, "templates", nameOrArchetype);
  if (existsSync(directPath)) return directPath;

  // Si se pasó un arquetipo (ej: editorial-classic), buscar el template físico compatible
  if (nameOrArchetype === "editorial-classic") {
    const fallbackPath = join(repoRoot, "templates", "nutricionista");
    if (existsSync(fallbackPath)) return fallbackPath;
  }

  // Si se pasó un rubro que mapea a una carpeta existente
  for (const [archetype, aliases] of Object.entries(ARCHETYPE_ALIASES)) {
    if (archetype === nameOrArchetype || aliases.includes(nameOrArchetype)) {
      for (const alias of aliases) {
        const candidate = join(repoRoot, "templates", alias);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  return directPath;
}

export function resolveTemplateVersion(fm = {}, templatePkgVersion = "1.0.0") {
  if (fm.template_version && String(fm.template_version).trim()) {
    return String(fm.template_version).trim();
  }
  if (fm.template_archetype && String(fm.template_archetype).trim()) {
    return `${String(fm.template_archetype).trim()}@${templatePkgVersion}`;
  }
  const rubro = fm.rubro || "nutricionista";
  return `${rubro}@${templatePkgVersion}`;
}

export function verifyTemplateTagExists(requestedVersion, repoRoot = REPO_ROOT) {
  const tagName = `template/${requestedVersion}`;
  const res = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tagName}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return res.status === 0;
}

export function syncBuildPreviewUrlToStore({ fm = {}, slug, leadStore = defaultLeadStore } = {}) {
  const targetSlug = slug || fm.slug;
  const previewUrl = buildPreviewUrl(targetSlug);
  try {
    const res = leadStore.updatePreviewUrl({
      sheetId: fm.sheet_id,
      slug: targetSlug,
      previewUrl,
    });
    if (!res.updated && res.reason === "not-found") {
      console.warn(
        `\x1b[33m[build-site AVISO]\x1b[0m El lead '${targetSlug}' (sheet_id: ${fm.sheet_id ?? "N/A"}) no figura en Google Sheets. Se omite escritura en Columna G.`
      );
    } else if (res.updated) {
      console.log(
        `\x1b[32m[build-site] ✓\x1b[0m Columna G actualizada en Google Sheets (${res.cell}): ${previewUrl}`
      );
    }
    return res;
  } catch (err) {
    console.warn(
      `\x1b[33m[build-site AVISO]\x1b[0m No se pudo sincronizar URL de preview en Google Sheets: ${err.message}`
    );
    return { updated: false, reason: "error", error: err.message, previewUrl };
  }
}

export function shouldRecloneTemplate({
  siteExists = false,
  lockedVersion = null,
  requestedVersion = "nutricionista@1.0.0",
  upgradeRequested = false,
} = {}) {
  if (!siteExists) {
    return { shouldReclone: true, reason: "initial-clone" };
  }
  if (upgradeRequested) {
    return { shouldReclone: true, reason: "explicit-upgrade" };
  }
  if (lockedVersion && requestedVersion && lockedVersion !== requestedVersion) {
    return { shouldReclone: true, reason: "version-changed-in-fiche" };
  }
  return { shouldReclone: false, reason: "locked-to-template-version" };
}

function sectionText(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading.toLowerCase()}`);
  if (start === -1) return "";
  const end = lines.slice(start + 1).findIndex((l) => /^##\s/.test(l.trim()));
  const sectionLines = end === -1 ? lines.slice(start + 1) : lines.slice(start + 1, start + 1 + end);
  return sectionLines.join("\n").trim();
}

function bullets(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);
}

function parseLabeled(bullet, fallbackName) {
  const m = bullet.match(/^\*\*(.+?)\*\*\s*[:\-–—]?\s*(.*)$/);
  if (m && m[1].trim()) return { name: m[1].trim(), text: m[2].trim() };
  return { name: fallbackName, text: bullet };
}

function parseCase(bullet) {
  const { name, text } = parseLabeled(bullet, "Caso de éxito");
  if (!text) return { titulo: name, descripcion: "", resultado: "" };
  const idx = text.lastIndexOf("Resultado:");
  if (idx !== -1) {
    return {
      titulo: name,
      descripcion: text.slice(0, idx).replace(/[.\s]+$/, ""),
      resultado: text.slice(idx + "Resultado:".length).trim(),
    };
  }
  return { titulo: name, descripcion: text, resultado: "" };
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function runCmd(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  return res.status;
}

function updateFicheTemplateVersion(fichePath, newVersion) {
  const raw = readFileSync(fichePath, "utf8");
  const regex = /^template_version:.*$/m;
  const updated = regex.test(raw)
    ? raw.replace(regex, `template_version: "${newVersion}"`)
    : raw.replace(/^---\r?\n/, `---\ntemplate_version: "${newVersion}"\n`);
  writeFileSync(fichePath, updated, "utf8");
}

function main() {
  const args = process.argv.slice(2);
  let ficheArg = null;
  let baseArg = null;
  let upgradeRequested = false;
  let skipBuild = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && args[i + 1]) {
      baseArg = args[i + 1];
      i++;
    } else if (args[i] === "--upgrade-template") {
      upgradeRequested = true;
    } else if (args[i] === "--skip-build") {
      skipBuild = true;
    } else if (!args[i].startsWith("--") && !ficheArg) {
      ficheArg = args[i];
    }
  }

  if (!ficheArg) {
    fail("Falta la ruta de la ficha: npm run build-site <ruta-a-ficha.md> [--base /slug/] [--upgrade-template]");
  }

  const fichePath = resolve(process.cwd(), ficheArg);
  if (!existsSync(fichePath)) fail(`Ficha no encontrada: ${fichePath}`);

  console.log(`\x1b[36m[build-site]\x1b[0m Leyendo ficha: ${fichePath}`);
  const parsed = parseFrontmatter(readFileSync(fichePath, "utf8"));
  if (!parsed) fail("La ficha no tiene frontmatter YAML válido (--- ... ---).");

  const fm = parsed.data;
  const missing = REQUIRED.filter((k) => fm[k] === undefined || fm[k] === null || String(fm[k]).trim() === "");

  if (missing.length > 0) {
    console.error(
      `\n\x1b[33m[build-site GATE ASK-FIRST]\x1b[0m Faltan campos obligatorios en ${fichePath}:\n` +
        missing.map((f) => `  - ${f}`).join("\n") +
        `\n\n\x1b[31mEl agente no debe adivinar datos faltantes. Deteniendo ejecución.\x1b[0m\n`
    );
    process.exit(2);
  }

  const vertical = fm.rubro || "nutricionista";
  const archetype = resolveTemplateArchetype(fm);
  const slug = fm.slug;
  const templateDir = resolveTemplateSourceDirectory(archetype, REPO_ROOT);
  const siteDir = join(REPO_ROOT, "sites", slug);
  const lockPath = join(siteDir, ".template-lock.json");

  if (!existsSync(templateDir)) {
    fail(`Template no encontrado para arquetipo '${archetype}' ni rubro '${vertical}'.`);
  }

  const templatePkgPath = join(templateDir, "package.json");
  const templatePkgVersion = existsSync(templatePkgPath)
    ? JSON.parse(readFileSync(templatePkgPath, "utf8")).version || "1.0.0"
    : "1.0.0";

  let lockedVersion = null;
  if (existsSync(lockPath)) {
    try {
      lockedVersion = JSON.parse(readFileSync(lockPath, "utf8")).template_version || null;
    } catch {
      lockedVersion = null;
    }
  }

  const latestVersionString = `${vertical}@${templatePkgVersion}`;
  const requestedVersion = upgradeRequested
    ? latestVersionString
    : resolveTemplateVersion(fm, templatePkgVersion);

  if (!verifyTemplateTagExists(requestedVersion)) {
    fail(
      `La versión de template solicitada '${requestedVersion}' no existe (tag git esperado: template/${requestedVersion}).`
    );
  }

  if (upgradeRequested && fm.template_version !== requestedVersion) {
    updateFicheTemplateVersion(fichePath, requestedVersion);
  }

  const { shouldReclone, reason } = shouldRecloneTemplate({
    siteExists: existsSync(siteDir),
    lockedVersion,
    requestedVersion,
    upgradeRequested,
  });

  if (shouldReclone) {
    console.log(
      `\x1b[36m[build-site]\x1b[0m Clonando templates/${vertical} (${requestedVersion}, motivo: ${reason}) → sites/${slug} ...`
    );
    if (existsSync(siteDir)) {
      rmSync(siteDir, { recursive: true, force: true });
    }

    cpSync(templateDir, siteDir, {
      recursive: true,
      filter: (src) => {
        const rel = src.slice(templateDir.length).replace(/^[\\/]/, "");
        const top = rel.split(/[\\/]/)[0];
        return !["node_modules", "dist", ".astro", ".git"].includes(top);
      },
    });

    writeFileSync(
      lockPath,
      JSON.stringify(
        {
          template_version: requestedVersion,
          rubro: vertical,
          locked_at: new Date().toISOString(),
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  } else {
    console.log(
      `\x1b[32m[build-site] 🔒\x1b[0m Template bloqueado en ${lockedVersion}. Preservando código del clon y actualizando datos (site.json / assets).`
    );
  }

  const baseSiteJsonPath = join(templateDir, "src", "site.json");
  const baseSite = JSON.parse(readFileSync(baseSiteJsonPath, "utf8"));

  const body = parsed.body ?? "";

  // Parsing de Markdown Body
  const reviewsItems = bullets(sectionText(body, "Reseñas")).map((b) => {
    const { name, text } = parseLabeled(b, "Reseña de Google Maps");
    const isGmaps = name.toLowerCase().includes("maps") || !fm.consentimiento_testimonios;
    return {
      nombre: name.replace(/\s*\(Google Maps\)/i, "").trim(),
      texto: text.replace(/^["“”']|["“”']$/g, ""),
      fuente: isGmaps ? "Google Maps" : "Caso Verificado",
    };
  });

  const caseItems = bullets(sectionText(body, "Casos de éxito")).map(parseCase);
  const faqItems = bullets(sectionText(body, "Preguntas frecuentes")).map((b) => {
    const { name, text } = parseLabeled(b, "Pregunta");
    return { q: name, a: text };
  });

  const cleanPhone = String(fm.whatsapp).replace(/\D/g, "");
  const waLink = String(fm.whatsapp).startsWith("http")
    ? fm.whatsapp
    : `https://wa.me/${cleanPhone}`;

  const bookingUrl =
    fm.calendly && String(fm.calendly).trim() !== ""
      ? fm.calendly
      : `https://wa.me/${cleanPhone}?text=Hola!%20Quiero%20agendar%20mi%20primera%20consultor%C3%ADa%20gratuita`;

  const patch = {
    template_version: requestedVersion,
    tema: {
      primary: fm.tema?.primary || baseSite.tema.primary,
      accent: fm.tema?.accent || baseSite.tema.accent,
      fondo: fm.tema?.fondo || baseSite.tema.fondo,
      tinta: fm.tema?.tinta || baseSite.tema.tinta,
      fuente: fm.tema?.fuente || baseSite.tema.fuente,
      fuente_sans: fm.tema?.fuente_sans || baseSite.tema.fuente_sans,
      orden_secciones: fm.tema?.orden_secciones || baseSite.tema.orden_secciones,
    },
    content: {
      prestador: {
        nombre: fm.nombre,
        rol: fm.rol || `Nutricionista · ${fm.subtitulo || "Atención Online"}`,
        titulo: fm.titulo || baseSite.content.prestador.titulo,
        bajada: fm.bajada || baseSite.content.prestador.bajada,
        bio: sectionText(body, "Bio") || baseSite.content.prestador.bio,
        enfoque: sectionText(body, "Enfoque") || baseSite.content.prestador.enfoque,
      },
      problema: {
        ...baseSite.content.problema,
        descripcion:
          sectionText(body, "Problema") ||
          "La mayoría de las personas no fallan por falta de voluntad, sino por seguir planes restrictivos imposibles de sostener. Aprender a comer tiene que sumar a tu vida, no complicarla.",
      },
      footer: {
        blurb:
          fm.tagline ||
          sectionText(body, "Footer") ||
          `${fm.nombre} · Consultorías online y hábitos sostenibles para el mundo real.`,
        credit: "Landing por NexoBow",
      },
      reviews: {
        items: reviewsItems.length > 0 ? reviewsItems : baseSite.content.reviews.items,
      },
      casos: {
        items: caseItems.length > 0 ? caseItems : baseSite.content.casos.items,
      },
      faq: {
        items: faqItems.length > 0 ? faqItems : baseSite.content.faq.items,
      },
      links: {
        calendly: bookingUrl,
        whatsapp: waLink,
      },
      consentimiento_testimonios: Boolean(fm.consentimiento_testimonios),
    },
    paletas_alternativas: fm.paletas_alternativas || baseSite.paletas_alternativas || [],
  };

  const finalSite = deepMerge(baseSite, patch);

  // Copiar assets locales del prestador si existen en assets/{slug}/
  const providerAssetsDir = join(REPO_ROOT, "assets", slug);
  const publicAssetsDir = join(siteDir, "public", "assets");
  if (existsSync(providerAssetsDir)) {
    mkdirSync(publicAssetsDir, { recursive: true });
    cpSync(providerAssetsDir, publicAssetsDir, {
      recursive: true,
      filter: (src) => !src.endsWith(".json"),
    });
    console.log(`\x1b[32m[build-site] ✓\x1b[0m Assets locales copiados a sites/${slug}/public/assets/.`);
  }

  writeFileSync(
    join(siteDir, "src", "site.json"),
    JSON.stringify(finalSite, null, 2) + "\n",
    "utf8"
  );
  console.log(`\x1b[32m[build-site] ✓\x1b[0m Inyectado src/site.json con branding de ${fm.nombre} (${requestedVersion}).`);

  // Vincular node_modules para velocidad o instalar
  const siteNodeModules = join(siteDir, "node_modules");
  const templateNodeModules = join(templateDir, "node_modules");

  if (!existsSync(siteNodeModules)) {
    if (existsSync(templateNodeModules)) {
      try {
        symlinkSync(templateNodeModules, siteNodeModules, "junction");
        console.log(`\x1b[32m[build-site] ✓\x1b[0m node_modules vinculados desde el template.`);
      } catch {
        console.log(`\x1b[36m[build-site]\x1b[0m Instalando dependencias en sites/${slug}...`);
        runCmd("npm", ["install"], siteDir);
      }
    } else if (!skipBuild) {
      console.log(`\x1b[36m[build-site]\x1b[0m Instalando dependencias en sites/${slug}...`);
      runCmd("npm", ["install"], siteDir);
    }
  }

  if (skipBuild) {
    console.log(`\x1b[32m[build-site] ✓\x1b[0m Sincronización completada (--skip-build activo).`);
    return;
  }

  // Ejecutar tests unitarios en el clon
  console.log(`\x1b[36m[build-site]\x1b[0m Ejecutando tests unitarios de tema y orden...`);
  const testCode = runCmd("npm", ["test"], siteDir);
  if (testCode !== 0) fail("Los tests unitarios fallaron en el clon.");

  // Compilar landing estática
  const effectiveBase = baseArg || `/${slug}/`;
  console.log(`\x1b[36m[build-site]\x1b[0m Compilando Astro SSG en sites/${slug} (base: ${effectiveBase})...`);
  const buildArgs = ["run", "build"];
  if (effectiveBase && effectiveBase !== "/") {
    buildArgs.push("--", "--base", effectiveBase);
  }
  const buildCode = runCmd("npm", buildArgs, siteDir);
  if (buildCode !== 0) fail(`Fallo en npm run build (código ${buildCode}).`);

  const distPath = join(siteDir, "dist");
  const htmlPath = join(distPath, "index.html");
  let htmlSize = 0;
  if (existsSync(htmlPath)) {
    htmlSize = (statSync(htmlPath).size / 1024).toFixed(1);
  }

  // Sincronizar automáticamente hacia dist-previews/{slug}/ para el dominio unificado de previews
  const distPreviewsTarget = join(REPO_ROOT, "dist-previews", slug);
  try {
    mkdirSync(join(REPO_ROOT, "dist-previews"), { recursive: true });
    if (existsSync(distPreviewsTarget)) {
      rmSync(distPreviewsTarget, { recursive: true, force: true });
    }
    cpSync(distPath, distPreviewsTarget, { recursive: true });
    console.log(
      `\x1b[32m[build-site] ✓\x1b[0m Sincronizado a dist-previews/${slug}/ para https://preview.${
        process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site"
      }/${slug}/`
    );
  } catch (err) {
    console.warn(`[build-site] Advertencia al sincronizar con dist-previews: ${err.message}`);
  }

  // Sincronizar URL de preview en Columna G de Google Sheets mediante LeadStore
  syncBuildPreviewUrlToStore({ fm, slug });

  console.log(`
\x1b[32m=======================================================
✓ CLON GENERADO CON ÉXITO: sites/${slug}
=======================================================\x1b[0m
- Prestador: \x1b[1m${fm.nombre}\x1b[0m (${fm.subdominio})
- Template: ${requestedVersion}
- Output: sites/${slug}/dist/ (HTML: ${htmlSize} KB)
- Preview Oficial: https://preview.${process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site"}/${slug}/
- WhatsApp: ${waLink}
- Calendly: ${fm.calendly}
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
