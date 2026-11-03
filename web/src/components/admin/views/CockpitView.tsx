// web/src/components/admin/views/CockpitView.tsx — Centro de Mando Ejecutivo Diario (Ticket 45)
import React, { useState, useEffect } from "react";
import {
  type CockpitSummary,
  type CockpitTtlAlert,
  type CockpitTodayHabit,
  fetchDailyCockpitSummary,
} from "../../../lib/cockpit.ts";
import {
  logHabitCompletion,
  removeHabitCompletion,
  HABIT_PILLARS,
} from "../../../lib/streaks.ts";
import { getBrowserSupabaseClient } from "../../../lib/supabase.ts";
import { subscribeToAdminRealtime } from "../../../lib/realtime.ts";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  MessageCircle,
  RotateCcw,
  ExternalLink,
  Calendar,
  Video,
  DollarSign,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Flame,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface CockpitViewProps {
  user?: any;
  onNavigate: (path: string) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({ user, onNavigate }) => {
  const [summary, setSummary] = useState<CockpitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const data = await fetchDailyCockpitSummary();
      setSummary(data);
    } catch (err) {
      console.error("Error cargando Cockpit summary:", err);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = subscribeToAdminRealtime(undefined, {
      channelName: "cockpit-daily-sync",
      onEvent: () => {
        loadData(false);
      },
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Toggle interactivo de hábito en 1 clic
  const handleToggleHabit = async (habit: CockpitTodayHabit) => {
    if (!summary) return;
    const todayStr = summary.todayDate;
    const newStatus = !habit.isCompleted;

    // Actualización reactiva optimista local
    setSummary((prev) => {
      if (!prev) return prev;
      const updatedHabits = prev.todayHabits.map((h) =>
        h.id === habit.id ? { ...h, isCompleted: newStatus } : h
      );
      const completedCount = updatedHabits.filter((h) => h.isCompleted).length;
      const total = updatedHabits.length;
      const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        ...prev,
        todayHabits: updatedHabits,
        habitsCompletedCount: completedCount,
        habitsTodayProgress: progress,
      };
    });

    try {
      if (newStatus) {
        await logHabitCompletion(habit.id, todayStr);
        showNotification(`✓ Hábito '${habit.title}' marcado como completado`);
      } else {
        await removeHabitCompletion(habit.id, todayStr);
        showNotification(`Hábito '${habit.title}' desmarcado`);
      }
    } catch (err) {
      console.error("Error toggling habit:", err);
    }
  };

  // Renovación rápida de lead TTL (+7 días)
  const handleRenewLeadTtl = async (leadId: number) => {
    try {
      const supabase = getBrowserSupabaseClient();
      const now = new Date();
      const newExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await supabase
        .from("leads")
        .update({
          last_activity_at: now.toISOString(),
          expires_at: newExpires.toISOString(),
        })
        .eq("id", leadId);

      // Actualizar alertas del summary
      setSummary((prev) => {
        if (!prev) return prev;
        const remainingAlerts = prev.ttlAlerts.filter((a) => a.id !== leadId);
        return {
          ...prev,
          ttlAlerts: remainingAlerts,
          urgentAlertsCount: remainingAlerts.length,
        };
      });

      showNotification(`✓ Demo renovada por +7 días. Alerta de urgencia resuelta.`);
    } catch (err) {
      console.error("Error renovando lead:", err);
      showNotification(`Error renovando lead`);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-zinc-400">Consolidando Cockpit Diario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-semibold text-white animate-in fade-in slide-in-from-bottom-4"
          style={{
            backgroundColor: "#0B0D12",
            borderColor: "rgba(191, 64, 250, 0.5)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
          }}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header Ejecutivo de la Jornada */}
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
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5"
                style={{
                  backgroundColor: "rgba(91, 42, 98, 0.4)",
                  borderColor: "rgba(191, 64, 250, 0.4)",
                  color: "#E3D9FC",
                }}
              >
                <Zap className="w-3 h-3 text-purple-400" />
                Cockpit Diario Activo
              </span>
              <span className="text-zinc-500 text-xs font-mono capitalize">
                {summary.formattedDateEs}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              {summary.greeting}
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Tenés{" "}
              <span
                className={`font-semibold ${
                  summary.urgentAlertsCount > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {summary.urgentAlertsCount} {summary.urgentAlertsCount === 1 ? "alerta" : "alertas"}{" "}
                TTL
              </span>
              , {summary.todayBlocksCount} bloques en agenda y {summary.todayHabits.length - summary.habitsCompletedCount} hábitos pendientes para hoy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border transition-all hover:bg-zinc-800 text-zinc-300"
              style={{
                backgroundColor: "#12151D",
                borderColor: "#1A1D26",
              }}
              title="Recargar datos de todos los submódulos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/admin/crm")}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              style={{
                backgroundColor: "#BF40FA",
                color: "#FFFFFF",
                boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
              }}
            >
              <span>Abrir CRM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. WIDGET DE ALERTAS DE PROSPECCIÓN TTL (<48h) */}
      <div
        className="p-6 rounded-2xl border"
        style={{
          backgroundColor: "#0B0D12",
          borderColor: summary.urgentAlertsCount > 0 ? "rgba(245, 158, 11, 0.3)" : "#1A1D26",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                summary.urgentAlertsCount > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {summary.urgentAlertsCount > 0 ? (
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Alertas de Prospección TTL (<span className="text-amber-400">&lt;48h</span>)
              </h2>
              <p className="text-xs text-zinc-400">
                Demos por caducar en el servidor activo según la política de 7 días.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                summary.urgentAlertsCount > 0
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {summary.urgentAlertsCount > 0
                ? `${summary.urgentAlertsCount} por expirar`
                : "0 críticas"}
            </span>
            <button
              type="button"
              onClick={() => onNavigate("/admin/crm")}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Ver CRM</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {summary.ttlAlerts.length === 0 ? (
          <div
            className="py-8 px-4 rounded-xl text-center border"
            style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
          >
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">Todas las demos están al día</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              No tenés prospectos con vencimiento inminente en las próximas 48 hs. Todas las landings
              mantienen servidores activos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.ttlAlerts.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl border flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: "#040607",
                  borderColor: lead.isExpired ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.3)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-zinc-800 text-zinc-300">
                      {lead.niche}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        lead.isExpired
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {lead.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1 truncate">{lead.name}</h3>
                  <p className="text-xs text-zinc-400 mb-2 truncate">{lead.location}</p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-4">
                    <span>Etapa: {lead.funnelStatus}</span>
                    <span className="text-purple-300 font-medium">{lead.potentialValue}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/80">
                  <a
                    href={lead.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                    title="Enviar mensaje de urgencia por WhatsApp (wa.me)"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleRenewLeadTtl(lead.id)}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-zinc-700 hover:border-purple-400 text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="Renovar TTL por +7 días"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                    <span>+7d</span>
                  </button>

                  <a
                    href={lead.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all"
                    title="Ver preview web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GRILLA CENTRAL: HÁBITOS DE HOY & AGENDA DE HOY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WIDGET HÁBITOS DE HOY INTERACTIVO */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Hábitos de Hoy ({summary.habitsCompletedCount}/{summary.habitsTotalCount})
                  </h2>
                  <p className="text-xs text-zinc-400">Checklist rápido de disciplina diaria</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("/admin/habits")}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Ver Heatmap</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Barra de Progreso */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zinc-400">Completitud de Hoy</span>
                <span className="font-bold text-white font-mono">
                  {summary.habitsTodayProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${summary.habitsTodayProgress}%`,
                    backgroundColor:
                      summary.habitsTodayProgress === 100 ? "#10B981" : "#BF40FA",
                  }}
                />
              </div>
            </div>

            {/* Lista Interactiva de Hábitos */}
            <div className="space-y-2.5">
              {summary.todayHabits.map((habit) => {
                const pillarCfg = HABIT_PILLARS.find((p) => p.id === habit.pillar);
                return (
                  <div
                    key={habit.id}
                    onClick={() => handleToggleHabit(habit)}
                    className="p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-zinc-800/40 select-none"
                    style={{
                      backgroundColor: habit.isCompleted ? "rgba(16, 185, 129, 0.05)" : "#040607",
                      borderColor: habit.isCompleted ? "rgba(16, 185, 129, 0.3)" : "#1A1D26",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          habit.isCompleted
                            ? "bg-emerald-500 text-white"
                            : "border border-zinc-600 text-transparent hover:border-purple-400"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold transition-all ${
                            habit.isCompleted ? "line-through text-zinc-500" : "text-white"
                          }`}
                        >
                          {habit.title}
                        </p>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: pillarCfg?.color || "#A1A1AA" }}
                        >
                          {pillarCfg?.label || habit.pillar}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-mono">
                      {habit.targetWeekly}x/sem
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* WIDGET AGENDA DE HOY */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Agenda de Hoy ({summary.dayName})
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {summary.todayBlocksCount} bloques de time-blocking
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("/admin/calendar")}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Ver Semana</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {summary.todayBlocks.length === 0 ? (
              <div
                className="py-12 px-4 rounded-xl text-center border"
                style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
              >
                <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Día libre de bloques fijos</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                  No tenés bloques programados para {summary.dayName}. Podés agendar trabajo profundo
                  o llamadas desde el calendario.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.todayBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                    style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: block.categoryColor }}
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{block.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>{block.categoryLabel}</span>
                          <span>•</span>
                          <span className="font-mono">{block.durationMinutes} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-purple-300">
                        {block.startTime} - {block.endTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. GRILLA INFERIOR: PRÓXIMO VIDEO ALAYNOW & CASHFLOW CONSOLIDADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WIDGET PRÓXIMO VIDEO ALAYNOW */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Próximo Video AlayNow
                  </h2>
                  <p className="text-xs text-zinc-400">Producción editorial en foco</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("/admin/alaynow")}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Pipeline Completo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {summary.activeVideo ? (
              <div
                className="p-4 rounded-xl border"
                style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
              >
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {summary.activeVideo.thumbnailUrl ? (
                    <img
                      src={summary.activeVideo.thumbnailUrl}
                      alt={summary.activeVideo.title}
                      className="w-full sm:w-28 h-20 object-cover rounded-lg border border-zinc-800"
                    />
                  ) : (
                    <div className="w-full sm:w-28 h-20 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                      <Video className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${summary.activeVideo.stageColor}15`,
                          borderColor: `${summary.activeVideo.stageColor}40`,
                          color: summary.activeVideo.stageColor,
                        }}
                      >
                        {summary.activeVideo.stageLabel}
                      </span>
                      {summary.activeVideo.hasSponsor && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Sponsor: {summary.activeVideo.sponsorName || "Activo"}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">
                      {summary.activeVideo.title}
                    </h3>

                    {summary.activeVideo.targetDate && (
                      <p className="text-[11px] text-zinc-500">
                        Fecha objetivo: <span className="font-mono text-zinc-400">{summary.activeVideo.targetDate}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="py-8 px-4 rounded-xl text-center border"
                style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
              >
                <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Sin video en producción</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                  Agregá una nueva idea al pipeline de YouTube desde el módulo de Alaynow.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* WIDGET CASHFLOW NETO CONSOLIDADO */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Cashflow Mensual ({summary.cashflow.period})
                  </h2>
                  <p className="text-xs text-zinc-400">NexoBow + Alaynow + Costos</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("/admin/finances")}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Ver Finanzas</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 3 Tarjetas de Métricas Financieras */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div
                className="p-3.5 rounded-xl border"
                style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
              >
                <span className="text-[11px] text-zinc-400 block mb-1">Ingresos</span>
                <p className="text-sm font-bold text-white truncate">
                  {summary.cashflow.formattedIncomeArs}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ~${summary.cashflow.approxIncomeUsd} USD
                </span>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
              >
                <span className="text-[11px] text-zinc-400 block mb-1">Egresos</span>
                <p className="text-sm font-bold text-white truncate">
                  {summary.cashflow.formattedExpenseArs}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Costos Fijos y Var</span>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: "#040607",
                  borderColor:
                    summary.cashflow.netCashflowArs >= 0
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(239, 68, 68, 0.3)",
                }}
              >
                <span className="text-[11px] text-zinc-400 block mb-1">Beneficio Neto</span>
                <p
                  className={`text-sm font-bold truncate ${
                    summary.cashflow.netCashflowArs >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {summary.cashflow.formattedNetCashflowArs}
                </p>
                <span className="text-[10px] font-semibold text-zinc-400">
                  {summary.cashflow.netMarginPercentage}% margen
                </span>
              </div>
            </div>

            {/* Salud Financiera */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between text-xs"
              style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-300">Margen Neto Operativo</span>
              </div>
              <span className="font-bold text-emerald-400 font-mono">
                {summary.cashflow.netMarginPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
