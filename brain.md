# BRAIN.md — Conciencia Operativa & Arquitectura Agéntica de NexoBow

> **Identidad del Documento**: `brain.md` es la inteligencia central y la conciencia técnica de **NexoBow**. Define el "por qué", el "cómo" y los límites de ingeniería que rigen el comportamiento de los agentes autónomos (`AGENTS.md`), desarrolladores y orquestadores. No es un ejecutor directo, sino la fuente de verdad y fundamentación agéntica de la agencia.

---

## 1. Diagnóstico y Fundamento Técnico (El Manifiesto NexoBow)

### 1.1 El Problema que Resolvemos
Las agencias de software tradicionales sufren de **sangrado de recursos y lentitud de entrega**: proyectos a medida de 6 meses, chats gigantes de IA que alucinan código (*Vibe Coding* ciego) y fricción constante con clientes que no entienden de tecnología.

NexoBow opera bajo el modelo de **Agencia de Automatizaciones B2B de Alta Precisión**. Vendemos la resolución de cuellos de botella operativos y comerciales medibles para prestadores de servicios (nutricionistas, psicólogos, abogados) mediante sistemas agénticos modulares, mantenibles y ultra-económicos.

### 1.2 La Regla del Desacoplamiento (Data & Template Decoupling)
Para escalar sin quemar tokens ni presupuesto (< 10 USD/mes), NexoBow desacopla estrictamente tres capas:
1. **Templates (`/templates/`)**: Código base modular por rubro. A diferencia de la página de agencia, los templates adoptan una **arquitectura visual PREMIUM** (micro-interacciones fluidas, animaciones refinadas, excelente diseño responsivo y tipografía de autor), optimizados para máxima conversión sin restricciones dogmáticas de JS, clonables e inmutables por cliente.
2. **Contexto del Cliente (`/clients/`)**: Datos específicos, branding, reglas de negocio e historias del cliente aisladas.
3. **Agent Skills (`/.agents/skills/`)**: Procedimientos y SOPs ejecutables que adaptan el Template usando el Contexto del Cliente.

---

## 2. Economía de Tokens y Control del Entorno (Context Engineering)

### 2.1 La Ley de la "Smart Zone vs. Dumb Zone"
Los Modelos de Lenguaje (LLMs) degradan su capacidad de razonamiento a medida que la ventana de contexto se llena (efecto *Context Rot*). 
* **Smart Zone (< 100k - 140k tokens)**: La atención del modelo es precisa. El rendimiento de generación de código y diffs es óptimo.
* **Dumb Zone (> 140k tokens)**: La atención decae cuadráticamente. El modelo genera código verboso, spaghetti, olvida instrucciones y alucina dependencias.

```
[ Ventana Limpia: 0 - 50k ] ──► Smart Zone (Atención Impecable)
[ Ventana Media: 50k - 100k ] ──► Zona Operativa (TDD & Diffs)
[ Ventana Límite: > 140k ]   ──► Dumb Zone (RESET / Session Handoff Obligatorio)
```

### 2.2 Principios de Control de Entorno
1. **Regla de Oro**: `1 Feature = 1 Sesión Limpia (/clear) = 1 Commit / Diff Quirúrgico`.
2. **Prohibición de Contaminación de Contexto (Context Bleeding)**: Jamás trabajar en dos clientes o dos características no relacionadas en la misma conversación.
3. **Carga Progresiva de Contexto (Progressive Disclosure)**:
   * *Nivel 1*: YAML Frontmatter de las Skills (Nombre + Descripción).
   * *Nivel 2*: `skill.md` completo cargado sólo tras la invocación.
   * *Nivel 3*: Archivos de referencia (`reference.md`, `glossary.md`) consultados bajo demanda.
4. **Manejo de Memoria Persistente**:
   * Usar `/clear` junto con un patrón de **Session Handoff** (resumen de decisiones, archivos tocados y pendientes) para reiniciar la sesión sin perder conocimiento.

---

## 3. Metodología de Desarrollo Agéntico (Spec-Driven & TDD)

NexoBow elimina formalmente el *Vibe Coding*. Todo desarrollo sigue el ciclo **Spec-Driven Development (SDD) Anchored**.

```
[ Interrogatorio (Grill) ] ──► [ SPEC / PRD ] ──► [ Plan & Vertical Slices ] ──► [ TDD Agéntico ] ──► [ Auditoría ]
```

### 3.1 Fase 1: Alineación con `grill-me` (Shared Design Concept)
Antes de generar código, el agente debe alinear el concepto de diseño con el usuario o desarrollador:
* **Entrevista incesante**: Preguntar iterativamente sobre límites, casos de borde y dependencias.
* **Prohibición de Asunciones**: El agente no adivina el stack ni el flujo comercial; interroga hasta alcanzar una comprensión común.

### 3.2 Fase 2: Definición de Especificaciones (`spec.md`) y PRD
* **Documento de Destino**: El `spec.md` define *Qué* se construye y *Por qué*, incluyendo criterios de aceptación ejecutables.
* **Estabilidad del Spec**: La especificación es el contrato de verdad. Si el código cambia, la especificación se actualiza (*Spec-Anchored*).

### 3.3 Fase 3: Descomposición en Tajadas Verticales (Vertical Slices / Tracer Bullets)
* **Antipatrón Horizontal**: No construir por capas aisladas (ej. toda la base de datos primero, luego toda la API, luego el frontend).
* **Patrón Vertical**: Cada ticket/tarea debe ser una tajada delgada que cruza Frontend + Backend + DB para validar el flujo punta a punta y obtener feedback inmediato.

