// tests/email-unsubscribe.test.mjs — Suite TDD Seam 4 (Ticket #56: HMAC Unsubscribe RFC 8058, Zoho + Resend, CRM & ElevenLabs)
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import esbuild from "../web/node_modules/esbuild/lib/main.js";
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
const BAJA_HTML = join(DIST_DIR, "baja-email", "index.html");
const TEST_UNSUB_KEY = "test-hmac-unsubscribe-key-32-bytes-ok";

function createMockSupabaseLeads(initialLeads = []) {
  const storeBySlug = new Map(initialLeads.map((l) => [l.slug, structuredClone(l)]));
  const updates = [];

  const applyFilter = (col, val) => {
    const entries = Array.from(storeBySlug.values()).filter((r) => String(r[col]) === String(val));
    return entries;
  };

  return {
    updates,
    getBySlug(slug) {
      return storeBySlug.get(slug) || null;
    },
    from(table) {
      assert.equal(table, "leads");
      return {
        select() {
          return {
            eq(col, val) {
              const matched = applyFilter(col, val);
              const first = matched[0] ? structuredClone(matched[0]) : null;
              return {
                maybeSingle() {
                  return Promise.resolve({ data: first, error: null });
                },
                limit() {
                  return Promise.resolve({ data: first ? [first] : [], error: null });
                },
              };
            },
          };
        },
        update(patch) {
          return {
            eq(col, val) {
              const matched = applyFilter(col, val);
              const updatedRows = [];
              for (const row of matched) {
                const next = { ...row, ...structuredClone(patch) };
                storeBySlug.set(row.slug, next);
                updatedRows.push(next);
              }
              updates.push({ col, val, patch: structuredClone(patch) });
              return Promise.resolve({ data: updatedRows, error: null });
            },
          };
        },
      };
    },
  };
}

