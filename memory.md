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

### ERROR-005 — Confusión de "Template" con Previews/Demos y forzado universal de Delta Cafés (CRÍTICO)
- **Qué pasó**: Se tomó la estructura de 10 secciones del primer template (`templates/nutricionista/`, basado en Delta Cafés) y se asumió que todos los futuros templates debían ser esa misma estructura con distinto color y texto de la web de referencia inyectado en el template.
- **Estado**: CORREGIDO el 2026-10-22 — 
  - **Template (`/templates/{id}/`):** Es una **web ENTERA** duplicada e inspirada en un sitio de referencia real mediante REA (estilo, geometría espacial, navegación, animaciones, componentes únicos, objetos y 3D). Cada template es un desarrollo autónomo con su propia estructura; **NO comparte los componentes ni el layout de Delta Cafés**.
  - **Copywriting:** El texto (dolores Hormozi, bio, oferta, garantía) es lo que la IA redacta para el cliente final y se inyecta en los slots del template. El texto de la web de referencia NO se traspasa al template.
  - **Demo:** Compilación de muestra de un template para showroom.
  - **Preview:** Landing compilada personalizada para un prospecto específico (`https://preview.nexobow.site/{slug}/`).
  - **Delta Cafés:** Es única y exclusivamente la web de referencia del template de nutricionista. Queda erradicado como molde obligatorio del sistema.

---

## 3. Estado Actual del Proyecto (al 2026-10-21)

