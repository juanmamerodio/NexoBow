// web/src/lib/streaks.ts — Motor Algorítmico de Rachas, Heatmap de Consistencia y Persistencia
import { getBrowserSupabaseClient } from "./supabase.ts";

export type HabitPillar = "salud" | "foco_negocio" | "aprendizaje" | "personal";

export interface Habit {
  id: number | string;
  title: string;
  description?: string;
  pillar: HabitPillar;
  icon?: string;
  target_frequency_per_week?: number;
  color_hex?: string;
  is_archived?: boolean;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HabitLog {
  id?: number | string;
  habit_id: number | string;
  completed_date: string; // "YYYY-MM-DD"
  notes?: string;
  created_at?: string;
}

export interface PillarConfig {
  id: HabitPillar;
  label: string;
  description: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  isCompletedToday: boolean;
  lastCompletedDate: string | null;
}

export interface StreakMetrics extends StreakResult {
  habitId: number | string;
  totalCompletions: number;
  completionRatePercent: number; // Tasa en el período evaluado (0 a 100)
  weeklyCompletionsCount: number; // Completados en la semana en curso
  targetWeeklyMet: boolean;
}

export interface HeatmapDay {
  date: string; // "YYYY-MM-DD"
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  dayOfWeek: number; // 0=Dom, 1=Lun, ..., 6=Sáb
  isToday: boolean;
  details: Array<{
    habitId: number | string;
    habitTitle: string;
    pillar: HabitPillar;
  }>;
}

export interface HeatmapGrid {
  days: HeatmapDay[];
  weeks: HeatmapDay[][]; // Agrupadas por columnas semanales
  startDate: string;
  endDate: string;
  totalCompletions: number;
  activeDaysCount: number;
  consistencyScorePercent: number;
}

export interface OverallDisciplineKpis {
  activeHabitsCount: number;
  todayCompletedCount: number;
  todayProgressPercent: number;
  currentOverallStreak: number;
  bestOverallStreak: number;
  consistencyScore30d: number;
  perfectDaysCount: number;
}

// -------------------------------------------------------------
// Configuración de los 4 Pilares Fundacionales
// -------------------------------------------------------------
export const HABIT_PILLARS: PillarConfig[] = [
  {
    id: "salud",
    label: "Salud & Biohacking",
    description: "Entrenamiento de fuerza, descanso, nutrición y rendimiento físico.",
    color: "#10B981", // Emerald
    badgeBg: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  {
    id: "foco_negocio",
    label: "Foco de Negocio",
    description: "Prospección B2B, llamadas de venta, deep work de código y arquitectura.",
    color: "#BF40FA", // Hyper Magenta
    badgeBg: "rgba(191, 64, 250, 0.12)",
    borderColor: "rgba(191, 64, 250, 0.3)",
  },
  {
    id: "aprendizaje",
    label: "Aprendizaje & Skills",
    description: "Lectura de libros clave, investigación técnica, audiobooks y cursos.",
    color: "#4928C2", // Ultrasonic Blue-Violet
    badgeBg: "rgba(73, 40, 194, 0.12)",
    borderColor: "rgba(73, 40, 194, 0.3)",
  },
  {
    id: "personal",
    label: "Disciplina Personal",
    description: "Planificación semanal, meditación, orden del espacio y finanzas familiares.",
    color: "#E3D9FC", // Soft Lavender
    badgeBg: "rgba(227, 217, 252, 0.12)",
    borderColor: "rgba(227, 217, 252, 0.3)",
  },
];

// -------------------------------------------------------------
// Datos Iniciales Resilientes (Mock Offline para el Fundador)
// -------------------------------------------------------------
export const INITIAL_MOCK_HABITS: Habit[] = [
  {
    id: 1,
    title: "Entrenamiento de Fuerza / Gym",
    description: "Sesión de musculación o hipertrofia de 60 min sin distracciones.",
    pillar: "salud",
    icon: "Dumbbell",
    target_frequency_per_week: 5,
    color_hex: "#10B981",
    is_archived: false,
    position: 1,
  },
  {
    id: 2,
    title: "Hidratación 3L + Creatina",
    description: "3 litros de agua mineral + 5g de creatina monohidrato al despertar.",
    pillar: "salud",
    icon: "Droplets",
    target_frequency_per_week: 7,
    color_hex: "#10B981",
    is_archived: false,
    position: 2,
  },
  {
    id: 3,
    title: "Prospección B2B (10 Nuevos Leads)",
    description: "Scouting en Google Maps + generación de ficha y mensaje personalizado WA.",
    pillar: "foco_negocio",
    icon: "Users",
    target_frequency_per_week: 5,
    color_hex: "#BF40FA",
    is_archived: false,
    position: 3,
  },
  {
    id: 4,
    title: "Deep Work Arquitectura / Astro SSG",
    description: "Bloque de 90 min de código puro sin reuniones ni slack/notificaciones.",
    pillar: "foco_negocio",
    icon: "Code2",
    target_frequency_per_week: 5,
    color_hex: "#BF40FA",
    is_archived: false,
    position: 4,
  },
  {
    id: 5,
    title: "Lectura 20 min (Negocios / Biohacking)",
    description: "20 minutos de lectura profunda de libros de alta densidad conceptual.",
    pillar: "aprendizaje",
    icon: "BookOpen",
    target_frequency_per_week: 7,
    color_hex: "#4928C2",
    is_archived: false,
    position: 5,
  },
  {
    id: 6,
    title: "Planificación & Time-Blocking del Día",
    description: "Definición estricta de las 3 prioridades del día antes de abrir email.",
    pillar: "personal",
    icon: "CalendarCheck",
    target_frequency_per_week: 7,
    color_hex: "#E3D9FC",
    is_archived: false,
    position: 6,
  },
];

// Generador de logs mock para los últimos 60 días
function generateInitialMockLogs(): HabitLog[] {
  const logs: HabitLog[] = [];
  const today = new Date();
  
  // Generar datos históricos consistentes
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateIso(d);
    
    // Simular tasas altas de consistencia (80-90% de completitud)
    INITIAL_MOCK_HABITS.forEach((habit) => {
      // Para hábitos de 7 días, tasa del 85%; para hábitos de 5 días, saltear algunos findes
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let shouldComplete = true;
      if (habit.target_frequency_per_week === 5 && isWeekend) {
        shouldComplete = Math.random() > 0.8;
      } else {
        // Probabilidad alta con pequeñas variaciones deterministas
        shouldComplete = (i + Number(habit.id)) % 7 !== 0;
      }
      
      // Racha activa en los últimos 4 días
      if (i <= 3) shouldComplete = true;

      if (shouldComplete) {
        logs.push({
          id: `mock-${habit.id}-${dateStr}`,
          habit_id: habit.id,
          completed_date: dateStr,
          created_at: d.toISOString(),
        });
      }
    });
  }
  return logs;
}

export const INITIAL_MOCK_LOGS: HabitLog[] = generateInitialMockLogs();

// -------------------------------------------------------------
// Utilidades Puras de Fechas y Rangos
// -------------------------------------------------------------
export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateIso(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day, 12, 0, 0);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateIso(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateIso(d);
}

export function diffInDays(dateStrA: string, dateStrB: string): number {
  const dateA = parseDateIso(dateStrA).getTime();
  const dateB = parseDateIso(dateStrB).getTime();
  const diffTime = dateA - dateB;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// -------------------------------------------------------------
// Motor Algorítmico de Rachas (Streaks Engine)
// -------------------------------------------------------------
export function calculateStreak(
  completedDates: string[],
  referenceDate?: string
): StreakResult {
  if (!completedDates || completedDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      isCompletedToday: false,
      lastCompletedDate: null,
    };
  }

  const todayStr = referenceDate || formatDateIso(new Date());
  const yesterdayStr = addDays(todayStr, -1);

  // Normalizar y ordenar fechas únicas cronológicamente
  const uniqueDates = Array.from(
    new Set(completedDates.filter((d) => Boolean(d) && /^\d{4}-\d{2}-\d{2}$/.test(d)))
  ).sort((a, b) => a.localeCompare(b));

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      isCompletedToday: false,
      lastCompletedDate: null,
    };
  }

  const dateSet = new Set(uniqueDates);
  const lastCompletedDate = uniqueDates[uniqueDates.length - 1];
  const isCompletedToday = dateSet.has(todayStr);

  // 1. Cálculo de Racha Activa (Current Streak)
  let currentStreak = 0;
  if (isCompletedToday) {
    // Si completó hoy, contar hacia atrás empezando por hoy
    currentStreak = 1;
    let checkDate = addDays(todayStr, -1);
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  } else if (dateSet.has(yesterdayStr)) {
    // Si completó ayer pero todavía no hoy, la racha sigue viva
    currentStreak = 1;
    let checkDate = addDays(yesterdayStr, -1);
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  } else {
    // Si no completó ni hoy ni ayer, la racha se rompió
    currentStreak = 0;
  }

  // 2. Cálculo de Racha Máxima Histórica (Best Streak)
  let bestStreak = 0;
  let currentRun = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = uniqueDates[i - 1];
    const curr = uniqueDates[i];
    if (addDays(prev, 1) === curr) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    if (currentRun > bestStreak) {
      bestStreak = currentRun;
    }
  }

  // Si solo hay una fecha o todas son no consecutivas
  if (uniqueDates.length > 0 && bestStreak === 0) {
    bestStreak = 1;
  }

  // Si la racha actual supera la mejor calculada
  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
    isCompletedToday,
    lastCompletedDate,
  };
}

