// web/src/components/admin/AdminApp.tsx — Router & Enrutador Principal del Cockpit React
import React, { useEffect, useState } from "react";
import {
  getBrowserSupabaseClient,
  getAdminOwnerEmail,
  resolveAdminRouteState,
  type AdminUser,
} from "../../lib/supabase";
import { AdminLayout } from "./AdminLayout";
import { LoginView } from "./LoginView";
import {
  ShieldAlert,
  Activity,
  Layers,
  Database,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";

export const AdminApp: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== "undefined" ? window.location.pathname : "/admin"
  );
  const [authError, setAuthError] = useState<string>("");

  const ownerEmail = getAdminOwnerEmail();

  // Escuchar navegación del historial
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Suscripción de autenticación Supabase
  useEffect(() => {
    let mounted = true;
    const supabase = getBrowserSupabaseClient();

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            });
          } else {
            setUser(null);
          }
        }
      } catch (err: any) {
        console.error("Error verificando sesión Supabase:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      setCurrentPath(path);
    }
  };

  const handleSignOut = async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-mono text-xs"
        style={{ backgroundColor: "#040607", color: "#E3D9FC" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span>Iniciando Cockpit Ejecutivo...</span>
        </div>
      </div>
    );
  }

  // Evaluar estado de ruta con el seam
  const routeState = resolveAdminRouteState({
    user,
    ownerEmail,
    currentPath,
  });

  // Redirecciones automáticas si corresponden
  if (routeState.redirect && typeof window !== "undefined") {
    if (routeState.redirect !== currentPath) {
      setTimeout(() => navigate(routeState.redirect as string), 0);
    }
  }

  if (routeState.state === "unauthenticated" || routeState.state === "login") {
    return (
      <LoginView
        initialError={routeState.state === "forbidden" ? routeState.error : authError}
        onSuccess={() => navigate("/admin")}
      />
    );
  }

  if (routeState.state === "forbidden") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "#040607", color: "#F8F6FF" }}
      >
        <div
          className="max-w-md w-full p-8 rounded-2xl border text-center"
          style={{ backgroundColor: "#0B0D12", borderColor: "rgba(239, 68, 68, 0.3)" }}
        >
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-sm text-zinc-400 mb-6">{routeState.error}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="py-2.5 px-6 rounded-xl font-semibold text-xs cursor-pointer bg-red-600 hover:bg-red-500 text-white transition-all"
          >
            Cerrar Sesión e Intentar con Propietario
          </button>
        </div>
      </div>
    );
  }

  // Vista autorizada
  const authorizedUser = routeState.user;

  return (
    <AdminLayout
      user={authorizedUser}
      currentPath={currentPath}
      onNavigate={navigate}
      onSignOut={handleSignOut}
    >
      {/* Contenido según la sub-ruta */}
      {currentPath === "/admin" || currentPath === "/admin/" ? (
        <CockpitHomeView user={authorizedUser} onNavigate={navigate} />
      ) : (
        <ModulePlaceholderView currentPath={currentPath} />
      )}
    </AdminLayout>
  );
};

// Subcomponente de Home del Cockpit (Tracer Bullet 39)
const CockpitHomeView: React.FC<{ user: AdminUser; onNavigate: (path: string) => void }> = ({
  user,
  onNavigate,
}) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Banner de Bienvenida Ejecutivo */}
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
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                style={{
                  backgroundColor: "rgba(91, 42, 98, 0.4)",
                  borderColor: "rgba(191, 64, 250, 0.4)",
                  color: "#E3D9FC",
                }}
              >
                Tracer Bullet 39 Activo
              </span>
              <span className="text-zinc-500 text-xs font-mono">Supabase Auth Verified</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Bienvenido al Panel Central, <span style={{ color: "#BF40FA" }}>Juanma</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Isla interactiva React montada con éxito en Astro. Las landings públicas de NexoBow
              mantienen exactamente 0 bytes de JavaScript en cliente.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Iniciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Sesión Propietario",
            value: user.email || "Conectado",
            sub: "Nivel de Acceso RLS Owner",
            icon: Lock,
            color: "#10B981",
          },
          {
            title: "Aislamiento JS",
            value: "0 Scripts en /",
            sub: "Benchmark SSG Agency Intacto",
            icon: CheckCircle2,
            color: "#BF40FA",
          },
          {
            title: "Base de Datos",
            value: "Supabase Relacional",
            sub: "Migración admin_profiles OK",
            icon: Database,
            color: "#4928C2",
          },
          {
            title: "Módulos Integrados",
            value: "6 Sub-Sistemas",
            sub: "CRM, Finanzas, Hábitos y más",
            icon: Layers,
            color: "#E3D9FC",
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl border transition-all"
              style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-400 font-medium">{card.title}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(4, 6, 7, 0.6)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-lg font-bold text-white truncate">{card.value}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Resumen de Próximos Pasos (Frontier) */}
      <div
        className="p-6 rounded-2xl border"
        style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          Roadmap del Cockpit (Frente E)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border" style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}>
            <p className="font-semibold text-white mb-1">Ticket 40: CRM & Prospección Supabase</p>
            <p className="text-zinc-400">
              Sustitución definitiva de Google Sheets por tabla relacional de leads con conmutador dual Kanban y Data Table.
            </p>
          </div>
          <div className="p-4 rounded-xl border" style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}>
            <p className="font-semibold text-white mb-1">Ticket 41: Finanzas & Cashflow Multi-Unidad</p>
            <p className="text-zinc-400">
              Control de ingresos por setups de NexoBow, suscripciones mensuales recurrentes y AlayNow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Subcomponente placeholder para módulos pendientes
const ModulePlaceholderView: React.FC<{ currentPath: string }> = ({ currentPath }) => {
  return (
    <div
      className="p-12 rounded-2xl border text-center max-w-2xl mx-auto my-12"
      style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
        style={{
          backgroundColor: "rgba(91, 42, 98, 0.3)",
          borderColor: "rgba(191, 64, 250, 0.3)",
          color: "#BF40FA",
        }}
      >
        <Sparkles className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold mb-2">Módulo en Preparación</h2>
      <p className="text-sm text-zinc-400 font-mono mb-4">{currentPath}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto">
        La estructura base y la autenticación ya están operativas. Este submódulo se completará en
        los siguientes tickets del Frente E.
      </p>
    </div>
  );
};
