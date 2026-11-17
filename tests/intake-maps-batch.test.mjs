import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as intake from "../scripts/intake-maps-batch.mjs";
import { createInMemoryLeadStore } from "../scripts/sheets-sync.mjs";

const ROOT = process.cwd();

test("Ticket #51 — Seam 1: parseGoogleMapsUrlInput enforces 1..10 hard limit and deduplicates equivalent URLs", () => {
  assert.equal(typeof intake.parseGoogleMapsUrlInput, "function");

  assert.throws(() => intake.parseGoogleMapsUrlInput(""), /1.*10|vac[ií]o|links/i);
  assert.throws(() => intake.parseGoogleMapsUrlInput("   \n  \n "), /1.*10|vac[ií]o|links/i);

  const elevenLinks = Array.from({ length: 11 }, (_, i) => `https://maps.app.goo.gl/lead${i + 1}`).join("\n");
  assert.throws(() => intake.parseGoogleMapsUrlInput(elevenLinks), /10/);

  const rawBatch = `
    1. https://maps.app.goo.gl/abc123/?utm_source=share
    - https://maps.app.goo.gl/abc123
    2. https://www.google.com/maps/place/Centro+Odontologico+Palermo/@-34.5881,-58.4192,17z/data=!4m6!3m5!1s0x123:0x456
    * https://goo.gl/maps/xyz789/
    https://www.google.com/maps/place/Centro+Odontologico+Palermo/@-34.5881,-58.4192,17z/data=!4m6!3m5!1s0x123:0x456?g_st=ic
  `;

  const parsed = intake.parseGoogleMapsUrlInput(rawBatch);
  assert.equal(parsed.length, 3, "Equivalent URLs with trailing slashes or tracking params must deduplicate cleanly");
  assert.equal(parsed[0].isShortUrl, true);
  assert.equal(parsed[1].placeName, "Centro Odontologico Palermo");
  assert.deepEqual(parsed[1].coordinates, { latitude: -34.5881, longitude: -58.4192 });
  assert.equal(parsed[2].isShortUrl, true);
});

