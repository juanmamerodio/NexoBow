// web/src/components/admin/views/CrmView.tsx — Vista de CRM & Prospección con Kanban y Data Table
import React, { useState, useEffect, useMemo } from "react";
import {
  getBrowserSupabaseClient,
} from "../../../lib/supabase";
import {
  Columns,
  Table as TableIcon,
  Search,
  Filter,
  ExternalLink,
  Clock,
  RotateCw,
  X,
  Phone,
  AlertTriangle,
  Building2,
  Save,
  CheckCircle2,
  Trash2,
  MessageCircle,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  Sparkles,
} from "lucide-react";

export interface LeadEntity {
  id: number;
  slug: string;
  name: string;
  niche: string;
  contact_channel: string;
  whatsapp_link?: string | null;
  demo_url?: string | null;
  social_link?: string | null;
  location: string;
  city: string;
  funnel_status: string;
  first_contact_date?: string | null;
  last_contact_date?: string | null;
  response_status: string;
  meeting_booked: boolean;
  meeting_date?: string | null;
  potential_value: string;
  business_status: string;
  notes?: string | null;
  phone?: string | null;
  created_at?: string;
  last_activity_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export const KANBAN_STAGES = [
  { id: "1. Prospecto Identificado", label: "1. Identificado", color: "#6366F1", bg: "rgba(99, 102, 241, 0.1)" },
  { id: "2. Contactado", label: "2. Contactado", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
  { id: "3. Reunión Agendada", label: "3. Reunión", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  { id: "4. Propuesta Enviada", label: "4. Propuesta", color: "#EC4899", bg: "rgba(236, 72, 153, 0.1)" },
  { id: "5. Negociación / Cierre", label: "5. Negociación", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
  { id: "6. Descartado", label: "6. Descartado", color: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" },
];

export const RESPONSE_STATUSES = [
  "Sin Contactar",
  "Esperando Respuesta",
  "Interesado",
  "No Interesado",
  "Respondio",
];

// Leads iniciales de muestra basados en las fichas reales
const INITIAL_DEMO_LEADS: LeadEntity[] = [
  {
    id: 23,
    slug: "23-mari-calcagno-nutri",
    name: "Lic. Mari Calcagno",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491124908956",
    demo_url: "https://preview.nexobow.site/23-mari-calcagno-nutri/",
    location: "Palermo, CABA",
    city: "Palermo",
    funnel_status: "1. Prospecto Identificado",
    first_contact_date: "2026-10-26",
    response_status: "Sin Contactar",
    meeting_booked: false,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5491124908956",
    notes: "Especialista en nutrición deportiva y funcional.",
    expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 22,
    slug: "22-daniela-ramunno-nutri",
    name: "Lic. Daniela Ramunno",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491124908956",
    demo_url: "https://preview.nexobow.site/22-daniela-ramunno-nutri/",
    location: "Av. Córdoba 5869, Palermo, CABA",
    city: "Palermo",
    funnel_status: "2. Contactado",
    first_contact_date: "2026-10-26",
    response_status: "Esperando Respuesta",
    meeting_booked: false,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5491124908956",
    notes: "Educación alimentaria sin juicios con marcas de súper.",
    expires_at: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000).toISOString(), // Urgente <48h
  },
  {
    id: 20,
    slug: "20-centro-mi-nutricion-nutri",
    name: "Centro Mi Nutrición",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491138401928",
    demo_url: "https://preview.nexobow.site/20-centro-mi-nutricion-nutri/",
    location: "Belgrano, CABA",
    city: "Belgrano",
    funnel_status: "3. Reunión Agendada",
    first_contact_date: "2026-10-26",
    response_status: "Interesado",
    meeting_booked: true,
    potential_value: "$329.999 ARS",
    business_status: "En Proceso",
    phone: "+5491138401928",
    notes: "Clínica de 4 consultorios interesada en Plan Pro.",
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 15,
    slug: "15-centro-franco-diaz-nutri",
    name: "Centro Franco Díaz",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491158932014",
    demo_url: "https://preview.nexobow.site/15-centro-franco-diaz-nutri/",
    location: "Caballito, CABA",
    city: "Caballito",
    funnel_status: "4. Propuesta Enviada",
    first_contact_date: "2026-10-26",
    response_status: "Respondio",
    meeting_booked: true,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5491158932014",
    notes: "Revisando propuesta con bonos de AfterBow.",
    expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 10,
    slug: "10-lucila-fagnani-nutri",
    name: "Lic. Lucila Fagnani",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5493489501234",
    demo_url: "https://preview.nexobow.site/10-lucila-fagnani-nutri/",
    location: "Campana, Buenos Aires",
    city: "Campana",
    funnel_status: "5. Negociación / Cierre",
    first_contact_date: "2026-10-23",
    response_status: "Interesado",
    meeting_booked: true,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5493489501234",
    notes: "Acordando fecha de onboarding y sesión de fotos.",
    expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 9,
    slug: "9-lucia-vega-nutri",
    name: "Lic. Lucía Vega",
    niche: "nutricionista",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5493489512345",
    demo_url: "https://preview.nexobow.site/9-lucia-vega-nutri/",
    location: "Zárate, Buenos Aires",
    city: "Zárate",
    funnel_status: "2. Contactado",
    first_contact_date: "2026-10-23",
    response_status: "Esperando Respuesta",
    meeting_booked: false,
    potential_value: "$189.999 ARS",
    business_status: "En Proceso",
    phone: "+5493489512345",
    notes: "Vio la demo por Instagram y pidió link de WhatsApp.",
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 55,
    slug: "55-gonzalo-benitez-abogado",
    name: "Dr. Gonzalo Benítez",
    niche: "abogado",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491148209123",
    demo_url: "https://preview.nexobow.site/55-gonzalo-benitez-abogado/",
    location: "Retiro, CABA",
    city: "CABA",
    funnel_status: "1. Prospecto Identificado",
    first_contact_date: "2026-10-22",
    response_status: "Sin Contactar",
    meeting_booked: false,
    potential_value: "$249.999 ARS",
    business_status: "En Proceso",
    phone: "+5491148209123",
    notes: "Estudio societario y contractual de alta gama.",
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 42,
    slug: "42-dr-lucas-vazquez-clinica",
    name: "Dr. Lucas Vázquez - Clínica",
    niche: "clinica",
    contact_channel: "WhatsApp",
    whatsapp_link: "https://wa.me/5491149201020",
    demo_url: "https://preview.nexobow.site/42-dr-lucas-vazquez-clinica/",
    location: "Pilar, Buenos Aires",
    city: "Pilar",
    funnel_status: "2. Contactado",
    first_contact_date: "2026-10-21",
    response_status: "Sin Contactar",
    meeting_booked: false,
    potential_value: "$329.999 ARS",
    business_status: "En Proceso",
    phone: "+5491149201020",
    notes: "Centro médico con quirófano ambulatorio.",
    expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Vencido
  },
];

export function calculateDaysRemaining(expiresAt?: string | null): {
  days: number;
  hours: number;
  isExpired: boolean;
  isUrgent: boolean;
  label: string;
} {
  if (!expiresAt) {
    return { days: 7, hours: 168, isExpired: false, isUrgent: false, label: "7 días" };
  }
  const now = new Date().getTime();
  const exp = new Date(expiresAt).getTime();
  const diffMs = exp - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, isExpired: true, isUrgent: false, label: "Vencido (TTL)" };
  }

  const hours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isUrgent = hours <= 48;

  if (hours < 24) {
    return { days: 0, hours, isExpired: false, isUrgent: true, label: `${hours} hs (<24h)` };
  }
  if (isUrgent) {
    return { days: 1, hours, isExpired: false, isUrgent: true, label: `${hours} hs (<48h)` };
  }
  return { days, hours, isExpired: false, isUrgent: false, label: `${days} días` };
}

export function buildVoseoWhatsAppUrl(lead: LeadEntity): string {
  const digits = String(lead.phone || "").replace(/[^\d]/g, "");
  const demoUrl = lead.demo_url || `https://preview.nexobow.site/${lead.slug}/`;
  const name = lead.name.replace(/^(Lic\.|Dr\.|Dra\.|Mg\.)\s*/i, "").trim();

  const message = `Hola ${name}! Te escribo de NexoBow. Preparé una propuesta para tu consultorio para agendar consultas sin depender de secretaría ni perder pacientes: ${demoUrl}. ¿Cuándo tendrías 10 minutos para revisarla?`;

  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

export const CrmView: React.FC<{ onNavigate?: (path: string) => void }> = () => {
  const [leads, setLeads] = useState<LeadEntity[]>(INITIAL_DEMO_LEADS);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedFunnel, setSelectedFunnel] = useState<string>("all");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadEntity | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Cargar prospectos desde Supabase con fallback a demo
  useEffect(() => {
    let mounted = true;
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const supabase = getBrowserSupabaseClient();
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("id", { ascending: false });

        if (mounted) {
          if (!error && data && data.length > 0) {
            setLeads(data as LeadEntity[]);
          }
        }
      } catch (err) {
        console.warn("Utilizando catálogo local de prospectos (modo offline/demo)");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLeads();
    return () => {
      mounted = false;
    };
  }, []);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Acciones de 1 Clic
  const handleRenewTtl = async (id: number) => {
    const now = new Date();
    const newExpires = new Date(now);
    newExpires.setDate(newExpires.getDate() + 7);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              last_activity_at: now.toISOString(),
              expires_at: newExpires.toISOString(),
            }
          : l
      )
    );

