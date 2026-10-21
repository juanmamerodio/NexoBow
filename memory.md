# MEMORY.md — Estado del Proyecto & Registro de Errores (NexoBow)

> **Identidad del Documento**: `memory.md` es la memoria operativa persistente del proyecto. Complementa a `brain.md` (conciencia técnica/arquitectura) y a `spec.md` (contrato del MVP). Se lee al iniciar cualquier sesión y se actualiza al cerrar una tarea.
>
> **Regla de oro para el agente**: ANTES de tocar cualquier código, leé `memory.md` + `brain.md` + `spec.md`. Si el trabajo toca identidad visual, leé la sección **Errores Documentados** de abajo: NexoBow ≠ prestador.

---

## 1. Mapa de Identidades (¡NO CONFUNDIR!)

Este repo contiene **DOS páginas web con identidades visuales TOTALMENTE DISTINTAS**:

| | **Página de NexoBow** (la agencia) | **Landing del prestador** (cliente) |
|---|---|---|
| Ubicación | `/web/` | `/templates/{rubro}/` → clon en `/sites/{id}-{nombre}-{apellido}-{rubro}/` |
| Quién es | La propia marca de la agencia (**Juanma Merodio** + alianza **AfterBow**) | El profesional de servicios (nutricionista, psicólogo, abogado, clínica…) |
| Estilo | **Estándar NexoBow Soft-Obsidian** (skill `standard`): `#040607`, `#0B0D12`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`, Outfit Bold, escena 3D CSS, 12 secciones B2B (0 JS) | **Estilo propio del rubro/cliente (+10 arquitecturas REA)** — NUNCA el de NexoBow. Ej: `#01 Editorial Delta` (`#fcf3ed`/`#35221a`/`#e70025`). |
| Fuente de verdad | `web/src/config.ts` (`$189.999 ARS` Setup / `$12.259 ARS finales/mes`) | Ficha en `/clients/{id}-{nombre}-{apellido}-{rubro}.md` → inyectada vía `site.json` |
| Regla | No se genera desde ficha | Se genera desde ficha vía skill `build-client-site` y se edita vía `edit-client-site` |

**Distinción innegociable**: la landing del prestador **NUNCA** debe verse como la página de NexoBow. Cada una tiene su propia dirección estética.

---

## 2. Errores Documentados (Lecciones — NO repetir)

### ERROR-001 — Confundí la página de NexoBow con la del nutricionista (CRÍTICO)
- **Qué pasó**: al crear `templates/nutricionista/`, se partió de `web/` extrayendo los componentes de la página de NexoBow y parametrizándolos con tokens de tema. Resultado: el template del nutricionista heredó la identidad visual de NexoBow.
- **Estado**: CORREGIDO — `web/` utiliza el sistema **Soft-Obsidian** ejecutivo (`#040607`, `#BF40FA`, `#4928C2`, `#5B2A62`, `#E3D9FC`), mientras que `/templates/nutricionista/` usa **Editorial Delta** (`#fcf3ed`, `#35221a`, `#e70025`, Fraunces + Archivo). Sigue prohibido copiar componentes de `web/` a `/templates/`.

### ERROR-002 — Asumí el estilo del template sin que el usuario lo pasara
- **Estado**: RESUELTO — catálogo oficial de **+10 direcciones estéticas por rubro** definido en `spec.md` y `web/src/config.ts` para implementarse progresivamente mediante **REA (Reverse Engineering Architecture)**.

### ERROR-003 — Anclaje en Columna A en lugar de Columna B en Google Sheets
- **Qué pasó**: `sheets-sync.mjs` leía y escribía en `A11`, desplazando las columnas respecto al diseño real de `Prospección NexoBow` donde la Columna A es margen vacío y la **Columna B es `Nº / ID`**.
- **Estado**: CORREGIDO el 2026-10-20 — `sheets-sync.mjs` lee y escribe en `'Prospección NexoBow'!B11:S1000` (`B11`) y genera slugs correlativos `{id}-{nombre}-{apellido}-{rubro}.md`.

### ERROR-004 — Error 522 por subdominios huérfanos vs previews unificadas
- **Qué pasó**: se intentó acceder a `demo-nutri-sofia.nexobow.site` y arrojó Error 522 porque el wildcard `*.nexobow.site` redirige a `nexobow-previews.pages.dev`, pero el proyecto individual `demo-nutri-sofia` no tenía ese subdominio validado en Cloudflare Pages.
- **Estado**: CORREGIDO el 2026-10-20 — El pipeline unificado ahora sincroniza automáticamente `sites/{slug}/dist` a `dist-previews/{slug}/` en cada build (`build-client-site.mjs` y `deploy-cloudflare.mjs`). Todas las demos se sirven de forma consistente y confiable en `https://preview.nexobow.site/{slug}/`.

---

## 3. Estado Actual del Proyecto (al 2026-10-20)

