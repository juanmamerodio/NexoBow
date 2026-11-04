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
import { CrmView } from "./views/CrmView";
import { FinanceView } from "./views/FinanceView";
import { ScheduleView } from "./views/ScheduleView";
import { VideosView } from "./views/VideosView";
import { HabitsView } from "./views/HabitsView";
import { CockpitView } from "./views/CockpitView";
import { SettingsView } from "./views/SettingsView";
import {
  ShieldAlert,
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
    const cleanRedirect = routeState.redirect.replace(/\/+$/, "") || "/";
    const cleanCurrent = currentPath.replace(/\/+$/, "") || "/";
    if (cleanRedirect !== cleanCurrent) {
      setTimeout(() => navigate(routeState.redirect as string), 0);
    }
  }

  if (routeState.state === "unauthenticated" || routeState.state === "login") {
    return (
      <LoginView
        initialError={routeState.state === "forbidden" ? routeState.error : authError}
        onSuccess={(authenticatedUser) => {
          if (authenticatedUser) setUser(authenticatedUser);
          navigate("/admin");
        }}
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
        <CockpitView user={authorizedUser} onNavigate={navigate} />
      ) : currentPath === "/admin/crm" || currentPath === "/admin/crm/" ? (
        <CrmView onNavigate={navigate} />
      ) : currentPath === "/admin/finances" || currentPath === "/admin/finances/" ? (
        <FinanceView onNavigate={navigate} />
      ) : currentPath === "/admin/calendar" || currentPath === "/admin/calendar/" ? (
        <ScheduleView onNavigate={navigate} />
      ) : currentPath === "/admin/alaynow" || currentPath === "/admin/alaynow/" ? (
        <VideosView onNavigate={navigate} />
      ) : currentPath === "/admin/habits" || currentPath === "/admin/habits/" ? (
        <HabitsView onNavigate={navigate} />
      ) : currentPath === "/admin/settings" || currentPath === "/admin/settings/" ? (
        <SettingsView user={authorizedUser} onNavigate={navigate} />
      ) : (
        <ModulePlaceholderView currentPath={currentPath} />
      )}
    </AdminLayout>
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
