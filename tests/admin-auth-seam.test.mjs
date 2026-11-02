// tests/admin-auth-seam.test.mjs — Suite TDD para Admin Shell, Supabase Auth y RLS (Ticket 39)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_FILE = join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20261102000000_admin_cockpit_init.sql"
);
const SUPABASE_LIB = join(REPO_ROOT, "web", "src", "lib", "supabase.ts");
const ADMIN_ASTRO_PAGE = join(
  REPO_ROOT,
  "web",
  "src",
  "pages",
  "admin",
  "[...all].astro"
);
const ADMIN_LAYOUT = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminLayout.tsx"
);
const LOGIN_VIEW = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "LoginView.tsx"
);
const ADMIN_APP = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet", async (t) => {
  // --- SEAM 1: MIGRACIÓN SQL Y POLÍTICAS RLS ---
  await t.test(
    "1. Migración SQL crea admin_profiles, habilita RLS estricto y protege por ADMIN_OWNER_EMAIL",
    () => {
      assert.ok(
        existsSync(MIGRATION_FILE),
        `La migración ${MIGRATION_FILE} debe existir`
      );
      const sql = readFileSync(MIGRATION_FILE, "utf8");

      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.admin_profiles/i,
        "Debe crear la tabla public.admin_profiles"
      );
      assert.match(
        sql,
        /id uuid PRIMARY KEY REFERENCES auth\.users/i,
        "admin_profiles.id debe referenciar auth.users"
      );
      assert.match(
        sql,
        /email text UNIQUE NOT NULL/i,
        "admin_profiles.email debe ser text UNIQUE NOT NULL"
      );
      assert.match(
        sql,
        /ALTER TABLE public\.admin_profiles ENABLE ROW LEVEL SECURITY/i,
        "Debe habilitar RLS en admin_profiles"
      );
      assert.match(
        sql,
        /CREATE POLICY/i,
        "Debe definir políticas RLS para control de acceso"
      );
      assert.match(
        sql,
        /current_setting\('app\.admin_owner_email'|auth\.jwt\(\) ->> 'email'/i,
        "La política debe comprobar el email del propietario frente a auth.jwt()"
      );
    }
  );

  // --- SEAM 2: LIBRERÍA SUPABASE Y VERIFICACIÓN DE ACCESO ---
  await t.test(
    "2. isAuthorizedAdminEmail valida case-insensitivity, trim y rechaza emails no autorizados",
    async () => {
      assert.ok(
        existsSync(SUPABASE_LIB),
        `El módulo ${SUPABASE_LIB} debe existir`
      );
      const { isAuthorizedAdminEmail } = await import(SUPABASE_LIB);

      const owner = "juanma@nexobow.site";

      // Casos válidos
      assert.equal(isAuthorizedAdminEmail("juanma@nexobow.site", owner), true);
      assert.equal(isAuthorizedAdminEmail("JUANMA@NEXOBOW.SITE", owner), true);
      assert.equal(
        isAuthorizedAdminEmail("  juanma@nexobow.site  ", owner),
        true
      );
      assert.equal(
        isAuthorizedAdminEmail("JuanMa@NexoBow.Site", " JUANMA@NEXOBOW.SITE "),
        true
      );

      // Casos inválidos / intrusos
      assert.equal(isAuthorizedAdminEmail("hacker@malicioso.com", owner), false);
      assert.equal(isAuthorizedAdminEmail("juanma@otrodominio.com", owner), false);
      assert.equal(isAuthorizedAdminEmail("", owner), false);
      assert.equal(isAuthorizedAdminEmail(null, owner), false);
      assert.equal(isAuthorizedAdminEmail(undefined, owner), false);
      assert.equal(isAuthorizedAdminEmail("juanma@nexobow.site", null), false);
    }
  );

  await t.test(
    "3. resolveAdminRouteState gestiona estados: unauthenticated, login, authorized y forbidden",
    async () => {
      const { resolveAdminRouteState } = await import(SUPABASE_LIB);
      const ownerEmail = "owner@nexobow.site";

      // 1. Visitante sin sesión intentando acceder a ruta protegida (/admin o /admin/crm)
      const resUnauth = resolveAdminRouteState({
        user: null,
        ownerEmail,
        currentPath: "/admin",
      });
      assert.deepEqual(resUnauth, {
        state: "unauthenticated",
        authorized: false,
        redirect: "/admin/login",
      });

      // 2. Visitante sin sesión accediendo a /admin/login
      const resLogin = resolveAdminRouteState({
        user: null,
        ownerEmail,
        currentPath: "/admin/login",
      });
      assert.deepEqual(resLogin, {
        state: "login",
        authorized: false,
        redirect: null,
      });

      // 3. Administrador legítimo autenticado en ruta protegida
      const authUser = { id: "u-123", email: "owner@nexobow.site" };
      const resAdmin = resolveAdminRouteState({
        user: authUser,
        ownerEmail,
        currentPath: "/admin",
      });
      assert.deepEqual(resAdmin, {
        state: "authorized",
        authorized: true,
        redirect: null,
        user: authUser,
      });

      // 4. Administrador legítimo visitando /admin/login (debe redirigir al cockpit)
      const resAdminOnLogin = resolveAdminRouteState({
        user: authUser,
        ownerEmail,
        currentPath: "/admin/login",
      });
      assert.deepEqual(resAdminOnLogin, {
        state: "authorized",
        authorized: true,
        redirect: "/admin",
        user: authUser,
      });

      // 5. Usuario autenticado en Supabase pero con email NO propietario
      const intruderUser = { id: "u-666", email: "intruso@externo.com" };
      const resForbidden = resolveAdminRouteState({
        user: intruderUser,
        ownerEmail,
        currentPath: "/admin",
      });
      assert.equal(resForbidden.state, "forbidden");
      assert.equal(resForbidden.authorized, false);
      assert.ok(resForbidden.redirect.includes("/admin/login"));
      assert.ok(resForbidden.error);
    }
  );

  await t.test(
    "4. createSupabaseClient instancia el cliente o provee mock seguro ante ausencia de env",
    async () => {
      const { createSupabaseClient, getAdminOwnerEmail } = await import(
        SUPABASE_LIB
      );

      // Con credenciales explícitas
      const client = createSupabaseClient({
        supabaseUrl: "https://mockproject.supabase.co",
        supabaseAnonKey: "mock-anon-key-1234567890",
      });
      assert.ok(client, "Debe instanciar el cliente Supabase");
      assert.ok(client.auth, "El cliente debe exponer el namespace auth");

      // Verificación de email por defecto de administración
      const defaultEmail = getAdminOwnerEmail({
        ADMIN_OWNER_EMAIL: "admin@nexobow.site",
      });
      assert.equal(defaultEmail, "admin@nexobow.site");
    }
  );

  // --- SEAM 3: ESTRUCTURA DE COMPONENTES REACT Y PÁGINA ASTRO ---
  await t.test(
    "5. Isla React en Astro web/src/pages/admin/[...all].astro y componentes de Cockpit",
    () => {
      assert.ok(
        existsSync(ADMIN_ASTRO_PAGE),
        "Página Astro [...all].astro debe existir"
      );
      const astroPage = readFileSync(ADMIN_ASTRO_PAGE, "utf8");
      assert.match(
        astroPage,
        /client:only="react"/i,
        "Debe montar la isla React con directiva client:only='react'"
      );
      assert.match(
        astroPage,
        /AdminApp/i,
        "Debe importar y renderizar AdminApp"
      );

      // Verificación de componentes UI
      assert.ok(
        existsSync(ADMIN_APP),
        "Componente AdminApp.tsx debe existir"
      );
      assert.ok(
        existsSync(ADMIN_LAYOUT),
        "Componente AdminLayout.tsx debe existir"
      );
      assert.ok(
        existsSync(LOGIN_VIEW),
        "Componente LoginView.tsx debe existir"
      );

      const layoutContent = readFileSync(ADMIN_LAYOUT, "utf8");
      assert.match(
        layoutContent,
        /#040607|#0B0D12|#BF40FA/i,
        "AdminLayout debe incorporar la paleta Soft-Obsidian"
      );

      const loginContent = readFileSync(LOGIN_VIEW, "utf8");
      assert.match(
        loginContent,
        /signInWithPassword|signInWithOtp|Magic Link/i,
        "LoginView debe contemplar autenticación por Password y Magic Link"
      );
    }
  );

  // --- SEAM 4: VERIFICACIÓN DE BUILD Y AISLAMIENTO 0-JS ---
  await t.test(
    "6. Verificación de build y aislamiento 0-JS en web/dist/index.html vs /admin",
    () => {
      const distIndex = join(REPO_ROOT, "web", "dist", "index.html");
      const distAdmin = join(REPO_ROOT, "web", "dist", "admin", "index.html");
      assert.ok(existsSync(distIndex), "web/dist/index.html debe existir");
      assert.ok(existsSync(distAdmin), "web/dist/admin/index.html debe existir");

      const publicHtml = readFileSync(distIndex, "utf8");
      const publicScripts = (
        publicHtml.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []
      ).filter((tag) => !/type=["']application\/ld\+json["']/i.test(tag));
      assert.equal(
        publicScripts.length,
        0,
        "La landing pública web/dist/index.html debe tener 0 scripts ejecutables"
      );

      const adminHtml = readFileSync(distAdmin, "utf8");
      const adminScripts =
        adminHtml.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
      assert.ok(
        adminScripts.length > 0,
        "La ruta /admin debe contener el bundle interactivo React"
      );
    }
  );
});

