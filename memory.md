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
- [2026-10-22] Implementación & Verificación Template #02 Abogado (Kümmerlein REA / Obsidian Authority) con Mock Lead:
  - Creada ficha mockdata completa en `clients/55-gonzalo-benitez-abogado.md` (Dr. Gonzalo Benítez, litigios societarios & corporativo, voseo argentino profesional, dolores Hormozi y oferta de alta gama).
  - Restaurados y validados los componentes de presentación de los templates maestros en `/templates/{abogado,clinica,corporativo}/src/`.
  - Compilado y auditado con éxito el sitio `sites/55-gonzalo-benitez-abogado/` (HTML: 46.5 KB, JS propio 1.87 KB, a11y 100%, 0 scripts externos).
  - Triage visual y accesibilidad con `impeccable detect`: corregida jerarquía de encabezados (`h1` -> `h2`) y eliminado falso `animate-pulse` decorativo.
  - Sincronizada vista previa a `dist-previews/55-gonzalo-benitez-abogado/` lista para servir en `https://preview.nexobow.site/55-gonzalo-benitez-abogado/`.
  - Tags git inmutables `template/abogado@1.0.0` y `template/obsidian-authority@1.0.0` actualizados y pusheados a GitHub.
  - Suite de pruebas completa cerrada con TDD (`npm test`): 39 tests pasando 100% en verde.
- [2026-10-22] Cierre Integral de Frente D (Fábrica de Prospección & Conversión B2B + Claude Code Ready):
  - **Higiene Anti-Bloat**: Deshabilitado `data-agent-kit-plugin` en el servidor de lenguaje local (eliminando 11 servidores MCPs y 37 herramientas irrelevantes de BigQuery/Spark); purgadas 5 skills no operativas en `.agents/skills/`.
  - **Symlink Claude Code**: Creado enlace canónico `.claude/skills` -> `../.agents/skills`, unificando en tiempo real las herramientas para Antigravity y Claude Code CLI.
  - **Ticket 34 (`objection-handler`)**: Implementado `scripts/handle-objection.mjs` y `.agents/skills/objection-handler/SKILL.md` con matriz de 5 objeciones y 3 ángulos persuasivos (Hormozi, Reversión de riesgo & 7 días, AfterBow) en estricto voseo argentino.
  - **Ticket 35 (`screenshot-qa`)**: Implementado `scripts/screenshot-qa.mjs` y `.agents/skills/screenshot-qa/SKILL.md` para auditoría visual headless en dual-viewport (375px móvil y 1440px desktop) con detección de `overflow-x` y pre-flight check en `build-client-site.mjs` (`--run-qa`).
  - **Ticket 36 (`domain-provisioner`)**: Implementado `scripts/domain-provisioner.mjs` y `.agents/skills/domain-provisioner/SKILL.md` para handoff de dominios propios (`.com.ar` en NIC Argentina y `.com`), generando instrucciones DNS CNAME y verificación de resolución.
  - **Ticket 37 (`preview-telemetry`)**: Implementado `scripts/preview-telemetry.mjs` y `.agents/skills/preview-telemetry/SKILL.md` con script pasivo de 743 bytes (<1 KB, 0 cookies, Ley 25.326 compliant) para registrar aperturas, clicks de WhatsApp y cambios en el ThemeSwitcher.
- [2026-10-22] **Ticket 20 Completado (`templates/abogado@2.0.0` — Duplicación Integral REA de Kümmerlein `https://www.kuemmerlein.de/`)**:
  - **Evidencia REA CDP (`rea-agents@6.7.0`):** Capturada en `.reports/rea/abogado/` (`page.json`, `bundle.json`, `screenshot.json`, `scripts/`, `style-min.css`, `index-raw.html`).
  - **Componentes Auténticos de Kümmerlein:** Reemplazado el re-skin previo por la arquitectura propia de Kümmerlein: `Header.astro` (isotipo SVG `K.` + barra flotante `.menu__outer`), `Hero.astro` (`.cm_hero` con recorte cóncavo SVG `0 0 31 31`, botón circular `#f7f788` y titular en `Instrument Serif`), `ValueProposition.astro` (`.cm_text.two_col` + tarjetas `.tiles__item` en `#e2e4d7` con recorte cóncavo), `PracticeAreas.astro` (`.cm_themen` sobre `#d7d7cc` con 4 círculos `.col__circles`, áreas `A·01`..`A·04`, `.cm_cta_button` y `.cm_solutions` con doble `.big_fat_button`), `Attorneys.astro` (doble ticker bidireccional `.cm_team_ticker` de píldoras `.badge__name` + reseñas verificadas), `CaseResults.astro` (`.cm_insights_teaser` con tarjetas amarillas `#f7f788` y recorte cóncavo SVG), `ConsultationCta.astro` (`.cm_text_ticker` + honorarios en `$X ARS` y botón `.round_style` con círculo lateral expansivo) y `Footer.astro` (full-bleed amarillo `#f7f788` en 12 columnas con cumplimiento Ley 25.326).
  - **Demo & Auditoría:** Compilada `sites/demo-abogado/` (`81.2 KB` HTML, `2.33 KB` JS propio), capturas dual-viewport verificadas en `.reports/screenshots/demo-abogado/` (`1440px` y `375px`), `impeccable detect` con 0 hallazgos en fuentes, 17 tests en template y 55 tests globales en verde.
  - **Versionado Inmutable:** Creados tags locales `template/abogado@2.0.0` y `template/obsidian-authority@2.0.0` preservando `@1.0.0`.
