# 56: Inbound Preview End-to-End, Checkbox T&C Sin Marcar, Zoho Mail + Resend, Enlace de Baja HMAC & ElevenLabs MCP Starter

**What to build:** Todo prospecto que solicita su muestra gratuita en `CreateBowSystem.astro` ve un formulario limpio con campo antispam oculto (`website_confirm`), botón claro `"Pedir mi muestra gratuita"` y casilla obligatoria `accept_terms` explícitamente **sin marcar por defecto** (`required`, sin atributo `checked`) enlazando a `/terminos/` y `/privacidad/`. Al enviar, `POST /api/v1/bow-system/create` exige `accept_terms === true` (HTTP `400` si falta), valida email RFC simplificado y teléfono argentino normalizado (`+549...`), guarda en Supabase `public.leads` la ficha completa con `LeadComplianceMetadata` (`source: "inbound_web"`, `terms_accepted: true`, `terms_accepted_at`, `terms_version: "2026-11"`, `marketing_opt_in: true`, `email_marketing: { unsubscribed: false, followup_stage: "welcome" }`, `expires_at` +7 días) y dispara en paralelo vía **Resend** (sin bloquear la respuesta ante error de envío) la alerta inmediata a `ADMIN_OWNER_EMAIL` (con botones WhatsApp + `/admin/crm`) y el recibo de confirmación al **prestador** (<24h hábiles) con enlace de baja firmado. Una vez compilada la preview en `https://preview.nexobow.site/{slug}/`, Juanma puede despachar con 1 clic desde `/admin/crm` (`/api/v1/email/send-preview`) o desde CLI (`scripts/process-inbound-leads.mjs`) el envío dual coordinado (**Zoho Mail SMTP** para entrega 1-a-1 ejecutiva + **Resend API** para confirmación Día 0, entrega Día 1 y recordatorio amable Día 4 del vencimiento de 7 días). Todo correo saliente de Zoho Mail o Resend consulta antes `unsubscribed` (omitiendo con estado `skipped_unsubscribed` a quien se dio de baja) e incluye al pie enlace visible y cabeceras RFC 8058 (`List-Unsubscribe` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) apuntando a `/api/unsubscribe` con firma **HMAC-SHA256** (`UNSUBSCRIBE_SECRET`) verificable en `GET` (redirect `303` a `/baja-email/?status=ok`) y `POST` (JSON `200`). Finalmente, se documenta la integración MCP oficial de **ElevenLabs Plan Starter** y se agrega el helper CLI desacoplado `scripts/generate-voice-note.mjs` para transformar el `audio_script_35s` humanizado de un lead en una nota de voz lista para WhatsApp.

**Puntos cubiertos de `spec-final-polish.md`:** Puntos **1 (parte formulario + API)**, **9**, **11**, **12** y **14** (Pilares 3 y 4).

**Blocked by:**
- 54: Marco Legal (`/terminos/`, `/privacidad/`), Banner de Cookies + GA4 Condicional, SEO de Intención Real, Search Console & Google Business Profile
- 55: UX "Diagram-First" para +40 Años, Capturas Reales de Casos de Éxito & Humanización Total (Cero "Silla Vacía")

**Blocks:**
- 57: `robots.txt`, Blindaje Cibernético Perimetral & Auditoría Final E2E (Cierre Frente H)

**Status:** done

## Archivos a Crear o Modificar

