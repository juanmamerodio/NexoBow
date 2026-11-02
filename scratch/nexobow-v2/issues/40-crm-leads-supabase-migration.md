# 40: CRM & Prospección: Sustitución de Sheets y Adaptador Supabase

**What to build:** Migración definitiva del pipeline comercial desde Google Sheets (`'Prospección NexoBow'!B11:S1000`) hacia la tabla relacional `leads` en Supabase. Implementación del adaptador `createSupabaseLeadStore` en `scripts/sheets-sync.mjs` para que todos los scripts del sistema (`scout-lead`, `build-client-site`, `lead-lifecycle`) operen sobre Supabase sin perder retrocompatibilidad, script de importación idempotente `scripts/migrate-sheets-to-supabase.mjs`, y desarrollo de la vista `views/CrmView.tsx` con conmutador Kanban (6 columnas del embudo) / Data Table de alta densidad con filtros por nicho y ciudad, drawer de edición, acciones de 1 clic (WhatsApp con voseo prearmado, preview web en `preview.nexobow.site/{slug}/` y renovación de TTL +7 días).

**Blocked by:** 39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet.

**Status:** completed

- [x] Crear migración SQL para tabla `leads` con tipos enumerados `lead_funnel_status` y `lead_response_status`, índices y políticas RLS.
- [x] Implementar script idempotente `scripts/migrate-sheets-to-supabase.mjs` mapeando las 18 columnas canónicas y conservando los IDs enteros de Columna B.
- [x] Implementar adaptador `createSupabaseLeadStore` en `scripts/sheets-sync.mjs` cumpliendo la interfaz canónica de `LeadStore`.
- [x] Construir vista React `views/CrmView.tsx` con conmutador dual Kanban (6 etapas) y Data Table filtrable con badges de estado y TTL.
- [x] Implementar drawer lateral de edición rápida de prospecto y botones de acción (WhatsApp con voseo prearmado, apertura de preview web y renovación de TTL).
- [x] Escribir tests unitarios y de integración en `tests/supabase-lead-store.test.mjs` validando operaciones CRUD, cálculo de correlatividad y migración de datos.
- [x] Verificar que `npm test` pase 100% en verde y `npm run build` en `web/` compile sin errores.