- [2026-10-22] **Ticket 21 Completado (`templates/clinica@2.0.0` — Duplicación Integral REA de SkyClinics `https://skyclinics.al/`)**:
  - **Evidencia REA CDP (`rea-agents@6.7.0`):** Capturada en `.reports/rea/clinica/` (`page.json` [4 MB], `bundle.json`, `screenshot.json`, `style-min.css` [26.9 KB], `index-raw.html` [76.4 KB]). Extracción de variables nativas `--theme-` (`#e8e7e5` lienzo mineral piedra, `#003934` Deep Forest Teal, `#1a9e8f` menta quirúrgico), fuentes `Satoshi` + `Inter` y keyframes característicos de audio wave y telemetría.
  - **Componentes Auténticos de SkyClinics (`architectural-prestige`):** Reemplazada la estructura anterior por la arquitectura clínica propia de SkyClinics: `Header.astro` (isotipo de cruz médica + tipografía arquitectónica en tracking `0.14em` + visualizador de onda sonora "Modo Clínico"), `Hero.astro` (composición asimétrica con viewport 3D interactivo de tomografía CBCT, rayo láser animado `.scanner-ray`, coordenadas en vivo, métricas de éxito y doble CTA), `SpecialtiesShowcase.astro` (tarjetas numeradas `01` a `04` con bordes de micro-hover menta y especificaciones de implantes y rehabilitación oral), `TechnologyDiagnostics.astro` (6 módulos de vanguardia: tomografía Cone Beam 0.075 mm, escaneo intraoral 0 moldes, fresado CAD/CAM in-house, flujo de aire laminar HEPA y sedación consciente), `MedicalTeam.astro` (cuadro de directores y cirujanos con matrículas M.N./M.P. verificadas), `PatientJourney.astro` (4 fases cronológicas `+20 Países · Un Solo Destino`), `FacilitiesShowcase.astro` (instalaciones y quirófanos certificados), `ClinicalReviews.astro` (casos documentados con 5.0 ★ y consentimiento bioético), `BookingScheduler.astro` (formulario de triage, aranceles transparentes en `$X ARS`, botón directo a WhatsApp y enlace Calendly), `Footer.astro` (diseño hospitalario, guardia médica 24/7 y Ley 25.326) y `ThemeSwitcher.astro` (4 paletas de quirófano en vivo con persistencia y WhatsApp).
  - **Demo & Auditoría:** Compilada `sites/demo-clinica/` (`79.8 KB` HTML, `1.87 KB` JS propio vs presupuesto <= 25 MB), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones y 0 advisories, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde.
  - **Versionado Inmutable:** Fijados tags inmutables `template/clinica@2.0.0` y `template/architectural-prestige@2.0.0` protegiendo `@1.0.0`.
