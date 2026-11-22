import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as genFiche from "../scripts/generate-client-fiche.mjs";
import * as buildSite from "../scripts/build-client-site.mjs";
import esbuild from "../web/node_modules/esbuild/lib/main.js";

const ROOT = process.cwd();

async function loadCrmPureExports() {
  const crmPath = path.join(ROOT, "web/src/components/admin/views/CrmView.tsx");
  const raw = fs.readFileSync(crmPath, "utf8");
  const pureTs = raw
    .split("export const CrmView")[0]
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, "");
  const { code } = esbuild.transformSync(pureTs, { loader: "ts", format: "esm" });
  return await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("Ticket #47 — Seam 1: resolveBookingConfig applies smart defaults by rubro without forcing 'gratuita' or '$0 ARS'", () => {
  assert.equal(typeof genFiche.resolveBookingConfig, "function", "generate-client-fiche should export resolveBookingConfig");
  assert.equal(typeof buildSite.resolveBookingConfig, "function", "build-client-site should export resolveBookingConfig");

  // Odontología / Clínica / Estética / Dermatología -> presencial, consultar, whatsapp_secretaria
  const odontoConfig = genFiche.resolveBookingConfig({ rubro: "odontologo", ubicacion: "Palermo, CABA" });
  assert.equal(odontoConfig.modalidad, "presencial");
  assert.equal(odontoConfig.tipo_consulta, "consultar");
  assert.equal(odontoConfig.canal_agenda, "whatsapp_secretaria");
  assert.ok(!odontoConfig.cta_primary.toLowerCase().includes("gratuita"), "Odonto CTA must not force 'gratuita'");
  assert.ok(!odontoConfig.whatsapp_prefill.toLowerCase().includes("gratuita"), "Odonto WA prefill must not force 'gratuita'");
  assert.ok(!odontoConfig.precio_texto.includes("$0 ARS"), "Odonto precio_texto must not force '$0 ARS'");

  // Abogado -> mixto, arancelada, whatsapp_secretaria
  const abogadoConfig = genFiche.resolveBookingConfig({ rubro: "abogado", ubicacion: "Microcentro, CABA" });
  assert.equal(abogadoConfig.modalidad, "mixto");
  assert.equal(abogadoConfig.tipo_consulta, "arancelada");
  assert.equal(abogadoConfig.canal_agenda, "whatsapp_secretaria");
  assert.ok(!abogadoConfig.precio_texto.includes("$0 ARS"), "Abogado precio_texto must not be '$0 ARS'");

  // Nutricionista / Psicologo -> mixto, consultar, whatsapp_secretaria
  const nutriConfig = genFiche.resolveBookingConfig({ rubro: "nutricionista", ubicacion: "Belgrano, CABA" });
  assert.equal(nutriConfig.modalidad, "mixto");
  assert.equal(nutriConfig.tipo_consulta, "consultar");
  assert.equal(nutriConfig.canal_agenda, "whatsapp_secretaria");

  // Explicit overrides
  const customConfig = buildSite.resolveBookingConfig({
    rubro: "dermatologia",
    modalidad: "online",
    tipo_consulta: "arancelada",
    canal_agenda: "calendly",
    arancel_consulta_ars: 45000,
    ubicacion: "Recoleta, CABA",
  });
  assert.equal(customConfig.modalidad, "online");
  assert.equal(customConfig.tipo_consulta, "arancelada");
  assert.equal(customConfig.canal_agenda, "calendly");
  assert.equal(customConfig.arancel_consulta_ars, 45000);
  assert.ok(customConfig.precio_texto.includes("45.000"), "Should format custom ARS fee");
});

test("Ticket #47 — Seam 1b: buildFicheMarkdown includes modalidad, tipo_consulta, canal_agenda, arancel_consulta_ars in frontmatter", () => {
  const md = genFiche.buildFicheMarkdown({
    id: 99,
    nombre: "Dra. Valeria",
    apellido: "Gómez",
    rubro: "odontologo",
    ciudad: "Palermo, CABA",
    whatsapp: "5491155556666",
  });

  assert.match(md, /modalidad:\s*"presencial"/);
  assert.match(md, /tipo_consulta:\s*"consultar"/);
  assert.match(md, /canal_agenda:\s*"whatsapp_secretaria"/);
  assert.match(md, /arancel_consulta_ars:\s*0/);
  assert.ok(!md.toLowerCase().includes("diagnóstico inicial sin cargo"), "Fiche must not force 'sin cargo' for odonto");
});

