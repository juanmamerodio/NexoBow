# MEMORY.md — Estado del Proyecto & Registro de Errores (NexoBow)

> **Identidad del Documento**: `memory.md` es la memoria operativa persistente del proyecto. Complementa a `brain.md` (conciencia técnica/arquitectura) y a `spec.md` (contrato del MVP). Se lee al iniciar cualquier sesión y se actualiza al cerrar una tarea.
>
> **Regla de oro para el agente**: ANTES de tocar cualquier código, leé `memory.md` + `brain.md` + `spec.md`. Si el trabajo toca identidad visual, leé la sección **Errores Documentados** de abajo: NexoBow ≠ prestador.

---

## 1. Mapa de Identidades (¡NO CONFUNDIR!)

Este repo contiene **DOS páginas web con identidades visuales TOTALMENTE DISTINTAS**:

| | **Página de NexoBow** (la agencia) | **Landing del prestador** (cliente) |
|---|---|---|
| Ubicación | `/web/` | `/templates/{rubro}/` → clon en `/sites/{cliente}/` |
| Quién es | La propia marca de la agencia | El profesional de servicios (nutricionista, psicólogo…) |
| Estilo | **Estándar NexoBow** (skill `standard`): oscuro, glassmorphism, violeta `#DB1FFF`, Outfit Bold, mockup 3D | **Estilo propio del rubro/cliente** — NO el de NexoBow. Debe ser OTRO estilo (a definir por el usuario) |
| Fuente de verdad | `web/src/config.ts` (datos fijos) | Ficha en `/clients/{N-rubro-nombre}.md` → inyectada vía `site.json` |
| Regla | No se genera desde ficha | Se genera desde ficha vía skill `build-client-site` |

**Distinción innegociable**: la landing del prestador **NUNCA** debe verse como la página de NexoBow. Cada una tiene su propia dirección estética.

---

## 2. Errores Documentados (Lecciones — NO repetir)

### ERROR-001 — Confundí la página de NexoBow con la del nutricionista (CRÍTICO)
- **Qué pasó**: al crear `templates/nutricionista/`, se partió de `web/` extrayendo los componentes de la página de NexoBow (`Hero`, `Problem`, `Steps`, `Pricing`) y parametrizándolos con tokens de tema. Resultado: el template del nutricionista heredó **toda la identidad visual de NexoBow** (modo oscuro profundo, glassmorphism, violeta `#DB1FFF`, mockup 3D del WhatsApp, tipografía Outfit).
- **Por qué estuvo mal**: el prestador debe tener una página **totalmente diferente** a la de la agencia. Usar el estándar NexoBow para el cliente diluye la marca del cliente y hace que todas las landings de la agencia parezcan clonadas entre sí.
- **Estado**: CORREGIDO el 2026-10-14 — el usuario definió la dirección estética de los templates: **referencia Delta Cafés** (deltacafes.com). El template fue reconstruido con estilo editorial (crema `#fcf3ed`, tinta café `#35221a`, rojo Delta `#e70025`, serif Fraunces + sans Archivo, marquee, itálicas serif). Sigue prohibido copiar componentes de `web/`.
- **Regla accionable**: `web/` = identidad NexoBow. `/templates/` = identidad del rubro/cliente (ahora: estilo Delta editorial). Jamás copiar componentes de `web/` a un template sin rediseñar el estilo.

### ERROR-002 — Asumí el estilo del template sin que el usuario lo pasara
- **Qué pasó**: se construyó el template del nutricionista con un estilo inventado (clon del de NexoBow) en lugar de esperar la dirección estética que el usuario quiere para sus landings.
- **Estado**: RESUELTO el 2026-10-14 — el usuario pasó la dirección estética: usar `https://deltacafes.com` como objetivo de diseño (ingeniería inversa con REA: paleta `#e70025`/`#35221a`/`#fcf3ed`, serif display `delta-season` → Fraunces, sans `trade-gothic` → Archivo, marquees, itálicas, números 01/02/03, botones pill con flecha).
- **Regla accionable**: si el usuario aún no definió el estilo de los templates, NO generarlo por defecto con el look de NexoBow. Preguntar / esperar. El usuario dijo: *"todavía no te pasé el estilo de la web que quiero como template"*.

---

## 3. Estado Actual del Proyecto (al 2026-10-14)