- [2026-10-22] **Ticket 22 Completado (`templates/corporativo@2.0.0` — Duplicación Integral REA de Vetter Consulting `https://vetter-consulting-en.webflow.io/`)**:
  - **Evidencia REA CDP (`rea-agents@6.7.0`):** Capturada en `.reports/rea/corporativo/` (`page.json` [424 KB], `bundle.json`, `screenshot.json`, `targets.json`, `scripts/`). Extracción de paleta 60-30-10 auténtica (`#090909` Onyx Black, `#f4f4f4` Tiza pura, `#ff891d` Tactical Orange, superficies cuadriculadas `#151515`/`#1e1e1e`/`#212121` y bordes en `#262626`), tipografía original `Neue Montreal` (Pangram Pangram: Bold, SemiBold, Medium, Regular) descargada y self-hosteada en `public/fonts/`, y activos vectoriales SVG de ajedrez corporativo y finanzas (`king`, `pferd`, `bauer`, `springer`, `building-shield`, `money-bill`, `user-tie`, etc.).
  - **Componentes Auténticos de Vetter Consulting (`high-ticket-consulting`):** Reemplazados los componentes heredados de Delta Cafés por la arquitectura corporativa táctica de Vetter:
    - `Header.astro`: Encabezado táctico de alto contraste con badge de estatus de consultoría ("DISPONIBILIDAD DIRECTA Q4"), isotipo de rey de ajedrez, navegación y CTA a Calendly.
    - `Hero.astro`: Atmósfera de tablero de ajedrez corporativo con widget táctico Speed Chess Clock (doble cronómetro blitz: "Tu competencia" vs "Tu negocio con estrategia"), matriz de 4 métricas financieras (+5.000 consultorías, 700+ clientes satisfechos, 100% digital, 44% menos carga administrativa) y CTAs de impacto.
    - `Button.astro`: Botón rectangular táctico de alta gama con doble capa deslizable en vertical (efecto split-text hover) y flecha oblicua táctica.
    - `StrategicGrid.astro`: Cuadrícula estilo tablero de ajedrez con bloques modulares de 1px en `#262626` para las 6 áreas de intervención (Blindaje Patrimonial, Capital de Trabajo, Conversión de Activos, Retención de Talento, Blindaje Operativo y Fractional CFO).
    - `ConsultingRoadmap.astro`: Fases de intervención estratégica en 4 etapas ("Así funciona nuestra colaboración") con línea vertical central y entregables concretos por hito.
    - `RoiMetrics.astro`: Casos de estudio financieros con situación inicial (cruces) vs resultado medible (checks) basados en directores reales (Patrick Khatrao, Julius Kemnitzer, Sebastian Szalinski), con impacto financiero (+€43.000 EUR ahorro, +32% margen, 44% menos tiempo administrativo).
    - `BookingSection.astro`: Bloque táctico de agendamiento directo ("El tiempo se agota. Es tu jugada.") con los 3 pasos de contacto hacia Calendly y WhatsApp.
    - `Footer.astro`: Pie corporativo de alta gama con enlaces sociales, datos de contacto y cumplimiento de la Ley 25.326.
    - `ThemeSwitcher.astro`: Selector flotante anti-rebote con 4 paletas ejecutivas en vivo (Tactical Onyx, Obsidian Gold, Emerald Capital, Royal Navy) y enlace preconfigurado a WhatsApp.
  - **Demo & Auditoría:** Compilada `sites/demo-corporativo/` (`61.0 KB` HTML, `1.87 KB` JS propio vs presupuesto <= 25 MB), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones de diseño, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde.
  - **Versionado Inmutable:** Fijados tags inmutables `template/corporativo@2.0.0` y `template/high-ticket-consulting@2.0.0` preservando `@1.0.0`.
- [2026-10-22] **Ticket 23 Completado (`templates/tech@1.0.0` — Duplicación Integral REA de Think Company `https://www.thinkcompany.com/`)**:
  - **Evidencia REA CDP (`rea-agents@6.7.0`):** Capturada en `.reports/rea/tech/` (`page.json` [1.4 MB], `style.css` [294 KB], `icon-sprite.svg` [92 KB], `manifest.json` [45 scripts exportados], `index-raw.html` [65 KB]). Paleta 60-30-10 auténtica: `#fdffee` (Canvas Vanilla claro), `#031b36` (Navy Ink profundo), `#ff2c17` (Think Red de alto impacto), `#b6ffff` (Soft Cyan) y superficies `#0b2c52`.
  - **Fuentes Auténticas Self-Hosteadas:** Extraídas y alojadas en `public/fonts/`: `Bagoss` (Bold, SemiBold, Medium, Regular), `ABC Diatype` (Bold, Regular) y `Space Mono` (Regular) con fallback resiliente en Google Fonts (`Syne` / `Familjen Grotesk` + `Inter` + `Space Mono`).
  - **Componentes Auténticos de Think Company (`tech-editorial-system`):**
    - `Header.astro`: Barra digital minimalista con logo SVG, badge técnico ("ARQUITECTURA DIGITAL · Q4"), navegación y botón directo a agendar descubrimiento.
    - `Hero.astro`: Composición split editorial tech con runway, titular en `Bagoss` ("Resolvemos los problemas de software *que valen la pena resolver*"), copy de alivio técnico, métricas de tracción y consola interactiva de diagnóstico de sistemas con telemetría en vivo.
    - `Button.astro`: Botón redondeado minimalista con micro-stroke y hover de elevación (`frosted-btn` y `cta-btn` con animación dual-arrow en SVG).
    - `SystemChallenges.astro`: Tarjetas interactivas de deuda técnica, fricción de sistemas legados y arquitectura digital (basado en `how-we-help`: problema en comillas, solución técnica y link con flecha SVG).
    - `TransformationPhases.astro`: Roadmap de modernización de 4 fases (basado en `mixtape-cards` con viewport, etiquetas tech en `Space Mono` y entregables de ingeniería).
    - `ClientCaseStudies.astro`: Casos de estudio interactivos de producto y ROI de desarrollo (basado en `featured-work`: cliente, industria, antes/después y métricas cuantitativas: -68% latencia, +340% throughput, etc.).
    - `DiscoveryBooking.astro`: Agendamiento directo de sesión de descubrimiento técnico (basado en `text-cta`: dot grid animado, titular de impacto, honorarios transparentes en `$1.250.000 ARS`, garantía Hormozi y links a Calendly y WhatsApp).
    - `Footer.astro`: Pie técnico con especificaciones, logo SVG, canales directos y cumplimiento estricto de la Ley 25.326.
    - `ThemeSwitcher.astro`: Selector flotante anti-rebote con 4 paletas en vivo (Think Vanilla, Obsidian Terminal, Digital Cyan, Electric Violet) con persistencia y WhatsApp.
  - **Demo & Auditoría:** Compilada `sites/demo-tech/` (`61.7 KB` HTML, `1.87 KB` JS propio vs presupuesto <= 25 MB), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones de diseño, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde.
  - **Versionado Inmutable:** Fijados tags inmutables `template/tech@1.0.0` y `template/tech-editorial-system@1.0.0`.