test("Ticket #47 — Seam 2: Templates eliminate hardcoded '$0 ARS' (when not gratuita) and 'Presencial en Recoleta o Virtual HD'", () => {
  const nutriHero = fs.readFileSync(path.join(ROOT, "templates/nutricionista/src/components/Hero.astro"), "utf8");
  const nutriFooter = fs.readFileSync(path.join(ROOT, "templates/nutricionista/src/components/Footer.astro"), "utf8");
  const clinicaBooking = fs.readFileSync(path.join(ROOT, "templates/clinica/src/components/BookingScheduler.astro"), "utf8");
  const dermaBooking = fs.readFileSync(path.join(ROOT, "templates/dermatologia/src/components/MedicalBooking.astro"), "utf8");
  const abogadoCta = fs.readFileSync(path.join(ROOT, "templates/abogado/src/components/ConsultationCta.astro"), "utf8");

  assert.ok(!nutriHero.includes("Agendar consultoría gratuita"), "Nutricionista Hero must not hardcode 'Agendar consultoría gratuita'");
  assert.ok(!nutriFooter.includes("Agendar consultoría gratuita"), "Nutricionista Footer must not hardcode 'Agendar consultoría gratuita'");
  assert.ok(!dermaBooking.includes("Presencial en Recoleta o Virtual HD"), "Dermatologia MedicalBooking must not hardcode 'Presencial en Recoleta o Virtual HD'");
  assert.ok(clinicaBooking.includes('tipo_consulta === "gratuita"'), "Clinica BookingScheduler should only show $0 ARS when tipo_consulta === 'gratuita'");
  assert.ok(abogadoCta.includes('tipo_consulta === "gratuita"'), "Abogado ConsultationCta should only show $0 ARS when tipo_consulta === 'gratuita'");
});

test("Ticket #47 — Seam 3: CrmView.tsx implements tactical WhatsApp scripts, funnel metadata selectors, Inbound Web filter, and + Nuevo Prospecto", async () => {
  const crmPath = path.join(ROOT, "web/src/components/admin/views/CrmView.tsx");
  const crmSource = fs.readFileSync(crmPath, "utf8");

  // Verify UI badges & features in CrmView
  assert.ok(crmSource.includes("Supabase Live (0 registros)"), "CrmView should show 'Supabase Live (0 registros)' badge when online and empty");
  assert.ok(crmSource.includes("Modo Offline (Demo)"), "CrmView should show 'Modo Offline (Demo)' badge when offline");
  assert.ok(crmSource.includes("Inbound Web"), "CrmView should render 'Inbound Web' badge and filter");
  assert.ok(crmSource.includes("inbound_web"), "CrmView should check metadata.source === 'inbound_web'");
  assert.ok(crmSource.includes("+ Nuevo Prospecto") || crmSource.includes("Nuevo Prospecto"), "CrmView should include '+ Nuevo Prospecto' button/modal");

  // Verify funnel selectors in LeadDrawer
  assert.ok(crmSource.includes("modalidad"), "CrmView LeadDrawer should manage modalidad");
  assert.ok(crmSource.includes("tipo_consulta"), "CrmView LeadDrawer should manage tipo_consulta");
  assert.ok(crmSource.includes("canal_agenda"), "CrmView LeadDrawer should manage canal_agenda");

  // Verify tactical WhatsApp scripts in CrmView
  assert.ok(crmSource.includes("objecion_presencial"), "CrmView should support 'objecion_presencial' script");
  assert.ok(crmSource.includes("objecion_arancelada"), "CrmView should support 'objecion_arancelada' script");
  assert.ok(crmSource.includes("tu estudio jurídico"), "CrmView should adapt greeting to 'tu estudio jurídico' for lawyers");
  assert.ok(crmSource.includes("tu consultorio"), "CrmView should use 'tu consultorio' for health professionals");
});

