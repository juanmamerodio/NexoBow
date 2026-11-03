// web/src/lib/videos.ts — Lógica de Dominio y Pipeline Audiovisual de Alaynow
import { getBrowserSupabaseClient } from "./supabase.ts";

export type VideoProductionStage =
  | "idea"
  | "guion"
  | "grabacion"
  | "edicion"
  | "programado"
  | "publicado";

export interface AlaynowVideo {
  id?: number | string;
  title: string;
  description?: string;
  stage: VideoProductionStage;
  target_date?: string | null; // YYYY-MM-DD
  published_at?: string | null; // ISO timestamp
  script_url?: string;
  thumbnail_url?: string;
  video_url?: string;
  has_sponsor?: boolean;
  sponsor_name?: string;
  sponsor_fee?: number;
  sponsor_currency?: "USD" | "ARS";
  is_sponsor_paid?: boolean;
  views_count?: number;
  ctr_percent?: number;
  likes_count?: number;
  comments_count?: number;
  metrics_updated_at?: string | null;
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface VideoStageConfig {
  stage: VideoProductionStage;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export interface VideoPipelineKpis {
  totalVideos: number;
  inProductionCount: number;
  publishedCount: number;
  totalViews: number;
  avgCtr: number;
  totalSponsorRevenueUsd: number;
  paidSponsorRevenueUsd: number;
  pendingSponsorRevenueUsd: number;
  sponsoredVideosCount: number;
  videosByStage: Record<VideoProductionStage, number>;
}

export interface QuickMetricsUpdatePayload {
  id: number | string;
  views_count: number;
  ctr_percent: number;
  likes_count?: number;
  comments_count?: number;
}

export const DEFAULT_USD_EXCHANGE_RATE = 1250;

export const STAGE_ORDER: VideoProductionStage[] = [
  "idea",
  "guion",
  "grabacion",
  "edicion",
  "programado",
  "publicado",
];

export const VIDEO_STAGES: VideoStageConfig[] = [
  {
    stage: "idea",
    label: "Ideas & Conceptos",
    shortLabel: "Ideas",
    description: "Lluvia de conceptos, análisis de retención y validación temática",
    color: "#BF40FA", // Soft Obsidian Hyper Magenta
    badgeBg: "rgba(191, 64, 250, 0.12)",
    borderColor: "rgba(191, 64, 250, 0.3)",
  },
  {
    stage: "guion",
    label: "Guión & Storyboard",
    shortLabel: "Guión",
    description: "Estructura de ganchos psicológicos, retención y CTAs",
    color: "#60A5FA", // Blue
    badgeBg: "rgba(96, 165, 250, 0.12)",
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  {
    stage: "grabacion",
    label: "Grabación & Rodaje",
    shortLabel: "Grabación",
    description: "Rodaje en set AfterBow, teleprompter y tomas B-roll",
    color: "#EF4444", // Red
    badgeBg: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  {
    stage: "edicion",
    label: "Edición & Post",
    shortLabel: "Edición",
    description: "Cortes de ritmo, motion graphics, sound design y colorimetría",
    color: "#F59E0B", // Amber
    badgeBg: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  {
    stage: "programado",
    label: "Programado / SEO",
    shortLabel: "Programado",
    description: "Subido a YouTube Studio con miniatura A/B y metadatos",
    color: "#06B6D4", // Cyan
    badgeBg: "rgba(6, 182, 212, 0.12)",
    borderColor: "rgba(6, 182, 212, 0.3)",
  },
  {
    stage: "publicado",
    label: "Publicado / Métricas",
    shortLabel: "Publicado",
    description: "En vivo en YouTube con telemetría de vistas y CTR %",
    color: "#10B981", // Emerald
    badgeBg: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
];

// Semillas realistas de muestra para modo offline / showroom
export const DEFAULT_MOCK_VIDEOS: AlaynowVideo[] = [
  {
    id: 1,
    title: "Cómo Conseguir tus Primeros 10 Clientes de Salud sin Anuncios",
    description: "Estrategia orgánica de prospección en Maps + WhatsApp para nutricionistas y clínicas.",
    stage: "publicado",
    target_date: "2026-10-15",
    published_at: "2026-10-15T18:00:00Z",
    script_url: "https://docs.google.com/document/d/mock-script-1",
    thumbnail_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    video_url: "https://youtube.com/watch?v=mock-vid-1",
    has_sponsor: true,
    sponsor_name: "Notion",
    sponsor_fee: 450,
    sponsor_currency: "USD",
    is_sponsor_paid: true,
    views_count: 14250,
    ctr_percent: 8.4,
    likes_count: 980,
    comments_count: 112,
    metrics_updated_at: "2026-11-01T12:00:00Z",
    tags: ["b2b", "nutricion", "ventas"],
    notes: "Récord de CTR histórico en la primera hora tras el estreno.",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-11-01T12:00:00Z",
  },
  {
    id: 2,
    title: "Ingeniería Inversa a una Landing de $10.000 USD (0 JavaScript)",
    description: "Análisis profundo del arquetipo obsidian-authority y por qué la velocidad extrema convierte.",
    stage: "publicado",
    target_date: "2026-10-25",
    published_at: "2026-10-25T19:30:00Z",
    script_url: "https://docs.google.com/document/d/mock-script-2",
    thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    video_url: "https://youtube.com/watch?v=mock-vid-2",
    has_sponsor: false,
    views_count: 8900,
    ctr_percent: 7.1,
    likes_count: 620,
    comments_count: 78,
    metrics_updated_at: "2026-11-02T10:00:00Z",
    tags: ["astro", "ssg", "diseño"],
    notes: "Generó 4 consultas directas de diseño web por WhatsApp.",
    created_at: "2026-10-18T14:00:00Z",
    updated_at: "2026-11-02T10:00:00Z",
  },
  {
    id: 3,
    title: "Automatización de WhatsApp con IA para Consultorios Médicos",
    description: "Flujo n8n + webhook para filtrar consultas y sincronizar agendamientos en Google Calendar.",
    stage: "programado",
    target_date: "2026-11-05",
    script_url: "https://docs.google.com/document/d/mock-script-3",
    thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
    has_sponsor: true,
    sponsor_name: "Make / Celonis",
    sponsor_fee: 500,
    sponsor_currency: "USD",
    is_sponsor_paid: false,
    views_count: 0,
    ctr_percent: 0,
    tags: ["automatizacion", "n8n", "medicina"],
    notes: "Programado para salir este jueves 19:00 hs.",
    created_at: "2026-10-28T09:00:00Z",
    updated_at: "2026-11-02T15:00:00Z",
  },
  {
    id: 4,
    title: "Por Qué el 90% de las Clínicas Pierden Pacientes en Instagram",
    description: "Diagnóstico del embudo roto: de perfiles con linktr.ee a landings con sistema de agendamiento cerrado.",
    stage: "edicion",
    target_date: "2026-11-12",
    script_url: "https://docs.google.com/document/d/mock-script-4",
    thumbnail_url: "",
    has_sponsor: false,
    tags: ["instagram", "salud", "conversion"],
    notes: "Cortes terminados en AfterBow. Falta agregar sound effects y gráficos animados.",
    created_at: "2026-10-29T11:00:00Z",
    updated_at: "2026-11-02T18:00:00Z",
  },
  {
    id: 5,
    title: "Setup Mínimo Viable para Vender Consultorías de Alto Valor",
    description: "Micrófono Shure, cámara Sony y software de entrega para profesionales de servicio.",
    stage: "grabacion",
    target_date: "2026-11-18",
    script_url: "https://docs.google.com/document/d/mock-script-5",
    has_sponsor: true,
    sponsor_name: "Rode",
    sponsor_fee: 350,
    sponsor_currency: "USD",
    is_sponsor_paid: true,
    tags: ["hardware", "afterbow", "consultoria"],
    notes: "Grabación fijada en el bloque de tiempo del martes en AfterBow.",
    created_at: "2026-11-01T08:30:00Z",
    updated_at: "2026-11-02T16:00:00Z",
  },
  {
    id: 6,
    title: "El Secreto del Copywriting de Alivio Hormozi para Abogados",
    description: "Cómo transformar textos técnicos aburridos en propuestas de valor irresistibles con voseo argentino.",
    stage: "guion",
    target_date: "2026-11-25",
    script_url: "https://docs.google.com/document/d/mock-script-6",
    has_sponsor: false,
    tags: ["copywriting", "hormozi", "abogados"],
    notes: "Primer borrador del gancho de apertura listo. Faltan testimonios de ejemplo.",
    created_at: "2026-11-02T09:00:00Z",
    updated_at: "2026-11-02T14:00:00Z",
  },
  {
    id: 7,
    title: "De Empleado a Fábrica de Landings: La Historia Detrás de NexoBow",
    description: "Storytelling del fundador, lecciones aprendidas y cómo construimos un sistema escalable con agentes de IA.",
    stage: "idea",
    target_date: "2026-12-05",
    has_sponsor: false,
    tags: ["storytelling", "emprendimiento", "nexobow"],
    notes: "Idea de video personal/filosófico para fin de año.",
    created_at: "2026-11-02T11:00:00Z",
    updated_at: "2026-11-02T11:00:00Z",
  },
];

// -------------------------------------------------------------
// Funciones Puras de Dominio
// -------------------------------------------------------------

export function isValidVideoStage(stage: any): stage is VideoProductionStage {
  return STAGE_ORDER.includes(stage);
}

export function getNextStage(currentStage: VideoProductionStage): VideoProductionStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

export function getPreviousStage(currentStage: VideoProductionStage): VideoProductionStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return STAGE_ORDER[currentIndex - 1];
}

export function validateVideoPayload(video: Partial<AlaynowVideo>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!video.title || video.title.trim().length === 0) {
    errors.push("El título del video es obligatorio");
  } else if (video.title.trim().length > 180) {
    errors.push("El título no debe exceder los 180 caracteres");
  }

  if (video.stage && !isValidVideoStage(video.stage)) {
    errors.push(`La etapa '${video.stage}' no es válida`);
  }

  if (video.has_sponsor) {
    if (!video.sponsor_name || video.sponsor_name.trim().length === 0) {
      errors.push("Debe indicar el nombre de la marca si tiene patrocinio");
    }
    if (video.sponsor_fee !== undefined && (isNaN(Number(video.sponsor_fee)) || Number(video.sponsor_fee) < 0)) {
      errors.push("El fee pactado debe ser un número mayor o igual a 0");
    }
  }

  if (video.views_count !== undefined && (isNaN(Number(video.views_count)) || Number(video.views_count) < 0)) {
    errors.push("Las vistas deben ser un número entero mayor o igual a 0");
  }

  if (video.ctr_percent !== undefined && (isNaN(Number(video.ctr_percent)) || Number(video.ctr_percent) < 0 || Number(video.ctr_percent) > 100)) {
    errors.push("El CTR debe ser un porcentaje entre 0 y 100");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function computeVideoPipelineKpis(videos: AlaynowVideo[]): VideoPipelineKpis {
  const totalVideos = videos.length;
  const inProductionStages: VideoProductionStage[] = ["idea", "guion", "grabacion", "edicion", "programado"];

  let inProductionCount = 0;
  let publishedCount = 0;
  let totalViews = 0;
  let ctrSum = 0;
  let ctrCount = 0;
  let totalSponsorRevenueUsd = 0;
  let paidSponsorRevenueUsd = 0;
  let pendingSponsorRevenueUsd = 0;
  let sponsoredVideosCount = 0;

  const videosByStage: Record<VideoProductionStage, number> = {
    idea: 0,
    guion: 0,
    grabacion: 0,
    edicion: 0,
    programado: 0,
    publicado: 0,
  };

  for (const video of videos) {
    if (isValidVideoStage(video.stage)) {
      videosByStage[video.stage] = (videosByStage[video.stage] || 0) + 1;
    }

    if (inProductionStages.includes(video.stage)) {
      inProductionCount++;
    } else if (video.stage === "publicado") {
      publishedCount++;
      const views = Number(video.views_count) || 0;
      totalViews += views;

      const ctr = Number(video.ctr_percent) || 0;
      if (ctr > 0) {
        ctrSum += ctr;
        ctrCount++;
      }
    }

    if (video.has_sponsor && video.sponsor_fee) {
      sponsoredVideosCount++;
      const fee = Number(video.sponsor_fee) || 0;
      const currency = video.sponsor_currency || "USD";
      const feeInUsd = currency === "ARS" ? fee / DEFAULT_USD_EXCHANGE_RATE : fee;

      totalSponsorRevenueUsd += feeInUsd;
      if (video.is_sponsor_paid) {
        paidSponsorRevenueUsd += feeInUsd;
      } else {
        pendingSponsorRevenueUsd += feeInUsd;
      }
    }
  }

  const avgCtr = ctrCount > 0 ? Number((ctrSum / ctrCount).toFixed(2)) : 0;

  return {
    totalVideos,
    inProductionCount,
    publishedCount,
    totalViews,
    avgCtr,
    totalSponsorRevenueUsd: Math.round(totalSponsorRevenueUsd * 100) / 100,
    paidSponsorRevenueUsd: Math.round(paidSponsorRevenueUsd * 100) / 100,
    pendingSponsorRevenueUsd: Math.round(pendingSponsorRevenueUsd * 100) / 100,
    sponsoredVideosCount,
    videosByStage,
  };
}

export function calculateSponsorRevenue(
  videos: AlaynowVideo[],
  usdExchangeRate: number = DEFAULT_USD_EXCHANGE_RATE
): {
  totalUsd: number;
  totalArs: number;
  paidUsd: number;
  pendingUsd: number;
} {
  let totalUsd = 0;
  let paidUsd = 0;
  let pendingUsd = 0;

  for (const video of videos) {
    if (video.has_sponsor && video.sponsor_fee) {
      const fee = Number(video.sponsor_fee) || 0;
      const currency = video.sponsor_currency || "USD";
      const feeUsd = currency === "ARS" ? fee / usdExchangeRate : fee;

      totalUsd += feeUsd;
      if (video.is_sponsor_paid) {
        paidUsd += feeUsd;
      } else {
        pendingUsd += feeUsd;
      }
    }
  }

  const totalArs = Math.round(totalUsd * usdExchangeRate);

  return {
    totalUsd: Math.round(totalUsd * 100) / 100,
    totalArs,
    paidUsd: Math.round(paidUsd * 100) / 100,
    pendingUsd: Math.round(pendingUsd * 100) / 100,
  };
}

export function groupVideosByStage(videos: AlaynowVideo[]): Record<VideoProductionStage, AlaynowVideo[]> {
  const grouped: Record<VideoProductionStage, AlaynowVideo[]> = {
    idea: [],
    guion: [],
    grabacion: [],
    edicion: [],
    programado: [],
    publicado: [],
  };

  for (const video of videos) {
    const stage = isValidVideoStage(video.stage) ? video.stage : "idea";
    grouped[stage].push(video);
  }

  // Ordenar dentro de cada columna por fecha prevista o ID descendente
  for (const stage of STAGE_ORDER) {
    grouped[stage].sort((a, b) => {
      if (a.target_date && b.target_date) {
        return a.target_date.localeCompare(b.target_date);
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }

  return grouped;
}

export function filterVideos(
  videos: AlaynowVideo[],
  filters: {
    stage?: VideoProductionStage | "all";
    hasSponsor?: boolean;
    search?: string;
  }
): AlaynowVideo[] {
  return videos.filter((video) => {
    if (filters.stage && filters.stage !== "all" && video.stage !== filters.stage) {
      return false;
    }

    if (filters.hasSponsor !== undefined && Boolean(video.has_sponsor) !== filters.hasSponsor) {
      return false;
    }

    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      const matchTitle = (video.title || "").toLowerCase().includes(q);
      const matchDesc = (video.description || "").toLowerCase().includes(q);
      const matchSponsor = (video.sponsor_name || "").toLowerCase().includes(q);
      const matchTags = (video.tags || []).some((t) => t.toLowerCase().includes(q));

      if (!matchTitle && !matchDesc && !matchSponsor && !matchTags) {
        return false;
      }
    }

    return true;
  });
}

export function formatViewsCount(views: number): string {
  if (isNaN(views) || views <= 0) return "0";
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toLocaleString("es-AR");
}

export function formatCtrPercent(ctr: number): string {
  if (isNaN(ctr) || ctr <= 0) return "0.0%";
  return `${Number(ctr).toFixed(1)}%`;
}

export function calculateEngagementRate(
  views: number,
  likes: number = 0,
  comments: number = 0
): number {
  if (views <= 0) return 0;
  const interactions = (Number(likes) || 0) + (Number(comments) || 0);
  return Number(((interactions / views) * 100).toFixed(2));
}

// -------------------------------------------------------------
// Persistencia Supabase para Videos de Alaynow
// -------------------------------------------------------------

export async function fetchAlaynowVideos(): Promise<AlaynowVideo[]> {
  try {
    const supabase = getBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("alaynow_videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase alaynow_videos error (usando mock de desarrollo):", error.message);
      return DEFAULT_MOCK_VIDEOS;
    }

    if (!data || data.length === 0) {
      return DEFAULT_MOCK_VIDEOS;
    }

    return (data || []).map((row: any) => ({
      ...row,
      views_count: Number(row.views_count) || 0,
      ctr_percent: Number(row.ctr_percent) || 0,
      likes_count: Number(row.likes_count) || 0,
      comments_count: Number(row.comments_count) || 0,
      sponsor_fee: Number(row.sponsor_fee) || 0,
      has_sponsor: Boolean(row.has_sponsor),
      is_sponsor_paid: Boolean(row.is_sponsor_paid),
      tags: Array.isArray(row.tags) ? row.tags : [],
    }));
  } catch (err: any) {
    console.warn("Fallo conectando a Supabase para alaynow_videos, cargando mock:", err);
    return DEFAULT_MOCK_VIDEOS;
  }
}

export async function saveAlaynowVideo(
  video: Partial<AlaynowVideo>
): Promise<{ ok: boolean; data?: AlaynowVideo; error?: string }> {
  const validation = validateVideoPayload(video);
  if (!validation.valid) {
    return { ok: false, error: validation.errors.join(". ") };
  }

  const supabase = getBrowserSupabaseClient();

  const payload: any = {
    title: video.title?.trim(),
    description: video.description || "",
    stage: video.stage || "idea",
    target_date: video.target_date || null,
    published_at: video.published_at || (video.stage === "publicado" ? new Date().toISOString() : null),
    script_url: video.script_url || "",
    thumbnail_url: video.thumbnail_url || "",
    video_url: video.video_url || "",
    has_sponsor: Boolean(video.has_sponsor),
    sponsor_name: video.has_sponsor ? (video.sponsor_name || "").trim() : "",
    sponsor_fee: video.has_sponsor ? Number(video.sponsor_fee) || 0 : 0,
    sponsor_currency: video.sponsor_currency || "USD",
    is_sponsor_paid: Boolean(video.is_sponsor_paid),
    views_count: Number(video.views_count) || 0,
    ctr_percent: Number(video.ctr_percent) || 0,
    likes_count: Number(video.likes_count) || 0,
    comments_count: Number(video.comments_count) || 0,
    tags: Array.isArray(video.tags) ? video.tags : [],
    notes: video.notes || "",
    metadata: video.metadata || {},
  };

  const isExistingDbRecord =
    video.id !== undefined &&
    video.id !== null &&
    typeof video.id === "number" &&
    video.id < 1000000000 &&
    !isNaN(video.id);

  try {
    const query = isExistingDbRecord
      ? supabase.from("alaynow_videos").update(payload).eq("id", video.id).select().single()
      : supabase.from("alaynow_videos").insert([payload]).select().single();

    const { data, error } = await query;
    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: {
        ...data,
        views_count: Number(data.views_count) || 0,
        ctr_percent: Number(data.ctr_percent) || 0,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al persistir video" };
  }
}

export async function updateVideoStage(
  id: number | string,
  stage: VideoProductionStage
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidVideoStage(stage)) {
    return { ok: false, error: `Etapa inválida: ${stage}` };
  }

  const supabase = getBrowserSupabaseClient();
  const updatePayload: any = { stage };
  if (stage === "publicado") {
    updatePayload.published_at = new Date().toISOString();
  }

  try {
    const { error } = await supabase
      .from("alaynow_videos")
      .update(updatePayload)
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al actualizar etapa de video" };
  }
}

export async function updateVideoMetrics(
  payload: QuickMetricsUpdatePayload
): Promise<{ ok: boolean; error?: string }> {
  const views = Number(payload.views_count);
  const ctr = Number(payload.ctr_percent);

  if (isNaN(views) || views < 0) {
    return { ok: false, error: "Vistas inválidas: debe ser un número entero mayor o igual a 0" };
  }

  if (isNaN(ctr) || ctr < 0 || ctr > 100) {
    return { ok: false, error: "CTR inválido: debe ser un porcentaje entre 0 y 100" };
  }

  const supabase = getBrowserSupabaseClient();
  const updateData: any = {
    views_count: views,
    ctr_percent: ctr,
    metrics_updated_at: new Date().toISOString(),
  };

  if (payload.likes_count !== undefined) {
    updateData.likes_count = Number(payload.likes_count) || 0;
  }
  if (payload.comments_count !== undefined) {
    updateData.comments_count = Number(payload.comments_count) || 0;
  }

  try {
    const { error } = await supabase
      .from("alaynow_videos")
      .update(updateData)
      .eq("id", payload.id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al actualizar métricas" };
  }
}

export async function deleteAlaynowVideo(
  id: number | string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getBrowserSupabaseClient();
  try {
    const { error } = await supabase.from("alaynow_videos").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al eliminar video" };
  }
}