// -------------------------------------------------------------
// Métricas Específicas por Hábito
// -------------------------------------------------------------
export function calculateHabitStreakMetrics(
  habit: Habit,
  logs: HabitLog[],
  referenceDate?: string
): StreakMetrics {
  const refDate = referenceDate || formatDateIso(new Date());
  const habitIdStr = String(habit.id);

  // Filtrar logs de este hábito
  const habitLogs = logs.filter((l) => String(l.habit_id) === habitIdStr);
  const dates = habitLogs.map((l) => l.completed_date);
  const streak = calculateStreak(dates, refDate);

  // Calcular inicio de semana (Lunes) y fin (Domingo) para refDate
  const refObj = parseDateIso(refDate);
  const dayOfWeek = refObj.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayStr = addDays(refDate, -daysFromMonday);
  const sundayStr = addDays(mondayStr, 6);

  // Completados en la semana actual
  const weeklyCompletionsCount = habitLogs.filter((l) => {
    return l.completed_date >= mondayStr && l.completed_date <= sundayStr;
  }).length;

  const targetFreq = habit.target_frequency_per_week || 7;
  const targetWeeklyMet = weeklyCompletionsCount >= targetFreq;

  // Tasa de cumplimiento en los últimos 30 días
  const thirtyDaysAgoStr = addDays(refDate, -29);
  const completionsLast30Days = habitLogs.filter((l) => {
    return l.completed_date >= thirtyDaysAgoStr && l.completed_date <= refDate;
  }).length;

  // Tasa esperada: 30 * (targetFreq / 7)
  const expectedCompletions = Math.round(30 * (targetFreq / 7));
  const completionRatePercent = expectedCompletions > 0
    ? Math.min(100, Math.round((completionsLast30Days / expectedCompletions) * 100))
    : 0;

  return {
    ...streak,
    habitId: habit.id,
    totalCompletions: habitLogs.length,
    completionRatePercent,
    weeklyCompletionsCount,
    targetWeeklyMet,
  };
}

