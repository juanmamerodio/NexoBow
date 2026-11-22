// tests/legal-seo-cookies.test.mjs — Suite TDD Seam 1 (Ticket #54: Legal, Cookies + GA4, SEO +40 & Google Business Profile)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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
      if (Date.now() > deadline) throw new Error("Timeout esperando lock de web/dist");
      Atomics.wait(view, 0, 0, 100);
    }
  }
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIR = join(REPO_ROOT, "web");
const DIST_DIR = join(WEB_DIR, "dist");

const INDEX_HTML = join(DIST_DIR, "index.html");
const TERMINOS_HTML = join(DIST_DIR, "terminos", "index.html");
const PRIVACIDAD_HTML = join(DIST_DIR, "privacidad", "index.html");
const CONFIRM_HTML = join(DIST_DIR, "solicitud-enviada", "index.html");
const BAJA_HTML = join(DIST_DIR, "baja-email", "index.html");
const ADMIN_HTML = join(DIST_DIR, "admin", "index.html");
const SITEMAP_XML = join(DIST_DIR, "sitemap.xml");
const ROBOTS_TXT = join(DIST_DIR, "robots.txt");
const HEADERS_FILE = join(DIST_DIR, "_headers");

function extractJsonLdBlocks(html) {
  const matches = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  return matches.map((m) => JSON.parse(m[1]));
}

