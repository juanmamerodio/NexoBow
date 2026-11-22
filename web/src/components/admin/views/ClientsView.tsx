// web/src/components/admin/views/ClientsView.tsx — Tablero "Prestadores & Operaciones" (Entrega 72h, 6 Hitos, DNS domain-provisioner, Review Booster & Gate 1)
import React, { useEffect, useMemo, useState } from "react";
import {
  type ActiveClient,
  type AutonomousEvent,
  type ClientTierType,
  type DeliveryChecklist,
  type DeliverySlaStatus,
  CLIENT_TIER_LABELS,
  DELIVERY_CHECKLIST_ITEMS,
  DELIVERY_STATUS_META,
  PLACE_ID_RE,
  aggregateAutonomousEvents,
  buildClientReviewKit,
  buildClientReviewUrl,
  buildDomainProvisionerCommand,
  computeChecklistProgress,
  extractOperationalAlerts,
  fetchActiveClients,
  fetchAutonomousEvents,
  resolveDeliverySlaState,
  updateActiveClient,
} from "../../../lib/active-clients.ts";
import { subscribeToAdminRealtime } from "../../../lib/realtime.ts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  MessageCircle,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  Zap,
} from "lucide-react";

interface ClientsViewProps {
  onNavigate?: (path: string) => void;
}

