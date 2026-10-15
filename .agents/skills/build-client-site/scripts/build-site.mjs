// build-site.mjs — NexoBow: clona template + inyecta ficha + build.
// Uso: node build-site.mjs <ruta-a-ficha.md>
// Exit codes: 0 ok · 1 error técnico · 2 ficha inválida (faltan campos → gate Ask-First)
import { readFileSync, writeFileSync, cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const REQUIRED = [
  "rubro",
  "slug",
  "nombre",
  "whatsapp",
  "calendly",
  "subdominio",
  "consentimiento_testimonios",
];

function fail(msg, code = 1) {
  console.error(`[build-site] ${msg}`);
  process.exit(code);
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { data: parseYaml(m[1]) ?? {}, body: m[2] ?? "" };
}

function sectionText(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
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
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (isPlainObject(v) && isPlainObject(base[k])) {
      base[k] = deepMerge(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

// --- Main ---
const [,, fichaArg] = process.argv;
if (!fichaArg) fail("Falta el argumento: node build-site.mjs <ruta-a-ficha.md>");

const fichaPath = resolve(fichaArg);
if (!existsSync(fichaPath)) fail(`Ficha no encontrada: ${fichaPath}`);

const parsed = parseFrontmatter(readFileSync(fichaPath, "utf8"));
if (!parsed) fail("La ficha no tiene frontmatter YAML válido (--- ... ---).");

const fm = parsed.data;
const missing = REQUIRED.filter((k) => !fm[k] || String(fm[k]).trim() === "");
const temaPrimario = fm.tema?.primary;
if (!temaPrimario) missing.push("tema.primary");
if (!fm.tema?.fuente) missing.push("tema.fuente");

if (missing.length > 0) {
  console.error(
    `[build-site] GATE ASK-FIRST: faltan campos obligatorios en ${fichaPath}:\n  - ${missing.join("\n  - ")}\n` +
      `El agente debe frenar y preguntarle al usuario antes de continuar.`
  );
  process.exit(2);
}

const rubro = fm.rubro;
const slug = fm.slug;
const templateDir = join(REPO_ROOT, "templates", rubro);
const siteDir = join(REPO_ROOT, "sites", slug);

if (!existsSync(templateDir)) {
  fail(`Template inexistente: templates/${rubro} (solo existe 'nutricionista' en el MVP).`);
}

const baseSite = JSON.parse(
  readFileSync(join(templateDir, "src", "site.json"), "utf8")
);

const body = parsed.body ?? "";
const reviewsItems = bullets(sectionText(body, "Reseñas")).map((b) => {
  const { name, text } = parseLabeled(b, "Reseña de Google Maps");
  return { nombre: name, texto: text, fuente: "Google Maps" };
});
const casosItems = bullets(sectionText(body, "Casos de éxito")).map(parseCase);
const faqItems = bullets(sectionText(body, "Preguntas frecuentes")).map((b) => {
  const { name, text } = parseLabeled(b, "Pregunta");
  return { q: name, a: text };
});

const patch = {
  tema: {
    primary: fm.tema?.primary,
    accent: fm.tema?.accent,
    fuente: fm.tema?.fuente,
    orden_secciones: fm.tema?.orden_secciones,
  },
  content: {
    prestador: {
      nombre: fm.nombre,
      bio: sectionText(body, "Bio") || undefined,
      enfoque: sectionText(body, "Enfoque") || undefined,
    },
    reviews: { items: reviewsItems.length ? reviewsItems : undefined },
    casos: { items: casosItems.length ? casosItems : undefined },
    faq: { items: faqItems.length ? faqItems : undefined },
    links: {
      calendly: fm.calendly,
      whatsapp: `https://wa.me/${fm.whatsapp}`,
    },
    consentimiento_testimonios: fm.consentimiento_testimonios,
  },
};

const injected = deepMerge(baseSite, patch);

console.log(`[build-site] Clonando templates/${rubro} → sites/${slug} ...`);
if (existsSync(siteDir)) rmSync(siteDir, { recursive: true, force: true });
cpSync(templateDir, siteDir, {
  recursive: true,
  filter: (src) => {
    const base = src.split(/[\\/]/).pop();
    return !["node_modules", "dist", ".astro", ".git"].includes(base);
  },
});

writeFileSync(
  join(siteDir, "src", "site.json"),
  JSON.stringify(injected, null, 2) + "\n",
  "utf8"
);
console.log(`[build-site] src/site.json inyectado en sites/${slug}.`);

function runNpm(args, cwd) {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", "npm", ...args], { cwd, stdio: "inherit" });
  }
  return spawnSync("npm", args, { cwd, stdio: "inherit" });
}

if (!existsSync(join(siteDir, "node_modules"))) {
  console.log("[build-site] Instalando dependencias...");
  const inst = runNpm(["install"], siteDir);
  if (inst.status !== 0) fail("npm install falló en el clon.");
}

console.log("[build-site] Ejecutando npm run build...");
const build = runNpm(["run", "build"], siteDir);
if (build.status !== 0) fail(`Build del clon falló (exit ${build.status}).`);
console.log(`[build-site] ✓ Clon sites/${slug} listo con build verde.`);