- [2026-10-23] **Ticket 24 Completado (`templates/deportes@1.0.0` — Duplicación Integral REA de The Performance Lab `https://theperformancelab.ca/`)**:
  - **Evidencia REA CDP (`rea-agents@6.7.0`):** Capturada en `.reports/rea/deportes/` (`page.json` [1.2 MB], `style.css` [37 KB], `index-raw.html` [275 KB], `screenshot.json` [341 KB], scripts exportados). Paleta 60-30-10 auténtica: Dark Carbon (`#0f1419`), Blanco Puro (`#ffffff`), Kinetic Emerald Green (`#10b981`), Gris Grafito (`#1f2937`) y acento Performance Red (`#ff350d`). Fuentes originales descargadas y self-hosteadas en `public/fonts/`: `display` (Regular, Medium, Bold), `diatype` y `mono` con fallback Google Fonts `Barlow Semi Condensed` / `Teko` + `Chivo`.
  - **Componentes Auténticos de The Performance Lab (`kinetic-performance`):**
    - `Header.astro`: Barra compacta atlética con isotipo crosshair SVG `viewBox="0 0 40 40"`, badge de telemetría de laboratorio, navegación con tracking mono y botón angular a sesión de prueba.
    - `Hero.astro`: Tipografía masiva de alto rendimiento (`.type-h1`), consola de diagnóstico de rendimiento atlético con métricas VO2 Max (68.4 ml/kg/min), RSI (2.84), Peak Power Output (1420W), asimetría bilateral (<3.1%) y doble CTA angular.
    - `ui/Button.astro`: Botón angular con bordes afilados (`rounded-none`), acento kinetic emerald y micro-animación de aceleración (`cubic-bezier(0.22, 1, 0.36, 1)`).
    - `AthleticAssessment.astro`: 4 modos de falla de rendimiento y estancamiento físico con protocolos de intervención en ciencias del deporte (Fuerza & Potencia, Sobrecarga/Molestias, Periodización, Recuperación/VO2 Max).
    - `TrainingPeriodization.astro`: Proceso metódico en 4 fases (Testeo Neuromuscular -> Periodización -> VBT & Carga Guiada -> Re-Testeo Trimestral).
    - `AthleteTransformations.astro`: Récords personales con datos cuantitativos antes/después y testimonios de atletas verificados 5.0 ★.
    - `TrialBooking.astro`: Agendamiento directo de sesión de testeo biomecánico de 90 min en `$89.000 ARS`, garantía de impacto Hormozi y links directos a Calendly y WhatsApp.
    - `Footer.astro`: Pie atlético con crosshair SVG, enlaces y normativa Ley 25.326.
    - `ThemeSwitcher.astro`: Selector flotante anti-rebote con 4 paletas en vivo (Kinetic Emerald, Performance Red The Lab, Olympic Gold, Cyber Athletic Cyan) con persistencia y WhatsApp dinámico.
  - **Demo & Auditoría:** Compilada `sites/demo-deportes/` (`62.2 KB` HTML, `1.87 KB` JS propio vs presupuesto <= 25 MB), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones y 0 advisories, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde. Activado Template 05 (`Kinetic Performance`) en `web/src/config.ts`. Tags inmutables `template/deportes@1.0.0` y `template/kinetic-performance@1.0.0` fijados.
