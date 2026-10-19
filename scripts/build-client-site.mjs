// build-client-site.mjs — NexoBow: clona template + inyecta ficha + build.
// Uso: node scripts/build-client-site.mjs <ruta-a-ficha.md>
// Códigos de salida: 0 = ok · 1 = error técnico · 2 = ficha inválida (Gate Ask-First)

import { readFileSync, writeFileSync, cpSync, existsSync, rmSync, statSync, symlinkSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

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

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { data: parseYaml(m[1]) ?? {}, body: m[2] ?? "" };
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

// --- Main ---
const [, , fichaArg] = process.argv;
if (!fichaArg) fail("Falta la ruta de la ficha: npm run build-site <ruta-a-ficha.md>");

const fichaPath = resolve(process.cwd(), fichaArg);
if (!existsSync(fichaPath)) fail(`Ficha no encontrada: ${fichaPath}`);

console.log(`\x1b[36m[build-site]\x1b[0m Leyendo ficha: ${fichaPath}`);
const parsed = parseFrontmatter(readFileSync(fichaPath, "utf8"));
if (!parsed) fail("La ficha no tiene frontmatter YAML válido (--- ... ---).");

const fm = parsed.data;
const missing = REQUIRED.filter((k) => fm[k] === undefined || fm[k] === null || String(fm[k]).trim() === "");

if (missing.length > 0) {
  console.error(
    `\n\x1b[33m[build-site GATE ASK-FIRST]\x1b[0m Faltan campos obligatorios en ${fichaPath}:\n` +
      missing.map((f) => `  - ${f}`).join("\n") +
      `\n\n\x1b[31mEl agente no debe adivinar datos faltantes. Deteniendo ejecución.\x1b[0m\n`
  );
  process.exit(2);
}

const rubro = fm.rubro || "nutricionista";
const slug = fm.slug;
const templateDir = join(REPO_ROOT, "templates", rubro);
const siteDir = join(REPO_ROOT, "sites", slug);

if (!existsSync(templateDir)) {
  fail(`Template no encontrado: templates/${rubro} (en MVP solo existe 'nutricionista').`);
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
    fuente: isGmaps ? "Google Maps" : "Testimonio Verificado",
  };
});

const casosItems = bullets(sectionText(body, "Casos de éxito")).map(parseCase);
const faqItems = bullets(sectionText(body, "Preguntas frecuentes")).map((b) => {
  const { name, text } = parseLabeled(b, "Pregunta");
  return { q: name, a: text };
});

const cleanPhone = String(fm.whatsapp).replace(/\D/g, "");
const waLink = String(fm.whatsapp).startsWith("http")
  ? fm.whatsapp
  : `https://wa.me/${cleanPhone}`;

const bookingUrl = (fm.calendly && String(fm.calendly).trim() !== "")
  ? fm.calendly
  : `https://wa.me/${cleanPhone}?text=Hola!%20Quiero%20agendar%20mi%20primera%20consultor%C3%ADa%20gratuita`;

const patch = {
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
      items: casosItems.length > 0 ? casosItems : baseSite.content.casos.items,
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
};

const finalSite = deepMerge(baseSite, patch);

console.log(`\x1b[36m[build-site]\x1b[0m Clonando templates/${rubro} → sites/${slug} ...`);
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

// Copiar assets locales del cliente si existen en assets/{slug}/
const clientAssetsDir = join(REPO_ROOT, "assets", slug);
const publicAssetsDir = join(siteDir, "public", "assets");
if (existsSync(clientAssetsDir)) {
  mkdirSync(publicAssetsDir, { recursive: true });
  cpSync(clientAssetsDir, publicAssetsDir, {
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
console.log(`\x1b[32m[build-site] ✓\x1b[0m Inyectado src/site.json con branding de ${fm.nombre}.`);

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
  } else {
    console.log(`\x1b[36m[build-site]\x1b[0m Instalando dependencias en sites/${slug}...`);
    runCmd("npm", ["install"], siteDir);
  }
}

// Ejecutar tests unitarios en el clon
console.log(`\x1b[36m[build-site]\x1b[0m Ejecutando tests unitarios de tema y orden...`);
const testCode = runCmd("npm", ["test"], siteDir);
if (testCode !== 0) fail("Los tests unitarios fallaron en el clon.");

// Compilar sitio estático
console.log(`\x1b[36m[build-site]\x1b[0m Compilando Astro SSG en sites/${slug}...`);
const buildCode = runCmd("npm", ["run", "build"], siteDir);
if (buildCode !== 0) fail(`Fallo en npm run build (código ${buildCode}).`);

const distPath = join(siteDir, "dist");
const htmlPath = join(distPath, "index.html");
let htmlSize = 0;
if (existsSync(htmlPath)) {
  htmlSize = (statSync(htmlPath).size / 1024).toFixed(1);
}

console.log(`
\x1b[32m=======================================================
✓ SITIO GENERADO CON ÉXITO: sites/${slug}
=======================================================\x1b[0m
- Cliente: \x1b[1m${fm.nombre}\x1b[0m (${fm.subdominio})
- Output: sites/${slug}/dist/ (HTML: ${htmlSize} KB · Cero JS en cliente)
- WhatsApp: ${waLink}
- Calendly: ${fm.calendly}

\x1b[36mPara probar en local:\x1b[0m
  npx astro preview --root sites/${slug}

\x1b[36mPara desplegar a producción (elegí una opción):\x1b[0m
  \x1b[1mOpción A (Cloudflare Pages):\x1b[0m
    npx wrangler pages deploy sites/${slug}/dist --project-name ${slug}

  \x1b[1mOpción B (Vercel):\x1b[0m
    npx vercel deploy sites/${slug}/dist --prod
`);
