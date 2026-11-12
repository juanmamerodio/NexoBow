import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as genFiche from "../scripts/generate-client-fiche.mjs";
import * as buildSite from "../scripts/build-client-site.mjs";

const ROOT = process.cwd();

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