test("Ticket #53 — Seam 1: resolveLeadMetadata exposes Gate 0 fields with safe backward-compatible fallbacks", async () => {
  const crmMod = await loadCrmPureExports();
  assert.equal(typeof crmMod.resolveLeadMetadata, "function");
  assert.equal(typeof genFiche.resolveLeadMetadata, "function");

  const legacyLead = {
    id: 22,
    slug: "22-daniela-ramunno-nutri",
    name: "Lic. Daniela Ramunno",
    niche: "nutricionista",
    city: "Palermo",
  };

  for (const resolver of [genFiche.resolveLeadMetadata, crmMod.resolveLeadMetadata]) {
    const resolved = resolver(legacyLead);
    assert.equal(resolved.modalidad, "mixto");
    assert.equal(resolved.tipo_consulta, "consultar");
    assert.equal(resolved.canal_agenda, "whatsapp_secretaria");
    assert.equal(resolved.email, null);
    assert.equal(resolved.website_url, null);
    assert.equal(resolved.website_bucket, "cubeta_a");
    assert.equal(resolved.website_audit.has_https, false);
    assert.equal(resolved.website_audit.has_mobile_viewport, true);
    assert.deepEqual(resolved.website_audit.signals, []);
    assert.equal(resolved.rating, null);
    assert.equal(resolved.reviews_count, 0);
    assert.deepEqual(resolved.reviews_summary, []);
    assert.equal(resolved.qualification.score, 0);
    assert.equal(resolved.qualification.grade, "C");
    assert.equal(resolved.qualification.recommended_tier, "tier_1_starter");
    assert.ok(Array.isArray(resolved.qualification.reasons));
    assert.equal(resolved.email_outreach.status, "skipped_no_email");
    assert.equal(resolved.email_outreach.provider, "zoho_mail");
    assert.equal(resolved.email_outreach.sent_at, null);
    assert.equal(resolved.email_outreach.message_id, null);
    assert.equal(resolved.email_outreach.subject, null);
    assert.equal(resolved.email_outreach.error, null);
    assert.equal(resolved.telemetry.views_count, 0);
    assert.equal(resolved.telemetry.last_event, null);
    assert.equal(resolved.telemetry.last_viewed_at, null);
    assert.equal(resolved.telemetry.selected_theme, null);
    assert.equal(resolved.telemetry.cta_clicks, 0);
    assert.equal(resolved.telemetry.is_hot_lead, false);
    assert.equal(typeof resolved.audio_script_35s, "string");
    assert.ok(resolved.audio_script_35s.length > 20, "audio_script_35s should have safe default script");
  }

  const enrichedLead = {
    id: 24,
    slug: "24-centro-odonto-palermo",
    name: "Centro Odonto Palermo",
    niche: "odontologo",
    city: "Palermo",
    phone: "+5491160001111",
    demo_url: "https://preview.nexobow.site/24-centro-odonto-palermo/",
    metadata: {
      email: "turnos@centropalermo.com.ar",
      maps_url: "https://www.google.com/maps/place/Centro+Odonto+Palermo",
      website_url: "http://centropalermo.com.ar",
      website_bucket: "cubeta_b",
      website_audit: {
        has_https: false,
        has_mobile_viewport: false,
        signals: ["no_https", "missing_mobile_viewport"],
      },
      rating: 4.9,
      reviews_count: 48,
      reviews_summary: [
        { author: "Carla Gómez", rating: 5, text: "Excelente atención y puntualidad." },
      ],
      qualification: {
        score: 100,
        grade: "A",
        recommended_tier: "tier_2_autonomous",
        reasons: ["+35 WA", "+20 Maps", "+20 High-Ticket", "+15 Cubeta B", "+10 Email"],
      },
      email_outreach: {
        status: "sent",
        provider: "zoho_mail",
        sent_at: "2026-11-17T10:00:00Z",
        message_id: "<m24@nexobow.site>",
        subject: "Prototipo privado para Centro Odonto Palermo",
        error: null,
      },
      telemetry: {
        views_count: 3,
        last_event: "theme_switch",
        last_viewed_at: "2026-11-17T11:30:00Z",
        selected_theme: "Obsidian Gold",
        cta_clicks: 1,
        is_hot_lead: true,
      },
      audio_script_35s: "[GUION 35s] Hola Centro Odonto Palermo, muestra de orden de consultas y turnos confirmados lista.",
    },
  };

  for (const resolver of [genFiche.resolveLeadMetadata, crmMod.resolveLeadMetadata]) {
    const resolved = resolver(enrichedLead);
    assert.equal(resolved.modalidad, "presencial");
    assert.equal(resolved.email, "turnos@centropalermo.com.ar");
    assert.equal(resolved.website_url, "http://centropalermo.com.ar");
    assert.equal(resolved.website_bucket, "cubeta_b");
    assert.equal(resolved.website_audit.has_https, false);
    assert.equal(resolved.website_audit.has_mobile_viewport, false);
    assert.deepEqual(resolved.website_audit.signals, ["no_https", "missing_mobile_viewport"]);
    assert.equal(resolved.rating, 4.9);
    assert.equal(resolved.reviews_count, 48);
    assert.equal(resolved.reviews_summary.length, 1);
    assert.equal(resolved.reviews_summary[0].author, "Carla Gómez");
    assert.equal(resolved.qualification.score, 100);
    assert.equal(resolved.qualification.grade, "A");
    assert.equal(resolved.qualification.recommended_tier, "tier_2_autonomous");
    assert.equal(resolved.email_outreach.status, "sent");
    assert.equal(resolved.email_outreach.message_id, "<m24@nexobow.site>");
    assert.equal(resolved.telemetry.views_count, 3);
    assert.equal(resolved.telemetry.selected_theme, "Obsidian Gold");
    assert.equal(resolved.telemetry.cta_clicks, 1);
    assert.equal(resolved.telemetry.is_hot_lead, true);
    assert.equal(resolved.audio_script_35s, "[GUION 35s] Hola Centro Odonto Palermo, muestra de orden de consultas y turnos confirmados lista.");
  }
});

