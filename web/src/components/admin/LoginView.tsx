// web/src/components/admin/LoginView.tsx — Pantalla de Inicio de Sesión Soft-Obsidian
import React, { useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase";
import { Lock, Mail, Sparkles, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

interface LoginViewProps {
  onSuccess?: (user?: any) => void;
  initialError?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, initialError }) => {
  const [authMode, setAuthMode] = useState<"password" | "magic-link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError || "");
  const [successMessage, setSuccessMessage] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const supabase = getBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Error al iniciar sesión con contraseña.");
      } else if (data.session) {
        setSuccessMessage("¡Autenticación exitosa! Accediendo al Cockpit...");
        if (onSuccess && data.session.user) {
          onSuccess({
            id: data.session.user.id,
            email: data.session.user.email,
            user_metadata: data.session.user.user_metadata,
          });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ocurrió un error inesperado al conectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const supabase = getBrowserSupabaseClient();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setErrorMessage(error.message || "Error al enviar el Magic Link.");
      } else {
        setSuccessMessage("¡Magic Link enviado! Revisá tu casilla de correo para ingresar.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al solicitar el enlace de acceso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#040607", color: "#F8F6FF" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 border shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: "#0B0D12",
          borderColor: "rgba(191, 64, 250, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(4, 6, 7, 0.7), 0 0 40px rgba(73, 40, 194, 0.15)",
        }}
      >
        {/* Glow de ambientación superior */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none filter blur-3xl opacity-30"
          style={{ backgroundColor: "#BF40FA" }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full pointer-events-none filter blur-3xl opacity-20"
          style={{ backgroundColor: "#4928C2" }}
        />

        {/* Marca y Encabezado */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 border"
            style={{
              backgroundColor: "rgba(91, 42, 98, 0.3)",
              borderColor: "rgba(191, 64, 250, 0.4)",
              color: "#E3D9FC",
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#BF40FA" }} />
            Cockpit Privado del Propietario
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span>Nexo</span>
            <span style={{ color: "#BF40FA" }}>Bow</span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">v2</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>
            Centro de Mando Ejecutivo & Control Integral
          </p>
        </div>

        {/* Conmutador de modo de autenticación */}
        <div
          className="grid grid-cols-2 p-1 rounded-xl mb-6 border relative z-10"
          style={{ backgroundColor: "rgba(4, 6, 7, 0.6)", borderColor: "#1A1D26" }}
        >
          <button
            type="button"
            onClick={() => { setAuthMode("password"); setErrorMessage(""); setSuccessMessage(""); }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
              authMode === "password"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Contraseña
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("magic-link"); setErrorMessage(""); setSuccessMessage(""); }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
              authMode === "magic-link"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#BF40FA" }} />
            Magic Link
          </button>
        </div>

        {/* Alertas */}
        {errorMessage && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-lg mb-5 text-xs border relative z-10 animate-fade-in"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderColor: "rgba(239, 68, 68, 0.3)",
              color: "#FCA5A5",
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-lg mb-5 text-xs border relative z-10"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderColor: "rgba(16, 185, 129, 0.3)",
              color: "#6EE7B7",
            }}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form
          onSubmit={authMode === "password" ? handlePasswordLogin : handleMagicLinkLogin}
          className="space-y-4 relative z-10"
        >
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#E3D9FC" }}>
              Correo del Propietario
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juanma@nexobow.site"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all"
                style={{
                  backgroundColor: "rgba(4, 6, 7, 0.8)",
                  borderColor: "#262933",
                  color: "#F8F6FF",
                }}
              />
            </div>
          </div>

          {authMode === "password" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#E3D9FC" }}>
                Contraseña Maestra
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all"
                  style={{
                    backgroundColor: "rgba(4, 6, 7, 0.8)",
                    borderColor: "#262933",
                    color: "#F8F6FF",
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            style={{
              backgroundColor: "#BF40FA",
              color: "#FFFFFF",
              boxShadow: "0 4px 15px rgba(191, 64, 250, 0.35)",
            }}
          >
            {loading ? (
              <span>Conectando con Supabase...</span>
            ) : (
              <>
                <span>{authMode === "password" ? "Acceder al Cockpit" : "Enviar Magic Link"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t text-center text-xs text-zinc-500" style={{ borderColor: "#1A1D26" }}>
          <span>Protegido por Supabase RLS y autenticación criptográfica.</span>
        </div>
      </div>
    </div>
  );
};