test("Ticket #51 — Seam 1b: resolveGoogleMapsUrl resolves short URLs via injectable fetch and extracts placeName, query, coordinates and cid", async () => {
  assert.equal(typeof intake.resolveGoogleMapsUrl, "function");

  const visited = [];
  const mockFetch = async (url) => {
    visited.push(url);
    if (url.includes("maps.app.goo.gl/short1")) {
      return {
        ok: true,
        status: 200,
        url: "https://www.google.com/maps/place/Dra.+Lucia+Ferreyra+-+Odontologia/@-34.5955,-58.3921,16z/data=!3m1!1s0x95bcca000:0x998877?cid=110223344",
        headers: new Map(),
      };
    }
    if (url.includes("goo.gl/maps/manual302")) {
      return {
        ok: false,
        status: 302,
        url,
        headers: {
          get: (name) =>
            name.toLowerCase() === "location"
              ? "https://www.google.com/maps/place/Estudio+Juridico+Mendez/@-34.6037,-58.3816,17z/?cid=99887766"
              : null,
        },
      };
    }
    throw new Error(`Unexpected URL in test: ${url}`);
  };

  const resolved1 = await intake.resolveGoogleMapsUrl("https://maps.app.goo.gl/short1", {
    fetchImpl: mockFetch,
  });
  assert.equal(visited.length, 1);
  assert.equal(resolved1.placeName, "Dra. Lucia Ferreyra - Odontologia");
  assert.match(resolved1.query, /Dra\. Lucia Ferreyra/);
  assert.equal(resolved1.cid, "110223344");
  assert.deepEqual(resolved1.coordinates, { latitude: -34.5955, longitude: -58.3921 });
  assert.match(resolved1.resolvedUrl, /\/maps\/place\//);

  const resolved2 = await intake.resolveGoogleMapsUrl("https://goo.gl/maps/manual302", {
    fetchImpl: mockFetch,
  });
  assert.equal(resolved2.placeName, "Estudio Juridico Mendez");
  assert.equal(resolved2.cid, "99887766");
  assert.deepEqual(resolved2.coordinates, { latitude: -34.6037, longitude: -58.3816 });
});

test("Ticket #51 — Seam 2: extractEmailsFromHtml & extractContactFromWebsite capture clean emails with 1-hop /contacto and filter false positives", async () => {
  assert.equal(typeof intake.extractEmailsFromHtml, "function");
  assert.equal(typeof intake.extractContactFromWebsite, "function");

  const noisyHtml = `
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body>
        <img src="hero@2x.png" />
        <img src="banner@3x.webp" />
        <img src="logo.jpg" />
        <img src="icon.svg" />
        <script>window.dsn = "https://abc@sentry.io/123"; window.wix = "dev@sentry.wixpress.com";</script>
        <p>Ejemplo placeholder: test@example.com o noreply@wixpress.com</p>
        <a href="mailto:Turnos@ClinicaPalermo.com.ar?subject=Consulta">Escribinos</a>
        <p>También podés escribir a contacto@clinicapalermo.com.ar o turnos@clinicapalermo.com.ar</p>
      </body>
    </html>
  `;

  const emails = intake.extractEmailsFromHtml(noisyHtml);
  assert.deepEqual(emails, ["turnos@clinicapalermo.com.ar", "contacto@clinicapalermo.com.ar"]);

  // Test 1-hop to /contacto when home HTML has no email
  const requestedUrls = [];
  const mockSiteFetch = async (url) => {
    requestedUrls.push(url);
    if (url === "http://odontocentro.com.ar" || url === "http://odontocentro.com.ar/") {
      return {
        ok: true,
        status: 200,
        url,
        text: async () => `
          <html>
            <head><meta name="generator" content="WordPress 6.1" /></head>
            <body>
              <h1>OdontoCentro</h1>
              <a href="/contacto">Contacto</a>
              <a href="https://instagram.com/odontocentro.ar">IG</a>
              <a href="https://facebook.com/odontocentro">FB</a>
            </body>
          </html>
        `,
      };
    }
    if (url === "http://odontocentro.com.ar/contacto") {
      return {
        ok: true,
        status: 200,
        url,
        text: async () => `
          <html>
            <body>
              <a href="mailto:hola@odontocentro.com.ar">Mail</a>
              <a href="/equipo">Ver equipo</a>
            </body>
          </html>
        `,
      };
    }
    throw new Error(`Should not hop beyond /contacto: ${url}`);
  };

  const extracted = await intake.extractContactFromWebsite("http://odontocentro.com.ar", {
    fetchImpl: mockSiteFetch,
    timeoutMs: 5000,
  });

  assert.equal(requestedUrls.length, 2, "Should perform at most 1 internal hop to /contacto");
  assert.deepEqual(extracted.emails, ["hola@odontocentro.com.ar"]);
  assert.equal(extracted.primaryEmail, "hola@odontocentro.com.ar");
  assert.equal(extracted.socials.instagram, "https://instagram.com/odontocentro.ar");
  assert.equal(extracted.socials.facebook, "https://facebook.com/odontocentro");
  assert.equal(extracted.audit.has_https, false);
  assert.equal(extracted.audit.has_mobile_viewport, true === false);
  assert.ok(extracted.audit.signals.includes("no_https"));
  assert.ok(extracted.audit.signals.includes("missing_mobile_viewport"));
  assert.ok(extracted.audit.signals.includes("heavy_legacy_stack"));

  // Bio URL (linktr.ee) stays cubeta_a while still extracting public email from bio HTML
  const bioExtracted = await intake.extractContactFromWebsite("https://linktr.ee/drapaz", {
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      url,
      text: async () => `<a href="mailto:turnos@drapaz.com.ar">Mail</a><a href="https://wa.me/5491155551111">WA</a>`,
    }),
  });
  assert.equal(bioExtracted.bucket, "cubeta_a");
  assert.equal(bioExtracted.primaryEmail, "turnos@drapaz.com.ar");
  assert.equal(bioExtracted.socials.whatsapp, "https://wa.me/5491155551111");
});