### 3.1 Lo que existe y está verificado
- **`web/` (Flagship B2B Soft-Obsidian — 12 Secciones, 0 JS estricto)**:
  - Paleta Soft-Obsidian (`#040607`, `#0B0D12`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`) sin rastro de `#DB1FFF`.
  - 12 secciones activas: `Header`, `Hero` (escena 3D CSS), `BeforeAfter`, `InteractiveFunnel` (tabs CSS `:checked`, 0 JS), `TemplateCatalog` (+10 estilos REA), `RoiCalculator` (radio CSS `:checked`, 0 JS), `CaseStudies` (Lic. Sofía Ramos + benchmark WordPress vs Astro SSG), `Pricing` (3 planes: Core `$189.999 ARS` + `$12.259 ARS/mes`, Clínica Pro `$329.999 ARS` + `$19.899 ARS/mes`, y Full Growth con 1 mes de contenido audiovisual por [**AfterBow**](https://www.afterbow.com), más 3 Bonos Hormozi y banner de **expiración de demos a los 7 días**), `CreateBowSystem` (*"CREÁ TU SISTEMA BOW"* vía API para Fase 2), `Founder` (**Juanma Merodio** con links a `https://juanmamerodio.github.io/cv` y `https://www.afterbow.com`), `Faq` (acordeones `<details>`, Ley 25.326), `FinalCta` y `Footer`.
- **Sincronización Google Sheets (`LeadStore`, `Col B = ID`, `Col G = Web Demo URL`) y Motor de 7 Días**:
  - `scripts/sheets-sync.mjs`: interfaz `LeadStore` (`defaultLeadStore`, `createInMemoryLeadStore`, `createSheetsAdapter`) que encapsula el rango `'Prospección NexoBow'!B11:S1000`, cálculo de ID `max(Col B) + 1` con reintento ante colisión, escape de comillas y escritura de `https://preview.nexobow.site/{slug}/` en **Columna G** (`Web Demo URL`) sin modificar **Columna L** (`Último Contacto`). Ningún script fuera de `sheets-sync.mjs` invoca el binario `gsheets` directamente.
  - `scripts/generate-client-fiche.mjs`: rotación determinista por slug de los 4 ángulos de dolor Hormozi (`HORMOZI_PAIN_ANGLES`), mapa de paletas/tipografías por `rubro` (`RUBRO_BRANDING_MAP`) con variación según `rating`/`userRatingCount`, y metadatos `sheet_id`, `lead_status`, `created_at`, `last_activity_at` y `expires_at` (+7 días).
  - `scripts/build-client-site.mjs`: versionado inmutable por tags git (`template/{rubro}@x.y.z`, tag inicial `template/nutricionista@1.0.0`), bloqueo `.template-lock.json`, flag `--upgrade-template` y actualización automática de Columna G al finalizar el build.
  - `scripts/audit-site.mjs`: política de JS diferenciada (`0 JS` ejecutable estricto en `web/`; presupuesto de JS propio `<= 35 KB` con reporte de peso y bloqueo de scripts externos de terceros no declarados en `/sites/`).
  - `scripts/lead-lifecycle.mjs` y `scripts/continuous-improvement.mjs`: operan sobre `LeadStore` para renovar leads activos (+7d), emitir alertas de urgencia en días 5–6 (<48hs), purgar demos vencidas (`>=7d` o `"Descartado"`) y analizar KPIs (`A1:S10`).
- **Biblioteca Completa de Agent Skills (`/.agents/skills/`)**:
  - `standard`, `scout-lead`, `generate-client-fiche`, `build-client-site`, `edit-client-site` (`/editar-web-cliente`), `lead-lifecycle` (`/seguimiento-leads`), `flow-advisor` (`/next-step` / `/ask-matt`), `audit-code`, `deploy-cloudflare`, `lead-to-live`.
- **Backlog Fase 2 (9 Templates Adicionales por REA — Pendiente de Webs de Referencia del Usuario)**:
  - Los 9 templates adicionales del catálogo (`02. Clinical Pure`, `03. Warm Empathy`, `04. Obsidian Authority`, `05. Kinetic Performance`, `06. Minimalist Smile`, `07. Botanical Balance`, `08. Swiss Advisory`, `09. Velvet Aesthetics`, `10. Executive Clinic`) están **pendientes de que el usuario elija y proporcione las URLs de las webs de referencia** para ejecutar ingeniería inversa (REA) bajo el gate Ask-First de diseño, junto con el endpoint API para `"CREÁ TU SISTEMA BOW"`.

---

## 4. Registro Cronológico
- [2026-10-14] NexoBow (`web/`) y prestadores (`templates/`) son identidades visuales distintas (`ERROR-001`).
- [2026-10-14] Dirección estética del template #01 (`nutricionista`): Editorial Delta (`deltacafes.com`).
- [2026-10-19] Arquitectura simplificada a prospección nativa In-Conversation con Antigravity + Google Sheets directo.
- [2026-10-20] Integración Serper Dev (Places Scraper) + rebranding `web/` a Soft-Obsidian (12 secciones, 0 JS, `$189.999 ARS` / `$12.259 ARS`, AfterBow, Founder CV, `"CREÁ TU SISTEMA BOW"`) + alineación Google Sheets a Columna B (`B11:S1000`), slugs correlativos `{id}-{nombre}-{apellido}-{rubro}.md`, motor TTL de 7 días y skills `edit-client-site`, `lead-lifecycle` y `flow-advisor`.
- [2026-10-21] Purga integral de prospectos y demos en `clients/`, `sites/` y `dist-previews/` (dejando solo `_ficha-template.md`). Fijado el principio de inmutabilidad de templates por versión (`template_version`) desacoplado de mejoras de templates base, arquitectura de previews directa en `https://preview.nexobow.site/{slug}/` y plan senior de orquestación end-to-end con branding y copy dinámico.
- [2026-10-21] Cierre de Tickets `07`–`15` (`.scratch/nexobow-v2/issues/`): dominio unificado `https://preview.nexobow.site/{slug}/`, seam `LeadStore` (`defaultLeadStore`, `createInMemoryLeadStore`, `createSheetsAdapter`), escritura automática en Columna G sin tocar Columna L al compilar sitios, versionado por tags git (`template/nutricionista@1.0.0`), auditoría con presupuesto JS (`<= 35 KB` en `/sites/` vs `0 JS` en `web/`), índice en `tickets.md` y backlog REA de 9 templates documentado como pendiente de que el usuario elija las webs de referencia.
- [2026-10-21] Cierre de Ticket `16` (`.scratch/nexobow-v2/issues/16-rea-inspect-extractor.md`): implementado `scripts/rea-inspect.mjs` (extracción 60-30-10, mapeo de tipografías comerciales a Google Fonts abiertas, bloque `tema` para `site.json` y fallback tolerante a fallos de red/HTML malformado) con 5 pruebas unitarias TDD (`tests/rea-inspect.test.mjs`) que elevan la suite a 32 tests 100% verdes.
- [2026-10-21] Implementación completa de `SPEC-ARCHETYPES-SWITCHER.md` (AC-01 a AC-04): Desacoplamiento híbrido de arquetipos visuales (`template_archetype: editorial-classic` y tag git alias `template/editorial-classic@1.0.0`), inyección de `paletas_alternativas` multivariantes en la ficha (`generateAlternativePalettes`), componente flotante `ThemeSwitcher.astro` con persistencia en `localStorage` y CTA directo a WhatsApp, suite TDD (`tests/archetype-decoupling.test.mjs` y `tests/theme-switcher.test.mjs`), suite de 37 tests 100% pasando en verde.
- [2026-10-21] Implementación de Template #02 REA (`https://www.kuemmerlein.de/`):
  - Creado `templates/abogado/` bajo arquetipo `obsidian-authority` (Dark Executive `#090D16`/`#F1F5F9`/`#D97706` con acento Kümmerlein `#F7F788`, tipografías Archivo + Inter, 4 paletas alternativas en ThemeSwitcher).
  - Versionado con tags git `template/abogado@1.0.0` y `template/obsidian-authority@1.0.0`.
  - Generada y auditada demo `sites/demo-abogado/` (16 tests unitarios, HTML 33.1 KB, presupuesto JS de 1.87 KB vs límite 35 KB, a11y validado). Sincronizada a `dist-previews/demo-abogado/` para `https://preview.nexobow.site/demo-abogado/`.
  - Actualizado catálogo en `web/src/config.ts` (Obsidian Authority activado en vivo).
  - Suite completa de 37 tests pasando al 100%.
- [2026-10-22] Reconstrucción y Clon Fiel de Template #03 REA (`templates/clinica/` - Ticket 21):
  - Reemplazados todos los componentes heredados de Delta Cafés por la arquitectura visual, espacial y cromática auténtica de SkyClinics (`architectural-prestige`).
  - Paleta 60-30-10: Lienzo mineral piedra (`#e8e7e5`), Deep Forest Teal (`#003934`), Menta quirúrgico (`#1a9e8f`) y Slate Navy (`#0f172a`).
  - Tipografías abiertas: `Plus Jakarta Sans` + `Inter`.
  - Componentes exclusivos: `Header.astro` institucional espacioso con cruz médica sobria, `Hero.astro` asimétrico con badges de certificación y diagnóstico 3D, tarjetas clínicas de alta gama `Problem.astro` y `Steps.astro` con esquinas 16px, `Button.astro` con curvatura 12px y dot acento menta expansivo.
  - Sincronizada y auditada demo `sites/demo-clinica/` (1.87 KB JS propio vs presupuesto <= 35 KB, 0 scripts de terceros).
  - Tags inmutables `template/clinica@1.0.0` y `template/architectural-prestige@1.0.0` actualizados y pusheados a GitHub.
  - Suite completa de 37 tests unitarios y de integración 100% pasando en verde.
- [2026-10-22] Instalación e Integración de Skill `impeccable`:
  - Instalado motor `impeccable` v4.7.0 (`.agents/skills/impeccable/` + binario `scripts/bin/linux-x64/impeccable` + hook en `.codex/hooks.json`).
  - Orquestado en `AGENTS.md` como filtro anti-mediocridad y protocolo de triage rápido para resolución inmediata de errores estéticos o de generación visual (`detect`, `bolder`, `polish`, `distill`, `clarify`).
  - Integrado en Fase 5 del Main Flow y en el árbol de decisión de generación de sitios y templates.
  - Verificado con test suite de 37 pruebas en verde.