test("Ticket #53 — Seam 2: buildVoseoWhatsAppMessage & buildVoseoWhatsAppUrl generate all 5 tactical modes in Argentine voseo", async () => {
  const crmMod = await loadCrmPureExports();
  assert.equal(typeof crmMod.buildVoseoWhatsAppMessage, "function", "CrmView must export buildVoseoWhatsAppMessage");
  assert.equal(typeof crmMod.buildVoseoWhatsAppUrl, "function", "CrmView must export buildVoseoWhatsAppUrl");

  const hotLeadWithZoho = {
    id: 24,
    slug: "24-centro-odonto-palermo",
    name: "Centro Odonto Palermo",
    niche: "odontologo",
    city: "Palermo",
    phone: "+5491160001111",
    demo_url: "https://preview.nexobow.site/24-centro-odonto-palermo/",
    funnel_status: "2. Contactado",
    response_status: "Sin Contactar",
    meeting_booked: false,
    potential_value: "$549.999 ARS",
    business_status: "En Proceso",
    location: "Palermo, CABA",
    metadata: {
      email: "turnos@centropalermo.com.ar",
      website_bucket: "cubeta_b",
      rating: 4.9,
      reviews_count: 48,
      email_outreach: {
        status: "sent",
        provider: "zoho_mail",
      },
      telemetry: {
        views_count: 4,
        selected_theme: "Obsidian Gold",
        is_hot_lead: true,
        last_event: "theme_switch",
      },
    },
  };

  // 1. Mode initial (con Zoho enviado)
  const initialMsg = crmMod.buildVoseoWhatsAppMessage(hotLeadWithZoho, "initial");
  assert.ok(initialMsg.includes("Palermo"), "Initial mode must mention zone");
  assert.ok(initialMsg.includes("4.9"), "Initial mode must mention Maps rating");
  assert.ok(initialMsg.includes("https://preview.nexobow.site/24-centro-odonto-palermo/"), "Initial mode must include preview 10x link");
  assert.match(initialMsg, /orden de consultas y turnos confirmados/i, "Initial mode must pitch orden de consultas y turnos confirmados");
  assert.match(initialMsg, /filtrar interesados|turnos directo por WhatsApp/i, "Initial mode must explain filtering & WhatsApp booking");
  assert.match(initialMsg, /Zoho|correo|mail/i, "Initial mode must subtly reference Zoho email when sent");
  assert.ok(initialMsg.includes("tu consultorio"));

  const initialUrl = crmMod.buildVoseoWhatsAppUrl(hotLeadWithZoho, "initial");
  assert.equal(initialUrl, `https://wa.me/5491160001111?text=${encodeURIComponent(initialMsg)}`);

  // 1b. Mode initial sin Zoho enviado + abogado
  const lawyerNoEmail = {
    ...hotLeadWithZoho,
    id: 35,
    slug: "35-estudio-benitez-abogado",
    name: "Dr. Gonzalo Benítez",
    niche: "abogado",
    city: "Retiro",
    demo_url: "https://preview.nexobow.site/35-estudio-benitez-abogado/",
    metadata: {
      rating: 4.7,
      reviews_count: 15,
      email_outreach: { status: "skipped_no_email", provider: "zoho_mail" },
    },
  };
  const lawyerInitialMsg = crmMod.buildVoseoWhatsAppMessage(lawyerNoEmail, "initial");
  assert.ok(lawyerInitialMsg.includes("tu estudio jurídico"));
  assert.ok(!/Zoho/i.test(lawyerInitialMsg), "Should not mention Zoho when email was not sent");

  // 2. Mode audio_script (35s)
  const audioMsg = crmMod.buildVoseoWhatsAppMessage(hotLeadWithZoho, "audio_script");
  assert.match(audioMsg, /orden de consultas y turnos confirmados/i);
  assert.match(audioMsg, /filtra antes de agendar|evitar huecos/i);
  assert.ok(audioMsg.includes("https://preview.nexobow.site/24-centro-odonto-palermo/"));
  assert.match(audioMsg, /chusme|armé|contame|miralo/i);

  // 3. Mode followup_hot
  const hotMsg = crmMod.buildVoseoWhatsAppMessage(hotLeadWithZoho, "followup_hot");
  assert.match(hotMsg, /chusmeando|abriste|viste/i, "followup_hot must mention preview view");
  assert.ok(hotMsg.includes("Obsidian Gold"), "followup_hot must reference telemetry.selected_theme");
  assert.match(hotMsg, /orden de consultas y turnos confirmados/i);

  // 4. Mode objecion_presencial
  const presMsg = crmMod.buildVoseoWhatsAppMessage(hotLeadWithZoho, "objecion_presencial");
  assert.ok(presMsg.includes("Palermo"));
  assert.match(presMsg, /presencial/i);
  assert.match(presMsg, /WhatsApp/i);

  // 5. Mode objecion_arancelada
  const aranMsg = crmMod.buildVoseoWhatsAppMessage(hotLeadWithZoho, "objecion_arancelada");
  assert.match(aranMsg, /arancelada/i);
  assert.match(aranMsg, /filtra/i);
  assert.ok(!/sin cargo|gratuita/i.test(aranMsg), "objecion_arancelada must not promise free consults");
});