async function loadCrmPureExports() {
  const crmPath = join(REPO_ROOT, "web/src/components/admin/views/CrmView.tsx");
  const raw = readFileSync(crmPath, "utf8");
  const pureTs = raw
    .split("export const CrmView")[0]
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, "");
  const { code } = esbuild.transformSync(pureTs, { loader: "ts", format: "esm" });
  return await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("T56 (Seam 4): Enlace de baja HMAC RFC 8058, Zoho + Resend, /api/v1/email/send-preview, CRM & ElevenLabs", async (t) => {
  await t.test(
    "1. unsubscribe-token.ts firma y verifica HMAC-SHA256 en tiempo constante y genera URL + cabeceras RFC 8058",
    async () => {
      const tokenMod = await import("../web/src/lib/unsubscribe-token.ts");
      const {
        createUnsubscribeToken,
        verifyUnsubscribeToken,
        constantTimeEqual,
        buildUnsubscribeUrl,
        buildUnsubscribeHeaders,
      } = tokenMod;

      const fixedNowSec = 1_795_000_000;
      const token = await createUnsubscribeToken(
        { slug: "24-centro-odonto", email: "Turnos@CentroOdonto.com.ar", exp: fixedNowSec + 3600 },
        TEST_UNSUB_KEY
      );
      assert.equal(token.split(".").length, 2);

      const okRes = await verifyUnsubscribeToken(token, TEST_UNSUB_KEY, {
        nowSeconds: fixedNowSec,
      });
      assert.equal(okRes.valid, true);
      assert.equal(okRes.payload?.slug, "24-centro-odonto");
      assert.equal(okRes.payload?.email, "turnos@centroodonto.com.ar");

      // Firma adulterada / payload adulterado / clave distinta
      const [payloadPart, sigPart] = token.split(".");
      const tamperedSig = `${sigPart.startsWith("A") ? "B" : "A"}${sigPart.slice(1)}`;
      const badSigRes = await verifyUnsubscribeToken(`${payloadPart}.${tamperedSig}`, TEST_UNSUB_KEY, {
        nowSeconds: fixedNowSec,
      });
      assert.equal(badSigRes.valid, false);
      assert.equal(badSigRes.reason, "invalid_signature");

      const wrongKeyRes = await verifyUnsubscribeToken(token, "otra-clave-distinta", {
        nowSeconds: fixedNowSec,
      });
      assert.equal(wrongKeyRes.valid, false);

      // Expirado
      const expRes = await verifyUnsubscribeToken(token, TEST_UNSUB_KEY, {
        nowSeconds: fixedNowSec + 7200,
      });
      assert.equal(expRes.valid, false);
      assert.equal(expRes.reason, "expired");

      // Malformado
      const malRes = await verifyUnsubscribeToken("sin-punto", TEST_UNSUB_KEY);
      assert.equal(malRes.valid, false);

      // Comparación en tiempo constante
      assert.equal(
        constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
        true
      );
      assert.equal(
        constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([9, 2, 3])),
        false
      );
      assert.equal(
        constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
        false
      );
      assert.equal(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])), false);

      const url = buildUnsubscribeUrl(token, "nexobow.site");
      assert.equal(url, `https://nexobow.site/api/unsubscribe?token=${encodeURIComponent(token)}`);
      const headers = buildUnsubscribeHeaders(url);
      assert.equal(headers["List-Unsubscribe"], `<${url}>`);
      assert.equal(headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    }
  );

  await t.test(
    "2. /api/unsubscribe maneja GET (303 a /baja-email/) y POST (200 RFC 8058), y /baja-email/ compila con 0 JS de negocio",
    async () => {
      const { createUnsubscribeToken } = await import("../web/src/lib/unsubscribe-token.ts");
      const unsubApi = await import("../web/functions/api/unsubscribe.ts");

      const token = await createUnsubscribeToken(
        {
          slug: "24-centro-odonto",
          email: "turnos@centroodonto.com.ar",
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        TEST_UNSUB_KEY
      );

      const dbMock = createMockSupabaseLeads([
        {
          id: 24,
          slug: "24-centro-odonto",
          name: "Centro Odonto",
          metadata: {
            email: "turnos@centroodonto.com.ar",
            marketing_opt_in: true,
            email_marketing: { unsubscribed: false, followup_stage: "welcome" },
          },
        },
      ]);

      // GET token alterado -> 303 a /baja-email/?status=invalid sin mutar DB
      const badGetRes = await unsubApi.onRequestGet({
        request: new Request("https://nexobow.site/api/unsubscribe?token=invalido.firma"),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(badGetRes.status, 303);
      assert.equal(badGetRes.headers.get("Location"), "https://nexobow.site/baja-email/?status=invalid");
      assert.equal(dbMock.updates.length, 0);

      // GET válido -> 303 a /baja-email/?status=ok y marca unsubscribed: true
      const getRes = await unsubApi.onRequestGet({
        request: new Request(
          `https://nexobow.site/api/unsubscribe?token=${encodeURIComponent(token)}`
        ),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(getRes.status, 303);
      assert.equal(getRes.headers.get("Location"), "https://nexobow.site/baja-email/?status=ok");
      assert.equal(getRes.headers.get("Cache-Control"), "no-store");
      assert.equal(getRes.headers.get("Set-Cookie"), null);
      const updatedAfterGet = dbMock.getBySlug("24-centro-odonto");
      assert.equal(updatedAfterGet.metadata.email_marketing.unsubscribed, true);
      assert.ok(updatedAfterGet.metadata.email_marketing.unsubscribed_at);
      assert.equal(updatedAfterGet.metadata.marketing_opt_in, false);

      // POST sin token -> 400; con firma inválida -> 403
      const postMissing = await unsubApi.onRequestPost({
        request: new Request("https://nexobow.site/api/unsubscribe", {
          method: "POST",
          body: "List-Unsubscribe=One-Click",
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(postMissing.status, 400);

      const postForbidden = await unsubApi.onRequestPost({
        request: new Request("https://nexobow.site/api/unsubscribe?token=abc.def", {
          method: "POST",
          body: "List-Unsubscribe=One-Click",
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(postForbidden.status, 403);

      // POST RFC 8058 válido -> 200 JSON
      const postOk = await unsubApi.onRequestPost({
        request: new Request(
          `https://nexobow.site/api/unsubscribe?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "List-Unsubscribe=One-Click",
          }
        ),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(postOk.status, 200);
      const postBody = await postOk.json();
      assert.equal(postBody.ok, true);
      assert.equal(postBody.unsubscribed, true);

      // Compilación y verificación de /baja-email/
      const releaseWebDistLock = acquireWebDistLock();
      t.after(releaseWebDistLock);

      const buildRes = spawnSync("npm", ["--prefix", "web", "run", "build"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      assert.equal(buildRes.status, 0, `Build web/ falló:\n${buildRes.stderr}\n${buildRes.stdout}`);
      assert.ok(existsSync(BAJA_HTML), "web/dist/baja-email/index.html debe existir");

      const bajaHtml = readFileSync(BAJA_HTML, "utf8");
      const audit = auditHtmlDocument(bajaHtml, {
        mode: "web",
        distDir: DIST_DIR,
        requireWhatsappCta: false,
      });
      assert.equal(audit.ok, true, `Auditoría fallida en /baja-email/: ${audit.errors.join("; ")}`);
      assert.equal(audit.executableScriptCount, 0);
      assert.equal(audit.jsBytes, 0);
      assert.match(bajaHtml, /<title>[^<]*NexoBow[^<]*<\/title>/i);
      assert.match(bajaHtml, /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i);
      assert.match(bajaHtml, /no vas a recibir más correos|removido de nuestra lista/i);
    }
  );

  await t.test(
    "3. Zoho Mail incluye link HMAC verificable + cabeceras RFC 8058 y omite con skipped_unsubscribed si unsubscribed === true",
    async () => {
      const { verifyUnsubscribeToken } = await import("../web/src/lib/unsubscribe-token.ts");
      const { buildZohoOutreachEmail, sendZohoOutreachEmail } = await import(
        "../scripts/send-zoho-outreach.mjs"
      );

      const activeLead = {
        id: 24,
        slug: "24-centro-odonto",
        nombre: "Centro Odonto",
        rubro: "odontologo",
        email: "turnos@centroodonto.com.ar",
        rating: 4.9,
        reviews_count: 42,
        website_bucket: "cubeta_a",
      };

      const built = buildZohoOutreachEmail(activeLead, { unsubscribeSecret: TEST_UNSUB_KEY });
      assert.ok(built.unsubscribeUrl.includes("/api/unsubscribe?token="));
      assert.ok(built.html.includes(built.unsubscribeUrl));
      assert.ok(built.text.includes(built.unsubscribeUrl));
      assert.equal(built.headers["List-Unsubscribe"], `<${built.unsubscribeUrl}>`);
      assert.equal(built.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");

      const tokenParam = new URL(built.unsubscribeUrl).searchParams.get("token");
      assert.ok(tokenParam);
      const verified = await verifyUnsubscribeToken(tokenParam, TEST_UNSUB_KEY);
      assert.equal(verified.valid, true, "Token generado sync en Zoho debe verificar en Web Crypto");
      assert.equal(verified.payload?.slug, "24-centro-odonto");

      // Transporte recibe headers RFC 8058
      const sentMails = [];
      const mockTransport = {
        async sendMail(mail) {
          sentMails.push(mail);
          return { messageId: `<zoho-${sentMails.length}@nexobow.site>` };
        },
      };
      const sentRes = await sendZohoOutreachEmail(activeLead, {
        transport: mockTransport,
        unsubscribeSecret: TEST_UNSUB_KEY,
      });
      assert.equal(sentRes.status, "sent");
      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].headers?.["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");

      // Bloqueo absoluto si unsubscribed === true (incluso con force: true)
      const unsubLead = {
        ...activeLead,
        metadata: {
          email: "turnos@centroodonto.com.ar",
          email_marketing: { unsubscribed: true, unsubscribed_at: "2026-11-19T10:00:00.000Z" },
        },
      };
      const skippedRes = await sendZohoOutreachEmail(unsubLead, {
        transport: mockTransport,
        force: true,
        unsubscribeSecret: TEST_UNSUB_KEY,
      });
      assert.equal(skippedRes.ok, true);
      assert.equal(skippedRes.skipped, true);
      assert.equal(skippedRes.status, "skipped_unsubscribed");
      assert.equal(sentMails.length, 1, "No debe enviar ningún correo a contacto dado de baja");
    }
  );

  await t.test(
    "4. /api/v1/email/send-preview y scripts/process-inbound-leads.mjs despachan entregas/seguimiento respetando skipped_unsubscribed",
    async () => {
      const sendPreviewMod = await import("../web/functions/api/v1/email/send-preview.ts");
      const processMod = await import("../scripts/process-inbound-leads.mjs");
      const { verifyUnsubscribeToken } = await import("../web/src/lib/unsubscribe-token.ts");

      const activeLead = {
        id: 71,
        slug: "71-valeria-gomez-odonto",
        name: "Dra. Valeria Gómez",
        niche: "odontologo",
        demo_url: "https://preview.nexobow.site/71-valeria-gomez-odonto/",
        metadata: {
          source: "inbound_web",
          email: "valeria@odontogomez.com.ar",
          email_marketing: { unsubscribed: false, followup_stage: "welcome" },
        },
      };
      const unsubLead = {
        id: 72,
        slug: "72-baja-med",
        name: "Dr. Baja",
        niche: "clinica",
        demo_url: "https://preview.nexobow.site/72-baja-med/",
        metadata: {
          source: "inbound_web",
          email: "baja@clinica.com.ar",
          email_marketing: { unsubscribed: true, unsubscribed_at: "2026-11-19T09:00:00.000Z" },
        },
      };

      const dbMock = createMockSupabaseLeads([activeLead, unsubLead]);

      // Sin autorización -> 401
      const unauthRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: "71-valeria-gomez-odonto" }),
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(unauthRes.status, 401);

      // Autorizado sobre lead activo -> envía "Tu muestra interactiva de NexoBow ya está lista"
      const sentApiMails = [];
      const okRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-jwt",
          },
          body: JSON.stringify({ slug: "71-valeria-gomez-odonto" }),
        }),
        env: {
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
          RESEND_FROM_EMAIL: "NexoBow <hola@nexobow.site>",
        },
        supabaseClient: dbMock,
        verifyAdmin: async () => ({ ok: true, email: "juanma@nexobow.site" }),
        sendEmail: async (mail) => {
          sentApiMails.push(mail);
          return { ok: true, id: "resend-preview-71" };
        },
      });
      assert.equal(okRes.status, 200);
      const okData = await okRes.json();
      assert.equal(okData.status, "sent");
      assert.equal(sentApiMails.length, 1);
      assert.match(sentApiMails[0].subject, /Tu muestra interactiva de NexoBow ya está lista/i);
      assert.equal(
        sentApiMails[0].headers?.["List-Unsubscribe-Post"],
        "List-Unsubscribe=One-Click"
      );
      const apiToken = new URL(
        sentApiMails[0].headers["List-Unsubscribe"].slice(1, -1)
      ).searchParams.get("token");
      assert.equal((await verifyUnsubscribeToken(apiToken, TEST_UNSUB_KEY)).valid, true);
      assert.equal(
        dbMock.getBySlug("71-valeria-gomez-odonto").metadata.email_marketing.followup_stage,
        "preview_delivered"
      );

      // Lead dado de baja -> skipped_unsubscribed y 0 correos
      const skippedApiRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin-jwt",
          },
          body: JSON.stringify({ slug: "72-baja-med" }),
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY, RESEND_API_KEY: "re_test" },
        supabaseClient: dbMock,
        verifyAdmin: async () => ({ ok: true, email: "juanma@nexobow.site" }),
        sendEmail: async (mail) => {
          sentApiMails.push(mail);
          return { ok: true, id: "should-not-send" };
        },
      });
      assert.equal(skippedApiRes.status, 200);
      assert.equal((await skippedApiRes.json()).status, "skipped_unsubscribed");
      assert.equal(sentApiMails.length, 1, "No debe enviar a lead dado de baja");

      // CLI process-inbound-leads.mjs: Día 1 Zoho + Día 4 Resend + skipped_unsubscribed
      const zohoSent = [];
      const resendPayloads = [];
      const batchRes = await processMod.processInboundLeadsBatch(
        [
          {
            ...activeLead,
            metadata: {
              source: "inbound_web",
              email: "valeria@odontogomez.com.ar",
              email_marketing: { unsubscribed: false, followup_stage: "welcome" },
            },
          },
          {
            id: 73,
            slug: "73-dia4-ttl",
            name: "Dr. Día Cuatro",
            niche: "abogado",
            demo_url: "https://preview.nexobow.site/73-dia4-ttl/",
            created_at: "2026-11-16T10:00:00.000Z",
            metadata: {
              source: "inbound_web",
              email: "dia4@estudio.com.ar",
              email_marketing: {
                unsubscribed: false,
                followup_stage: "preview_delivered",
                preview_ready_sent_at: "2026-11-16T12:00:00.000Z",
              },
            },
          },
          unsubLead,
        ],
        {
          now: () => new Date("2026-11-20T12:00:00.000Z"),
          unsubscribeSecret: TEST_UNSUB_KEY,
          resendApiKey: "re_batch_key",
          zohoTransport: {
            async sendMail(mail) {
              zohoSent.push(mail);
              return { messageId: "<zoho-71@nexobow.site>" };
            },
          },
          fetchImpl: async (url, init) => {
            resendPayloads.push({
              url: String(url),
              body: JSON.parse(String(init?.body || "{}")),
            });
            return new Response(JSON.stringify({ id: "resend-73" }), { status: 200 });
          },
        }
      );

      assert.equal(batchRes.sent, 2);
      assert.equal(batchRes.skippedUnsubscribed, 1);
      assert.equal(zohoSent.length, 1);
      assert.equal(resendPayloads.length, 1);
      assert.match(resendPayloads[0].body.subject, /quedan 3 días|vence/i);
      assert.equal(
        resendPayloads[0].body.headers?.["List-Unsubscribe-Post"],
        "List-Unsubscribe=One-Click"
      );
    }
  );

  await t.test(
    "5. CrmView.tsx, .env.example, package.json, ElevenLabs MCP docs y scripts/generate-voice-note.mjs cumplen el contrato",
    async () => {
      const crmMod = await loadCrmPureExports();
      const genFiche = await import("../scripts/generate-client-fiche.mjs");

      const legacy = { id: 10, slug: "10-legacy", name: "Lic. Legacy", niche: "nutricionista" };
      for (const resolver of [crmMod.resolveLeadMetadata, genFiche.resolveLeadMetadata]) {
        const resLegacy = resolver(legacy);
        assert.equal(resLegacy.terms_accepted, false);
        assert.equal(resLegacy.terms_accepted_at, null);
        assert.equal(resLegacy.email_marketing.unsubscribed, false);

        const resCompliant = resolver({
          ...legacy,
          metadata: {
            terms_accepted: true,
            terms_accepted_at: "2026-11-20T12:00:00.000Z",
            terms_version: "2026-11",
            marketing_opt_in: false,
            email_marketing: {
              unsubscribed: true,
              unsubscribed_at: "2026-11-20T13:00:00.000Z",
              followup_stage: "preview_delivered",
              provider_last: "resend",
            },
          },
        });
        assert.equal(resCompliant.terms_accepted, true);
        assert.equal(resCompliant.terms_accepted_at, "2026-11-20T12:00:00.000Z");
        assert.equal(resCompliant.terms_version, "2026-11");
        assert.equal(resCompliant.email_marketing.unsubscribed, true);
      }

      const crmSrc = readFileSync(
        join(REPO_ROOT, "web", "src", "components", "admin", "views", "CrmView.tsx"),
        "utf8"
      );
      assert.ok(crmSrc.includes("Dado de baja"), "CrmView debe mostrar badge 'Dado de baja'");
      assert.ok(
        crmSrc.includes("Enviar Preview Lista (Email)"),
        "CrmView debe incluir botón 'Enviar Preview Lista (Email)'"
      );
      assert.ok(crmSrc.includes("/api/v1/email/send-preview"));

      const envExample = readFileSync(join(REPO_ROOT, ".env.example"), "utf8");
      for (const envKey of [
        "RESEND_FROM_EMAIL=",
        "UNSUBSCRIBE_SECRET=",
        "ELEVENLABS_API_KEY=",
        "ELEVENLABS_VOICE_ID=",
      ]) {
        assert.ok(envExample.includes(envKey), `.env.example debe documentar ${envKey}`);
      }
      assert.match(
        envExample,
        /sin credenciales reales/i,
        ".env.example debe documentar la política sin credenciales reales"
      );
      assert.doesNotMatch(
        envExample,
        new RegExp("\\bsecre" + "tos\\b", "i"),
        ".env.example no debe contener términos prohibidos"
      );

      const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
      assert.ok(pkg.scripts["process-inbound"], "package.json debe incluir script process-inbound");
      assert.ok(pkg.scripts["voice-note"], "package.json debe incluir script voice-note");

      const elevenDocsPath = join(REPO_ROOT, "docs", "elevenlabs-mcp-setup.md");
      assert.ok(existsSync(elevenDocsPath), "docs/elevenlabs-mcp-setup.md debe existir");
      const elevenDocs = readFileSync(elevenDocsPath, "utf8");
      assert.match(elevenDocs, /elevenlabs-mcp/);
      assert.match(elevenDocs, /uvx/);
      assert.match(elevenDocs, /mcp_config\.json/);
      assert.match(elevenDocs, /ELEVENLABS_API_KEY/);

      // generate-voice-note.mjs con --dry-run y fetch mock
      const voiceMod = await import("../scripts/generate-voice-note.mjs");
      const tmpOut = mkdtempSync(join(tmpdir(), "nexobow-voice-"));
      try {
        let fetchCalled = 0;
        const dryRes = await voiceMod.generateVoiceNote({
          slug: "71-valeria-gomez-odonto",
          text: '[GUION AUDIO 35s] "Hola Valeria, tu muestra está lista."',
          dryRun: true,
          outputDir: tmpOut,
          fetchImpl: async () => {
            fetchCalled++;
            return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
          },
        });
        assert.equal(dryRes.status, "dry_run");
        assert.equal(fetchCalled, 0);
        assert.equal(dryRes.cleanedText, "Hola Valeria, tu muestra está lista.");

        // Sin credenciales y sin dry-run debe fallar con error claro
        await assert.rejects(
          () =>
            voiceMod.generateVoiceNote({
              slug: "71-valeria-gomez-odonto",
              text: "Hola",
              apiKey: "",
              voiceId: "",
              outputDir: tmpOut,
            }),
          /ELEVENLABS_API_KEY|ELEVENLABS_VOICE_ID/
        );

        // Con fetchImpl mock genera MP3 en disco
        const mockRequests = [];
        const liveRes = await voiceMod.generateVoiceNote({
          slug: "71-valeria-gomez-odonto",
          text: '[GUION AUDIO 35s] "Hola Valeria, soy Juanma de NexoBow."',
          apiKey: "el_mock_key",
          voiceId: "voice_juanma_mock",
          outputDir: tmpOut,
          fetchImpl: async (url, init) => {
            mockRequests.push({
              url: String(url),
              headers: init?.headers || {},
              body: JSON.parse(String(init?.body || "{}")),
            });
            return new Response(Uint8Array.from([0x49, 0x44, 0x33, 0x03]), { status: 200 });
          },
        });
        assert.equal(liveRes.status, "generated");
        assert.equal(mockRequests.length, 1);
        assert.match(mockRequests[0].url, /api\.elevenlabs\.io\/v1\/text-to-speech\/voice_juanma_mock/);
        assert.equal(mockRequests[0].headers["xi-api-key"], "el_mock_key");
        assert.equal(mockRequests[0].body.text, "Hola Valeria, soy Juanma de NexoBow.");
        assert.ok(existsSync(liveRes.outputPath));
      } finally {
        rmSync(tmpOut, { recursive: true, force: true });
      }
    }
  );

  await t.test(
    "6. Ticket #57 (Seam 5): Fail-closed CF_PAGES=1, rechazo limpio 400/403 no-store en /api/unsubscribe, constantTimeEqual en send-preview + metadata.unsubscribed y neutralización CRLF en Zoho SMTP",
    async () => {
      const { createUnsubscribeToken, resolveUnsubscribeSecret } = await import(
        "../web/src/lib/unsubscribe-token.ts"
      );
      const unsubApi = await import("../web/functions/api/unsubscribe.ts");
      const sendPreviewMod = await import("../web/functions/api/v1/email/send-preview.ts");
      const zohoMod = await import("../scripts/send-zoho-outreach.mjs");

      // 1. Fail-closed cuando CF_PAGES === "1" sin UNSUBSCRIBE_SECRET
      assert.equal(
        resolveUnsubscribeSecret({ CF_PAGES: "1" }),
        "",
        "CF_PAGES=1 sin UNSUBSCRIBE_SECRET debe fallar cerrado devolviendo cadena vacía"
      );
      assert.equal(
        resolveUnsubscribeSecret({ CF_PAGES: "1", UNSUBSCRIBE_SECRET: "clave-prod-ok" }),
        "clave-prod-ok"
      );

      // 2. /api/unsubscribe rechazo limpio 400/403 con Cache-Control: no-store sin filtrar detalles internos
      const dbMock = createMockSupabaseLeads([
        {
          id: 95,
          slug: "95-prueba-baja",
          name: "Dra. Prueba Baja",
          metadata: {
            email: "prueba@baja.com.ar",
            email_marketing: { unsubscribed: false },
          },
        },
      ]);

      const nowSec = Math.floor(Date.now() / 1000);
      const validToken = await createUnsubscribeToken(
        { slug: "95-prueba-baja", email: "prueba@baja.com.ar", exp: nowSec + 3600 },
        TEST_UNSUB_KEY
      );
      const expiredToken = await createUnsubscribeToken(
        { slug: "95-prueba-baja", email: "prueba@baja.com.ar", exp: nowSec - 60 },
        TEST_UNSUB_KEY
      );

      const postNoToken = await unsubApi.onRequestPost({
        request: new Request("https://nexobow.site/api/unsubscribe", {
          method: "POST",
          body: "List-Unsubscribe=One-Click",
        }),
        env: { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY },
        supabaseClient: dbMock,
      });
      assert.equal(postNoToken.status, 400);
      assert.equal(postNoToken.headers.get("Cache-Control"), "no-store");

      const [validPayloadPart, validSigPart] = validToken.split(".");
      const tamperedValidToken = `${validPayloadPart}.${validSigPart.startsWith("A") ? "B" : "A"}${validSigPart.slice(1)}`;

      for (const [label, tokenVal, envCfg] of [
        ["firma alterada", tamperedValidToken, { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY }],
        ["token expirado", expiredToken, { UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY }],
        ["CF_PAGES sin clave", validToken, { CF_PAGES: "1" }],
      ]) {
        const res = await unsubApi.onRequestPost({
          request: new Request(
            `https://nexobow.site/api/unsubscribe?token=${encodeURIComponent(tokenVal)}`,
            {
              method: "POST",
              body: "List-Unsubscribe=One-Click",
            }
          ),
          env: envCfg,
          supabaseClient: dbMock,
        });
        assert.equal(res.status, 403, `${label} debe responder 403`);
        assert.equal(res.headers.get("Cache-Control"), "no-store", `${label} debe llevar Cache-Control: no-store`);
        const rawTxt = await res.text();
        assert.doesNotMatch(
          rawTxt,
          /invalid_signature|missing_key|UNSUBSCRIBE_SECRET|TypeError|stack/i,
          `${label} no debe filtrar detalles internos`
        );
      }
      assert.equal(dbMock.updates.length, 0, "Ningún rechazo de /api/unsubscribe debe mutar Supabase");

      // 3. send-preview.ts usa constantTimeEqual (sin === sobre claves), sin fallback anon en DB y respeta metadata.unsubscribed === true
      const sendPreviewSrc = readFileSync(
        join(REPO_ROOT, "web", "functions", "api", "v1", "email", "send-preview.ts"),
        "utf8"
      );
      assert.match(sendPreviewSrc, /\bconstantTimeEqual\b/);
      assert.doesNotMatch(sendPreviewSrc, /bearerToken\s*===\s*(serviceKey|adminKey)/);

      const topLevelUnsubLead = {
        id: 96,
        slug: "96-top-level-unsub",
        name: "Dr. Baja Raíz Meta",
        niche: "clinica",
        demo_url: "https://preview.nexobow.site/96-top-level-unsub/",
        metadata: {
          email: "top@clinica.com.ar",
          unsubscribed: true,
        },
      };
      const activePreviewLead = {
        id: 97,
        slug: "97-active-preview",
        name: "Dra. Activa",
        niche: "odontologo",
        demo_url: "https://preview.nexobow.site/97-active-preview/",
        metadata: {
          email: "activa@odontologia.com.ar",
          email_marketing: { unsubscribed: false },
        },
      };
      const previewDb = createMockSupabaseLeads([topLevelUnsubLead, activePreviewLead]);
      const dispatchedPreviewMails = [];

      const wrongAdminKeyRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer wrong-admin-api-key-1234",
          },
          body: JSON.stringify({ slug: "97-active-preview" }),
        }),
        env: {
          ADMIN_API_SECRET: "super-admin-api-key-1234",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
        },
        supabaseClient: previewDb,
        sendEmail: async (m) => {
          dispatchedPreviewMails.push(m);
          return { id: "should-not-happen" };
        },
      });
      assert.ok(wrongAdminKeyRes.status === 401 || wrongAdminKeyRes.status === 403);
      assert.equal(dispatchedPreviewMails.length, 0);

      const okAdminKeyRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer super-admin-api-key-1234",
          },
          body: JSON.stringify({ slug: "97-active-preview" }),
        }),
        env: {
          ADMIN_API_SECRET: "super-admin-api-key-1234",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
        },
        supabaseClient: previewDb,
        sendEmail: async (m) => {
          dispatchedPreviewMails.push(m);
          return { id: "preview-ok-97" };
        },
      });
      assert.equal(okAdminKeyRes.status, 200);
      assert.equal(dispatchedPreviewMails.length, 1);

      const skippedTopUnsubRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer super-admin-api-key-1234",
          },
          body: JSON.stringify({ slug: "96-top-level-unsub" }),
        }),
        env: {
          ADMIN_API_SECRET: "super-admin-api-key-1234",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
        },
        supabaseClient: previewDb,
        sendEmail: async (m) => {
          dispatchedPreviewMails.push(m);
          return { id: "should-not-send" };
        },
      });
      assert.equal(skippedTopUnsubRes.status, 200);
      assert.equal((await skippedTopUnsubRes.json()).status, "skipped_unsubscribed");
      assert.equal(dispatchedPreviewMails.length, 1, "metadata.unsubscribed === true debe bloquear el envío");

      const oversizedSendRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer super-admin-api-key-1234",
          },
          body: JSON.stringify({ slug: "97-active-preview", extra: "x".repeat(4500) }),
        }),
        env: {
          ADMIN_API_SECRET: "super-admin-api-key-1234",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
        },
        supabaseClient: previewDb,
        sendEmail: async (m) => {
          dispatchedPreviewMails.push(m);
          return { id: "should-not-send-413" };
        },
      });
      assert.equal(oversizedSendRes.status, 413);
      assert.equal(oversizedSendRes.headers.get("Cache-Control"), "no-store");
      assert.equal(dispatchedPreviewMails.length, 1);

      const nullBodySendRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer super-admin-api-key-1234",
          },
          body: "null",
        }),
        env: {
          ADMIN_API_SECRET: "super-admin-api-key-1234",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
        },
        supabaseClient: previewDb,
        sendEmail: async (m) => {
          dispatchedPreviewMails.push(m);
          return { id: "should-not-send-null" };
        },
      });
      assert.equal(nullBodySendRes.status, 400);
      assert.equal(dispatchedPreviewMails.length, 1);

      const xssDemoLead = {
        id: 99,
        slug: "99-xss-demo-url",
        name: "Dra. URL Segura",
        niche: "clinica",
        demo_url: "javascript:alert(1)",
        metadata: {
          email: "segura@clinica.com.ar",
          email_marketing: { unsubscribed: false },
        },
      };
      const xssDemoDb = createMockSupabaseLeads([xssDemoLead]);
      const xssDemoMails = [];
      const xssDemoRes = await sendPreviewMod.onRequestPost({
        request: new Request("https://nexobow.site/api/v1/email/send-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer super-admin-api-key-1234",
          },
          body: JSON.stringify({ slug: "99-xss-demo-url" }),
        }),
        env: {
          ADMIN_API_SECRET: "super-admin-api-key-1234",
          UNSUBSCRIBE_SECRET: TEST_UNSUB_KEY,
          RESEND_API_KEY: "re_test",
        },
        supabaseClient: xssDemoDb,
        sendEmail: async (m) => {
          xssDemoMails.push(m);
          return { id: "safe-url-99" };
        },
      });
      assert.equal(xssDemoRes.status, 200);
      assert.equal(xssDemoMails.length, 1);
      assert.doesNotMatch(xssDemoMails[0].html, /javascript:/i);
      assert.doesNotMatch(xssDemoMails[0].text, /javascript:/i);
      assert.match(xssDemoMails[0].html, /https:\/\/preview\.nexobow\.site\/99-xss-demo-url\//);

      // 4. Neutralización CRLF (\r / \n) en cabeceras SMTP de scripts/send-zoho-outreach.mjs
      const sanitizedVal = zohoMod.sanitizeSmtpHeaderValue("Hola\r\nBcc: spy@evil.example\nX-Evil: 1");
      assert.doesNotMatch(sanitizedVal, /[\r\n]/);

      const builtWithCrlfName = zohoMod.buildZohoOutreachEmail(
        {
          id: 98,
          slug: "98-crlf-test",
          nombre: "Dr. Juan\r\nBcc: spy@evil.example",
          rubro: "clinica",
          email: "juan@clinica.com.ar",
          rating: 4.9,
        },
        { unsubscribeSecret: TEST_UNSUB_KEY }
      );
      assert.doesNotMatch(builtWithCrlfName.subject, /[\r\n]/);

      const rawMime = zohoMod.buildMimeMessage({
        fromEmail: "juanma@nexobow.site",
        fromName: "Juanma\r\nX-Injected: 1",
        to: "doc@clinica.com.ar\r\nBcc: spy@evil.example",
        replyTo: "reply@nexobow.site\r\nCc: spy2@evil.example",
        subject: "Hola\r\nBcc: spy3@evil.example",
        text: "Texto de prueba",
        html: "<p>HTML</p>",
        messageId: "<98@nexobow.site>",
        headers: {
          "X-Custom\r\nBcc: spy4@evil.example": "val\r\nX-Two: 2",
        },
      });
      const headerBlock = rawMime.split("\r\n\r\n")[0];
      const headerLines = headerBlock.split("\r\n");
      for (const line of headerLines) {
        assert.doesNotMatch(
          line,
          /^(Bcc|Cc|X-Injected|X-Two):/i,
          `Inyección CRLF detectada en cabecera SMTP: ${line}`
        );
      }
    }
  );
});