### Crear
- `web/src/lib/unsubscribe-token.ts` (generación y verificación de tokens Base64URL `{ slug, email, exp }` firmados con HMAC-SHA256 vía Web Crypto `crypto.subtle` + comparación en tiempo constante usando `UNSUBSCRIBE_SECRET`, URL `/api/unsubscribe?token=...` y cabeceras `List-Unsubscribe` + `List-Unsubscribe-Post`)
- `web/functions/api/unsubscribe.ts` (handlers `onRequestGet` y `onRequestPost` RFC 8058 con cliente Supabase inyectable: valida firma HMAC y expiración, marca `metadata.email_marketing.unsubscribed = true` y `unsubscribed_at` en `public.leads`, `GET` redirige `303` a `/baja-email/?status=ok` o `status=invalid`, `POST` retorna HTTP `200` JSON)
- `web/src/pages/baja-email.astro` (página pública estática `0 JS`, Soft-Obsidian, `noindex: true`, `<title>` con `"NexoBow"`, confirmando la remoción definitiva de comunicaciones comerciales)
- `web/functions/api/v1/email/send-preview.ts` (endpoint protegido para despachar desde `/admin/crm` el correo *"Tu muestra interactiva de NexoBow ya está lista"* vía Resend/Zoho, respetando `skipped_unsubscribed` y actualizando `metadata.email_marketing`)
- `scripts/process-inbound-leads.mjs` (CLI unificado para listar/despachar entregas de preview terminada y secuencia de seguimiento Día 0 / Día 1 / Día 4 coordinando Zoho Mail SMTP y Resend API, con `--dry-run` y bloqueo `skipped_unsubscribed`)
- `scripts/generate-voice-note.mjs` (helper CLI desacoplado para ElevenLabs Plan Starter: lee `audio_script_35s` humanizado, exige `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID`, genera MP3/OGG vía `fetch` inyectable con soporte `--dry-run`)
- `docs/elevenlabs-mcp-setup.md` (guía de registro de `elevenlabs-mcp` vía `uvx` en `~/.gemini/config/mcp_config.json` con `ELEVENLABS_API_KEY` sin secretos en git)
- `tests/inbound-security.test.mjs` (suite TDD base para Seam 3: checkbox `accept_terms` sin `checked`, honeypot, validación HTTP `400` sin T&C, normalización telefónica `+549...`, persistencia `LeadComplianceMetadata` y envío paralelo Resend con mocks)
- `tests/email-unsubscribe.test.mjs` (suite TDD para Seam 4: tokens HMAC-SHA256, `GET`/`POST /api/unsubscribe`, cabeceras `List-Unsubscribe` RFC 8058, flujo dual Zoho/Resend, `skipped_unsubscribed` y `generate-voice-note.mjs` con mock `fetch`)

