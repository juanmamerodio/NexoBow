// tests/copy-humanization.test.mjs — Suite TDD Seam 2 (Ticket #55: UX Diagram-First +40, Capturas WebP Reales & Humanización 100%)
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

function acquireWebDistLock() {
  const lockDir = join(tmpdir(), "nexobow-web-dist.lock");
  const deadline = Date.now() + 180_000;
  const view = new Int32Array(new SharedArrayBuffer(4));
  while (true) {
    try {
      mkdirSync(lockDir);
      return () => {
        try {
          rmSync(lockDir, { recursive: true, force: true });
        } catch {}
      };
    } catch (err) {
      if (err && err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - statSync(lockDir).mtimeMs > 180_000) {
          rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {}
      if (Date.now() > deadline) {
        throw new Error("Timeout esperando lock de web/dist");
      }
      Atomics.wait(view, 0, 0, 100);
    }
  }
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIR = join(REPO_ROOT, "web");
const DIST_DIR = join(WEB_DIR, "dist");
const DIST_HTML = join(DIST_DIR, "index.html");

const TEN_TEMPLATES = [
  "abogado",
  "clinica",
  "construccion",
  "corporativo",
  "deportes",
  "dermatologia",
  "nutricionista",
  "producto",
  "propiedades",
  "tech",
];

const FORBIDDEN_PATTERNS = [
  { label: "silla vacía", regex: /silla\s+vac[ií]a/i },
  { label: "sillas vacías", regex: /sillas\s+vac[ií]as/i },
  { label: "Anti-Silla Vacía", regex: /anti-silla\s+vac[ií]a/i },
  { label: "Cero-Secretaria", regex: /cero-secretaria/i },
  { label: "estallar tu agenda", regex: /estallar\s+tu\s+agenda/i },
  { label: "revolucionario", regex: /\brevolucionario\b/i },
  { label: "secretos", regex: /\bsecretos\b/i },
  { label: "disruptivo", regex: /\bdisruptivo\b/i },
];

const SOURCE_EXT_RE = /\.(astro|ts|tsx|mjs|js|json|css|html|yml|yaml|sql|example|md|txt)$/i;
const SKIP_DIRS = new Set(["node_modules", "dist", ".astro", ".vite"]);

const CASE_IMAGES = [
  "afterbow-hero.webp",
  "infoproducto-hero.webp",
  "esenciatecnica-hero.webp",
  "sofia-ramos-hero.webp",
];

function collectFiles(dir, { excludeBasenames = new Set() } = {}) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectFiles(full, { excludeBasenames }));
    } else if (SOURCE_EXT_RE.test(entry) && !excludeBasenames.has(entry)) {
      results.push(full);
    }
  }
  return results;
}

function findForbiddenInText(text, fileLabel) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of FORBIDDEN_PATTERNS) {
      const m = line.match(pat.regex);
      if (m) {
        hits.push(`${fileLabel}:${i + 1} [${pat.label}] -> ${m[0]}`);
      }
    }
  }
  return hits;
}

function extractSectionById(html, sectionId) {
  const startMatch = html.match(
    new RegExp(`<section\\b[^>]*\\bid=["']${sectionId}["'][^>]*>`, "i")
  );
  if (!startMatch || startMatch.index === undefined) return "";
  const afterStart = html.slice(startMatch.index);
  const endIdx = afterStart.indexOf("</section>");
  return endIdx === -1 ? afterStart : afterStart.slice(0, endIdx + "</section>".length);
}