    if (selectedLead && selectedLead.id === id) {
      setSelectedLead((prev) =>
        prev
          ? {
              ...prev,
              last_activity_at: now.toISOString(),
              expires_at: newExpires.toISOString(),
            }
          : null
      );
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase
        .from("leads")
        .update({
          last_activity_at: now.toISOString(),
          expires_at: newExpires.toISOString(),
        })
        .eq("id", id);
    } catch {
      // Ignorar en local
    }

    showNotification(`✓ TTL de lead #${id} renovado por +7 días`);
  };

  const handleUpdateStage = async (id: number, newStage: string) => {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              funnel_status: newStage,
              last_activity_at: now,
            }
          : l
      )
    );

    if (selectedLead && selectedLead.id === id) {
      setSelectedLead((prev) =>
        prev ? { ...prev, funnel_status: newStage, last_activity_at: now } : null
      );
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase
        .from("leads")
        .update({
          funnel_status: newStage,
          last_activity_at: now,
        })
        .eq("id", id);
    } catch {
      // Ignorar en local
    }

    showNotification(`✓ Etapa de lead #${id} actualizada a: ${newStage}`);
  };

  const handleSaveLead = async (updated: LeadEntity) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);

    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.from("leads").upsert(updated);
    } catch {
      // Ignorar en local
    }

    showNotification(`✓ Cambios de #${updated.id} guardados correctamente`);
  };

  // Listas únicas para filtros
  const niches = useMemo(() => {
    const set = new Set(leads.map((l) => l.niche).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  const cities = useMemo(() => {
    const set = new Set(leads.map((l) => l.city).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  // Filtrado reactivo de leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Búsqueda por texto libre
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(term);
        const matchPhone = (lead.phone || "").toLowerCase().includes(term);
        const matchSlug = lead.slug.toLowerCase().includes(term);
        const matchLocation = lead.location.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchSlug && !matchLocation) return false;
      }

      // Filtro de Nicho
      if (selectedNiche !== "all" && lead.niche !== selectedNiche) return false;

      // Filtro de Ciudad
      if (selectedCity !== "all" && lead.city !== selectedCity) return false;

      // Filtro de Funnel
      if (selectedFunnel !== "all" && lead.funnel_status !== selectedFunnel) return false;

      // Filtro de Urgencia TTL (<48h o Vencido)
      if (filterUrgentOnly) {
        const ttl = calculateDaysRemaining(lead.expires_at);
        if (!ttl.isUrgent && !ttl.isExpired) return false;
      }

      return true;
    });
  }, [leads, searchTerm, selectedNiche, selectedCity, selectedFunnel, filterUrgentOnly]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 py-3 px-5 rounded-xl border text-xs font-semibold shadow-2xl animate-fade-in"
          style={{
            backgroundColor: "#0B0D12",
            borderColor: "#BF40FA",
            color: "#E3D9FC",
          }}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Encabezado Principal y Barra de Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "#1A1D26" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(191, 64, 250, 0.15)", color: "#BF40FA" }}
            >
              Supabase Pipeline
            </span>
            <span className="text-zinc-500 text-xs font-mono">{filteredLeads.length} leads activos</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            CRM & Prospección Comercial
          </h1>
          <p className="text-xs text-zinc-400">
            Sustitución definitiva de Google Sheets: embudo en 6 etapas con control TTL de 7 días y WhatsApp 1-clic.
          </p>
        </div>

        {/* Conmutador Dual Kanban vs Data Table */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center p-1 rounded-xl border"
            style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
          >
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-purple-600/30 text-white border border-purple-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-purple-600/30 text-white border border-purple-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        className="p-4 rounded-2xl border flex flex-wrap items-center gap-3"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        {/* Buscador */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, ciudad o slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Filtro por Nicho */}
        <select
          value={selectedNiche}
          onChange={(e) => setSelectedNiche(e.target.value)}
          aria-label="Filtrar por nicho"
          className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los Nichos ({niches.length})</option>
          {niches.map((n) => (
            <option key={n} value={n}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>

        {/* Filtro por Ciudad */}
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          aria-label="Filtrar por ciudad"
          className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todas las Ciudades ({cities.length})</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Filtro por Etapa */}
        <select
          value={selectedFunnel}
          onChange={(e) => setSelectedFunnel(e.target.value)}
          aria-label="Filtrar por etapa del embudo"
          className="py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todas las Etapas (6)</option>
          {KANBAN_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Toggle de Urgencia TTL */}
        <button
          type="button"
          onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            filterUrgentOnly
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
              : "bg-black/40 text-zinc-400 border-zinc-800 hover:text-zinc-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Urgencia &lt;48h / Vencidos</span>
        </button>
      </div>

      {/* VISTA 1: TABLERO KANBAN */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.funnel_status === stage.id);
            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-2xl border min-h-[500px]"
                style={{
                  backgroundColor: "#0B0D12",
                  borderColor: "#1A1D26",
                }}
              >
                {/* Columna Header */}
                <div
                  className="p-3 border-b flex items-center justify-between"
                  style={{ borderColor: "#1A1D26" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-xs font-bold text-zinc-200 truncate">{stage.label}</span>
                  </div>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: stage.bg, color: stage.color }}
                  >
                    {stageLeads.length}
                  </span>
                </div>

                {/* Tarjetas de Prospectos */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[70vh]">
                  {stageLeads.map((lead) => {
                    const ttl = calculateDaysRemaining(lead.expires_at);
                    const waUrl = buildVoseoWhatsAppUrl(lead);

                    return (
                      <div
                        key={lead.id}
                        className="p-3.5 rounded-xl border transition-all hover:border-purple-500/40 group relative"
                        style={{
                          backgroundColor: "#040607",
                          borderColor: ttl.isUrgent ? "rgba(245, 158, 11, 0.4)" : "#1A1D26",
                        }}
                      >
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                            style={{
                              backgroundColor: "rgba(91, 42, 98, 0.3)",
                              borderColor: "rgba(191, 64, 250, 0.3)",
                              color: "#E3D9FC",
                            }}
                          >
                            #{lead.id}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                              ttl.isExpired
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : ttl.isUrgent
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {ttl.label}
                          </span>
                        </div>

                        {/* Nombre y Especialidad */}
                        <h4
                          onClick={() => setSelectedLead(lead)}
                          className="font-bold text-xs text-white group-hover:text-purple-300 cursor-pointer transition-colors truncate mb-1"
                        >
                          {lead.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-3">
                          <span className="capitalize">{lead.niche}</span>
                          <span>•</span>
                          <span className="truncate">{lead.city}</span>
                        </div>

                        {/* Valor Potencial */}
                        <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between mb-3 pt-2 border-t border-zinc-900">
                          <span>Potencial:</span>
                          <span className="text-white font-semibold">{lead.potential_value}</span>
                        </div>

                        {/* Acciones de 1 Clic */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {/* Botón WhatsApp Voseo */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir WhatsApp con voseo prearmado"
                              className="flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all"
                              style={{
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                color: "#10B981",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WA</span>
                            </a>
                          )}

                          {/* Botón Web Preview */}
                          {lead.demo_url && (
                            <a
                              href={lead.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver preview web en preview.nexobow.site"
                              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Botón Renovar TTL +7 días */}
                          <button
                            type="button"
                            onClick={() => handleRenewTtl(lead.id)}
                            title="Renovar TTL (+7 días)"
                            className="p-1 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 transition-colors border border-transparent hover:border-purple-800/40"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div className="p-6 text-center text-zinc-600 text-[11px] font-mono border border-dashed border-zinc-800 rounded-xl my-4">
                      Sin prospectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 2: DATA TABLE DE ALTA DENSIDAD */}
      {viewMode === "table" && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-zinc-400 font-mono text-[11px]" style={{ borderColor: "#1A1D26" }}>
                  <th className="py-3 px-4 font-semibold">ID</th>
                  <th className="py-3 px-4 font-semibold">Prospecto</th>
                  <th className="py-3 px-4 font-semibold">Nicho</th>
                  <th className="py-3 px-4 font-semibold">Ubicación</th>
                  <th className="py-3 px-4 font-semibold">Etapa del Embudo</th>
                  <th className="py-3 px-4 font-semibold">Respuesta</th>
                  <th className="py-3 px-4 font-semibold">TTL Expiración</th>
                  <th className="py-3 px-4 font-semibold">Valor</th>
                  <th className="py-3 px-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {filteredLeads.map((lead) => {
                  const ttl = calculateDaysRemaining(lead.expires_at);
                  const waUrl = buildVoseoWhatsAppUrl(lead);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">#{lead.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-purple-300 transition-colors">
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">{lead.phone || "Sin tel"}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">{lead.niche}</td>
                      <td className="py-3 px-4 truncate max-w-[140px] text-zinc-400">{lead.city}</td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor: KANBAN_STAGES.find((s) => s.id === lead.funnel_status)?.bg || "rgba(255,255,255,0.1)",
                            color: KANBAN_STAGES.find((s) => s.id === lead.funnel_status)?.color || "#FFF",
                          }}
                        >
                          {lead.funnel_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-zinc-400">{lead.response_status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            ttl.isExpired
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : ttl.isUrgent
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {ttl.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300 font-medium">{lead.potential_value}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir WhatsApp con voseo"
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.demo_url && (
                            <a
                              href={lead.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver preview web"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRenewTtl(lead.id)}
                            title="Renovar TTL (+7 días)"
                            className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-900/30 transition-colors"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL DE EDICIÓN RÁPIDA */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
          onRenewTtl={() => handleRenewTtl(selectedLead.id)}
          onUpdateStage={(stage) => handleUpdateStage(selectedLead.id, stage)}
        />
      )}
    </div>
  );
};

// Subcomponente Drawer Lateral de Edición y Acciones
interface LeadDrawerProps {
  lead: LeadEntity;
  onClose: () => void;
  onSave: (lead: LeadEntity) => void;
  onRenewTtl: () => void;
  onUpdateStage: (stage: string) => void;
}

const LeadDrawer: React.FC<LeadDrawerProps> = ({
  lead,
  onClose,
  onSave,
  onRenewTtl,
  onUpdateStage,
}) => {
  const [formData, setFormData] = useState<LeadEntity>({ ...lead });
  const ttl = calculateDaysRemaining(formData.expires_at);
  const waUrl = buildVoseoWhatsAppUrl(formData);

  const handleChange = (field: keyof LeadEntity, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg h-full flex flex-col border-l shadow-2xl p-6 overflow-y-auto"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        {/* Encabezado Drawer */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "#1A1D26" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-purple-400">#{formData.id}</span>
              <span className="text-zinc-500 text-xs font-mono">{formData.slug}</span>
            </div>
            <h2 className="text-lg font-bold text-white truncate">{formData.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar de Acciones Rápidas */}
        <div className="my-5 p-3 rounded-xl border space-y-3" style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Ciclo TTL 7 Días:</span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                ttl.isExpired
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : ttl.isUrgent
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {ttl.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Voseo</span>
              </a>
            )}

            <button
              type="button"
              onClick={onRenewTtl}
              className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-purple-300 bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Renovar +7 Días</span>
            </button>
          </div>

          {formData.demo_url && (
            <a
              href={formData.demo_url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-zinc-300 bg-zinc-900 border border-zinc-800 hover:text-white hover:border-zinc-700"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>Ver Landing en preview.nexobow.site</span>
            </a>
          )}
        </div>

        {/* Formulario de Edición */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Nombre / Razón Social</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Nicho</label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => handleChange("niche", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Ciudad</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Teléfono</label>
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Valor Potencial</label>
              <input
                type="text"
                value={formData.potential_value}
                onChange={(e) => handleChange("potential_value", e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Etapa del Embudo</label>
            <select
              value={formData.funnel_status}
              onChange={(e) => {
                handleChange("funnel_status", e.target.value);
                onUpdateStage(e.target.value);
              }}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
            >
              {KANBAN_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Estado de Respuesta</label>
            <select
              value={formData.response_status}
              onChange={(e) => handleChange("response_status", e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
            >
              {RESPONSE_STATUSES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Notas / Próximo Paso</label>
            <textarea
              rows={3}
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full py-2 px-3 rounded-xl text-xs bg-black/40 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Detalles de la conversación o requerimientos del cliente..."
            />
          </div>

          {/* Botones de Pie */}
          <div className="pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: "#1A1D26" }}>
            <button
              type="button"
              onClick={() => {
                handleChange("funnel_status", "6. Descartado");
                onUpdateStage("6. Descartado");
              }}
              className="py-2 px-3 rounded-xl text-xs font-semibold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar Lead</span>
            </button>

            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
              style={{
                backgroundColor: "#BF40FA",
                color: "#FFFFFF",
                boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
              }}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
