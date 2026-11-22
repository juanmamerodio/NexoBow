// tests/inbound-security.test.mjs — Suite TDD Seam 3 (Ticket #56: Inbound Preview, Checkbox T&C Sin Marcar, Honeypot & Resend Dual)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
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
const DIST_DIR = join(WEB_DIR, "dist");
const DIST_HTML = join(DIST_DIR, "index.html");

function extractSectionById(html, sectionId) {
  const startMatch = html.match(
    new RegExp(`<section\\b[^>]*\\bid=["']${sectionId}["'][^>]*>`, "i")
  );
  if (!startMatch || startMatch.index === undefined) return "";
  const afterStart = html.slice(startMatch.index);
  const endIdx = afterStart.indexOf("</section>");
  return endIdx === -1 ? afterStart : afterStart.slice(0, endIdx + "</section>".length);
}

function createMockSupabaseForCreate(initialRows = []) {
  const inserted = [];
  const updated = [];
  const rows = initialRows.map((r) => structuredClone(r));

  return {
    inserted,
    updated,
    rows,
    from(table) {
      assert.equal(table, "leads");
      return {
        select() {
          return {
            order() {
              return {
                limit() {
                  const sorted = [...rows].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
                  return Promise.resolve({
                    data: sorted.slice(0, 1),
                    error: null,
                  });
                },
              };
            },
          };
        },
        insert(payload) {
          const record = Array.isArray(payload) ? payload[0] : payload;
          const copy = structuredClone(record);
          rows.push(copy);
          inserted.push(copy);
          return Promise.resolve({ data: [copy], error: null });
        },
        update(patch) {
          return {
            eq(col, val) {
              const target = rows.find((r) => r[col] === val);
              if (target) {
                Object.assign(target, structuredClone(patch));
              }
              updated.push({ col, val, patch: structuredClone(patch) });
              return Promise.resolve({ data: target ? [target] : [], error: null });
            },
          };
        },
      };
    },
  };
}