### 3.4 Fase 4: TDD Agéntico (Red-Green-Refactor)
1. **Red**: El agente escribe una prueba automatizada que demuestra el fallo o la ausencia de la característica.
2. **Green**: El agente implementa la cantidad mínima de código necesaria para que la prueba pase.
3. **Refactor**: Se limpia la arquitectura garantizando que las pruebas continúen pasando.

### 3.5 Arquitectura de Módulos Profundos (Deep Modules)
Para evitar archivos fragmentados y difíciles de navegar por la IA:
* **Módulos Profundos**: Pocas interfaces públicas simples que ocultan lógica densa e interna.
* **Módulos Superficiales (Evitar)**: Docenas de archivos pequeños con interfaces complejas que confunden al orquestador agéntico.

---

## 4. Estándar para el Desarrollo de Agent Skills

Las **Agent Skills** son los procedimientos operativos estándar (SOPs) que los agentes leen para ejecutar tareas específicas dentro de NexoBow.

### 4.1 Anatomía Estándar de una Skill (`skill.md`)
Ubicación: `/.agents/skills/{nombre-skill}/skill.md`

```yaml
---
name: nombre-de-la-skill
description: "Descripción concisa de qué hace la skill y CUÁNDO debe ser invocada por el modelo (Triggers)."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Título de la Skill

## Propósito y Contexto
Explicación de qué problema resuelve esta skill dentro del flujo de NexoBow.

## Requisitos Previos y Entradas
- Ficha de cliente: `/clients/{N-rubro-nombre}.md` (frontmatter YAML + cuerpo Markdown)
- Template base: `/templates/{RUBRO}/`

## Paso a Paso de Ejecución (SOP)
1. Paso 1: Lectura de variables.
2. Paso 2: Copia e inyección quirúrgica de diffs.
3. Paso 3: Verificación de sintaxis y pruebas TDD.

## Negaciones Explícitas (Qué NO hacer)
- NO modificar componentes globales fuera de la carpeta del cliente.
- NO realizar peticiones de red externas no autorizadas.
```

### 4.2 Parámetros y Archivos de Referencia
* Si una skill requiere documentación extensa de APIs o esquemas de base de datos, **NO inflar el `skill.md`**.
* Guardar los detalles en `reference.md` o `docs/api.md` dentro de la carpeta de la skill y hacer que el agente los lea únicamente si es necesario.

---

## 5. Estructura de Directorios Operativa de NexoBow (`agency-factory`)

```text
agency-factory/
├── BRAIN.md                            <-- Este documento (Conciencia Operativa)
├── AGENTS.md                           <-- Instrucciones maestras de orquestación y rutas
├── .agents/
│       ├── standard/                   <-- Estándar estético y 3D de la agencia NexoBow (web/)
│       ├── build-client-site/          <-- Clona template REA + aplica ficha cliente
│       ├── audit-code/                 <-- Auditoría de performance, a11y y 0-JS
│       └── impeccable/                 <-- Motor anti-slop, triage y elevación visual rápida
├── templates/                          <-- Templates base por vertical de negocio
│   ├── abogado/
│   ├── psicologo/
│   └── nutricionista/
├── clients/                            <-- Fichas de clientes (Aislado, una por prestador)
│   ├── _ficha-template.md
│   └── 1-nutri-camilomedina.md         <-- Ficha: frontmatter YAML + cuerpo Markdown
├── assets/                             <-- Imágenes por cliente (assets/1-nutri-camilomedina/)
├── sites/                              <-- Clones generados del template (nunca se editan a mano)
│   └── 1-nutri-camilomedina/
└── dist/                               <-- Sitios ensamblados listos para despliegue
```

---

## 6. Antipatrones y Errores Comunes (Sangrado de Tokens y Fallos de Proceso)

1. **Antipatrón del MCP Global Inflado**:
   * *Error*: Habilitar múltiples servidores MCP (GitHub, Database, Web Browsing) a nivel global.
   * *Efecto*: Cada mensaje consume +20k tokens sólo en definiciones de herramientas.
   * *Solución*: Habilitar MCPs únicamente a nivel de proyecto cuando la tarea lo exija.

2. **Antipatrón del "Vibe Refactoring"**:
   * *Error*: Pedirle a la IA "mejorá este código" o "hacé que se vea más lindo" sin especificación.
   * *Efecto*: Reescribe componentes enteros, introduce regresiones y rompe integraciones.
   * *Solución*: Exigir un `spec.md` corto o lista de refactorización con pruebas TDD antes de ejecutar.

3. **Antipatrón de la Revisión Mencionada en Contexto Sucio**:
   * *Error*: Pedir auditoría de código o revisión de seguridad en la misma sesión donde se generaron 80k tokens de código.
   * *Efecto*: La IA aprueba su propio código por sesgo de confirmación y falta de atención.
   * *Solución*: Iniciar una sesión limpia o lanzar un subagente dedicado únicamente a auditar (`audit-code`).

---

## 7. Filosofía de Negocio y Presupuesto (< 10 USD/mes)

NexoBow se optimiza para **Costo Cero de Infraestructura**:
* **Antigravity (Google AI Pro)**: Uso de **Gemini 3.8 Flash** para creación de código frontend, análisis visual y generación rápida de componentes.
* **OpenCode + OpenRouter**: Uso de créditos de \$10/mes para modelos de razonamiento y refactors pesados (**DeepSeek V4 Flash / GLM / Kimi**).
* **n8n Self-Hosted / Local**: Orquestación determinista de webhooks y WhatsApp sin pagar plataformas SaaS caras.
* **Supabase Free Tier**: Base de datos Postgres y autenticación para la ingesta de leads.

