# 60: Blueprint IaC Zero-Trust Gate 1 (infra/autonomous/, Postgres 16 SQL, activate-autonomous.mjs --dry-run y docs/gate1-vps-activation.md)

**What to build:** Respetando la regla financiera de `$0` gasto fijo hasta abrir Gate 1 con caja real de Tier 1/Tier 2, se construye el blueprint completo y reproducible de infraestructura para el motor **NexoBow Autonomous** (`n8n 2.0` + `Postgres 16` + `Redis 7` + `cloudflared` opcional) bajo aislamiento Zero-Trust en `infra/autonomous/`, junto con su esquema SQL transaccional dedicado, el orquestador en 1 comando `scripts/activate-autonomous.mjs` verificable offline en `--dry-run`, y la guía operativa `docs/gate1-vps-activation.md`. En la topología de `infra/autonomous/docker-compose.yml`, la red `data-tier` queda marcada con `internal: true` sin salida directa a internet; `postgres` y `redis` operan únicamente dentro de `data-tier` sin exponer puertos al host; `n8n` se enlaza únicamente al loopback `127.0.0.1:${N8N_LOCAL_PORT:-5678}:5678` sin montaje de `/var/run/docker.sock`, con `security_opt: ["no-new-privileges:true"]` y límites de memoria adecuados para VPS de 2–4 GB RAM (dejando Chatwoot explícitamente desacoplado fuera del Compose). En `infra/autonomous/sql/001_autonomous_init.sql` viven exclusivamente los datos operativos y de contacto de **pacientes** (`appointments`, `waitlist_entries`, `reminder_dispatches`, `conversation_state`) con índices FIFO y restricciones `UNIQUE` anti-duplicados, sin replicarse jamás a Supabase ni a Cloudflare Edge. El script `scripts/activate-autonomous.mjs` permite validar todo el preflight offline en Gate 0 (`--dry-run` saliendo con código `0`) y exige variables completas sin placeholders antes de permitir `--strict-env` o `--apply`.

**Decisiones cubiertas de `spec-frente-i.md`:** Decisiones **Q1**, **Q3**, **Q7 (Postgres 16 VPS)**, **Q8 (pieza 1)**, **Q12** · Sección **4** · **Seam 4** · **AC-01**, **AC-06**, **AC-09**.

**Blocked by:**
- 59: Motor de Reseñas 5★ (`review-booster.mjs`), Migración Supabase (`active_clients`, `autonomous_events`), `/admin/clients` (Entrega 72h, 6 Hitos), Promoción 1-Clic desde CRM, Alertas Cockpit & 8 Tablas

**Blocks:**
- 61: Seams Puros `NexoBow Autonomous` (WABA, Recordatorios `24h`/`2h`, Lista de Espera FIFO) & 3 Workflows `n8n` JSON en `workflows/n8n/`
- 62: Endpoint `/api/v1/autonomous/ingest` (Sin PII), Panel Gate 1 en `/admin/settings`, Humanización Ampliada & Auditoría Final E2E (Cierre Frente I)

**Status:** ready-for-agent

## Archivos a Crear o Modificar

