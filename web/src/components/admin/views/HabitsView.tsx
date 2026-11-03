// web/src/components/admin/views/HabitsView.tsx — Hábitos & Disciplina: Heatmap de Consistencia y Rachas
import React, { useState, useEffect, useMemo } from "react";
import {
  type Habit,
  type HabitLog,
  type HabitPillar,
  type HeatmapDay,
  HABIT_PILLARS,
  INITIAL_MOCK_HABITS,
  INITIAL_MOCK_LOGS,
  formatDateIso,
  addDays,
  calculateStreak,
  calculateHabitStreakMetrics,
  generateHeatmapGrid,
  computeOverallDisciplineKpis,
  toggleHabitCompletion,
  filterHabits,
  validateHabitPayload,
  fetchHabits,
  fetchHabitLogs,
  saveHabit,
  deleteHabit,
  logHabitCompletion,
  removeHabitCompletion,
} from "../../../lib/streaks.ts";
import {
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Search,
  RefreshCw,
  X,
  Save,
  Trash2,
  Edit2,
  Sparkles,
  Calendar,
  Dumbbell,
  Droplets,
  Users,
  Code2,
  BookOpen,
  Heart,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Target,
  Clock,
  Shield,
  Activity,
  Award,
} from "lucide-react";

interface HabitsViewProps {
  onNavigate?: (path: string) => void;
}

// Mapa de iconos seleccionables para los hábitos
const AVAILABLE_ICONS: Record<string, React.ElementType> = {
  CheckCircle2,
  Dumbbell,
  Droplets,
  Users,
  Code2,
  BookOpen,
  Heart,
  Flame,
  Target,
  Sparkles,
  Shield,
  Activity,
};

