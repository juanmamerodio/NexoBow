# 59: Motor de Reseñas 5★ (review-booster.mjs), Migración Supabase (active_clients, autonomous_events), /admin/clients (Entrega 72h, 6 Hitos), Promoción 1-Clic desde CRM, Alertas Cockpit & 8 Tablas

**What to build:** Desde el primer día de operación Tier 1 (`$0` VPS), todo **prestador** convertido cuenta con un flujo operativo completo en `/admin/clients` (*"Prestadores & Operaciones"*) y con un motor de impulso de reseñas en Google Maps (`scripts/review-booster.mjs`) listo en doble modo: enlace directo `writereview?placeid=...` (con fallback sanitizado a `maps_url` o búsqueda segura), código QR `<svg>` determinista generado offline sin peticiones externas, mensaje cordial en voseo argentino +40 sin incentivos económicos prohibidos por Google para enviar manualmente (`tier1_manual`), y contrato compartido de payload (`buildReviewBoosterWorkflowPayload`) para el futuro workflow automático post-consultoría (`tier2_post_consult`). En la capa de persistencia Supabase, la nueva migración SQL incorpora `public.active_clients` (anclada con `lead_id bigint UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL`, respetando el tipo `bigint` de `public.leads.id`, checklist `jsonb` de 6 hitos y fechas de SLA) y `public.autonomous_events` (contadores agregados sin PII), ambas protegidas con políticas RLS estrictas mediante `public.is_admin_owner()`. Desde `/admin/crm` (`LeadDrawer`), Juanma puede promover cualquier prospecto en 1 clic (`Convertir a Prestador Activo`) hacia `public.active_clients`, calculando automáticamente `delivery_deadline_at` (`+72h` hábiles lun–vie), `trial_ends_at` (`+30d`) y `hosting_renews_at` (`+365d`), monitoreando el checklist de 6 hitos, la verificación DNS vía `scripts/domain-provisioner.mjs` y el kit de reseñas, mientras el Cockpit (`/admin`) suma alertas de entrega (`<24h`) y fin de prueba (`<=5d`) respetando el contrato de Verdad Única `{ data, isOffline }` sin datos fantasma, y `/admin/settings` más `realtime.ts` amplían el monitoreo de 6 a 8 tablas sin introducir JS de negocio en la web pública.

**Decisiones cubiertas de `spec-frente-i.md`:** Decisiones **Q1**, **Q2**, **Q3**, **Q6**, **Q7 (Supabase)**, **Q9**, **Q10 (`/admin/clients`)**, **Q12** · Secciones **2 y 3** · **Seams 2 y 3** · **AC-01**, **AC-02**, **AC-04**, **AC-05**.

**Blocked by:**
- 58: AEO (`scripts/aeo-optimizer.mjs`), `--mode preview|production` en `build-client-site.mjs`, `web/public/llms.txt` (`0 JS`) y `routemap.md` v4.0

**Blocks:**
- 60: Blueprint IaC Zero-Trust Gate 1 (`infra/autonomous/`, Postgres 16 SQL, `activate-autonomous.mjs --dry-run` y `docs/gate1-vps-activation.md`)
- 61: Seams Puros `NexoBow Autonomous` (WABA, Recordatorios `24h`/`2h`, Lista de Espera FIFO) & 3 Workflows `n8n` JSON en `workflows/n8n/`
- 62: Endpoint `/api/v1/autonomous/ingest` (Sin PII), Panel Gate 1 en `/admin/settings`, Humanización Ampliada & Auditoría Final E2E (Cierre Frente I)

**Status:** ready-for-agent

## Archivos a Crear o Modificar

