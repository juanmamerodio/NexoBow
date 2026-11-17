# 52: Outbound Ejecutivo con Zoho Mail + Telemetría Pasiva & Endpoint /api/ping Hot-Lead

**What to build:** Todo prospecto del lote que cuente con un email válido extraído recibe un correo ejecutivo B2B personalizado enviado desde **Zoho Mail** (`scripts/send-zoho-outreach.mjs`), redactado en voseo argentino profesional sin palabras gatillo de spam, incluyendo su diagnóstico real de Google Maps (`★ rating`, cantidad de reseñas, hallazgo específico de `Cubeta A/B`), el enlace directo a su preview temporal en `https://preview.nexobow.site/{slug}/`, anclaje de valor concreto (*"evitar apenas 2 sillas vacías por semana cubre el sistema completo"*), aviso de reserva activa por 7 días y contacto directo por respuesta al correo o WhatsApp (`5493489536088`). El módulo utiliza transporte SMTP TLS configurable exclusivamente vía variables de entorno (`ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`, `ZOHO_FROM_NAME`, documentadas en `.env.example`), previene duplicados revisando `email_outreach.status === "sent"` (salvo flag `--force`), soporta `--dry-run`, y persiste el resultado (`sent`, `skipped_no_email`, `dry_run`, `error`, `sent_at`, `message_id`) en `lead.metadata.email_outreach` de Supabase. En paralelo, el endpoint Cloudflare Pages Function `web/functions/api/ping.ts` recibe los pings pasivos (< 1 KB, 0 cookies) emitidos desde los clones compilados (`preview_view`, `theme_switch`, `cta_click`), valida estricto cumplimiento de la Ley 25.326 rechazando cualquier payload con claves sensibles (`ip`, `email`, `phone`, `dni`, `cookie`), localiza al prestador por `slug` en Supabase `public.leads`, actualiza `metadata.telemetry` (`views_count`, `last_event`, `last_viewed_at`, `selected_theme`, `cta_clicks`, `is_hot_lead: true`) y dispara una alerta inmediata **Hot-Lead** al correo de Juanma (vía `RESEND_API_KEY` o notificador configurable) con acceso directo a `/admin/crm` y `wa.me`.

**Blocked by:**
- 50: NexoBow Preview Studio HUD 10x + Fix WhatsApp 5493489536088 en 10 Templates.
- 51: Pipeline Ingesta de 10 Links Google Maps → Calificación, Scraping Email/Web (Cubeta A/B) & Preview Live.

**Status:** done

## Seams Under Test (`/tdd`)

- **Seam 1 (`buildZohoOutreachEmail` & `sendZohoOutreachEmail` en `scripts/send-zoho-outreach.mjs`):**
  - *Qué atrapa:* Generación de asunto, cuerpo HTML y texto plano en español argentino con diagnóstico Maps (`rating`, reseñas, Cubeta A/B), URL `https://preview.nexobow.site/{slug}/` y teléfono `5493489536088`; skip limpio (`skipped_no_email`) sin correo; protección contra reenvío duplicado si `email_outreach.status === "sent"` sin `--force`; soporte `--dry-run`; y registro completo en `metadata.email_outreach` usando transporte SMTP mock.
  - *Qué omite:* Conexión TLS real contra `smtp.zoho.com`.
- **Seam 2 (`onRequestPost` & `onRequestOptions` en `web/functions/api/ping.ts`):**
  - *Qué atrapa:* Cabeceras CORS válidas sin setear cookies; rechazo HTTP `400` ante payloads inválidos o con claves prohibidas por Ley 25.326 (`ip`, `email`, `phone`, `dni`, `cookie`); actualización en cliente Supabase inyectable de `metadata.telemetry` (`views_count`, `cta_clicks`, `selected_theme`, `last_event`, `last_viewed_at`, `is_hot_lead: true`); y disparo de alerta Hot-Lead en primera vista de sesión, `theme_switch` o `cta_click`.
  - *Qué omite:* Ejecución real en Cloudflare Edge runtime o envío real vía Resend API.

## API & Telemetry Contract (`/api/ping`)

```json
{
  "event": "preview_view" | "theme_switch" | "cta_click",
  "slug": "24-centro-odontologico-odonto",
  "timestamp": 1763390000000,
  "meta": { "theme": "Obsidian Gold", "ctaLabel": "Solicitar Turno" },
  "compliance": "Ley 25.326 - 0 Cookies"
}
```

## Acceptance Criteria

- [x] **[RED]** Ampliar `tests/preview-telemetry.test.mjs` y crear `tests/zoho-outreach.test.mjs` cubriendo las 2 costuras (`buildZohoOutreachEmail`/`sendZohoOutreachEmail` con transporte mock y `POST /api/ping` con validación Ley 25.326, mutación `metadata.telemetry` en Supabase mock y alerta Hot-Lead), verificando que fallen antes de implementar.
- [x] **[GREEN]** Implementar `scripts/send-zoho-outreach.mjs` y documentar `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS` y `ZOHO_FROM_NAME` en `.env.example` sin commitear secretos reales.
- [x] **[GREEN]** Implementar `web/functions/api/ping.ts` con soporte CORS (`OPTIONS`/`POST`), validación estricta Ley 25.326, actualización atómica de `metadata.telemetry` en Supabase y notificación Hot-Lead a Juanma, alineando el endpoint por defecto en `scripts/preview-telemetry.mjs` y conectando el disparo de Zoho opcional/controlado desde `scripts/intake-maps-batch.mjs`.
- [x] **[VERIFY]** Ejecutar `node --test tests/zoho-outreach.test.mjs tests/preview-telemetry.test.mjs && npm test && npm --prefix web run build` con 0 errores y 0 etiquetas `<script>` ejecutables en `web/dist/index.html`.
