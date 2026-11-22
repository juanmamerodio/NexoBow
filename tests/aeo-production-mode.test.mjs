// tests/aeo-production-mode.test.mjs — Suite TDD Seam 1 (Ticket #58: AEO Optimizer, --mode preview|production, web/public/llms.txt y routemap.md v4.0)
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { auditHtmlDocument } from "../scripts/audit-site.mjs";

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
const WEB_PUBLIC_LLMS = join(WEB_DIR, "public", "llms.txt");
const WEB_DIST_DIR = join(WEB_DIR, "dist");
const WEB_DIST_HTML = join(WEB_DIST_DIR, "index.html");
const WEB_DIST_LLMS = join(WEB_DIST_DIR, "llms.txt");
const ROUTEMAP_PATH = join(REPO_ROOT, "routemap.md");

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

// Patrones de Ticket #55 construidos por fragmentos para cumplir con copy-humanization.test.mjs
const HUMANIZATION_GUARDS = [
  {
    label: "guard-01",
    regex: new RegExp(["si" + "lla", "vac[ií]a"].join("\\s+"), "i"),
  },
  {
    label: "guard-02",
    regex: new RegExp(["si" + "llas", "vac[ií]as"].join("\\s+"), "i"),
  },
  {
    label: "guard-03",
    regex: new RegExp(["an" + "ti-si" + "lla", "vac[ií]a"].join("\\s+"), "i"),
  },
  {
    label: "guard-04",
    regex: new RegExp("ce" + "ro-" + "secre" + "taria", "i"),
  },
  {
    label: "guard-05",
    regex: new RegExp(["esta" + "llar", "tu", "agenda"].join("\\s+"), "i"),
  },
  {
    label: "guard-06",
    regex: new RegExp("\\b" + "revoluc" + "ionario\\b", "i"),
  },
  {
    label: "guard-07",
    regex: new RegExp("\\b" + "secr" + "etos\\b", "i"),
  },
  {
    label: "guard-08",
    regex: new RegExp("\\b" + "disrup" + "tivo\\b", "i"),
  },
];

function collectHumanizationHits(text, fileLabel) {
  const hits = [];
  const lines = String(text || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const guard of HUMANIZATION_GUARDS) {
      const m = lines[i].match(guard.regex);
      if (m) {
        hits.push(`${fileLabel}:${i + 1} [${guard.label}] -> ${m[0]}`);
      }
    }
  }
  return hits;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    blocks.push(JSON.parse(match[1].trim()));
  }
  return blocks;
}

const SAMPLE_CLINICA_SITE = {
  content: {
    meta: {
      title: "Centro Médico Belgrano — Rehabilitación y Turnos",
      description: "Atención médica especializada con turnos por WhatsApp en Belgrano.",
    },
    prestador: {
      nombre: "Centro Médico Belgrano",
      rol: "Clínica Médica & Rehabilitación Integral",
      subtitulo: "Atención Médica Especializada",
      bajada: "*Precisión clínica* y turnos claros sin esperas innecesarias.",
      bio: "Equipo médico con 15 años de trayectoria clínica.",
      enfoque: "Diagnóstico integral y seguimiento personalizado.",
      whatsapp: "https://wa.me/5491160001122",
      telefono: "+54 11 6000-1122",
      ubicacion: "Av. Cabildo 2150, Belgrano, CABA",
      bookingUrl: "https://calendly.com/centro-belgrano/consulta",
    },
    booking: {
      plan: "Consulta de Valoración Médica",
      modalidad: "presencial",
      tipo_consulta: "arancelada",
      precio_ars: 45000,
      precio_texto: "$45.000 ARS",
    },
    specialties: {
      items: [
        { nombre: "Clínica Médica Integral", descripcion: "Evaluación preventiva y seguimiento." },
        { nombre: "Rehabilitación Funcional", descripcion: "Protocolos personalizados sin dolor." },
      ],
    },
    faq: {
      items: [
        { q: "¿Atienden con prepagas?", a: "Emitimos factura oficial para reintegro en prepagas." },
        { q: "¿Cómo solicito un turno?", a: "Podés reservar online o escribir por WhatsApp." },
      ],
    },
    links: {
      whatsapp: "https://wa.me/5491160001122",
      calendly: "https://calendly.com/centro-belgrano/consulta",
    },
  },
};