test("Ticket #51 — Seam 2b: classifyWebsiteBucket & qualifyLeadForGate0 calculate exact deterministic buckets, scores and tiers", () => {
  assert.equal(typeof intake.classifyWebsiteBucket, "function");
  assert.equal(typeof intake.qualifyLeadForGate0, "function");

  const bucketNoWeb = intake.classifyWebsiteBucket("");
  assert.equal(bucketNoWeb.bucket, "cubeta_a");

  const bucketIg = intake.classifyWebsiteBucket("https://instagram.com/dra.valeria");
  assert.equal(bucketIg.bucket, "cubeta_a");

  const bucketLinktree = intake.classifyWebsiteBucket("https://linktr.ee/estudiolegal");
  assert.equal(bucketLinktree.bucket, "cubeta_a");

  const bucketLegacySite = intake.classifyWebsiteBucket(
    "http://estudiocontableviejo.com.ar",
    `<html><head><meta name="generator" content="Elementor 3.5"></head><body><h1>Bienvenido</h1></body></html>`
  );
  assert.equal(bucketLegacySite.bucket, "cubeta_b");
  assert.equal(bucketLegacySite.has_https, false);
  assert.equal(bucketLegacySite.has_mobile_viewport, false);
  assert.ok(bucketLegacySite.signals.includes("no_https"));
  assert.ok(bucketLegacySite.signals.includes("missing_mobile_viewport"));
  assert.ok(bucketLegacySite.signals.includes("heavy_legacy_stack"));
  assert.ok(bucketLegacySite.signals.includes("missing_whatsapp_or_booking_cta"));

  // Exact Gate 0 Score test: +35 WA +20 rating/reviews +20 high-ticket +15 cubeta +10 email = 100
  const qualFull = intake.qualifyLeadForGate0({
    rubro: "odontologo",
    telefono: "+5491155556666",
    rating: 4.9,
    reviews_count: 48,
    email: "turnos@clinicapalermo.com.ar",
    website_bucket: "cubeta_b",
    website_audit: bucketLegacySite,
  });

  assert.equal(qualFull.score, 100);
  assert.equal(qualFull.grade, "A");
  assert.equal(qualFull.recommended_tier, "tier_2_autonomous");
  assert.equal(qualFull.modalidad, "presencial");
  assert.equal(qualFull.pain_angle, "Anti-Silla Vacía & Cero-Secretaria");
  assert.ok(Array.isArray(qualFull.reasons) && qualFull.reasons.length >= 4);

  // Cubeta A lead without email and lower review count -> 35 + 20 + 20 + 15 + 0 = 90 -> tier_1_starter
  const qualStarter = intake.qualifyLeadForGate0({
    rubro: "nutricionista",
    telefono: "+5491144443333",
    rating: 4.5,
    reviews_count: 12,
    email: null,
    website_bucket: "cubeta_a",
    website_audit: bucketIg,
  });

  assert.equal(qualStarter.score, 90);
  assert.equal(qualStarter.grade, "A");
  assert.equal(qualStarter.recommended_tier, "tier_1_starter");

  // Low-score lead: no valid mobile WA (+0), low rating (+0), general service (+0), cubeta_a (+15), no email (+0) = 15 (Grade C)
  const qualLow = intake.qualifyLeadForGate0({
    rubro: "servicios",
    telefono: "",
    rating: 3.8,
    reviews_count: 2,
    email: null,
    website_bucket: "cubeta_a",
    website_audit: bucketNoWeb,
  });
  assert.equal(qualLow.score, 15);
  assert.equal(qualLow.grade, "C");
  assert.equal(qualLow.recommended_tier, "tier_1_starter");
});

