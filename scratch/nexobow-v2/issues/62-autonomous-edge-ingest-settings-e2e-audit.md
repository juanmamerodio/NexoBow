# 62: Endpoint /api/v1/autonomous/ingest (Sin PII), Panel Gate 1 en /admin/settings, Humanización Ampliada & Auditoría Final E2E (Cierre Frente I)

**What to build:** Se completa la costura entre el futuro motor VPS Gate 1 (`n8n 2.0`) y el panel `/admin` mediante un endpoint Edge endurecido bajo privacidad por diseño, la visibilidad del estado del motor en `/admin/settings`, la ampliación de la guardia de humanización +40 a toda la documentación e infraestructura nueva, y el cierre integral del Frente I (`#58`–`#62`). La Cloudflare Pages Function `web/functions/api/v1/autonomous/ingest.ts` (`0` imports `node:*`, reutilizando `constantTimeEqual` de `web/src/lib/unsubscribe-token.ts`) falla cerrada con HTTP `503` (`Cache-Control: no-store`) si falta `AUTONOMOUS_INGEST_KEY` en `CF_PAGES === "1"` o `ENVIRONMENT === "production"`, valida `X-Autonomous-Key` en tiempo constante (`401`/`403`), rechaza cuerpos mayores a `4 KB` (`413`), realiza un escaneo recursivo anti-PII bajo Ley 25.326 rechazando con HTTP `400` cualquier objeto o clave anidada con datos personales de **pacientes** (`phone`, `telefono`, `patient_phone`, `patient_name`, `email`, `dni`, `cuit`, `message_text`, `audio_transcript`), valida `client_slug`, `event_type` (enum de `public.autonomous_events`), `count_delta` (`0..10000`) y `period_date` (`YYYY-MM-DD`), y persiste únicamente métricas agregadas en `public.autonomous_events` usando `SUPABASE_SERVICE_ROLE_KEY`. En el panel administrativo, `web/src/lib/settings.ts` exporta `resolveGate1EngineStatus({ events, envConfigured, now })` (`"Preparado (Gate 0 · $0 VPS)"` → `"Operativo"` → `"Requiere revisión"`) y `SettingsView.tsx` renderiza el panel **"Motor Gate 1 (NexoBow Autonomous)"** sin exponer credenciales ni datos de pacientes. Finalmente, se documenta `AUTONOMOUS_INGEST_KEY` en `.env.example`, se amplía `tests/copy-humanization.test.mjs` para auditar también `infra/`, `workflows/`, `docs/gate1-vps-activation.md`, `web/public/llms.txt` y `routemap.md`, y se cierra el Frente I verificando la regresión completa `npm test`, build de `web/`, `wrangler pages functions build`, compilación de un **clon** demo en `--mode production`, `impeccable detect` y dictamen **`APROBADO`** en sub-agente limpio `/audit-code`.

**Decisiones cubiertas de `spec-frente-i.md`:** Decisiones **Q1**, **Q2**, **Q3**, **Q11**, **Q12** · Sección **6** · **Seam 6** · **AC-01** a **AC-10**.

**Blocked by:**
- 58: AEO (`scripts/aeo-optimizer.mjs`), `--mode preview|production` en `build-client-site.mjs`, `web/public/llms.txt` (`0 JS`) y `routemap.md` v4.0
- 59: Motor de Reseñas 5★ (`review-booster.mjs`), Migración Supabase (`active_clients`, `autonomous_events`), `/admin/clients` (Entrega 72h, 6 Hitos), Promoción 1-Clic desde CRM, Alertas Cockpit & 8 Tablas
- 60: Blueprint IaC Zero-Trust Gate 1 (`infra/autonomous/`, Postgres 16 SQL, `activate-autonomous.mjs --dry-run` y `docs/gate1-vps-activation.md`)
- 61: Seams Puros `NexoBow Autonomous` (WABA, Recordatorios `24h`/`2h`, Lista de Espera FIFO) & 3 Workflows `n8n` JSON en `workflows/n8n/`

**Blocks:** None (cierra integralmente el Frente I `#58`–`#62` dejando listo Bloque 1 Tier 1 y Blueprint Gate 1 `$0`).

**Status:** ready-for-agent

## Archivos a Crear o Modificar

### Crear
- `web/functions/api/v1/autonomous/ingest.ts` (Cloudflare Pages Function `onRequestPost` / `onRequestOptions` sin imports `node:*`, reutilizando `constantTimeEqual` desde `web/src/lib/unsubscribe-token.ts`: falla cerrada `503` si falta `AUTONOMOUS_INGEST_KEY` en `CF_PAGES === "1"` o `ENVIRONMENT === "production"`, autenticación `X-Autonomous-Key` con `401`/`403`, límite `<= 4 KB` `413`, rechazo recursivo `400` ante cualquier campo PII bajo Ley 25.326, validación estricta de `client_slug`/`event_type`/`count_delta`/`period_date`, cabecera `Cache-Control: no-store`, e inserción en `public.autonomous_events` con `SUPABASE_SERVICE_ROLE_KEY` sin fallback a `PUBLIC_SUPABASE_ANON_KEY`, con cliente/env inyectables para testing offline)
- `tests/autonomous-ingest-e2e.test.mjs` (suite TDD 100% offline para Seam 6: autenticación constante, failsafe `503`, `413`, bloqueo recursivo de PII, inserción mock en `autonomous_events`, verificación de ausencia de imports `node:*` en `ingest.ts`, y estados de `resolveGate1EngineStatus` en `settings.ts`)

