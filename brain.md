# BRAIN.md — Conciencia Operativa & Arquitectura Agéntica de NexoBow

> **Identidad del Documento**: `brain.md` es la inteligencia central y la conciencia técnica de **NexoBow**. Define el "por qué", el "cómo" y los límites de ingeniería que rigen el comportamiento de los agentes autónomos (`AGENTS.md`), desarrolladores y orquestadores. No es un ejecutor directo, sino la fuente de verdad y fundamentación agéntica de la agencia.

---

## 1. Diagnóstico y Fundamento Técnico (El Manifiesto NexoBow)

### 1.1 El Problema que Resolvemos
Las agencias de software tradicionales sufren de **sangrado de recursos y lentitud de entrega**: proyectos a medida de 6 meses, chats gigantes de IA que alucinan código (*Vibe Coding* ciego) y fricción constante con clientes que no entienden de tecnología.

NexoBow opera bajo el modelo de **Agencia de Automatizaciones B2B de Alta Precisión**. Vendemos la resolución de cuellos de botella operativos y comerciales medibles para prestadores de servicios (nutricionistas, psicólogos, abogados) mediante sistemas agénticos modulares, mantenibles y ultra-económicos.

### 1.2 La Regla del Desacoplamiento (Data & Template Decoupling)
Para escalar sin quemar tokens ni presupuesto (< 10 USD/mes), NexoBow desacopla estrictamente tres capas:
1. **Templates (`/templates/`)**: Código base probado, estático y modular por rubro.
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
│   └── skills/                         <-- Biblioteca de Agent Skills
│       ├── standard/                   <-- Estándar estético y 3D (Delta Cafés Benchmark)
│       ├── build-client-site/          <-- Clona template + aplica ficha (incluye adaptación visual)
│       └── audit-code/
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

### 2026-10-19 — Alineación y Plan Final de Skills Automatizadas (`lead-to-live`)
- Completado ciclo `/grill-me` y redactado plan maestro `/plan` para automatización 100% de punta a punta.
- Pipeline acordado: `scout-lead` (extracción/assets) → `generate-client-fiche` (Hormozi/salud) → `build-client-site` (Astro/Delta Cafés) → `audit-code` (a11y/0 JS) → `deploy-cloudflare` (Wrangler/Pages).
- Decisiones ratificadas: fallback inteligente a WhatsApp si falta Calendly, descarga y persistencia local de fotos en `/assets/{slug}/`, proyectos Cloudflare Pages autónomos por cliente (`*.pages.dev` + subdominio).
- Plan documentado y versionado en `docs/plan_skills_pipeline_automatizado.md`. Listo para ejecución en próxima sesión.



