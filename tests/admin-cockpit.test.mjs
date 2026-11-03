// tests/admin-cockpit.test.mjs — Suite TDD para Cockpit Diario (Home): Resumen Ejecutivo y Alertas Cruzadas (Ticket 45)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COCKPIT_LIB = join(REPO_ROOT, "web", "src", "lib", "cockpit.ts");
const COCKPIT_VIEW_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "CockpitView.tsx"
);
const COCKPIT_REEXPORT_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "CockpitView.tsx"
);
const ADMIN_APP_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T45: Cockpit Diario (Home): Resumen Ejecutivo y Alertas Cruzadas", async (t) => {
  // Dynamic import of the cockpit lib
  let cockpitModule;
  try {
    cockpitModule = await import(COCKPIT_LIB);
  } catch (err) {
    // Si aún no está creado o transpilado, el test reportará el fallo TDD
  }

  // --- SEAM 1: EXISTENCIA DE ARCHIVOS Y ESTRUCTURA ---
  await t.test("1. Archivos base del Cockpit existen y están estructurados", () => {
    assert.ok(
      existsSync(COCKPIT_LIB),
      `El módulo agregador ${COCKPIT_LIB} debe existir`
    );
    assert.ok(
      existsSync(COCKPIT_VIEW_FILE),
      `La vista ${COCKPIT_VIEW_FILE} debe existir`
    );
    assert.ok(
      existsSync(COCKPIT_REEXPORT_FILE),
      `El re-export ${COCKPIT_REEXPORT_FILE} debe existir`
    );
  });

  // --- SEAM 2: SERVICIO AGREGADOR Y LÓGICA DE DOMINIO PURA ---
  await t.test(
    "2. getTodayDayOfWeek mapea correctamente fechas a días de la semana (1=Lunes..7=Domingo)",
    () => {
      assert.ok(cockpitModule, "El módulo cockpit.ts debe haberse importado");
      const { getTodayDayOfWeek } = cockpitModule;
      assert.equal(typeof getTodayDayOfWeek, "function");

      // 2026-11-02 fue Lunes -> 1
      const monday = new Date("2026-11-02T12:00:00Z");
      assert.equal(getTodayDayOfWeek(monday), 1);

      // 2026-11-03 fue Martes -> 2
      const tuesday = new Date("2026-11-03T12:00:00Z");
      assert.equal(getTodayDayOfWeek(tuesday), 2);

      // 2026-11-08 fue Domingo -> 7
      const sunday = new Date("2026-11-08T12:00:00Z");
      assert.equal(getTodayDayOfWeek(sunday), 7);
    }
  );

  await t.test(
    "3. filterUrgentTtlLeads detecta leads <48h y vencidos con enlaces WhatsApp y formato voseo",
    () => {
      const { filterUrgentTtlLeads } = cockpitModule;
      assert.equal(typeof filterUrgentTtlLeads, "function");

      const now = new Date("2026-11-03T10:00:00Z");

      const mockLeads = [
        {
          id: 1,
          slug: "1-lead-urgente",
          name: "Lic. Martín Palermo",
          niche: "nutricionista",
          phone: "+5491122334455",
          funnel_status: "2. Contactado",
          potential_value: "$189.999 ARS",
          location: "Palermo, CABA",
          city: "Palermo",
          // Expira en 20 horas (urgente < 48h)
          expires_at: new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          slug: "2-lead-lejos",
          name: "Dr. Juan Román",
          niche: "clinica",
          phone: "+5491199887766",
          funnel_status: "1. Prospecto Identificado",
          potential_value: "$329.999 ARS",
          location: "Boca, CABA",
          city: "Boca",
          // Expira en 6 días (no urgente)
          expires_at: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          slug: "3-lead-vencido",
          name: "Dra. Marcela Acuña",
          niche: "abogado",
          phone: "+5491155667788",
          funnel_status: "3. Reunión Agendada",
          potential_value: "$249.999 ARS",
          location: "Retiro, CABA",
          city: "Retiro",
          // Venció hace 2 horas
          expires_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const urgentList = filterUrgentTtlLeads(mockLeads, 48, now);
      // Deben incluirse el de 20hs y el vencido (2 alertas críticas)
      assert.equal(urgentList.length, 2);

      const urgentLead = urgentList.find((l) => l.id === 1);
      assert.ok(urgentLead);
      assert.equal(urgentLead.isUrgent, true);
      assert.equal(urgentLead.isExpired, false);
      assert.ok(urgentLead.whatsappUrl.includes("wa.me/5491122334455"));
      assert.ok(urgentLead.whatsappUrl.includes(encodeURIComponent("Martín")));

      const expiredLead = urgentList.find((l) => l.id === 3);
      assert.ok(expiredLead);
      assert.equal(expiredLead.isExpired, true);
    }
  );

  await t.test(
    "4. extractTodayScheduleBlocks extrae los bloques del día actual ordenados cronológicamente",
    () => {
      const { extractTodayScheduleBlocks } = cockpitModule;
      assert.equal(typeof extractTodayScheduleBlocks, "function");

      const mockBlocks = [
        {
          id: 1,
          title: "Grabación Alaynow",
          category: "alaynow_grabacion",
          day_of_week: 2, // Martes
          start_time: "15:00",
          end_time: "17:00",
        },
        {
          id: 2,
          title: "Prospección B2B Matutina",
          category: "prospeccion",
          day_of_week: 2, // Martes
          start_time: "09:00",
          end_time: "11:00",
        },
        {
          id: 3,
          title: "Reunión de Cierre",
          category: "reunion",
          day_of_week: 3, // Miércoles
          start_time: "10:00",
          end_time: "11:00",
        },
      ];

      // Martes (2)
      const tuesdayBlocks = extractTodayScheduleBlocks(mockBlocks, 2);
      assert.equal(tuesdayBlocks.length, 2);
      // Debe estar ordenado: 09:00 antes de 15:00
      assert.equal(tuesdayBlocks[0].title, "Prospección B2B Matutina");
      assert.equal(tuesdayBlocks[0].durationMinutes, 120);
      assert.equal(tuesdayBlocks[1].title, "Grabación Alaynow");
    }
  );

  await t.test(
    "5. determineActiveVideo prioriza video en producción activa",
    () => {
      const { determineActiveVideo } = cockpitModule;
      assert.equal(typeof determineActiveVideo, "function");

      const mockVideos = [
        {
          id: 1,
          title: "Video Antiguo Publicado",
          stage: "publicado",
          published_at: "2026-10-01T10:00:00Z",
        },
        {
          id: 2,
          title: "Nueva Idea de Embudo",
          stage: "idea",
        },
        {
          id: 3,
          title: "Edición Final: Cómo Escalar Clínicas",
          stage: "edicion",
          target_date: "2026-11-05",
          has_sponsor: true,
          sponsor_name: "Notion",
        },
      ];

      const active = determineActiveVideo(mockVideos);
      assert.ok(active);
      assert.equal(active.id, 3);
      assert.equal(active.stage, "edicion");
      assert.equal(active.hasSponsor, true);
    }
  );

  await t.test(
    "6. computeCockpitCashflow consolida ingresos, egresos y beneficio neto del mes",
    () => {
      const { computeCockpitCashflow } = cockpitModule;
      assert.equal(typeof computeCockpitCashflow, "function");

      const mockTxs = [
        {
          amount: 189999,
          currency: "ARS",
          flow_type: "ingreso",
          business_unit: "nexobow",
          transaction_date: "2026-11-02",
        },
        {
          amount: 200,
          currency: "USD",
          exchange_rate: 1250,
          flow_type: "ingreso",
          business_unit: "alaynow",
          transaction_date: "2026-11-03", // 200 * 1250 = 250.000 ARS
        },
        {
          amount: 50000,
          currency: "ARS",
          flow_type: "egreso",
          business_unit: "gastos_operativos",
          transaction_date: "2026-11-01",
        },
      ];

      const summary = computeCockpitCashflow(mockTxs, "2026-11", 1250);
      assert.equal(summary.period, "2026-11");
      assert.equal(summary.incomeArs, 189999 + 250000); // 439.999 ARS
      assert.equal(summary.expenseArs, 50000);
      assert.equal(summary.netCashflowArs, 439999 - 50000); // 389.999 ARS
      assert.ok(summary.formattedIncomeArs.includes("439.999"));
      assert.ok(summary.formattedNetCashflowArs.includes("389.999"));
      assert.ok(summary.netMarginPercentage > 80);
    }
  );

  await t.test(
    "7. aggregateCockpitData unifica todos los módulos en una estructura de mando",
    () => {
      const { aggregateCockpitData } = cockpitModule;
      assert.equal(typeof aggregateCockpitData, "function");

      const now = new Date("2026-11-03T10:00:00Z"); // Martes

      const summary = aggregateCockpitData({
        leads: [
          {
            id: 1,
            slug: "1-lead",
            name: "Lic. Melisa",
            niche: "nutricionista",
            phone: "+5491122334455",
            expires_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          },
        ],
        habits: [
          { id: 1, title: "Gym", pillar: "salud" },
          { id: 2, title: "Prospección", pillar: "foco_negocio" },
        ],
        habitLogs: [
          { habit_id: 1, completed_date: "2026-11-03" }, // Gym completado hoy
        ],
        scheduleBlocks: [
          { id: 1, title: "Deep Work", day_of_week: 2, start_time: "08:00", end_time: "10:00", category: "desarrollo" },
        ],
        videos: [
          { id: 10, title: "Próximo Video", stage: "grabacion" },
        ],
        transactions: [
          { amount: 189999, currency: "ARS", flow_type: "ingreso", business_unit: "nexobow", transaction_date: "2026-11-01" },
        ],
        today: now,
      });

      assert.equal(summary.dayOfWeek, 2);
      assert.equal(summary.urgentAlertsCount, 1);
      assert.equal(summary.todayHabits.length, 2);
      assert.equal(summary.habitsCompletedCount, 1);
      assert.equal(summary.habitsTodayProgress, 50);
      assert.equal(summary.todayBlocks.length, 1);
      assert.equal(summary.activeVideo?.title, "Próximo Video");
      assert.equal(summary.cashflow.netCashflowArs, 189999);
    }
  );

  // --- SEAM 3: COMPONENTE COCKPITVIEW Y ENRUTADOR ADMINAPP ---
  await t.test(
    "8. CockpitView.tsx implementa los 5 widgets clave e interactividad",
    () => {
      const viewCode = readFileSync(COCKPIT_VIEW_FILE, "utf8");

      // Widget 1: Alertas TTL
      assert.match(viewCode, /Alertas de Prospección TTL|Alertas TTL/i);
      assert.match(viewCode, /wa\.me/);

      // Widget 2: Hábitos de Hoy interactivo
      assert.match(viewCode, /Hábitos de Hoy|Completitud de Hoy/i);
      assert.match(viewCode, /toggleHabit/i);

      // Widget 3: Agenda de Hoy
      assert.match(viewCode, /Agenda de Hoy|Bloques de Hoy/i);

      // Widget 4: Próximo Video Alaynow
      assert.match(viewCode, /AlayNow|Próximo Video/i);

      // Widget 5: Cashflow Neto Consolidado
      assert.match(viewCode, /Cashflow|Beneficio Neto/i);
    }
  );

  await t.test(
    "9. AdminApp.tsx monta CockpitView como vista de aterrizaje predeterminada",
    () => {
      const appCode = readFileSync(ADMIN_APP_FILE, "utf8");

      assert.match(
        appCode,
        /import.*CockpitView/i,
        "AdminApp debe importar CockpitView"
      );
      assert.match(
        appCode,
        /<CockpitView/i,
        "AdminApp debe renderizar <CockpitView ... /> en la ruta /admin"
      );
    }
  );
});
