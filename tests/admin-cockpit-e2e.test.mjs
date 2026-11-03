// tests/admin-cockpit-e2e.test.mjs — Suite de Integración Punta a Punta, Settings & Verificación 0-JS (Ticket 46)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("T46: End-to-End Integration, Settings & Verificación de Aislamiento 0-JS", async (t) => {
  // -------------------------------------------------------------
  // 1. Diagnóstico de Plataforma y Healthcheck (web/src/lib/settings.ts)
  // -------------------------------------------------------------
  await t.test("1. Módulo settings.ts: tablas, ofuscación, variables de entorno y healthcheck", async () => {
    const {
      ADMIN_DATABASE_TABLES,
      maskSecretKey,
      getEnvironmentDiagnostics,
      getZeroJsAuditSummary,
      checkSupabaseHealth,
      clearPlatformCache,
    } = await import("../web/src/lib/settings.ts");

    // Verificar las 6 tablas del Cockpit
    assert.equal(ADMIN_DATABASE_TABLES.length, 6, "Deben existir exactamente 6 tablas registradas");
    const tableNames = ADMIN_DATABASE_TABLES.map((t) => t.name);
    assert.deepEqual(
      tableNames.sort(),
      [
        "alaynow_videos",
        "financial_transactions",
        "habit_logs",
        "habits",
        "leads",
        "schedule_blocks",
      ].sort(),
      "Las tablas deben coincidir con los 6 submódulos del Frente E"
    );

    // Verificar enmascaramiento seguro
    assert.equal(maskSecretKey(null), "No configurado");
    assert.equal(maskSecretKey(""), "No configurado");
    assert.equal(maskSecretKey("https://demo-project.supabase.co/rest/v1"), "https://demo-project.supabase.co");
    assert.equal(maskSecretKey("juanma@nexobow.site"), "j***a@nexobow.site");
    assert.equal(maskSecretKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret"), "eyJh••••••••cret");

    // Verificar diagnóstico de variables de entorno
    const envReports = getEnvironmentDiagnostics({
      PUBLIC_SUPABASE_URL: "https://custom-project.supabase.co",
      PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummykey1234",
      ADMIN_OWNER_EMAIL: "juanma@nexobow.site",
      NEXOBOW_ROOT_DOMAIN: "nexobow.site",
    });

    assert.equal(envReports.length, 4);
    const urlReport = envReports.find((e) => e.key === "PUBLIC_SUPABASE_URL");
    assert.ok(urlReport?.configured);
    assert.equal(urlReport?.maskedValue, "https://custom-project.supabase.co");

    // Verificar auditoría de arquitectura 0-JS
    const zeroJsSummary = getZeroJsAuditSummary();
    assert.equal(zeroJsSummary.isolated, true);
    assert.equal(zeroJsSummary.publicLanding0Js, true);
    assert.equal(zeroJsSummary.adminIslandMounted, true);
    assert.equal(zeroJsSummary.publicScriptsCount, 0);
    assert.equal(zeroJsSummary.maxAssetBudgetMb, 25);

    // Ejecutar healthcheck de Supabase con mock client
    const mockSupabase = {
      from(tableName) {
        return {
          select(_cols, _opts) {
            return Promise.resolve({
              count: tableName === "leads" ? 25 : 10,
              data: null,
              error: null,
            });
          },
        };
      },
    };

    const health = await checkSupabaseHealth({
      supabaseClient: mockSupabase,
      user: {
        id: "owner-123",
        email: "juanma@nexobow.site",
        user_metadata: { role: "admin" },
      },
    });

    assert.ok(health.connected, "El healthcheck debe reportar conexión exitosa");
    assert.ok(health.latencyMs >= 0, "Debe medir la latencia en ms");
    assert.equal(health.session.isOwner, true, "El usuario juanma@nexobow.site debe ser identificado como owner");
    assert.equal(health.tables.length, 6, "Debe reportar el conteo de las 6 tablas");
    const leadsTable = health.tables.find((t) => t.name === "leads");
    assert.equal(leadsTable?.count, 25);

    // Verificar limpieza segura de caché
    assert.equal(clearPlatformCache(), true);
  });

  // -------------------------------------------------------------
  // 2. Supabase Realtime Channel (web/src/lib/realtime.ts)
  // -------------------------------------------------------------
  await t.test("2. Sincronización en tiempo real con Supabase Realtime y gestión de canales", async () => {
    const { subscribeToAdminRealtime } = await import("../web/src/lib/realtime.ts");

    let statusReceived = "";
    const receivedEvents = [];

    const channel = subscribeToAdminRealtime(null, {
      channelName: "e2e-test-channel",
      onStatusChange: (status) => {
        statusReceived = status;
      },
      onEvent: (event) => {
        receivedEvents.push(event);
      },
    });

    assert.equal(channel.channelName, "e2e-test-channel");
    assert.equal(channel.tables.length, 6);

    // Esperar tick asíncrono para status
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(statusReceived, "SUBSCRIBED");
    assert.equal(channel.status, "SUBSCRIBED");

    // Simular mutación en tiempo real en la tabla leads
    channel.simulateEvent({
      table: "leads",
      eventType: "INSERT",
      new: { id: 99, slug: "nuevo-lead", name: "Dr. Mock" },
    });

    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].table, "leads");
    assert.equal(receivedEvents[0].eventType, "INSERT");
    assert.equal(receivedEvents[0].new.id, 99);
    assert.ok(receivedEvents[0].timestamp);

    // Desuscribir canal
    await channel.unsubscribe();
    assert.equal(channel.status, "CLOSED");
    assert.equal(statusReceived, "CLOSED");
  });

  // -------------------------------------------------------------
  // 3. Flujo E2E de Autenticación, Navegación y Rutas del Cockpit
  // -------------------------------------------------------------
  await t.test("3. Resolución de rutas protegidas y navegación de los 7 submódulos administrativos", async () => {
    const { resolveAdminRouteState } = await import("../web/src/lib/supabase.ts");
    const ownerEmail = "juanma@nexobow.site";

    // A. Sin usuario -> Redirección a login
    const anonState = resolveAdminRouteState({
      user: null,
      ownerEmail,
      currentPath: "/admin",
    });
    assert.equal(anonState.state, "unauthenticated");
    assert.equal(anonState.authorized, false);
    assert.equal(anonState.redirect, "/admin/login");

    // B. Usuario no autorizado -> forbidden
    const intruderState = resolveAdminRouteState({
      user: { id: "hacker-1", email: "extraño@gmail.com" },
      ownerEmail,
      currentPath: "/admin/settings",
    });
    assert.equal(intruderState.state, "forbidden");
    assert.equal(intruderState.authorized, false);

    // C. Owner con mayúsculas y espacios -> autorizado
    const ownerUser = { id: "owner-juanma", email: "  JUANMA@NEXOBOW.SITE  " };
    const allRoutes = [
      "/admin",
      "/admin/crm",
      "/admin/finances",
      "/admin/calendar",
      "/admin/alaynow",
      "/admin/habits",
      "/admin/settings",
    ];

    for (const route of allRoutes) {
      const state = resolveAdminRouteState({
        user: ownerUser,
        ownerEmail,
        currentPath: route,
      });
      assert.equal(state.state, "authorized", `Ruta ${route} debe ser autorizada para el owner`);
      assert.equal(state.authorized, true);
    }
  });

  // -------------------------------------------------------------
  // 4. Mutaciones Cruzadas y Reflejo Inmediato en el Cockpit
  // -------------------------------------------------------------
  await t.test("4. Mutaciones en CRM, Finanzas, Hábitos y Calendario se consolidan en el Cockpit", async () => {
    const { aggregateCockpitData } = await import("../web/src/lib/cockpit.ts");

    const todayDate = new Date("2026-11-03T10:00:00.000Z");

    // 1. Mutación en CRM: Lead próximo a vencer (<48hs)
    const testLeads = [
      {
        id: 101,
        slug: "101-roberto-gomez-abog",
        name: "Dr. Roberto Gómez",
        niche: "abogado",
        funnel_status: "2. Contactado / Demo Enviada",
        phone: "+54 9 11 4455-6677",
        last_activity_at: "2026-10-28T09:00:00.000Z",
        expires_at: "2026-11-04T09:00:00.000Z", // Vence en 23h (<48hs)
      },
    ];

    // 2. Mutación en Finanzas: Transacción de ingreso en ARS
    const testTransactions = [
      {
        id: "tx-1",
        business_unit: "nexobow",
        flow_type: "ingreso",
        recurrence: "one_off",
        category: "setup_web",
        description: "Cobro Setup Plan Core - Dr. Gómez",
        amount: 189999,
        currency: "ARS",
        transaction_date: "2026-11-02",
      },
      {
        id: "tx-2",
        business_unit: "gastos_operativos",
        flow_type: "gasto",
        recurrence: "recurring",
        category: "infraestructura",
        description: "Cloudflare Pages & Domains",
        amount: 20000,
        currency: "ARS",
        transaction_date: "2026-11-01",
      },
    ];

    // 3. Mutación en Calendario: Bloque para el día de hoy
    const testBlocks = [
      {
        id: "block-today-1",
        day_of_week: 2, // Martes 2026-11-03
        category: "prospeccion",
        start_time: "09:00",
        end_time: "11:00",
        title: "Prospección CABA Nutricionistas",
        is_completed: true,
      },
    ];

    // 4. Mutación en Hábitos: Hábito completado hoy
    const testHabits = [
      {
        id: "habit-entrenamiento",
        name: "Entrenamiento de Fuerza",
        title: "Entrenamiento de Fuerza",
        pillar: "salud",
        icon: "Dumbbell",
        color: "#10B981",
        weekly_frequency: 5,
        created_at: "2026-10-01",
      },
    ];
    const testHabitLogs = [
      {
        id: "log-1",
        habit_id: "habit-entrenamiento",
        completed_date: "2026-11-03",
        created_at: "2026-11-03T08:00:00.000Z",
      },
    ];

    // Ejecutar agregación del Cockpit
    const cockpit = aggregateCockpitData({
      leads: testLeads,
      habits: testHabits,
      habitLogs: testHabitLogs,
      scheduleBlocks: testBlocks,
      videos: [],
      transactions: testTransactions,
      today: todayDate,
    });

    // Verificaciones de reflejo inmediato en el Cockpit:
    // A. Alerta TTL de urgencia
    assert.equal(cockpit.ttlAlerts.length, 1);
    assert.equal(cockpit.ttlAlerts[0].id, 101);
    assert.ok(cockpit.ttlAlerts[0].whatsappUrl.includes("5491144556677"));
    assert.equal(cockpit.urgentAlertsCount, 1);

    // B. Cashflow consolidado del mes
    assert.equal(cockpit.cashflow.incomeArs, 189999);
    assert.equal(cockpit.cashflow.expenseArs, 20000);
    assert.equal(cockpit.cashflow.netCashflowArs, 169999);
    assert.ok(cockpit.cashflow.netMarginPercentage > 80);

    // C. Agenda de hoy
    assert.equal(cockpit.todayBlocks.length, 1);
    assert.equal(cockpit.todayBlocks[0].title, "Prospección CABA Nutricionistas");
    assert.equal(cockpit.todayBlocks[0].isCompleted, true);

    // D. Hábitos de hoy y completitud
    assert.equal(cockpit.todayHabits.length, 1);
    assert.equal(cockpit.todayHabits[0].title, "Entrenamiento de Fuerza");
    assert.equal(cockpit.todayHabits[0].isCompleted, true);
    assert.equal(cockpit.habitsTodayProgress, 100);
  });

  // -------------------------------------------------------------
  // 5. Verificación de Aislamiento Estricto 0-JS en web/
  // -------------------------------------------------------------
  await t.test("5. Aislamiento Estricto 0-JS: web/dist/index.html sin scripts ejecutables y bundle confinado a /admin", async () => {
    const webDistPath = join(REPO_ROOT, "web", "dist", "index.html");
    const adminAstroPath = join(REPO_ROOT, "web", "src", "pages", "admin", "[...all].astro");
    const adminAppPath = join(REPO_ROOT, "web", "src", "components", "admin", "AdminApp.tsx");
    const settingsViewPath = join(REPO_ROOT, "web", "src", "components", "admin", "views", "SettingsView.tsx");

    assert.ok(existsSync(adminAstroPath), "web/src/pages/admin/[...all].astro debe existir");
    assert.ok(existsSync(adminAppPath), "AdminApp.tsx debe existir");
    assert.ok(existsSync(settingsViewPath), "SettingsView.tsx debe existir");

    // Verificar que [...all].astro genera la ruta estática para 'settings'
    const adminAstroContent = readFileSync(adminAstroPath, "utf8");
    assert.ok(
      adminAstroContent.includes('{ params: { all: "settings" } }'),
      "[...all].astro debe incluir el static path para settings"
    );

    // Verificar que AdminApp enruta a SettingsView
    const adminAppContent = readFileSync(adminAppPath, "utf8");
    assert.ok(adminAppContent.includes("SettingsView"), "AdminApp debe importar SettingsView");
    assert.ok(
      adminAppContent.includes('currentPath === "/admin/settings"'),
      "AdminApp debe enrutar /admin/settings"
    );

    // Si web/dist/index.html existe, auditarlo rigurosamente
    if (existsSync(webDistPath)) {
      const html = readFileSync(webDistPath, "utf8");
      const { auditHtmlDocument } = await import("../scripts/audit-site.mjs");
      const report = auditHtmlDocument(html, {
        mode: "web",
        distDir: join(REPO_ROOT, "web", "dist"),
        requireWhatsappCta: false,
      });

      assert.equal(
        report.ok,
        true,
        `La landing pública web/ debe tener 0 errores de auditoría:\n${report.errors.join("\n")}`
      );
      assert.equal(
        report.executableScriptCount,
        0,
        "La landing pública web/dist/index.html debe tener exactamente 0 scripts ejecutables en cliente"
      );
      assert.equal(
        report.jsBytes,
        0,
        "El peso de JavaScript cliente en web/dist/index.html debe ser exactamente 0 bytes"
      );
    }
  });
});
