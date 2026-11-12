# 47: Embudos Flexibles (Presencial / Consulta Paga / Turnero o Secretaría) y CRM Táctico

**What to build:** Todo prestador de salud o derecho (odontología, medicina estética, clínica, dermatología, nutrición o abogacía) recibe una ficha y una landing compilada adaptada a su modalidad real de trabajo (`presencial`, `mixto` u `online`), su régimen de honorarios (`arancelada`, `consultar` o `gratuita`) y su canal de agenda (`whatsapp_secretaria`, `google_calendar` o `turnero_externo`), sin textos forzados de *"consultoría gratuita"*, *"$0 ARS"* ni ubicaciones hardcodeadas (*"Presencial en Recoleta o Virtual HD"*). En paralelo, `/admin/crm` (`CrmView.tsx`) permite gestionar la configuración del embudo en `lead.metadata` sin migraciones destructivas sobre las 29 filas reales de `public.leads`, identificar prospectos entrantes con el badge y filtro `Inbound Web`, dar de alta prospectos manuales (`+ Nuevo Prospecto`), distinguir `Supabase Live (0 registros)` de `Modo Offline (Demo)` y disparar mensajes de WhatsApp en voseo argentino adaptados por rubro y por las 2 objeciones clave (*"Solo atiendo presencial"* y *"No doy consulta gratis"*).

**Blocked by:** None (can start immediately).

**Status:** done

## Seams Under Test (`/tdd`)

- **Seam 1 (`resolveBookingConfig(leadOrFm)` & `resolveLeadMetadata(lead)`):**
  - *Qué atrapa:* Asignación correcta de defaults por rubro (`odontologo`/`clinica`/`estetica`/`dermatologia` → `presencial` + `consultar`; `abogado` → `mixto` + `arancelada`; `nutricionista` → `mixto` + `consultar`), generación de copy de botones CTA (`"Consultar Disponibilidad de Turno"`), microcopy de agenda y mensaje de WhatsApp precargado neutro (`"Hola! Vi su web y quería consultar disponibilidad para agendar una primera consulta."`) sin la palabra `"gratuita"`.
  - *Qué omite:* Renderizado visual en navegador.
- **Seam 2 (Renderizado de Templates por Rubro: `nutricionista`, `clinica`, `dermatologia`, `abogado`):**
  - *Qué atrapa:* Que con `precio_ars: 0` (o `null`) y `tipo_consulta !== "gratuita"` ningún template renderice `"$0 ARS"`, que `dermatologia` reemplace `"Presencial en Recoleta o Virtual HD"` por la ubicación/modalidad del prestador, y que `nutricionista` respete `pricing.cta` y `hero.microcopy_agenda`.
  - *Qué omite:* Estilos CSS computados.
- **Seam 3 (`buildVoseoWhatsAppUrl(lead, mode)` y Estado en `CrmView.tsx`):**
  - *Qué atrapa:* Distinción de sustantivo por rubro (`"tu estudio jurídico"` en abogacía vs `"tu consultorio"` en salud) en modo `"initial"`, generación exacta de respuestas tácticas para `"objecion_presencial"` y `"objecion_arancelada"`, preservación de `0` registros reales con badge `Supabase Live (0 registros)` cuando `error === null`, badge/filtro `Inbound Web` (`metadata.source === "inbound_web"`) y alta manual de prospecto (`+ Nuevo Prospecto`) con cálculo de `max(id) + 1`, `slug` y TTL de +7 días.

## Schema & State Contract (`LeadMetadata`)

```ts
export type LeadModalidad = "presencial" | "mixto" | "online";
export type LeadTipoConsulta = "gratuita" | "arancelada" | "consultar";
export type LeadCanalAgenda = "whatsapp_secretaria" | "google_calendar" | "turnero_externo";

export interface LeadMetadata {
  source?: "inbound_web" | "scout_maps" | "manual_crm" | string;
  email?: string | null;
  maps_url?: string | null;
  modalidad?: LeadModalidad;
  tipo_consulta?: LeadTipoConsulta;
  canal_agenda?: LeadCanalAgenda;
  arancel_consulta_ars?: number | null;
  tier_interes?: "tier_1_starter" | "tier_2_autonomous" | "tier_3_growth";
  [key: string]: any;
}
```

## Acceptance Criteria

- [x] **[RED]** Escribir primero la suite `tests/flexible-booking-funnel.test.mjs` cubriendo las 3 costuras (`resolveBookingConfig`, ausencia de `"$0 ARS"` / `"Presencial en Recoleta o Virtual HD"` / `"gratuita"` forzada en templates, y `buildVoseoWhatsAppUrl` con modos `initial`, `objecion_presencial` y `objecion_arancelada`) y verificar que falle antes de tocar la implementación.
- [x] **[GREEN]** Implementar `resolveBookingConfig(leadOrFm)` en `scripts/generate-client-fiche.mjs` y `scripts/build-client-site.mjs` inyectando `modalidad`, `tipo_consulta`, `canal_agenda`, `arancel_consulta_ars`, textos CTA y mensaje de WhatsApp neutro en las fichas y en `site.json`.
- [x] **[GREEN]** Actualizar `templates/nutricionista/src/components/Hero.astro` y `Footer.astro`, `templates/clinica/src/components/BookingScheduler.astro`, `templates/dermatologia/src/components/MedicalBooking.astro` y `templates/abogado/src/components/ConsultationCta.astro` para eliminar textos hardcodeados de gratuidad, `"$0 ARS"` y `"Presencial en Recoleta o Virtual HD"`.
- [x] **[GREEN]** Actualizar `web/src/components/admin/views/CrmView.tsx` con: (a) separación estricta entre `Supabase Live (0 registros)` y `Modo Offline (Demo)`, (b) badge y filtro rápido `Inbound Web`, (c) modal/drawer `+ Nuevo Prospecto` con ID correlativo y TTL +7d, (d) selectores de `modalidad`, `tipo_consulta` y `canal_agenda` persistidos en `lead.metadata` dentro de `LeadDrawer`, y (e) helper exportado `buildVoseoWhatsAppUrl(lead, mode)` con botones de respuesta rápida a las 2 objeciones comerciales.
- [x] **[VERIFY]** Ejecutar `node --test tests/flexible-booking-funnel.test.mjs && npm test && npm --prefix web run build` con 0 errores y 0 etiquetas `<script>` ejecutables en `web/dist/index.html`.