test("Ticket #51 — Seam 3: runIntakeMapsBatch orchestrates E2E batch in mock/--no-deploy mode, creates fiche, syncs store/Supabase and returns WA + 35s audio script", async () => {
  assert.equal(typeof intake.runIntakeMapsBatch, "function");

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nexobow-intake-51-"));
  fs.mkdirSync(path.join(tmpRoot, "clients"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "assets"), { recursive: true });

  try {
    const store = createInMemoryLeadStore({ initialRows: [] });
    const upsertedToSupabase = [];
    const mockSupabase = {
      from(table) {
        assert.equal(table, "leads");
        return {
          async upsert(records) {
            upsertedToSupabase.push(...records);
            return { data: records, error: null };
          },
          select() {
            return {
              async order() {
                return { data: [], error: null };
              },
            };
          },
        };
      },
    };

    const builtFiches = [];
    const mockBuildSite = async ({ fichePath, slug }) => {
      builtFiches.push({ fichePath, slug });
      return { ok: true, slug };
    };

    const mockFetch = async (url) => {
      if (url.includes("maps.app.goo.gl/odonto1")) {
        return {
          ok: true,
          status: 200,
          url: "https://www.google.com/maps/place/Centro+Odontologico+Norte/@-34.502,-58.489,17z/?cid=101010",
          headers: new Map(),
        };
      }
      if (url.includes("maps.app.goo.gl/estetica2")) {
        return {
          ok: true,
          status: 200,
          url: "https://www.google.com/maps/place/Dra.+Camila+Paz+Estetica/@-34.589,-58.401,17z/?cid=202020",
          headers: new Map(),
        };
      }
      if (url === "http://centronorte.com.ar" || url === "http://centronorte.com.ar/") {
        return {
          ok: true,
          status: 200,
          url,
          text: async () => `
            <html>
              <head><meta name="generator" content="WordPress 5.9"></head>
              <body>
                <a href="/contacto">Contacto</a>
              </body>
            </html>
          `,
        };
      }
      if (url === "http://centronorte.com.ar/contacto") {
        return {
          ok: true,
          status: 200,
          url,
          text: async () => `<html><body><a href="mailto:turnos@centronorte.com.ar">Mail</a></body></html>`,
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const mockPlaceResolver = async (resolvedItem) => {
      if (resolvedItem.cid === "101010") {
        return {
          placeId: "place_101010",
          nombre: "Centro Odontológico Norte",
          rubro: "odontologo",
          direccion: "Av. Maipú 1420, Vicente López",
          telefono: "+5491160001111",
          websiteUri: "http://centronorte.com.ar",
          rating: 4.8,
          userRatingCount: 52,
          reviews: [
            { author: "Carla Gómez", rating: 5, text: "Excelente atención y puntualidad en los turnos." },
          ],
        };
      }
      return {
        placeId: "place_202020",
        nombre: "Dra. Camila Paz Estética",
        rubro: "estetica",
        direccion: "Av. Alvear 1890, Recoleta",
        telefono: "+5491160002222",
        websiteUri: "https://instagram.com/dracamilapaz.estetica",
        rating: 4.9,
        userRatingCount: 19,
        reviews: [
          { author: "Valeria Sosa", rating: 5, text: "Resultados súper naturales, una genia Camila." },
        ],
      };
    };

    const result = await intake.runIntakeMapsBatch({
      links: [
        "https://maps.app.goo.gl/odonto1",
        "https://maps.app.goo.gl/odonto1/", // duplicado intencional
        "https://maps.app.goo.gl/estetica2",
      ],
      noDeploy: true,
      outputRoot: tmpRoot,
      fetchImpl: mockFetch,
      placeResolver: mockPlaceResolver,
      leadStore: store,
      supabaseClient: mockSupabase,
      buildSiteFn: mockBuildSite,
    });

    assert.equal(result.processedCount, 2, "Must deduplicate and process exactly 2 unique links");
    assert.equal(result.deployed, false);
    assert.equal(builtFiches.length, 2);
    assert.equal(upsertedToSupabase.length, 2);

    const lead1 = result.leads[0];
    assert.equal(lead1.websiteBucket, "cubeta_b");
    assert.equal(lead1.email, "turnos@centronorte.com.ar");
    assert.equal(lead1.qualification.score, 100);
    assert.equal(lead1.qualification.recommended_tier, "tier_2_autonomous");
    assert.match(lead1.previewUrl, /^https:\/\/preview\.nexobow\.site\/1-.*\/$/);
    assert.match(lead1.whatsappMessage, /Anti-Silla Vacía|silla vacía/i);
    assert.match(lead1.whatsappUrl, /^https:\/\/wa\.me\/5491160001111\?text=/);
    assert.ok(lead1.audioScript35s && lead1.audioScript35s.length > 40, "Must generate 35s audio script");

    const lead2 = result.leads[1];
    assert.equal(lead2.websiteBucket, "cubeta_a");
    assert.equal(lead2.email, null);
    assert.equal(lead2.qualification.score, 90);
    assert.equal(lead2.qualification.recommended_tier, "tier_1_starter");

    // Verify generated Markdown fiche on disk (Gate 0 metadata & Ley 25.326 compliance)
    const ficheContent = fs.readFileSync(lead1.fichePath, "utf8");
    assert.match(ficheContent, /email:\s*"turnos@centronorte\.com\.ar"/);
    assert.match(ficheContent, /website_url:\s*"http:\/\/centronorte\.com\.ar"/);
    assert.match(ficheContent, /website_bucket:\s*"cubeta_b"/);
    assert.match(ficheContent, /consentimiento_testimonios:\s*false/);
    assert.match(ficheContent, /Carla Gómez \(Google Maps\)/);

    // Verify Supabase payload adheres to LeadMetadata Gate 0 contract
    const sbRow1 = upsertedToSupabase[0];
    assert.equal(sbRow1.metadata.email, "turnos@centronorte.com.ar");
    assert.equal(sbRow1.metadata.website_bucket, "cubeta_b");
    assert.equal(sbRow1.metadata.qualification.score, 100);
    assert.equal(sbRow1.metadata.reviews_summary[0].author, "Carla Gómez");
    assert.ok(sbRow1.metadata.audio_script_35s);

    // Verify Skill documentation exists and is reachable via .claude/skills symlink
    const agentSkillPath = path.join(ROOT, ".agents/skills/intake-maps-batch/SKILL.md");
    const claudeSkillPath = path.join(ROOT, ".claude/skills/intake-maps-batch/SKILL.md");
    assert.equal(fs.existsSync(agentSkillPath), true, ".agents/skills/intake-maps-batch/SKILL.md must exist");
    assert.equal(fs.existsSync(claudeSkillPath), true, ".claude/skills/intake-maps-batch/SKILL.md must resolve via symlink");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
