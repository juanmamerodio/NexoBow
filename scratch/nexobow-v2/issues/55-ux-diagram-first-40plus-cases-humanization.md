# 55: UX "Diagram-First" para +40 Años, Capturas Reales de Casos de Éxito & Humanización Total (Cero "Silla Vacía")

**What to build:** Un profesional mayor de 40 años que visita `nexobow.site` comprende en menos de 5 segundos cómo funciona el sistema sin leer bloques densos ni jerga técnica: `Hero.astro`, `BeforeAfter.astro`, `InteractiveFunnel.astro` y `RoiCalculator.astro` adoptan un diseño **Diagram-First** con esquemas visuales SVG/CSS `0 JS` de máximo 3–4 nodos con flechas y conectores claros, cuerpo mínimo `16px`–`18px`, contraste Soft-Obsidian alto y barra comparativa visual de horas recuperadas. En `CaseStudies.astro` cada uno de los 4 casos de éxito reales (`AfterBow`, `Embudo para Infoproducto`, `Esencia Técnica` y `Lic. Sofía Ramos`) exhibe su captura real del *Hero* en formato `16:9` optimizada en WebP (`1440x900`, `< 120 KB`, `loading="lazy"`, `decoding="async"`, dimensiones explícitas para `CLS = 0`) alojada localmente en `web/public/images/cases/`. Al mismo tiempo, se erradica el **100%** del vocabulario artificial de IA o tono "vende humos" (`"silla vacía"`, `"sillas vacías"`, `"Anti-Silla Vacía"`, `"Cero-Secretaria"`, `"estallar tu agenda"`, `"revolucionario"`, `"secretos"`, `"disruptivo"`) en toda la web pública, los 10 `templates`, los scripts de prospección/outreach/fichas, el CRM `/admin/crm` (`CrmView.tsx`, `cockpit.ts`) y los tests, reemplazándolo por lenguaje cercano y serio de profesional argentino (*"Orden de consultas y turnos confirmados"*, *"Recordatorios automáticos 24h/2h con lista de espera"*, *"con solo recuperar 2 consultas por mes que hoy se pierden sin respuesta, el sistema ya se paga solo"*).

**Puntos cubiertos de `spec-final-polish.md`:** Puntos **3**, **8** y **13** (Pilar 2 completo) + refuerzo de copy SEO natural para profesionales +40 (Punto **20**).

**Blocked by:**
- 54: Marco Legal (`/terminos/`, `/privacidad/`), Banner de Cookies + GA4 Condicional, SEO de Intención Real, Search Console & Google Business Profile

**Blocks:**
- 56: Inbound Preview End-to-End, Checkbox T&C Sin Marcar, Zoho Mail + Resend, Enlace de Baja HMAC & ElevenLabs MCP Starter
- 57: `robots.txt`, Blindaje Cibernético Perimetral & Auditoría Final E2E (Cierre Frente H)

**Status:** done

## Archivos a Crear o Modificar

### Crear
- `web/public/images/cases/afterbow-hero.webp` (captura real `1440x900` en WebP `< 120 KB` de `https://www.afterbow.com`)
- `web/public/images/cases/infoproducto-hero.webp` (captura real `1440x900` en WebP `< 120 KB` de `https://juanmamerodio.github.io`)
- `web/public/images/cases/esenciatecnica-hero.webp` (captura real `1440x900` en WebP `< 120 KB` de `https://esenciatecnica.vercel.app`)
- `web/public/images/cases/sofia-ramos-hero.webp` (captura real `1440x900` en WebP `< 120 KB` de la demo `demo-nutri-sofia` / `templates/nutricionista`)
- `tests/copy-humanization.test.mjs` (suite TDD para Seam 2: 0 ocurrencias de frases prohibidas en `web/src/`, los 10 `templates/`, `scripts/` y `tests/`, validación de diagramas SVG 0-JS en `Hero`/`BeforeAfter`/`InteractiveFunnel`/`RoiCalculator` y validación de las 4 capturas WebP `< 120 KB` con atributos `alt`/`width`/`height`/`loading="lazy"` en `CaseStudies`)

