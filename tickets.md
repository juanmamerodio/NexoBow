# Tickets — NexoBow System & B2B Flagship Web (v2)

> Descomposición en **tajadas verticales (tracer bullets)** del [`spec.md`](./spec.md), bajo el ciclo SDD de [`brain.md`](./brain.md): cada ticket corta un camino completo, verificable y testeable por sí mismo.
>
> **Convenciones:** vocabulario de [`GLOSSARY.md`](./GLOSSARY.md) (prestador, paciente, embudo, landing, ficha, template, clon, consultoría gratuita, caso de éxito). Nombres de componentes en inglés.

---

## Mapa de Dependencias (Grafo de Bloqueos)

```text
Frente A — Reestructuración B2B de web/ (Paleta Soft-Obsidian + 12 Secciones + 0 JS):
  01 [T-WEB-01: Tokens Soft-Obsidian + Config + Header/Hero 3D] (DONE)
       ├──► 02 [T-WEB-02: BeforeAfter + InteractiveFunnel + TemplateCatalog (+10) + RoiCalculator (0 JS)] (DONE)
       └──► 03 [T-WEB-03: CaseStudies + Pricing ($189.999/$12.259 + Bonos + AfterBow + 7d) + CreateBowSystem + Founder + Faq/Footer] (DONE)
                 └──► (02 + 03) ──► 04 [T-WEB-04: Suite E2E web-redesign.test.mjs & Build 0-JS Verification] (DONE)

Frente B — Sistema Core, Google Sheets (Col B), TTL 7 Días, Mejora Continua & Skills Autónomas:
  05 [T-SYS-01: Google Sheets Columna B (B11:S1000) + Slug Correlativo {id}-{nombre}-{apellido}-{rubro}.md] (DONE)
       └──► 06 [T-SYS-02: Motor TTL 7 Días (Alertas 5-6d + Purga >=7d/Descartado) + Mejora Continua Sheets] (DONE)
                 └──► 07 [T-SYS-03: Skills Autónomas (/editar-web-cliente, /seguimiento-leads, /next-step) + Docs] (DONE)
```

---

## Frente A: Reestructuración Integral de `web/`

### 01 (`T-WEB-01`) — Fundación Soft-Obsidian, Configuración Central y Hero Tracer Bullet
- **Blocked by:** None
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] Paleta Soft-Obsidian definida en `@theme` y aplicada en `Layout.astro` sin rastro del neón `#DB1FFF`.
  - [x] `config.ts` expone precios psicológicos (`$189.999 ARS` y `$12.259 ARS finales/mes`), planes, bonos, catálogo de 10 templates y links a AfterBow y CV del fundador.
  - [x] `Header.astro` y `Hero.astro` renderizan la promesa Hormozi y el mockup 3D CSS del flujo (`Maps/IG → Landing → WhatsApp → Turno`).

---

### 02 (`T-WEB-02`) — Secciones de Diagnóstico, Embudo Interactivo, Catálogo (+10 Templates) y Calculadora ROI (0 JS)
- **Blocked by:** `01 (T-WEB-01)`
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] `BeforeAfter.astro` contrasta los dolores reales de WhatsApp manual contra el embudo automatizado NexoBow.
  - [x] `InteractiveFunnel.astro` y `RoiCalculator.astro` funcionan de forma 100% interactiva usando `<input type="radio">` y CSS puro (`0 bytes` de JS cliente).
  - [x] `TemplateCatalog.astro` exhibe los 10 estilos exclusivos por rubro dejando claro que ningún prestador comparte diseño clónico.

---

### 03 (`T-WEB-03`) — Casos de Éxito, Escalera de 3 Planes + Bonos + AfterBow, "CREÁ TU SISTEMA BOW" y Founder Bio
- **Blocked by:** `01 (T-WEB-01)`
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] `Pricing.astro` muestra los 3 planes, los precios psicológicos en ARS, el Stack de 3 Bonos Hormozi, el link a `https://www.afterbow.com` y el banner de urgencia de 7 días de servidor activo.
  - [x] `CreateBowSystem.astro` presenta el mockup del aprovisionamiento autónomo por API (*"CREÁ TU SISTEMA BOW"* — Fase 2).
  - [x] `Founder.astro` presenta a Juanma Merodio con enlaces directos verificables a `https://juanmamerodio.github.io/cv` y `https://www.afterbow.com`.
  - [x] `index.astro` ensambla las 12 secciones en el orden psicológico del funnel.

---

### 04 (`T-WEB-04`) — Verificación de Build y Suite E2E de `web/` (`tests/web-redesign.test.mjs`)
- **Blocked by:** `02 (T-WEB-02)`, `03 (T-WEB-03)`
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] `npm run build` en `/web` finaliza con código 0.
  - [x] `node --test tests/web-redesign.test.mjs` pasa al 100% verificando 0 scripts en cliente y presencia de todos los bloques del spec.

---

## Frente B: Sistema Core, Google Sheets (`Col B`), Ciclo de 7 Días & Skills Autónomas

### 05 (`T-SYS-01`) — Alineación Google Sheets a Columna B (`B11:S1000`) y Correlatividad `{ID}-{nombre}-{apellido}-{rubro}.md`
- **Blocked by:** None
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] `scripts/sheets-sync.mjs` utiliza el rango `B11:S1000` / `B11` por defecto y exporta `buildCorrelativeSlug()`.
  - [x] `scripts/generate-client-fiche.mjs` inyecta `sheet_id`, `lead_status`, `created_at`, `last_activity_at` y `expires_at` (+7 días) en la ficha generada.
  - [x] `node --test tests/sheets-sync.test.mjs` pasa al 100%.

---

### 06 (`T-SYS-02`) — Motor de Expiración de 7 Días (Urgencia + Purga Automática) y Mejora Continua con Google Sheets
- **Blocked by:** `05 (T-SYS-01)`
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] `evaluateLeadLifecycle()` detecta leads renovados, leads en alerta (días 5–6) y leads expirados (`>=7 días` o `"Descartado"`), protegiendo siempre `_ficha-template.md` y `demo-*`.
  - [x] `computeSheetMetricsSummary()` calcula tasas de contacto, respuesta, reuniones y recomendaciones por nicho desde los datos del Sheet.
  - [x] `node --test tests/lead-lifecycle.test.mjs` pasa al 100%.

---

### 07 (`T-SYS-03`) — Paquete de Agent Skills Autónomas (`/editar-web-cliente`, `/seguimiento-leads`, `/next-step`) & Documentación
- **Blocked by:** `06 (T-SYS-02)`
- **Status:** `done`
- **Acceptance Criteria:**
  - [x] Existen `.agents/skills/edit-client-site/SKILL.md`, `.agents/skills/lead-lifecycle/SKILL.md` y `.agents/skills/flow-advisor/SKILL.md` con frontmatter YAML válido.
  - [x] `AGENTS.md`, `brain.md` y `memory.md` reflejan la nueva arquitectura, el ciclo de 7 días, la paleta Soft-Obsidian y el backlog REA de +10 templates.

---

## Histórico de Tickets Completados (Fases Previas)
- **T01, T04, T05, N01–N05**: Completados y verificados en suites `tests/pipeline-tanda1.test.mjs` y `tests/pipeline-e2e.test.mjs`.
