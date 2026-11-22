# 54: Marco Legal (/terminos/, /privacidad/), Banner de Cookies + GA4 Condicional, SEO de Intención Real, Search Console & Google Business Profile

**What to build:** Toda persona profesional (+40 años) que visita `nexobow.site` accede desde el pie de página, los planes y las preguntas frecuentes a páginas legales claras en estándar Soft-Obsidian y `0 JS` de aplicación: `/terminos/` (objeto del servicio, alcance de preview gratuita de 7 días, propiedad intelectual de código base vs. contenidos del **prestador**, jurisdicción Argentina CABA/PBA, limitación de responsabilidad, `#reembolsos` diferenciando Etapa 0 de 7 días, Garantía Técnica de entrega en 72h hábiles y carga `<1s` dentro de 14 días corridos al 100%, desistimiento ≤14 días previo a salida a producción deduciendo solo gastos directos no reembolsables de terceros como dominio transferido al profesional, y servicios aprobados/abonos mensuales sin prorrateo retroactivo; y `#debito-automatico` detallando Plan Starter `$0/mes` Año 1 con aviso al mes 11 con 30 días de anticipación, débito días 1–5 en Plan Autonomous tras 30 días de prueba, aviso previo de ajuste IPC ≥15 días corridos, hasta 3 reintentos en 10 días de gracia sin borrar datos/dominio, y baja sin permanencia con 48h hábiles de anticipación) y `/privacidad/` (Ley 25.326: responsable NexoBow / Juanma Merodio, categorías de datos, finalidad, base legal, derechos ARCO sin costo ante el responsable y ante la AAIP, tabla `#retencion` con 7 días para previews no contratadas, 90 días para fichas/inbound sin avance, conservación indefinida únicamente del identificador mínimo de supresión `unsubscribed: true`, vigencia + 30 días post-baja para clientes activos y 10 años para comprobantes fiscales Código Civil y Comercial / ARCA-AFIP, y sección `#cookies`). Al ingresar al sitio, `CookieConsentBanner.astro` aplica Google Consent Mode v2 por defecto en `'denied'` manteniendo **0 cookies analíticas y 0 descarga de `gtag.js`** hasta que el usuario haga clic explícito en **`Aceptar analítica`** (frente a **`Solo esenciales`** y enlace `"Configurar cookies"` en `Footer`), excluyendo explícitamente `/admin/*` y manteniendo intacto el principio de `0` scripts ejecutables de negocio en la home pública. En paralelo, `Layout.astro` garantiza la marca **`"NexoBow"`** en todo `<title>` y `og:title`, agrega `og:site_name="NexoBow"`, `<link rel="canonical">` y `<meta name="google-site-verification" ... />` condicional, mientras `web/public/sitemap.xml`, `index.astro` y `Faq.astro` incorporan JSON-LD (`ProfessionalService` con `areaServed: "Argentina"` y `FAQPage`) optimizado para búsquedas reales +40 (consultorios médicos, odontólogos, nutricionistas, psicólogos, estudios jurídicos y turnos por WhatsApp), respaldado por la guía operativa de alta de Google Business Profile como *Empresa de Área de Servicio*.

**Puntos cubiertos de `spec-final-polish.md`:** Puntos **1 (parte legal `/terminos/`)**, **2**, **4**, **5**, **6**, **7**, **10**, **15**, **16**, **17** y **20** (Pilares 1 y 4).

**Blocked by:** None (can start immediately; Frente G `#50`–`#53` completados).

**Blocks:**
- 55: UX "Diagram-First" para +40 Años, Capturas Reales de Casos de Éxito & Humanización Total (Cero "Silla Vacía")
- 56: Inbound Preview End-to-End, Checkbox T&C Sin Marcar, Zoho Mail + Resend, Enlace de Baja HMAC & ElevenLabs MCP Starter
- 57: `robots.txt`, Blindaje Cibernético Perimetral & Auditoría Final E2E (Cierre Frente H)

**Status:** done

## Archivos a Crear o Modificar

### Crear
- `web/src/pages/terminos.astro` (Términos y Condiciones + secciones `#reembolsos` y `#debito-automatico`, Soft-Obsidian, `0 JS`)
- `web/src/pages/privacidad.astro` (Política de Privacidad Ley 25.326 + Derechos ARCO + tabla `#retencion` + `#cookies`, Soft-Obsidian, `0 JS`)
- `web/src/components/CookieConsentBanner.astro` (Consent Mode v2 `'denied'` por defecto, `localStorage("nexobow_cookie_consent")`, inyección condicional de GA4 con `anonymize_ip: true` y eventos `generate_lead`, `contact_whatsapp`, `view_demo`, excluido de `/admin/*`, marcado con `data-nexobow-consent-loader="true"`)
- `web/public/sitemap.xml` (exclusivamente `/`, `/terminos/`, `/privacidad/`; excluye `/admin/`, `/solicitud-enviada/`, `/baja-email/`)
- `docs/google-business-profile-checklist.md` (evaluación de necesidad, alta como *Service-Area Business* ocultando domicilio particular, zonas `CABA`, `Zona Norte`, `Campana`, `Zárate`, `Argentina`, categoría, verificación por video y link de reseñas)
- `tests/legal-seo-cookies.test.mjs` (suite TDD para Seam 1)