### Crear
- `scripts/review-booster.mjs` (módulo profundo doble modo 100% offline que exporta `extractPlaceIdFromMapsUrl`, `buildGoogleReviewUrl` con `writereview?placeid=...` o fallback sanitizado `https://` rechazando `javascript:`/`data:`, `generateReviewQrSvg` generando `<svg>` QR determinista autocontenido sin red, `buildReviewRequestMessage` en voseo +40 sin incentivos económicos para `tier1_manual` y `tier2_post_consult`, y `buildReviewBoosterWorkflowPayload` alineado con `workflows/n8n/03-review-booster.json`)
- `supabase/migrations/20261121000000_active_clients_and_autonomous_events.sql` (enums `public.client_tier_type`, `public.delivery_sla_status`, `public.autonomous_event_type`; tabla `public.active_clients` con `lead_id bigint UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL`, `checklist jsonb` de 6 hitos, `delivery_deadline_at`, `trial_ends_at`, `hosting_renews_at` y trigger `updated_at`; tabla `public.autonomous_events` sin columnas PII y `CHECK (count_delta >= 0 AND count_delta <= 10000)`; índices y políticas RLS con `public.is_admin_owner()`)
- `web/src/lib/active-clients.ts` (interfaces `DeliveryChecklist`, `ActiveClient`, `AutonomousEvent`, `OperationalAlert`; funciones puras `addBusinessHours(startDate, 72)`, `buildActiveClientFromLead(lead, options)`, `computeChecklistProgress(checklist)`, `resolveDeliverySlaState(client, now)`, `extractOperationalAlerts(clients, now)`; helpers de kit `review-booster` offline y comando `domain-provisioner`; repositorio Supabase con contrato `{ data, isOffline }` sin datos fantasma cuando Supabase responde online vacío)
- `web/src/components/admin/views/ClientsView.tsx` (tablero *"Prestadores & Operaciones"* en estándar Soft-Obsidian con filtros por `tier` y estado SLA, reloj regresivo de 72h hábiles, checklist interactivo de 6 hitos con barra de progreso, verificador DNS / comando `domain-provisioner` por dominio propio, botón de descarga/copiado del kit `review-booster` y contadores agregados de `autonomous_events`)
- `tests/review-booster-clients.test.mjs` (suite TDD 100% offline para Seams 2 y 3)

### Modificar
- `web/src/pages/admin/[...all].astro` (agregar `{ params: { all: "clients" } }` en `getStaticPaths()`)
- `web/src/components/admin/AdminLayout.tsx` (agregar ítem de navegación **`Prestadores & Operaciones`** apuntando a `/admin/clients`)
- `web/src/components/admin/AdminApp.tsx` (importar `ClientsView` y enrutar `/admin/clients` y `/admin/clients/` dentro de la isla React aislada)
- `web/src/components/admin/views/CrmView.tsx` (incorporar botón de 1 clic **`Convertir a Prestador Activo`** en `LeadDrawer`, promoviendo el `LeadEntity` hacia `public.active_clients` y enlazando a `/admin/clients`)
- `web/src/lib/cockpit.ts` y `web/src/components/admin/views/CockpitView.tsx` (incorporar alertas de **Entrega 72h (<24h)**, **Fin de Prueba 30d (<=5d)** y resumen agregado Gate 1 respetando el contrato `{ data, isOffline }` sin datos fantasma cuando `error === null`)
- `web/src/lib/settings.ts` y `web/src/lib/realtime.ts` (ampliar `ADMIN_DATABASE_TABLES` y `DEFAULT_WATCHED_TABLES` de **6 a 8 tablas** agregando `"active_clients"` con ruta `/admin/clients` y `"autonomous_events"` con ruta `/admin/settings`, actualizando los comentarios descriptivos de 6 a 8 tablas)
- `web/src/components/admin/views/SettingsView.tsx` (agregar iconos en `getTableIcon` para `active_clients` y `autonomous_events` y actualizar los textos literales de `6 tablas` / `6 submódulos` a `8 tablas` / `8 módulos`)
- `tests/admin-cockpit-e2e.test.mjs` (actualizar aserciones de `6` a `8` tablas en `ADMIN_DATABASE_TABLES`, `checkSupabaseHealth` y `subscribeToAdminRealtime`, sumar `/admin/clients` en `allRoutes` del subtest 3 y verificar `0` datos fantasma con las 8 tablas online vacías en el subtest 7)
- `package.json` (agregar script `"review-booster": "node scripts/review-booster.mjs"`)