test("T55 (Seam 2): Humanización 100%, UX Diagram-First +40 y 4 Capturas WebP Reales", async (t) => {
  await t.test(
    "1. 0 ocurrencias de frases prohibidas en web/src/, web/functions/, los 10 templates/, scripts/, tests/, infra/, workflows/, docs/gate1-vps-activation.md, web/public/llms.txt, routemap.md y .env.example",
    () => {
      const explicitTargets = [
        join(REPO_ROOT, "docs", "gate1-vps-activation.md"),
        join(REPO_ROOT, "web", "public", "llms.txt"),
        join(REPO_ROOT, "routemap.md"),
        join(REPO_ROOT, ".env.example"),
      ];
      for (const explicitPath of explicitTargets) {
        assert.ok(
          existsSync(explicitPath),
          `Archivo auditado requerido no encontrado: ${relative(REPO_ROOT, explicitPath)}`
        );
      }

      const targetFiles = [
        ...collectFiles(join(REPO_ROOT, "web", "src")),
        ...collectFiles(join(REPO_ROOT, "web", "functions")),
        ...TEN_TEMPLATES.flatMap((tpl) =>
          collectFiles(join(REPO_ROOT, "templates", tpl, "src"))
        ),
        ...collectFiles(join(REPO_ROOT, "scripts")),
        ...collectFiles(join(REPO_ROOT, "tests"), {
          excludeBasenames: new Set(["copy-humanization.test.mjs"]),
        }),
        ...collectFiles(join(REPO_ROOT, "infra")),
        ...collectFiles(join(REPO_ROOT, "workflows")),
        ...explicitTargets,
      ];

      const relSet = new Set(targetFiles.map((f) => relative(REPO_ROOT, f).replace(/\\/g, "/")));
      for (const expectedRel of [
        "infra/autonomous/docker-compose.yml",
        "infra/autonomous/.env.autonomous.example",
        "infra/autonomous/sql/001_autonomous_init.sql",
        "workflows/n8n/01-waba-receptionist.json",
        "docs/gate1-vps-activation.md",
        "web/public/llms.txt",
        "routemap.md",
        ".env.example",
      ]) {
        assert.ok(
          relSet.has(expectedRel),
          `La auditoría ampliada debe incluir ${expectedRel}`
        );
      }

      assert.ok(targetFiles.length > 30, "Debe escanear los archivos fuente reales del repo");

      const violations = [];
      for (const filePath of targetFiles) {
        const rel = relative(REPO_ROOT, filePath);
        const content = readFileSync(filePath, "utf8");
        violations.push(...findForbiddenInText(content, rel));
      }

      assert.equal(
        violations.length,
        0,
        `Se encontraron frases prohibidas:\n${violations.join("\n")}`
      );
    }
  );

  const releaseWebDistLock = acquireWebDistLock();
  t.after(releaseWebDistLock);

  await t.test(
    "2. web/ compila con 0 JS de negocio, 0 frases prohibidas en HTML y diagramas SVG en Hero, BeforeAfter, InteractiveFunnel y RoiCalculator",
    async () => {
      const buildRes = spawnSync("npm", ["--prefix", "web", "run", "build"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      assert.equal(
        buildRes.status,
        0,
        `El build de web/ falló:\n${buildRes.stderr}\n${buildRes.stdout}`
      );
      assert.ok(existsSync(DIST_HTML), "web/dist/index.html debe existir tras el build");

      const html = readFileSync(DIST_HTML, "utf8");
      const { auditHtmlDocument } = await import("../scripts/audit-site.mjs");
      const report = auditHtmlDocument(html, {
        mode: "web",
        distDir: DIST_DIR,
        requireWhatsappCta: false,
      });

      assert.equal(report.ok, true, `Auditoría fallida: ${report.errors.join("; ")}`);
      assert.equal(report.executableScriptCount, 0, "Debe tener 0 scripts ejecutables de negocio");
      assert.equal(report.jsBytes, 0, "Debe tener 0 bytes de JS de negocio");
      assert.equal(report.consentLoaderCount, 1, "Debe conservar exactamente 1 consent loader");

      const htmlViolations = findForbiddenInText(html, "web/dist/index.html");
      assert.equal(
        htmlViolations.length,
        0,
        `HTML compilado aún contiene frases prohibidas:\n${htmlViolations.join("\n")}`
      );

      // Hero Diagram-First (4 etapas con SVG)
      const heroDiagramMatch = html.match(
        /data-diagram=["']hero-flow["'][\s\S]*?<\/ol>/i
      );
      assert.ok(heroDiagramMatch, "Hero debe incluir diagrama data-diagram='hero-flow'");
      assert.match(heroDiagramMatch[0], /<svg\b/i, "Hero diagram debe incluir conectores SVG");
      assert.match(heroDiagramMatch[0], /Te buscan en Google/i);
      assert.match(heroDiagramMatch[0], /Ven tu página clara/i);
      assert.match(heroDiagramMatch[0], /Eligen horario o escriben decididos/i);
      assert.match(heroDiagramMatch[0], /Vos solo atendés/i);

      // BeforeAfter Diagram-First (3 pasos cortos antes + 3 pasos cortos después con SVG)
      const beforeBlock = extractSectionById(html, "problema");
      assert.ok(beforeBlock, "Debe existir la sección #problema");
      assert.match(beforeBlock, /data-diagram=["']before-flow["']/i);
      assert.match(beforeBlock, /data-diagram=["']after-flow["']/i);
      assert.match(beforeBlock, /<svg\b/i, "BeforeAfter debe incluir conectores/iconos SVG");

      // InteractiveFunnel (4 radios 0-JS + 4 diagramas de 3 nodos con SVG)
      const funnelBlock = extractSectionById(html, "como-funciona");
      assert.ok(funnelBlock, "Debe existir la sección #como-funciona");
      const funnelRadios = funnelBlock.match(/<input\b[^>]*type=["']radio["'][^>]*name=["']funnel-step["']/gi) || [];
      assert.equal(funnelRadios.length, 4, "InteractiveFunnel debe tener 4 controles radio 0-JS");
      for (const step of [1, 2, 3, 4]) {
        const panelDiagramRe = new RegExp(
          `data-diagram=["']funnel-step-${step}["'][\\s\\S]*?<svg\\b`,
          "i"
        );
        assert.match(
          funnelBlock,
          panelDiagramRe,
          `Panel ${step} de InteractiveFunnel debe incluir diagrama SVG (data-diagram='funnel-step-${step}')`
        );
      }

      // RoiCalculator (3 radios 0-JS + barra visual SVG "Horas que recuperás por semana")
      const roiBlock = extractSectionById(html, "calculadora-roi");
      assert.ok(roiBlock, "Debe existir la sección #calculadora-roi");
      const roiRadios = roiBlock.match(/<input\b[^>]*type=["']radio["'][^>]*name=["']roi-tier["']/gi) || [];
      assert.equal(roiRadios.length, 3, "RoiCalculator debe tener 3 controles radio 0-JS");
      assert.match(roiBlock, /data-diagram=["']roi-hours-bar["']/i);
      assert.match(roiBlock, /<svg\b/i, "RoiCalculator debe incluir SVG comparativo");
      assert.match(roiBlock, /Horas que recuperás por semana/i);
    }
  );

  await t.test(
    "3. Las 4 capturas WebP (1440x900, < 120 KB) existen y se renderizan en CaseStudies con alt, dimensiones fijas, loading='lazy', decoding='async' y aspect-video",
    async () => {
      const publicCasesDir = join(WEB_DIR, "public", "images", "cases");
      const distCasesDir = join(DIST_DIR, "images", "cases");

      for (const filename of CASE_IMAGES) {
        const pubPath = join(publicCasesDir, filename);
        const distPath = join(distCasesDir, filename);

        assert.ok(existsSync(pubPath), `Falta archivo fuente en ${pubPath}`);
        assert.ok(existsSync(distPath), `Falta archivo compilado en ${distPath}`);

        const buf = readFileSync(pubPath);
        assert.ok(buf.byteLength > 5120, `${filename} es demasiado chico (${buf.byteLength} bytes)`);
        assert.ok(
          buf.byteLength < 120 * 1024,
          `${filename} supera 120 KB (${buf.byteLength} bytes)`
        );
        assert.equal(buf.subarray(0, 4).toString("ascii"), "RIFF", `${filename} no tiene cabecera RIFF`);
        assert.equal(buf.subarray(8, 12).toString("ascii"), "WEBP", `${filename} no tiene firma WEBP`);

        const meta = await sharp(pubPath).metadata();
        assert.equal(meta.format, "webp", `${filename} debe ser formato webp`);
        assert.equal(meta.width, 1440, `${filename} debe medir 1440px de ancho`);
        assert.equal(meta.height, 900, `${filename} debe medir 900px de alto`);
      }

      const html = readFileSync(DIST_HTML, "utf8");
      const casesSection = extractSectionById(html, "casos-de-exito");
      assert.ok(casesSection, "Debe existir la sección #casos-de-exito");

      for (const filename of CASE_IMAGES) {
        const imgTagMatch = casesSection.match(
          new RegExp(`<img\\b[^>]*src=["']/images/cases/${filename}["'][^>]*>`, "i")
        );
        assert.ok(imgTagMatch, `CaseStudies debe renderizar <img src="/images/cases/${filename}">`);
        const imgTag = imgTagMatch[0];

        const altMatch = imgTag.match(/\balt=["']([^"']+)["']/i);
        assert.ok(altMatch && altMatch[1].trim().length > 10, `${filename} debe tener alt descriptivo`);
        assert.doesNotMatch(altMatch[1], /^(imagen de|picture of)/i);
        assert.match(imgTag, /\bwidth=["']1440["']/i, `${filename} debe declarar width="1440"`);
        assert.match(imgTag, /\bheight=["']900["']/i, `${filename} debe declarar height="900"`);
        assert.match(imgTag, /\bloading=["']lazy["']/i, `${filename} debe usar loading="lazy"`);
        assert.match(imgTag, /\bdecoding=["']async["']/i, `${filename} debe usar decoding="async"`);
        assert.match(imgTag, /\baspect-video\b/i, `${filename} debe incluir clase aspect-video`);
      }
    }
  );
});
