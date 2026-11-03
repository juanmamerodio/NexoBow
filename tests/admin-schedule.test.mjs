// tests/admin-schedule.test.mjs — Suite TDD para Horarios & Time-Blocking con Sincronización Calendar (Ticket 42)
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
  "20261102030000_schedule_blocks_init.sql"
);
const SCHEDULE_LIB = join(REPO_ROOT, "web", "src", "lib", "schedule.ts");
const SCHEDULE_VIEW_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "ScheduleView.tsx"
);
const SCHEDULE_REEXPORT_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "ScheduleView.tsx"
);
const ADMIN_APP_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T42: Horarios & Time-Blocking con Sincronización Calendar", async (t) => {
  // --- SEAM 1: MIGRACIÓN SQL Y POLÍTICAS RLS ---
  await t.test(
    "1. Migración SQL crea tabla schedule_blocks, enum schedule_category, campos de gcal y RLS estricto",
    () => {
      assert.ok(
        existsSync(MIGRATION_FILE),
        `La migración ${MIGRATION_FILE} debe existir`
      );
      const sql = readFileSync(MIGRATION_FILE, "utf8");

      // Validar enum schedule_category
      assert.match(
        sql,
        /CREATE TYPE public\.schedule_category AS ENUM/i,
        "Debe crear enum schedule_category"
      );
      assert.match(
        sql,
        /'prospeccion'[\s\S]*'alaynow_grabacion'[\s\S]*'desarrollo'[\s\S]*'reunion'[\s\S]*'personal'/i,
        "schedule_category debe incluir prospeccion, alaynow_grabacion, desarrollo, reunion y personal"
      );

      // Validar tabla schedule_blocks
      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.schedule_blocks/i,
        "Debe crear la tabla public.schedule_blocks"
      );
      assert.match(
        sql,
        /category public\.schedule_category/i,
        "Debe contener columna category con enum schedule_category"
      );
      assert.match(
        sql,
        /day_of_week smallint/i,
        "Debe contener columna day_of_week de tipo smallint (1 a 7)"
      );
      assert.match(
        sql,
        /start_time time/i,
        "Debe contener columna start_time de tipo time"
      );
      assert.match(
        sql,
        /end_time time/i,
        "Debe contener columna end_time de tipo time"
      );
      assert.match(
        sql,
        /is_completed boolean/i,
        "Debe contener columna is_completed para toggle de cumplimiento"
      );
      assert.match(
        sql,
        /google_calendar_event_id text/i,
        "Debe contener columna google_calendar_event_id para eventos sincronizados"
      );

      // Validar RLS y Políticas
      assert.match(
        sql,
        /ALTER TABLE public\.schedule_blocks ENABLE ROW LEVEL SECURITY/i,
        "Debe habilitar Row Level Security (RLS)"
      );
      assert.match(
        sql,
        /CREATE POLICY "Admin owner has full access to schedule_blocks"/i,
        "Debe crear la política restrictiva para el admin owner"
      );
    }
  );

  // --- SEAM 2: CONVERSIONES DE TIEMPO, DURACIÓN Y VALIDACIONES ---
  await t.test(
    "2. Funciones de cálculo de tiempo, duraciones y validación de rangos horarios",
    async () => {
      assert.ok(existsSync(SCHEDULE_LIB), `El módulo ${SCHEDULE_LIB} debe existir`);
      const {
        timeToMinutes,
        minutesToTime,
        calculateBlockDurationMinutes,
        calculateBlockDurationHours,
        validateTimeRange,
      } = await import(SCHEDULE_LIB);

      // Conversión de formato HH:MM a minutos
      assert.equal(timeToMinutes("09:00"), 540);
      assert.equal(timeToMinutes("13:30"), 810);
      assert.equal(timeToMinutes("00:00"), 0);
      assert.equal(timeToMinutes("23:59"), 1439);

      // Conversión inversa minutos a HH:MM
      assert.equal(minutesToTime(540), "09:00");
      assert.equal(minutesToTime(810), "13:30");
      assert.equal(minutesToTime(0), "00:00");

      // Cálculo de duración en minutos y horas
      assert.equal(calculateBlockDurationMinutes("09:00", "11:30"), 150);
      assert.equal(calculateBlockDurationHours("09:00", "11:30"), 2.5);
      assert.equal(calculateBlockDurationHours("14:00", "15:00"), 1);
      assert.equal(calculateBlockDurationHours("08:00", "08:45"), 0.75);

      // Validación de rango horario
      const validRes = validateTimeRange("09:00", "10:30");
      assert.equal(validRes.valid, true);

      const invalidOrder = validateTimeRange("14:00", "12:00");
      assert.equal(invalidOrder.valid, false);
      assert.ok(invalidOrder.error?.includes("posterior"));

      const equalTime = validateTimeRange("10:00", "10:00");
      assert.equal(equalTime.valid, false);

      const invalidFormat = validateTimeRange("9am", "10:00");
      assert.equal(invalidFormat.valid, false);
    }
  );

  // --- SEAM 3: DETECCIÓN DE SOLAPAMIENTOS DE HORARIOS ---
  await t.test(
    "3. Detección de solapamiento entre bloques de trabajo profundo",
    async () => {
      const { detectBlockOverlap, findOverlappingBlocks } = await import(
        SCHEDULE_LIB
      );

      // Distinto día: nunca solapa
      assert.equal(
        detectBlockOverlap(
          { day_of_week: 1, start_time: "09:00", end_time: "11:00" },
          { day_of_week: 2, start_time: "09:00", end_time: "11:00" }
        ),
        false
      );

      // Mismo día pero bloques contiguos (no solapa, el fin de uno es el inicio de otro)
      assert.equal(
        detectBlockOverlap(
          { day_of_week: 1, start_time: "09:00", end_time: "11:00" },
          { day_of_week: 1, start_time: "11:00", end_time: "12:00" }
        ),
        false
      );

      // Mismo día con solapamiento parcial
      assert.equal(
        detectBlockOverlap(
          { day_of_week: 1, start_time: "09:00", end_time: "11:00" },
          { day_of_week: 1, start_time: "10:30", end_time: "12:30" }
        ),
        true
      );

      // Mismo día con inclusión total
      assert.equal(
        detectBlockOverlap(
          { day_of_week: 3, start_time: "14:00", end_time: "18:00" },
          { day_of_week: 3, start_time: "15:00", end_time: "16:00" }
        ),
        true
      );

      // Detección en lista de bloques
      const sampleBlocks = [
        {
          id: 1,
          title: "Prospección",
          category: "prospeccion",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "11:00",
        },
        {
          id: 2,
          title: "Reunión Cliente",
          category: "reunion",
          day_of_week: 1,
          start_time: "10:00",
          end_time: "10:45",
        },
        {
          id: 3,
          title: "Desarrollo",
          category: "desarrollo",
          day_of_week: 1,
          start_time: "11:30",
          end_time: "13:30",
        },
        {
          id: 4,
          title: "AlayNow Grabación",
          category: "alaynow_grabacion",
          day_of_week: 2,
          start_time: "10:00",
          end_time: "12:00",
        },
      ];

      const overlaps = findOverlappingBlocks(sampleBlocks);
      assert.equal(overlaps.length, 1);
      assert.equal(overlaps[0][0].id, 1);
      assert.equal(overlaps[0][1].id, 2);
    }
  );

  // --- SEAM 4: CÁLCULO DE HORAS DE FOCO Y MÉTRICAS DE CUMPLIMIENTO ---
  await t.test(
    "4. computeCategoryFocusHours y métricas de cumplimiento semanal",
    async () => {
      const {
        computeCategoryFocusHours,
        computeTotalFocusMetrics,
        SCHEDULE_CATEGORIES,
      } = await import(SCHEDULE_LIB);

      assert.equal(SCHEDULE_CATEGORIES.length, 5);

      const sampleWeek = [
        // Lunes: 2h prospeccion (cumplido), 3h desarrollo (cumplido)
        {
          id: 1,
          title: "Prospección Nutris",
          category: "prospeccion",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "11:00", // 2.0h
          is_completed: true,
        },
        {
          id: 2,
          title: "Desarrollo Templates REA",
          category: "desarrollo",
          day_of_week: 1,
          start_time: "11:30",
          end_time: "14:30", // 3.0h
          is_completed: true,
        },
        // Martes: 4h alaynow (pendiente)
        {
          id: 3,
          title: "Grabación YouTube AlayNow",
          category: "alaynow_grabacion",
          day_of_week: 2,
          start_time: "10:00",
          end_time: "14:00", // 4.0h
          is_completed: false,
        },
        // Miércoles: 1h reunion (cumplido), 1.5h personal (pendiente)
        {
          id: 4,
          title: "Demo Call Cliente",
          category: "reunion",
          day_of_week: 3,
          start_time: "15:00",
          end_time: "16:00", // 1.0h
          is_completed: true,
        },
        {
          id: 5,
          title: "Entrenamiento Gimnasio",
          category: "personal",
          day_of_week: 3,
          start_time: "18:00",
          end_time: "19:30", // 1.5h
          is_completed: false,
        },
      ];

      const catHours = computeCategoryFocusHours(sampleWeek);

      // Verificación de horas por categoría
      assert.equal(catHours.prospeccion.hours, 2.0);
      assert.equal(catHours.prospeccion.blocksCount, 1);
      assert.equal(catHours.desarrollo.hours, 3.0);
      assert.equal(catHours.alaynow_grabacion.hours, 4.0);
      assert.equal(catHours.reunion.hours, 1.0);
      assert.equal(catHours.personal.hours, 1.5);

      // Total de horas = 2 + 3 + 4 + 1 + 1.5 = 11.5
      const total = 11.5;
      assert.equal(
        Number(catHours.prospeccion.percentage.toFixed(1)),
        Number(((2.0 / total) * 100).toFixed(1))
      );

      // Métricas globales de foco
      const metrics = computeTotalFocusMetrics(sampleWeek);
      assert.equal(metrics.totalHours, 11.5);
      // Cumplidos: id 1 (2h) + id 2 (3h) + id 4 (1h) = 6.0h
      assert.equal(metrics.completedHours, 6.0);
      assert.equal(metrics.plannedBlocks, 5);
      assert.equal(metrics.completedBlocks, 3);
      assert.equal(
        Number(metrics.completionRate.toFixed(1)),
        Number(((6.0 / 11.5) * 100).toFixed(1))
      );
    }
  );

  // --- SEAM 5: GENERACIÓN DE GRILLA SEMANAL Y AGRUPACIÓN POR DÍA ---
  await t.test(
    "5. groupBlocksByDay y generación de slots para la grilla semanal",
    async () => {
      const { groupBlocksByDay, generateWeeklyGridSlots, DAYS_OF_WEEK } =
        await import(SCHEDULE_LIB);

      assert.equal(DAYS_OF_WEEK.length, 7);
      assert.equal(DAYS_OF_WEEK[0].name, "Lunes");
      assert.equal(DAYS_OF_WEEK[6].name, "Domingo");

      const blocks = [
        {
          id: 10,
          title: "B1",
          category: "desarrollo",
          day_of_week: 1,
          start_time: "14:00",
          end_time: "16:00",
        },
        {
          id: 11,
          title: "B2",
          category: "prospeccion",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "10:30",
        },
        {
          id: 12,
          title: "B3",
          category: "personal",
          day_of_week: 5,
          start_time: "18:00",
          end_time: "19:00",
        },
      ];

      const grouped = groupBlocksByDay(blocks);
      // Lunes debe tener 2 bloques ordenados por start_time (09:00 antes que 14:00)
      assert.equal(grouped[1].length, 2);
      assert.equal(grouped[1][0].start_time, "09:00");
      assert.equal(grouped[1][1].start_time, "14:00");
      // Martes (2) vacío
      assert.equal(grouped[2].length, 0);
      // Viernes (5) con 1 bloque
      assert.equal(grouped[5].length, 1);

      // Generación de slots horarios (de 07:00 a 22:00)
      const slots = generateWeeklyGridSlots(7, 22, 60);
      assert.equal(slots[0], "07:00");
      assert.equal(slots[slots.length - 1], "22:00");
      assert.equal(slots.length, 16);
    }
  );

  // --- SEAM 6: SEAM DE SINCRONIZACIÓN GOOGLE CALENDAR ---
  await t.test(
    "6. fetchCalendarEventsSeam, conversión y fusión con bloques locales",
    async () => {
      const {
        fetchCalendarEventsSeam,
        convertCalendarEventToScheduleBlock,
        mergeScheduleWithExternalEvents,
      } = await import(SCHEDULE_LIB);

      const mockCalendarEvents = [
        {
          id: "gcal-event-101",
          summary: "Reunión Estratégica Inversor",
          description: "Google Meet link: meet.google.com/xyz",
          start: { dateTime: "2026-11-04T15:00:00-03:00" }, // Miércoles (día 3)
          end: { dateTime: "2026-11-04T16:00:00-03:00" },
        },
        {
          id: "gcal-event-102",
          summary: "Médico Chequeo Anual",
          description: "Consultorio Palermo",
          start: { dateTime: "2026-11-06T10:30:00-03:00" }, // Viernes (día 5)
          end: { dateTime: "2026-11-06T11:30:00-03:00" },
        },
      ];

      // Llamada al seam
      const events = await fetchCalendarEventsSeam({
        mockEvents: mockCalendarEvents,
      });
      assert.equal(events.length, 2);

      // Conversión de evento a ScheduleBlock
      const convertedBlock = convertCalendarEventToScheduleBlock(events[0]);
      assert.equal(convertedBlock.title, "Reunión Estratégica Inversor");
      assert.equal(convertedBlock.category, "reunion");
      assert.equal(convertedBlock.start_time, "15:00");
      assert.equal(convertedBlock.end_time, "16:00");
      assert.equal(convertedBlock.day_of_week, 3); // Miércoles
      assert.equal(convertedBlock.google_calendar_event_id, "gcal-event-101");
      assert.equal(convertedBlock.is_external, true);

      // Fusión sin duplicar bloques existentes con el mismo google_calendar_event_id
      const existingBlocks = [
        {
          id: 1,
          title: "Prospección",
          category: "prospeccion",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "11:00",
        },
        {
          id: 99,
          title: "Reunión Estratégica Inversor (Previa)",
          category: "reunion",
          day_of_week: 3,
          start_time: "15:00",
          end_time: "16:00",
          google_calendar_event_id: "gcal-event-101", // ya presente
        },
      ];

      const merged = mergeScheduleWithExternalEvents(existingBlocks, events);
      // El evento gcal-event-101 ya existía (se conserva o actualiza), se añade gcal-event-102
      assert.equal(merged.length, 3);
      assert.ok(merged.some((b) => b.google_calendar_event_id === "gcal-event-102"));
    }
  );

  // --- SEAM 7: VISTA SCHEDULEVIEW Y ENRUTADOR ADMINAPP ---
  await t.test(
    "7. ScheduleView implementa grilla semanal, tarjetas de foco, modal y ruta /admin/calendar",
    () => {
      assert.ok(
        existsSync(SCHEDULE_VIEW_FILE),
        `La vista ${SCHEDULE_VIEW_FILE} debe existir`
      );
      assert.ok(
        existsSync(SCHEDULE_REEXPORT_FILE),
        `El re-export ${SCHEDULE_REEXPORT_FILE} debe existir`
      );

      const viewContent = readFileSync(SCHEDULE_VIEW_FILE, "utf8");
      assert.match(
        viewContent,
        /export const ScheduleView/i,
        "Debe exportar el componente ScheduleView"
      );
      assert.match(
        viewContent,
        /Semana Ideal|Bloques de Tiempo/i,
        "Debe contener titular descriptivo del módulo"
      );
      assert.match(
        viewContent,
        /toggleScheduleBlockCompletion|is_completed/i,
        "Debe contar con soporte para alternar cumplimiento de bloques"
      );
      assert.match(
        viewContent,
        /Google Calendar|GCal|fetchCalendarEventsSeam/i,
        "Debe incluir integración / acción para sincronizar Google Calendar"
      );

      // Validar integración en AdminApp.tsx
      const appContent = readFileSync(ADMIN_APP_FILE, "utf8");
      assert.match(
        appContent,
        /ScheduleView/i,
        "AdminApp.tsx debe importar ScheduleView"
      );
      assert.match(
        appContent,
        /\/admin\/calendar/i,
        "AdminApp.tsx debe enrutar hacia ScheduleView en /admin/calendar"
      );
    }
  );
});