### 3.1 Lo que existe y está verificado
- **`web/` (Flagship B2B Soft-Obsidian — 12 Secciones, 0 JS)**:
  - Paleta Soft-Obsidian (`#040607`, `#0B0D12`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`) sin rastro de `#DB1FFF`.
  - 12 secciones activas: `Header`, `Hero` (escena 3D CSS), `BeforeAfter`, `InteractiveFunnel` (tabs CSS `:checked`, 0 JS), `TemplateCatalog` (+10 estilos REA), `RoiCalculator` (radio CSS `:checked`, 0 JS), `CaseStudies` (Lic. Sofía Ramos + benchmark WordPress vs Astro SSG), `Pricing` (3 planes: Core `$189.999 ARS` + `$12.259 ARS/mes`, Clínica Pro `$329.999 ARS` + `$19.899 ARS/mes`, y Full Growth con 1 mes de contenido audiovisual por [**AfterBow**](https://www.afterbow.com), más 3 Bonos Hormozi y banner de **expiración de demos a los 7 días**), `CreateBowSystem` (*"CREÁ TU SISTEMA BOW"* vía API para Fase 2), `Founder` (**Juanma Merodio** con links a `https://juanmamerodio.github.io/cv` y `https://www.afterbow.com`), `Faq` (acordeones `<details>`, Ley 25.326), `FinalCta` y `Footer`.
- **Sincronización Google Sheets (`Col B = ID`) y Motor de 7 Días**:
  - `scripts/sheets-sync.mjs`: rango `'Prospección NexoBow'!B11:S1000` y función `buildCorrelativeSlug({ id, displayName, nicho })` (`22-alejandra-martinez-nutri`).
  - `scripts/generate-client-fiche.mjs`: inyecta `sheet_id`, `lead_status`, `created_at`, `last_activity_at` y `expires_at` (+7 días).
  - `scripts/lead-lifecycle.mjs`: renueva +7d si cambia el estado en el Sheet, emite alertas con link de WhatsApp de urgencia en días 5–6 (<48hs) y purga automáticamente en `>=7d` o `"Descartado"` (protegiendo `_ficha-template.md` y `demo-*`).
  - `scripts/continuous-improvement.mjs`: analiza KPIs (`A1:S10`) y prospectos (`B11:S1000`) por nicho.
- **Biblioteca Completa de Agent Skills (`/.agents/skills/`)**:
  - `standard`, `scout-lead`, `generate-client-fiche`, `build-client-site`, `edit-client-site` (`/editar-web-cliente`), `lead-lifecycle` (`/seguimiento-leads`), `flow-advisor` (`/next-step` / `/ask-matt`), `audit-code`, `deploy-cloudflare`, `lead-to-live`.
- **Backlog Fase 2 (Optimización de Tokens por REA)**:
  - Construcción progresiva de los 9 templates adicionales del catálogo (`02. Clinical Pure`, `03. Warm Empathy`, `04. Obsidian Authority`, `05. Kinetic Performance`, `06. Minimalist Smile`, `07. Botanical Balance`, `08. Swiss Advisory`, `09. Velvet Aesthetics`, `10. Executive Clinic`) mediante ingeniería inversa (REA) y endpoint API para `"CREÁ TU SISTEMA BOW"`.

---

## 4. Registro Cronológico
- [2026-10-14] NexoBow (`web/`) y prestadores (`templates/`) son identidades visuales distintas (`ERROR-001`).
- [2026-10-14] Dirección estética del template #01 (`nutricionista`): Editorial Delta (`deltacafes.com`).
- [2026-10-19] Arquitectura simplificada a prospección nativa In-Conversation con Antigravity + Google Sheets directo.
- [2026-10-20] Integración Serper Dev (Places Scraper) + rebranding `web/` a Soft-Obsidian (12 secciones, 0 JS, `$189.999 ARS` / `$12.259 ARS`, AfterBow, Founder CV, `"CREÁ TU SISTEMA BOW"`) + alineación Google Sheets a Columna B (`B11:S1000`), slugs correlativos `{id}-{nombre}-{apellido}-{rubro}.md`, motor TTL de 7 días y skills `edit-client-site`, `lead-lifecycle` y `flow-advisor`.
- [2026-10-21] Purga integral de prospectos y demos en `clients/`, `sites/` y `dist-previews/` (dejando solo `_ficha-template.md`). Fijado el principio de inmutabilidad de templates por versión (`template_version`) desacoplado de mejoras de templates base, arquitectura de previews directa en `preview.nexobow.site/{slug}` y plan senior de orquestación end-to-end con branding y copy dinámico.
- [2026-10-21] Implementación TDD de `spec.md`: `build-client-site.mjs` con bloqueo `.template-lock.json` (`template_version: "nutricionista@1.0.0"`, flag `--upgrade-template`), `generate-client-fiche.mjs` con matriz rotativa de 4 ángulos de dolor Hormozi (`HORMOZI_PAIN_ANGLES`) y branding contextual (`selectContextualBranding`), `sheets-sync.mjs` con `getNextSheetId` + `createSheetsAdapter` sobre `preview.nexobow.site/{slug}`, aislamiento de `cacheDir` en Astro para builds concurrentes y suite completa `npm test` (26/26 pasando).