### Modificar
- `web/src/lib/settings.ts` (agregar y exportar `resolveGate1EngineStatus({ events, envConfigured, now })` retornando `"Preparado (Gate 0 · $0 VPS)"`, `"Operativo"` o `"Requiere revisión"`, manteniendo intacta la compatibilidad de `getEnvironmentDiagnostics` y `checkSupabaseHealth`)
- `web/src/components/admin/views/SettingsView.tsx` (agregar panel **"Motor Gate 1 (NexoBow Autonomous)"** mostrando estado operativo, último latido agregado y contadores de `autonomous_events` sin exponer credenciales ni datos de pacientes)
- `.env.example` (documentar `AUTONOMOUS_INGEST_KEY` sin valores reales, usando terminología limpia *"clave privada compartida"*)
- `tests/copy-humanization.test.mjs` (ampliar `SOURCE_EXT_RE` y el recolector de archivos para incluir `.yml`, `.yaml`, `.sql`, `.example`, `.md`, `.txt` y auditar también `infra/`, `workflows/`, `docs/gate1-vps-activation.md`, `web/public/llms.txt` y `routemap.md`, manteniendo el lock `nexobow-web-dist.lock`)
- `tickets.md`, `memory.md`, `brain.md` (al cerrar la implementación del Frente I, marcar `#58`–`#62` como `done` en `tickets.md` y documentar la arquitectura, aprendizajes y dictamen limpio de `/audit-code` en `memory.md` y `brain.md`)

## Seams Under Test (`/tdd`)

- **Seam 6 (`Autonomous Edge Ingest, Settings Gate 1 Health, Extended Humanization & E2E Audit Seam` + regresión Seams 1–6 en `tests/autonomous-ingest-e2e.test.mjs` y `tests/copy-humanization.test.mjs`):**
  - *Qué atrapa:* Falla cerrada HTTP `503` sin `AUTONOMOUS_INGEST_KEY` en `CF_PAGES === "1"`, rechazo `401`/`403` vía `constantTimeEqual`, rechazo `413` `> 4 KB`, rechazo recursivo `400` ante claves PII anidadas o raíz (`phone`, `telefono`, `patient_phone`, `patient_name`, `email`, `dni`, `cuit`, `message_text`, `audio_transcript`), inserción en `autonomous_events` con `Cache-Control: no-store`, ausencia de `node:*` en `ingest.ts`, transición de estado en `resolveGate1EngineStatus` (`"Preparado (Gate 0 · $0 VPS)"` → `"Operativo"` → `"Requiere revisión"`), `0` violaciones en la guardia extendida de humanización +40 (`infra/`, `workflows/`, `docs/gate1-vps-activation.md`, `web/public/llms.txt`, `routemap.md` más carpetas previas), compilación limpia de `wrangler pages functions build`, compilación de `web/` con `0 JS` de negocio en rutas públicas y regresión completa de `npm test`.
  - *Qué omite:* Tráfico HTTP real entre un VPS Hetzner vivo y Cloudflare Edge en producción.

## Acceptance Criteria

- [ ] **[RED]** Crear `tests/autonomous-ingest-e2e.test.mjs` y ampliar `tests/copy-humanization.test.mjs` a `infra/`, `workflows/`, `docs/gate1-vps-activation.md`, `web/public/llms.txt` y `routemap.md` (incluyendo extensiones `.yml/.yaml/.sql/.example/.md/.txt`); confirmar fallos antes de implementar.
- [ ] **[GREEN]** Implementar `web/functions/api/v1/autonomous/ingest.ts` (`0` imports `node:*`, autenticación constante, falla cerrada `503`, `413`, rechazo recursivo de PII, inserción en `autonomous_events`) y documentar `AUTONOMOUS_INGEST_KEY` en `.env.example`.
- [ ] **[GREEN]** Implementar `resolveGate1EngineStatus` en `web/src/lib/settings.ts` e integrar el panel **"Motor Gate 1 (NexoBow Autonomous)"** en `web/src/components/admin/views/SettingsView.tsx`.
- [ ] **[GREEN]** Actualizar `tickets.md`, `memory.md` y `brain.md` al cierre de la implementación registrando la finalización de los Tickets `#58`–`#62`.
- [ ] **[VERIFY]** Ejecutar la regresión completa (`npm test`), build de `web/` + `audit-site.mjs web` (`0 JS` de negocio), `npx wrangler pages functions build`, compilación demo con `--mode production` + `impeccable detect` tanto en `web/dist/index.html` como en el **clon** demo productivo, y auditoría `/audit-code` en **sub-agente con sesión limpia** emitiendo dictamen **`APROBADO`**.

## Comando de Validación Exacto

```bash
node --test tests/autonomous-ingest-e2e.test.mjs tests/copy-humanization.test.mjs && npm test && npm --prefix web run build && node scripts/audit-site.mjs web && npx wrangler pages functions build web/functions --outdir /tmp/nexobow-cf-functions-check && .agents/skills/impeccable/scripts/impeccable detect web/dist/index.html
```