### Modificar
- `web/src/components/Hero.astro` (diagrama visual SVG/CSS 0-JS de 4 etapas con flechas: *1. Te buscan en Google/IG → 2. Ven tu página clara → 3. Eligen horario o escriben decididos → 4. Vos solo atendés*; tipografía cómoda `16px–18px` sin tecnicismos en titulares)
- `web/src/components/BeforeAfter.astro` (reducir cada columna a 3 pasos gráficos cortos con conectores SVG eliminando párrafos densos)
- `web/src/components/InteractiveFunnel.astro` (convertir los 4 paneles `:checked` 0-JS en infografías de 3 nodos con iconos y conectores SVG)
- `web/src/components/RoiCalculator.astro` (simplificar opciones y sumar barra visual comparativa *"Horas que recuperás por semana"* frente al costo único del sistema)
- `web/src/components/CaseStudies.astro` y `web/src/config.ts` (agregar `screenshot` / `screenshotAlt` a `SITE.caseStudies` y renderizar capturas `16:9` `aspect-video` clicables con `loading="lazy"`, `decoding="async"`, `width`/`height` explícitos en las 3 tarjetas principales y la tarjeta destacada de Lic. Sofía Ramos)
- `web/src/components/Pricing.astro`, `web/src/components/CreateBowSystem.astro`, `web/src/components/Founder.astro`, `web/src/components/Faq.astro`, `web/src/components/FinalCta.astro` (humanizar copy: eliminar `"estallar tu agenda"` y jerga técnica innecesaria en secciones comerciales principales)
- Los 10 `templates/abogado/src/components/ThemeSwitcher.astro`, `templates/clinica/src/components/ThemeSwitcher.astro`, `templates/construccion/src/components/ThemeSwitcher.astro`, `templates/corporativo/src/components/ThemeSwitcher.astro`, `templates/deportes/src/components/ThemeSwitcher.astro`, `templates/dermatologia/src/components/ThemeSwitcher.astro`, `templates/nutricionista/src/components/ThemeSwitcher.astro`, `templates/producto/src/components/ThemeSwitcher.astro`, `templates/propiedades/src/components/ThemeSwitcher.astro`, `templates/tech/src/components/ThemeSwitcher.astro` (erradicar `"Protocolo Anti-Silla Vacía"` y reemplazar por `"Recordatorios automáticos 24h/2h con lista de espera"` / `"Orden de consultas y turnos confirmados"`)
- `scripts/send-zoho-outreach.mjs`, `scripts/intake-maps-batch.mjs`, `scripts/generate-client-fiche.mjs` (erradicar `"Anti-Silla Vacía"`, `"Cero-Secretaria"`, `"silla vacía"` en `pain_angle`, asuntos/cuerpos de email, mensajes WhatsApp y `audio_script_35s`)
- `web/src/components/admin/views/CrmView.tsx` y `web/src/lib/cockpit.ts` (humanizar los 5 modos de `buildVoseoWhatsAppMessage` — `initial`, `audio_script`, `followup_hot`, `objecion_presencial`, `objecion_arancelada` — y la etiqueta del drawer)
- `tests/intake-maps-batch.test.mjs`, `tests/theme-switcher.test.mjs`, `tests/zoho-outreach.test.mjs`, `tests/flexible-booking-funnel.test.mjs`, `tests/web-redesign.test.mjs` (actualizar aserciones legacy que exigían `"Anti-Silla Vacía"` / `"Cero-Secretaria"` al nuevo copy humanizado)

## Seams Under Test (`/tdd`)

- **Seam 2 (`Humanized Copy & Diagram-First +40 UX Seam` + capturas WebP de Seam 1 en `tests/copy-humanization.test.mjs`):**
  - *Qué atrapa:* Escaneo determinista de `web/src/`, los 10 `templates/`, `scripts/` y `tests/` garantizando **0 ocurrencias** de `"silla vacía"`, `"sillas vacías"`, `"Anti-Silla Vacía"`, `"Cero-Secretaria"`, `"estallar tu agenda"`, `"revolucionario"` y `"disruptivo"`; presencia de diagramas SVG visuales y controles `0 JS` en `web/dist/index.html` (`Hero`, `BeforeAfter`, `InteractiveFunnel`, `RoiCalculator`); y existencia, tamaño (`< 120 KB`), formato WebP y atributos accesibles (`alt`, `width`, `height`, `loading="lazy"`) de las 4 capturas de `CaseStudies`.
  - *Qué omite:* Percepción subjetiva de legibilidad en un usuario real en dispositivo móvil o captura en vivo contra sitios externos si se encuentran offline al momento de generar los archivos estáticos.

## Acceptance Criteria

- [x] **[RED]** Crear `tests/copy-humanization.test.mjs` (verificando 0 ocurrencias de frases prohibidas en `web/src/`, 10 `templates/`, `scripts/` y `tests/`, diagramas SVG en `web/dist/index.html` y 4 capturas WebP `< 120 KB` en `CaseStudies`) y actualizar aserciones legacy en las suites afectadas; confirmar fallos antes de editar.
- [x] **[GREEN]** Capturar/generar y optimizar en `web/public/images/cases/` las 4 capturas WebP (`1440x900`, `< 120 KB` c/u): `afterbow-hero.webp`, `infoproducto-hero.webp`, `esenciatecnica-hero.webp` y `sofia-ramos-hero.webp`, e integrarlas en `web/src/config.ts` y `web/src/components/CaseStudies.astro` con `aspect-video`, `loading="lazy"`, `decoding="async"` y dimensiones fijas (`CLS = 0`).
- [x] **[GREEN]** Rediseñar `Hero.astro`, `BeforeAfter.astro`, `InteractiveFunnel.astro` y `RoiCalculator.astro` bajo el principio "Diagram-First +40" con diagramas SVG/CSS 0-JS de 3–4 nodos, reducir densidad de texto y asegurar tipografía cómoda (`16px–18px`) sin jerga técnica en titulares comerciales.
- [x] **[GREEN]** Erradicar 100% `"silla vacía"`, `"sillas vacías"`, `"Anti-Silla Vacía"`, `"Cero-Secretaria"`, `"estallar tu agenda"`, `"revolucionario"`, `"secretos"` y `"disruptivo"` en `web/src/`, los 10 `templates/*/src/components/ThemeSwitcher.astro`, `scripts/send-zoho-outreach.mjs`, `scripts/intake-maps-batch.mjs`, `scripts/generate-client-fiche.mjs`, `web/src/components/admin/views/CrmView.tsx`, `web/src/lib/cockpit.ts` y suites de test.
- [x] **[VERIFY]** Ejecutar el comando de validación exacto más auditoría visual `.agents/skills/impeccable/scripts/impeccable detect web/dist/index.html` con 0 hallazgos críticos.

## Comando de Validación Exacto

```bash
node --test tests/copy-humanization.test.mjs tests/web-redesign.test.mjs tests/theme-switcher.test.mjs tests/intake-maps-batch.test.mjs tests/zoho-outreach.test.mjs tests/flexible-booking-funnel.test.mjs && npm --prefix web run build && .agents/skills/impeccable/scripts/impeccable detect web/dist/index.html
```
