# 61: Seams Puros NexoBow Autonomous (WABA, Recordatorios 24h/2h, Lista de Espera FIFO) & 3 Workflows n8n JSON en workflows/n8n/

**What to build:** El motor de atención automática por WhatsApp, confirmación automática de turnos y lista de espera FIFO e impulso de reseñas en Google Maps para Gate 1 queda construido y verificado al 100% offline mediante dos módulos JavaScript puros sin dependencias pagas y tres workflows JSON versionados para `n8n 2.0`. Por un lado, `scripts/autonomous/waba-webhook.mjs` resuelve el desafío `GET` de Meta (`verifyMetaWebhookChallenge`), verifica en tiempo constante las firmas `X-Hub-Signature-256` (`verifyMetaSignature`), normaliza eventos entrantes de texto, audio con transcriptor inyectable, botones interactivos (`Confirmar` / `Reprogramar` / `Cancelar`) y baja explícita (`"baja"`), consolida ráfagas de mensajes en una ventana de `8–12s` sobre un store Redis inyectable (`createInMemoryRedisStore` + `bufferIncomingMessages`) y clasifica la intención del **paciente** (`classifyPatientIntent`) mediante reglas deterministas a `$0` con derivación humana obligatoria ante urgencia clínica y hook enchufable `customClassifier` para Gate 2. Por otro lado, `scripts/autonomous/appointment-reminders.mjs` selecciona turnos pendientes dentro de las ventanas `24h` y `2h` (`selectDueReminders`) evitando reenvíos duplicados, construye mensajes cordiales en voseo +40 (`buildReminderDispatchMessage`), procesa respuestas (`processPatientAppointmentResponse`) y asigna huecos liberados al primer **paciente** en orden estricto **FIFO** con consentimiento Ley 25.326 (`consent_waitlist === true && opted_out !== true`) y expiración automática (`advanceExpiredWaitlistOffers`). Finalmente, se exportan los 3 workflows JSON en `workflows/n8n/` (`01-waba-receptionist.json`, `02-reminders-waitlist.json`, `03-review-booster.json`) referenciando únicamente variables `{{$env.*}}` y `0` credenciales literales, alineados con el payload de `scripts/review-booster.mjs` y el puente `/api/v1/autonomous/ingest`.

**Decisiones cubiertas de `spec-frente-i.md`:** Decisiones **Q1**, **Q3**, **Q4**, **Q6 (Tier 2)**, **Q8 (piezas 2, 3 y 4)**, **Q12** · Sección **5** · **Seam 5** · **AC-01**, **AC-04**, **AC-07**, **AC-09**.

**Blocked by:**
- 59: Motor de Reseñas 5★ (`review-booster.mjs`), Migración Supabase (`active_clients`, `autonomous_events`), `/admin/clients` (Entrega 72h, 6 Hitos), Promoción 1-Clic desde CRM, Alertas Cockpit & 8 Tablas
- 60: Blueprint IaC Zero-Trust Gate 1 (`infra/autonomous/`, Postgres 16 SQL, `activate-autonomous.mjs --dry-run` y `docs/gate1-vps-activation.md`)

**Blocks:**
- 62: Endpoint `/api/v1/autonomous/ingest` (Sin PII), Panel Gate 1 en `/admin/settings`, Humanización Ampliada & Auditoría Final E2E (Cierre Frente I)

**Status:** done

## Archivos a Crear o Modificar

