// tests/admin-habits.test.mjs — Suite TDD para Hábitos & Disciplina: Heatmap de Consistencia y Rachas (Ticket 44)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_FILE = join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20261102050000_habits_discipline_init.sql"
);
const STREAKS_LIB = join(REPO_ROOT, "web", "src", "lib", "streaks.ts");
const HABITS_VIEW_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "HabitsView.tsx"
);
const HABITS_REEXPORT_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "HabitsView.tsx"
);
const ADMIN_APP_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T44: Hábitos & Disciplina: Heatmap de Consistencia y Rachas", async (t) => {
  // --- SEAM 1: MIGRACIÓN SQL Y POLÍTICAS RLS ---
  await t.test(
    "1. Migración SQL crea tablas habits y habit_logs, enum habit_pillar, unicidad y RLS estricto",
    () => {
      assert.ok(
        existsSync(MIGRATION_FILE),
        `La migración ${MIGRATION_FILE} debe existir`
      );
      const sql = readFileSync(MIGRATION_FILE, "utf8");

      // Validar enum habit_pillar
      assert.match(
        sql,
        /CREATE TYPE public\.habit_pillar AS ENUM/i,
        "Debe crear enum habit_pillar"
      );
      assert.match(
        sql,
        /'salud'[\s\S]*'foco_negocio'[\s\S]*'aprendizaje'[\s\S]*'personal'/i,
        "habit_pillar debe contener salud, foco_negocio, aprendizaje y personal"
      );

      // Validar tabla habits
      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.habits/i,
        "Debe crear la tabla public.habits"
      );
      assert.match(
        sql,
        /pillar public\.habit_pillar/i,
        "habits debe contener columna pillar con tipo habit_pillar"
      );
      assert.match(
        sql,
        /target_frequency_per_week integer/i,
        "habits debe contener columna target_frequency_per_week"
      );
      assert.match(
        sql,
        /color_hex text/i,
        "habits debe contener columna color_hex"
      );

      // Validar tabla habit_logs
      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.habit_logs/i,
        "Debe crear la tabla public.habit_logs"
      );
      assert.match(
        sql,
        /completed_date date NOT NULL/i,
        "habit_logs debe contener completed_date date NOT NULL"
      );
      assert.match(
        sql,
        /habit_id bigint NOT NULL REFERENCES public\.habits/i,
        "habit_logs debe tener FK hacia public.habits"
      );
      assert.match(
        sql,
        /UNIQUE\s*\(\s*habit_id\s*,\s*completed_date\s*\)/i,
        "Debe tener restricción UNIQUE (habit_id, completed_date) para evitar duplicados en un mismo día"
      );

      // Validar RLS
      assert.match(
        sql,
        /ALTER TABLE public\.habits ENABLE ROW LEVEL SECURITY;/i,
        "habits debe tener RLS habilitado"
      );
      assert.match(
        sql,
        /ALTER TABLE public\.habit_logs ENABLE ROW LEVEL SECURITY;/i,
        "habit_logs debe tener RLS habilitado"
      );
      assert.match(
        sql,
        /is_admin_owner\(\)/i,
        "Las políticas RLS deben anclarse a is_admin_owner()"
      );
      assert.match(
        sql,
        /juanma@nexobow\.site/i,
        "Las políticas deben permitir fallback explícito a juanma@nexobow.site"
      );
    }
  );

  // --- SEAM 2: MOTOR ALGORÍTMICO DE RACHAS PURAS ---
  await t.test(
    "2. calculateStreak calcula rachas activas, récords históricos y maneja días no marcados",
    async () => {
      assert.ok(existsSync(STREAKS_LIB), `El módulo ${STREAKS_LIB} debe existir`);
      const { calculateStreak, formatDateIso, addDays } = await import(STREAKS_LIB);

      const today = "2026-11-03";
      const yesterday = "2026-11-02";
      const twoDaysAgo = "2026-11-01";
      const threeDaysAgo = "2026-10-31";

      // Caso 1: Lista vacía de fechas
      const emptyRes = calculateStreak([], today);
      assert.equal(emptyRes.currentStreak, 0);
      assert.equal(emptyRes.bestStreak, 0);
      assert.equal(emptyRes.isCompletedToday, false);
      assert.equal(emptyRes.lastCompletedDate, null);

      // Caso 2: Completado hoy (racha de 1)
      const oneToday = calculateStreak([today], today);
      assert.equal(oneToday.currentStreak, 1);
      assert.equal(oneToday.bestStreak, 1);
      assert.equal(oneToday.isCompletedToday, true);
      assert.equal(oneToday.lastCompletedDate, today);

      // Caso 3: Completado ayer pero aún NO hoy (la racha sigue VIVA esperando la jornada)
      const oneYesterday = calculateStreak([yesterday], today);
      assert.equal(oneYesterday.currentStreak, 1);
      assert.equal(oneYesterday.bestStreak, 1);
      assert.equal(oneYesterday.isCompletedToday, false);
      assert.equal(oneYesterday.lastCompletedDate, yesterday);

      // Caso 4: Racha de 3 días consecutivos (hoy, ayer, anteayer)
      const streak3 = calculateStreak([today, yesterday, twoDaysAgo], today);
      assert.equal(streak3.currentStreak, 3);
      assert.equal(streak3.bestStreak, 3);
      assert.equal(streak3.isCompletedToday, true);

      // Caso 5: Fechas desordenadas y con duplicados (idempotencia y ordenamiento)
      const messyDates = [yesterday, twoDaysAgo, today, yesterday, twoDaysAgo];
      const messyRes = calculateStreak(messyDates, today);
      assert.equal(messyRes.currentStreak, 3);
      assert.equal(messyRes.bestStreak, 3);

      // Caso 6: Racha rota hace 2 días (último completado hace 2 días)
      const brokenRes = calculateStreak([twoDaysAgo, threeDaysAgo], today);
      assert.equal(brokenRes.currentStreak, 0); // No completó ni hoy ni ayer
      assert.equal(brokenRes.bestStreak, 2); // Récord histórico conservado
      assert.equal(brokenRes.lastCompletedDate, twoDaysAgo);

      // Caso 7: Récord histórico superior a racha activa
      // Historial: 5 días consecutivos en octubre, luego pausa, y racha actual de 2 días
      const mixedDates = [
        "2026-10-10",
        "2026-10-11",
        "2026-10-12",
        "2026-10-13",
        "2026-10-14", // Racha de 5 días
        yesterday,
        today, // Racha actual de 2 días
      ];
      const mixedRes = calculateStreak(mixedDates, today);
      assert.equal(mixedRes.currentStreak, 2);
      assert.equal(mixedRes.bestStreak, 5);
      assert.equal(mixedRes.isCompletedToday, true);
    }
  );

  // --- SEAM 3: MÉTRICAS Y METAS SEMANALES POR HÁBITO ---
  await t.test(
    "3. calculateHabitStreakMetrics calcula frecuencia semanal y tasa de cumplimiento",
    async () => {
      const { calculateHabitStreakMetrics } = await import(STREAKS_LIB);
      const today = "2026-11-03"; // Martes

      const habit = {
        id: 1,
        title: "Entrenamiento de Fuerza",
        pillar: "salud",
        target_frequency_per_week: 5,
        color_hex: "#10B981",
      };

      const logs = [
        { habit_id: 1, completed_date: "2026-11-03" }, // Martes
        { habit_id: 1, completed_date: "2026-11-02" }, // Lunes
        { habit_id: 1, completed_date: "2026-10-31" },
        { habit_id: 1, completed_date: "2026-10-30" },
        { habit_id: 1, completed_date: "2026-10-29" },
      ];

      const metrics = calculateHabitStreakMetrics(habit, logs, today);
      assert.equal(metrics.habitId, 1);
      assert.equal(metrics.currentStreak, 2);
      assert.equal(metrics.totalCompletions, 5);
      assert.equal(metrics.isCompletedToday, true);
      assert.equal(metrics.weeklyCompletionsCount, 2); // Lun 2 + Mar 3 de esa semana
      assert.equal(typeof metrics.completionRatePercent, "number");
      assert.ok(metrics.completionRatePercent >= 0 && metrics.completionRatePercent <= 100);
    }
  );

  // --- SEAM 4: HEATMAP DE DENSIDAD Y MATRIZ DE 90 / 365 DÍAS ---
  await t.test(
    "4. generateHeatmapGrid construye cuadrícula de 90 días con niveles 0 a 4 y columnas semanales",
    async () => {
      const { generateHeatmapGrid } = await import(STREAKS_LIB);
      const today = "2026-11-03";

      const habits = [
        { id: 1, title: "Hábito 1", pillar: "salud" },
        { id: 2, title: "Hábito 2", pillar: "foco_negocio" },
        { id: 3, title: "Hábito 3", pillar: "aprendizaje" },
        { id: 4, title: "Hábito 4", pillar: "personal" },
      ];

      const logs = [
        // Hoy: 4 hábitos completados (100% -> nivel 4)
        { habit_id: 1, completed_date: today },
        { habit_id: 2, completed_date: today },
        { habit_id: 3, completed_date: today },
        { habit_id: 4, completed_date: today },
        // Ayer: 2 hábitos completados (50% -> nivel 2)
        { habit_id: 1, completed_date: "2026-11-02" },
        { habit_id: 2, completed_date: "2026-11-02" },
        // Hace 2 días: 1 hábito completado (25% -> nivel 1)
        { habit_id: 1, completed_date: "2026-11-01" },
      ];

      const grid90 = generateHeatmapGrid(logs, habits, {
        daysCount: 90,
        referenceDate: today,
      });

      assert.equal(grid90.days.length, 90);
      assert.equal(grid90.endDate, today);
      assert.ok(grid90.weeks.length > 0, "Debe agrupar en columnas semanales");

      // Buscar el día de hoy en la grilla
      const todayCell = grid90.days.find((d) => d.date === today);
      assert.ok(todayCell, "El día de hoy debe estar en la grilla");
      assert.equal(todayCell.count, 4);
      assert.equal(todayCell.level, 4);
      assert.equal(todayCell.details.length, 4);

      // Buscar el día de ayer
      const yesterdayCell = grid90.days.find((d) => d.date === "2026-11-02");
      assert.ok(yesterdayCell);
      assert.equal(yesterdayCell.count, 2);
      assert.equal(yesterdayCell.level, 2);

      // Buscar un día sin logs (nivel 0)
      const emptyCell = grid90.days.find((d) => d.date === "2026-10-20");
      assert.ok(emptyCell);
      assert.equal(emptyCell.count, 0);
      assert.equal(emptyCell.level, 0);

      // Verificar score de consistencia
      assert.ok(grid90.consistencyScorePercent >= 0 && grid90.consistencyScorePercent <= 100);
    }
  );

  // --- SEAM 5: KPIS GLOBALES, FILTRADO Y TOGGLE INMUTABLE ---
  await t.test(
    "5. computeOverallDisciplineKpis, filterHabits y toggleHabitCompletion",
    async () => {
      const {
        computeOverallDisciplineKpis,
        filterHabits,
        toggleHabitCompletion,
        validateHabitPayload,
        HABIT_PILLARS,
      } = await import(STREAKS_LIB);

      const today = "2026-11-03";

      // Validar pilares oficiales
      assert.equal(HABIT_PILLARS.length, 4);
      const pillarIds = HABIT_PILLARS.map((p) => p.id);
      assert.ok(pillarIds.includes("salud"));
      assert.ok(pillarIds.includes("foco_negocio"));
      assert.ok(pillarIds.includes("aprendizaje"));
      assert.ok(pillarIds.includes("personal"));

      const habits = [
        { id: 1, title: "Gym", pillar: "salud" },
        { id: 2, title: "Prospección", pillar: "foco_negocio" },
        { id: 3, title: "Lectura", pillar: "aprendizaje" },
      ];

      const initialLogs = [
        { habit_id: 1, completed_date: today },
        { habit_id: 1, completed_date: "2026-11-02" },
      ];

      // KPIs globales
      const kpis = computeOverallDisciplineKpis(habits, initialLogs, today);
      assert.equal(kpis.activeHabitsCount, 3);
      assert.equal(kpis.todayCompletedCount, 1);
      assert.equal(kpis.todayProgressPercent, 33); // 1 de 3 = 33%

      // Toggle completitud: agregar hábito 2 para hoy
      const toggledAdd = toggleHabitCompletion(initialLogs, 2, today);
      assert.equal(toggledAdd.wasAdded, true);
      assert.equal(toggledAdd.updatedLogs.length, 3);
      assert.ok(
        toggledAdd.updatedLogs.some((l) => l.habit_id === 2 && l.completed_date === today)
      );

      // Toggle completitud: desmarcar hábito 1 para hoy
      const toggledRemove = toggleHabitCompletion(toggledAdd.updatedLogs, 1, today);
      assert.equal(toggledRemove.wasAdded, false);
      assert.equal(toggledRemove.updatedLogs.length, 2);
      assert.ok(
        !toggledRemove.updatedLogs.some((l) => l.habit_id === 1 && l.completed_date === today)
      );

      // Filtrado por pilar
      const healthOnly = filterHabits(habits, "salud");
      assert.equal(healthOnly.length, 1);
      assert.equal(healthOnly[0].title, "Gym");

      // Filtrado por búsqueda
      const searched = filterHabits(habits, "all", "prospec");
      assert.equal(searched.length, 1);
      assert.equal(searched[0].id, 2);

      // Validación de payload de hábito
      const validPayload = validateHabitPayload({
        title: "Nuevo Hábito",
        pillar: "salud",
        target_frequency_per_week: 5,
      });
      assert.equal(validPayload.valid, true);
      assert.equal(validPayload.errors.length, 0);

      const invalidPayload = validateHabitPayload({
        title: "",
        pillar: "rubro_invalido",
        target_frequency_per_week: 10,
      });
      assert.equal(invalidPayload.valid, false);
      assert.ok(invalidPayload.errors.length >= 2);
    }
  );

  // --- SEAM 6: COMPONENTE VISUAL HabitsView Y ENRUTAMIENTO ADMIN ---
  await t.test(
    "6. HabitsView implementa heatmap 90/365, checklist diario, modal de creación y ruta /admin/habits",
    () => {
      assert.ok(
        existsSync(HABITS_VIEW_FILE),
        `El componente ${HABITS_VIEW_FILE} debe existir`
      );
      assert.ok(
        existsSync(HABITS_REEXPORT_FILE),
        `El re-export ${HABITS_REEXPORT_FILE} debe existir`
      );
      const viewCode = readFileSync(HABITS_VIEW_FILE, "utf8");

      // Verificar elementos requeridos en HabitsView
      assert.match(viewCode, /HabitsView/i, "Debe exportar el componente HabitsView");
      assert.match(viewCode, /Heatmap/i, "Debe contener visualización del Heatmap de consistencia");
      assert.match(viewCode, /90|365/i, "Debe permitir alternar entre vista de 90 y 365 días");
      assert.match(viewCode, /racha|streak/i, "Debe mostrar métricas destacadas de racha");
      assert.match(viewCode, /salud|foco_negocio|aprendizaje|personal/i, "Debe contemplar los 4 pilares");

      // Verificar enrutamiento en AdminApp.tsx
      const appCode = readFileSync(ADMIN_APP_FILE, "utf8");
      assert.match(
        appCode,
        /\/admin\/habits/i,
        "AdminApp.tsx debe enrutar la ruta /admin/habits"
      );
      assert.match(
        appCode,
        /HabitsView/i,
        "AdminApp.tsx debe importar y renderizar HabitsView"
      );
    }
  );
});
