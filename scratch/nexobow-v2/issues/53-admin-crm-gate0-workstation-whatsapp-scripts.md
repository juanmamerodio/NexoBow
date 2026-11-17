# 53: Workstation /admin/crm & Cockpit Gate 0 (Email, Zoho, Reseñas, Hot-Lead y WhatsApp/Audio 35s 1-Clic)

**What to build:** El operador gestiona lotes completos de 10 leads desde `/admin/crm` (`CrmView.tsx`) y `/admin` (`CockpitView.tsx` / `cockpit.ts`) con visibilidad inmediata y mensajes listos en 1 clic: las tarjetas Kanban, la tabla de alta densidad y `LeadDrawer` exponen de forma retrocompatible (sin migraciones destructivas ni ruptura de filas previas sin `metadata` completo) el **email extraído**, badge de **Zoho Mail** (`✉️ Zoho Enviado` / `⏳ Pendiente` / `Sin Email`), web original / link de Google Maps con etiqueta **`Cubeta A`** o **`Cubeta B`**, calificación de **Google Maps** (`★ Rating · N reseñas` + textos de reseñas reales en el drawer), score de calificación (`0–100`) y badge en vivo **`🔥 Hot-Lead`** alimentado por `/api/ping` (mostrando vistas y paleta elegida). El CRM suma los filtros rápidos `Con Email`, `Hot-Leads (Vistos)` y `Cubeta A / B`, un modal **`⚡ Lote 10 Links Maps`** para pegar hasta 10 URLs de Google Maps y preparar/registrar lotes en Supabase, y botones de 1 clic **`📋 Copiar Mensaje WA`** y **`💬 Abrir WhatsApp`** respaldados por las funciones puras exportadas `buildVoseoWhatsAppMessage(lead, mode)` y `buildVoseoWhatsAppUrl(lead, mode)` en los 5 modos tácticos orientados al ángulo **"Anti-Silla Vacía & Cero-Secretaria"** (`initial`, `audio_script` de 35 segundos visible en el drawer, `followup_hot` mencionando la visita y paleta elegida tras `/api/ping`, `objecion_presencial` y `objecion_arancelada`). En `/admin` Cockpit se visualizan los **Hot-Leads** recientes junto con las alertas TTL `<48h` preservando la verdad única en Supabase (`0` datos fantasma cuando online) y garantizando `0` JS en la Home pública de `web/`.

**Blocked by:**
- 51: Pipeline Ingesta de 10 Links Google Maps → Calificación, Scraping Email/Web (Cubeta A/B) & Preview Live.
- 52: Outbound Ejecutivo con Zoho Mail + Telemetría Pasiva & Endpoint /api/ping Hot-Lead.

**Status:** done

## Seams Under Test (`/tdd`)

- **Seam 1 (`resolveLeadMetadata` extendido & retrocompatibilidad en `CrmView.tsx` / `cockpit.ts`):**
  - *Qué atrapa:* Exposición limpia de `email`, `website_url`, `website_bucket`, `rating`, `reviews_count`, `reviews_summary`, `qualification`, `email_outreach`, `telemetry` y `audio_script_35s` con fallback seguro sobre leads antiguos que carezcan de esos campos en `metadata`.
  - *Qué omite:* Renderizado visual en navegador.
- **Seam 2 (`buildVoseoWhatsAppMessage(lead, mode)` & `buildVoseoWhatsAppUrl(lead, mode)` en los 5 modos):**
  - *Qué atrapa:* Generación correcta de texto y URL `wa.me` en voseo argentino para `initial` (zona, rating/Maps, link a preview 10x, ángulo `"Anti-Silla Vacía"` y mención sutil al correo de Zoho si `email_outreach.status === "sent"`), `audio_script` (guion de 35s), `followup_hot` (referencia a apertura de demo y `telemetry.selected_theme`), `objecion_presencial` y `objecion_arancelada`.
  - *Qué omite:* Interacción manual de copiado al portapapeles del sistema operativo.
- **Seam 3 (Workstation `/admin/crm`, `/admin` Cockpit & Guardrail `0-JS` en `tests/admin-cockpit-e2e.test.mjs`):**
  - *Qué atrapa:* Presencia de filtros (`Con Email`, `Hot-Leads (Vistos)`, `Cubeta A / B`), modal `⚡ Lote 10 Links Maps`, resumen de Hot-Leads en `fetchDailyCockpitSummary` sin datos fantasma cuando Supabase está online (`error === null`), actualización de `tickets.md` y documentación operativa (`memory.md`, `brain.md`), y verificación estricta de `0` etiquetas `<script>` ejecutables en `web/dist/index.html`.
  - *Qué omite:* Captura de pantalla con Playwright contra producción.

## Acceptance Criteria

- [x] **[RED]** Ampliar `tests/flexible-booking-funnel.test.mjs`, `tests/admin-cockpit.test.mjs` y `tests/admin-cockpit-e2e.test.mjs` para verificar `resolveLeadMetadata` extendido (retrocompatible), los 5 modos de `buildVoseoWhatsAppMessage`/`buildVoseoWhatsAppUrl`, los filtros/modal de Gate 0 en `CrmView.tsx`, los Hot-Leads en `cockpit.ts`/`CockpitView.tsx` sin mocks cuando online, y el guardrail 0-JS en `web/`; confirmar que fallen antes de implementar.
- [x] **[GREEN]** Actualizar `web/src/components/admin/views/CrmView.tsx` exponiendo en Kanban, tabla y `LeadDrawer` email, estado Zoho Mail, web original/Maps con tag `Cubeta A/B`, rating y reseñas reales, score, badge `🔥 Hot-Lead`, filtros rápidos (`Con Email`, `Hot-Leads (Vistos)`, `Cubeta A / B`), modal `⚡ Lote 10 Links Maps`, `buildVoseoWhatsAppMessage`/`buildVoseoWhatsAppUrl` con los 5 modos y botones de 1 clic `Copiar Mensaje WA` / `Abrir WhatsApp` + vista del guion de audio de 35s.
- [x] **[GREEN]** Actualizar `web/src/lib/cockpit.ts` y `web/src/components/admin/views/CockpitView.tsx` para incorporar las vistas Hot-Lead recientes junto a las alertas TTL `<48h` respetando `0` datos fantasma cuando Supabase responde en vivo.
- [x] **[GREEN]** Actualizar `tickets.md`, `memory.md` y `brain.md` documentando el cierre del Frente G (Gate 0) tras completar los tickets `50`–`53`.
- [x] **[VERIFY]** Ejecutar `node --test tests/flexible-booking-funnel.test.mjs tests/admin-cockpit.test.mjs tests/admin-cockpit-e2e.test.mjs && npm test && npm --prefix web run build` con 0 errores y 0 etiquetas `<script>` ejecutables en `web/dist/index.html`.
