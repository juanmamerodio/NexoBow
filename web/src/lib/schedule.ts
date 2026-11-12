// web/src/lib/schedule.ts — Lógica de Dominio, Grilla Semanal y Sincronización Calendar
import { getBrowserSupabaseClient } from "./supabase.ts";

export type ScheduleCategory =
  | "prospeccion"
  | "alaynow_grabacion"
  | "desarrollo"
  | "reunion"
  | "personal";

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ScheduleBlock {
  id?: number | string;
  title: string;
  description?: string;
  category: ScheduleCategory;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  is_completed?: boolean;
  is_recurring?: boolean;
  color_hex?: string;
  google_calendar_event_id?: string | null;
  is_external?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  status?: string;
}

export interface ScheduleCategoryConfig {
  id: ScheduleCategory;
  label: string;
  sublabel: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export const DAYS_OF_WEEK: Array<{
  day: DayOfWeek;
  name: string;
  short: string;
}> = [
  { day: 1, name: "Lunes", short: "Lun" },
  { day: 2, name: "Martes", short: "Mar" },
  { day: 3, name: "Miércoles", short: "Mié" },
  { day: 4, name: "Jueves", short: "Jue" },
  { day: 5, name: "Viernes", short: "Vie" },
  { day: 6, name: "Sábado", short: "Sáb" },
  { day: 7, name: "Domingo", short: "Dom" },
];

export const SCHEDULE_CATEGORIES: ScheduleCategoryConfig[] = [
  {
    id: "prospeccion",
    label: "Prospección B2B",
    sublabel: "Scouting, Fichas & WhatsApp Outreach",
    color: "#BF40FA", // Hyper Magenta
    badgeBg: "rgba(191, 64, 250, 0.12)",
    borderColor: "rgba(191, 64, 250, 0.3)",
  },
  {
    id: "alaynow_grabacion",
    label: "AlayNow YouTube",
    sublabel: "Grabación, Edición & Contenido",
    color: "#EF4444", // Red
    badgeBg: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  {
    id: "desarrollo",
    label: "Deep Work / Código",
    sublabel: "Templates REA, Arquitectura & Astro",
    color: "#4928C2", // Ultrasonic Blue-Violet
    badgeBg: "rgba(73, 40, 194, 0.12)",
    borderColor: "rgba(73, 40, 194, 0.3)",
  },
  {
    id: "reunion",
    label: "Reuniones & Calls",
    sublabel: "Demos de Venta & Clientes",
    color: "#3B82F6", // Royal Blue
    badgeBg: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  {
    id: "personal",
    label: "Personal & Hábitos",
    sublabel: "Gimnasio, Salud & Descanso",
    color: "#10B981", // Emerald
    badgeBg: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
];

export const DEFAULT_HOURS_RANGE = { startHour: 7, endHour: 22 };

// -------------------------------------------------------------
// Utilidades de Conversión y Validación de Tiempos
// -------------------------------------------------------------

export function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return "00:00";
  const parts = timeStr.trim().split(":");
  const h = parts[0] ? parts[0].padStart(2, "0") : "00";
  const m = parts[1] ? parts[1].padStart(2, "0") : "00";
  return `${h}:${m}`;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [hStr, mStr] = timeStr.trim().split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function calculateBlockDurationMinutes(start: string, end: string): number {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  return Math.max(0, endMin - startMin);
}

export function calculateBlockDurationHours(start: string, end: string): number {
  const durationMin = calculateBlockDurationMinutes(start, end);
  return durationMin / 60;
}

export function validateTimeRange(
  start: string,
  end: string
): { valid: boolean; error?: string } {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!timeRegex.test(start)) {
    return {
      valid: false,
      error: `Formato de inicio inválido ('${start}'). Debe ser HH:MM (00:00 a 23:59)`,
    };
  }
  if (!timeRegex.test(end)) {
    return {
      valid: false,
      error: `Formato de fin inválido ('${end}'). Debe ser HH:MM (00:00 a 23:59)`,
    };
  }

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (endMin <= startMin) {
    return {
      valid: false,
      error: "La hora de fin debe ser estrictamente posterior a la hora de inicio",
    };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// Detección de Solapamientos
// -------------------------------------------------------------

export function detectBlockOverlap(
  blockA: { day_of_week: number; start_time: string; end_time: string },
  blockB: { day_of_week: number; start_time: string; end_time: string }
): boolean {
  if (Number(blockA.day_of_week) !== Number(blockB.day_of_week)) {
    return false;
  }

  const aStart = timeToMinutes(blockA.start_time);
  const aEnd = timeToMinutes(blockA.end_time);
  const bStart = timeToMinutes(blockB.start_time);
  const bEnd = timeToMinutes(blockB.end_time);

  // Dos intervalos [aStart, aEnd) y [bStart, bEnd) solapan si y solo si:
  // aStart < bEnd Y bStart < aEnd
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlappingBlocks(
  blocks: ScheduleBlock[]
): Array<[ScheduleBlock, ScheduleBlock]> {
  const overlaps: Array<[ScheduleBlock, ScheduleBlock]> = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (detectBlockOverlap(blocks[i], blocks[j])) {
        overlaps.push([blocks[i], blocks[j]]);
      }
    }
  }
  return overlaps;
}

// -------------------------------------------------------------
// Métricas de Foco y Cumplimiento
// -------------------------------------------------------------

export function computeCategoryFocusHours(
  blocks: ScheduleBlock[]
): Record<ScheduleCategory, { hours: number; percentage: number; blocksCount: number }> {
  const result: Record<
    ScheduleCategory,
    { hours: number; percentage: number; blocksCount: number }
  > = {
    prospeccion: { hours: 0, percentage: 0, blocksCount: 0 },
    alaynow_grabacion: { hours: 0, percentage: 0, blocksCount: 0 },
    desarrollo: { hours: 0, percentage: 0, blocksCount: 0 },
    reunion: { hours: 0, percentage: 0, blocksCount: 0 },
    personal: { hours: 0, percentage: 0, blocksCount: 0 },
  };

  let totalHours = 0;

  for (const block of blocks) {
    const duration = calculateBlockDurationHours(block.start_time, block.end_time);
    const cat = block.category;
    if (result[cat]) {
      result[cat].hours += duration;
      result[cat].blocksCount += 1;
      totalHours += duration;
    }
  }

  for (const cat of Object.keys(result) as ScheduleCategory[]) {
    result[cat].percentage =
      totalHours > 0 ? (result[cat].hours / totalHours) * 100 : 0;
  }

  return result;
}

export function computeTotalFocusMetrics(blocks: ScheduleBlock[]): {
  totalHours: number;
  completedHours: number;
  completionRate: number;
  plannedBlocks: number;
  completedBlocks: number;
} {
  let totalHours = 0;
  let completedHours = 0;
  let plannedBlocks = blocks.length;
  let completedBlocks = 0;

  for (const block of blocks) {
    const duration = calculateBlockDurationHours(block.start_time, block.end_time);
    totalHours += duration;
    if (block.is_completed) {
      completedHours += duration;
      completedBlocks += 1;
    }
  }

  const completionRate =
    totalHours > 0 ? (completedHours / totalHours) * 100 : 0;

  return {
    totalHours,
    completedHours,
    completionRate,
    plannedBlocks,
    completedBlocks,
  };
}

// -------------------------------------------------------------
// Estructuración Semanal y Grilla
// -------------------------------------------------------------

export function groupBlocksByDay(
  blocks: ScheduleBlock[]
): Record<DayOfWeek, ScheduleBlock[]> {
  const grouped: Record<DayOfWeek, ScheduleBlock[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
  };

  for (const block of blocks) {
    const day = block.day_of_week as DayOfWeek;
    if (grouped[day]) {
      grouped[day].push({
        ...block,
        start_time: normalizeTimeString(block.start_time),
        end_time: normalizeTimeString(block.end_time),
      });
    }
  }

  // Ordenar bloques por hora de inicio ascendente
  for (const day of [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]) {
    grouped[day].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }

  return grouped;
}

export function generateWeeklyGridSlots(
  startHour = 7,
  endHour = 22,
  intervalMinutes = 60
): string[] {
  const slots: string[] = [];
  const startMin = startHour * 60;
  const endMin = endHour * 60;

  for (let min = startMin; min <= endMin; min += intervalMinutes) {
    slots.push(minutesToTime(min));
  }

  return slots;
}

// -------------------------------------------------------------
// Seam de Sincronización Google Calendar
// -------------------------------------------------------------

export async function fetchCalendarEventsSeam(options?: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  mockEvents?: ExternalCalendarEvent[];
}): Promise<ExternalCalendarEvent[]> {
  if (options?.mockEvents && options.mockEvents.length > 0) {
    return options.mockEvents;
  }

  // Si no se proveyeron mockEvents, generamos eventos de muestra realistas para la semana
  return [
    {
      id: "gcal-event-default-1",
      summary: "Reunión Comercial Demo Prospecto",
      description: "Call por Google Meet con Dr. Albarracín",
      start: { dateTime: "2026-11-04T15:00:00-03:00" }, // Miércoles
      end: { dateTime: "2026-11-04T16:00:00-03:00" },
    },
    {
      id: "gcal-event-default-2",
      summary: "Grabación AlayNow: Caso NexoBow",
      description: "Estudio AfterBow / Juanma",
      start: { dateTime: "2026-11-05T10:00:00-03:00" }, // Jueves
      end: { dateTime: "2026-11-05T12:30:00-03:00" },
    },
  ];
}

export function convertCalendarEventToScheduleBlock(
  event: ExternalCalendarEvent,
  targetDayOfWeek?: DayOfWeek
): ScheduleBlock {
  let dayOfWeek: DayOfWeek = targetDayOfWeek || 1;
  let startTimeStr = "09:00";
  let endTimeStr = "10:00";

  const startIso = event.start.dateTime || event.start.date;
  const endIso = event.end.dateTime || event.end.date;

  if (startIso) {
    if (startIso.includes("T")) {
      const match = startIso.match(/T(\d{2}):(\d{2})/);
      if (match) {
        startTimeStr = `${match[1]}:${match[2]}`;
      }
      const datePart = startIso.split("T")[0];
      const parts = datePart.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        const jsDay = dt.getDay();
        dayOfWeek = (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
      }
    } else {
      const parts = startIso.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        const jsDay = dt.getDay();
        dayOfWeek = (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
      }
    }
  }

  if (endIso) {
    if (endIso.includes("T")) {
      const match = endIso.match(/T(\d{2}):(\d{2})/);
      if (match) {
        endTimeStr = `${match[1]}:${match[2]}`;
      }
    }
  }

  // Inferencia inteligente de categoría según palabras clave
  const titleLower = (event.summary || "").toLowerCase();
  let category: ScheduleCategory = "reunion";

  if (
    titleLower.includes("grabacion") ||
    titleLower.includes("grabación") ||
    titleLower.includes("alaynow") ||
    titleLower.includes("youtube") ||
    titleLower.includes("video")
  ) {
    category = "alaynow_grabacion";
  } else if (
    titleLower.includes("prospeccion") ||
    titleLower.includes("prospección") ||
    titleLower.includes("nutri") ||
    titleLower.includes("lead")
  ) {
    category = "prospeccion";
  } else if (
    titleLower.includes("codigo") ||
    titleLower.includes("código") ||
    titleLower.includes("desarrollo") ||
    titleLower.includes("astro") ||
    titleLower.includes("template")
  ) {
    category = "desarrollo";
  } else if (
    titleLower.includes("medico") ||
    titleLower.includes("médico") ||
    titleLower.includes("gym") ||
    titleLower.includes("gimnasio") ||
    titleLower.includes("personal") ||
    titleLower.includes("salud")
  ) {
    category = "personal";
  }

  return {
    id: `ext-${event.id}`,
    title: event.summary || "Evento Google Calendar",
    description: event.description || "",
    category,
    day_of_week: dayOfWeek,
    start_time: startTimeStr,
    end_time: endTimeStr,
    is_completed: false,
    is_recurring: false,
    google_calendar_event_id: event.id,
    is_external: true,
    metadata: {
      htmlLink: event.htmlLink,
      source: "google_calendar",
    },
  };
}

export function mergeScheduleWithExternalEvents(
  blocks: ScheduleBlock[],
  externalEvents: ExternalCalendarEvent[]
): ScheduleBlock[] {
  const merged = [...blocks];
  const existingGcalIds = new Set(
    blocks.map((b) => b.google_calendar_event_id).filter(Boolean)
  );

  for (const extEvent of externalEvents) {
    if (!existingGcalIds.has(extEvent.id)) {
      const converted = convertCalendarEventToScheduleBlock(extEvent);
      // Detección de colisiones con bloques locales
      const overlapping = merged.filter((existing) =>
        detectBlockOverlap(existing, converted)
      );
      if (overlapping.length > 0) {
        converted.metadata = {
          ...(converted.metadata || {}),
          has_collision: true,
          colliding_with: overlapping.map((b) => b.title),
        };
      }
      merged.push(converted);
      existingGcalIds.add(extEvent.id);
    }
  }

  return merged;
}

// -------------------------------------------------------------
// Preset Oficial: Rutina Escuela (07:30–13:00) + Prospección (17:00–17:45)
// -------------------------------------------------------------

export const SCHOOL_AND_PROSPECTING_PRESET: ScheduleBlock[] = ([1, 2, 3, 4, 5] as DayOfWeek[]).flatMap(
  (day, idx) => [
    {
      id: idx * 2 + 1,
      title: "Cursada Escuela (Mañana)",
      description: "Bloque fijo de cursada escolar matutina (Lunes a Viernes 07:30 a 13:00).",
      category: "personal" as ScheduleCategory,
      day_of_week: day,
      start_time: "07:30",
      end_time: "13:00",
      is_completed: false,
      is_recurring: true,
    },
    {
      id: idx * 2 + 2,
      title: "Sprint Prospección NexoBow (45m)",
      description: "Sprint enfocado de prospección comercial B2B y seguimiento WhatsApp (17:00 a 17:45).",
      category: "prospeccion" as ScheduleCategory,
      day_of_week: day,
      start_time: "17:00",
      end_time: "17:45",
      is_completed: false,
      is_recurring: true,
    },
  ]
);

// -------------------------------------------------------------
// Persistencia Supabase para Bloques de Horario
// -------------------------------------------------------------

export async function fetchScheduleBlocks(
  customClient?: any
): Promise<ScheduleBlock[] & { data: ScheduleBlock[]; isOffline: boolean }> {
  try {
    const supabase = customClient || getBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error consultando schedule_blocks de Supabase:", error);
      const fallback: ScheduleBlock[] = [];
      return Object.assign(fallback, { data: fallback, isOffline: true });
    }

    const rows: ScheduleBlock[] = (data || []).map((row: any) => ({
      ...row,
      day_of_week: Number(row.day_of_week) as DayOfWeek,
      start_time: normalizeTimeString(row.start_time),
      end_time: normalizeTimeString(row.end_time),
      is_completed: Boolean(row.is_completed),
      is_recurring: Boolean(row.is_recurring),
      is_external: Boolean(row.is_external),
    }));
    return Object.assign(rows, { data: rows, isOffline: false });
  } catch (err) {
    console.error("Excepción consultando schedule_blocks:", err);
    const fallback: ScheduleBlock[] = [];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }
}

export async function seedSchoolAndProspectingSchedule(
  customClient?: any
): Promise<{ ok: boolean; data: ScheduleBlock[]; error?: string }> {
  try {
    const supabase = customClient || getBrowserSupabaseClient();
    const payload = SCHOOL_AND_PROSPECTING_PRESET.map((b) => ({
      title: b.title,
      description: b.description || "",
      category: b.category,
      day_of_week: b.day_of_week,
      start_time: normalizeTimeString(b.start_time),
      end_time: normalizeTimeString(b.end_time),
      is_completed: false,
      is_recurring: true,
      is_external: false,
      metadata: { preset: "school_and_prospecting" },
    }));

    const { data, error } = await supabase
      .from("schedule_blocks")
      .insert(payload)
      .select();

    if (error) {
      return { ok: false, data: SCHOOL_AND_PROSPECTING_PRESET, error: error.message };
    }

    const mapped: ScheduleBlock[] = ((data as any[]) || SCHOOL_AND_PROSPECTING_PRESET).map((row, idx) => ({
      ...row,
      id: row.id ?? idx + 1,
      day_of_week: Number(row.day_of_week) as DayOfWeek,
      start_time: normalizeTimeString(row.start_time),
      end_time: normalizeTimeString(row.end_time),
      is_completed: Boolean(row.is_completed),
      is_recurring: Boolean(row.is_recurring ?? true),
    }));

    return { ok: true, data: mapped };
  } catch (err: any) {
    return { ok: false, data: SCHOOL_AND_PROSPECTING_PRESET, error: err?.message || "Offline fallback" };
  }
}

export async function saveScheduleBlock(
  block: Omit<ScheduleBlock, "id" | "created_at" | "updated_at"> & {
    id?: number | string;
  }
): Promise<{ ok: boolean; data?: ScheduleBlock; error?: string }> {
  const supabase = getBrowserSupabaseClient();

  // Validar coherencia del rango antes de persistir
  const rangeValidation = validateTimeRange(block.start_time, block.end_time);
  if (!rangeValidation.valid) {
    return { ok: false, error: rangeValidation.error };
  }

  const payload: any = {
    title: block.title,
    description: block.description || "",
    category: block.category,
    day_of_week: block.day_of_week,
    start_time: normalizeTimeString(block.start_time),
    end_time: normalizeTimeString(block.end_time),
    is_completed: Boolean(block.is_completed),
    is_recurring: block.is_recurring !== false,
    color_hex: block.color_hex || null,
    google_calendar_event_id: block.google_calendar_event_id || null,
    is_external: Boolean(block.is_external),
    metadata: block.metadata || {},
  };

  // Determinar si es update o insert. Si el id es numérico menor a timestamp Date.now, es un update
  const isExistingDbRecord =
    block.id !== undefined &&
    block.id !== null &&
    typeof block.id === "number" &&
    block.id < 1000000000 &&
    !isNaN(block.id);

  const query = isExistingDbRecord
    ? supabase.from("schedule_blocks").update(payload).eq("id", block.id).select().single()
    : supabase.from("schedule_blocks").insert([payload]).select().single();

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: {
      ...data,
      start_time: normalizeTimeString(data.start_time),
      end_time: normalizeTimeString(data.end_time),
    },
  };
}

export async function toggleScheduleBlockCompletion(
  id: number | string,
  is_completed: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase
    .from("schedule_blocks")
    .update({ is_completed })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteScheduleBlock(
  id: number | string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

