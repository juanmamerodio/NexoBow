// web/src/components/admin/AdminLayout.tsx — Layout Base Soft-Obsidian del Cockpit NexoBow
import React, { useState } from "react";
import type { AdminUser } from "../../lib/supabase";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  Video,
  Flame,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Wifi,
} from "lucide-react";

interface AdminLayoutProps {
  user: AdminUser;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  user,
  currentPath,
  onNavigate,
  onSignOut,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    {
      id: "cockpit",
      label: "Cockpit Diario",
      path: "/admin",
      icon: LayoutDashboard,
      badge: "Ejecutivo",
    },
    {
      id: "crm",
      label: "CRM & Prospección",
      path: "/admin/crm",
      icon: Users,
      badge: "6 Etapas",
    },
    {
      id: "finances",
      label: "Finanzas Multi-Unidad",
      path: "/admin/finances",
      icon: DollarSign,
      badge: "Cashflow",
    },
    {
      id: "calendar",
      label: "Bloques de Tiempo",
      path: "/admin/calendar",
      icon: Calendar,
      badge: "GCal",
    },
    {
      id: "alaynow",
      label: "AlayNow YouTube",
      path: "/admin/alaynow",
      icon: Video,
      badge: "Videos",
    },
    {
      id: "habits",
      label: "Hábitos & Disciplina",
      path: "/admin/habits",
      icon: Flame,
      badge: "Racha",
    },
    {
      id: "settings",
      label: "Configuración & 0-JS",
      path: "/admin/settings",
      icon: Settings,
      badge: "Health",
    },
  ];

  const normalize = (p: string) => p.replace(/\/$/, "");

  return (
    <div
      className="min-h-screen flex text-slate-100 font-sans"
      style={{ backgroundColor: "#040607" }}
    >
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r transition-all duration-300 relative z-20 ${
          collapsed ? "w-20" : "w-64"
        }`}
        style={{
          backgroundColor: "#0B0D12",
          borderColor: "#1A1D26",
        }}
      >
        {/* Encabezado Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: "#1A1D26" }}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight">
                Nexo<span style={{ color: "#BF40FA" }}>Bow</span>
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: "rgba(91, 42, 98, 0.4)",
                  borderColor: "rgba(191, 64, 250, 0.4)",
                  color: "#E3D9FC",
                }}
              >
                ADMIN
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center font-black text-lg" style={{ color: "#BF40FA" }}>
              NB
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = normalize(currentPath) === normalize(item.path);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? "font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: "rgba(191, 64, 250, 0.15)",
                        color: "#E3D9FC",
                        border: "1px solid rgba(191, 64, 250, 0.3)",
                      }
                    : {}
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                  style={isActive ? { color: "#BF40FA" } : {}}
                />

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between text-left">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded text-zinc-400 group-hover:text-zinc-300"
                        style={{ backgroundColor: "rgba(4, 6, 7, 0.6)" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar con Estado de Usuario */}
        <div className="p-3 border-t" style={{ borderColor: "#1A1D26" }}>
          {!collapsed ? (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 p-2 rounded-xl border text-xs"
                style={{ backgroundColor: "#040607", borderColor: "#1A1D26" }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate text-[11px]">{user.email}</p>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Propietario Supabase
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver Web</span>
                </a>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse my-1" title="Conectado" />
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Cerrar sesión"
                className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <header
          className="h-16 flex items-center justify-between px-6 border-b flex-shrink-0"
          style={{ backgroundColor: "#0B0D12", borderColor: "#1A1D26" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Panel</span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm font-semibold" style={{ color: "#E3D9FC" }}>
              {navigationItems.find((i) => normalize(i.path) === normalize(currentPath))?.label || "Cockpit"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border"
              style={{
                backgroundColor: "rgba(4, 6, 7, 0.7)",
                borderColor: "#1A1D26",
                color: "#10B981",
              }}
            >
              <Wifi className="w-3 h-3" />
              <span>RLS Active</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 p-6 lg:p-8" style={{ backgroundColor: "#040607" }}>
          {children}
        </div>
      </main>
    </div>
  );
};