// -------------------------------------------------------------
// Matriz de Heatmap de Densidad (90 / 365 Días)
// -------------------------------------------------------------
export function generateHeatmapGrid(
  logs: HabitLog[],
  habits: Habit[],
  options?: { daysCount?: number; referenceDate?: string }
): HeatmapGrid {
  const daysCount = options?.daysCount || 90;
  const endDate = options?.referenceDate || formatDateIso(new Date());
  const startDate = addDays(endDate, -(daysCount - 1));

  // Mapa de hábitos por id para lookup O(1)
  const habitsMap = new Map<string, Habit>();
  const activeHabits = habits.filter((h) => !h.is_archived);
  habits.forEach((h) => habitsMap.set(String(h.id), h));

  // Agrupar logs por fecha
  const logsByDate = new Map<
    string,
    Array<{ habitId: number | string; habitTitle: string; pillar: HabitPillar }>
  >();

  logs.forEach((log) => {
    if (log.completed_date >= startDate && log.completed_date <= endDate) {
      const habit = habitsMap.get(String(log.habit_id));
      if (habit) {
        const list = logsByDate.get(log.completed_date) || [];
        list.push({
          habitId: habit.id,
          habitTitle: habit.title,
          pillar: habit.pillar,
        });
        logsByDate.set(log.completed_date, list);
      }
    }
  });

  const totalActive = Math.max(1, activeHabits.length);
  const days: HeatmapDay[] = [];
  let totalCompletions = 0;
  let activeDaysCount = 0;

  for (let i = 0; i < daysCount; i++) {
    const curDate = addDays(startDate, i);
    const details = logsByDate.get(curDate) || [];
    const count = details.length;
    const dateObj = parseDateIso(curDate);
    const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

    // Calcular nivel de calor 0 a 4
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      activeDaysCount++;
      totalCompletions += count;
      const ratio = count / totalActive;
      if (ratio <= 0.25) level = 1;
      else if (ratio <= 0.5) level = 2;
      else if (ratio <= 0.75) level = 3;
      else level = 4;
    }

    days.push({
      date: curDate,
      count,
      level,
      dayOfWeek,
      isToday: curDate === endDate,
      details,
    });
  }

  // Agrupar en semanas para visualización en columnas estilo GitHub
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  days.forEach((day, idx) => {
    currentWeek.push(day);
    // Si es domingo (día 0) o es el último día del arreglo, cerrar la columna de semana
    if (day.dayOfWeek === 0 || idx === days.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Score de consistencia global (días activos / total días)
  const consistencyScorePercent = daysCount > 0
    ? Math.round((activeDaysCount / daysCount) * 100)
    : 0;

  return {
    days,
    weeks,
    startDate,
    endDate,
    totalCompletions,
    activeDaysCount,
    consistencyScorePercent,
  };
}

// -------------------------------------------------------------
// KPIs Globales de Disciplina del Fundador
// -------------------------------------------------------------
export function computeOverallDisciplineKpis(
  habits: Habit[],
  logs: HabitLog[],
  referenceDate?: string
): OverallDisciplineKpis {
  const today = referenceDate || formatDateIso(new Date());
  const activeHabits = habits.filter((h) => !h.is_archived);
  const activeCount = activeHabits.length;

  // Hábitos completados hoy
  const todayHabitIds = new Set(
    logs
      .filter((l) => l.completed_date === today)
      .map((l) => String(l.habit_id))
  );

  let todayCompletedCount = 0;
  activeHabits.forEach((h) => {
    if (todayHabitIds.has(String(h.id))) todayCompletedCount++;
  });

  const todayProgressPercent = activeCount > 0
    ? Math.round((todayCompletedCount / activeCount) * 100)
    : 0;

  // Racha global: días donde se completó al menos el 50% de hábitos o al menos 1
  const datesWithAny = Array.from(
    new Set(logs.map((l) => l.completed_date))
  );
  const overallStreak = calculateStreak(datesWithAny, today);

  // Score en 30 días
  const grid30 = generateHeatmapGrid(logs, habits, { daysCount: 30, referenceDate: today });
  const perfectDaysCount = grid30.days.filter((d) => d.level === 4).length;

  return {
    activeHabitsCount: activeCount,
    todayCompletedCount,
    todayProgressPercent,
    currentOverallStreak: overallStreak.currentStreak,
    bestOverallStreak: overallStreak.bestStreak,
    consistencyScore30d: grid30.consistencyScorePercent,
    perfectDaysCount,
  };
}

// -------------------------------------------------------------
// Toggle Inmutable de Completitud Diaria
// -------------------------------------------------------------
export function toggleHabitCompletion(
  logs: HabitLog[],
  habitId: number | string,
  dateStr: string
): { updatedLogs: HabitLog[]; wasAdded: boolean } {
  const habitIdStr = String(habitId);
  const exists = logs.some(
    (l) => String(l.habit_id) === habitIdStr && l.completed_date === dateStr
  );

  if (exists) {
    const updatedLogs = logs.filter(
      (l) => !(String(l.habit_id) === habitIdStr && l.completed_date === dateStr)
    );
    return { updatedLogs, wasAdded: false };
  } else {
    const newLog: HabitLog = {
      id: `local-${habitIdStr}-${dateStr}-${Date.now()}`,
      habit_id: habitId,
      completed_date: dateStr,
      created_at: new Date().toISOString(),
    };
    return { updatedLogs: [...logs, newLog], wasAdded: true };
  }
}

// -------------------------------------------------------------
// Filtrado y Validación de Hábitos
// -------------------------------------------------------------
export function filterHabits(
  habits: Habit[],
  pillar: HabitPillar | "all" = "all",
  search?: string
): Habit[] {
  return habits.filter((h) => {
    if (h.is_archived) return false;
    if (pillar !== "all" && h.pillar !== pillar) return false;
    if (search && search.trim() !== "") {
      const q = search.toLowerCase().trim();
      const titleMatch = h.title.toLowerCase().includes(q);
      const descMatch = (h.description || "").toLowerCase().includes(q);
      return titleMatch || descMatch;
    }
    return true;
  });
}

export function validateHabitPayload(habit: Partial<Habit>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!habit.title || habit.title.trim().length === 0) {
    errors.push("El título del hábito es obligatorio.");
  }

  const validPillars: HabitPillar[] = ["salud", "foco_negocio", "aprendizaje", "personal"];
  if (!habit.pillar || !validPillars.includes(habit.pillar)) {
    errors.push("El pilar seleccionado no es válido (debe ser salud, foco_negocio, aprendizaje o personal).");
  }

  if (
    typeof habit.target_frequency_per_week !== "number" ||
    habit.target_frequency_per_week < 1 ||
    habit.target_frequency_per_week > 7
  ) {
    errors.push("La frecuencia semanal objetivo debe ser un número entre 1 y 7 días.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -------------------------------------------------------------
// Seam de Persistencia Supabase con Fallback a Mock Offline
// -------------------------------------------------------------
export async function fetchHabits(
  client = getBrowserSupabaseClient()
): Promise<Habit[] & { data: Habit[]; isOffline: boolean }> {
  try {
    let query: any = client.from("habits").select("*");
    if (typeof query.eq === "function") {
      const maybeEq = query.eq("is_archived", false);
      if (maybeEq) query = maybeEq;
    }
    if (typeof query.order === "function") {
      const maybeOrder = query.order("position", { ascending: true });
      if (maybeOrder && typeof maybeOrder.order === "function") {
        query = maybeOrder.order("created_at", { ascending: true });
      } else if (maybeOrder) {
        query = maybeOrder;
      }
    }

    const { data, error } = await query;

    if (error) {
      const fallback = [...INITIAL_MOCK_HABITS];
      return Object.assign(fallback, { data: fallback, isOffline: true });
    }
    const rows = (data as Habit[]) || [];
    return Object.assign(rows, { data: rows, isOffline: false });
  } catch (_err) {
    const fallback = [...INITIAL_MOCK_HABITS];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }
}

export async function fetchHabitLogs(
  client = getBrowserSupabaseClient(),
  startDate?: string,
  endDate?: string
): Promise<HabitLog[] & { data: HabitLog[]; isOffline: boolean }> {
  try {
    let query: any = client.from("habit_logs").select("*");
    if (startDate && typeof query.gte === "function") query = query.gte("completed_date", startDate);
    if (endDate && typeof query.lte === "function") query = query.lte("completed_date", endDate);
    if (typeof query.order === "function") {
      query = query.order("completed_date", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      const fallback = [...INITIAL_MOCK_LOGS];
      return Object.assign(fallback, { data: fallback, isOffline: true });
    }
    // Si error === null y data === [], devolver [] (0 días de racha inicial sin mocks fantasma)
    const rows = (data as HabitLog[]) || [];
    return Object.assign(rows, { data: rows, isOffline: false });
  } catch (_err) {
    const fallback = [...INITIAL_MOCK_LOGS];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }
}

export async function restoreDefaultHabitsPack(
  client = getBrowserSupabaseClient(),
  existingHabits: Habit[] = []
): Promise<Habit[]> {
  const existingTitles = new Set(existingHabits.map((h) => h.title.trim().toLowerCase()));
  const missing = INITIAL_MOCK_HABITS.filter(
    (h) => !existingTitles.has(h.title.trim().toLowerCase())
  );

  if (missing.length === 0) return existingHabits;

  const created: Habit[] = [];
  for (const h of missing) {
    const saved = await saveHabit(client, {
      title: h.title,
      description: h.description,
      pillar: h.pillar,
      icon: h.icon,
      target_frequency_per_week: h.target_frequency_per_week,
      color_hex: h.color_hex,
      position: h.position,
    });
    created.push(saved);
  }
  return [...existingHabits, ...created];
}

export async function saveHabit(
  client = getBrowserSupabaseClient(),
  habit: Partial<Habit>
): Promise<Habit> {
  const validation = validateHabitPayload(habit);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  try {
    if (habit.id && typeof habit.id === "number") {
      const { data, error } = await client
        .from("habits")
        .update({
          title: habit.title,
          description: habit.description || "",
          pillar: habit.pillar,
          icon: habit.icon || "CheckCircle2",
          target_frequency_per_week: habit.target_frequency_per_week || 7,
          color_hex: habit.color_hex || "#BF40FA",
          is_archived: habit.is_archived ?? false,
          position: habit.position || 0,
        })
        .eq("id", habit.id)
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    } else {
      const { data, error } = await client
        .from("habits")
        .insert({
          title: habit.title,
          description: habit.description || "",
          pillar: habit.pillar,
          icon: habit.icon || "CheckCircle2",
          target_frequency_per_week: habit.target_frequency_per_week || 7,
          color_hex: habit.color_hex || "#BF40FA",
          is_archived: false,
          position: habit.position || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Habit;
    }
  } catch (err: any) {
    // Retorno mock para modo offline
    return {
      id: habit.id || Date.now(),
      title: habit.title!,
      description: habit.description || "",
      pillar: habit.pillar!,
      icon: habit.icon || "CheckCircle2",
      target_frequency_per_week: habit.target_frequency_per_week || 7,
      color_hex: habit.color_hex || "#BF40FA",
      is_archived: habit.is_archived ?? false,
      position: habit.position || 0,
      created_at: new Date().toISOString(),
    };
  }
}

export async function deleteHabit(
  client = getBrowserSupabaseClient(),
  habitId: number | string
): Promise<boolean> {
  try {
    const { error } = await client
      .from("habits")
      .update({ is_archived: true })
      .eq("id", habitId);

    if (error) throw error;
    return true;
  } catch (_err) {
    return true;
  }
}

export async function logHabitCompletion(
  client = getBrowserSupabaseClient(),
  habitId: number | string,
  dateStr: string,
  notes: string = ""
): Promise<HabitLog> {
  try {
    const { data, error } = await client
      .from("habit_logs")
      .insert({
        habit_id: habitId,
        completed_date: dateStr,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data as HabitLog;
  } catch (_err) {
    return {
      id: `offline-${habitId}-${dateStr}`,
      habit_id: habitId,
      completed_date: dateStr,
      notes,
      created_at: new Date().toISOString(),
    };
  }
}

export async function removeHabitCompletion(
  client = getBrowserSupabaseClient(),
  habitId: number | string,
  dateStr: string
): Promise<boolean> {
  try {
    const { error } = await client
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_date", dateStr);

    if (error) throw error;
    return true;
  } catch (_err) {
    return true;
  }
}