*NexoBow no vende tecnología; vende la eliminación del caos operativo de sus clientes.*

---

## 8. Memoria de Sesión (Operativa)

### 2026-10-14 — T01 reejecutado: template `nutricionista` con estilo Delta Cafés
- Usuario definió la dirección estética de los templates: **deltacafes.com** como objetivo de diseño (ingeniería inversa vía REA sobre HTML/CSS del sitio: paleta rojo `#e70025`/espresso `#35221a`/crema `#fcf3ed`/tan `#e3c1ad`, serif display `delta-season` → **Fraunces**, sans `trade-gothic` → **Archivo**, marquee strip, itálicas serif, números 01/02/03, botones pill con flecha). Resuelve ERROR-001/002.
- Reconstruido `templates/nutricionista/` (reset previo borró src y skills): arquitectura theme-driven preservada (`site.json` `tema`+`content`), con tokens nuevos `fondo`/`tinta`/`fuente_sans`. Lógica pura separada en `src/theme.ts` y `src/order.ts` (seams TDD). Componentes `ui/`: `Lead` (itálicas `*texto*`), `SectionHead`, `Button` (variants primary/outline/light/ghost-light).
- **TDD**: 14 tests `node:test` en `tests/` (red→green) sin dependencias extra; `npm test` + `npm run build` verdes; HTML final con **0 scripts** (SSG estricto), marquee CSS-only con `prefers-reduced-motion`.
- Pendientes: T02→T03 integrados en template, T05 (`audit-code`) pendiente, T06+ bloqueados por ficha real.

### 2026-10-18 — T04 completado y verificado: script build-client-site + landing demo Lic. Sofía Ramos
- Recreado el orquestador `scripts/build-client-site.mjs` y la skill `.agents/skills/build-client-site/SKILL.md` adaptados al nuevo esquema Delta Cafés (`site.json`).
- Implementado soporte de vinculación rápida de dependencias y deep-merge sin fugas de placeholders.
- Creada ficha demo `clients/demo-nutri-sofia.md` ("Lic. Sofía Ramos - Nutrición Funcional & Deportiva") y compilado el clon en `sites/demo-nutri-sofia/` (16 tests pasando, SSG puro de 27.8 KB, 0 JS).
- Corregido contraste de itálicas en `FinalCta.astro` + `Lead.astro` (`emClass` con `--color-on-primary` sobre fondo `--color-primary`) tras auditoría en sub-agente limpio.
- Sistema listo para prospección comercial inmediata.

### 2026-10-19 — Implementación Completa del Pipeline Automatizado Lead-to-Live
- **Google Maps Platform (`google-maps-platform`) Integrada**: Implementada en `scripts/scout-lead.mjs` usando Places API (New) con field mask (`displayName`, `formattedAddress`, `nationalPhoneNumber`, `rating`, `userRatingCount`, `reviews`, `photos`, `location`). Descarga local de fotos y mapa estático (Maps Static API, 0 JS) a `/assets/{slug}/`. Soporte dual con `GOOGLE_MAPS_API_KEY` o modo mock/demo sin fricción.
- **Copywriting Hormozi & Compliance (`generate-client-fiche`)**: Implementado en `scripts/generate-client-fiche.mjs` con voseo argentino, dolores de Alex Hormozi para salud, soporte opcional de Gemini API (@google/genai), fallback inteligente a WhatsApp si falta Calendly y cumplimiento estricto de Ley 25.326 (`consentimiento_testimonios: false`).
- **Build con Assets (`build-client-site`)**: Actualizado para copiar `/assets/{slug}/` a `sites/{slug}/public/assets/` y manejar fallback de agendamiento.
- **Auditoría Automatizada (`audit-code`)**: Creado `scripts/audit-site.mjs` verificando 16 tests unitarios, marcado accesible y 0 JS en cliente (Astro SSG puro).
- **Despliegue Instantáneo (`deploy-cloudflare`)**: Creado `scripts/deploy-cloudflare.mjs` con Wrangler CLI y flags para `--dry-run` o producción.
- **Orquestador Maestro (`lead-to-live`)**: Creado `scripts/lead-to-live.mjs` unificando todo el flujo en 1 comando.
- **TDD & Verificación**: Tests automatizados (`tests/pipeline-tanda1.test.mjs` y `tests/pipeline-e2e.test.mjs`) 100% pasando en ~14s con cero scripts en cliente. Pipeline listo para producción.

### 2026-10-19 — Simplificación y Portabilidad In-Conversation (Cancelación de n8n & Localhost)
- **Desmantelamiento de Infraestructura Local**: Eliminados definitivamente `server/`, `workflows/` y `public/`. Cero daemons, cero puertos abiertos y cero mantenimiento de túneles o n8n.
- **Prospección In-Conversation Directa (`scripts/prospect-in-conversation.mjs` & `scripts/sheets-sync.mjs`)**: Ejecutable directo por Antigravity desde la conversación ("Che, buscame abogados en Campana").
- **Deduplicación & Filtro Web**: Consulta previa contra el Google Sheet (`1fIr3Lug-AALrlGN-Lr3N1syYmMVYTTCaNy0vfXEH2qY`) para evitar prospectos repetidos; filtra y descarta quienes ya tienen sitio web corporativo propio, priorizando a profesionales sin web.
- **Esquema de 18 Columnas**: Inserción estricta respetando el formato de `Prospección NexoBow` con enlaces directos a WhatsApp precargados.
- **Portabilidad Total**: El sistema funciona indistintamente en la laptop o en la PC de escritorio únicamente con `git pull` y el plugin nativo `gsheets`.