### Crear
- `scripts/autonomous/waba-webhook.mjs` (módulo puro 100% offline que exporta `verifyMetaWebhookChallenge`, `verifyMetaSignature` con comparación en tiempo constante, `normalizeWabaIncomingPayload` para texto/audio/botones/opt-out/estados, `createInMemoryRedisStore` + `bufferIncomingMessages` con debounce `8–12s`, y `classifyPatientIntent` determinista `$0` sobre las 8 intenciones — `turno_nuevo`, `confirmar_turno`, `reprogramar_turno`, `cancelar_turno`, `consulta_arancel_obra_social`, `baja_comunicaciones`, `urgencia_clinica`, `handoff_humano` — con `requiresHumanHandoff: true` garantizado en urgencias y hook enchufable `customClassifier` con fallback seguro)
- `scripts/autonomous/appointment-reminders.mjs` (módulo puro 100% offline que exporta `selectDueReminders` para ventanas `24h` y `2h` respetando flags booleanos y registros de `reminder_dispatches`, `buildReminderDispatchMessage` en voseo argentino +40 con botones `[Confirmar turno]` / `[Reprogramar]`, `processPatientAppointmentResponse` con liberación de hueco y oferta FIFO bajo `consent_waitlist === true && opted_out !== true` + `offer_expires_at`, y `advanceExpiredWaitlistOffers` para expirar ofertas vencidas y promover al siguiente candidato FIFO)
- `workflows/n8n/01-waba-receptionist.json` (workflow `n8n` versionado: webhook Meta WABA `GET`/`POST` → verificación firma → debounce Redis `10s` → transcripción condicional de audio / `IntentClassifier` → respuesta / reserva en Postgres 16 / derivación humana → envío agregado sin PII hacia `{{$env.NEXOBOW_INGEST_URL}}` con cabecera `{{$env.AUTONOMOUS_INGEST_KEY}}`)
- `workflows/n8n/02-reminders-waitlist.json` (workflow `n8n` versionado: cron horario → consulta Postgres 16 ventanas `24h`/`2h` con `reminder_dispatches` idempotente → envío WABA `[Confirmar turno]` / `[Reprogramar]` → procesamiento de respuesta con oferta FIFO en `waitlist_entries` → ping agregado sin PII hacia `{{$env.NEXOBOW_INGEST_URL}}`)
- `workflows/n8n/03-review-booster.json` (workflow `n8n` versionado: trigger post-consultoría concretada `+2–4h` → verificación de consentimiento / no opt-out y `review_requested_at IS NULL` → enlace Google Maps alineado al contrato `buildReviewBoosterWorkflowPayload` de `scripts/review-booster.mjs` → envío respetuoso en voseo +40 → registro idempotente `review_5star` + ping agregado sin PII hacia `{{$env.NEXOBOW_INGEST_URL}}`)
- `tests/autonomous-engine.test.mjs` (suite TDD 100% offline para Seam 5 con reloj y stores inyectables)

### Modificar
- `scripts/review-booster.mjs` *(solo si hiciera falta exponer constantes/campos adicionales requeridos por `03-review-booster.json` manteniendo intacta la API pública del Ticket `#59`)*

## Seams Under Test (`/tdd`)

- **Seam 5 (`Autonomous WABA Webhook, Debounce, IntentClassifier, Reminders & n8n Workflows Seam` en `tests/autonomous-engine.test.mjs`):**
  - *Qué atrapa:* Handshake `GET` de Meta (`200` con `challenge` exacto vs `403` ante modo o token inválido); verificación HMAC-SHA256 `X-Hub-Signature-256` en tiempo constante rechazando firmas alteradas o ausentes; normalización de mensajes texto, audio con transcriptor mock, botones interactivos, `"baja"` y notificaciones de estado; consolidación en ventana de debounce `8–12s` evitando respuestas duplicadas ante ráfagas; clasificación determinista de las 8 intenciones con derivación humana obligatoria (`requiresHumanHandoff: true`) en urgencias clínicas aunque se inyecte un `customClassifier` que falle o intente omitirla; selección idempotente `24h`/`2h` sin envíos repetidos; asignación estricta FIFO de lista de espera bajo Ley 25.326 (`consent_waitlist === true && opted_out !== true`) y promoción automática tras expirar `offer_expires_at`; y validación estructural JSON de los 3 archivos en `workflows/n8n/` confirmando `0` credenciales literales, uso de `{{$env.*}}` y paridad con `review-booster.mjs`.
  - *Qué omite:* Llamadas reales a Graph API de WhatsApp Business, servidor Redis en red y ejecución en vivo dentro de un contenedor `n8n`.

## Acceptance Criteria

- [x] **[RED]** Crear `tests/autonomous-engine.test.mjs` cubriendo todo el Seam 5 (handshake `GET`, firma HMAC, normalización WABA, debounce `8–12s`, `IntentClassifier` + guardarraíl de urgencia, recordatorios `24h`/`2h` idempotentes, lista de espera FIFO Ley 25.326 y validación estructural de los 3 JSON en `workflows/n8n/`); confirmar fallos antes de implementar.
- [x] **[GREEN]** Implementar `scripts/autonomous/waba-webhook.mjs` con todas sus funciones puras exportadas y cero dependencias externas ni llamadas de red.
- [x] **[GREEN]** Implementar `scripts/autonomous/appointment-reminders.mjs` garantizando idempotencia `24h`/`2h`, voseo +40 sin frases prohibidas, lista de espera FIFO con consentimiento Ley 25.326 y rotación de ofertas expiradas.
- [x] **[GREEN]** Crear `workflows/n8n/01-waba-receptionist.json`, `workflows/n8n/02-reminders-waitlist.json` y `workflows/n8n/03-review-booster.json` referenciando exclusivamente variables `{{$env.*}}` sin credenciales literales ni PII en el payload saliente hacia `/api/v1/autonomous/ingest`.
- [x] **[VERIFY]** Ejecutar el comando de validación exacto comprobando todas las pruebas de motor autónomo, reseñas e infraestructura pasando en verde al 100% offline.

## Comando de Validación Exacto

```bash
node --test tests/autonomous-engine.test.mjs tests/review-booster-clients.test.mjs tests/autonomous-infra.test.mjs
```
