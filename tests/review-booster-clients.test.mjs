// tests/review-booster-clients.test.mjs — Suite TDD Seams 2 y 3 (Ticket #59: Review Booster Doble Modo, Migración Supabase 8 Tablas, /admin/clients 72h & Alertas Cockpit)
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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
      if (Date.now() > deadline) {
        throw new Error("Timeout esperando lock de web/dist");
      }
      Atomics.wait(view, 0, 0, 100);
    }
  }
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Patrones del Ticket #55 construidos por fragmentos para cumplir con copy-humanization.test.mjs
const HUMANIZATION_GUARDS = [
  { label: "guard-01", regex: new RegExp(["si" + "lla", "vac[ií]a"].join("\\s+"), "i") },
  { label: "guard-02", regex: new RegExp(["si" + "llas", "vac[ií]as"].join("\\s+"), "i") },
  { label: "guard-03", regex: new RegExp(["an" + "ti-si" + "lla", "vac[ií]a"].join("\\s+"), "i") },
  { label: "guard-04", regex: new RegExp("ce" + "ro-" + "secre" + "taria", "i") },
  { label: "guard-05", regex: new RegExp(["esta" + "llar", "tu", "agenda"].join("\\s+"), "i") },
  { label: "guard-06", regex: new RegExp("\\b" + "revoluc" + "ionario\\b", "i") },
  { label: "guard-07", regex: new RegExp("\\b" + "secr" + "etos\\b", "i") },
  { label: "guard-08", regex: new RegExp("\\b" + "disrup" + "tivo\\b", "i") },
];

const GOOGLE_PROHIBITED_INCENTIVES_RE =
  /descuento|sorteo|premio|regalo|cup[oó]n|gratis|reintegro|cashback|a cambio de/i;

function assertHumanizedNoIncentives(text, label) {
  for (const guard of HUMANIZATION_GUARDS) {
    assert.doesNotMatch(text, guard.regex, `${label} no debe contener frase prohibida (${guard.label})`);
  }
  assert.doesNotMatch(
    text,
    GOOGLE_PROHIBITED_INCENTIVES_RE,
    `${label} no debe prometer incentivos económicos prohibidos por Google`
  );
}