### 2026-10-20 — Rebranding Soft-Obsidian (12 Secciones B2B), Correlatividad Columna B & Motor TTL 7 Días
- **Rebranding `web/` a Soft-Obsidian (`T-WEB-01` → `T-WEB-04`)**: Eliminado el neón `#DB1FFF` en favor de la paleta ejecutiva 60-30-10 (`#040607` Ink, `#0B0D12` Surface, `#5B2A62` Velvet, `#4928C2` Ultrasonic, `#BF40FA` Hyper Magenta, `#E3D9FC` Periwinkle). Implementado el nuevo funnel psicológico de 12 secciones (`Header`, `Hero` 3D CSS, `BeforeAfter`, `InteractiveFunnel` 0-JS, `TemplateCatalog` +10 estilos REA, `RoiCalculator` 0-JS, `CaseStudies`, `Pricing` con 3 planes `$189.999 ARS` / `$12.259 ARS`, alianza con **AfterBow** `afterbow.com`, 3 Bonos Hormozi y regla de 7 días, `CreateBowSystem` Fase 2 API, `Founder` **Juanma Merodio** `juanmamerodio.github.io/cv`, `Faq`, `FinalCta` y `Footer`). Compilación Astro SSG con **0 bytes de JS en cliente**.
- **Alineación Google Sheets Columna B y Correlatividad 1:1 (`T-SYS-01`)**: `scripts/sheets-sync.mjs` ancla en `'Prospección NexoBow'!B11:S1000` (Columna B = ID) y exporta `buildCorrelativeSlug()` generando `{id}-{nombre}-{apellido}-{rubro}.md`. `scripts/generate-client-fiche.mjs` inyecta `sheet_id`, `lead_status`, `created_at`, `last_activity_at` y `expires_at` (+7 días).
- **Motor de Ciclo de Vida 7 Días & Mejora Continua (`T-SYS-02`)**: Creado `scripts/lead-lifecycle.mjs` (renovación automática +7d si cambia el estado en el Sheet, alertas con link de WhatsApp de urgencia en días 5–6, y purga automática en `>=7d` o `"Descartado"` protegiendo `_ficha-template.md` y `demo-*`) y `scripts/continuous-improvement.mjs` (análisis de KPIs y tasas de respuesta por nicho).
- **Nuevas Agent Skills (`T-SYS-03`)**: Creadas `edit-client-site` (`/editar-web-cliente`), `lead-lifecycle` (`/seguimiento-leads`) y `flow-advisor` (`/next-step` / `/ask-matt`). Backlog de +10 templates mediante REA documentado para ejecución progresiva ahorrando 50% de tokens.
- [2026-10-21] Arquitectura de Inmutabilidad y Purga de Leads: Limpieza de prospectos locales en `clients/`, `sites/` y `dist-previews/` conservando solo `_ficha-template.md`. Establecida la regla de inmutabilidad de templates (`template_version`), previews directas en `https://preview.nexobow.site/{slug}/` y arquitectura de branding dinámico multivariante.
- [2026-10-21] Cierre Integral de Tickets `07`–`15` (`scratch/nexobow-v2/issues/`):
  - **Dominio unificado**: `https://preview.nexobow.site/{slug}/` (con barra final) en todos los scripts, fichas y tests (`buildPreviewUrl`).
  - **Seam `LeadStore`**: `createInMemoryLeadStore`, `createSheetsAdapter` y `defaultLeadStore` en `scripts/sheets-sync.mjs`. Ningún script fuera de `sheets-sync.mjs` invoca `gsheets` CLI directamente; ID correlativo atómico con detección de colisión, escape de comillas y escritura de `https://preview.nexobow.site/{slug}/` en Columna G (`Web Demo URL`) al finalizar `build-client-site` sin tocar Columna L (`Último Contacto`).
  - **Versionado por tags git**: `template/{rubro}@x.y.z` (tag inicial `template/nutricionista@1.0.0`), verificación de existencia de tag en `build-client-site.mjs`, `.template-lock.json` y flag `--upgrade-template`.
  - **Política JS diferenciada**: `web/` mantiene 0 JS ejecutable estricto como benchmark; `/sites/{slug}` (templates PREMIUM) valida presupuesto de JS propio (`<= 35 KB`) con reporte de peso y rechaza scripts externos de terceros no declarados.
  - **Backlog REA de 9 templates**: Queda explícitamente documentado como **pendiente de que el usuario elija y pase las webs de referencia** para cada vertical antes de iniciar ingeniería inversa (REA).
- [2026-10-21] Implementación y Cierre de Ticket `16` (`rea-inspect-extractor.md`): Desarrollado `scripts/rea-inspect.mjs` con soporte dual (CLI / módulo ESM), normalización hex, clasificador de contraste 60-30-10 (`fondo`, `tinta`, `primary`, `accent`), mapeo tipográfico de fuentes propietarias a Google Fonts abiertas y tolerancia a fallos de red con fallback de diseño. Suite completa con 32 tests 100% pasando.
- [2026-10-21] Desacoplamiento de Arquetipos Visuales y Theme Switcher Anti-Rebote (`SPEC-ARCHETYPES-SWITCHER.md`):
  - **Arquetipos Híbridos**: Integrado `template_archetype` en fichas (`/clients/`), resolución transparente `resolveTemplateArchetype` y `resolveTemplateSourceDirectory` en `build-client-site.mjs`, tag git alias `template/editorial-classic@1.0.0`.
  - **Paletas Alternativas**: Generación de 4 esquemas (`Original`, `Obsidian Gold`, `Clinical Cyan`, `Warm Terracotta`) en `generate-client-fiche.mjs` e inyección automática en `src/site.json`.
  - **ThemeSwitcher.astro**: Componente interactivo ultraliviano (<2.5 KB) en esquina inferior derecha (`bottom-4 right-4 z-50`) con swatches de color, mutación dinámica de variables CSS en `:root`, persistencia en `localStorage("nexobow_theme")` y enlace directo de WhatsApp con mensaje personalizado hacia el número de Juanma.
  - **TDD & Auditoría**: Creados `tests/archetype-decoupling.test.mjs` y `tests/theme-switcher.test.mjs`. Suite total ampliada a 37 tests unitarios y de integración 100% verdes con 0 fallos.