### Crear
- `infra/autonomous/docker-compose.yml` (topología Zero-Trust 100% offline hoy: redes `front-ingress`, `app-tier` y `data-tier` con `internal: true`; `postgres:16-alpine` y `redis:7-alpine` confinados a `data-tier` sin mapeo `ports` al host y con `security_opt: ["no-new-privileges:true"]` + `mem_limit`, montando `./sql/001_autonomous_init.sql` en `/docker-entrypoint-initdb.d/`; `n8n` en `app-tier` + `data-tier` publicado solo en `127.0.0.1:${N8N_LOCAL_PORT:-5678}:5678`, sin `/var/run/docker.sock`, con `no-new-privileges:true` y `mem_limit`; servicio opcional `cloudflared` bajo `profiles: ["tunnel"]`; Chatwoot fuera del Compose)
- `infra/autonomous/.env.autonomous.example` (plantilla de variables requeridas — `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `N8N_ENCRYPTION_KEY`, `WEBHOOK_URL`, `META_WABA_VERIFY_TOKEN`, `META_WABA_APP_SECRET`, `META_WABA_ACCESS_TOKEN`, `NEXOBOW_INGEST_URL`, `AUTONOMOUS_INGEST_KEY`, `N8N_LOCAL_PORT` — con placeholders descriptivos sin credenciales reales y redactado en terminología limpia `"credenciales"` / `"claves privadas"`)
- `infra/autonomous/sql/001_autonomous_init.sql` (esquema Postgres 16 aislado en `data-tier` con las 4 tablas: `appointments`, `waitlist_entries` con índice FIFO `(client_slug, status, created_at ASC)`, `reminder_dispatches` con `UNIQUE (appointment_id, reminder_type)` anti-duplicados, y `conversation_state` con `UNIQUE (client_slug, patient_phone_hash)`)
- `scripts/activate-autonomous.mjs` (orquestador de activación en 1 comando con `commandRunner` y `envLoader` inyectables y flags `--dry-run`, `--strict-env`, `--env-file <ruta>` y `--apply`: en `--dry-run` sin `--strict-env`/`--env-file` valida la integridad Zero-Trust de `docker-compose.yml`, `.env.autonomous.example` y `001_autonomous_init.sql`, informa estado Gate 0 `$0 VPS` y sale con código `0`; con `--strict-env`, `--env-file` o `--apply` exige todas las variables requeridas sin placeholders o falla explícitamente con código distinto de `0`, ejecutando `docker compose -f infra/autonomous/docker-compose.yml up -d` únicamente en `--apply` tras aprobar el preflight)
- `docs/gate1-vps-activation.md` (runbook operativo paso a paso en lenguaje +40 limpio: regla financiera Gate 1, hardening de VPS Hetzner con Tailscale + UFW + CrowdSec, túnel saliente Cloudflare Tunnel, configuración de Meta Embedded Signup / WABA, desacoplamiento de Chatwoot, rotación de credenciales/claves privadas y activación en 1 comando `--apply`)
- `tests/autonomous-infra.test.mjs` (suite TDD 100% offline para Seam 4, parseando `docker-compose.yml` con la dependencia `yaml` existente y verificando contratos con `envLoader` y `commandRunner` inyectados)

### Modificar
- `package.json` (agregar script `"activate-autonomous": "node scripts/activate-autonomous.mjs --dry-run"`)

## Seams Under Test (`/tdd`)

- **Seam 4 (`Zero-Trust IaC, Postgres 16 SQL & 1-Command Activation Preflight Seam` en `tests/autonomous-infra.test.mjs`):**
  - *Qué atrapa:* Validación estructural de `infra/autonomous/docker-compose.yml` (red `data-tier` con `internal: true`, ausencia de `/var/run/docker.sock`, ausencia de puertos expuestos en `postgres` y `redis`, enlace estricto `127.0.0.1` en `n8n`, `no-new-privileges:true`, límites `mem_limit`, perfil opcional `tunnel` y ausencia de Chatwoot), verificación de ausencia de credenciales reales en `.env.autonomous.example`, integridad DDL de `001_autonomous_init.sql` (4 tablas, `CHECK` de estados, índice FIFO y restricciones `UNIQUE`), ejecución exitosa código `0` de `node scripts/activate-autonomous.mjs --dry-run` en Gate 0, fallo explícito ante variables faltantes o placeholders sin reemplazar en modo `--strict-env` / `--apply`, e invocación exacta de `docker compose ... up -d` sobre `commandRunner` inyectado cuando `--apply` pasa validación sin tocar un daemon Docker real.
  - *Qué omite:* Levantar contenedores Docker reales, aprovisionar un VPS en Hetzner o probar conectividad viva hacia Meta WABA.

## Acceptance Criteria

- [ ] **[RED]** Crear `tests/autonomous-infra.test.mjs` validando topología Zero-Trust de `docker-compose.yml`, placeholders en `.env.autonomous.example`, DDL de `001_autonomous_init.sql` y contratos `--dry-run` / `--strict-env` / `--apply` de `scripts/activate-autonomous.mjs` con dependencias inyectables; confirmar fallos antes de implementar.
- [ ] **[GREEN]** Crear `infra/autonomous/docker-compose.yml`, `infra/autonomous/.env.autonomous.example` (sin credenciales reales) e `infra/autonomous/sql/001_autonomous_init.sql` con las 4 tablas, índices FIFO y restricciones `UNIQUE` anti-duplicados.
- [ ] **[GREEN]** Implementar `scripts/activate-autonomous.mjs` (`--dry-run`, `--strict-env`, `--env-file`, `--apply` con `commandRunner` y `envLoader` inyectables) y registrar `"activate-autonomous"` en `package.json`.
- [ ] **[GREEN]** Redactar `docs/gate1-vps-activation.md` con tono sobrio +40 cubriendo Tailscale, UFW, CrowdSec, Cloudflare Tunnel, Meta Embedded Signup / WABA, desacoplamiento de Chatwoot y activación Gate 1 en 1 comando.
- [ ] **[VERIFY]** Ejecutar el comando de validación exacto comprobando la suite `autonomous-infra.test.mjs` en verde y la ejecución limpia de `node scripts/activate-autonomous.mjs --dry-run` con código `0`.

## Comando de Validación Exacto

```bash
node --test tests/autonomous-infra.test.mjs && node scripts/activate-autonomous.mjs --dry-run
```