## Seams Under Test (`/tdd`)

- **Seam 2 (`Review Booster Dual-Mode Seam` en `tests/review-booster-clients.test.mjs`):**
  - *Qué atrapa:* Extracción segura de `placeId` desde URLs de Google Maps (y retorno determinista `null` sin red en enlaces cortos), generación de URL `writereview?placeid=...` o fallback sanitizado rechazando esquemas `javascript:`/`data:`, generación determinista offline de QR `<svg>` válido en memoria, redacción en voseo +40 sin incentivos económicos prohibidos en modos `tier1_manual` y `tier2_post_consult`, y construcción del payload estándar compartido con el workflow `03-review-booster.json`.
  - *Qué omite:* Resolución HTTP de URLs acortadas de Maps o lectura del QR por cámara física.
- **Seam 3 (`Active Clients, Delivery 72h SLA & 8-Table Admin Cockpit Seam` en `tests/review-booster-clients.test.mjs` y `tests/admin-cockpit-e2e.test.mjs`):**
  - *Qué atrapa:* Promoción 1-clic desde `LeadEntity` hacia `ActiveClient`, cálculo exacto de `addBusinessHours(startDate, 72)` saltando sábados y domingos, fechas `+30d` y `+365d`, progreso de los 6 hitos de entrega, integración con el comando de `domain-provisioner`, alertas del Cockpit (`<24h` entrega, `<=5d` prueba) con `0` datos fantasma cuando Supabase está online vacío (`{ data: [], isOffline: false }`), existencia de `web/dist/admin/clients/index.html`, validación del esquema SQL Supabase (`lead_id bigint`, RLS `is_admin_owner()`, 0 PII en `autonomous_events`) y registro de las 8 tablas en `settings.ts`, `SettingsView.tsx` y `realtime.ts`.
  - *Qué omite:* Ejecución viva contra una instancia remota de Supabase o verificación DNS real en la red pública.

## Acceptance Criteria

- [ ] **[RED]** Crear `tests/review-booster-clients.test.mjs` (Seams 2 y 3 completos) y actualizar `tests/admin-cockpit-e2e.test.mjs` para exigir las 8 tablas y la ruta `/admin/clients`; confirmar fallos antes de implementar.
- [ ] **[GREEN]** Implementar `scripts/review-booster.mjs` y registrar `"review-booster"` en `package.json`.
- [ ] **[GREEN]** Crear `supabase/migrations/20261121000000_active_clients_and_autonomous_events.sql` (con `lead_id bigint`, checklist 6 hitos, `autonomous_events` sin PII y políticas RLS `public.is_admin_owner()`).
- [ ] **[GREEN]** Implementar `web/src/lib/active-clients.ts`, `web/src/components/admin/views/ClientsView.tsx`, la ruta estática en `web/src/pages/admin/[...all].astro`, la navegación en `AdminLayout.tsx` y `AdminApp.tsx`, y el botón 1-clic **`Convertir a Prestador Activo`** en `CrmView.tsx` (`LeadDrawer`).
- [ ] **[GREEN]** Integrar alertas de Entrega 72h (`<24h`), Fin de Prueba 30d (`<=5d`) y resumen Gate 1 en `cockpit.ts` / `CockpitView.tsx` respetando Verdad Única `{ data, isOffline }`, y ampliar `settings.ts`, `realtime.ts` y `SettingsView.tsx` de 6 a 8 tablas.
- [ ] **[VERIFY]** Ejecutar el comando de validación exacto comprobando tests en verde, compilación exitosa de `web/dist/admin/clients/index.html` y `0 JS` de negocio en rutas públicas vía `audit-site.mjs web`.

## Comando de Validación Exacto

```bash
node --test tests/review-booster-clients.test.mjs tests/admin-cockpit.test.mjs tests/admin-cockpit-e2e.test.mjs tests/admin-auth-seam.test.mjs && npm --prefix web run build && node scripts/audit-site.mjs web
```
