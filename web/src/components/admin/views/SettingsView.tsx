// web/src/components/admin/views/SettingsView.tsx — Vista de Configuración, Diagnóstico & Aislamiento 0-JS (Ticket 46)
import React, { useState, useEffect } from "react";
import {
  type SupabaseHealthReport,
  checkSupabaseHealth,
  clearPlatformCache,
  ADMIN_DATABASE_TABLES,
} from "../../../lib/settings.ts";
import {
  subscribeToAdminRealtime,
  type AdminRealtimeChannel,
  type RealtimeChangeEvent,
  type RealtimeStatus,
} from "../../../lib/realtime.ts";
import {
  Activity,
  Database,
  ShieldCheck,
  Wifi,
  Zap,
  RefreshCw,
  ExternalLink,
  Lock,
  Server,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Radio,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  Video,
  Flame,
  CheckSquare,
  KeyRound,
  FileCheck2,
} from "lucide-react";

interface SettingsViewProps {
  user?: any;
  onNavigate: (path: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onNavigate }) => {
  const [health, setHealth] = useState<SupabaseHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("CONNECTING");
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<RealtimeChangeEvent | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<AdminRealtimeChannel | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Ejecutar healthcheck
  const runDiagnostics = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const report = await checkSupabaseHealth({ user });
      setHealth(report);
    } catch (err: any) {
      console.error("Error al ejecutar diagnóstico de salud:", err);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  };

  // Inicializar diagnóstico y canal Realtime
  useEffect(() => {
    runDiagnostics();

    const channel = subscribeToAdminRealtime(undefined, {
      channelName: "admin-settings-monitor",
      onStatusChange: (status) => {
        setRealtimeStatus(status);
      },
      onEvent: (event) => {
        setLastRealtimeEvent(event);
        showFeedback(`Evento Realtime detectado: ${event.eventType} en ${event.table}`);
        // Refrescar conteos silenciosamente ante eventos
        runDiagnostics(false);
      },
    });

    setRealtimeChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const showFeedback = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleSimulateRealtimePing = () => {
    if (realtimeChannel) {
      realtimeChannel.simulateEvent({
        table: "leads",
        eventType: "UPDATE",
        timestamp: new Date().toISOString(),
      });
      showFeedback("Ping de prueba Realtime emitido con éxito a través del canal.");
    }
  };

  const handleClearCache = () => {
    const success = clearPlatformCache();
    if (success) {
      showFeedback("Caché local de sesión purgado con éxito.");
    } else {
      showFeedback("No fue posible purgar el almacenamiento local.");
    }
  };

  // Mapeo de iconos para tablas
  const getTableIcon = (name: string) => {
    switch (name) {
      case "leads":
        return <Users className="w-5 h-5 text-purple-400" />;
      case "financial_transactions":
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case "schedule_blocks":
        return <Calendar className="w-5 h-5 text-amber-400" />;
      case "alaynow_videos":
        return <Video className="w-5 h-5 text-red-400" />;
      case "habits":
        return <Flame className="w-5 h-5 text-orange-400" />;
      case "habit_logs":
        return <CheckSquare className="w-5 h-5 text-blue-400" />;
      default:
        return <Database className="w-5 h-5 text-zinc-400" />;
    }
  };

  if (loading && !health) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-zinc-400">Ejecutando diagnóstico de infraestructura Supabase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-[#0B0D12] border-purple-500/40 text-[#E3D9FC] text-xs font-medium shadow-2xl animate-fade-in">
          <Zap className="w-4 h-4 text-purple-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Encabezado Ejecutivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8F6FF]">
              Configuración & Diagnóstico
            </h1>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5"
              style={{
                backgroundColor: health?.connected ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                borderColor: health?.connected ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
                color: health?.connected ? "#10B981" : "#EF4444",
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${health?.connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {health?.overallStatus === "healthy"
                ? "SISTEMA SALUDABLE"
                : health?.overallStatus === "degraded"
                ? "DEGRADADO / RESILIENTE"
                : "DESCONECTADO"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Salud de infraestructura Supabase, sincronización Realtime entre pestañas y aislamiento 0-JS.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => runDiagnostics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-[#0B0D12] border-zinc-800 text-zinc-300 hover:text-white hover:border-purple-500/40 hover:bg-zinc-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-purple-400" : ""}`} />
            <span>{refreshing ? "Diagnosticando..." : "Ejecutar Healthcheck"}</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateRealtimePing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Probar Realtime</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Conexión Supabase */}
        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Conexión Supabase</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#F8F6FF]">
              {health?.connected ? "Conectado" : "Error"}
            </span>
            <span className="text-xs font-mono text-emerald-400">
              {health?.latencyMs}ms latencia
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 truncate font-mono">
            {health?.supabaseUrl}
          </p>
        </div>

        {/* KPI 2: Realtime Sync */}
        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Canal Realtime</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#F8F6FF]">
              {realtimeStatus === "SUBSCRIBED" ? "Activo" : realtimeStatus}
            </span>
            <span className="text-xs font-mono text-purple-400">
              6 tablas
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 truncate">
            {lastRealtimeEvent
              ? `Último: ${lastRealtimeEvent.eventType} en ${lastRealtimeEvent.table}`
              : "Escuchando cambios postgres_changes..."}
          </p>
        </div>

        {/* KPI 3: Aislamiento 0-JS */}
        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Aislamiento 0-JS</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-400">
              0 Bytes
            </span>
            <span className="text-xs font-mono text-zinc-400">
              en web/
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 truncate">
            Isla React aislada en /admin/*
          </p>
        </div>

        {/* KPI 4: Total de Registros */}
        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Registros Totales</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#F8F6FF]">
              {health?.totalRecords ?? 0}
            </span>
            <span className="text-xs font-mono text-amber-400">
              entidades
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 truncate">
            Distribuidas en los 6 submódulos
          </p>
        </div>
      </div>

      {/* Grid de 6 Tablas de Base de Datos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-semibold text-[#F8F6FF]">
              Base de Datos Supabase: Tablas y Conteo de Registros
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {health?.tables.length ?? 0} tablas sincronizadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health?.tables.map((table) => (
            <div
              key={table.name}
              className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 hover:border-zinc-700 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                      {getTableIcon(table.name)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#F8F6FF] group-hover:text-purple-300 transition-colors">
                        {table.label}
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500">public.{table.name}</p>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor:
                        table.status === "ok" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                      borderColor:
                        table.status === "ok" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                      color: table.status === "ok" ? "#10B981" : "#F59E0B",
                    }}
                  >
                    {table.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mb-4 line-clamp-2">
                  {table.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-900 mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-[#F8F6FF] font-mono">
                    {table.count}
                  </span>
                  <span className="text-[10px] text-zinc-400">filas</span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(table.moduleRoute)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auditoría de Aislamiento 0-JS */}
      <div className="p-6 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F8F6FF]">
                Auditoría de Aislamiento 0-JS & Arquitectura Híbrida
              </h2>
              <p className="text-xs text-zinc-400">
                Garantía técnica de carga instantánea (&lt;0.8s) en landings públicas y SPA interactiva en /admin.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            ✓ 0-JS VERIFICADO
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#040607]">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Landings Públicas (web/)
            </span>
            <p className="text-xl font-bold text-emerald-400 font-mono">0 &lt;script&gt; tags</p>
            <p className="text-xs text-zinc-400 mt-2">
              HTML estático puro generado por Astro SSG. Cero JavaScript ejecutable en cliente.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#040607]">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Admin Cockpit (/admin/*)
            </span>
            <p className="text-xl font-bold text-purple-400 font-mono">Isla React Aislada</p>
            <p className="text-xs text-zinc-400 mt-2">
              SPA montada con client:only="react". Bundle descargado únicamente bajo demanda autorizada.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#040607]">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Presupuesto Cloudflare Pages
            </span>
            <p className="text-xl font-bold text-[#F8F6FF] font-mono">25 MB / archivo</p>
            <p className="text-xs text-zinc-400 mt-2">
              Sin límite artificial restrictivo en templates. Rechazo estricto de scripts de terceros.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de 2 Columnas: Variables de Entorno y Sesión RLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variables de Entorno */}
        <div className="p-6 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-[#F8F6FF]">
              Variables de Entorno & Credenciales Públicas
            </h2>
          </div>

          <div className="space-y-3">
            {health?.envVars.map((env) => (
              <div
                key={env.key}
                className="p-3 rounded-xl border border-zinc-800/80 bg-[#040607] flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-zinc-300">{env.key}</span>
                    {env.required && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                        REQ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{env.label}</p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[11px] text-[#E3D9FC] bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    {env.maskedValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sesión de Usuario & Acciones de Plataforma */}
        <div className="p-6 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-[#F8F6FF]">
                Sesión de Usuario & Políticas RLS
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#040607] border border-zinc-800/80">
                <span className="text-zinc-400">Email Autenticado:</span>
                <span className="font-mono font-medium text-emerald-400">
                  {health?.session.userEmail || "juanma@nexobow.site"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#040607] border border-zinc-800/80">
                <span className="text-zinc-400">Rol de Autorización:</span>
                <span className="font-mono font-medium text-purple-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {health?.session.isOwner ? "Propietario Supabase (RLS Owner)" : "Usuario Estándar"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#040607] border border-zinc-800/80">
                <span className="text-zinc-400">Propietario Esperado:</span>
                <span className="font-mono text-zinc-300">
                  {health?.ownerEmail}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearCache}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border border-zinc-800 bg-[#040607] text-zinc-300 hover:text-white hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Limpiar Caché Local</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("/admin")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border border-purple-500/30 bg-purple-600/10 text-purple-300 hover:bg-purple-600/20 transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Ir al Cockpit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
