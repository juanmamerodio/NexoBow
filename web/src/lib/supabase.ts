// web/src/lib/supabase.ts — Seam de Supabase y Control de Acceso para el Cockpit de NexoBow
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface AdminUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}

export type AdminRouteState =
  | { state: "unauthenticated"; authorized: false; redirect: string }
  | { state: "login"; authorized: false; redirect: null }
  | {
      state: "authorized";
      authorized: true;
      redirect: string | null;
      user: AdminUser;
    }
  | {
      state: "forbidden";
      authorized: false;
      redirect: string;
      error: string;
    };

/**
 * Valida de forma estricta (case-insensitive y trim) si el email corresponde al propietario
 */
export function isAuthorizedAdminEmail(
  email?: string | null,
  ownerEmail?: string | null
): boolean {
  if (!email || !ownerEmail) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanOwner = ownerEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanOwner) return false;
  return cleanEmail === cleanOwner;
}

/**
 * Obtiene el email del propietario configurado desde variables de entorno con fallback seguro
 */
export function getAdminOwnerEmail(
  env?: Record<string, string | undefined>
): string {
  const targetEnv =
    env || (typeof process !== "undefined" ? process.env : {}) || {};
  return (
    targetEnv.ADMIN_OWNER_EMAIL ||
    targetEnv.PUBLIC_ADMIN_OWNER_EMAIL ||
    "juanma@nexobow.site"
  );
}

/**
 * Máquina de estado para resolución de rutas del Admin Cockpit
 */
export function resolveAdminRouteState({
  user,
  ownerEmail,
  currentPath = "/admin",
}: {
  user: AdminUser | null | undefined;
  ownerEmail: string;
  currentPath?: string;
}): AdminRouteState {
  const cleanPath = (currentPath || "/admin").replace(/\/+$/, "") || "/";
  const isLoginPage = cleanPath === "/admin/login";

  if (!user || !user.email) {
    if (isLoginPage) {
      return { state: "login", authorized: false, redirect: null };
    }
    return {
      state: "unauthenticated",
      authorized: false,
      redirect: "/admin/login",
    };
  }

  const authorized = isAuthorizedAdminEmail(user.email, ownerEmail);

  if (authorized) {
    if (isLoginPage) {
      return {
        state: "authorized",
        authorized: true,
        redirect: "/admin",
        user,
      };
    }
    return { state: "authorized", authorized: true, redirect: null, user };
  }

  return {
    state: "forbidden",
    authorized: false,
    redirect: "/admin/login?error=forbidden",
    error:
      "Acceso no autorizado: este panel es exclusivo para el propietario de NexoBow.",
  };
}

/**
 * Instancia un cliente de Supabase tipado y resiliente
 */
export function createSupabaseClient(config?: SupabaseConfig): SupabaseClient {
  const env = (typeof process !== "undefined" ? process.env : {}) || {};

  const url =
    config?.supabaseUrl ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.PUBLIC_SUPABASE_URL) ||
    env.PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    "https://mockproject.supabase.co";

  const key =
    config?.supabaseAnonKey ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY) ||
    env.PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    "mock-anon-key-placeholder";

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Singleton en navegador
let browserClient: SupabaseClient | null = null;
export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseClient();
  }
  return browserClient;
}