test("T56 (Seam 3): Inbound Preview Form, Checkbox T&C Sin Marcar, Normalización +549 & Resend Dual", async (t) => {
  await t.test(
    "1. CreateBowSystem.astro compilado incluye checkbox accept_terms sin checked, links legales, honeypot oculto y CTA 'Pedir mi muestra gratuita' con 0 JS de negocio",
    async () => {
      const releaseWebDistLock = acquireWebDistLock();
      t.after(releaseWebDistLock);

      const buildRes = spawnSync("npm", ["--prefix", "web", "run", "build"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      assert.equal(
        buildRes.status,
        0,
        `El build de web/ falló:\n${buildRes.stderr}\n${buildRes.stdout}`
      );
      assert.ok(existsSync(DIST_HTML), "web/dist/index.html debe existir");

      const html = readFileSync(DIST_HTML, "utf8");
      const audit = auditHtmlDocument(html, {
        mode: "web",
        distDir: DIST_DIR,
        requireWhatsappCta: false,
      });
      assert.equal(audit.ok, true, `Auditoría fallida: ${audit.errors.join("; ")}`);
      assert.equal(audit.executableScriptCount, 0, "index.html debe tener 0 scripts de negocio");
      assert.equal(audit.jsBytes, 0);

      const sectionHtml = extractSectionById(html, "crea-tu-sistema-bow");
      assert.ok(sectionHtml, "Debe existir la sección #crea-tu-sistema-bow");
      assert.match(sectionHtml, /CREÁ TU SISTEMA BOW/i);
      assert.match(sectionHtml, /\/api\/v1\/bow-system\/create/);

      const formMatch = sectionHtml.match(/<form\b[\s\S]*?<\/form>/i);
      assert.ok(formMatch, "Debe existir el elemento <form>");
      const formHtml = formMatch[0];

      // Checkbox accept_terms obligatorio y SIN atributo checked
      const checkboxMatch = formHtml.match(
        /<input\b(?=[^>]*\btype=["']checkbox["'])(?=[^>]*\bname=["']accept_terms["'])[^>]*>/i
      );
      assert.ok(
        checkboxMatch,
        "El formulario debe incluir <input type='checkbox' name='accept_terms'>"
      );
      assert.match(checkboxMatch[0], /\brequired\b/i, "El checkbox accept_terms debe ser required");
      assert.doesNotMatch(
        checkboxMatch[0],
        /\bchecked\b/i,
        "El checkbox accept_terms NO debe venir marcado por defecto (sin atributo checked)"
      );

      // Enlaces legales dentro del form
      assert.match(formHtml, /href=["']\/terminos\/["']/i, "Debe enlazar a /terminos/");
      assert.match(formHtml, /href=["']\/privacidad\/["']/i, "Debe enlazar a /privacidad/");

      // Campo honeypot oculto website_confirm
      const honeypotMatch = formHtml.match(
        /<input\b(?=[^>]*\bname=["']website_confirm["'])[^>]*>/i
      );
      assert.ok(honeypotMatch, "Debe incluir input honeypot name='website_confirm'");
      assert.match(honeypotMatch[0], /\btabindex=["']-1["']/i);
      assert.match(honeypotMatch[0], /\bautocomplete=["']off["']/i);
      assert.match(
        formHtml,
        /<div\b[^>]*aria-hidden=["']true["'][^>]*>[\s\S]*name=["']website_confirm["'][\s\S]*<\/div>/i,
        "El honeypot debe residir en un contenedor oculto aria-hidden='true'"
      );

      // CTA claro
      assert.match(formHtml, /Pedir mi muestra gratuita/i);
    }
  );

  const createMod = await import("../web/functions/api/v1/bow-system/create.ts");
  const { verifyUnsubscribeToken } = await import("../web/src/lib/unsubscribe-token.ts");
  const TEST_UNSUB_KEY = "test-hmac-key-32-bytes-minimum-ok";

  await t.test(
    "2. POST /api/v1/bow-system/create rechaza con HTTP 400 sin accept_terms, con honeypot completo, email inválido o maps_url peligroso y HTTP 413 si excede 8 KB",
    async () => {
      const dbMock = createMockSupabaseForCreate([{ id: 40 }]);
      const emailsSent = [];
      const mockSendEmail = async (payload) => {
        emailsSent.push(payload);
        return { ok: true, id: "mock-id" };
      };

      const baseValid = {
        name: "Dra. Laura Benítez",
        rubro: "Odontología & Estética Dental",
        maps_url: "https://maps.app.goo.gl/ejemplo123",
        whatsapp: "011 15-5555-6666",
        email: "laura@consultoriobenitez.com.ar",
        website_confirm: "",
      };

      // Sin accept_terms
      for (const badBody of [
        { ...baseValid },
        { ...baseValid, accept_terms: false },
        { ...baseValid, accept_terms: "false" },
        { ...baseValid, accept_terms: true, website_confirm: "https://spam-bot.example" },
        { ...baseValid, accept_terms: true, email: "correo-invalido" },
        { ...baseValid, accept_terms: true, email: "" },
        { ...baseValid, accept_terms: true, whatsapp: "123" },
        { ...baseValid, accept_terms: true, maps_url: "javascript:alert(1)" },
        { ...baseValid, accept_terms: true, maps_url: "data:text/html,<script>1</script>" },
      ]) {
        const res = await createMod.onRequestPost({
          request: new Request("https://nexobow.site/api/v1/bow-system/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(badBody),
          }),
          env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
          supabaseClient: dbMock,
          sendEmail: mockSendEmail,
        });
        assert.equal(
          res.status,
          400,
          `Payload inválido debe responder 400: ${JSON.stringify(badBody)}`
        );
      }

      // Form URL-encoded sin accept_terms
      const formNoTerms = new URLSearchParams({
        name: "Dr. Carlos Paz",
        rubro: "Abogado",
        whatsapp: "+5491155556666",
        email: "carlos@estudiopaz.com.ar",
        website_confirm: "",
      });
      const formBadRes = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formNoTerms.toString(),
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
        sendEmail: mockSendEmail,
      });
      assert.equal(formBadRes.status, 400);

      // Payload > 8 KB -> HTTP 413
      const hugePayload = JSON.stringify({
        ...baseValid,
        accept_terms: true,
        extra: "x".repeat(9000),
      });
      const res413 = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: hugePayload,
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
        sendEmail: mockSendEmail,
      });
      assert.equal(res413.status, 413);

      assert.equal(dbMock.inserted.length, 0, "Ningún rechazo debe persistir en Supabase");
      assert.equal(emailsSent.length, 0, "Ningún rechazo debe enviar correos");
    }
  );

  await t.test("3. normalizeArgentineWhatsApp normaliza teléfonos locales al estándar +549...", () => {
    assert.equal(typeof createMod.normalizeArgentineWhatsApp, "function");
    assert.equal(createMod.normalizeArgentineWhatsApp("011 15-5555-6666"), "+5491155556666");
    assert.equal(createMod.normalizeArgentineWhatsApp("+54 9 3489 53-6088"), "+5493489536088");
    assert.equal(createMod.normalizeArgentineWhatsApp("11 4321-8765"), "+5491143218765");
    assert.equal(createMod.normalizeArgentineWhatsApp("541160001111"), "+5491160001111");
    assert.equal(createMod.normalizeArgentineWhatsApp("3489 15-536088"), "+5493489536088");
  });

  await t.test(
    "4. Envío válido persiste LeadComplianceMetadata + expires_at +7d en Supabase mock y dispara alerta Juanma + recibo prestador con baja HMAC",
    async () => {
      const dbMock = createMockSupabaseForCreate([{ id: 70 }]);
      const emailsDispatched = [];
      const fixedNow = new Date("2026-11-20T12:00:00.000Z");

      const jsonRes = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dra. Valeria Gómez",
            rubro: "Odontología & Estética Dental",
            maps_url: "https://maps.app.goo.gl/odontovaleria",
            whatsapp: "011 15-5555-6666",
            email: "Valeria@OdontoGomez.com.ar",
            website_confirm: "",
            accept_terms: true,
          }),
        }),
        env: {
          ADMIN_OWNER_EMAIL: "juanma@nexobow.site",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test_key",
          RESEND_FROM_EMAIL: "NexoBow <hola@nexobow.site>",
        },
        supabaseClient: dbMock,
        now: () => fixedNow,
        sendEmail: async (mail) => {
          emailsDispatched.push(mail);
          return { ok: true, id: `resend-${emailsDispatched.length}` };
        },
      });

      assert.equal(jsonRes.status, 200);
      const body = await jsonRes.json();
      assert.equal(body.ok, true);
      assert.equal(body.redirect, "/solicitud-enviada/");

      assert.equal(dbMock.inserted.length, 1);
      const lead = dbMock.inserted[0];
      assert.equal(lead.id, 71);
      assert.equal(lead.phone, "+5491155556666");
      assert.equal(lead.whatsapp_link, "https://wa.me/5491155556666");
      assert.equal(lead.expires_at, "2026-11-27T12:00:00.000Z");
      assert.equal(lead.funnel_status, "1. Prospecto Identificado");
      assert.equal(lead.response_status, "Sin Contactar");
      assert.equal(lead.metadata.source, "inbound_web");
      assert.equal(lead.metadata.email, "valeria@odontogomez.com.ar");
      assert.equal(lead.metadata.terms_accepted, true);
      assert.equal(lead.metadata.terms_accepted_at, "2026-11-20T12:00:00.000Z");
      assert.equal(lead.metadata.terms_version, "2026-11");
      assert.equal(lead.metadata.marketing_opt_in, true);
      assert.equal(lead.metadata.email_marketing.unsubscribed, false);
      assert.equal(lead.metadata.email_marketing.followup_stage, "welcome");

      assert.equal(emailsDispatched.length, 2, "Debe disparar 2 correos en paralelo");
      const adminMail = emailsDispatched.find((m) => m.to === "juanma@nexobow.site");
      const prospectMail = emailsDispatched.find((m) => m.to === "valeria@odontogomez.com.ar");
      assert.ok(adminMail, "Debe enviar alerta a ADMIN_OWNER_EMAIL");
      assert.ok(prospectMail, "Debe enviar recibo de confirmación al prestador");

      assert.match(adminMail.html + adminMail.text, /wa\.me\/5491155556666/);
      assert.match(adminMail.html + adminMail.text, /\/admin\/crm/);

      assert.match(prospectMail.html + prospectMail.text, /24 horas/i);
      const tokenMatch = (prospectMail.html || "").match(/\/api\/unsubscribe\?token=([^"&<\s]+)/);
      assert.ok(tokenMatch, "El recibo debe contener enlace visible /api/unsubscribe?token=...");
      assert.equal(
        prospectMail.headers?.["List-Unsubscribe-Post"],
        "List-Unsubscribe=One-Click"
      );
      assert.match(prospectMail.headers?.["List-Unsubscribe"] || "", /\/api\/unsubscribe\?token=/);

      const verified = await verifyUnsubscribeToken(
        decodeURIComponent(tokenMatch[1]),
        TEST_UNSUB_KEY
      );
      assert.equal(verified.valid, true);
      assert.equal(verified.payload?.email, "valeria@odontogomez.com.ar");
      assert.equal(verified.payload?.slug, lead.slug);

      // Flujo form-urlencoded con fetchImpl mock hacia https://api.resend.com/emails
      const resendHttpCalls = [];
      const formRes = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            name: "Dr. Martín Soler",
            rubro: "Estudio Jurídico & Abogacía",
            maps_url: "https://maps.google.com/?cid=999",
            whatsapp: "+54 9 3489 53-6088",
            email: "martin@estudiosoler.com.ar",
            website_confirm: "",
            accept_terms: "on",
          }).toString(),
        }),
        env: {
          ADMIN_OWNER_EMAIL: "juanma@nexobow.site",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_live_mock",
          RESEND_FROM_EMAIL: "NexoBow <hola@nexobow.site>",
        },
        supabaseClient: dbMock,
        now: () => fixedNow,
        fetchImpl: async (url, init) => {
          resendHttpCalls.push({
            url: String(url),
            headers: init?.headers || {},
            body: JSON.parse(String(init?.body || "{}")),
          });
          return new Response(JSON.stringify({ id: `resend-http-${resendHttpCalls.length}` }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      assert.equal(formRes.status, 303);
      assert.equal(formRes.headers.get("Location"), "https://nexobow.site/solicitud-enviada/");
      assert.equal(resendHttpCalls.length, 2);
      assert.ok(resendHttpCalls.every((c) => c.url === "https://api.resend.com/emails"));
      assert.ok(
        resendHttpCalls.every((c) => c.headers.Authorization === "Bearer re_live_mock")
      );
      const prospectHttpCall = resendHttpCalls.find(
        (c) => Array.isArray(c.body.to) && c.body.to[0] === "martin@estudiosoler.com.ar"
      );
      assert.ok(prospectHttpCall);
      assert.equal(
        prospectHttpCall.body.headers?.["List-Unsubscribe-Post"],
        "List-Unsubscribe=One-Click"
      );
    }
  );

  await t.test(
    "5. Fallo de Resend no bloquea la respuesta ni la persistencia del lead en Supabase",
    async () => {
      const dbMock = createMockSupabaseForCreate([{ id: 80 }]);
      const res = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Lic. Julieta Ríos",
            rubro: "Nutrición Funcional & Deportiva",
            whatsapp: "11 4567-8910",
            email: "julieta@nutririos.com.ar",
            website_confirm: "",
            accept_terms: true,
          }),
        }),
        env: {
          ADMIN_OWNER_EMAIL: "juanma@nexobow.site",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_fail",
        },
        supabaseClient: dbMock,
        sendEmail: async () => {
          throw new Error("Resend 503 Service Unavailable");
        },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(dbMock.inserted.length, 1);
    }
  );

  await t.test(
    "6. Ticket #57 (Seam 5): Sin URL Supabase hardcodeada ni fallback anon, saneamiento anti-XSS, longitudes acotadas y alerta interna independiente de signingKey",
    async () => {
      const createSrc = readFileSync(
        join(REPO_ROOT, "web", "functions", "api", "v1", "bow-system", "create.ts"),
        "utf8"
      );
      assert.ok(
        !createSrc.includes("henpyuwguwvflhgbxmvn.supabase.co"),
        "create.ts no debe contener URL de Supabase hardcodeada"
      );
      assert.ok(
        !createSrc.includes("PUBLIC_SUPABASE_ANON_KEY"),
        "create.ts no debe hacer fallback silencioso a PUBLIC_SUPABASE_ANON_KEY"
      );

      // Sin supabaseClient y sin SUPABASE_SERVICE_ROLE_KEY -> 503 sin hacer requests a Supabase
      let fetchCalls = 0;
      const res503 = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dra. Sin Config",
            rubro: "Clínica",
            whatsapp: "+54 9 11 5555-6666",
            email: "sinconfig@clinica.com.ar",
            website_confirm: "",
            accept_terms: true,
          }),
        }),
        env: {
          PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          PUBLIC_SUPABASE_ANON_KEY: "anon-only",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
        },
        fetchImpl: async () => {
          fetchCalls++;
          return new Response("[]", { status: 200 });
        },
      });
      assert.equal(res503.status, 503);
      assert.equal(fetchCalls, 0, "No debe invocar Supabase usando anon key");

      // Rechazo vbscript: en maps_url -> 400
      const dbMock = createMockSupabaseForCreate([{ id: 90 }]);
      const vbRes = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dr. Esquema",
            rubro: "Abogado",
            maps_url: "vbscript:msgbox(1)",
            whatsapp: "+5491155556666",
            email: "esquema@estudio.com.ar",
            website_confirm: "",
            accept_terms: true,
          }),
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(vbRes.status, 400);

      // Saneamiento anti-XSS y acotamiento de longitudes en almacenamiento y correos
      const sentMails = [];
      const xssRes = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `<script>alert("xss")</script>Dra. Ana ${"A".repeat(150)}`,
            rubro: `<img src=x onerror=alert(1)>Odontología ${"B".repeat(150)}`,
            maps_url: `https://maps.app.goo.gl/${"z".repeat(350)}`,
            whatsapp: "+54 9 11 5555-7777",
            email: "ana@odontologia.com.ar",
            website_confirm: "",
            accept_terms: true,
          }),
        }),
        env: {
          ADMIN_OWNER_EMAIL: "juanma@nexobow.site",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test_key",
        },
        supabaseClient: dbMock,
        sendEmail: async (mail) => {
          sentMails.push(mail);
          return { ok: true, id: `mail-${sentMails.length}` };
        },
      });
      assert.equal(xssRes.status, 200);
      assert.equal(dbMock.inserted.length, 1);
      const storedLead = dbMock.inserted[0];
      assert.ok(storedLead.name.length <= 120, `name debe ser <= 120 (actual: ${storedLead.name.length})`);
      assert.match(storedLead.name, /Dra\. Ana/);
      assert.doesNotMatch(storedLead.name, /<script|alert\(|[<>]/i);
      assert.ok(storedLead.niche.length <= 120, `niche debe ser <= 120 (actual: ${storedLead.niche.length})`);
      assert.match(storedLead.niche, /Odontología/);
      assert.doesNotMatch(storedLead.niche, /<img|onerror|[<>]/i);
      assert.ok(
        storedLead.metadata.maps_url.length <= 300,
        `maps_url debe ser <= 300 (actual: ${storedLead.metadata.maps_url.length})`
      );

      assert.equal(sentMails.length, 2);
      for (const mail of sentMails) {
        assert.doesNotMatch(mail.html, /<script/i);
        assert.doesNotMatch(mail.html, /onerror=/i);
        assert.ok(!mail.html.includes('{" "}'), "El HTML del correo no debe contener literal JSX {\" \"}");
      }

      // Alerta interna a ADMIN_OWNER_EMAIL independiente de signingKey (CF_PAGES=1 sin UNSUBSCRIBE_SECRET)
      const adminOnlyMails = [];
      const noSigningKeyRes = await createMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/bow-system/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dr. Alerta Interna",
            rubro: "Clínica Médica",
            whatsapp: "+54 9 11 5555-8888",
            email: "alerta@clinica.com.ar",
            website_confirm: "",
            accept_terms: true,
          }),
        }),
        env: {
          CF_PAGES: "1",
          ADMIN_OWNER_EMAIL: "juanma@nexobow.site",
          RESEND_API_KEY: "re_test_key",
        },
        supabaseClient: dbMock,
        sendEmail: async (mail) => {
          adminOnlyMails.push(mail);
          return { ok: true, id: "admin-only-1" };
        },
      });
      assert.equal(noSigningKeyRes.status, 200);
      const noSigningBody = await noSigningKeyRes.json();
      assert.equal(noSigningBody.notifications.admin_sent, true);
      assert.equal(noSigningBody.notifications.prospect_sent, false);
      assert.equal(adminOnlyMails.length, 1);
      assert.equal(adminOnlyMails[0].to, "juanma@nexobow.site");
    }
  );
});
