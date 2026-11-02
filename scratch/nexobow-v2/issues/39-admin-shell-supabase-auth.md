# 39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet

**What to build:** Montaje de la isla interactiva de administración en `https://nexobow.site/admin` mediante Astro + React (`web/src/pages/admin/[...all].astro`), configuración del cliente Supabase con variables de entorno (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_OWNER_EMAIL`), migración SQL inicial con tabla `admin_profiles` y políticas RLS restrictivas para el email del propietario, y pantalla de inicio de sesión (`LoginView.tsx`) en estética ejecutiva Soft-Obsidian (`#040607`, `#0B0D12`, `#BF40FA`, `#4928C2`, `#E3D9FC`) con barra lateral colapsable y navegación protegida. Las rutas públicas de `web/` deben mantener 0 bytes de JS en cliente.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] Instalar y configurar `@astrojs/react` en `web/astro.config.mjs` y dependencias (`@supabase/supabase-js`, `lucide-react`).
- [x] Crear migración SQL en `supabase/migrations/20261102000000_admin_cockpit_init.sql` con tabla `admin_profiles`, función de control de acceso y RLS estricto.
- [x] Implementar cliente Supabase y seam de autenticación en `web/src/lib/supabase.ts`.
- [x] Construir layout administrativo Soft-Obsidian (`AdminLayout.tsx`) con sidebar colapsable, estado de conexión y router cliente.
- [x] Construir vista de inicio de sesión (`LoginView.tsx`) con autenticación por Email/Password y Magic Link.
- [x] Escribir prueba unitaria `tests/admin-auth-seam.test.mjs` que verifique la protección de rutas, sesión autorizada y rechazo de usuarios no autorizados.
- [x] Ejecutar `npm run build` en `web/` asegurando que compile con código 0 y que las rutas públicas (`/`, etc.) mantengan 0 `<script>` en cliente.
