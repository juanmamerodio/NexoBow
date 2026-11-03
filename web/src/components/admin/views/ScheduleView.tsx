// web/src/components/admin/views/ScheduleView.tsx — Centro de Horarios & Time-Blocking
import React, { useState, useEffect, useMemo } from "react";
import {
  type ScheduleBlock,
  type ScheduleCategory,
  type DayOfWeek,
  type ExternalCalendarEvent,
  DAYS_OF_WEEK,
  SCHEDULE_CATEGORIES,
  timeToMinutes,
  minutesToTime,
  calculateBlockDurationHours,
  validateTimeRange,
  detectBlockOverlap,
  computeCategoryFocusHours,
  computeTotalFocusMetrics,
  groupBlocksByDay,
  fetchCalendarEventsSeam,
  convertCalendarEventToScheduleBlock,
  mergeScheduleWithExternalEvents,
  fetchScheduleBlocks,
  saveScheduleBlock,
  toggleScheduleBlockCompletion,
  deleteScheduleBlock,
} from "../../../lib/schedule.ts";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Save,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Layers,
  Flame,
  Search,
  Filter,
  Check,
  Zap,
} from "lucide-react";

interface ScheduleViewProps {
  onNavigate?: (path: string) => void;
}

// Semilla inicial representativa de la semana ideal del fundador
const INITIAL_SCHEDULE_BLOCKS: ScheduleBlock[] = [
  // Lunes (1)
  {
    id: 1,
    title: "Prospección Fría: Nutricionistas & Abogados",
    description: "Scouting con Maps Platform y envío de notas personalizadas por WhatsApp",
    category: "prospeccion",
    day_of_week: 1,
    start_time: "08:30",
    end_time: "10:30",
    is_completed: true,
    is_recurring: true,
  },
  {
    id: 2,
    title: "Deep Work: Arquitectura & Templates REA",
    description: "Desarrollo de componentes Astro, ingeniería inversa y 0-JS",
    category: "desarrollo",
    day_of_week: 1,
    start_time: "11:00",
    end_time: "14:00",
    is_completed: true,
    is_recurring: true,
  },
  {
    id: 3,
    title: "Revisión Pipeline & Demos Cloudflare",
    description: "Auditoría dual-viewport y sincronización de previsualizaciones",
    category: "desarrollo",
    day_of_week: 1,
    start_time: "15:00",
    end_time: "16:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 4,
    title: "Entrenamiento & Gimnasio",
    description: "Sesión de fuerza y acondicionamiento",
    category: "personal",
    day_of_week: 1,
    start_time: "18:00",
    end_time: "19:30",
    is_completed: false,
    is_recurring: true,
  },
  // Martes (2)
  {
    id: 5,
    title: "AlayNow: Grabación Videos YouTube",
    description: "Rodaje con setup AfterBow en alta resolución",
    category: "alaynow_grabacion",
    day_of_week: 2,
    start_time: "09:00",
    end_time: "12:00",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 6,
    title: "AlayNow: Edición & Guiones Audiovisuales",
    description: "Montaje, miniaturas y estructuración de ganchos",
    category: "alaynow_grabacion",
    day_of_week: 2,
    start_time: "13:00",
    end_time: "15:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 7,
    title: "Follow-up WhatsApp & Objeciones",
    description: "Manejo de objeciones comerciales con skill objection-handler",
    category: "prospeccion",
    day_of_week: 2,
    start_time: "16:00",
    end_time: "17:30",
    is_completed: false,
    is_recurring: true,
  },
  // Miércoles (3)
  {
    id: 8,
    title: "Scouting Masivo: Places API & Fichas",
    description: "Generación de fichas con voseo argentino y dolores Hormozi",
    category: "prospeccion",
    day_of_week: 3,
    start_time: "09:00",
    end_time: "11:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 9,
    title: "Desarrollo: Nuevos Arquetipos Visuales",
    description: "ThemeSwitcher y desacoplamiento de branding",
    category: "desarrollo",
    day_of_week: 3,
    start_time: "12:00",
    end_time: "14:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 10,
    title: "Reunión de Cierre / Demo con Prospectos",
    description: "Videollamada de presentación de landing y propuesta B2B",
    category: "reunion",
    day_of_week: 3,
    start_time: "15:30",
    end_time: "17:00",
    is_completed: false,
    is_recurring: true,
  },
  // Jueves (4)
  {
    id: 11,
    title: "AlayNow: Grabación & Shorts",
    description: "Batching de contenido vertical para YouTube y redes",
    category: "alaynow_grabacion",
    day_of_week: 4,
    start_time: "09:00",
    end_time: "11:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 12,
    title: "Deep Work: Módulos Cockpit Supabase",
    description: "Desarrollo de CRM, finanzas, horarios y hábitos",
    category: "desarrollo",
    day_of_week: 4,
    start_time: "12:30",
    end_time: "15:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 13,
    title: "Calls de Calificación & Onboarding",
    description: "Reunión de setup con cliente nuevo",
    category: "reunion",
    day_of_week: 4,
    start_time: "16:00",
    end_time: "17:30",
    is_completed: false,
    is_recurring: true,
  },
  // Viernes (5)
  {
    id: 14,
    title: "Cierre Semanal de Prospección & WhatsApp",
    description: "Consolidación de respuestas y agendamientos",
    category: "prospeccion",
    day_of_week: 5,
    start_time: "09:00",
    end_time: "11:00",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 15,
    title: "Auditoría de Sitios & QA Playwright",
    description: "Verificación de 0-JS en web/ y presupuesto de JS en templates",
    category: "desarrollo",
    day_of_week: 5,
    start_time: "11:30",
    end_time: "14:00",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 16,
    title: "Revisión de Finanzas & Cashflow Mensual",
    description: "Balance de ingresos, gastos fijos y conversiones",
    category: "desarrollo",
    day_of_week: 5,
    start_time: "15:00",
    end_time: "16:30",
    is_completed: false,
    is_recurring: true,
  },
  {
    id: 17,
    title: "Reunión de Planificación Estratégica",
    description: "Alineación de objetivos de la próxima semana",
    category: "reunion",
    day_of_week: 5,
    start_time: "17:00",
    end_time: "18:30",
    is_completed: false,
    is_recurring: true,
  },
  // Sábado (6)
  {
    id: 18,
    title: "Planificación & Revisión Semanal Founder",
    description: "Retrospectiva de hábitos y prioridades de crecimiento",
    category: "personal",
    day_of_week: 6,
    start_time: "10:00",
    end_time: "12:00",
    is_completed: false,
    is_recurring: true,
  },
  // Domingo (7)
  {
    id: 19,
    title: "Preparación de la Semana Ideal & Agenda",
    description: "Ajuste de bloques y objetivos clave",
    category: "personal",
    day_of_week: 7,
    start_time: "18:00",
    end_time: "19:30",
    is_completed: false,
    is_recurring: true,
  },
];

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onNavigate }) => {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(INITIAL_SCHEDULE_BLOCKS);
  const [loading, setLoading] = useState(false);
  const [isSyncingGcal, setIsSyncingGcal] = useState(false);
  const [gcalSyncedCount, setGcalSyncedCount] = useState<number>(0);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de Alta / Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<ScheduleCategory>("desarrollo");
  const [formDayOfWeek, setFormDayOfWeek] = useState<DayOfWeek>(1);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("11:00");
  const [formIsCompleted, setFormIsCompleted] = useState(false);
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formError, setFormError] = useState("");

  // Carga inicial desde Supabase
  useEffect(() => {
    let mounted = true;
    const loadFromSupabase = async () => {
      setLoading(true);
      try {
        const data = await fetchScheduleBlocks();
        if (mounted && data.length > 0) {
          setBlocks(data);
        }
      } catch (err) {
        console.warn("Supabase schedule_blocks offline, utilizando datos locales precalibrados.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadFromSupabase();
    return () => {
      mounted = false;
    };
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtrado de bloques
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (selectedCategory !== "all" && b.category !== selectedCategory) return false;
      if (statusFilter === "completed" && !b.is_completed) return false;
      if (statusFilter === "pending" && b.is_completed) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(query);
        const matchDesc = (b.description || "").toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [blocks, selectedCategory, statusFilter, searchQuery]);

  // Métricas calculadas
  const focusMetrics = useMemo(() => {
    return computeTotalFocusMetrics(blocks);
  }, [blocks]);

  const categoryHours = useMemo(() => {
    return computeCategoryFocusHours(blocks);
  }, [blocks]);

  const groupedDays = useMemo(() => {
    return groupBlocksByDay(filteredBlocks);
  }, [filteredBlocks]);

  // Detección de solapamiento en vivo para el formulario
  const formOverlapWarning = useMemo(() => {
    if (!formStartTime || !formEndTime) return null;
    const validation = validateTimeRange(formStartTime, formEndTime);
    if (!validation.valid) return null;

    const candidate = {
      day_of_week: formDayOfWeek,
      start_time: formStartTime,
      end_time: formEndTime,
    };

    for (const b of blocks) {
      if (editingBlock && b.id === editingBlock.id) continue;
      if (detectBlockOverlap(candidate, b)) {
        return `⚠️ Atención: Se solapa con '${b.title}' (${b.start_time} - ${b.end_time})`;
      }
    }
    return null;
  }, [blocks, formDayOfWeek, formStartTime, formEndTime, editingBlock]);

  // Handlers de bloques
  const handleToggleCompletion = async (block: ScheduleBlock) => {
    const nextState = !block.is_completed;
    // Actualización optimista
    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, is_completed: nextState } : b))
    );

    if (block.id && typeof block.id === "number") {
      const res = await toggleScheduleBlockCompletion(block.id, nextState);
      if (!res.ok) {
        showToast("error", `Error actualizando estado en Supabase: ${res.error}`);
      }
    }
  };

  const handleOpenCreateModal = (day?: DayOfWeek) => {
    setEditingBlock(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("prospeccion");
    setFormDayOfWeek(day || 1);
    setFormStartTime("09:00");
    setFormEndTime("11:00");
    setFormIsCompleted(false);
    setFormIsRecurring(true);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setFormTitle(block.title);
    setFormDescription(block.description || "");
    setFormCategory(block.category);
    setFormDayOfWeek(block.day_of_week);
    setFormStartTime(block.start_time);
    setFormEndTime(block.end_time);
    setFormIsCompleted(Boolean(block.is_completed));
    setFormIsRecurring(block.is_recurring !== false);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("El título del bloque es obligatorio.");
      return;
    }

    const rangeCheck = validateTimeRange(formStartTime, formEndTime);
    if (!rangeCheck.valid) {
      setFormError(rangeCheck.error || "Rango horario inválido.");
      return;
    }

    const payload: Omit<ScheduleBlock, "id"> & { id?: number | string } = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      day_of_week: formDayOfWeek,
      start_time: formStartTime,
      end_time: formEndTime,
      is_completed: formIsCompleted,
      is_recurring: formIsRecurring,
    };

    if (editingBlock) {
      payload.id = editingBlock.id;
      // Actualización optimista
      setBlocks((prev) =>
        prev.map((b) => (b.id === editingBlock.id ? { ...b, ...payload } : b))
      );
      showToast("success", "Bloque actualizado correctamente");
      setIsModalOpen(false);

      try {
        await saveScheduleBlock(payload);
      } catch (err: any) {
        console.warn("Error persistiendo bloque en Supabase:", err);
      }
    } else {
      const tempId = Date.now();
      const optimisticBlock: ScheduleBlock = { ...payload, id: tempId };
      setBlocks((prev) => [...prev, optimisticBlock]);
      showToast("success", "Nuevo bloque de trabajo añadido a la semana ideal");
      setIsModalOpen(false);

      try {
        // Enviar sin ID para que Supabase ejecute INSERT y asigne identidad
        const res = await saveScheduleBlock(payload);
        if (res.ok && res.data?.id) {
          setBlocks((prev) =>
            prev.map((b) => (b.id === tempId ? { ...b, id: res.data!.id } : b))
          );
        }
      } catch (err: any) {
        console.warn("Error persistiendo bloque en Supabase:", err);
      }
    }
  };

  const handleDeleteBlock = async (blockId: number | string) => {
    if (!confirm("¿Eliminar este bloque de trabajo de la semana ideal?")) return;
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setIsModalOpen(false);
    showToast("success", "Bloque eliminado.");

    try {
      await deleteScheduleBlock(blockId);
    } catch (err) {
      console.warn("Error eliminando en Supabase:", err);
    }
  };

  // Sincronización Google Calendar Seam
  const handleSyncGoogleCalendar = async () => {
    setIsSyncingGcal(true);
    try {
      const gcalEvents = await fetchCalendarEventsSeam();
      const merged = mergeScheduleWithExternalEvents(blocks, gcalEvents);
      setBlocks(merged);
      setGcalSyncedCount(gcalEvents.length);
      showToast(
        "success",
        `Google Calendar sincronizado con éxito. ${gcalEvents.length} eventos externos integrados sin colisiones.`
      );
    } catch (err: any) {
      showToast("error", `Error sincronizando Google Calendar: ${err.message}`);
    } finally {
      setIsSyncingGcal(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast de notificación */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-[#0B0D12] border-emerald-500/40 text-emerald-300"
              : "bg-[#0B0D12] border-red-500/40 text-red-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{notification.message}</span>
        </div>
      )}

      {/* Encabezado Ejecutivo */}
      <div
        className="rounded-2xl p-6 lg:p-8 border relative overflow-hidden"
        style={{
          backgroundColor: "#0B0D12",
          borderColor: "rgba(191, 64, 250, 0.25)",
          boxShadow: "0 20px 40px -15px rgba(4, 6, 7, 0.9)",
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5"
                style={{
                  backgroundColor: "rgba(91, 42, 98, 0.4)",
                  borderColor: "rgba(191, 64, 250, 0.4)",
                  color: "#E3D9FC",
                }}
              >
                <Sparkles className="w-3 h-3 text-[#BF40FA]" />
                Semana Ideal Activa
              </span>
              <span className="text-zinc-500 text-xs font-mono">Time-Blocking & Foco</span>
              {gcalSyncedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {gcalSyncedCount} GCal Events
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Horarios & <span style={{ color: "#BF40FA" }}>Time-Blocking</span> Semanal
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Estructuración de la semana ideal del fundador: bloques de foco categorizados,
              conmutador de cumplimiento de hábitos y sincronización con Google Calendar.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSyncGoogleCalendar}
              disabled={isSyncingGcal}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border disabled:opacity-50"
              style={{
                backgroundColor: "#040607",
                borderColor: "rgba(59, 130, 246, 0.4)",
                color: "#60A5FA",
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGcal ? "animate-spin" : ""}`} />
              <span>{isSyncingGcal ? "Sincronizando..." : "Sincronizar Google Calendar"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              style={{
                backgroundColor: "#BF40FA",
                color: "#FFFFFF",
                boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Bloque</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Foco y Cumplimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Horas Planificadas */}
        <div
          className="p-5 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">Horas Semanales</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(4, 6, 7, 0.6)" }}
            >
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {focusMetrics.totalHours.toFixed(1)} <span className="text-xs text-zinc-500 font-normal">hrs</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {focusMetrics.plannedBlocks} bloques estructurados
          </p>
        </div>

        {/* KPI 2: Horas Cumplidas */}
        <div
          className="p-5 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">Horas Cumplidas</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(4, 6, 7, 0.6)" }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-400">
              {focusMetrics.completedHours.toFixed(1)} <span className="text-xs text-zinc-500 font-normal">hrs</span>
            </p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {focusMetrics.completionRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {focusMetrics.completedBlocks} de {focusMetrics.plannedBlocks} completados
          </p>
        </div>

        {/* KPI 3: Deep Work & Prospección */}
        <div
          className="p-5 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">Deep Work + Ventas</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(4, 6, 7, 0.6)" }}
            >
              <Zap className="w-4 h-4 text-[#BF40FA]" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {(categoryHours.desarrollo.hours + categoryHours.prospeccion.hours).toFixed(1)}{" "}
            <span className="text-xs text-zinc-500 font-normal">hrs</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Foco prioritario en código y ventas
          </p>
        </div>

        {/* KPI 4: Sincronización Calendar */}
        <div
          className="p-5 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">Google Calendar</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(4, 6, 7, 0.6)" }}
            >
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-400">
            {gcalSyncedCount > 0 ? "Activo" : "Conectado"}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {gcalSyncedCount > 0 ? `${gcalSyncedCount} eventos integrados` : "Seam de Calendar listo"}
          </p>
        </div>
      </div>

      {/* Barra de Distribución de Foco por Categoría */}
      <div
        className="p-5 rounded-2xl border"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#BF40FA]" />
            Distribución de la Semana Ideal
          </span>
          <span className="text-xs font-mono text-zinc-400">
            {focusMetrics.totalHours.toFixed(1)} hrs totales
          </span>
        </div>

        {/* Segmentos apilados */}
        <div className="h-3 w-full bg-[#040607] rounded-full overflow-hidden flex border border-zinc-800">
          {SCHEDULE_CATEGORIES.map((cat) => {
            const data = categoryHours[cat.id];
            if (data.percentage <= 0) return null;
            return (
              <div
                key={cat.id}
                title={`${cat.label}: ${data.hours.toFixed(1)}h (${data.percentage.toFixed(1)}%)`}
                style={{
                  width: `${data.percentage}%`,
                  backgroundColor: cat.color,
                }}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
        </div>

        {/* Leyenda interactiva de categorías */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 text-xs">
          {SCHEDULE_CATEGORIES.map((cat) => {
            const data = categoryHours[cat.id];
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected ? "ring-2 ring-purple-500" : ""
                }`}
                style={{
                  backgroundColor: cat.badgeBg,
                  borderColor: cat.borderColor,
                }}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-white truncate">{cat.label}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {data.hours.toFixed(1)} hrs ({data.percentage.toFixed(0)}%)
                  </p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-300">
                  {data.blocksCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Estado:
          </span>
          {(["all", "pending", "completed"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStatusFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                statusFilter === mode
                  ? "bg-[#BF40FA] text-white border-[#BF40FA]"
                  : "bg-[#0B0D12] text-zinc-400 border-zinc-800 hover:text-white"
              }`}
            >
              {mode === "all" ? "Todos" : mode === "pending" ? "Pendientes" : "Cumplidos"}
            </button>
          ))}

          {selectedCategory !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-2 underline cursor-pointer"
            >
              <X className="w-3 h-3" />
              Limpiar categoría
            </button>
          )}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar bloque o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Matriz Horaria Semanal (7 Columnas: Lunes a Domingo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAYS_OF_WEEK.map((dayItem) => {
          const dayBlocks = groupedDays[dayItem.day] || [];
          const dayHours = dayBlocks.reduce(
            (acc, b) => acc + calculateBlockDurationHours(b.start_time, b.end_time),
            0
          );
          const completedCount = dayBlocks.filter((b) => b.is_completed).length;

          return (
            <div
              key={dayItem.day}
              className="flex flex-col rounded-2xl border bg-[#0B0D12] overflow-hidden min-h-[420px]"
              style={{ borderColor: "#1A1D26" }}
            >
              {/* Encabezado del Día */}
              <div
                className="p-3 border-b flex items-center justify-between"
                style={{
                  backgroundColor: "#07090E",
                  borderColor: "#1A1D26",
                }}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{dayItem.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({dayItem.short})</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400 font-mono">
                    <span>{dayHours.toFixed(1)}h</span>
                    <span>•</span>
                    <span className={completedCount === dayBlocks.length && dayBlocks.length > 0 ? "text-emerald-400 font-semibold" : ""}>
                      {completedCount}/{dayBlocks.length}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  title={`Añadir bloque el ${dayItem.name}`}
                  onClick={() => handleOpenCreateModal(dayItem.day)}
                  className="w-6 h-6 rounded-lg bg-zinc-800/60 hover:bg-purple-600/40 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista de Bloques del Día */}
              <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
                {dayBlocks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-600">
                    <Clock className="w-5 h-5 mb-1.5 opacity-40" />
                    <p className="text-[11px]">Sin bloques</p>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal(dayItem.day)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 mt-2 cursor-pointer font-medium"
                    >
                      + Añadir
                    </button>
                  </div>
                ) : (
                  dayBlocks.map((b) => {
                    const catConfig =
                      SCHEDULE_CATEGORIES.find((c) => c.id === b.category) ||
                      SCHEDULE_CATEGORIES[0];
                    const durationHours = calculateBlockDurationHours(
                      b.start_time,
                      b.end_time
                    );

                    return (
                      <div
                        key={b.id}
                        className={`rounded-xl p-2.5 border transition-all text-left relative group ${
                          b.is_completed
                            ? "bg-[#07090E] opacity-75 border-zinc-800/60"
                            : "bg-[#040607] hover:border-zinc-700"
                        }`}
                        style={{
                          borderLeftWidth: "3px",
                          borderLeftColor: catConfig.color,
                        }}
                      >
                        {/* Fila superior: Horario y Toggle Cumplimiento */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-mono font-semibold text-zinc-300">
                            {b.start_time} - {b.end_time}
                          </span>

                          <div className="flex items-center gap-1">
                            {b.is_external && (
                              <span
                                title="Sincronizado desde Google Calendar"
                                className="w-4 h-4 rounded flex items-center justify-center bg-blue-500/20 text-blue-400"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleCompletion(b)}
                              title={b.is_completed ? "Marcar como pendiente" : "Marcar como cumplido"}
                              className="cursor-pointer text-zinc-500 hover:text-white transition-all"
                            >
                              {b.is_completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 hover:text-emerald-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Título del Bloque */}
                        <h4
                          className={`text-xs font-bold leading-snug line-clamp-2 ${
                            b.is_completed ? "line-through text-zinc-400" : "text-white"
                          }`}
                        >
                          {b.title}
                        </h4>

                        {/* Descripción opcional */}
                        {b.description && (
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                            {b.description}
                          </p>
                        )}

                        {/* Alerta de Solapamiento / Colisión */}
                        {b.metadata?.has_collision && (
                          <div className="flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-400">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">Solapamiento detectado</span>
                          </div>
                        )}

                        {/* Badge de Categoría y Duración */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/40 text-[9px]">
                          <span
                            className="px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: catConfig.badgeBg,
                              color: catConfig.color,
                            }}
                          >
                            {catConfig.label.split(" ")[0]}
                          </span>

                          <span className="text-zinc-500 font-mono">
                            {durationHours.toFixed(1)}h
                          </span>
                        </div>

                        {/* Acciones flotantes en hover */}
                        <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-1 bg-[#040607]/90 rounded-md p-0.5 shadow-lg border border-zinc-800">
                          <button
                            type="button"
                            title="Editar bloque"
                            onClick={() => handleOpenEditModal(b)}
                            className="p-1 hover:text-purple-400 text-zinc-400 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Eliminar bloque"
                            onClick={() => handleDeleteBlock(b.id!)}
                            className="p-1 hover:text-red-400 text-zinc-400 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Alta / Edición de Bloque */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative"
            style={{ backgroundColor: "#0B0D12", borderColor: "rgba(191, 64, 250, 0.3)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#BF40FA]" />
                  {editingBlock ? "Editar Bloque de Foco" : "Nuevo Bloque de Trabajo Profundo"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Estructuración de tiempo para la semana ideal del fundador
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            {formOverlapWarning && (
              <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{formOverlapWarning}</span>
              </div>
            )}

            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Título del Bloque *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Prospección Nutricionistas & Abogados CABA"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Categoría de Foco
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SCHEDULE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategory(cat.id)}
                      className={`p-2 rounded-xl border text-xs text-left cursor-pointer transition-all flex items-center gap-2 ${
                        formCategory === cat.id
                          ? "ring-2 ring-purple-500 font-bold text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      style={{
                        backgroundColor: cat.badgeBg,
                        borderColor: cat.borderColor,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Día de la Semana */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Día de la Semana
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setFormDayOfWeek(d.day)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer border transition-all text-center ${
                        formDayOfWeek === d.day
                          ? "bg-[#BF40FA] text-white border-[#BF40FA]"
                          : "bg-[#040607] text-zinc-400 border-zinc-800 hover:text-white"
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rango Horario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Hora Inicio (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Hora Fin (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Duración calculada */}
              {formStartTime && formEndTime && (
                <div className="text-[11px] text-zinc-400 flex items-center justify-between px-1">
                  <span>Duración estimada de foco:</span>
                  <span className="font-mono font-semibold text-[#BF40FA]">
                    {calculateBlockDurationHours(formStartTime, formEndTime).toFixed(1)} horas
                  </span>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descripción / Objetivos concretos
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de la sesión, entregables esperados..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsRecurring}
                    onChange={(e) => setFormIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#040607] border-zinc-800 text-purple-600 focus:ring-0"
                  />
                  <span>Recurrente semanal</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsCompleted}
                    onChange={(e) => setFormIsCompleted(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#040607] border-zinc-800 text-purple-600 focus:ring-0"
                  />
                  <span>Marcar como cumplido</span>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                {editingBlock ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(editingBlock.id!)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2 px-4 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800 cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl text-xs font-semibold text-white bg-[#BF40FA] hover:bg-[#a930de] shadow-lg shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Bloque</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
