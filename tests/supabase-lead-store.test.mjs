// tests/supabase-lead-store.test.mjs — Suite TDD para CRM, LeadStore Supabase y Migración (Ticket 40)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mapSheetRowToLeadEntity,
  mapLeadEntityToSheetRow,
  extractCityFromLocation,
  normalizeLeadFunnelStatus,
  normalizeLeadResponseStatus,
  createSupabaseLeadStore,
  buildPreviewUrl,
  formatLeadToSheetRow,
} from "../scripts/sheets-sync.mjs";
import {
  extractLeadsFromFiches,
  migrateSheetsToSupabase,
} from "../scripts/migrate-sheets-to-supabase.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_FILE = join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20261102010000_crm_leads_init.sql"
);
const CRM_VIEW_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "CrmView.tsx"
);
const CRM_REEXPORT_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "CrmView.tsx"
);
const ADMIN_APP_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T40: CRM & Prospección: Sustitución de Sheets y Adaptador Supabase", async (t) => {
  // --- SEAM 1: MIGRACIÓN SQL Y POLÍTICAS RLS ---
  await t.test(
    "1. Migración SQL crea tabla leads, enums funnel/response, índices y políticas RLS",
    () => {
      assert.ok(
        existsSync(MIGRATION_FILE),
        `La migración ${MIGRATION_FILE} debe existir`
      );
      const sql = readFileSync(MIGRATION_FILE, "utf8");

      assert.match(
        sql,
        /CREATE TYPE public\.lead_funnel_status AS ENUM/i,
        "Debe crear el tipo enum lead_funnel_status"
      );
      assert.match(
        sql,
        /'1\. Prospecto Identificado'[\s\S]*'6\. Descartado'/i,
        "lead_funnel_status debe contener las 6 etapas del embudo"
      );
      assert.match(
        sql,
        /CREATE TYPE public\.lead_response_status AS ENUM/i,
        "Debe crear el tipo enum lead_response_status"
      );
      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.leads/i,
        "Debe crear la tabla public.leads"
      );
      assert.match(
        sql,
        /id bigint PRIMARY KEY/i,
        "leads.id debe ser bigint PRIMARY KEY conservando IDs enteros de Col B"
      );
      assert.match(
        sql,
        /slug text UNIQUE NOT NULL/i,
        "leads.slug debe ser text UNIQUE NOT NULL"
      );
      assert.match(
        sql,
        /expires_at timestamptz/i,
        "leads debe incluir expires_at para control de ciclo TTL de 7 días"
      );
      assert.match(
        sql,
        /ALTER TABLE public\.leads ENABLE ROW LEVEL SECURITY/i,
        "Debe habilitar Row Level Security en leads"
      );
      assert.match(
        sql,
        /CREATE POLICY "Admin owner has full access to leads"/i,
        "Debe definir la política RLS restrictiva para el propietario"
      );
      assert.match(
        sql,
        /is_admin_owner\(\)/i,
        "La política debe comprobar la función is_admin_owner()"
      );
    }
  );

  // --- SEAM 2: MAPEADORES Y NORMALIZACIÓN DE 18 COLUMNAS ---
  await t.test(
    "2. Normalizadores infieren ciudades argentinas y mapean estados de embudo",
    () => {
      // Ciudades
      assert.equal(extractCityFromLocation("Belgrano 1221, Campana"), "Campana");
      assert.equal(extractCityFromLocation("Justa Lima 450, Zárate"), "Zárate");
      assert.equal(extractCityFromLocation("Av. Córdoba 5869, Palermo, CABA"), "Palermo");
      assert.equal(extractCityFromLocation("Rivadavia 5000, Caballito"), "Caballito");
      assert.equal(extractCityFromLocation("Av. Cabildo 2000, Belgrano"), "Belgrano");
      assert.equal(extractCityFromLocation("Callao y Santa Fe, Recoleta"), "Recoleta");

      // Estados de Embudo (6 etapas)
      assert.equal(normalizeLeadFunnelStatus("1. Prospecto Identificado"), "1. Prospecto Identificado");
      assert.equal(normalizeLeadFunnelStatus("Contactado"), "2. Contactado");
      assert.equal(normalizeLeadFunnelStatus("Reunión Agendada"), "3. Reunión Agendada");
      assert.equal(normalizeLeadFunnelStatus("Propuesta"), "4. Propuesta Enviada");
      assert.equal(normalizeLeadFunnelStatus("Cerrado Ganado"), "5. Negociación / Cierre");
      assert.equal(normalizeLeadFunnelStatus("Descartado"), "6. Descartado");

      // Estados de Respuesta
      assert.equal(normalizeLeadResponseStatus("Sin contactar"), "Sin Contactar");
      assert.equal(normalizeLeadResponseStatus("Esperando"), "Esperando Respuesta");
      assert.equal(normalizeLeadResponseStatus("Interesado"), "Interesado");
      assert.equal(normalizeLeadResponseStatus("No interesado"), "No Interesado");
    }
  );

  await t.test(
    "3. Mapeo bidireccional entre fila canónica de 18 columnas y entidad relacional Lead",
    () => {
      const canonicalRow = [
        22,                                             // 1. Nº / ID
        "Lic. Daniela Ramunno",                        // 2. Prospecto
        "nutricionista",                               // 3. Nicho
        "WhatsApp",                                    // 4. Canal
        "https://wa.me/5491124908956",                 // 5. WhatsApp Link
        "https://preview.nexobow.site/22-daniela-ramunno-nutri/", // 6. Demo URL
        "https://instagram.com/dani.nutri",            // 7. Social
        "Av. Córdoba 5869, Palermo, CABA",             // 8. Ubicación
        "2. Contactado",                               // 9. Estado Lead
        "2026-10-26",                                  // 10. 1er Contacto
        "2026-10-28",                                  // 11. Último Contacto
        "Esperando Respuesta",                         // 12. Respuesta
        "No",                                          // 13. Reunión?
        "",                                            // 14. Fecha Reunión
        "$189.999 ARS",                                // 15. Valor Potencial
        "En Proceso",                                  // 16. Estado Negocio
        "Educación alimentaria sin juicios.",          // 17. Notas
        "+5491124908956"                               // 18. Teléfono
      ];

      // Row -> Entity
      const entity = mapSheetRowToLeadEntity(canonicalRow);
      assert.equal(entity.id, 22);
      assert.equal(entity.slug, "22-daniela-ramunno-nutri");
      assert.equal(entity.name, "Lic. Daniela Ramunno");
      assert.equal(entity.city, "Palermo");
      assert.equal(entity.funnel_status, "2. Contactado");
      assert.equal(entity.meeting_booked, false);
      assert.equal(entity.phone, "+5491124908956");
      assert.ok(entity.expires_at, "Debe calcular expires_at para el ciclo TTL");

      // Entity -> Row
      const roundtripRow = mapLeadEntityToSheetRow(entity);
      assert.equal(roundtripRow.length, 18);
      assert.equal(roundtripRow[0], 22);
      assert.equal(roundtripRow[1], "Lic. Daniela Ramunno");
      assert.equal(roundtripRow[5], "https://preview.nexobow.site/22-daniela-ramunno-nutri/");
      assert.equal(roundtripRow[8], "2. Contactado");
      assert.equal(roundtripRow[17], "+5491124908956");
    }
  );

  // --- SEAM 3: ADAPTADOR CREATE SUPABASE LEAD STORE ---
  await t.test(
    "4. createSupabaseLeadStore cumple la interfaz canónica de LeadStore y operaciones CRUD",
    () => {
      const initialRows = [
        [
          10,
          "Lic. Lucila Fagnani",
          "nutricionista",
          "WhatsApp",
          "https://wa.me/5493489501234",
          "https://preview.nexobow.site/10-lucila-fagnani-nutri/",
          "",
          "Campana, Buenos Aires",
          "1. Prospecto Identificado",
          "2026-10-23",
          "",
          "Sin Contactar",
          "No",
          "",
          "$189.999 ARS",
          "En Proceso",
          "Nutrición funcional",
          "+5493489501234"
        ]
      ];

      const store = createSupabaseLeadStore({ initialRows });

      // Lectura canónica
      const rows = store.readRows();
      assert.equal(rows.length, 1);
      assert.equal(rows[0][0], 10);

      // Próximo ID
      assert.equal(store.getNextId(), 11);

      // Claves existentes
      const keys = store.getExistingKeys();
      assert.ok(keys.includes("Lic. Lucila Fagnani"));
      assert.ok(keys.includes("+5493489501234"));

      // Inserción de nuevo prospecto (appendLead)
      const res = store.appendLead({
        displayName: "Dr. Gonzalo Benítez",
        nicho: "abogado",
        nationalPhoneNumber: "+5491148209123",
        direccion: "Retiro, CABA"
      });

      assert.equal(res.id, 11);
      assert.equal(res.slug, "11-gonzalo-benitez-abogado");
      assert.equal(store.getNextId(), 12);

      // Verificación de entidades nativas
      const lead11 = store.getLeadById(11);
      assert.ok(lead11);
      assert.equal(lead11.name, "Dr. Gonzalo Benítez");
      assert.equal(lead11.city, "CABA");

      // Actualización de preview URL
      const updateRes = store.updatePreviewUrl({
        sheetId: 11,
        slug: "11-gonzalo-benitez-abogado",
        previewUrl: "https://preview.nexobow.site/11-gonzalo-benitez-custom/"
      });
      assert.equal(updateRes.updated, true);
      assert.equal(store.getLeadById(11).demo_url, "https://preview.nexobow.site/11-gonzalo-benitez-custom/");

      // Detección de unchanged ante la misma URL
      const unchangedRes = store.updatePreviewUrl({
        sheetId: 11,
        slug: "11-gonzalo-benitez-abogado",
        previewUrl: "https://preview.nexobow.site/11-gonzalo-benitez-custom/"
      });
      assert.equal(unchangedRes.updated, false);
      assert.equal(unchangedRes.reason, "unchanged");

      // Renovación de TTL (+7 días)
      const beforeExpires = new Date(lead11.expires_at).getTime();
      const renewed = store.renewLeadTtl(11, 7);
      const afterExpires = new Date(renewed.expires_at).getTime();
      assert.ok(afterExpires >= beforeExpires);

      // Modificación de etapa de embudo (updateLead)
      store.updateLead(11, { funnel_status: "3. Reunión Agendada" });
      assert.equal(store.getLeadById(11).funnel_status, "3. Reunión Agendada");

      // Filtrado y orden (listLeads)
      const allLeads = store.listLeads({ sortBy: "id", ascending: false });
      assert.equal(allLeads.length, 2);
      assert.equal(allLeads[0].id, 11);
      assert.equal(allLeads[1].id, 10);
    }
  );

  // --- SEAM 4: SCRIPT DE MIGRACIÓN IDEMPOTENTE ---
  await t.test(
    "5. migrateSheetsToSupabase extrae fichas de /clients/ y ejecuta migración idempotente",
    async () => {
      // Extracción desde fichas locales
      const ficheLeads = extractLeadsFromFiches();
      assert.ok(
        ficheLeads.length >= 10,
        `Debe encontrar prospectos en /clients/ (encontrados: ${ficheLeads.length})`
      );

      // Verificación de conservación de IDs enteros de Columna B
      const ids = ficheLeads.map((l) => l.id);
      assert.ok(ids.includes(10), "Debe incluir ID 10");
      assert.ok(ids.includes(22), "Debe incluir ID 22");

      // Ejecución de migración en dry-run
      const migrationRes = await migrateSheetsToSupabase({
        source: "clients",
        dryRun: true
      });

      assert.equal(migrationRes.success, true);
      assert.equal(migrationRes.dryRun, true);
      assert.ok(migrationRes.totalCount >= 10);
      assert.ok(Array.isArray(migrationRes.records));

      // Verificación de estructura del primer registro migrado
      const first = migrationRes.records[0];
      assert.ok(first.id > 0, "ID debe ser entero positivo");
      assert.ok(first.slug, "Debe tener slug");
      assert.ok(first.name, "Debe tener nombre");
      assert.ok(first.niche, "Debe tener nicho");
      assert.ok(first.expires_at, "Debe tener expires_at");
    }
  );

  // --- SEAM 5: VISTA REACT CRMVIEW Y ROUTER CLIENTE ---
  await t.test(
    "6. CrmView implementa Kanban (6 etapas), Data Table, TTL badges y router /admin/crm",
    () => {
      assert.ok(existsSync(CRM_VIEW_FILE), "CrmView.tsx debe existir");
      assert.ok(existsSync(CRM_REEXPORT_FILE), "CrmView.tsx re-export debe existir");

      const crmCode = readFileSync(CRM_VIEW_FILE, "utf8");

      // 6 Columnas Kanban
      assert.match(crmCode, /KANBAN_STAGES/i, "Debe definir KANBAN_STAGES");
      assert.match(crmCode, /1\. Prospecto Identificado/i);
      assert.match(crmCode, /2\. Contactado/i);
      assert.match(crmCode, /3\. Reunión Agendada/i);
      assert.match(crmCode, /4\. Propuesta Enviada/i);
      assert.match(crmCode, /5\. Negociación \/ Cierre/i);
      assert.match(crmCode, /6\. Descartado/i);

      // Conmutador dual Kanban vs Data Table
      assert.match(crmCode, /viewMode === "kanban"/i, "Debe alternar vista Kanban");
      assert.match(crmCode, /viewMode === "table"/i, "Debe alternar vista Data Table");

      // Drawer lateral de edición
      assert.match(crmCode, /LeadDrawer/i, "Debe incluir subcomponente LeadDrawer");

      // Acciones de 1 Clic
      assert.match(crmCode, /buildVoseoWhatsAppUrl/i, "Debe generar mensaje WhatsApp con voseo argentino");
      assert.match(crmCode, /handleRenewTtl/i, "Debe permitir renovar TTL (+7 días)");
      assert.match(crmCode, /preview\.nexobow\.site/i, "Debe enlazar a la preview web oficial");

      // Enrutador en AdminApp
      const adminAppCode = readFileSync(ADMIN_APP_FILE, "utf8");
      assert.match(
        adminAppCode,
        /currentPath === "\/admin\/crm"/i,
        "AdminApp.tsx debe enrutar /admin/crm hacia CrmView"
      );
      assert.match(
        adminAppCode,
        /<CrmView/i,
        "AdminApp.tsx debe renderizar <CrmView"
      );
    }
  );
});