export const HabitsView: React.FC<HabitsViewProps> = ({ onNavigate }) => {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_MOCK_HABITS);
  const [logs, setLogs] = useState<HabitLog[]>(INITIAL_MOCK_LOGS);
  const [loading, setLoading] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<HabitPillar | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [heatmapDaysSpan, setHeatmapDaysSpan] = useState<90 | 365>(90);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Fecha de referencia (por defecto hoy)
  const todayStr = useMemo(() => formatDateIso(new Date()), []);
  const [activeDate, setActiveDate] = useState<string>(todayStr);

  // Estado del Modal de Creación / Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Partial<Habit> | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Carga inicial desde Supabase con fallback a mock
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedHabits, loadedLogs] = await Promise.all([
          fetchHabits(),
          fetchHabitLogs(),
        ]);
        if (mounted) {
          if (loadedHabits && loadedHabits.length > 0) setHabits(loadedHabits);
          if (loadedLogs && loadedLogs.length > 0) setLogs(loadedLogs);
        }
      } catch (err) {
        console.error("Error cargando hábitos de Supabase:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // KPIs de Disciplina
  const kpis = useMemo(() => {
    return computeOverallDisciplineKpis(habits, logs, activeDate);
  }, [habits, logs, activeDate]);

  // Heatmap de Consistencia Anual (90 o 365 días)
  const heatmapGrid = useMemo(() => {
    return generateHeatmapGrid(logs, habits, {
      daysCount: heatmapDaysSpan,
      referenceDate: activeDate,
    });
  }, [logs, habits, heatmapDaysSpan, activeDate]);

  // Hábitos Filtrados
  const filteredHabits = useMemo(() => {
    return filterHabits(habits, selectedPillar, searchQuery);
  }, [habits, selectedPillar, searchQuery]);

  // Completitud rápida de un hábito para la fecha activa (optimistic UI)
  const handleToggleCompletion = async (habitId: number | string) => {
    const { updatedLogs, wasAdded } = toggleHabitCompletion(logs, habitId, activeDate);
    setLogs(updatedLogs);

    try {
      if (wasAdded) {
        await logHabitCompletion(undefined, habitId, activeDate);
      } else {
        await removeHabitCompletion(undefined, habitId, activeDate);
      }
    } catch (err) {
      console.error("Error sincronizando completitud con Supabase:", err);
    }
  };

  // Abrir modal de nuevo hábito
  const handleOpenCreateModal = () => {
    setEditingHabit({
      title: "",
      description: "",
      pillar: "salud",
      icon: "CheckCircle2",
      target_frequency_per_week: 7,
      color_hex: "#10B981",
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (habit: Habit) => {
    setEditingHabit({ ...habit });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Guardar hábito
  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;

    const validation = validateHabitPayload(editingHabit);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    setFormErrors([]);

    try {
      const saved = await saveHabit(undefined, editingHabit);
      setHabits((prev) => {
        const index = prev.findIndex((h) => String(h.id) === String(saved.id));
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setIsModalOpen(false);
      setEditingHabit(null);
    } catch (err: any) {
      setFormErrors([err.message || "Error al guardar el hábito en Supabase."]);
    } finally {
      setIsSaving(false);
    }
  };

  // Archivar / Eliminar hábito
  const handleDeleteHabit = async (habitId: number | string) => {
    if (!window.confirm("¿Estás seguro de que deseas archivar este hábito?")) return;
    try {
      await deleteHabit(undefined, habitId);
      setHabits((prev) => prev.filter((h) => String(h.id) !== String(habitId)));
    } catch (err) {
      console.error("Error archivando hábito:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header Ejecutivo & Controles Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5"
              style={{
                backgroundColor: "rgba(191, 64, 250, 0.12)",
                borderColor: "rgba(191, 64, 250, 0.3)",
                color: "#BF40FA",
              }}
            >
              <Flame className="w-3.5 h-3.5" />
              Disciplina & Consistencia
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Fecha: {activeDate === todayStr ? "Hoy (En Curso)" : activeDate}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Hábitos & Heatmap de Consistencia
          </h1>
          <p className="text-xs lg:text-sm text-zinc-400 mt-1 max-w-2xl">
            Monitoreo diario de hábitos de alto rendimiento divididos en 4 pilares: Salud, Negocio,
            Aprendizaje y Personal con cálculo de rachas continuas y mapa de calor anual.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs cursor-pointer transition-all shadow-lg text-white"
            style={{
              backgroundColor: "#BF40FA",
              boxShadow: "0 0 20px rgba(191, 64, 250, 0.35)",
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Hábito</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI de Disciplina del Fundador */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Racha Global Activa */}
        <div
          className="p-5 rounded-2xl border relative overflow-hidden"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Racha Global Activa</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(191, 64, 250, 0.15)", color: "#BF40FA" }}
            >
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white flex items-baseline gap-2">
            {kpis.currentOverallStreak}{" "}
            <span className="text-xs font-medium text-zinc-500">días consecutivos</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-400" />
            Récord histórico: <strong className="text-zinc-300">{kpis.bestOverallStreak} días</strong>
          </p>
        </div>

        {/* Progreso de la Jornada */}
        <div
          className="p-5 rounded-2xl border relative overflow-hidden"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Completitud de Hoy</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white flex items-baseline gap-2">
            {kpis.todayCompletedCount} / {kpis.activeHabitsCount}{" "}
            <span className="text-xs font-medium text-emerald-400">
              ({kpis.todayProgressPercent}%)
            </span>
          </p>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${kpis.todayProgressPercent}%`,
                backgroundColor: kpis.todayProgressPercent === 100 ? "#10B981" : "#BF40FA",
              }}
            />
          </div>
        </div>

        {/* Consistencia 30 Días */}
        <div
          className="p-5 rounded-2xl border relative overflow-hidden"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Consistencia 30 Días</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(73, 40, 194, 0.2)", color: "#4928C2" }}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white flex items-baseline gap-2">
            {kpis.consistencyScore30d}%{" "}
            <span className="text-xs font-medium text-zinc-500">días con actividad</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Estabilidad alta en hábitos clave
          </p>
        </div>

        {/* Días Perfectos (100%) */}
        <div
          className="p-5 rounded-2xl border relative overflow-hidden"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Días al 100% (30d)</span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(227, 217, 252, 0.15)", color: "#E3D9FC" }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white flex items-baseline gap-2">
            {kpis.perfectDaysCount}{" "}
            <span className="text-xs font-medium text-zinc-500">jornadas perfectas</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1">
            <Target className="w-3 h-3 text-purple-400" />
            Objetivo: &gt; 15 días perfectos/mes
          </p>
        </div>
      </div>

      {/* 3. Heatmap Anual de Consistencia Estilo GitHub (Soft-Obsidian) */}
      <div
        className="p-6 rounded-2xl border"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Mapa de Calor de Consistencia Diaria
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Densidad de hábitos completados desde {heatmapGrid.startDate} hasta {heatmapGrid.endDate}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-xl p-1 border text-xs"
              style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
            >
              <button
                type="button"
                onClick={() => setHeatmapDaysSpan(90)}
                className={`py-1.5 px-3 rounded-lg font-medium transition-all ${
                  heatmapDaysSpan === 90
                    ? "bg-[#BF40FA] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                90 Días
              </button>
              <button
                type="button"
                onClick={() => setHeatmapDaysSpan(365)}
                className={`py-1.5 px-3 rounded-lg font-medium transition-all ${
                  heatmapDaysSpan === 365
                    ? "bg-[#BF40FA] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                365 Días
              </button>
            </div>
          </div>
        </div>

        {/* Cuadrícula de Calor Visual (Horizontal Scrollable) */}
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-1.5 min-w-max">
            {heatmapGrid.weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => {
                  // Paleta Soft-Obsidian por nivel de intensidad
                  let bgColor = "#12151D";
                  let borderColor = "#1A1E29";
                  let glow = "none";

                  if (day.level === 1) {
                    bgColor = "#35193B";
                    borderColor = "#5B2A62";
                  } else if (day.level === 2) {
                    bgColor = "#5B2A62";
                    borderColor = "#7C3585";
                  } else if (day.level === 3) {
                    bgColor = "#7D25A8";
                    borderColor = "#A135DC";
                  } else if (day.level === 4) {
                    bgColor = "#BF40FA";
                    borderColor = "#E3D9FC";
                    glow = "0 0 8px rgba(191, 64, 250, 0.4)";
                  }

                  const isSelected = day.date === activeDate;

                  return (
                    <div
                      key={day.date}
                      onClick={() => setActiveDate(day.date)}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-3.5 h-3.5 rounded-sm border cursor-pointer transition-transform hover:scale-125 ${
                        isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-[#0B0D12]" : ""
                      }`}
                      style={{
                        backgroundColor: bgColor,
                        borderColor: borderColor,
                        boxShadow: glow,
                      }}
                      title={`${day.date}: ${day.count} hábitos completados`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Leyenda y Detalle de Hover */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-zinc-800/60 text-xs">
          <div className="text-zinc-400 flex items-center gap-2">
            {hoveredDay ? (
              <span>
                <strong className="text-white">{hoveredDay.date}</strong>:{" "}
                <span className="text-purple-300 font-semibold">{hoveredDay.count} completados</span>
                {hoveredDay.details.length > 0 && (
                  <span className="text-zinc-500 ml-1.5">
                    ({hoveredDay.details.map((d) => d.habitTitle).join(", ")})
                  </span>
                )}
              </span>
            ) : (
              <span>Pasa el cursor sobre un día para ver detalles o haz clic para seleccionarlo.</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-zinc-500">
            <span>Menos</span>
            <div className="flex gap-1 items-center">
              <div className="w-3 h-3 rounded-sm bg-[#12151D] border border-[#1A1E29]" />
              <div className="w-3 h-3 rounded-sm bg-[#35193B] border border-[#5B2A62]" />
              <div className="w-3 h-3 rounded-sm bg-[#5B2A62] border border-[#7C3585]" />
              <div className="w-3 h-3 rounded-sm bg-[#7D25A8] border border-[#A135DC]" />
              <div className="w-3 h-3 rounded-sm bg-[#BF40FA] border border-[#E3D9FC]" />
            </div>
            <span>Más</span>
          </div>
        </div>
      </div>

      {/* 4. Checklist Diario & Gestión de Hábitos */}
      <div className="space-y-4">
        {/* Filtros de Pilares & Barra de Búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPillar("all")}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all border ${
                selectedPillar === "all"
                  ? "bg-white text-black border-white shadow"
                  : "bg-[#0B0D12] text-zinc-400 border-zinc-800 hover:text-white"
              }`}
            >
              Todos ({habits.filter((h) => !h.is_archived).length})
            </button>
            {HABIT_PILLARS.map((p) => {
              const isSelected = selectedPillar === p.id;
              const count = habits.filter((h) => !h.is_archived && h.pillar === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPillar(p.id)}
                  className="py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5"
                  style={{
                    backgroundColor: isSelected ? p.badgeBg : "#0B0D12",
                    borderColor: isSelected ? p.borderColor : "#1A1D26",
                    color: isSelected ? p.color : "#94A3B8",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.label}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar hábito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Lista de Hábitos (Cards Interactivas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHabits.map((habit) => {
            const metrics = calculateHabitStreakMetrics(habit, logs, activeDate);
            const isCompletedForDate = logs.some(
              (l) => String(l.habit_id) === String(habit.id) && l.completed_date === activeDate
            );
            const pillarConfig =
              HABIT_PILLARS.find((p) => p.id === habit.pillar) || HABIT_PILLARS[0];
            const IconComponent = AVAILABLE_ICONS[habit.icon || "CheckCircle2"] || CheckCircle2;

            return (
              <div
                key={habit.id}
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isCompletedForDate
                    ? "bg-[#0B0D12] border-purple-500/40 shadow-lg shadow-purple-950/20"
                    : "bg-[#0B0D12] border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      {/* Botón de Completitud Rápida (Toggle) */}
                      <button
                        type="button"
                        onClick={() => handleToggleCompletion(habit.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                          isCompletedForDate
                            ? "bg-[#BF40FA] text-white border-[#E3D9FC] shadow-md shadow-purple-500/30 scale-105"
                            : "bg-[#040607] text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                        }`}
                        title={isCompletedForDate ? "Marcar como pendiente" : "Marcar como completado hoy"}
                      >
                        {isCompletedForDate ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <h3
                          className={`text-sm font-bold tracking-tight transition-all ${
                            isCompletedForDate ? "text-white line-through opacity-85" : "text-white"
                          }`}
                        >
                          {habit.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {habit.description || "Sin descripción."}
                        </p>
                      </div>
                    </div>

                    {/* Acciones de Edición / Borrado */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(habit)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
                        title="Editar hábito"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
                        title="Archivar hábito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Badges de Pilar, Racha y Meta Semanal */}
                <div className="pt-3 mt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full font-medium text-[10px] border flex items-center gap-1"
                      style={{
                        backgroundColor: pillarConfig.badgeBg,
                        borderColor: pillarConfig.borderColor,
                        color: pillarConfig.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: pillarConfig.color }}
                      />
                      {pillarConfig.label}
                    </span>

                    <span className="text-[11px] text-zinc-500 font-mono">
                      Meta: {habit.target_frequency_per_week || 7}d/sem
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-bold flex items-center gap-1 ${
                        metrics.currentStreak > 0 ? "text-purple-400" : "text-zinc-500"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {metrics.currentStreak}d racha
                    </span>

                    <span className="text-[11px] text-zinc-500">
                      Récord: <strong className="text-zinc-400">{metrics.bestStreak}d</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredHabits.length === 0 && (
          <div
            className="p-12 text-center rounded-2xl border border-zinc-800"
            style={{ backgroundColor: "#0B0D12" }}
          >
            <p className="text-zinc-400 text-sm">No se encontraron hábitos en este pilar o búsqueda.</p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold bg-[#BF40FA] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Nuevo Hábito
            </button>
          </div>
        )}
      </div>

      {/* 5. Modal de Creación / Edición de Hábito */}
      {isModalOpen && editingHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 relative overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  {editingHabit.id ? "Editar Hábito" : "Crear Nuevo Hábito"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.length > 0 && (
              <div className="my-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs space-y-1">
                {formErrors.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveHabit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Título del Hábito <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Entrenamiento de Fuerza, Prospección B2B"
                  value={editingHabit.title || ""}
                  onChange={(e) => setEditingHabit({ ...editingHabit, title: e.target.value })}
                  className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Descripción o Micro-Regla
                </label>
                <textarea
                  rows={2}
                  placeholder="ej: 60 min sin celular. 3 series pesadas al fallo."
                  value={editingHabit.description || ""}
                  onChange={(e) =>
                    setEditingHabit({ ...editingHabit, description: e.target.value })
                  }
                  className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Pilar Estratégico <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editingHabit.pillar || "salud"}
                    onChange={(e) =>
                      setEditingHabit({
                        ...editingHabit,
                        pillar: e.target.value as HabitPillar,
                      })
                    }
                    className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    {HABIT_PILLARS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Frecuencia Objetivo (días/semana)
                  </label>
                  <select
                    value={editingHabit.target_frequency_per_week || 7}
                    onChange={(e) =>
                      setEditingHabit({
                        ...editingHabit,
                        target_frequency_per_week: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#040607] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "día por semana" : "días por semana"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Color de Acento (Paleta Soft-Obsidian)
                </label>
                <div className="flex gap-3">
                  {[
                    { label: "Emerald", hex: "#10B981" },
                    { label: "Magenta", hex: "#BF40FA" },
                    { label: "Ultrasonic", hex: "#4928C2" },
                    { label: "Lavender", hex: "#E3D9FC" },
                    { label: "Amber", hex: "#F59E0B" },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setEditingHabit({ ...editingHabit, color_hex: c.hex })}
                      className={`w-7 h-7 rounded-lg border transition-all ${
                        editingHabit.color_hex === c.hex ? "ring-2 ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: c.hex, borderColor: "rgba(255,255,255,0.2)" }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2 px-5 rounded-xl font-semibold bg-[#BF40FA] hover:bg-[#a62ee0] text-white transition-all shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Guardando..." : "Guardar Hábito"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