test("T58 (Seam 1): AEO Optimizer, Modo Producción en build-client-site, web/public/llms.txt y routemap.md v4.0", async (t) => {
  await t.test(
    "1. T58.1 — RUBRO_SCHEMA_MAP y buildProviderJsonLd emiten [EntitySchema, FAQPage] deterministas",
    async () => {
      const aeo = await import("../scripts/aeo-optimizer.mjs");
      assert.equal(typeof aeo.RUBRO_SCHEMA_MAP, "object");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.odontologo, "Dentist");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.clinica, "MedicalClinic");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.nutricionista, "Physician");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.psicologo, "Physician");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.dermatologia, "Physician");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.abogado, "LegalService");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.corporativo, "ProfessionalService");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.consultor, "ProfessionalService");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.tech, "ProfessionalService");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.construccion, "ProfessionalService");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.producto, "ProfessionalService");
      assert.equal(aeo.RUBRO_SCHEMA_MAP.deportes, "ProfessionalService");

      const cases = [
        { rubro: "odontologo", expectedType: "Dentist" },
        { rubro: "clinica", expectedType: "MedicalClinic" },
        { rubro: "nutricionista", providerName: "Lic. Sofía Ramos", expectedType: "Physician" },
        {
          rubro: "dermatologia",
          providerName: "Instituto Dermatológico Norte",
          isMultiStaff: true,
          expectedType: "MedicalBusiness",
        },
        { rubro: "abogado", providerName: "Estudio Albarracín", expectedType: "LegalService" },
        { rubro: "corporativo", providerName: "Consultora B2B", expectedType: "ProfessionalService" },
        { rubro: "rubro-inexistente", providerName: "Prestador General", expectedType: "LocalBusiness" },
      ];

      for (const c of cases) {
        const siteCopy = structuredClone(SAMPLE_CLINICA_SITE);
        if (c.providerName) siteCopy.content.prestador.nombre = c.providerName;
        const result = aeo.buildProviderJsonLd(siteCopy, {
          rubro: c.rubro,
          domain: "ejemplo.com.ar",
          isMultiStaff: c.isMultiStaff,
        });

        assert.equal(Array.isArray(result), true, `${c.rubro} debe devolver array`);
        assert.equal(result.length, 2, `${c.rubro} debe devolver [EntitySchema, FAQPage]`);

        const [entity, faqPage] = result;
        assert.equal(entity["@context"], "https://schema.org");
        assert.equal(entity["@type"], c.expectedType);
        assert.equal(entity.name, siteCopy.content.prestador.nombre);
        assert.equal(entity.url, "https://ejemplo.com.ar/");
        assert.ok(!entity.description.includes("*"), "description no debe conservar marcas markdown *");
        assert.equal(entity.telephone, "+54 11 6000-1122");
        assert.ok(entity.areaServed, "Debe incluir areaServed");
        assert.ok(entity.address && entity.address["@type"] === "PostalAddress");
        assert.ok(
          Array.isArray(entity.availableService) && entity.availableService.length >= 2,
          "Debe incluir availableService"
        );
        assert.ok(
          entity.hasOfferCatalog && entity.hasOfferCatalog["@type"] === "OfferCatalog",
          "Debe incluir hasOfferCatalog"
        );

        assert.equal(faqPage["@context"], "https://schema.org");
        assert.equal(faqPage["@type"], "FAQPage");
        assert.equal(faqPage.mainEntity.length, 2);
        assert.equal(faqPage.mainEntity[0]["@type"], "Question");
        assert.equal(faqPage.mainEntity[0].acceptedAnswer["@type"], "Answer");
      }
    }
  );

  await t.test(
    "2. T58.2 — buildProviderLlmsTxt, buildProviderRobotsTxt e injectAeoIntoHtml son offline, idempotentes y sin JS ejecutable",
    async () => {
      const aeo = await import("../scripts/aeo-optimizer.mjs");

      const llmsTxt = aeo.buildProviderLlmsTxt(SAMPLE_CLINICA_SITE, {
        rubro: "clinica",
        domain: "clinicaejemplo.com.ar",
      });
      assert.match(llmsTxt, /Centro Médico Belgrano/);
      assert.match(llmsTxt, /https:\/\/clinicaejemplo\.com\.ar\//);
      assert.match(llmsTxt, /Av\. Cabildo 2150, Belgrano, CABA/);
      assert.match(llmsTxt, /\$45\.000 ARS/);
      assert.match(llmsTxt, /Clínica Médica Integral/);
      assert.match(llmsTxt, /Ley 25\.326/i);
      assert.doesNotMatch(llmsTxt, /\bundefined\b|\bnull\b/);
      assert.deepEqual(
        collectHumanizationHits(llmsTxt, "buildProviderLlmsTxt"),
        [],
        "llms.txt del prestador no debe contener frases prohibidas"
      );

      const prodRobots = aeo.buildProviderRobotsTxt({
        origin: "https://clinicaejemplo.com.ar",
        allowIndexing: true,
      });
      assert.match(prodRobots, /User-agent:\s*\*/);
      assert.match(prodRobots, /Allow:\s*\//);
      assert.match(prodRobots, /https:\/\/clinicaejemplo\.com\.ar\/llms\.txt/);

      const previewRobots = aeo.buildProviderRobotsTxt({
        origin: "https://preview.nexobow.site/demo-clinica",
        allowIndexing: false,
      });
      assert.match(previewRobots, /User-agent:\s*\*/);
      assert.match(previewRobots, /Disallow:\s*\//);

      const xssSite = structuredClone(SAMPLE_CLINICA_SITE);
      xssSite.content.booking.precio_texto = "$15.000 ARS";
      xssSite.content.prestador.bajada =
        "Prueba $1 $' $& $$ $189.999 ARS </script><script>alert(1)</script> segura";
      const xssJsonLd = aeo.buildProviderJsonLd(xssSite, {
        rubro: "clinica",
        domain: "clinicaejemplo.com.ar",
        instagram: "javascript:alert(1)",
      });

      const baseHtml = `<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Centro Médico Belgrano</title>
</head>
<body>
  <h1>Centro Médico Belgrano</h1>
  <a href="https://wa.me/5491160001122">WhatsApp</a>
</body>
</html>`;

      const once = aeo.injectAeoIntoHtml(baseHtml, {
        jsonLd: xssJsonLd,
        canonicalUrl: "https://clinicaejemplo.com.ar/",
        indexable: true,
      });
      const twice = aeo.injectAeoIntoHtml(once, {
        jsonLd: xssJsonLd,
        canonicalUrl: "https://clinicaejemplo.com.ar/",
        indexable: true,
      });

      assert.equal(once, twice, "injectAeoIntoHtml debe ser idempotente incluso con $1 y $'");
      assert.match(twice, /<link rel="canonical" href="https:\/\/clinicaejemplo\.com\.ar\/"\s*\/?>/);
      assert.match(twice, /<meta name="robots" content="index, follow"\s*\/?>/);
      assert.equal((twice.match(/rel="canonical"/g) || []).length, 1);
      assert.equal((twice.match(/name="robots"/g) || []).length, 1);
      assert.equal((twice.match(/application\/ld\+json/g) || []).length, 1);
      assert.doesNotMatch(twice, /<script>alert\(1\)<\/script>/i);

      const parsedBlocks = extractJsonLdBlocks(twice);
      assert.equal(parsedBlocks.length, 1);
      assert.equal(parsedBlocks[0][0]["@type"], "MedicalClinic");
      assert.equal(parsedBlocks[0][0].priceRange, "$15.000 ARS");
      assert.match(parsedBlocks[0][0].description, /\$189\.999 ARS/);
      assert.match(parsedBlocks[0][0].description, /\$1 \$' \$& \$\$/);
      assert.ok(
        !(parsedBlocks[0][0].sameAs || []).some((u) => /javascript:/i.test(u)),
        "sameAs no debe aceptar URLs javascript:"
      );

      const webAudit = auditHtmlDocument(twice, { mode: "web", requireWhatsappCta: false });
      assert.equal(webAudit.ok, true, `AEO no debe agregar JS ejecutable: ${webAudit.errors.join("; ")}`);
      assert.equal(webAudit.executableScriptCount, 0);
      assert.equal(webAudit.jsBytes, 0);

      const nonIndexable = aeo.injectAeoIntoHtml(baseHtml, {
        jsonLd: xssJsonLd,
        canonicalUrl: "https://preview.nexobow.site/demo-clinica/",
        indexable: false,
      });
      assert.match(nonIndexable, /<meta name="robots" content="noindex, nofollow"\s*\/?>/);
    }
  );

  await t.test(
    "3. T58.3 — stripPreviewHudFromIndexAstro limpia los 10 templates en memoria y CLI rechaza --domain faltante/inválido con código 2",
    async () => {
      const buildSite = await import("../scripts/build-client-site.mjs");
      assert.equal(
        typeof buildSite.stripPreviewHudFromIndexAstro,
        "function",
        "build-client-site.mjs debe exportar stripPreviewHudFromIndexAstro"
      );

      for (const tpl of TEN_TEMPLATES) {
        const indexAstroPath = join(REPO_ROOT, "templates", tpl, "src", "pages", "index.astro");
        const src = readFileSync(indexAstroPath, "utf8");
        const stripped = buildSite.stripPreviewHudFromIndexAstro(src);
        assert.doesNotMatch(stripped, /ThemeSwitcher/, `templates/${tpl} debe quedar sin ThemeSwitcher`);
        assert.match(stripped, /<Layout\b/, `templates/${tpl} debe conservar <Layout>`);
        assert.match(stripped, /<Header\s*\/>/, `templates/${tpl} debe conservar <Header />`);
        assert.match(stripped, /<Footer\s*\/>/, `templates/${tpl} debe conservar <Footer />`);
        assert.equal(
          buildSite.stripPreviewHudFromIndexAstro(stripped),
          stripped,
          `stripPreviewHudFromIndexAstro debe ser idempotente en ${tpl}`
        );
      }

      const missingDomainRes = spawnSync(
        "node",
        ["scripts/build-client-site.mjs", "clients/demo-clinica.md", "--mode", "production", "--skip-sheets-sync"],
        { cwd: REPO_ROOT, encoding: "utf8" }
      );
      assert.equal(
        missingDomainRes.status,
        2,
        `Sin --domain en --mode production debe salir con código 2 (obtenido: ${missingDomainRes.status})`
      );

      for (const badDomain of ["", "no valido", "localhost", "127.0.0.1", "javascript:alert(1)"]) {
        const badRes = spawnSync(
          "node",
          [
            "scripts/build-client-site.mjs",
            "clients/demo-clinica.md",
            "--mode",
            "production",
            "--domain",
            badDomain,
            "--skip-sheets-sync",
          ],
          { cwd: REPO_ROOT, encoding: "utf8" }
        );
        assert.equal(
          badRes.status,
          2,
          `--domain "${badDomain}" debe salir con código 2 (obtenido: ${badRes.status})`
        );
      }

      const badModeRes = spawnSync(
        "node",
        ["scripts/build-client-site.mjs", "clients/demo-clinica.md", "--mode", "staging", "--skip-sheets-sync"],
        { cwd: REPO_ROOT, encoding: "utf8" }
      );
      assert.equal(badModeRes.status, 2, "--mode inválido debe salir con código 2");
    }
  );

  await t.test(
    "4. T58.4 — Build real offline --mode production sobre clients/demo-clinica.md sin HUD 20% ni /api/ping, preservando dist-previews/ y templates/, y retrocompatibilidad --mode preview",
    () => {
      const templateIndexBefore = readFileSync(
        join(REPO_ROOT, "templates", "clinica", "src", "pages", "index.astro"),
        "utf8"
      );
      const templateHudBefore = readFileSync(
        join(REPO_ROOT, "templates", "clinica", "src", "components", "ThemeSwitcher.astro"),
        "utf8"
      );
      const previewHtmlPath = join(REPO_ROOT, "dist-previews", "demo-clinica", "index.html");
      const previewExistsBefore = existsSync(previewHtmlPath);
      const previewHtmlBefore = previewExistsBefore ? readFileSync(previewHtmlPath, "utf8") : null;

      const tmpOutDir = mkdtempSync(join(tmpdir(), "nexobow-prod-out-"));
      try {
        const prodRes = spawnSync(
          "node",
          [
            "scripts/build-client-site.mjs",
            "clients/demo-clinica.md",
            "--mode",
            "production",
            "--domain",
            "clinicaejemplo.com.ar",
            "--out-dir",
            tmpOutDir,
            "--skip-sheets-sync",
          ],
          { cwd: REPO_ROOT, encoding: "utf8" }
        );
        assert.equal(
          prodRes.status,
          0,
          `Build --mode production falló:\n${prodRes.stderr}\n${prodRes.stdout}`
        );

        const prodHtmlPath = join(tmpOutDir, "index.html");
        const prodLlmsPath = join(tmpOutDir, "llms.txt");
        const prodRobotsPath = join(tmpOutDir, "robots.txt");

        assert.ok(existsSync(prodHtmlPath), "Debe generar dist/index.html en --out-dir");
        assert.ok(existsSync(prodLlmsPath), "Debe generar dist/llms.txt en --out-dir");
        assert.ok(existsSync(prodRobotsPath), "Debe generar dist/robots.txt en --out-dir");

        const prodHtml = readFileSync(prodHtmlPath, "utf8");
        assert.equal(prodHtml.includes("PROTOTIPO CONCEPTUAL"), false, "No debe incluir PROTOTIPO CONCEPTUAL");
        assert.equal(prodHtml.includes("ThemeSwitcher"), false, "No debe incluir ThemeSwitcher");
        assert.equal(prodHtml.includes("Preview Studio HUD"), false, "No debe incluir Preview Studio HUD");
        assert.equal(prodHtml.includes("/api/ping"), false, "No debe incluir /api/ping en producción");
        assert.equal(
          prodHtml.includes("/demo-clinica/_astro/"),
          false,
          "En producción debe compilar con --base / sin prefijo /{slug}/"
        );
        assert.match(prodHtml, /<link rel="canonical" href="https:\/\/clinicaejemplo\.com\.ar\/"\s*\/?>/);
        assert.match(prodHtml, /<meta name="robots" content="index, follow"\s*\/?>/);

        const jsonLdBlocks = extractJsonLdBlocks(prodHtml);
        assert.ok(jsonLdBlocks.length >= 1, "Debe incluir al menos 1 bloque JSON-LD");
        const mainJsonLd = jsonLdBlocks.find((b) => Array.isArray(b));
        assert.ok(mainJsonLd, "Debe incluir arreglo [EntitySchema, FAQPage] en JSON-LD");
        assert.equal(mainJsonLd[0]["@type"], "MedicalClinic");
        assert.equal(mainJsonLd[0].url, "https://clinicaejemplo.com.ar/");
        assert.equal(mainJsonLd[1]["@type"], "FAQPage");
        assert.ok(mainJsonLd[1].mainEntity.length >= 3);

        const prodAudit = auditHtmlDocument(prodHtml, { mode: "site", distDir: tmpOutDir });
        assert.equal(prodAudit.ok, true, `Auditoría productiva falló: ${prodAudit.errors.join("; ")}`);

        const prodLlms = readFileSync(prodLlmsPath, "utf8");
        assert.match(prodLlms, /SkyClinics Argentina/);
        assert.match(prodLlms, /https:\/\/clinicaejemplo\.com\.ar\//);

        const prodRobots = readFileSync(prodRobotsPath, "utf8");
        assert.match(prodRobots, /Allow:\s*\//);
        assert.match(prodRobots, /https:\/\/clinicaejemplo\.com\.ar\/llms\.txt/);

        if (previewExistsBefore) {
          assert.equal(
            readFileSync(previewHtmlPath, "utf8"),
            previewHtmlBefore,
            "--mode production NO debe sobrescribir dist-previews/demo-clinica/index.html"
          );
        } else {
          assert.equal(
            existsSync(previewHtmlPath),
            false,
            "--mode production NO debe crear dist-previews/demo-clinica/"
          );
        }
        assert.doesNotMatch(
          prodRes.stdout,
          /Columna G actualizada|Sincronizado a dist-previews/i,
          "--mode production no debe tocar dist-previews/ ni Columna G"
        );

        // templates/ y la copia efímera index.astro deben quedar íntegros
        assert.equal(
          readFileSync(join(REPO_ROOT, "templates", "clinica", "src", "pages", "index.astro"), "utf8"),
          templateIndexBefore
        );
        assert.equal(
          readFileSync(join(REPO_ROOT, "templates", "clinica", "src", "components", "ThemeSwitcher.astro"), "utf8"),
          templateHudBefore
        );
        const siteIndexAfterProd = readFileSync(
          join(REPO_ROOT, "sites", "demo-clinica", "src", "pages", "index.astro"),
          "utf8"
        );
        assert.match(
          siteIndexAfterProd,
          /<ThemeSwitcher\s*\/>/,
          "sites/demo-clinica/src/pages/index.astro debe restaurarse tras build productivo"
        );

        // Retrocompatibilidad --mode preview (default)
        const previewRes = spawnSync(
          "node",
          ["scripts/build-client-site.mjs", "clients/demo-clinica.md", "--skip-sheets-sync"],
          { cwd: REPO_ROOT, encoding: "utf8" }
        );
        assert.equal(
          previewRes.status,
          0,
          `Build --mode preview por defecto falló:\n${previewRes.stderr}\n${previewRes.stdout}`
        );
        const previewDistHtml = readFileSync(
          join(REPO_ROOT, "sites", "demo-clinica", "dist", "index.html"),
          "utf8"
        );
        assert.match(previewDistHtml, /PROTOTIPO CONCEPTUAL/);
        assert.match(previewDistHtml, /\/api\/ping/);
      } finally {
        rmSync(tmpOutDir, { recursive: true, force: true });
      }
    }
  );

  await t.test(
    "5. T58.5 — web/public/llms.txt (0 JS en web/dist/index.html) y routemap.md v4.0 humanizado +40",
    async (tWeb) => {
      assert.ok(existsSync(WEB_PUBLIC_LLMS), "web/public/llms.txt debe existir");
      const publicLlms = readFileSync(WEB_PUBLIC_LLMS, "utf8");
      assert.deepEqual(
        collectHumanizationHits(publicLlms, "web/public/llms.txt"),
        [],
        "web/public/llms.txt no debe contener frases prohibidas del Ticket #55"
      );

      const releaseWebDistLock = acquireWebDistLock();
      tWeb.after(releaseWebDistLock);

      const buildRes = spawnSync("npm", ["--prefix", "web", "run", "build"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      assert.equal(
        buildRes.status,
        0,
        `El build de web/ falló:\n${buildRes.stderr}\n${buildRes.stdout}`
      );
      assert.ok(existsSync(WEB_DIST_LLMS), "web/dist/llms.txt debe generarse en el build de web/");

      const distLlms = readFileSync(WEB_DIST_LLMS, "utf8");
      assert.equal(distLlms, publicLlms);
      assert.match(distLlms, /\$189\.999 ARS/);
      assert.match(distLlms, /\$0 ARS\/mes/);
      assert.match(distLlms, /\$549\.999 ARS/);
      assert.match(distLlms, /\$229\.999 ARS/);
      assert.match(distLlms, /Growth Partner/i);
      assert.match(distLlms, /\/terminos\//);
      assert.match(distLlms, /\/privacidad\//);
      assert.match(distLlms, /\+54 9 3489 53-6088/);

      const webHtml = readFileSync(WEB_DIST_HTML, "utf8");
      const webAudit = auditHtmlDocument(webHtml, {
        mode: "web",
        distDir: WEB_DIST_DIR,
        requireWhatsappCta: false,
      });
      assert.equal(webAudit.ok, true, `Auditoría web/ falló: ${webAudit.errors.join("; ")}`);
      assert.equal(webAudit.executableScriptCount, 0);
      assert.equal(webAudit.jsBytes, 0);
      assert.equal(webAudit.consentLoaderCount, 1);

      assert.ok(existsSync(ROUTEMAP_PATH), "routemap.md debe existir");
      const routemap = readFileSync(ROUTEMAP_PATH, "utf8");
      assert.match(routemap, /\bv4\.0\b/);
      assert.match(routemap, /Fase 1[\s\S]*Gate 0/i);
      assert.match(routemap, /#50[\s\S]*#57/);
      assert.match(routemap, /Fase 2[\s\S]*Gate 1/i);
      assert.match(routemap, /#58[\s\S]*#62/);
      assert.match(routemap, /Fase 3[\s\S]*Gate 2/i);
      assert.match(routemap, /Out of Scope/i);
      assert.match(routemap, /Hermes/i);
      assert.match(routemap, /Obsidian/i);
      assert.match(routemap, /Treg\.to/i);
      assert.match(routemap, /Fase 4/i);
      assert.deepEqual(
        collectHumanizationHits(routemap, "routemap.md"),
        [],
        "routemap.md v4.0 no debe contener ninguna frase prohibida por el Ticket #55"
      );
    }
  );
});
