// web/src/components/admin/views/VideosView.tsx — Pipeline Editorial de Contenido Alaynow YouTube
import React, { useState, useEffect, useMemo } from "react";
import {
  type AlaynowVideo,
  type VideoProductionStage,
  type VideoPipelineKpis,
  STAGE_ORDER,
  VIDEO_STAGES,
  DEFAULT_MOCK_VIDEOS,
  isValidVideoStage,
  getNextStage,
  getPreviousStage,
  validateVideoPayload,
  computeVideoPipelineKpis,
  calculateSponsorRevenue,
  groupVideosByStage,
  filterVideos,
  formatViewsCount,
  formatCtrPercent,
  calculateEngagementRate,
  fetchAlaynowVideos,
  saveAlaynowVideo,
  updateVideoStage,
  updateVideoMetrics,
  deleteAlaynowVideo,
} from "../../../lib/videos.ts";
import {
  Video,
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  Save,
  Trash2,
  Edit2,
  ExternalLink,
  FileText,
  DollarSign,
  Eye,
  MousePointerClick,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Film,
  AlertCircle,
  TrendingUp,
  BarChart3,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";

interface VideosViewProps {
  onNavigate?: (path: string) => void;
}

export const VideosView: React.FC<VideosViewProps> = ({ onNavigate }) => {
  const [videos, setVideos] = useState<AlaynowVideo[]>(DEFAULT_MOCK_VIDEOS);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successToast, setSuccessToast] = useState<string>("");

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [sponsorFilter, setSponsorFilter] = useState<"all" | "sponsored" | "no_sponsor">("all");
  const [stageFilter, setStageFilter] = useState<VideoProductionStage | "all">("all");

  // Estado para Modal de Creación / Edición Completa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<AlaynowVideo> | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para Modal Rápido de Métricas Post-Lanzamiento
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [metricsTargetVideo, setMetricsTargetVideo] = useState<AlaynowVideo | null>(null);
  const [quickViews, setQuickViews] = useState<number>(0);
  const [quickCtr, setQuickCtr] = useState<number>(0);
  const [quickLikes, setQuickLikes] = useState<number>(0);
  const [quickComments, setQuickComments] = useState<number>(0);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);

  // Carga inicial
  const loadVideos = async () => {
    try {
      setIsRefreshing(true);
      const data = await fetchAlaynowVideos();
      setVideos(data);
    } catch (err: any) {
      console.error("Error cargando videos de Alaynow:", err);
      setErrorMessage("No se pudieron sincronizar los videos con la base de datos.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Notificación temporal
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(""), 4000);
  };

  // KPIs calculados
  const kpis: VideoPipelineKpis = useMemo(() => {
    return computeVideoPipelineKpis(videos);
  }, [videos]);

  const sponsorSummary = useMemo(() => {
    return calculateSponsorRevenue(videos);
  }, [videos]);

  // Filtrado
  const filteredVideos = useMemo(() => {
    const hasSponsorParam =
      sponsorFilter === "sponsored" ? true : sponsorFilter === "no_sponsor" ? false : undefined;

    return filterVideos(videos, {
      stage: stageFilter,
      hasSponsor: hasSponsorParam,
      search: searchQuery,
    });
  }, [videos, stageFilter, sponsorFilter, searchQuery]);

  // Agrupación por etapa para el tablero Kanban
  const groupedVideos = useMemo(() => {
    return groupVideosByStage(filteredVideos);
  }, [filteredVideos]);

  // Mover tarjeta a la etapa siguiente
  const handleAdvanceStage = async (video: AlaynowVideo) => {
    const next = getNextStage(video.stage);
    if (!next) return;

    // Actualización optimista
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, stage: next } : v))
    );

    const res = await updateVideoStage(video.id!, next);
    if (!res.ok) {
      showToast(`Error: ${res.error}`);
      loadVideos();
    } else {
      showToast(`Video movido a etapa '${next}'`);
    }
  };

  // Mover tarjeta a la etapa anterior
  const handleRegressStage = async (video: AlaynowVideo) => {
    const prev = getPreviousStage(video.stage);
    if (!prev) return;

    setVideos((current) =>
      current.map((v) => (v.id === video.id ? { ...v, stage: prev } : v))
    );

    const res = await updateVideoStage(video.id!, prev);
    if (!res.ok) {
      showToast(`Error: ${res.error}`);
      loadVideos();
    } else {
      showToast(`Video regresado a etapa '${prev}'`);
    }
  };

  // Abrir modal de creación
  const handleOpenCreateModal = (defaultStage: VideoProductionStage = "idea") => {
    setEditingVideo({
      title: "",
      description: "",
      stage: defaultStage,
      target_date: new Date().toISOString().split("T")[0],
      script_url: "",
      thumbnail_url: "",
      video_url: "",
      has_sponsor: false,
      sponsor_name: "",
      sponsor_fee: 0,
      sponsor_currency: "USD",
      is_sponsor_paid: false,
      views_count: 0,
      ctr_percent: 0,
      tags: [],
      notes: "",
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (video: AlaynowVideo) => {
    setEditingVideo({
      ...video,
      tags: Array.isArray(video.tags) ? [...video.tags] : [],
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Guardar video (Creación o Actualización)
  const handleSaveVideo = async () => {
    if (!editingVideo) return;

    const validation = validateVideoPayload(editingVideo);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      setIsSaving(true);
      const res = await saveAlaynowVideo(editingVideo);
      if (!res.ok) {
        setFormErrors([res.error || "Error al guardar el video"]);
        return;
      }

      showToast(
        editingVideo.id
          ? "Video actualizado con éxito"
          : "Nuevo video creado en el pipeline"
      );
      setIsModalOpen(false);
      setEditingVideo(null);
      await loadVideos();
    } catch (err: any) {
      setFormErrors([err.message || "Error inesperado"]);
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar video
  const handleDeleteVideo = async (id: number | string) => {
    if (!confirm("¿Estás seguro de eliminar este video del pipeline?")) return;

    setVideos((prev) => prev.filter((v) => v.id !== id));
    const res = await deleteAlaynowVideo(id);
    if (!res.ok) {
      showToast(`Error al eliminar: ${res.error}`);
      loadVideos();
    } else {
      showToast("Video eliminado del pipeline");
      if (isModalOpen) setIsModalOpen(false);
    }
  };

  // Abrir modal rápido de métricas post-publicación
  const handleOpenMetricsModal = (video: AlaynowVideo) => {
    setMetricsTargetVideo(video);
    setQuickViews(video.views_count || 0);
    setQuickCtr(video.ctr_percent || 0);
    setQuickLikes(video.likes_count || 0);
    setQuickComments(video.comments_count || 0);
    setIsMetricsModalOpen(true);
  };

  // Guardar métricas rápidas
  const handleSaveQuickMetrics = async () => {
    if (!metricsTargetVideo) return;

    try {
      setIsSavingMetrics(true);
      const res = await updateVideoMetrics({
        id: metricsTargetVideo.id!,
        views_count: quickViews,
        ctr_percent: quickCtr,
        likes_count: quickLikes,
        comments_count: quickComments,
      });

      if (!res.ok) {
        alert(res.error);
        return;
      }

      setVideos((prev) =>
        prev.map((v) =>
          v.id === metricsTargetVideo.id
            ? {
                ...v,
                views_count: quickViews,
                ctr_percent: quickCtr,
                likes_count: quickLikes,
                comments_count: quickComments,
                metrics_updated_at: new Date().toISOString(),
              }
            : v
        )
      );

      showToast(`Métricas actualizadas: ${formatViewsCount(quickViews)} vistas | ${quickCtr}% CTR`);
      setIsMetricsModalOpen(false);
      setMetricsTargetVideo(null);
    } catch (err: any) {
      alert("Error actualizando métricas: " + err.message);
    } finally {
      setIsSavingMetrics(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Toast de Éxito */}
      {successToast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-4"
          style={{
            backgroundColor: "#0B0D12",
            borderColor: "rgba(16, 185, 129, 0.4)",
            color: "#10B981",
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Banner Superior & Título */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderColor: "rgba(239, 68, 68, 0.35)",
                color: "#F87171",
              }}
            >
              <Video className="w-3 h-3" />
              <span>Canal Alaynow • Producción YouTube</span>
            </span>
            <span className="text-zinc-500 text-xs font-mono">6 Etapas Editorial</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
            Pipeline de Videos & Patrocinios
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestión editorial desde la concepción de ideas hasta la analítica post-lanzamiento en YouTube.
          </p>
        </div>

        {/* Acciones Globales */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadVideos}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
            title="Sincronizar videos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal("idea")}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all text-white"
            style={{
              backgroundColor: "#BF40FA",
              boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Video</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Videos */}
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Total Videos</span>
            <Film className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-extrabold text-white">{kpis.totalVideos}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">En base de datos</p>
        </div>

        {/* En Producción */}
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">En Producción</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-amber-300">{kpis.inProductionCount}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Etapas 1 a 5</p>
        </div>

        {/* Publicados */}
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Publicados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-300">{kpis.publishedCount}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">En vivo en YouTube</p>
        </div>

        {/* Vistas Totales */}
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Vistas Totales</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl font-extrabold text-cyan-300">{formatViewsCount(kpis.totalViews)}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Audiencia acumulada</p>
        </div>

        {/* CTR Promedio */}
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">CTR Promedio</span>
            <MousePointerClick className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-xl font-extrabold text-pink-300">{formatCtrPercent(kpis.avgCtr)}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Click-Through Rate</p>
        </div>

        {/* Ingresos Sponsor */}
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-zinc-400 font-medium">Sponsorships</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-300">${kpis.totalSponsorRevenueUsd} <span className="text-xs font-normal text-zinc-400">USD</span></p>
          <p className="text-[10px] text-zinc-500 mt-0.5">${kpis.paidSponsorRevenueUsd} USD cobrados</p>
        </div>
      </div>

      {/* Barra de Filtros & Búsqueda */}
      <div
        className="p-3 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, temática, sponsor o tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/40 border text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            style={{ borderColor: "#1A1D26" }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro por Patrocinio */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Sponsor:
          </span>
          {[
            { id: "all", label: "Todos" },
            { id: "sponsored", label: "Con Sponsor" },
            { id: "no_sponsor", label: "Sin Sponsor" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSponsorFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                sponsorFilter === tab.id
                  ? "bg-purple-950/80 text-purple-300 border border-purple-500/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tablero Kanban (6 Etapas Horizontales) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {STAGE_ORDER.map((stageKey) => {
          const stageConfig = VIDEO_STAGES.find((s) => s.stage === stageKey)!;
          const stageVideos = groupedVideos[stageKey] || [];

          return (
            <div
              key={stageKey}
              className="flex flex-col rounded-2xl border min-w-0"
              style={{
                backgroundColor: "#07090E",
                borderColor: "#1A1D26",
              }}
            >
              {/* Header de Columna */}
              <div
                className="p-3 border-b flex items-center justify-between"
                style={{
                  borderColor: "#1A1D26",
                  borderTop: `3px solid ${stageConfig.color}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">
                    {stageConfig.shortLabel}
                  </h3>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: stageConfig.badgeBg,
                      color: stageConfig.color,
                      border: `1px solid ${stageConfig.borderColor}`,
                    }}
                  >
                    {stageVideos.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(stageKey)}
                  className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title={`Crear video en ${stageConfig.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista de Tarjetas */}
              <div className="p-2 space-y-2.5 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {stageVideos.length === 0 ? (
                  <div className="p-6 text-center text-zinc-600 font-mono text-[11px] border border-dashed border-zinc-800/80 rounded-xl my-2">
                    Sin videos en esta etapa
                  </div>
                ) : (
                  stageVideos.map((video) => {
                    return (
                      <VideoCard
                        key={video.id}
                        video={video}
                        stageConfig={stageConfig}
                        onAdvance={() => handleAdvanceStage(video)}
                        onRegress={() => handleRegressStage(video)}
                        onEdit={() => handleOpenEditModal(video)}
                        onDelete={() => handleDeleteVideo(video.id!)}
                        onOpenMetrics={() => handleOpenMetricsModal(video)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Completo: Creación / Edición de Video */}
      {isModalOpen && editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="max-w-2xl w-full rounded-2xl border p-6 max-h-[90vh] overflow-y-auto space-y-5"
            style={{ backgroundColor: "#0B0D12", borderColor: "rgba(191, 64, 250, 0.3)" }}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "#1A1D26" }}>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingVideo.id ? "Editar Ficha de Video" : "Nuevo Video para Alaynow"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alertas de Validación */}
            {formErrors.length > 0 && (
              <div className="p-3 rounded-xl border bg-red-950/40 border-red-500/30 text-red-300 text-xs space-y-1">
                {formErrors.map((err, i) => (
                  <p key={i} className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{err}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Formulario */}
            <div className="space-y-4 text-xs">
              {/* Título */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Título del Video *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cómo Conseguir tus Primeros 10 Clientes de Salud..."
                  value={editingVideo.title || ""}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  style={{ borderColor: "#1A1D26" }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Descripción / Gancho / Concepto
                </label>
                <textarea
                  rows={2}
                  placeholder="Síntesis temática, gancho inicial o propuesta de valor del video..."
                  value={editingVideo.description || ""}
                  onChange={(e) =>
                    setEditingVideo({ ...editingVideo, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  style={{ borderColor: "#1A1D26" }}
                />
              </div>

              {/* Fila: Etapa y Fecha Prevista */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Etapa Editorial *
                  </label>
                  <select
                    value={editingVideo.stage || "idea"}
                    onChange={(e) =>
                      setEditingVideo({
                        ...editingVideo,
                        stage: e.target.value as VideoProductionStage,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white focus:outline-none focus:border-purple-500"
                    style={{ borderColor: "#1A1D26" }}
                  >
                    {VIDEO_STAGES.map((s) => (
                      <option key={s.stage} value={s.stage} className="bg-[#0B0D12]">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Fecha Prevista / Publicación
                  </label>
                  <input
                    type="date"
                    value={editingVideo.target_date || ""}
                    onChange={(e) =>
                      setEditingVideo({ ...editingVideo, target_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white focus:outline-none focus:border-purple-500"
                    style={{ borderColor: "#1A1D26" }}
                  />
                </div>
              </div>

              {/* Enlaces de Producción: Guión, Miniatura y Video */}
              <div className="space-y-3 p-3.5 rounded-xl border bg-black/20" style={{ borderColor: "#1A1D26" }}>
                <h4 className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-purple-400" />
                  Recursos de Producción
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      Enlace al Guión (Docs / Notion)
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/..."
                      value={editingVideo.script_url || ""}
                      onChange={(e) =>
                        setEditingVideo({ ...editingVideo, script_url: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 text-xs"
                      style={{ borderColor: "#1A1D26" }}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      Preview Miniatura (URL de Imagen)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={editingVideo.thumbnail_url || ""}
                      onChange={(e) =>
                        setEditingVideo({ ...editingVideo, thumbnail_url: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 text-xs"
                      style={{ borderColor: "#1A1D26" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Enlace de YouTube / Video Publicado
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={editingVideo.video_url || ""}
                    onChange={(e) =>
                      setEditingVideo({ ...editingVideo, video_url: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 text-xs"
                    style={{ borderColor: "#1A1D26" }}
                  />
                </div>
              </div>

              {/* Patrocinio Comercial */}
              <div className="space-y-3 p-3.5 rounded-xl border bg-black/20" style={{ borderColor: "#1A1D26" }}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    Patrocinio Comercial
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingVideo.has_sponsor)}
                      onChange={(e) =>
                        setEditingVideo({ ...editingVideo, has_sponsor: e.target.checked })
                      }
                      className="w-3.5 h-3.5 rounded accent-purple-500"
                    />
                    <span className="text-zinc-300 font-medium text-xs">Incluye Patrocinador</span>
                  </label>
                </div>

                {editingVideo.has_sponsor && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">
                        Nombre de la Marca *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Notion, Rode, Make..."
                        value={editingVideo.sponsor_name || ""}
                        onChange={(e) =>
                          setEditingVideo({ ...editingVideo, sponsor_name: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-black/40 border text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 text-xs"
                        style={{ borderColor: "#1A1D26" }}
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">
                        Fee Pactado ($ USD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={editingVideo.sponsor_fee || 0}
                        onChange={(e) =>
                          setEditingVideo({
                            ...editingVideo,
                            sponsor_fee: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-black/40 border text-white focus:outline-none focus:border-purple-500 text-xs"
                        style={{ borderColor: "#1A1D26" }}
                      />
                    </div>

                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingVideo.is_sponsor_paid)}
                          onChange={(e) =>
                            setEditingVideo({ ...editingVideo, is_sponsor_paid: e.target.checked })
                          }
                          className="w-3.5 h-3.5 rounded accent-emerald-500"
                        />
                        <span className="text-emerald-400 font-medium text-xs">Pago Cobrado</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Notas & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Etiquetas (separadas por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="b2b, salud, conversion..."
                    value={(editingVideo.tags || []).join(", ")}
                    onChange={(e) =>
                      setEditingVideo({
                        ...editingVideo,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    style={{ borderColor: "#1A1D26" }}
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Notas de Rodaje / Post
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Grabar en AfterBow, usar micro Shure..."
                    value={editingVideo.notes || ""}
                    onChange={(e) =>
                      setEditingVideo({ ...editingVideo, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    style={{ borderColor: "#1A1D26" }}
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal con Botones */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "#1A1D26" }}>
              {editingVideo.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteVideo(editingVideo.id!)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Video</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveVideo}
                  disabled={isSaving}
                  className="py-2 px-5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: "#BF40FA",
                    boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Guardando..." : "Guardar Video"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido: Actualizar Métricas Post-Lanzamiento */}
      {isMetricsModalOpen && metricsTargetVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="max-w-md w-full rounded-2xl border p-6 space-y-4"
            style={{ backgroundColor: "#0B0D12", borderColor: "rgba(16, 185, 129, 0.4)" }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "#1A1D26" }}>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Métricas de Rendimiento</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMetricsModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 font-mono">Video Seleccionado:</p>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {metricsTargetVideo.title}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  Vistas Totales *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={quickViews}
                  onChange={(e) => setQuickViews(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white font-mono focus:outline-none focus:border-emerald-500"
                  style={{ borderColor: "#1A1D26" }}
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3 text-pink-400" />
                  CTR % (Click-Through) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={quickCtr}
                  onChange={(e) => setQuickCtr(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white font-mono focus:outline-none focus:border-emerald-500"
                  style={{ borderColor: "#1A1D26" }}
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-zinc-500" />
                  Likes
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickLikes}
                  onChange={(e) => setQuickLikes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white font-mono focus:outline-none focus:border-emerald-500"
                  style={{ borderColor: "#1A1D26" }}
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-zinc-500" />
                  Comentarios
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickComments}
                  onChange={(e) => setQuickComments(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border text-white font-mono focus:outline-none focus:border-emerald-500"
                  style={{ borderColor: "#1A1D26" }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#1A1D26" }}>
              <button
                type="button"
                onClick={() => setIsMetricsModalOpen(false)}
                className="py-2 px-3 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickMetrics}
                disabled={isSavingMetrics}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingMetrics ? "Guardando..." : "Guardar Métricas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponente de Tarjeta de Video en Kanban
// -------------------------------------------------------------

interface VideoCardProps {
  video: AlaynowVideo;
  stageConfig: any;
  onAdvance: () => void;
  onRegress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMetrics: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  stageConfig,
  onAdvance,
  onRegress,
  onEdit,
  onDelete,
  onOpenMetrics,
}) => {
  const isPublished = video.stage === "publicado";
  const hasNext = Boolean(getNextStage(video.stage));
  const hasPrev = Boolean(getPreviousStage(video.stage));

  return (
    <div
      className="p-3.5 rounded-xl border flex flex-col justify-between transition-all group relative hover:border-purple-500/50"
      style={{
        backgroundColor: "#0B0D12",
        borderColor: "#1A1D26",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Miniatura si existe */}
      {video.thumbnail_url && (
        <div className="mb-2.5 rounded-lg overflow-hidden border border-zinc-800 relative aspect-video bg-black/60">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Badges de Estado y Sponsor */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {/* Badge Sponsor */}
        {video.has_sponsor && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border"
            style={{
              backgroundColor: video.is_sponsor_paid
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(245, 158, 11, 0.15)",
              borderColor: video.is_sponsor_paid
                ? "rgba(16, 185, 129, 0.35)"
                : "rgba(245, 158, 11, 0.35)",
              color: video.is_sponsor_paid ? "#34D399" : "#FBBF24",
            }}
          >
            <DollarSign className="w-2.5 h-2.5" />
            <span>
              {video.sponsor_name || "Sponsor"} • ${video.sponsor_fee || 0} USD
            </span>
          </span>
        )}

        {/* Fecha Prevista */}
        {video.target_date && (
          <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {video.target_date}
          </span>
        )}
      </div>

      {/* Título */}
      <h4 className="text-xs font-bold text-white leading-snug mb-1.5 line-clamp-2">
        {video.title}
      </h4>

      {/* Descripción breve */}
      {video.description && (
        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
          {video.description}
        </p>
      )}

      {/* Tags en píldoras */}
      {video.tags && video.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {video.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[9px] px-1.5 py-0.5 rounded text-zinc-400 bg-black/40 border border-zinc-800/80"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Métricas destacadas en Publicado */}
      {isPublished && (
        <div
          className="mb-2.5 p-2 rounded-lg border text-xs flex items-center justify-between"
          style={{ backgroundColor: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.25)" }}
        >
          <div className="flex items-center gap-2">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block">Vistas</span>
              <span className="font-bold text-cyan-300 text-xs">
                {formatViewsCount(video.views_count || 0)}
              </span>
            </div>
            <div className="w-[1px] h-5 bg-zinc-800" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block">CTR</span>
              <span className="font-bold text-pink-300 text-xs">
                {formatCtrPercent(video.ctr_percent || 0)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenMetrics}
            className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
            title="Editar métricas rápidas"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Enlaces de Producción */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/60 text-[10px]">
        {video.script_url && (
          <a
            href={video.script_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 transition-colors"
            title="Abrir guión en pestaña nueva"
          >
            <FileText className="w-2.5 h-2.5" />
            <span>Guión</span>
            <ExternalLink className="w-2 h-2 text-zinc-400" />
          </a>
        )}

        {video.video_url && (
          <a
            href={video.video_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 transition-colors"
            title="Ver video en YouTube"
          >
            <Video className="w-2.5 h-2.5" />
            <span>YouTube</span>
            <ExternalLink className="w-2 h-2 text-zinc-400" />
          </a>
        )}

        <div className="flex-1" />

        {/* Acciones de Edición y Navegación de Etapa */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onRegress}
            disabled={!hasPrev}
            className={`p-1 rounded transition-colors ${
              hasPrev
                ? "text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                : "text-zinc-700 cursor-not-allowed"
            }`}
            title="Mover a etapa anterior"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-zinc-400 hover:text-purple-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Editar ficha completa"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={onAdvance}
            disabled={!hasNext}
            className={`p-1 rounded transition-colors ${
              hasNext
                ? "text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                : "text-zinc-700 cursor-not-allowed"
            }`}
            title="Mover a etapa siguiente"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