### Modificar
- `web/src/layouts/Layout.astro` (normalizador que asegura `"NexoBow"` en `<title>` y `og:title`, `og:site_name="NexoBow"`, `<link rel="canonical">`, meta condicional `google-site-verification` desde `PUBLIC_GOOGLE_SITE_VERIFICATION`, props `noindex?: boolean` y `jsonLd?: Record<string, unknown>[]`, e inclusión de `CookieConsentBanner.astro`)
- `web/src/pages/index.astro` (título/description con intención real +40 y JSON-LD `ProfessionalService` + `FAQPage`)
- `web/src/pages/solicitud-enviada.astro` (`<title>` con `"NexoBow"` y `noindex: true` vía `Layout.astro`)
- `web/src/components/Footer.astro` (enlaces a `/terminos/`, `/privacidad/`, `/terminos/#reembolsos`, `/terminos/#debito-automatico` y botón/enlace `"Configurar cookies"`)
- `web/src/components/Pricing.astro` (referenciar `/terminos/#reembolsos` y `/terminos/#debito-automatico`)
- `web/src/components/Faq.astro` (incorporar respuestas y keywords de búsqueda real +40 de los 3 clústeres + enlaces a políticas)
- `.env.example` (documentar `PUBLIC_GA_MEASUREMENT_ID` y `PUBLIC_GOOGLE_SITE_VERIFICATION` sin secretos reales)
- `scripts/audit-site.mjs`, `tests/web-redesign.test.mjs`, `tests/admin-cockpit-e2e.test.mjs` (actualizar auditoría de `web/` para distinguir entre `0` scripts de lógica de negocio / `0` trackers precargados antes del consentimiento y el cargador aislado `data-nexobow-consent-loader="true"`)

## Seams Under Test (`/tdd`)

- **Seam 1 (`Legal Pages, SEO, Security & Cookie Consent Seam` — parte legal, SEO, cookies y GA4 en `tests/legal-seo-cookies.test.mjs`, `tests/web-redesign.test.mjs` y `scripts/audit-site.mjs`):**
  - *Qué atrapa:* Compilación exitosa de `/terminos/`, `/privacidad/` y `sitemap.xml` en `web/dist/`; presencia de anclas y contenido normativo (`#reembolsos`, `#debito-automatico`, `#retencion`, Ley 25.326, derechos ARCO); presencia garantizada de `"NexoBow"` en `<title>` y `og:title` de todas las páginas públicas; presencia de `<link rel="canonical">`, JSON-LD `ProfessionalService` y `FAQPage` con keywords +40; presencia de `CookieConsentBanner` con Consent Mode v2 en `'denied'` por defecto y sin descarga de `googletagmanager.com/gtag/js` en el HTML estático; y verificación de `0` scripts ejecutables de lógica comercial en `web/dist/index.html` vía `auditHtmlDocument(..., { mode: "web" })`.
  - *Qué omite:* Disparo real de hits HTTP hacia Google Analytics 4 en navegador, validación en vivo de Google Search Console y creación manual de ficha en Google Business Profile.

## Acceptance Criteria

- [x] **[RED]** Crear `tests/legal-seo-cookies.test.mjs` verificando compilación de `/terminos/`, `/privacidad/`, `sitemap.xml`, presencia de `"NexoBow"` en todos los `<title>`, JSON-LD (`ProfessionalService` + `FAQPage`), Consent Mode v2 por defecto `'denied'` sin `gtag.js` precargado, y actualización del auditor `audit-site.mjs` manteniendo 0 JS de negocio; confirmar que falla antes de implementar.
- [x] **[GREEN]** Implementar `web/src/pages/terminos.astro` (incluyendo `#reembolsos` y `#debito-automatico` con todas las reglas del spec) y `web/src/pages/privacidad.astro` (Ley 25.326, derechos ARCO, tabla `#retencion` de 7d / 90d / supresión indefinida mínima / 30d post-baja / 10 años fiscal y `#cookies`).
- [x] **[GREEN]** Implementar `web/src/components/CookieConsentBanner.astro` (Consent Mode v2 `'denied'` inicial, opciones claras `Aceptar analítica` y `Solo esenciales`, `localStorage("nexobow_cookie_consent")`, inyección condicional de GA4 con `anonymize_ip: true` y exclusión en `/admin/*`) e integrarlo en `web/src/layouts/Layout.astro`, junto con enlaces en `Footer.astro`, `Pricing.astro` y `Faq.astro`.
- [x] **[GREEN]** Estandarizar en `Layout.astro` el sufijo/prefijo `"NexoBow"` para `<title>` y `og:title`, `og:site_name="NexoBow"`, `<link rel="canonical">`, meta condicional `google-site-verification`, prop `noindex`, e inyectar en `index.astro` los esquemas JSON-LD (`ProfessionalService` + `FAQPage`) con keywords de intención real +40 y crear `web/public/sitemap.xml`, `.env.example` actualizado y `docs/google-business-profile-checklist.md`.
- [x] **[GREEN]** Actualizar `scripts/audit-site.mjs`, `tests/web-redesign.test.mjs` y `tests/admin-cockpit-e2e.test.mjs` para distinguir explícitamente el cargador aislado de consentimiento/GA4 (`data-nexobow-consent-loader="true"`) preservando 0 JS de aplicación y 0 cookies/trackers precargados.
- [x] **[VERIFY]** Ejecutar el comando de validación exacto con 0 errores.

## Comando de Validación Exacto

```bash
node --test tests/legal-seo-cookies.test.mjs tests/web-redesign.test.mjs tests/admin-cockpit-e2e.test.mjs && npm --prefix web run build && node scripts/audit-site.mjs web
```