- [2026-10-21] Implementación y Entrega del Template #02 REA (`https://www.kuemmerlein.de/`):
  - **Ingeniería Inversa Visual**: Extraída la identidad sobria de Kümmerlein Rechtsanwälte & Notare, sintetizada en el arquetipo desacoplado `obsidian-authority` (Dark Executive `#090D16`/`#F1F5F9`/`#D97706` con acento Kümmerlein `#F7F788`, tipografías Archivo + Inter, bordes de 8px/16px y ThemeSwitcher con 4 paletas).
  - **Andamiaje Astro**: Creado `templates/abogado/` inmutable y desacoplado bajo el contrato `site.json` (`content` + `tema` + `paletas_alternativas`).
  - **Resolución Transparente**: Actualizado `scripts/build-client-site.mjs` para resolver `abogado` y `obsidian-authority` dinámicamente hacia `templates/abogado/`.
  - **Versionado Git Inmutable**: Fijados tags `template/abogado@1.0.0` y `template/obsidian-authority@1.0.0`.
  - **Build & Auditoría Demo**: Creada ficha demo `clients/demo-abogado.md` (Dr. Martín Albarracín - Asesoramiento Corporativo & Estratégico en voseo argentino), compilada en `sites/demo-abogado/` (16 tests unitarios pasando, HTML 33.1 KB, presupuesto JS de 1.87 KB << 35 KB) y sincronizada a `dist-previews/demo-abogado/` accesible en `https://preview.nexobow.site/demo-abogado/`.
  - **Catálogo de NexoBow**: Activado Template 04 (`Obsidian Authority`) como *"En Vivo (Demo)"* en `web/src/config.ts`. Suite total de 37 tests 100% verde.
- [2026-10-21] Implementación y Entrega del Template #03 REA (`https://skyclinics.al`):
  - **Ingeniería Inversa Visual**: Extraída la identidad arquitectónica de SkyClinics (Tirana, Albania), sintetizada en el arquetipo desacoplado `architectural-prestige` (Lienzo piedra mineral `#e8e7e5`, Deep Forest Teal `#003934`, Menta quirúrgico `#1a9e8f`, tipografías Plus Jakarta Sans + Inter, diseño de alta gama y ThemeSwitcher con 4 paletas en vivo).
  - **Andamiaje Astro**: Creado `templates/clinica/` inmutable y desacoplado bajo el contrato `site.json` (`content` con voseo argentino para clínicas de salud, alta complejidad y medicina quirúrgica/rehabilitación + `tema` + `paletas_alternativas`).
  - **Resolución Transparente**: Actualizado `scripts/build-client-site.mjs` y `scripts/generate-client-fiche.mjs` para resolver `clinica` y `architectural-prestige` dinámicamente hacia `templates/clinica/`.
  - **Versionado Git Inmutable**: Fijados tags `template/clinica@1.0.0` y `template/architectural-prestige@1.0.0`.
  - **Build & Auditoría Demo**: Creada ficha demo `clients/demo-clinica.md` (SkyClinics Argentina - Centro Médico Quirúrgico & Rehabilitación Integral), compilada en `sites/demo-clinica/` (16 tests unitarios pasando, HTML 33.6 KB, presupuesto JS de 1.87 KB << 35 KB) y sincronizada a `dist-previews/demo-clinica/` accesible en `https://preview.nexobow.site/demo-clinica/`.
- [2026-10-21] Implementación y Entrega del Template #04 REA (`https://vetter-consulting-en.webflow.io/`):
  - **Ingeniería Inversa Visual**: Extraída la identidad táctica ejecutiva de Vetter Consulting, sintetizada en el arquetipo desacoplado `high-ticket-consulting` (Onyx Black `#090909`, Tiza `#f4f4f4`, Tactical Orange `#ff891d`, superficies en cuadrícula ejecutiva estilo ajedrez `#151515` / `#1e1e1e`, tipografías Plus Jakarta Sans + Inter, 4 paletas alternativas en ThemeSwitcher).
  - **Andamiaje Astro**: Creado `templates/corporativo/` inmutable y desacoplado bajo el contrato `site.json` (`content` para consultorías B2B, finanzas corporativas, M&A y servicios de alto ticket + `tema` + `paletas_alternativas`).
  - **Resolución Transparente**: Actualizado `scripts/build-client-site.mjs`, `scripts/generate-client-fiche.mjs` y `tests/archetype-decoupling.test.mjs` para resolver `corporativo`, `consultor` y `high-ticket-consulting` dinámicamente hacia `templates/corporativo/`.
  - **Versionado Git Inmutable**: Fijados tags `template/corporativo@1.0.0` y `template/high-ticket-consulting@1.0.0`.
  - **Build & Auditoría Demo**: Creada ficha demo `clients/demo-corporativo.md` (Lic. Ignacio Valenzuela - Consultoría Financiera & Escalamiento B2B), compilada en `sites/demo-corporativo/` (16 tests unitarios pasando, HTML 38.3 KB, presupuesto JS de 1.87 KB << 35 KB, a11y validado) y sincronizada a `dist-previews/demo-corporativo/` accesible en `https://preview.nexobow.site/demo-corporativo/`.
