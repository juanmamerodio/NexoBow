// web/src/lib/cockpit.ts — Servicio Agregador y Centro de Mando Ejecutivo Diario (Ticket 45)
import { getBrowserSupabaseClient } from "./supabase.ts";
import {
  type FinancialTransaction,
  calculateTransactionAmountInArs,
  formatArs,
  formatUsd,
  DEFAULT_USD_EXCHANGE_RATE,
} from "./finances.ts";
import {
  type ScheduleBlock,
  type DayOfWeek,
  DAYS_OF_WEEK,
  timeToMinutes,
  calculateBlockDurationMinutes,
  SCHEDULE_CATEGORIES,
  fetchScheduleBlocks,
} from "./schedule.ts";
import {
  type AlaynowVideo,
  type VideoProductionStage,
  VIDEO_STAGES,
  fetchAlaynowVideos,
  DEFAULT_MOCK_VIDEOS,
} from "./videos.ts";
import {
  type Habit,
  type HabitLog,
  type HabitPillar,
  HABIT_PILLARS,
  INITIAL_MOCK_HABITS,
  fetchHabits,
  fetchHabitLogs,
  logHabitCompletion,
  removeHabitCompletion,
} from "./streaks.ts";

export interface LeadEntity {
  id: number;
  slug: string;
  name: string;
  niche: string;
  contact_channel?: string;
  whatsapp_link?: string | null;
  demo_url?: string | null;
  social_link?: string | null;
  location?: string;
  city?: string;
  funnel_status: string;
  first_contact_date?: string | null;
  last_contact_date?: string | null;
  response_status?: string;
  meeting_booked?: boolean;
  meeting_date?: string | null;
  potential_value?: string;
  business_status?: string;
  notes?: string | null;
  phone?: string | null;
  created_at?: string;
  last_activity_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface CockpitTtlAlert {
  id: number;
  slug: string;
  name: string;
  niche: string;
  location: string;
  hoursRemaining: number;
  daysRemaining: number;
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
  whatsappUrl: string;
  demoUrl: string;
  funnelStatus: string;
  potentialValue: string;
}

export interface CockpitTodayHabit {
  id: number | string;
  title: string;
  pillar: HabitPillar;
  icon?: string;
  isCompleted: boolean;
  targetWeekly: number;
  colorHex?: string;
}

export interface CockpitTodayScheduleBlock {
  id: number | string;
  title: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isCompleted: boolean;
  isExternal: boolean;
}

export interface CockpitActiveVideo {
  id: number | string;
  title: string;
  stage: VideoProductionStage;
  stageLabel: string;
  stageColor: string;
  targetDate?: string | null;
  thumbnailUrl?: string;
  hasSponsor: boolean;
  sponsorName?: string;
  viewsCount?: number;
}

export interface CockpitCashflowSummary {
  period: string; // YYYY-MM
  incomeArs: number;
  expenseArs: number;
  netCashflowArs: number;
  netMarginPercentage: number;
  formattedIncomeArs: string;
  formattedExpenseArs: string;
  formattedNetCashflowArs: string;
  approxIncomeUsd: number;
  approxNetCashflowUsd: number;
}

export interface CockpitSummary {
  todayDate: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek; // 1..7 (1=Lunes..7=Domingo)
  dayName: string;
  formattedDateEs: string;
  greeting: string;
  ttlAlerts: CockpitTtlAlert[];
  urgentAlertsCount: number;
  todayHabits: CockpitTodayHabit[];
  habitsTodayProgress: number; // 0..100
  habitsCompletedCount: number;
  habitsTotalCount: number;
  todayBlocks: CockpitTodayScheduleBlock[];
  todayBlocksCount: number;
  activeVideo: CockpitActiveVideo | null;
  cashflow: CockpitCashflowSummary;
}

// -------------------------------------------------------------
// Funciones Puras de Agregación y Cálculo
// -------------------------------------------------------------

/**
 * Mapea una fecha a día de la semana 1..7 (1=Lunes..7=Domingo).
 */
export function getTodayDayOfWeek(date?: Date): DayOfWeek {
  const target = date || new Date();
  const day = target.getUTCDay();
  return (day === 0 ? 7 : day) as DayOfWeek;
}

/**
 * Genera enlace de WhatsApp de urgencia con voseo argentino para prospectos por expirar (<48h).
 */
export function buildUrgentWhatsAppUrl(lead: LeadEntity): string {
  const digits = (lead.phone || "").replace(/\D/g, "");
  const demoUrl = lead.demo_url || `https://preview.nexobow.site/${lead.slug}/`;
  const name = (lead.name || "").replace(/^(Lic\.|Dr\.|Dra\.|Mg\.|Abog\.)\s*/i, "").trim();
  const niche = String(lead.niche || "").toLowerCase();

  let noun = "tu consultorio";
  if (["abogado", "juridico", "legal", "contador", "estudio"].some((k) => niche.includes(k))) {
    noun = "tu estudio";
  } else if (["clinica", "estetica", "centro"].some((k) => niche.includes(k))) {
    noun = "tu centro";
  }

  const message = `Hola ${name}! Te aviso de NexoBow que en 48 hs el sistema da de baja la demo que armé para ${noun} (${demoUrl}) para liberar espacio en el servidor. ¿Querés que la mantengamos activa?`;

  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

/**
 * Filtra y ordena los leads con TTL inminente (<48h) o vencidos.
 */
export function filterUrgentTtlLeads(
  leads: LeadEntity[],
  thresholdHours = 48,
  referenceDate?: Date
): CockpitTtlAlert[] {
  const now = (referenceDate || new Date()).getTime();
  const alerts: CockpitTtlAlert[] = [];

  for (const lead of leads) {
    if (!lead.expires_at) continue;

    // Ignorar descartados cerrados
    if (lead.funnel_status === "6. Descartado") continue;

    const expTime = new Date(lead.expires_at).getTime();
    const diffMs = expTime - now;
    const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = diffMs <= 0;
    const isUrgent = isExpired || hoursRemaining <= thresholdHours;

    if (isUrgent) {
      let label = `${hoursRemaining} hs`;
      if (isExpired) {
        label = "Vencido (TTL)";
      } else if (hoursRemaining < 24) {
        label = `${Math.max(0, hoursRemaining)} hs (<24h)`;
      } else {
        label = `${hoursRemaining} hs (<48h)`;
      }

      alerts.push({
        id: lead.id,
        slug: lead.slug,
        name: lead.name,
        niche: lead.niche,
        location: lead.location || lead.city || "Buenos Aires",
        hoursRemaining,
        daysRemaining,
        label,
        isUrgent: true,
        isExpired,
        whatsappUrl: buildUrgentWhatsAppUrl(lead) || lead.whatsapp_link || "",
        demoUrl: lead.demo_url || `https://preview.nexobow.site/${lead.slug}/`,
        funnelStatus: lead.funnel_status,
        potentialValue: lead.potential_value || "$189.999 ARS",
      });
    }
  }

  // Ordenar: primero los más críticos (vencidos primero, luego menor tiempo restante)
  return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

/**
 * Extrae y ordena los bloques de horario para el día de la semana actual.
 */
export function extractTodayScheduleBlocks(
  blocks: ScheduleBlock[],
  dayOfWeek: DayOfWeek
): CockpitTodayScheduleBlock[] {
  const filtered = blocks.filter((b) => Number(b.day_of_week) === Number(dayOfWeek));

  // Ordenar por hora de inicio cronológica
  filtered.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  return filtered.map((b) => {
    const catConfig = SCHEDULE_CATEGORIES.find((c) => c.id === b.category);
    return {
      id: b.id || Math.random(),
      title: b.title,
      category: b.category,
      categoryLabel: catConfig?.label || b.category,
      categoryColor: catConfig?.color || "#BF40FA",
      startTime: b.start_time,
      endTime: b.end_time,
      durationMinutes: calculateBlockDurationMinutes(b.start_time, b.end_time),
      isCompleted: Boolean(b.is_completed),
      isExternal: Boolean(b.is_external),
    };
  });
}

/**
 * Selecciona el video prioritario actualmente en producción en Alaynow.
 */
export function determineActiveVideo(videos: AlaynowVideo[]): CockpitActiveVideo | null {
  if (!videos || videos.length === 0) return null;

  // Prioridad de foco editorial
  const stagePriority: Record<VideoProductionStage, number> = {
    edicion: 1,
    grabacion: 2,
    guion: 3,
    programado: 4,
    idea: 5,
    publicado: 6,
  };

  const sorted = [...videos].sort((a, b) => {
    const prioA = stagePriority[a.stage] || 99;
    const prioB = stagePriority[b.stage] || 99;
    if (prioA !== prioB) return prioA - prioB;
    // Si tienen la misma etapa, más reciente primero
    return (b.id ? Number(b.id) : 0) - (a.id ? Number(a.id) : 0);
  });

  const best = sorted[0];
  if (!best) return null;

  const stageCfg = VIDEO_STAGES.find((s) => s.stage === best.stage);

  return {
    id: best.id || 0,
    title: best.title,
    stage: best.stage,
    stageLabel: stageCfg?.label || best.stage,
    stageColor: stageCfg?.color || "#BF40FA",
    targetDate: best.target_date || null,
    thumbnailUrl: best.thumbnail_url || "",
    hasSponsor: Boolean(best.has_sponsor),
    sponsorName: best.sponsor_name || "",
    viewsCount: best.views_count,
  };
}

/**
 * Consolida el balance y cashflow neto mensual del mes indicado.
 */
export function computeCockpitCashflow(
  transactions: FinancialTransaction[],
  period?: string,
  exchangeRate = DEFAULT_USD_EXCHANGE_RATE
): CockpitCashflowSummary {
  const targetPeriod = period || new Date().toISOString().substring(0, 7);
  const periodTxs = transactions.filter(
    (tx) => tx.transaction_date && tx.transaction_date.startsWith(targetPeriod)
  );

  let incomeArs = 0;
  let expenseArs = 0;

  for (const tx of periodTxs) {
    const rate = tx.exchange_rate && tx.exchange_rate > 0 ? tx.exchange_rate : exchangeRate;
    const amountInArs = calculateTransactionAmountInArs({
      amount: tx.amount,
      currency: tx.currency,
      exchange_rate: rate,
    });

    if (tx.flow_type === "ingreso") {
      incomeArs += amountInArs;
    } else {
      expenseArs += amountInArs;
    }
  }

  incomeArs = Math.round(incomeArs);
  expenseArs = Math.round(expenseArs);
  const netCashflowArs = incomeArs - expenseArs;
  const netMarginPercentage =
    incomeArs > 0 ? Math.round(((incomeArs - expenseArs) / incomeArs) * 100) : 0;

  const approxIncomeUsd = Math.round((incomeArs / exchangeRate) * 100) / 100;
  const approxNetCashflowUsd = Math.round((netCashflowArs / exchangeRate) * 100) / 100;

  return {
    period: targetPeriod,
    incomeArs,
    expenseArs,
    netCashflowArs,
    netMarginPercentage,
    formattedIncomeArs: formatArs(incomeArs),
    formattedExpenseArs: formatArs(expenseArs),
    formattedNetCashflowArs: formatArs(netCashflowArs),
    approxIncomeUsd,
    approxNetCashflowUsd,
  };
}

/**
 * Mapea los hábitos activos y su estado de completitud para la fecha indicada.
 */
export function mapTodayHabits(
  habits: Habit[],
  habitLogs: HabitLog[],
  todayDateStr: string
): CockpitTodayHabit[] {
  const activeHabits = habits.filter((h) => !h.is_archived);
  const completedIds = new Set(
    habitLogs
      .filter((l) => l.completed_date === todayDateStr)
      .map((l) => String(l.habit_id))
  );

  return activeHabits.map((h) => ({
    id: h.id,
    title: h.title,
    pillar: h.pillar,
    icon: h.icon,
    colorHex: h.color_hex,
    targetWeekly: h.target_frequency_per_week || 7,
    isCompleted: completedIds.has(String(h.id)),
  }));
}

/**
 * Agregador puro del Cockpit que unifica todos los submódulos.
 */
export function aggregateCockpitData(params: {
  leads: LeadEntity[];
  habits: Habit[];
  habitLogs: HabitLog[];
  scheduleBlocks: ScheduleBlock[];
  videos: AlaynowVideo[];
  transactions: FinancialTransaction[];
  today?: Date;
  exchangeRate?: number;
}): CockpitSummary {
  const today = params.today || new Date();
  const todayDateStr = today.toISOString().substring(0, 10);
  const currentPeriod = todayDateStr.substring(0, 7);
  const dayOfWeek = getTodayDayOfWeek(today);

  const dayObj = DAYS_OF_WEEK.find((d) => d.day === dayOfWeek);
  const dayName = dayObj ? dayObj.name : "Hoy";

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  };
  const formattedDateEs = today.toLocaleDateString("es-AR", options);

  // Alertas TTL
  const ttlAlerts = filterUrgentTtlLeads(params.leads, 48, today);

  // Hábitos de hoy
  const todayHabits = mapTodayHabits(params.habits, params.habitLogs, todayDateStr);
  const habitsCompletedCount = todayHabits.filter((h) => h.isCompleted).length;
  const habitsTotalCount = todayHabits.length;
  const habitsTodayProgress =
    habitsTotalCount > 0 ? Math.round((habitsCompletedCount / habitsTotalCount) * 100) : 0;

  // Bloques de agenda de hoy
  const todayBlocks = extractTodayScheduleBlocks(params.scheduleBlocks, dayOfWeek);

  // Video en producción
  const activeVideo = determineActiveVideo(params.videos);

  // Cashflow mensual
  const cashflow = computeCockpitCashflow(
    params.transactions,
    currentPeriod,
    params.exchangeRate || DEFAULT_USD_EXCHANGE_RATE
  );

  const hour = today.getUTCHours();
  let greeting = "¡Buenos días, Juanma!";
  if (hour >= 13 && hour < 20) {
    greeting = "¡Buenas tardes, Juanma!";
  } else if (hour >= 20 || hour < 6) {
    greeting = "¡Buenas noches, Juanma!";
  }

  return {
    todayDate: todayDateStr,
    dayOfWeek,
    dayName,
    formattedDateEs,
    greeting,
    ttlAlerts,
    urgentAlertsCount: ttlAlerts.length,
    todayHabits,
    habitsTodayProgress,
    habitsCompletedCount,
    habitsTotalCount,
    todayBlocks,
    todayBlocksCount: todayBlocks.length,
    activeVideo,
    cashflow,
  };
}

// -------------------------------------------------------------
// Seam de Persistencia & Consulta Reactiva para Cockpit
// -------------------------------------------------------------

export async function fetchDailyCockpitSummary(today?: Date, customClient?: any): Promise<CockpitSummary> {
  const supabase = customClient || getBrowserSupabaseClient();
  const currentDate = today || new Date();

  let leads: LeadEntity[] = [];
  let habits: Habit[] = [];
  let habitLogs: HabitLog[] = [];
  let blocks: ScheduleBlock[] = [];
  let videos: AlaynowVideo[] = [];
  let transactions: FinancialTransaction[] = [];

  try {
    const { data: leadsData } = await supabase
      .from("leads")
      .select("*")
      .order("id", { ascending: false });
    if (leadsData) {
      leads = leadsData as LeadEntity[];
    }
  } catch (err) {
    console.warn("Cockpit: usando fallback offline para leads");
  }

  try {
    const remoteHabits = await fetchHabits(supabase);
    if (remoteHabits) {
      habits = remoteHabits;
    }
  } catch (err) {
    habits = INITIAL_MOCK_HABITS;
  }

  try {
    const remoteLogs = await fetchHabitLogs(supabase);
    if (remoteLogs) {
      habitLogs = remoteLogs;
    }
  } catch (err) {
    console.warn("Cockpit: usando fallback offline para logs de hábitos");
  }

  try {
    const remoteBlocks = await fetchScheduleBlocks();
    if (remoteBlocks) {
      blocks = remoteBlocks;
    }
  } catch (err) {
    console.warn("Cockpit: usando fallback offline para horarios");
  }

  try {
    const remoteVideos = await fetchAlaynowVideos();
    if (remoteVideos) {
      videos = remoteVideos;
    }
  } catch (err) {
    videos = DEFAULT_MOCK_VIDEOS;
  }

  try {
    const { data: txsData } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });
    if (txsData) {
      transactions = txsData as FinancialTransaction[];
    }
  } catch (err) {
    console.warn("Cockpit: usando fallback offline para finanzas");
  }

  return aggregateCockpitData({
    leads,
    habits,
    habitLogs,
    scheduleBlocks: blocks,
    videos,
    transactions,
    today: currentDate,
  });
}