### 3.1 Lo que existe
- **`web/`** — Sitio de la agencia NexoBow (Astro SSG + Tailwind). Componentes: `Header`, `Hero`, `Problem`, `Steps`, `Pricing`, `Faq`, `FinalCta`, `Footer`. Datos fijos en `src/config.ts` (bookingUrl placeholder `#agendar`, `$200.000 ARS` setup / `$10.000 ARS` mensual). Es el prototipo donde nació el estándar visual NexoBow.
- **`templates/nutricionista/`** — Template Astro theme-driven con **estilo Delta editorial** (dirección estética del usuario, 2026-10-14): crema `#fcf3ed` + tinta café `#35221a` + rojo Delta `#e70025`; serif Fraunces (display con itálicas `*texto*`) + sans Archivo; marquee CSS-only, pasos numerados 01/02/03, botones pill con flecha deslizante, `prefers-reduced-motion`. Tokens en `src/site.json` (`tema`: primary/accent/fondo/tinta/fuente/fuente_sans/orden_secciones + `content`: hero/marquee/footer/final_cta/prestador/...), lógica pura en `src/theme.ts` (ars, luminance, onColor con tinta/fondo custom, themeVars, fontUrl) y `src/order.ts` (resolveOrder), componentes en `src/components/` (Header con nav filtrada por orden, Hero, Problem, Steps, Reviews, CaseStudy, Pricing, Faq, FinalCta, Footer + `ui/` con Lead, SectionHead, Button). **Gate de salud**: con `consentimiento_testimonios: false` solo se muestran reseñas con fuente "Google Maps" y `CaseStudy` se oculta. Tests `node:test` en `tests/` (16 tests verdes, sin dependencias). Build SSG estricto: 0 scripts en el HTML.
- **`.agents/skills/`** — `standard` (estándar estético NexoBow) y `build-client-site` (recreada y operativa). `audit-code` pendiente de recreación (T05).
- **`clients/`** — `_ficha-template.md` y `demo-nutri-sofia.md` (ficha demo de alta fidelidad para prospección).
- **`sites/`** — `demo-nutri-sofia/` (clon compilable de la demo comercial con 16 tests verdes y build SSG verificado).
- **`scripts/`** — `build-client-site.mjs` orquestador local para generar sitios de clientes en 1 comando.

### 3.2 Estado de tickets y automatización (ver `tickets.md` y `docs/plan_skills_pipeline_automatizado.md`)
- **Completados**: T01 (template `nutricionista` Delta Cafés + tests), T04 (skill y script `build-client-site` implementados y probados con éxito).
- **Demo Comercial Lista**: `sites/demo-nutri-sofia/` lista para deploy y prospección.
- **Plan Final Lead-to-Live Aprobado (2026-10-19)**: Ver `docs/plan_skills_pipeline_automatizado.md` — Orquestador maestro que encadena `scout-lead` (IG/Maps) → `generate-client-fiche` → `build-client-site` → `audit-code` → `deploy-cloudflare`.
- **Próximo a ejecutar**: Implementación de las 5 skills y scripts de la suite automatizada.
- **Ready-for-human**: T07 (cuestionario onboarding), T08 (planilla prospección), T11 (revisión legal).

---

## 4. Contratos y Fuentes de Verdad (cómo se consultan)

| Archivo | Rol | Cuándo leerlo |
|---|---|---|
| `brain.md` | Conciencia técnica + arquitectura agéntica (SDD, economía de tokens, estructura) | Inicio de sesión |
| `memory.md` | Estado del proyecto + errores documentados | Inicio de sesión |
| `spec.md` | Contrato del MVP (qué y por qué, criterios de aceptación) | Antes de planificar/codear |
| `GLOSSARY.md` | Términos de negocio (prestador, paciente, embudo, ficha…) | Antes de planificar/codear |
| `tickets.md` | Descomposición en tajadas verticales + estado | Antes de planificar/codear |
| `/clients/{N-rubro-nombre}.md` | FUENTE DE VERDAD de datos del cliente | Para generar/actualizar un sitio |
| `web/src/config.ts` | Datos fijos de la web de NexoBow | Para editar la web de la agencia |

---

## 5. Reglas Operativas Reforzadas (para no repetir errores)

1. **NexoBow ≠ prestador**: `web/` es la página de la agencia; `/templates/` + `/sites/` son las de los clientes. Identidades visuales independientes.
2. **No copiar componentes de `web/` a `templates/`** sin rediseño explícito de estilo aprobado por el usuario.
3. **No inventar el estilo**: si el usuario no definió la estética de un template, preguntar antes de generarla (gate Ask-First aplica también al diseño, no solo a los datos).
4. **`standard` = identidad NexoBow** (la agencia). Para templates de clientes, usar el estándar del rubro/cliente (a definir).
5. **Siempre** ejecutar `npm run build` al finalizar cambios (0 errores de compilación).
6. Auditoría de código (`audit-code`) siempre en sub-agente con sesión limpia.

---

## 6. Aprendizaje Aplicado (Self-Evolving Log)

- [2026-10-14] NexoBow (web/) y prestadores (templates/) son identidades visuales distintas: jamás clonar el look de web/ en un template.
- [2026-10-14] No asumir el estilo de un template: esperar la dirección estética del usuario (gate Ask-First de diseño).
- [2026-10-14] Dirección estética de templates definida: Delta Cafés (deltacafes.com) — editorial crema/café/rojo, serif con itálicas, marquee.