- [2026-10-22] Cierre Integral de Frente D (Fábrica de Prospección & Conversión B2B + Claude Code Ready):
  - **Higiene Anti-Bloat**: Deshabilitado `data-agent-kit-plugin` en el language server local (recuperando 11 servidores MCPs y 37 herramientas ajenas); eliminadas 5 skills no operativas en `.agents/skills/`.
  - **Symlink Canónico Claude Code**: Establecido `.claude/skills` -> `../.agents/skills`, garantizando interoperabilidad nativa entre Antigravity y Claude Code sin duplicación de código.
  - **Skill `objection-handler`**: Implementado `scripts/handle-objection.mjs` y `.agents/skills/objection-handler/SKILL.md` con 5 categorías y 3 ángulos persuasivos (Hormozi, Reversión de riesgo 7 días, AfterBow) en voseo argentino profesional.
  - **Skill `screenshot-qa`**: Implementado `scripts/screenshot-qa.mjs` y `.agents/skills/screenshot-qa/SKILL.md` para auditoría visual headless (375px móvil / 1440px desktop) con detección automática de `overflow-x` y pre-flight check en `build-client-site.mjs` (`--run-qa`).
  - **Skill `domain-provisioner`**: Implementado `scripts/domain-provisioner.mjs` y `.agents/skills/domain-provisioner/SKILL.md` para handoff de dominios propios (`.com.ar` en NIC Argentina y `.com` globales) hacia Cloudflare Pages con verificación de registros CNAME y SSL.
  - **Skill `preview-telemetry`**: Implementado `scripts/preview-telemetry.mjs` y `.agents/skills/preview-telemetry/SKILL.md` con snippet de 743 bytes (<1 KB, 0 cookies, Ley 25.326 compliant) para tracking de apertura, clics de agendamiento y eventos del `ThemeSwitcher`.
  - **TDD & Suites**: Total de pruebas ampliado de 39 a **55 tests unitarios y de integración 100% pasando en verde**. Sistema blindado para salir a prospectar.
- [2026-10-22] Duplicación Integral REA de Kümmerlein (`templates/abogado@2.0.0` — Ticket 20):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM, CSS (`style-min.css`), SVGs de recortes cóncavos (`0 0 31 31`), isotipo `0 0 111 71` y scripts en `.reports/rea/abogado/`.
  - **Arquitectura Propia (`v2.0.0`):** Construidos `ValueProposition.astro`, `PracticeAreas.astro`, `Attorneys.astro`, `CaseResults.astro`, `ConsultationCta.astro`, `Header.astro`, `Hero.astro`, `Footer.astro` y `ui/Button.astro` con las 3 variantes de botón de Kümmerlein (`square_style`, `round_style`, `big_fat_button`), paleta 60-30-10 (`#f6f6f4` / `#111111` / `#f7f788` / `#686155`) y tipografías `Space Grotesk` + `Instrument Serif` + `Inter`.
  - **Retrocompatibilidad & Verificación:** Preservado el contrato `site.json` y retrocompatibilidad en `order.ts`; demo `sites/demo-abogado` auditada en sub-agente limpio (`2.33 KB` JS, a11y OK, `impeccable detect` 0 hallazgos), capturas `1440px` y `375px` en `.reports/screenshots/demo-abogado/`, y tags `template/abogado@2.0.0` + `template/obsidian-authority@2.0.0` listos.
- [2026-10-22] Duplicación Integral REA de SkyClinics (`templates/clinica@2.0.0` — Ticket 21):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM, variables CSS `--theme-` (`#e8e7e5` / `#003934` / `#1a9e8f`), `style-min.css` (26.9 KB), `index-raw.html` (76.4 KB), fuentes `Satoshi` + `Inter` y keyframes de audio/telemetría en `.reports/rea/clinica/`.
  - **Arquitectura Propia (`v2.0.0`):** Reemplazada la estructura previa por los componentes nativos de SkyClinics: `Header.astro` (isotipo cruz médica, tracking `0.14em`, audio pulse "Modo Clínico"), `Hero.astro` (composición de prestigio con visor 3D CBCT interactivo, rayo láser animado `.scanner-ray`, coordenadas en vivo, métricas de éxito y doble CTA), `SpecialtiesShowcase.astro` (tarjetas numeradas `01`–`04` con micro-hover menta), `TechnologyDiagnostics.astro` (6 módulos tecnológicos: tomografía 0.075 mm, escáner intraoral HD, CAD/CAM in-house, flujo laminar HEPA, sedación consciente), `MedicalTeam.astro` (cuadro médico con matrículas M.N./M.P.), `PatientJourney.astro` (4 fases cronológicas `+20 Países · Un Solo Destino`), `FacilitiesShowcase.astro` (quirófanos y suites certificadas), `ClinicalReviews.astro` (casos documentados con 5.0 ★ y validación ética), `BookingScheduler.astro` (formulario de triage, aranceles transparentes en `$X ARS`, botón WhatsApp y Calendly), `Footer.astro` (normativa sanitaria, guardia 24/7 y Ley 25.326) y `ThemeSwitcher.astro` (4 paletas de quirófano en vivo con persistencia y WhatsApp).
  - **Retrocompatibilidad & Verificación:** Preservado contrato `site.json` y retrocompatibilidad en `order.ts`; demo `sites/demo-clinica` compilada (`79.8 KB` HTML, `1.87 KB` JS propio), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones y 0 advisories, 17 tests unitarios en template y 55 tests globales en verde. Tags inmutables `template/clinica@2.0.0` y `template/architectural-prestige@2.0.0` fijados.