test("T59 (Seam 2): Review Booster Doble Modo 100% Offline (scripts/review-booster.mjs & package.json)", async (t) => {
  await t.test(
    "1. extractPlaceIdFromMapsUrl extrae place_id explícitos y retorna null sin red en enlaces cortos o sin place_id",
    async () => {
      const rb = await import("../scripts/review-booster.mjs");
      assert.equal(typeof rb.extractPlaceIdFromMapsUrl, "function");

      const placeId = "ChIJN1t_tDeuEmsRUsoyG83frY4";
      assert.equal(
        rb.extractPlaceIdFromMapsUrl(`https://www.google.com/maps/search/?api=1&query=Centro&query_place_id=${placeId}`),
        placeId
      );
      assert.equal(
        rb.extractPlaceIdFromMapsUrl(`https://maps.google.com/?place_id=${placeId}`),
        placeId
      );
      assert.equal(
        rb.extractPlaceIdFromMapsUrl(`https://search.google.com/local/writereview?placeid=${placeId}`),
        placeId
      );
      assert.equal(
        rb.extractPlaceIdFromMapsUrl(`https://www.google.com/maps?q=place_id:${placeId}`),
        placeId
      );

      assert.equal(rb.extractPlaceIdFromMapsUrl("https://maps.app.goo.gl/abc123"), null);
      assert.equal(rb.extractPlaceIdFromMapsUrl("https://goo.gl/maps/xyz789"), null);
      assert.equal(
        rb.extractPlaceIdFromMapsUrl("https://www.google.com/maps/place/Centro+Odonto/@-34.5,-58.4,17z"),
        null
      );

      assert.equal(rb.extractPlaceIdFromMapsUrl("javascript:alert(1)"), null);
      assert.equal(rb.extractPlaceIdFromMapsUrl("data:text/html,<script>alert(1)</script>"), null);
      assert.equal(rb.extractPlaceIdFromMapsUrl(`https://evilgoogle.com/?place_id=${placeId}`), null);
      assert.equal(rb.extractPlaceIdFromMapsUrl(`https://phishing.google.evil.com/?place_id=${placeId}`), null);
      assert.equal(
        rb.extractPlaceIdFromMapsUrl(`https://www.google.com.ar/maps/search/?api=1&query=Centro&query_place_id=${placeId}`),
        placeId
      );
      assert.equal(rb.extractPlaceIdFromMapsUrl(""), null);
      assert.equal(rb.extractPlaceIdFromMapsUrl(null), null);
    }
  );

  await t.test(
    "2. buildGoogleReviewUrl genera writereview?placeid=... o fallback sanitizado rechazando javascript:/data:",
    async () => {
      const rb = await import("../scripts/review-booster.mjs");
      assert.equal(typeof rb.buildGoogleReviewUrl, "function");

      const placeId = "ChIJN1t_tDeuEmsRUsoyG83frY4";
      assert.equal(
        rb.buildGoogleReviewUrl({ placeId }),
        `https://search.google.com/local/writereview?placeid=${placeId}`
      );
      assert.equal(
        rb.buildGoogleReviewUrl({
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=Dra+Laura&query_place_id=${placeId}`,
        }),
        `https://search.google.com/local/writereview?placeid=${placeId}`
      );

      assert.equal(
        rb.buildGoogleReviewUrl({
          mapsUrl: "https://maps.app.goo.gl/ejemploConsultorio",
          businessName: "Dra. Laura Méndez",
        }),
        "https://maps.app.goo.gl/ejemploConsultorio"
      );

      for (const badUrl of [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "http://insecure.example/maps",
        "vbscript:msgbox(1)",
      ]) {
        const safeUrl = rb.buildGoogleReviewUrl({
          mapsUrl: badUrl,
          businessName: "Centro Médico Norte",
          location: "Belgrano, CABA",
        });
        assert.ok(safeUrl.startsWith("https://www.google.com/maps/search/?api=1&query="));
        assert.doesNotMatch(safeUrl, /javascript:|data:|vbscript:/i);
      }
    }
  );

  await t.test(
    "3. generateReviewQrSvg genera <svg> determinista autocontenido sin red y rechaza URLs inseguras",
    async () => {
      const rb = await import("../scripts/review-booster.mjs");
      assert.equal(typeof rb.generateReviewQrSvg, "function");

      const urlA = "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
      const urlB = "https://search.google.com/local/writereview?placeid=ChIJAnotherPlaceId99999999";

      const svg1 = rb.generateReviewQrSvg(urlA, {
        size: 280,
        label: 'Reseña "Dra. Laura" <Consultorio & Salud>',
      });
      const svg2 = rb.generateReviewQrSvg(urlA, {
        size: 280,
        label: 'Reseña "Dra. Laura" <Consultorio & Salud>',
      });
      const svgOther = rb.generateReviewQrSvg(urlB, { size: 280 });

      assert.equal(svg1, svg2, "La generación QR SVG debe ser 100% determinista");
      assert.notEqual(svg1, svgOther, "URLs distintas deben generar matrices QR distintas");
      assert.match(svg1, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      assert.match(svg1, /\brole="img"/);
      assert.match(svg1, /\bviewBox="0 0 \d+ \d+"/);
      assert.match(svg1, /<title>.*&lt;Consultorio &amp; Salud&gt;.*<\/title>/);
      assert.match(svg1, /<(path|rect)\b/);
      assert.doesNotMatch(svg1, /<script\b/i);
      assert.doesNotMatch(svg1, /\b(?:src|href)=["']https?:\/\//i);

      assert.throws(() => rb.generateReviewQrSvg("javascript:alert(1)"));
      assert.throws(() => rb.generateReviewQrSvg("data:text/html,xss"));
      assert.throws(() => rb.generateReviewQrSvg(""));
    }
  );

  await t.test(
    "4. buildReviewRequestMessage (tier1_manual y tier2_post_consult), buildReviewBoosterWorkflowPayload y CLI package.json",
    async () => {
      const rb = await import("../scripts/review-booster.mjs");
      assert.equal(typeof rb.buildReviewRequestMessage, "function");
      assert.equal(typeof rb.buildReviewBoosterWorkflowPayload, "function");

      const reviewUrl = "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";

      const msgManual = rb.buildReviewRequestMessage({
        providerName: "Dra. Laura Méndez",
        specialty: "Dermatología Clínica",
        patientFirstName: "Carolina",
        reviewUrl,
        mode: "tier1_manual",
      });
      assert.ok(msgManual.includes(reviewUrl));
      assert.match(msgManual, /\b(estás|tenés|podés|querés)\b/i);
      assertHumanizedNoIncentives(msgManual, "tier1_manual");

      const msgPostConsult = rb.buildReviewRequestMessage({
        providerName: "Dra. Laura Méndez",
        specialty: "Dermatología Clínica",
        patientFirstName: "Carolina",
        reviewUrl,
        mode: "tier2_post_consult",
      });
      assert.ok(msgPostConsult.includes(reviewUrl));
      assert.match(msgPostConsult, /\bbaja\b/i, "tier2_post_consult debe incluir opt-out Ley 25.326");
      assertHumanizedNoIncentives(msgPostConsult, "tier2_post_consult");

      assert.throws(() =>
        rb.buildReviewRequestMessage({
          providerName: "Dra. Laura Méndez",
          reviewUrl,
          mode: "invalid_mode",
        })
      );

      const payload = rb.buildReviewBoosterWorkflowPayload({
        slug: "24-laura-mendez-dermatologia",
        provider_name: "Dra. Laura Méndez",
        niche: "dermatologia",
        tier: "autonomous_tier2",
        maps_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        review_url: reviewUrl,
      });

      assert.equal(payload.workflow_id, "03-review-booster");
      assert.equal(payload.client_slug, "24-laura-mendez-dermatologia");
      assert.equal(payload.provider_name, "Dra. Laura Méndez");
      assert.equal(payload.maps_place_id, "ChIJN1t_tDeuEmsRUsoyG83frY4");
      assert.equal(payload.review_url, reviewUrl);
      assert.deepEqual(payload.dispatch_delay_hours, { min: 2, max: 4 });
      assert.equal(payload.compliance.no_incentives_policy, true);
      assert.equal(payload.compliance.idempotent_reminder_type, "review_5star");
      assert.ok(payload.message_templates.tier1_manual.includes(reviewUrl));
      assert.ok(payload.message_templates.tier2_post_consult.includes(reviewUrl));
      assert.deepEqual(payload.telemetry_event, {
        client_slug: "24-laura-mendez-dermatologia",
        event_type: "review_invite_sent",
        count_delta: 1,
      });
      for (const piiKey of ["phone", "email", "dni", "patient_name"]) {
        assert.equal(piiKey in payload, false, `Payload no debe exponer campo PII ${piiKey}`);
      }

      const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
      assert.equal(pkg.scripts["review-booster"], "node scripts/review-booster.mjs");

      const cliRes = spawnSync(
        "node",
        [
          "scripts/review-booster.mjs",
          "--name",
          "Dra. Laura Méndez",
          "--specialty",
          "Dermatología",
          "--place-id",
          "ChIJN1t_tDeuEmsRUsoyG83frY4",
          "--slug",
          "24-laura-mendez-dermatologia",
          "--json",
        ],
        { cwd: REPO_ROOT, encoding: "utf8" }
      );
      assert.equal(cliRes.status, 0, `CLI review-booster falló: ${cliRes.stderr}`);
      const cliJson = JSON.parse(cliRes.stdout);
      assert.equal(cliJson.reviewUrl, reviewUrl);
      assert.match(cliJson.qrSvg, /^<svg\b/);
      assert.equal(cliJson.workflowPayload.workflow_id, "03-review-booster");
    }
  );
});

test("T59 (Seam 3): Migración SQL Supabase, active-clients.ts (72h/6 Hitos/Verdad Única), Promoción CRM, Cockpit & 8 Tablas", async (t) => {
  await t.test(
    "5. Migración SQL crea enums, active_clients (lead_id bigint), autonomous_events (0 PII) y RLS is_admin_owner()",
    () => {
      const migrationPath = join(
        REPO_ROOT,
        "supabase",
        "migrations",
        "20261121000000_active_clients_and_autonomous_events.sql"
      );
      assert.ok(existsSync(migrationPath), "Debe existir la migración 20261121000000");
      const sql = readFileSync(migrationPath, "utf8");

      assert.match(sql, /CREATE TYPE public\.client_tier_type AS ENUM/i);
      assert.match(sql, /CREATE TYPE public\.delivery_sla_status AS ENUM/i);
      assert.match(sql, /CREATE TYPE public\.autonomous_event_type AS ENUM/i);

      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.active_clients/i);
      assert.match(
        sql,
        /lead_id\s+bigint\s+UNIQUE\s+REFERENCES\s+public\.leads\s*\(\s*id\s*\)\s+ON\s+DELETE\s+SET\s+NULL/i,
        "lead_id debe ser bigint (nunca uuid) referenciando public.leads(id)"
      );
      assert.doesNotMatch(sql, /lead_id\s+uuid/i);

      for (const key of [
        "material_received",
        "copy_approved",
        "production_aeo_built",
        "domain_ssl_verified",
        "review_booster_ready",
        "delivery_confirmed",
      ]) {
        assert.ok(sql.includes(key), `Checklist JSONB debe incluir hito ${key}`);
      }
      assert.match(sql, /delivery_deadline_at\s+timestamptz\s+NOT NULL/i);
      assert.match(sql, /trial_ends_at\s+timestamptz\s+NOT NULL/i);
      assert.match(sql, /hosting_renews_at\s+timestamptz\s+NOT NULL/i);
      assert.match(sql, /CREATE TRIGGER\b[\s\S]*BEFORE UPDATE ON public\.active_clients/i);

      const eventsTableMatch = sql.match(
        /CREATE TABLE IF NOT EXISTS public\.autonomous_events\s*\([\s\S]*?\);/i
      );
      assert.ok(eventsTableMatch, "Debe existir CREATE TABLE public.autonomous_events");
      const eventsBlock = eventsTableMatch[0];
      assert.match(eventsBlock, /CHECK\s*\(\s*count_delta\s*>=\s*0\s+AND\s+count_delta\s*<=\s*10000\s*\)/i);
      for (const piiCol of [
        "phone",
        "telefono",
        "patient_phone",
        "patient_name",
        "email",
        "dni",
        "cuit",
        "message_text",
        "audio_transcript",
      ]) {
        assert.doesNotMatch(
          eventsBlock,
          new RegExp(`\\b${piiCol}\\b`, "i"),
          `autonomous_events no debe tener columna PII (${piiCol})`
        );
      }

      assert.match(sql, /ALTER TABLE public\.active_clients ENABLE ROW LEVEL SECURITY/i);
      assert.match(sql, /ALTER TABLE public\.autonomous_events ENABLE ROW LEVEL SECURITY/i);
      assert.match(sql, /public\.is_admin_owner\(\)/i);
    }
  );

  await t.test(
    "6. active-clients.ts: addBusinessHours (72h lun-vie), buildActiveClientFromLead (+30d/+365d), 6 hitos, domain-provisioner, review-booster y Verdad Única",
    async () => {
      const ac = await import("../web/src/lib/active-clients.ts");

      // Lunes 10:00 UTC + 72h hábiles -> Jueves 10:00 UTC
      assert.equal(
        ac.addBusinessHours("2026-11-23T10:00:00.000Z", 72).toISOString(),
        "2026-11-26T10:00:00.000Z"
      );
      // Jueves 10:00 UTC + 72h hábiles -> Martes 10:00 UTC (salta sáb y dom)
      assert.equal(
        ac.addBusinessHours("2026-11-26T10:00:00.000Z", 72).toISOString(),
        "2026-12-01T10:00:00.000Z"
      );
      // Viernes 15:30 UTC + 72h hábiles -> Miércoles 15:30 UTC
      assert.equal(
        ac.addBusinessHours("2026-11-27T15:30:00.000Z", 72).toISOString(),
        "2026-12-02T15:30:00.000Z"
      );
      // Sábado 14:00 UTC + 72h hábiles -> Jueves 00:00 UTC
      assert.equal(
        ac.addBusinessHours("2026-11-28T14:00:00.000Z", 72).toISOString(),
        "2026-12-03T00:00:00.000Z"
      );

      const promotedAt = new Date("2026-11-26T10:00:00.000Z");
      const client = ac.buildActiveClientFromLead(
        {
          id: 24,
          slug: "24-centro-odonto-palermo",
          name: "Centro Odonto Palermo",
          niche: "odontologo",
          potential_value: "$549.999 ARS",
          metadata: {
            maps_url:
              "https://www.google.com/maps/search/?api=1&query=Centro&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4",
            tier_interes: "tier_2_autonomous",
          },
        },
        { promotedAt }
      );

      assert.equal(client.lead_id, 24);
      assert.equal(client.slug, "24-centro-odonto-palermo");
      assert.equal(client.provider_name, "Centro Odonto Palermo");
      assert.equal(client.tier, "autonomous_tier2");
      assert.equal(client.delivery_status, "en_curso");
      assert.equal(client.delivery_deadline_at, "2026-12-01T10:00:00.000Z");
      assert.equal(client.trial_ends_at, "2026-12-26T10:00:00.000Z");
      assert.equal(client.hosting_renews_at, "2027-11-26T10:00:00.000Z");
      assert.equal(client.maps_place_id, "ChIJN1t_tDeuEmsRUsoyG83frY4");
      assert.equal(
        client.review_url,
        "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4"
      );

      const prog0 = ac.computeChecklistProgress(client.checklist);
      assert.equal(prog0.completed, 0);
      assert.equal(prog0.total, 6);
      assert.equal(prog0.percent, 0);
      assert.equal(prog0.isComplete, false);

      const prog3 = ac.computeChecklistProgress({
        ...client.checklist,
        material_received: true,
        copy_approved: true,
        production_aeo_built: true,
      });
      assert.equal(prog3.completed, 3);
      assert.equal(prog3.percent, 50);

      const prog6 = ac.computeChecklistProgress({
        material_received: true,
        copy_approved: true,
        production_aeo_built: true,
        domain_ssl_verified: true,
        review_booster_ready: true,
        delivery_confirmed: true,
      });
      assert.equal(prog6.completed, 6);
      assert.equal(prog6.percent, 100);
      assert.equal(prog6.isComplete, true);

      // Alertas <24h entrega y <=5d prueba
      const now = new Date("2026-11-30T15:00:00.000Z");
      const sla24 = ac.resolveDeliverySlaState(client, now);
      assert.equal(sla24.isUrgent24h, true);
      assert.equal(sla24.effectiveStatus, "alerta_24h");

      const trialEndingClient = {
        ...client,
        id: "ac-trial-5d",
        slug: "25-dra-prueba",
        provider_name: "Dra. Prueba",
        delivery_status: "entregado_en_tiempo",
        delivered_at: "2026-11-27T10:00:00.000Z",
        checklist: {
          material_received: true,
          copy_approved: true,
          production_aeo_built: true,
          domain_ssl_verified: true,
          review_booster_ready: true,
          delivery_confirmed: true,
        },
        trial_ends_at: "2026-12-03T15:00:00.000Z", // 3 días restantes (<=5d)
      };

      const alerts = ac.extractOperationalAlerts([client, trialEndingClient], now);
      assert.equal(alerts.length, 2);
      assert.ok(alerts.some((a) => a.type === "delivery_72h" && a.clientSlug === client.slug));
      assert.ok(alerts.some((a) => a.type === "trial_30d" && a.clientSlug === trialEndingClient.slug));

      // domain-provisioner command + review kit offline
      const dnsPlan = ac.buildDomainProvisionerCommand("centroodonto.com.ar", client.slug);
      assert.equal(dnsPlan.isNicAr, true);
      assert.match(dnsPlan.checkCommand, /scripts\/domain-provisioner\.mjs --domain centroodonto\.com\.ar --check/);
      assert.match(dnsPlan.buildProductionCommand, /--mode production --domain centroodonto\.com\.ar/);
      assert.match(dnsPlan.wranglerCommand, /wrangler pages project domain add/);

      const kit = ac.buildClientReviewKit(client);
      assert.equal(kit.reviewUrl, client.review_url);
      assert.match(kit.qrSvg, /^<svg\b/);
      assert.ok(kit.messageManual.includes(client.review_url));
      assert.ok(kit.messagePostConsult.includes(client.review_url));
      assert.equal(kit.workflowPayload.workflow_id, "03-review-booster");

      // URL /maps/place/ real > 271 bytes NO debe lanzar RangeError en buildClientReviewKit
      const longMapsUrl =
        "https://www.google.com/maps/place/Centro+Odontologico+Integral+Belgrano/@-34.5627,-58.4584,17z/" +
        "data=!4m15!1m8!3m7!1s0x95bcb5d2d2d2d2d3:0xabcdef1234567890!2sAv.+Cabildo+2150+Belgrano+CABA!" +
        "8m2!3d-34.5627!4d-58.4584!16s%2Fg%2F11c5_verylongencodedplacepayload_0123456789abcdefghijklmnopqrstuvwxyz";
      assert.ok(Buffer.byteLength(longMapsUrl, "utf8") > 271);
      const longClient = ac.buildActiveClientFromLead({
        id: 88,
        slug: "88-centro-largo",
        name: "Centro Odontológico Belgrano",
        niche: "odontologo",
        city: "Belgrano, CABA",
        metadata: { maps_url: longMapsUrl },
      });
      const longKit = ac.buildClientReviewKit(longClient);
      assert.equal(longKit.reviewUrl, longMapsUrl);
      assert.match(longKit.qrSvg, /^<svg\b/);
      assert.ok(longKit.qrTargetUrl.startsWith("https://www.google.com/maps/search/?api=1&query="));

      // Re-sincronizar un prestador ya existente NO debe sobrescribir checklist ni fechas SLA
      const existingStoredRow = {
        id: "uuid-existing-1",
        lead_id: 24,
        slug: "24-centro-odonto-palermo",
        provider_name: "Centro Odonto Palermo",
        niche: "odontologo",
        tier: "starter_tier1",
        primary_domain: "miestudio.com.ar",
        maps_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        review_url: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
        delivery_status: "entregado_en_tiempo",
        checklist: {
          material_received: true,
          copy_approved: true,
          production_aeo_built: true,
          domain_ssl_verified: true,
          review_booster_ready: true,
          delivery_confirmed: true,
        },
        aeo_verified: true,
        promoted_at: "2026-11-01T10:00:00.000Z",
        delivery_deadline_at: "2026-11-04T10:00:00.000Z",
        delivered_at: "2026-11-02T14:00:00.000Z",
        trial_ends_at: "2026-12-01T10:00:00.000Z",
        hosting_renews_at: "2027-11-01T10:00:00.000Z",
        metadata: { city: "Palermo" },
      };
      let capturedUpdatePatch = null;
      let insertCalled = false;
      const existingRowSupabase = {
        from() {
          const b = {
            select() { return b; },
            eq() { return b; },
            update(patch) {
              capturedUpdatePatch = patch;
              return {
                eq() {
                  return {
                    select() {
                      return {
                        single: async () => ({
                          data: { ...existingStoredRow, ...patch },
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
            insert() {
              insertCalled = true;
              return {
                select() {
                  return { single: async () => ({ data: null, error: null }) };
                },
              };
            },
            then(res, rej) {
              return Promise.resolve({ data: [existingStoredRow], error: null }).then(res, rej);
            },
          };
          return b;
        },
      };
      const resyncResult = await ac.promoteLeadToActiveClient(
        {
          id: 24,
          slug: "24-centro-odonto-palermo",
          name: "Centro Odonto Palermo Actualizado",
          niche: "odontologo",
        },
        { supabaseClient: existingRowSupabase }
      );
      assert.equal(resyncResult.ok, true);
      assert.equal(resyncResult.alreadyExisted, true);
      assert.equal(insertCalled, false, "No debe insertar duplicado cuando ya existe el prestador");
      assert.equal(capturedUpdatePatch.checklist, undefined, "No debe pisar checklist existente");
      assert.equal(capturedUpdatePatch.delivery_deadline_at, undefined, "No debe pisar SLA 72h existente");
      assert.equal(resyncResult.data.primary_domain, "miestudio.com.ar");
      assert.equal(resyncResult.data.checklist.delivery_confirmed, true);
      assert.equal(resyncResult.data.delivery_deadline_at, "2026-11-04T10:00:00.000Z");

      // Primera promoción sobre tabla vacía sí inserta el nuevo registro completo
      let insertedPayload = null;
      const freshInsertSupabase = {
        from() {
          const b = {
            select() { return b; },
            eq() { return b; },
            insert(rows) {
              insertedPayload = rows[0];
              return {
                select() {
                  return {
                    single: async () => ({
                      data: { id: "uuid-new-1", ...rows[0] },
                      error: null,
                    }),
                  };
                },
              };
            },
            then(res, rej) {
              return Promise.resolve({ data: [], error: null }).then(res, rej);
            },
          };
          return b;
        },
      };
      const firstPromoResult = await ac.promoteLeadToActiveClient(
        {
          id: 91,
          slug: "91-dra-nueva",
          name: "Dra. Nueva",
          niche: "dermatologia",
        },
        { supabaseClient: freshInsertSupabase }
      );
      assert.equal(firstPromoResult.ok, true);
      assert.equal(firstPromoResult.alreadyExisted, false);
      assert.equal(insertedPayload.lead_id, 91);
      assert.equal(insertedPayload.delivery_status, "en_curso");
      assert.equal(insertedPayload.checklist.delivery_confirmed, false);

      // Verdad Única { data, isOffline } sin datos fantasma online
      const emptyOnlineSupabase = {
        from() {
          const b = {
            select() { return b; },
            order() { return b; },
            then(res, rej) {
              return Promise.resolve({ data: [], error: null }).then(res, rej);
            },
          };
          return b;
        },
      };

      const liveEmptyClients = await ac.fetchActiveClients(emptyOnlineSupabase);
      assert.equal(liveEmptyClients.isOffline, false);
      assert.equal(liveEmptyClients.data.length, 0);

      const liveEmptyEvents = await ac.fetchAutonomousEvents(emptyOnlineSupabase);
      assert.equal(liveEmptyEvents.isOffline, false);
      assert.equal(liveEmptyEvents.data.length, 0);

      const offlineMockClients = await ac.fetchActiveClients(null, { forceMock: true });
      assert.equal(offlineMockClients.isOffline, true);
      assert.ok(offlineMockClients.data.length > 0);
    }
  );

  const releaseWebDistLock = acquireWebDistLock();
  t.after(releaseWebDistLock);

  await t.test(
    "7. Integración Cockpit (alertas <24h/<=5d), CRM 1-clic, 8 tablas en settings/realtime y build web/ (0 JS público)",
    async () => {
      const { aggregateCockpitData, fetchDailyCockpitSummary } = await import(
        "../web/src/lib/cockpit.ts"
      );
      const { ADMIN_DATABASE_TABLES } = await import("../web/src/lib/settings.ts");
      const { DEFAULT_WATCHED_TABLES } = await import("../web/src/lib/realtime.ts");
      const { auditHtmlDocument } = await import("../scripts/audit-site.mjs");

      assert.equal(ADMIN_DATABASE_TABLES.length, 8);
      assert.equal(DEFAULT_WATCHED_TABLES.length, 8);
      assert.ok(ADMIN_DATABASE_TABLES.some((x) => x.name === "active_clients" && x.moduleRoute === "/admin/clients"));
      assert.ok(ADMIN_DATABASE_TABLES.some((x) => x.name === "autonomous_events"));
      assert.ok(DEFAULT_WATCHED_TABLES.includes("active_clients"));
      assert.ok(DEFAULT_WATCHED_TABLES.includes("autonomous_events"));

      const now = new Date("2026-11-30T15:00:00.000Z");
      const cockpitWithAlerts = aggregateCockpitData({
        leads: [],
        habits: [],
        habitLogs: [],
        scheduleBlocks: [],
        videos: [],
        transactions: [],
        activeClients: [
          {
            id: "ac-1",
            lead_id: 24,
            slug: "24-odonto-palermo",
            provider_name: "Centro Odonto Palermo",
            niche: "odontologo",
            tier: "starter_tier1",
            primary_domain: null,
            maps_place_id: null,
            review_url: null,
            delivery_status: "en_curso",
            checklist: {
              material_received: true,
              copy_approved: false,
              production_aeo_built: false,
              domain_ssl_verified: false,
              review_booster_ready: false,
              delivery_confirmed: false,
            },
            aeo_verified: false,
            promoted_at: "2026-11-26T10:00:00.000Z",
            delivery_deadline_at: "2026-12-01T10:00:00.000Z", // <24h
            delivered_at: null,
            trial_ends_at: "2026-12-03T15:00:00.000Z", // <=5d
            hosting_renews_at: "2027-11-26T10:00:00.000Z",
          },
        ],
        autonomousEvents: [
          {
            id: "ev-1",
            client_slug: "24-odonto-palermo",
            event_type: "appointment_confirmed",
            period_date: "2026-11-30",
            count_delta: 4,
            engine_version: "gate1-v1",
            summary: {},
            received_at: "2026-11-30T14:00:00.000Z",
          },
        ],
        today: now,
      });

      assert.equal(cockpitWithAlerts.activeClientsCount, 1);
      assert.equal(cockpitWithAlerts.deliveryAlerts24hCount, 1);
      assert.equal(cockpitWithAlerts.trialEnding5dCount, 1);
      assert.equal(cockpitWithAlerts.operationalAlerts.length, 2);
      assert.equal(cockpitWithAlerts.gate1Summary.totalEvents, 4);
      assert.equal(cockpitWithAlerts.gate1Summary.byType.appointment_confirmed, 4);

      const emptyOnlineSupabase = {
        from() {
          const b = {
            select() { return b; },
            eq() { return b; },
            gte() { return b; },
            lte() { return b; },
            order() { return b; },
            then(res, rej) {
              return Promise.resolve({ data: [], error: null }).then(res, rej);
            },
          };
          return b;
        },
      };
      const liveEmptySummary = await fetchDailyCockpitSummary(now, emptyOnlineSupabase);
      assert.equal(liveEmptySummary.isOffline, false);
      assert.equal(liveEmptySummary.activeClientsCount, 0);
      assert.equal(liveEmptySummary.operationalAlerts.length, 0);
      assert.equal(liveEmptySummary.gate1Summary.totalEvents, 0);

      // Verificación estructural UI y rutas admin
      const allAstro = readFileSync(join(REPO_ROOT, "web/src/pages/admin/[...all].astro"), "utf8");
      const layoutSrc = readFileSync(join(REPO_ROOT, "web/src/components/admin/AdminLayout.tsx"), "utf8");
      const appSrc = readFileSync(join(REPO_ROOT, "web/src/components/admin/AdminApp.tsx"), "utf8");
      const crmSrc = readFileSync(join(REPO_ROOT, "web/src/components/admin/views/CrmView.tsx"), "utf8");
      const clientsViewPath = join(REPO_ROOT, "web/src/components/admin/views/ClientsView.tsx");
      const settingsSrc = readFileSync(join(REPO_ROOT, "web/src/components/admin/views/SettingsView.tsx"), "utf8");

      assert.ok(allAstro.includes('{ params: { all: "clients" } }'));
      assert.ok(layoutSrc.includes("/admin/clients"));
      assert.ok(layoutSrc.includes("Prestadores & Operaciones"));
      assert.ok(appSrc.includes("ClientsView"));
      assert.ok(appSrc.includes("/admin/clients"));
      assert.ok(crmSrc.includes("Convertir a Prestador Activo"));
      assert.ok(existsSync(clientsViewPath), "ClientsView.tsx debe existir");
      const clientsViewSrc = readFileSync(clientsViewPath, "utf8");
      assert.ok(!clientsViewSrc.includes("dangerouslySetInnerHTML"), "ClientsView no debe usar dangerouslySetInnerHTML");
      assert.ok(settingsSrc.includes("active_clients"));
      assert.ok(settingsSrc.includes("autonomous_events"));
      assert.ok(settingsSrc.includes("8 tablas"));

      // Build web/ bajo lock + verificación dist/admin/clients/index.html + 0 JS público
      const buildRes = spawnSync("npm", ["--prefix", "web", "run", "build"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      assert.equal(
        buildRes.status,
        0,
        `El build de web/ falló:\n${buildRes.stderr}\n${buildRes.stdout}`
      );

      const clientsDistHtml = join(REPO_ROOT, "web/dist/admin/clients/index.html");
      assert.ok(existsSync(clientsDistHtml), "web/dist/admin/clients/index.html debe existir tras build");
      assert.doesNotMatch(
        readFileSync(clientsDistHtml, "utf8"),
        /data-nexobow-consent-loader/i
      );

      const publicIndexHtml = readFileSync(join(REPO_ROOT, "web/dist/index.html"), "utf8");
      const audit = auditHtmlDocument(publicIndexHtml, {
        mode: "web",
        distDir: join(REPO_ROOT, "web/dist"),
        requireWhatsappCta: false,
      });
      assert.equal(audit.ok, true, `web/dist/index.html falló audit: ${audit.errors.join("; ")}`);
      assert.equal(audit.executableScriptCount, 0);
      assert.equal(audit.jsBytes, 0);
    }
  );
});