test("Ticket #53 — Seam 3: CrmView.tsx exposes Gate 0 badges, filters, 10-links modal and 1-click WA buttons", () => {
  const crmPath = path.join(ROOT, "web/src/components/admin/views/CrmView.tsx");
  const crmSource = fs.readFileSync(crmPath, "utf8");

  assert.ok(crmSource.includes("✉️ Zoho Enviado"), "CrmView should render Zoho Enviado badge");
  assert.ok(crmSource.includes("⏳ Pendiente"), "CrmView should render Zoho Pendiente badge");
  assert.ok(crmSource.includes("Sin Email"), "CrmView should render Sin Email badge");
  assert.ok(crmSource.includes("Cubeta A"), "CrmView should expose Cubeta A label");
  assert.ok(crmSource.includes("Cubeta B"), "CrmView should expose Cubeta B label");
  assert.ok(crmSource.includes("🔥 Hot-Lead"), "CrmView should expose Hot-Lead badge");
  assert.ok(crmSource.includes("reviews_summary"), "CrmView should inspect reviews_summary");
  assert.ok(crmSource.includes("audio_script_35s"), "CrmView should expose 35s audio script");
  assert.ok(crmSource.includes("Con Email"), "CrmView should provide Con Email quick filter");
  assert.ok(crmSource.includes("Hot-Leads (Vistos)"), "CrmView should provide Hot-Leads (Vistos) quick filter");
  assert.ok(crmSource.includes("Cubeta A / B"), "CrmView should provide Cubeta A / B filter");
  assert.ok(crmSource.includes("⚡ Lote 10 Links Maps"), "CrmView should provide 10-links batch modal");
  assert.ok(crmSource.includes("📋 Copiar Mensaje WA"), "CrmView should provide 1-click Copy WA message button");
  assert.ok(crmSource.includes("💬 Abrir WhatsApp"), "CrmView should provide 1-click Open WhatsApp button");
});