- [2026-10-22] Duplicación Integral REA de Vetter Consulting (`templates/corporativo@2.0.0` — Ticket 22):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM, bundle, CSS variables (`--black: #090909; --white: #f4f4f4; --orange: #ff891d; --dark-grey: #151515; --standard-grey: #212121;`), assets SVG de ajedrez corporativo (`king`, `pferd`, `bauer`, `springer`, `building-shield`, `money-bill`, `user-tie`) y fuentes originales `Neue Montreal` (Bold, SemiBold, Medium, Regular) en `.reports/rea/corporativo/`.
  - **Arquitectura Propia (`v2.0.0`):** Construidos componentes exclusivos de Vetter Consulting: `Header.astro` (isotipo de rey de ajedrez, badge "DISPONIBILIDAD DIRECTA Q4", navegación y CTA), `Hero.astro` (cuadrícula estilo ajedrez con Speed Chess Clock widget táctico, matriz de 4 métricas financieras y titulares de alto impacto), `ui/Button.astro` (botón táctico con animación de doble capa deslizante en vertical y flecha oblicua), `StrategicGrid.astro` (6 bloques modulares con bordes de 1px en `#262626` para áreas críticas), `ConsultingRoadmap.astro` (timeline táctica de 4 fases con línea central y entregables), `RoiMetrics.astro` (casos de estudio con comparativa antes/después de directores reales, cruces rojas vs checks dorados e impacto financiero verificado), `BookingSection.astro` (3 pasos de agendamiento y reserva directa Calendly/WhatsApp), `Footer.astro` (cumplimiento Ley 25.326 y enlaces ejecutivos) y `ThemeSwitcher.astro` (4 paletas ejecutivas en vivo con persistencia y WhatsApp).
  - **Retrocompatibilidad & Verificación:** Preservado contrato `site.json` y retrocompatibilidad en `order.ts` y `sections.ts`; demo `sites/demo-corporativo` compilada (`61.0 KB` HTML, `1.87 KB` JS propio), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde. Tags inmutables `template/corporativo@2.0.0` y `template/high-ticket-consulting@2.0.0` fijados.
- [2026-10-22] Duplicación Integral REA de Think Company (`templates/tech@1.0.0` — Ticket 23):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM, stylesheets (`style.css` 294 KB), icon sprite SVG (`icon-sprite.svg` 92 KB), 45 scripts en `.reports/rea/tech/scripts/` y fuentes originales `Bagoss` (Bold, SemiBold, Medium, Regular), `ABC Diatype` (Bold, Regular) y `Space Mono` (Regular) en `.reports/rea/tech/fonts/`.
  - **Arquitectura Propia (`v1.0.0`):** Construidos componentes exclusivos de Think Company bajo el arquetipo `tech-editorial-system`: `Header.astro` (logo SVG, badge técnico, navegación y CTA), `Hero.astro` (composición split con runway, titular en `Bagoss`, y consola interactiva de diagnóstico de sistemas con telemetría en vivo), `ui/Button.astro` (botón con animación dual-arrow en SVG y variante frosted), `SystemChallenges.astro` (tarjetas interactivas de deuda técnica y arquitectura), `TransformationPhases.astro` (roadmap de modernización en 4 fases), `ClientCaseStudies.astro` (casos de estudio con ROI cuantitativo medible), `DiscoveryBooking.astro` (agendamiento de descubrimiento con canvas dots grid, honorarios en `$1.250.000 ARS`, garantía Hormozi y links directos a Calendly y WhatsApp), `Footer.astro` (diseño institucional técnico con cumplimiento Ley 25.326) y `ThemeSwitcher.astro` (4 paletas en vivo: Think Vanilla `#fdffee`/`#031b36`/`#ff2c17`, Obsidian Terminal, Digital Cyan, Electric Violet).
  - **Retrocompatibilidad & Verificación:** Preservado contrato `site.json` y aliases retrocompatibles en `sections.ts`; demo `sites/demo-tech` compilada (`61.7 KB` HTML, `1.87 KB` JS propio), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde. Tags inmutables `template/tech@1.0.0` y `template/tech-editorial-system@1.0.0` fijados.