function formatDateAr(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadSvgFile(svgContent: string, fileName: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onNavigate }) => {
  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<ClientTierType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DeliverySlaStatus | "all">("all");
  const [domainDrafts, setDomainDrafts] = useState<Record<string, string>>({});
  const [placeIdDrafts, setPlaceIdDrafts] = useState<Record<string, string>>({});
  const [reviewModeBySlug, setReviewModeBySlug] = useState<
    Record<string, "tier1_manual" | "tier2_post_consult">
  >({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3200);
  };

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [clientsRes, eventsRes] = await Promise.all([
        fetchActiveClients(),
        fetchAutonomousEvents(),
      ]);
      setClients(clientsRes.data);
      setEvents(eventsRes.data);
      setIsOffline(Boolean(clientsRes.isOffline || eventsRes.isOffline));
    } catch (err) {
      console.error("Error cargando prestadores activos:", err);
      setIsOffline(true);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = subscribeToAdminRealtime(undefined, {
      channelName: "admin-clients-operations",
      tables: ["active_clients", "autonomous_events"],
      onEvent: () => {
        loadData(false);
      },
    });
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleCopy = async (text: string, label: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      showNotification(`✓ ${label} copiado al portapapeles`);
    } catch {
      showNotification(`No se pudo copiar automáticamente: seleccioná el texto manualmente.`);
    }
  };

  const handleToggleChecklistItem = async (
    client: ActiveClient,
    key: keyof DeliveryChecklist
  ) => {
    const nextChecklist: DeliveryChecklist = {
      ...client.checklist,
      [key]: !client.checklist[key],
    };
    const nextAeoVerified =
      key === "production_aeo_built" ? nextChecklist.production_aeo_built : client.aeo_verified;
    const isNowDelivered = nextChecklist.delivery_confirmed;
    const nextDeliveredAt = isNowDelivered ? client.delivered_at || new Date().toISOString() : null;
    const nextStatus: DeliverySlaStatus = isNowDelivered
      ? "entregado_en_tiempo"
      : resolveDeliverySlaState(
          {
            ...client,
            checklist: nextChecklist,
            delivered_at: null,
            delivery_status: client.delivery_status === "pausado" ? "pausado" : "en_curso",
          },
          new Date()
        ).effectiveStatus;

    setClients((prev) =>
      prev.map((c) =>
        c.slug === client.slug
          ? {
              ...c,
              checklist: nextChecklist,
              aeo_verified: nextAeoVerified,
              delivered_at: nextDeliveredAt,
              delivery_status: nextStatus,
            }
          : c
      )
    );

    const res = await updateActiveClient(
      { id: client.id, slug: client.slug },
      {
        checklist: nextChecklist,
        aeo_verified: nextAeoVerified,
        delivered_at: nextDeliveredAt,
        delivery_status: nextStatus,
      }
    );
    if (res.ok) {
      showNotification(`✓ Hito actualizado para ${client.provider_name}`);
    } else {
      setClients((prev) => prev.map((c) => (c.slug === client.slug ? client : c)));
      showNotification(`⚠ No se pudo guardar el hito: ${res.error || "error de conexión"}`);
    }
  };

  const handleSaveDomain = async (client: ActiveClient) => {
    const draft = domainDrafts[client.slug] ?? client.primary_domain ?? "";
    const plan = buildDomainProvisionerCommand(draft, client.slug);
    if (!plan.valid) {
      showNotification("Ingresá un dominio válido sin http:// (ej: estudioejemplo.com.ar)");
      return;
    }

    const res = await updateActiveClient(
      { id: client.id, slug: client.slug },
      { primary_domain: plan.domain }
    );
    if (!res.ok) {
      showNotification(`⚠ Error guardando dominio: ${res.error || "error de conexión"}`);
      return;
    }
    setClients((prev) =>
      prev.map((c) => (c.slug === client.slug ? { ...c, primary_domain: plan.domain } : c))
    );
    showNotification(`✓ Dominio ${plan.domain} guardado para ${client.provider_name}`);
  };

  const handleSavePlaceId = async (client: ActiveClient) => {
    const draft = (placeIdDrafts[client.slug] ?? client.maps_place_id ?? "").trim();
    if (draft && !PLACE_ID_RE.test(draft)) {
      showNotification(
        "⚠ Place ID inválido: usá un identificador de Google Maps alfanumérico (ej: ChIJ..., mínimo 10 caracteres)"
      );
      return;
    }

    const nextReviewUrl = buildClientReviewUrl({
      placeId: draft,
      mapsUrl: client.metadata?.maps_url || "",
      businessName: client.provider_name,
      location: client.metadata?.city || "",
    });

    const res = await updateActiveClient(
      { id: client.id, slug: client.slug },
      { maps_place_id: draft || null, review_url: nextReviewUrl }
    );
    if (!res.ok) {
      showNotification(`⚠ Error guardando Place ID: ${res.error || "error de conexión"}`);
      return;
    }
    setClients((prev) =>
      prev.map((c) =>
        c.slug === client.slug
          ? { ...c, maps_place_id: draft || null, review_url: nextReviewUrl }
          : c
      )
    );
    showNotification(`✓ Place ID y link de reseña actualizados`);
  };

  const alerts = useMemo(() => extractOperationalAlerts(clients, new Date()), [clients]);
  const deliveryAlertsCount = alerts.filter((a) => a.type === "delivery_72h").length;
  const trialAlertsCount = alerts.filter((a) => a.type === "trial_30d").length;
  const gate1Summary = useMemo(() => aggregateAutonomousEvents(events), [events]);

  const reviewKitsBySlug = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildClientReviewKit> | null> = {};
    for (const client of clients) {
      const placeIdDraft = (placeIdDrafts[client.slug] ?? client.maps_place_id ?? "").trim();
      const safePlaceId = placeIdDraft && PLACE_ID_RE.test(placeIdDraft) ? placeIdDraft : client.maps_place_id;
      try {
        map[client.slug] = buildClientReviewKit({
          ...client,
          maps_place_id: safePlaceId,
        });
      } catch {
        map[client.slug] = null;
      }
    }
    return map;
  }, [clients, placeIdDrafts]);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return clients.filter((c) => {
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      const sla = resolveDeliverySlaState(c, new Date());
      if (statusFilter !== "all" && sla.effectiveStatus !== statusFilter) return false;
      if (q) {
        const hay = `${c.provider_name} ${c.slug} ${c.niche} ${c.primary_domain || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clients, tierFilter, statusFilter, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
        <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-zinc-400">
          Cargando Prestadores Activos & SLA 72h...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {feedbackMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-[#0B0D12] border-purple-500/40 text-[#E3D9FC] text-xs font-medium shadow-2xl"
        >
          <Zap className="w-4 h-4 text-purple-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8F6FF] flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-[#BF40FA]" />
              <span>Prestadores & Operaciones</span>
            </h1>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                isOffline
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {isOffline
                ? "Modo Offline (Demo)"
                : clients.length === 0
                  ? "Supabase Live (0 registros)"
                  : `Supabase Live (${clients.length} prestadores)`}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Seguimiento contractual de Entrega 72h hábiles, 6 hitos de lanzamiento, DNS propio, kit de reseñas 5★ y métricas agregadas Gate 1.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-800 bg-[#0B0D12] text-zinc-300 hover:text-white hover:border-purple-500/40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-purple-400" : ""}`} />
            <span>Actualizar</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("/admin/crm")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer bg-[#BF40FA] text-[#040607] hover:opacity-95"
            >
              <span>Promover desde CRM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Prestadores Activos</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{clients.length}</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Tier 1: {clients.filter((c) => c.tier === "starter_tier1").length} · Tier 2+:{" "}
            {clients.filter((c) => c.tier !== "starter_tier1").length}
          </p>
        </div>

        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Entrega 72h (&lt;24h)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className={`text-2xl font-extrabold ${deliveryAlertsCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {deliveryAlertsCount}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Alertas críticas de entrega en curso</p>
        </div>

        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Fin Prueba 30d (&le;5d)</span>
            <AlertTriangle className="w-4 h-4 text-sky-400" />
          </div>
          <p className={`text-2xl font-extrabold ${trialAlertsCount > 0 ? "text-sky-400" : "text-white"}`}>
            {trialAlertsCount}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Ventanas de transición a Tier 2</p>
        </div>

        <div className="p-5 rounded-2xl border bg-[#0B0D12] border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Eventos Gate 1</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{gate1Summary.totalEvents}</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {gate1Summary.lastReceivedAt
              ? `Último: ${formatDateAr(gate1Summary.lastReceivedAt)}`
              : "Preparado (Gate 0 · $0 VPS)"}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-4 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, slug, rubro o dominio..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#040607] border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as ClientTierType | "all")}
            className="py-2 px-3 rounded-xl text-xs bg-[#040607] border border-zinc-800 text-zinc-200"
          >
            <option value="all">Todos los Tiers</option>
            <option value="starter_tier1">Tier 1 Starter</option>
            <option value="autonomous_tier2">Tier 2 Autonomous</option>
            <option value="growth_tier3">Tier 3 Growth</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeliverySlaStatus | "all")}
            className="py-2 px-3 rounded-xl text-xs bg-[#040607] border border-zinc-800 text-zinc-200"
          >
            <option value="all">Todos los SLA</option>
            <option value="en_curso">En curso (72h)</option>
            <option value="alerta_24h">Alerta &lt;24h</option>
            <option value="vencido_sla">SLA Vencido</option>
            <option value="entregado_en_tiempo">Entregado</option>
            <option value="pausado">Pausado</option>
          </select>
        </div>
      </div>

      {/* Lista de Prestadores Activos */}
      {filteredClients.length === 0 ? (
        <div className="p-10 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 text-center space-y-3">
          <ShieldCheck className="w-9 h-9 text-purple-400 mx-auto" />
          <h2 className="text-base font-bold text-white">
            {clients.length === 0
              ? "Todavía no hay prestadores activos cargados"
              : "Ningún prestador coincide con los filtros actuales"}
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {clients.length === 0
              ? "Convertí cualquier prospecto desde el CRM en 1 clic para iniciar el reloj de 72h hábiles, el checklist de 6 hitos y su kit de reseñas."
              : "Limpiá los filtros o buscá otro profesional."}
          </p>
          {clients.length === 0 && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("/admin/crm")}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#BF40FA] text-[#040607] cursor-pointer"
            >
              <span>Ir a /admin/crm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredClients.map((client) => {
            const sla = resolveDeliverySlaState(client, new Date());
            const statusCfg = DELIVERY_STATUS_META[sla.effectiveStatus];
            const tierCfg = CLIENT_TIER_LABELS[client.tier];
            const progress = computeChecklistProgress(client.checklist);
            const domainValue = domainDrafts[client.slug] ?? client.primary_domain ?? "";
            const dnsPlan = buildDomainProvisionerCommand(domainValue, client.slug);
            const placeIdDraft = placeIdDrafts[client.slug] ?? client.maps_place_id ?? "";
            const kit = reviewKitsBySlug[client.slug];
            const reviewMode = reviewModeBySlug[client.slug] || "tier1_manual";
            const activeReviewMsg = kit
              ? reviewMode === "tier2_post_consult"
                ? kit.messagePostConsult
                : kit.messageManual
              : "";
            const clientEventCount = gate1Summary.byClientSlug[client.slug] || 0;

            return (
              <div
                key={client.slug}
                className="p-6 rounded-2xl border bg-[#0B0D12] border-zinc-800/90 space-y-6"
              >
                {/* Encabezado del Prestador + Reloj 72h */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {client.lead_id !== null && (
                        <span className="text-[11px] font-mono font-bold text-purple-300">
                          Lead #{client.lead_id}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-zinc-400">{client.slug}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          color: tierCfg.color,
                          backgroundColor: tierCfg.bg,
                          borderColor: tierCfg.border,
                        }}
                      >
                        {tierCfg.short}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                        style={{
                          color: statusCfg.color,
                          backgroundColor: statusCfg.bg,
                          borderColor: statusCfg.border,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{client.provider_name}</h2>
                    <p className="text-xs text-zinc-400">
                      Rubro: <span className="text-zinc-200">{client.niche}</span> · Alta:{" "}
                      {formatDateAr(client.promoted_at)} · Eventos Gate 1:{" "}
                      <span className="font-mono text-emerald-300">{clientEventCount}</span>
                    </p>
                  </div>

                  {/* Relojes Contractuales */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-[#040607] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Entrega 72h hábiles</span>
                      <span
                        className={`font-mono font-bold block mt-0.5 ${
                          sla.isDelivered
                            ? "text-emerald-400"
                            : sla.isOverdue
                              ? "text-red-400"
                              : sla.isUrgent24h
                                ? "text-amber-400"
                                : "text-sky-300"
                        }`}
                      >
                        {sla.isDelivered
                          ? "Entregado"
                          : sla.isOverdue
                            ? `-${Math.abs(sla.hoursToDelivery)}h`
                            : `${sla.hoursToDelivery}h restantes`}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatDateAr(client.delivery_deadline_at)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#040607] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Prueba 30 días</span>
                      <span
                        className={`font-mono font-bold block mt-0.5 ${
                          sla.isTrialEndingSoon ? "text-amber-300" : "text-zinc-200"
                        }`}
                      >
                        {sla.daysToTrialEnd}d restantes
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatDateAr(client.trial_ends_at)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#040607] border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Renovación Año 1</span>
                      <span className="font-mono font-bold text-zinc-200 block mt-0.5">
                        {sla.daysToHostingRenewal}d
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatDateAr(client.hosting_renews_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grilla Operativa: Checklist 6 Hitos + DNS + Review Booster */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Columna 1: Checklist 6 Hitos */}
                  <div className="p-4 rounded-xl bg-[#040607] border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#E3D9FC]">
                        Checklist de Entrega (6 Hitos)
                      </h3>
                      <span className="text-xs font-mono font-bold text-purple-300">
                        {progress.completed}/{progress.total} ({progress.percent}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress.percent}%`,
                          backgroundColor: progress.isComplete ? "#10B981" : "#BF40FA",
                        }}
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      {DELIVERY_CHECKLIST_ITEMS.map((item) => {
                        const checked = Boolean(client.checklist[item.key]);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleToggleChecklistItem(client, item.key)}
                            className={`w-full text-left p-2.5 rounded-lg border flex items-start gap-2.5 transition-all cursor-pointer ${
                              checked
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <CheckCircle2
                              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                checked ? "text-emerald-400" : "text-zinc-600"
                              }`}
                            />
                            <div>
                              <span
                                className={`text-xs font-semibold block ${
                                  checked ? "text-emerald-200 line-through" : "text-zinc-200"
                                }`}
                              >
                                {item.label}
                              </span>
                              <span className="text-[11px] text-zinc-400 block">{item.hint}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Columna 2: Dominio Propio, AEO & DNS (domain-provisioner) */}
                  <div className="p-4 rounded-xl bg-[#040607] border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#E3D9FC] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        <span>Dominio Propio & DNS</span>
                      </h3>
                      {client.aeo_verified && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          AEO Verificado
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={domainValue}
                        onChange={(e) =>
                          setDomainDrafts((prev) => ({
                            ...prev,
                            [client.slug]: e.target.value,
                          }))
                        }
                        placeholder="ej: consultorionorte.com.ar"
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveDomain(client)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-900 space-y-1 text-[11px] font-mono">
                      <span className="text-zinc-400 block">
                        Registros CNAME esperados ({dnsPlan.isNicAr ? "NIC.ar" : "Global"}):
                      </span>
                      {dnsPlan.dnsRecords.map((rec) => (
                        <div key={rec.name} className="text-zinc-200">
                          {rec.type} <span className="text-purple-300">{rec.name}</span> &rarr;{" "}
                          <span className="text-emerald-300">{rec.target}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(dnsPlan.buildProductionCommand, "Comando Build Producción")
                        }
                        className="w-full py-2 px-3 rounded-lg text-[11px] font-mono flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-purple-500/50 text-zinc-200 cursor-pointer"
                      >
                        <span className="truncate">1. Build --mode production + AEO</span>
                        <Copy className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 ml-2" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(dnsPlan.checkCommand, "Comando domain-provisioner")
                        }
                        className="w-full py-2 px-3 rounded-lg text-[11px] font-mono flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-sky-500/50 text-zinc-200 cursor-pointer"
                      >
                        <span className="truncate">2. Verificar DNS (domain-provisioner)</span>
                        <Copy className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 ml-2" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(dnsPlan.wranglerCommand, "Comando Wrangler")}
                        className="w-full py-2 px-3 rounded-lg text-[11px] font-mono flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 cursor-pointer"
                      >
                        <span className="truncate">3. Vincular dominio en Wrangler</span>
                        <Copy className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-2" />
                      </button>
                    </div>
                  </div>

                  {/* Columna 3: Kit de Reseñas 5★ (review-booster offline) */}
                  <div className="p-4 rounded-xl bg-[#040607] border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#E3D9FC] flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span>Kit de Reseñas 5★</span>
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400">100% Offline</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={placeIdDraft}
                        onChange={(e) =>
                          setPlaceIdDrafts((prev) => ({
                            ...prev,
                            [client.slug]: e.target.value,
                          }))
                        }
                        placeholder="Google Place ID (ej: ChIJ...)"
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePlaceId(client)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-900">
                      {kit ? (
                        <>
                          <img
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(kit.qrSvg)}`}
                            alt={`Código QR para reseñas de ${client.provider_name}`}
                            className="w-20 h-20 rounded-lg bg-white p-1 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <a
                              href={kit.reviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-sky-400 hover:underline flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{kit.reviewUrl}</span>
                            </a>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadSvgFile(kit.qrSvg, `${client.slug}-qr-resenas.svg`)
                                }
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>QR .svg</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(kit.reviewUrl, "Enlace directo de reseña")}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 cursor-pointer"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>Copiar URL</span>
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-zinc-400">
                          Ingresá un Google Place ID válido para generar el QR offline.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModeBySlug((prev) => ({
                            ...prev,
                            [client.slug]: "tier1_manual",
                          }))
                        }
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          reviewMode === "tier1_manual"
                            ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800"
                        }`}
                      >
                        Tier 1 Manual
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModeBySlug((prev) => ({
                            ...prev,
                            [client.slug]: "tier2_post_consult",
                          }))
                        }
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          reviewMode === "tier2_post_consult"
                            ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800"
                        }`}
                      >
                        Tier 2 Post-Consulta
                      </button>
                    </div>

                    <p className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-900 text-[11px] text-zinc-300 leading-relaxed">
                      {activeReviewMsg}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!kit}
                        onClick={() =>
                          handleCopy(activeReviewMsg, "Mensaje WhatsApp de Reseñas (+40)")
                        }
                        className="py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 disabled:opacity-45 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Copiar WA +40</span>
                      </button>
                      <button
                        type="button"
                        disabled={!kit}
                        onClick={() =>
                          kit &&
                          handleCopy(
                            JSON.stringify(kit.workflowPayload, null, 2),
                            "Payload 03-review-booster.json"
                          )
                        }
                        className="py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-zinc-900 text-zinc-200 border border-zinc-700 hover:border-purple-500 disabled:opacity-45 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Payload n8n</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen Agregado Gate 1 (autonomous_events sin PII) */}
      <div className="p-6 rounded-2xl border bg-[#0B0D12] border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Contadores Agregados Motor Gate 1 (Sin PII · Ley 25.326)</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Totales reportados por cliente desde <code className="font-mono">public.autonomous_events</code>.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Total acumulado: <strong className="text-white">{gate1Summary.totalEvents}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          {(
            [
              ["heartbeat", "Latidos"],
              ["appointment_confirmed", "Confirmados"],
              ["appointment_rescheduled", "Reprogramados"],
              ["appointment_cancelled", "Cancelados"],
              ["waitlist_filled", "Lista Espera"],
              ["review_invite_sent", "Invit. Reseña"],
              ["human_handoff", "Derivación"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="p-3 rounded-xl bg-[#040607] border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">{label}</span>
              <span className="text-base font-bold font-mono text-white">
                {gate1Summary.byType[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