function stripTags(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test("T54 (Seam 1): Marco Legal, Cookies + GA4 Condicional, SEO de Marca +40 & Google Business Profile", async (t) => {
  const releaseWebDistLock = acquireWebDistLock();
  t.after(releaseWebDistLock);

  await t.test("1. Build de web/ genera rutas legales, sitemap.xml y páginas públicas", () => {
    const buildRes = spawnSync("npm", ["--prefix", "web", "run", "build"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    assert.equal(
      buildRes.status,
      0,
      `El build de web/ falló:\n${buildRes.stderr}\n${buildRes.stdout}`
    );

    assert.ok(existsSync(INDEX_HTML), "web/dist/index.html debe existir");
    assert.ok(existsSync(TERMINOS_HTML), "web/dist/terminos/index.html debe existir");
    assert.ok(existsSync(PRIVACIDAD_HTML), "web/dist/privacidad/index.html debe existir");
    assert.ok(existsSync(CONFIRM_HTML), "web/dist/solicitud-enviada/index.html debe existir");
    assert.ok(existsSync(SITEMAP_XML), "web/dist/sitemap.xml debe existir");
    assert.ok(existsSync(ADMIN_HTML), "web/dist/admin/index.html debe existir");
  });

  const { auditHtmlDocument } = await import("../scripts/audit-site.mjs");

  await t.test("2. /terminos/ cumple Soft-Obsidian, 0 JS de negocio, #reembolsos y #debito-automatico", () => {
    const html = readFileSync(TERMINOS_HTML, "utf8");
    const text = stripTags(html);

    assert.doesNotMatch(html, /#DB1FFF/i, "Prohibido el neón obsoleto #DB1FFF");
    assert.match(html, /#040607|#0B0D12|#BF40FA/i, "Debe conservar estética Soft-Obsidian");

    const audit = auditHtmlDocument(html, {
      mode: "web",
      distDir: DIST_DIR,
      requireWhatsappCta: false,
    });
    assert.equal(audit.ok, true, `Auditoría fallida en /terminos/: ${audit.errors.join("; ")}`);
    assert.equal(audit.executableScriptCount, 0, "/terminos/ debe tener 0 scripts ejecutables de negocio");
    assert.equal(audit.jsBytes, 0, "/terminos/ debe tener 0 bytes de JS de negocio");

    // Contenido contractual obligatorio
    assert.match(text, /objeto del servicio/i);
    assert.match(text, /7 días/i);
    assert.match(text, /propiedad intelectual/i);
    assert.match(text, /CABA|Ciudad Autónoma de Buenos Aires/i);
    assert.match(text, /Provincia de Buenos Aires/i);
    assert.match(text, /responsabilidad/i);

    // #reembolsos
    assert.match(html, /id=["']reembolsos["']/i, "Debe existir el ancla #reembolsos");
    assert.match(text, /Etapa 0/i);
    assert.match(text, /72 horas hábiles/i);
    assert.match(text, /(<1s|< 1s|1 segundo)/i);
    assert.match(text, /14 días corridos/i);
    assert.match(text, /100%/);
    assert.match(text, /gastos directos no reembolsables de terceros/i);
    assert.match(text, /dominio/i);
    assert.match(text, /abonos mensuales/i);

    // #debito-automatico
    assert.match(html, /id=["']debito-automatico["']/i, "Debe existir el ancla #debito-automatico");
    assert.match(text, /Plan Starter/i);
    assert.match(text, /\$0\s*ARS\/mes/i);
    assert.match(text, /12 meses|Año 1/i);
    assert.match(text, /mes 11/i);
    assert.match(text, /30 días/i);
    assert.match(text, /Plan Autonomous/i);
    assert.match(text, /1\s*(y|al)\s*(el\s*)?5/i);
    assert.match(text, /día 31/i);
    assert.match(text, /IPC/i);
    assert.match(text, /15 días/i);
    assert.match(text, /3 reintentos/i);
    assert.match(text, /10 días/i);
    assert.match(text, /48 horas hábiles/i);
  });

  await t.test("3. /privacidad/ cumple Ley 25.326, derechos ARCO, AAIP, tabla accesible #retencion y #cookies", () => {
    const html = readFileSync(PRIVACIDAD_HTML, "utf8");
    const text = stripTags(html);

    const audit = auditHtmlDocument(html, {
      mode: "web",
      distDir: DIST_DIR,
      requireWhatsappCta: false,
    });
    assert.equal(audit.ok, true, `Auditoría fallida en /privacidad/: ${audit.errors.join("; ")}`);
    assert.equal(audit.executableScriptCount, 0);
    assert.equal(audit.jsBytes, 0);

    // Marco Ley 25.326 + ARCO + AAIP
    assert.match(text, /Ley\s*(N°\s*)?25\.326/i);
    assert.match(text, /NexoBow/i);
    assert.match(text, /Juanma Merodio/i);
    assert.match(text, /ARCO/i);
    assert.match(text, /acceso,\s*rectificación,\s*actualización\s*y\s*supresión/i);
    assert.match(text, /Agencia de Acceso a la Información Pública|AAIP/i);

    // Tabla accesible #retencion
    assert.match(html, /id=["']retencion["']/i, "Debe existir la sección #retencion");
    assert.match(html, /<table\b/i, "Debe usar <table> semántica para la tabla de retención");
    assert.match(html, /<caption\b/i, "La tabla de retención debe incluir <caption>");
    assert.match(html, /<thead\b/i, "La tabla de retención debe incluir <thead>");
    assert.match(html, /scope=["']col["']/i, "Los encabezados de columna deben tener scope='col'");
    assert.match(html, /scope=["']row["']/i, "Los encabezados de fila deben tener scope='row'");
    assert.match(html, /role=["']region["']/i, "El contenedor scrollable debe tener role='region'");
    assert.match(html, /tabindex=["']0["']/i, "El contenedor scrollable debe tener tabindex='0'");

    // 5 plazos exactos
    assert.match(text, /7 días/i);
    assert.match(text, /90 días/i);
    assert.match(text, /unsubscribed/i);
    assert.match(text, /indefinid/i);
    assert.match(text, /30 días/i);
    assert.match(text, /10 años/i);
    assert.match(text, /ARCA|AFIP/i);

    // #cookies + botón de reconfiguración
    assert.match(html, /id=["']cookies["']/i, "Debe existir la sección #cookies");
    assert.match(text, /Consent Mode/i);
    assert.match(html, /data-open-cookie-settings/i, "Debe incluir botón para reabrir preferencias de cookies");
  });

  await t.test("4. CookieConsentBanner aplica Consent Mode v2 'denied' por defecto, 0 gtag.js precargado y exclusión de /admin", () => {
    const indexHtml = readFileSync(INDEX_HTML, "utf8");
    const terminosHtml = readFileSync(TERMINOS_HTML, "utf8");
    const privacidadHtml = readFileSync(PRIVACIDAD_HTML, "utf8");
    const confirmHtml = readFileSync(CONFIRM_HTML, "utf8");
    const adminHtml = readFileSync(ADMIN_HTML, "utf8");

    assert.match(indexHtml, /id=["']nexobow-cookie-banner["']/i);
    assert.match(indexHtml, /Aceptar analítica/);
    assert.match(indexHtml, /Solo esenciales/);
    assert.match(indexHtml, /\/privacidad\/#cookies/);
    assert.match(indexHtml, /Configurar cookies/);

    const loaderMatches = indexHtml.match(/<script\b[^>]*data-nexobow-consent-loader=["']true["'][^>]*>[\s\S]*?<\/script>/gi) || [];
    assert.equal(loaderMatches.length, 1, "Debe existir exactamente 1 script aislado de consentimiento en index.html");
    const loaderScript = loaderMatches[0];

    assert.match(loaderScript, /analytics_storage["']?\s*:\s*["']denied["']/);
    assert.match(loaderScript, /ad_storage["']?\s*:\s*["']denied["']/);
    assert.match(loaderScript, /ad_user_data["']?\s*:\s*["']denied["']/);
    assert.match(loaderScript, /ad_personalization["']?\s*:\s*["']denied["']/);
    assert.match(loaderScript, /nexobow_cookie_consent/);
    assert.match(loaderScript, /anonymize_ip\s*:\s*true/);
    assert.match(loaderScript, /\/admin/);
    assert.match(loaderScript, /generate_lead/);
    assert.match(loaderScript, /contact_whatsapp/);
    assert.match(loaderScript, /view_demo/);

    // 0 descarga estática precargada de gtag.js en páginas públicas
    for (const [label, doc] of [
      ["index.html", indexHtml],
      ["terminos/index.html", terminosHtml],
      ["privacidad/index.html", privacidadHtml],
      ["solicitud-enviada/index.html", confirmHtml],
    ]) {
      assert.doesNotMatch(
        doc,
        /<script\b[^>]*src=["'][^"']*googletagmanager\.com\/gtag\/js/i,
        `${label} no debe precargar gtag.js antes del consentimiento`
      );
    }

    // Exclusión explícita en /admin
    assert.doesNotMatch(adminHtml, /data-nexobow-consent-loader/i);
    assert.doesNotMatch(adminHtml, /nexobow-cookie-banner/i);
  });

  await t.test("5. SEO de marca NexoBow, canonical, noindex, sitemap.xml, JSON-LD +40 y links legales", async () => {
    const { normalizeBrandTitle, buildCanonicalUrl } = await import("../web/src/lib/seo.ts");
    assert.equal(normalizeBrandTitle("Sin Marca"), "Sin Marca | NexoBow");
    assert.equal(normalizeBrandTitle("Política de Privacidad | NexoBow"), "Política de Privacidad | NexoBow");
    assert.equal(buildCanonicalUrl("/terminos"), "https://nexobow.site/terminos/");

    const pages = [
      { label: "index.html", html: readFileSync(INDEX_HTML, "utf8"), canonical: "https://nexobow.site/", expectNoindex: false },
      { label: "terminos/index.html", html: readFileSync(TERMINOS_HTML, "utf8"), canonical: "https://nexobow.site/terminos/", expectNoindex: false },
      { label: "privacidad/index.html", html: readFileSync(PRIVACIDAD_HTML, "utf8"), canonical: "https://nexobow.site/privacidad/", expectNoindex: false },
      { label: "solicitud-enviada/index.html", html: readFileSync(CONFIRM_HTML, "utf8"), canonical: "https://nexobow.site/solicitud-enviada/", expectNoindex: true },
    ];

    for (const page of pages) {
      const titleMatch = page.html.match(/<title>([\s\S]*?)<\/title>/i);
      assert.ok(titleMatch, `${page.label} debe tener <title>`);
      assert.match(titleMatch[1], /NexoBow/, `${page.label} <title> debe incluir NexoBow`);

      const ogTitleMatch = page.html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      assert.ok(ogTitleMatch, `${page.label} debe tener og:title`);
      assert.match(ogTitleMatch[1], /NexoBow/, `${page.label} og:title debe incluir NexoBow`);

      assert.match(
        page.html,
        /<meta\s+property=["']og:site_name["']\s+content=["']NexoBow["']/i,
        `${page.label} debe declarar og:site_name="NexoBow"`
      );
      assert.match(
        page.html,
        new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i"),
        `${page.label} debe declarar canonical=${page.canonical}`
      );

      if (page.expectNoindex) {
        assert.match(page.html, /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i);
      } else {
        assert.doesNotMatch(page.html, /<meta\s+name=["']robots["'][^>]*noindex/i);
      }
    }

    // Soporte condicional de Google Search Console en Layout.astro
    const layoutSrc = readFileSync(join(WEB_DIR, "src", "layouts", "Layout.astro"), "utf8");
    assert.match(layoutSrc, /PUBLIC_GOOGLE_SITE_VERIFICATION/);
    assert.match(layoutSrc, /name=["']google-site-verification["']/);

    // sitemap.xml
    const sitemap = readFileSync(SITEMAP_XML, "utf8");
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gi)].map((m) => m[1].trim());
    assert.deepEqual(
      locs.sort(),
      [
        "https://nexobow.site/",
        "https://nexobow.site/privacidad/",
        "https://nexobow.site/terminos/",
      ].sort(),
      "sitemap.xml debe incluir únicamente /, /terminos/ y /privacidad/"
    );
    assert.doesNotMatch(sitemap, /\/admin|\/solicitud-enviada|\/baja-email/);

    // JSON-LD en index.html con intención real +40
    const indexHtml = pages[0].html;
    const schemas = extractJsonLdBlocks(indexHtml);
    const serviceSchema = schemas.find((s) => s["@type"] === "ProfessionalService");
    const faqSchema = schemas.find((s) => s["@type"] === "FAQPage");

    assert.ok(serviceSchema, "index.html debe incluir JSON-LD @type=ProfessionalService");
    assert.equal(serviceSchema.areaServed, "Argentina");
    assert.ok(faqSchema, "index.html debe incluir JSON-LD @type=FAQPage");
    assert.ok(Array.isArray(faqSchema.mainEntity) && faqSchema.mainEntity.length >= 5);

    const faqBlob = JSON.stringify(faqSchema);
    assert.match(faqBlob, /consultorio médico|nutricionistas|psicólogos|odontólogos/i);
    assert.match(faqBlob, /estudio jurídico|abogados/i);
    assert.match(faqBlob, /turnos.*WhatsApp|Google Maps/i);

    // Enlaces internos desde Pricing, Faq y Footer
    assert.match(indexHtml, /href=["']\/terminos\/["']/);
    assert.match(indexHtml, /href=["']\/privacidad\/["']/);
    assert.match(indexHtml, /href=["']\/terminos\/#reembolsos["']/);
    assert.match(indexHtml, /href=["']\/terminos\/#debito-automatico["']/);
    assert.match(indexHtml, /Configurar cookies/);
  });

  await t.test("6. .env.example, checklist Google Business Profile y auditorHtmlDocument actualizado", () => {
    const envExample = readFileSync(join(REPO_ROOT, ".env.example"), "utf8");
    assert.match(envExample, /PUBLIC_GA_MEASUREMENT_ID=/);
    assert.match(envExample, /PUBLIC_GOOGLE_SITE_VERIFICATION=/);

    const gbpPath = join(REPO_ROOT, "docs", "google-business-profile-checklist.md");
    assert.ok(existsSync(gbpPath), "docs/google-business-profile-checklist.md debe existir");
    const gbpDoc = readFileSync(gbpPath, "utf8");
    assert.match(gbpDoc, /Empresa de Área de Servicio|Service-Area Business/i);
    assert.match(gbpDoc, /CABA/);
    assert.match(gbpDoc, /Zona Norte/);
    assert.match(gbpDoc, /Campana/);
    assert.match(gbpDoc, /Zárate/);
    assert.match(gbpDoc, /Argentina/);
    assert.match(gbpDoc, /video/i);
    assert.match(gbpDoc, /reseñas/i);

    const wrapWebHtml = (extraScript = "") => `<!doctype html>
<html lang="es-AR">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NexoBow</title>
  <script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head>
<body>
  <h1>NexoBow</h1>
  ${extraScript}
</body>
</html>`;

    const validLoader = `<script data-nexobow-consent-loader="true">gtag('consent','default',{analytics_storage:'denied'});</script>`;

    const okReport = auditHtmlDocument(wrapWebHtml(validLoader), {
      mode: "web",
      requireWhatsappCta: false,
    });
    assert.equal(okReport.ok, true);
    assert.equal(okReport.executableScriptCount, 0);
    assert.equal(okReport.jsBytes, 0);
    assert.equal(okReport.consentLoaderCount, 1);

    const badBusinessJs = auditHtmlDocument(
      wrapWebHtml(`<script>console.log(1)</script>`),
      { mode: "web", requireWhatsappCta: false }
    );
    assert.equal(badBusinessJs.ok, false);
    assert.match(badBusinessJs.errors[0], /0 JS estricto/);

    const badPreloadedGtag = auditHtmlDocument(
      wrapWebHtml(`<script src="https://www.googletagmanager.com/gtag/js?id=G-123"></script>`),
      { mode: "web", requireWhatsappCta: false }
    );
    assert.equal(badPreloadedGtag.ok, false);

    const badDuplicateLoaders = auditHtmlDocument(
      wrapWebHtml(validLoader + validLoader),
      { mode: "web", requireWhatsappCta: false }
    );
    assert.equal(badDuplicateLoaders.ok, false);
  });

  await t.test(
    "7. Ticket #57 (Seam 5): robots.txt, _headers de seguridad HTTP, noindex en rutas privadas y runbook docs/security-hardening-checklist.md",
    () => {
      assert.ok(existsSync(ROBOTS_TXT), "web/dist/robots.txt debe existir tras el build");
      const robotsTxt = readFileSync(ROBOTS_TXT, "utf8");
      const robotsLines = robotsTxt
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      assert.ok(robotsLines.includes("User-agent: *"), "robots.txt debe declarar User-agent: *");
      assert.ok(robotsLines.includes("Allow: /"), "robots.txt debe permitir /");
      assert.ok(robotsLines.includes("Allow: /terminos/"), "robots.txt debe permitir /terminos/");
      assert.ok(robotsLines.includes("Allow: /privacidad/"), "robots.txt debe permitir /privacidad/");
      assert.ok(robotsLines.includes("Disallow: /admin/"), "robots.txt debe bloquear /admin/");
      assert.ok(robotsLines.includes("Disallow: /api/"), "robots.txt debe bloquear /api/");
      assert.ok(
        robotsLines.includes("Disallow: /solicitud-enviada/"),
        "robots.txt debe bloquear /solicitud-enviada/"
      );
      assert.ok(
        robotsLines.includes("Disallow: /baja-email/"),
        "robots.txt debe bloquear /baja-email/"
      );
      assert.ok(
        robotsLines.includes("Sitemap: https://nexobow.site/sitemap.xml"),
        "robots.txt debe referenciar Sitemap: https://nexobow.site/sitemap.xml"
      );

      assert.ok(existsSync(HEADERS_FILE), "web/dist/_headers debe existir tras el build");
      const headersContent = readFileSync(HEADERS_FILE, "utf8");

      const parseHeadersFile = (raw) => {
        const blocks = new Map();
        let currentRoute = null;
        for (const rawLine of raw.split(/\r?\n/)) {
          const trimmed = rawLine.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          if (!/^\s+/.test(rawLine)) {
            currentRoute = trimmed;
            if (!blocks.has(currentRoute)) blocks.set(currentRoute, new Map());
          } else if (currentRoute) {
            const sepIdx = trimmed.indexOf(":");
            if (sepIdx !== -1) {
              const name = trimmed.slice(0, sepIdx).trim().toLowerCase();
              const val = trimmed.slice(sepIdx + 1).trim();
              blocks.get(currentRoute).set(name, val);
            }
          }
        }
        return blocks;
      };

      const headerBlocks = parseHeadersFile(headersContent);
      const rootHeaders = headerBlocks.get("/*");
      assert.ok(rootHeaders, "_headers debe definir el bloque /*");

      const csp = rootHeaders.get("content-security-policy") || "";
      assert.match(csp, /default-src\s+'self'/i);
      const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/i);
      assert.ok(scriptSrcMatch, "CSP debe declarar script-src");
      assert.match(scriptSrcMatch[1], /https:\/\/www\.googletagmanager\.com/i);
      assert.match(scriptSrcMatch[1], /https:\/\/www\.google-analytics\.com/i);
      assert.doesNotMatch(scriptSrcMatch[1], /(?:^|\s)\*(?:\s|$)/, "script-src no debe usar wildcard *");

      const connectSrcMatch = csp.match(/connect-src\s+([^;]+)/i);
      assert.ok(connectSrcMatch, "CSP debe declarar connect-src");
      assert.match(connectSrcMatch[1], /https:\/\/\*\.supabase\.co/i);
      assert.match(connectSrcMatch[1], /wss:\/\/\*\.supabase\.co/i);
      assert.match(connectSrcMatch[1], /https:\/\/www\.google-analytics\.com/i);
      assert.match(connectSrcMatch[1], /https:\/\/www\.googletagmanager\.com/i);
      assert.match(csp, /object-src\s+'none'/i);
      assert.match(csp, /base-uri\s+'self'/i);
      assert.match(csp, /frame-ancestors\s+'none'/i);

      const hsts = rootHeaders.get("strict-transport-security") || "";
      assert.match(hsts, /max-age=31536000/i);
      assert.match(hsts, /includeSubDomains/i);
      assert.equal(rootHeaders.get("x-frame-options"), "DENY");
      assert.equal(rootHeaders.get("x-content-type-options"), "nosniff");
      assert.match(
        rootHeaders.get("referrer-policy") || "",
        /strict-origin-when-cross-origin/i
      );
      const permissionsPolicy = rootHeaders.get("permissions-policy") || "";
      assert.match(permissionsPolicy, /camera=\(\)/i);
      assert.match(permissionsPolicy, /microphone=\(\)/i);
      assert.match(permissionsPolicy, /geolocation=\(\)/i);

      const adminHeaders = headerBlocks.get("/admin/*");
      assert.ok(adminHeaders, "_headers debe definir el bloque /admin/*");
      assert.match(adminHeaders.get("cache-control") || "", /\bno-store\b/i);
      assert.match(adminHeaders.get("x-robots-tag") || "", /noindex,\s*nofollow/i);

      const apiHeaders = headerBlocks.get("/api/*");
      assert.ok(apiHeaders, "_headers debe definir el bloque /api/*");
      assert.match(apiHeaders.get("cache-control") || "", /\bno-store\b/i);
      assert.match(apiHeaders.get("x-robots-tag") || "", /noindex,\s*nofollow/i);

      for (const noindexRoute of [
        "/solicitud-enviada",
        "/solicitud-enviada/*",
        "/baja-email",
        "/baja-email/*",
      ]) {
        const routeHeaders = headerBlocks.get(noindexRoute);
        assert.ok(routeHeaders, `_headers debe definir el bloque ${noindexRoute}`);
        assert.match(
          routeHeaders.get("x-robots-tag") || "",
          /noindex,\s*nofollow/i,
          `${noindexRoute} debe declarar X-Robots-Tag: noindex, nofollow`
        );
      }

      // Verificar meta robots noindex, nofollow en las 3 rutas privadas compiladas
      for (const [label, filePath] of [
        ["admin/index.html", ADMIN_HTML],
        ["solicitud-enviada/index.html", CONFIRM_HTML],
        ["baja-email/index.html", BAJA_HTML],
      ]) {
        assert.ok(existsSync(filePath), `${label} debe existir`);
        const html = readFileSync(filePath, "utf8");
        assert.match(
          html,
          /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i,
          `${label} debe declarar <meta name="robots" content="noindex, nofollow">`
        );
      }

      // Runbook Cloudflare Dashboard WAF
      const checklistPath = join(REPO_ROOT, "docs", "security-hardening-checklist.md");
      assert.ok(existsSync(checklistPath), "docs/security-hardening-checklist.md debe existir");
      const checklistDoc = readFileSync(checklistPath, "utf8");
      assert.match(checklistDoc, /Bot Fight Mode/i);
      assert.match(checklistDoc, /Rate Limiting/i);
      assert.match(checklistDoc, /\/api\/v1\/bow-system\/create/);
      assert.match(checklistDoc, /\/api\/ping/);
      assert.match(checklistDoc, /Turnstile/i);
      assert.match(checklistDoc, /rotaci[oó]n/i);
    }
  );
});