- [2026-10-23] Duplicación Integral REA de The Performance Lab (`templates/deportes@1.0.0` — Ticket 24):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM (`index-raw.html` 275 KB), `style.css` (37 KB), `page.json` (1.2 MB), `screenshot.json` (341 KB), scripts en `.reports/rea/deportes/scripts/` y fuentes originales `display` (Regular, Medium, Bold), `diatype` y `mono` descargadas y self-hosteadas en `public/fonts/`. Paleta 60-30-10 auténtica: Dark Carbon (`#0f1419`), Blanco Puro (`#ffffff`), Kinetic Emerald Green (`#10b981`), Gris Grafito (`#1f2937`) y acento Performance Red (`#ff350d`).
  - **Arquitectura Propia (`v1.0.0`):** Construidos componentes exclusivos bajo el arquetipo `kinetic-performance`: `Header.astro` (isotipo crosshair SVG `0 0 40 40`, badge de telemetría de laboratorio, navegación y CTA), `Hero.astro` (titular display masivo, consola de diagnóstico de rendimiento atlético con métricas VO2 Max, RSI, Peak Power Output, asimetría bilateral y doble CTA angular), `ui/Button.astro` (botón angular con aceleración `cubic-bezier(0.22, 1, 0.36, 1)` y flecha deportiva), `AthleticAssessment.astro` (4 modos de falla de rendimiento y estancamiento con protocolos de ciencia del deporte), `TrainingPeriodization.astro` (metodología de periodización y VBT en 4 fases), `AthleteTransformations.astro` (récords personales con datos cuantitativos antes/después y testimonios de atletas verificados 5.0 ★), `TrialBooking.astro` (sesión de testeo biomecánico de 90 min en `$89.000 ARS`, garantía de impacto Hormozi y links directos a Calendly y WhatsApp), `Faq.astro` (acordeones atléticos), `FinalCta.astro`, `Footer.astro` (Ley 25.326) y `ThemeSwitcher.astro` (4 esquemas en vivo con persistencia y WhatsApp dinámico).
  - **Retrocompatibilidad & Verificación:** Normalización canónica de aliases en `order.ts` para evitar renders duplicados; demo `sites/demo-deportes` compilada (`62.2 KB` HTML, `1.87 KB` JS propio), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones y 0 advisories, 17 tests unitarios en template y 55 tests de la suite raíz 100% en verde. Activado Template 05 (`Kinetic Performance`) en `web/src/config.ts`. Tags inmutables `template/deportes@1.0.0` y `template/kinetic-performance@1.0.0` fijados.
- [2026-10-23] Duplicación Integral REA de Lipedema Guru (`templates/dermatologia@1.0.0` — Ticket 25):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM, paleta 60-30-10 (`#f8fafc`, `#0f172a`, `#0284c7`, `#e0f2fe`), fuentes self-hosteadas `GothicCompact`, `GroteskText`, `GroteskMedium` y glifos clínicos SVG originales en `public/`.
  - **Arquitectura Propia (`v1.0.0`):** Construidos componentes exclusivos bajo el arquetipo `clinical-pure`: `Header.astro` con horarios y teléfono, `Hero.astro` con badge y copy empático en tarjeta 28px, `ui/Button.astro`, `SymptomAssessment.astro` (6 síntomas y diagnóstico temprano), `TreatmentProtocol.astro` (diagnóstico vs quirúrgico), `ClinicalOutcomes.astro` (5 pilares con glifos SVG + testimonios 5.0 ★), `MedicalBooking.astro` (aranceles en `$89.000 ARS`, reversión de riesgo y links Calendly/WhatsApp), `Faq.astro`, `FinalCta.astro`, `Footer.astro` (matrícula y Ley 25.326) y `ThemeSwitcher.astro` (4 paletas clínicas en vivo).
  - **Demo & Auditoría:** Compilada `sites/demo-dermatologia/` (`62.6 KB` HTML, `2.06 KB` JS), `audit-site` 100% aprobada, capturas dual-viewport en `.reports/screenshots/demo-dermatologia/`, 17 tests unitarios en template y 55 tests globales en verde. Activado Template 02 en `web/src/config.ts`. Tags `template/dermatologia@1.0.0` y `template/clinical-pure@1.0.0` fijados.
- [2026-10-23] Duplicación Integral REA de Heavn One (`templates/producto@1.0.0` — Ticket 27):
  - **Inspección CDP Real (`rea-agents@6.7.0`):** Extraídos DOM de `heavn-lights.com` y landing de producto `pages/one-landingpage`, paleta 60-30-10 Deep Matte Black (`#0a0a0a`), Pure White (`#fafafa`), Laser Blue (`#2563eb`), Borde Metálico (`#27272a`). Fuentes auténticas `Averta` (`Open Sans` woff2 high performance) + `Space Mono` y activos oficiales de producto en `public/`.
  - **Arquitectura Propia (`v1.0.0`):** Construidos componentes exclusivos bajo el arquetipo `minimalist-hardware`: `Header.astro` (minimalismo técnico y selector de producto), `Hero.astro` (slider Kelvin 2.200K–6.500K en vivo, selector de 4 modos rápidos, métricas clave 10k Lux / 4.700 lm y prensa), `ui/Button.astro` (micro-borde metálico y halo óptico), `OpticalEngineering.astro` (HCL 2.0, triple emisor y curva circadiana), `MaterialsCraftsmanship.astro` (aluminio CNC 6061-T6, rodamiento suizo 360°, base Qi 15W + USB-C 18W y sensor CO2), `CustomerExperiences.astro` (CEOs de air up, ex Cisco y Recovery Coach, 5.0 ★ y premios Red Dot / German Design), `OrderCheckoutSection.astro` (configuración Stand vs Clamp, acabados Black vs Silver, precios en ARS, 5 años garantía, 30 días de prueba, WhatsApp y Calendly), `Faq.astro`, `FinalCta.astro`, `Footer.astro` (patentes y Ley 25.326) y `ThemeSwitcher.astro` (4 esquemas en vivo).
  - **Demo & Auditoría:** Compilada `sites/demo-producto/` (`60.3 KB` HTML, `3.64 KB` JS propio << 25 MB), `audit-site` 100% aprobada, `impeccable detect` con 0 anti-patrones, 14 tests unitarios en template y 55 tests de la suite raíz 100% en verde. Activado Template 12 (`Minimalist Hardware`) en `web/src/config.ts`. Tags inmutables `template/producto@1.0.0` y `template/minimalist-hardware@1.0.0` fijados.



