// tests/web-redesign.test.mjs — Suite E2E para Frente A (Rebranding Soft-Obsidian + 12 Secciones + 0 JS)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIR = join(REPO_ROOT, "web");
const DIST_HTML = join(WEB_DIR, "dist", "index.html");
const CONFIRM_HTML = join(WEB_DIR, "dist", "solicitud-enviada", "index.html");
const GLOBAL_CSS = join(WEB_DIR, "src", "styles", "global.css");
const CREATE_FN = join(WEB_DIR, "functions", "api", "v1", "bow-system", "create.ts");

test("T-WEB-04: Suite E2E Rebranding Soft-Obsidian y Funnel de 12 Secciones en web/", async (t) => {
  await t.test("1. npm run build en web/ compila con código 0", () => {
    const buildRes = spawnSync("npm", ["run", "build"], {
      cwd: WEB_DIR,
      encoding: "utf8",
    });
    assert.equal(
      buildRes.status,
      0,
      `El build de web/ falló con código ${buildRes.status}:\n${buildRes.stderr}\n${buildRes.stdout}`
    );
    assert.ok(existsSync(DIST_HTML), "web/dist/index.html debe existir tras el build");
    assert.ok(existsSync(CONFIRM_HTML), "web/dist/solicitud-enviada/index.html debe existir tras el build");
  });

  const html = existsSync(DIST_HTML) ? readFileSync(DIST_HTML, "utf8") : "";
  const confirmHtml = existsSync(CONFIRM_HTML) ? readFileSync(CONFIRM_HTML, "utf8") : "";
  const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const css = existsSync(GLOBAL_CSS) ? readFileSync(GLOBAL_CSS, "utf8") : "";

  await t.test("2. Política estricta de 0 JS ejecutable en cliente en web/ pública y /solicitud-enviada/", () => {
    for (const [label, doc] of [
      ["index.html", html],
      ["solicitud-enviada/index.html", confirmHtml],
    ]) {
      const scripts = (doc.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []).filter(
        (tag) => !/type=["']application\/ld\+json["']/i.test(tag)
      );
      assert.equal(
        scripts.length,
        0,
        `Se detectaron ${scripts.length} etiquetas <script> en ${label} (debe ser 0 JS)`
      );
    }
  });

  await t.test("3. Paleta Soft-Obsidian aplicada y eliminación total de neón #DB1FFF", () => {
    assert.match(css, /#040607/i, "Debe definir --color-ink: #040607");
    assert.match(css, /#0B0D12/i, "Debe definir --color-ink-surface: #0B0D12");
    assert.match(css, /#5B2A62/i, "Debe definir --color-velvet: #5B2A62");
    assert.match(css, /#4928C2/i, "Debe definir --color-ultrasonic: #4928C2");
    assert.match(css, /#BF40FA/i, "Debe definir --color-accent: #BF40FA");
    assert.match(css, /#E3D9FC/i, "Debe definir --color-periwinkle: #E3D9FC");
    assert.doesNotMatch(html, /#DB1FFF/i, "No debe quedar rastro del color neón #DB1FFF en el HTML");
  });

  await t.test("4. Presencia de las 12 secciones psicológicas y precios alineados a routemap.md", () => {
    // 01 Header & 02 Hero
    assert.match(textContent, /Cupos de implementación abiertos/i);
    assert.match(
      textContent,
      /Dejá de perder pacientes que te piden info por WhatsApp y nunca agendan/i
    );
    assert.match(textContent, /0\.8\s*SEGUNDOS/i);

    // 03 BeforeAfter
    assert.match(
      textContent,
      /El problema no es que te falten consultas\. Es que tu WhatsApp hoy funciona como un embudo roto/i
    );

    // 04 InteractiveFunnel (CSS :checked radio inputs)
    assert.match(textContent, /Probá en vivo cómo funciona tu embudo en 4 pasos/i);
    assert.match(html, /type=["']radio["']/i, "Debe incluir controles radio 0-JS");

    // 05 TemplateCatalog (+10 estilos y demos clicables)
    assert.match(
      textContent,
      /Más de 10 arquitecturas visuales exclusivas\. Cero páginas clonadas/i
    );
    assert.match(textContent, /Editorial Delta/i);
    assert.match(textContent, /Clinical Pure/i);
    assert.match(textContent, /Obsidian Authority/i);
    assert.match(textContent, /Executive Clinic/i);

    // 06 RoiCalculator
    assert.match(
      textContent,
      /Hacé la cuenta rápida: ¿cuánta plata estás dejando arriba de la mesa cada mes\?/i
    );

    // 07 CaseStudies
    assert.match(textContent, /Ingeniería comprobable, no promesas vacías/i);
    assert.match(textContent, /Lic\. Sofía Ramos/i);

    // 08 Pricing (Tier 1 Starter $189.999 ARS + $0 ARS/mes Año 1, Tier 2 Autonomous $549.999 ARS + $229.999 ARS/mes, Bonos + 7 días)
    assert.match(textContent, /NexoBow Starter/i);
    assert.match(textContent, /NexoBow Autonomous/i);
    assert.match(textContent, /\$189\.999 ARS/);
    assert.match(textContent, /\$0 ARS\/mes/);
    assert.match(textContent, /1 año de hosting Cloudflare incluido/i);
    assert.match(textContent, /\$549\.999 ARS/);
    assert.match(textContent, /\$229\.999 ARS/);
    assert.match(textContent, /POLÍTICA DE SERVIDOR ACTIVO/i);
    assert.match(textContent, /7 días/i);
    assert.match(textContent, /\$85\.000 ARS/);
    assert.match(textContent, /\$60\.000 ARS/);

    // 09 CreateBowSystem (Inbound Form)
    assert.match(textContent, /CREÁ TU SISTEMA BOW/i);
    assert.match(textContent, /\/api\/v1\/bow-system\/create/i);

    // 10 Founder (Juanma Merodio + links)
    assert.match(textContent, /Quién está detrás de NexoBow/i);
    assert.match(textContent, /Juanma Merodio/i);
    assert.match(html, /https:\/\/juanmamerodio\.github\.io\/cv/);
    assert.match(html, /https:\/\/www\.afterbow\.com/);

    // 11 Faq & 12 FinalCta / Footer
    assert.match(textContent, /Ley 25\.326/i);
  });

  await t.test("5. Canales de contacto directo a WhatsApp (+54 9 3489 53-6088) y casos de éxito reales", () => {
    assert.match(html, /wa\.me\/5493489536088/, "Debe incluir enlace directo a wa.me/5493489536088");
    assert.match(textContent, /\+54 9 3489 53-6088/, "Debe mostrar el número de WhatsApp +54 9 3489 53-6088 visible");
    assert.match(html, /https:\/\/www\.afterbow\.com/, "Debe incluir caso de éxito AfterBow");
    assert.match(html, /https:\/\/juanmamerodio\.github\.io/, "Debe incluir caso de éxito embudo infoproducto");
    assert.match(html, /https:\/\/esenciatecnica\.vercel\.app/, "Debe incluir caso de éxito e-commerce educativo");
  });

  await t.test("6. Endpoint inbound bow-system/create.ts respeta el esquema real de public.leads", () => {
    assert.ok(existsSync(CREATE_FN), "web/functions/api/v1/bow-system/create.ts debe existir");
    const fnCode = readFileSync(CREATE_FN, "utf8");
    assert.match(fnCode, /funnel_status:\s*"1\. Prospecto Identificado"/);
    assert.match(fnCode, /response_status:\s*"Sin Contactar"/);
    assert.match(fnCode, /\bslug,/);
    assert.doesNotMatch(fnCode, /lead_funnel_status|lead_response_status|business_name/);
  });
});