### Modificar
- `web/src/components/CreateBowSystem.astro` (agregar campo honeypot oculto `website_confirm`, checkbox obligatorio **sin atributo `checked`**: `<input type="checkbox" name="accept_terms" required />` con enlaces a `/terminos/` y `/privacidad/`, y CTA `"Pedir mi muestra gratuita"`)
- `web/functions/api/v1/bow-system/create.ts` (inyectar dependencias `fetchImpl`/`supabaseClient`/`sendEmail` para testabilidad; exigir `accept_terms === true` o HTTP `400`, validar email y normalizar WhatsApp `+549...`, persistir `LeadComplianceMetadata` + `expires_at` +7d en `public.leads`, y disparar alerta Juanma + confirmación al prestador con link de baja vía Resend en paralelo sin bloquear respuesta)
- `scripts/send-zoho-outreach.mjs` (consultar `metadata.email_marketing.unsubscribed` retornando `{ status: "skipped_unsubscribed" }` si está dado de baja; adjuntar link de baja HMAC al pie y cabeceras `List-Unsubscribe` + `List-Unsubscribe-Post`)
- `web/src/components/admin/views/CrmView.tsx` (extender `resolveLeadMetadata` de forma retrocompatible con `terms_accepted_at` y `email_marketing`, badge `Dado de baja` si `unsubscribed: true`, y botón 1-clic **"Enviar Preview Lista (Email)"** en `LeadDrawer` conectado a `/api/v1/email/send-preview`)
- `.env.example` (documentar `RESEND_FROM_EMAIL`, `UNSUBSCRIBE_SECRET`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` sin valores reales)
- `package.json` (agregar scripts `"process-inbound"` y `"voice-note"`)

## Seams Under Test (`/tdd`)

- **Seam 3 (`Inbound Preview & T&C Checkbox Gate Seam` en `tests/inbound-security.test.mjs`):**
  - *Qué atrapa:* Presencia en HTML compilado de `<input type="checkbox" ... name="accept_terms" required>` sin atributo `checked` y campo oculto `website_confirm`; rechazo HTTP `400` en `POST /api/v1/bow-system/create` si `accept_terms` es falso/ausente o email inválido; registro correcto en Supabase mock con `terms_accepted_at`, `terms_version: "2026-11"`, `email_marketing.unsubscribed: false` y `expires_at` +7d; y disparo paralelo de alerta Juanma + confirmación al prestador vía Resend mock con fallo tolerante si Resend cae.
  - *Qué omite:* Renderizado en navegador real del formulario y envío real hacia api.resend.com / Supabase en producción.
- **Seam 4 (`Zoho + Resend Preview Delivery, Email Marketing & Unsubscribe Seam` en `tests/email-unsubscribe.test.mjs`):**
  - *Qué atrapa:* Generación y verificación criptográfica HMAC-SHA256 de tokens de baja; handlers `GET` (`303` a `/baja-email/?status=ok`) y `POST` (RFC 8058 JSON `200`) de `/api/unsubscribe` marcando `unsubscribed: true` en Supabase mock; inclusión de link visible y cabeceras `List-Unsubscribe` + `List-Unsubscribe-Post` en Zoho Mail y Resend; omisión automática `skipped_unsubscribed` cuando `unsubscribed === true`; y generación de audio con `generate-voice-note.mjs` usando `fetch` mock.
  - *Qué omite:* Entrega real en casillas Gmail/Zoho y llamada TTS real a ElevenLabs.

## Acceptance Criteria

- [x] **[RED]** Crear `tests/inbound-security.test.mjs` y `tests/email-unsubscribe.test.mjs` cubriendo los Seams 3 y 4 completos (checkbox T&C sin marcar, rechazo `400` sin aceptación, Resend dual, HMAC `/api/unsubscribe` GET/POST, `List-Unsubscribe` RFC 8058, `skipped_unsubscribed` y ElevenLabs helper); verificar fallos antes de implementar.
- [x] **[GREEN]** Implementar `web/src/lib/unsubscribe-token.ts`, `web/functions/api/unsubscribe.ts` y `web/src/pages/baja-email.astro` con firma HMAC-SHA256, comparación constante y confirmación amable `0 JS`.
- [x] **[GREEN]** Actualizar `CreateBowSystem.astro` (checkbox `accept_terms` requerido sin `checked` + honeypot `website_confirm`) y `web/functions/api/v1/bow-system/create.ts` (validación `accept_terms`, normalización `+549...`, `LeadComplianceMetadata` y envío paralelo vía Resend).
- [x] **[GREEN]** Implementar envío de preview terminada y secuencia de seguimiento (`web/functions/api/v1/email/send-preview.ts`, `scripts/process-inbound-leads.mjs`, botones/badges en `CrmView.tsx`) y actualizar `scripts/send-zoho-outreach.mjs` para verificar `unsubscribed` (`skipped_unsubscribed`) y emitir cabeceras `List-Unsubscribe` + enlace de baja HMAC.
- [x] **[GREEN]** Documentar ElevenLabs MCP Starter (`docs/elevenlabs-mcp-setup.md`), agregar variables en `.env.example` e implementar `scripts/generate-voice-note.mjs` + scripts en `package.json`.
- [x] **[VERIFY]** Ejecutar el comando de validación exacto con 0 errores y confirmar `0` emails enviados a contactos `unsubscribed: true`.

## Comando de Validación Exacto

```bash
node --test tests/inbound-security.test.mjs tests/email-unsubscribe.test.mjs tests/zoho-outreach.test.mjs tests/flexible-booking-funnel.test.mjs && npm --prefix web run build
```
