# SPEC — Template #04: Consultoría Corporativa & High-Ticket B2B (`templates/corporativo/` / Arquetipo `high-ticket-consulting`)

## 1. Contexto & Diagnóstico
- **Referencia de Ingeniería Inversa (REA):** Vetter Consulting (`https://vetter-consulting-en.webflow.io/`).
- **Arquetipo Visual:** `high-ticket-consulting` (alias funcional `corporativo` y `consultor`).
- **Enfoque:** Arquitectura ejecutiva premium inspirada en la metáfora de velocidad y estrategia ("Speed Chess & Strategic Architecture"). Adaptada para consultores B2B, estudios de finanzas corporativas, asesores de M&A, operaciones y profesionales que venden servicios de alto valor ($1.000 - $10.000+ USD) en voseo argentino profesional.
- **Contrato Maestro:** Cumple estrictamente con la arquitectura de desacoplamiento de datos `site.json` (`tema` + `paletas_alternativas` + `content`), preservando la inmutabilidad y la retrocompatibilidad con `build-client-site.mjs`, `LeadStore` y `audit-site.mjs`.

---

## 2. Dirección de Arte & Tokens de Diseño (60-30-10)
- **Modo Predeterminado:** Dark Onyx Executive con acento Tactical Orange.
  - `fondo` (60%): `#090909` (Onyx Black profundo de lienzo).
  - `tinta` (30%): `#f4f4f4` (blanco tiza de alta legibilidad sobre fondos oscuros) y superficies alternadas en `#151515` / `#212121`.
  - `primary` (10%): `#ff891d` (Naranja táctico vibrante de alta conversión para CTAs y elementos activos).
  - `accent`: `#888888` (gris neutro para metadatos, tags y bordes milimétricos).
- **Tipografía Libre (Google Fonts):**
  - `fuente` (Display / Encabezados): `Plus Jakarta Sans` (geométrica moderna, look contemporáneo suizo idéntico a Neue Montreal de Vetter).
  - `fuente_sans` (Lectura / Párrafos): `Inter` (neutralidad, precisión y alta legibilidad).
- **Theme Switcher Anti-Rebote:**
  - 4 paletas precalibradas:
    1. *Original (Onyx & Orange)* (Default): `#090909` / `#f4f4f4` / `#ff891d` / `#888888`
    2. *Obsidian Gold*: `#0a0a0c` / `#f4f4f4` / `#eab308` / `#ca8a04`
    3. *Emerald Capital*: `#06140e` / `#f4f4f4` / `#10b981` / `#059669`
    4. *Royal Navy*: `#080e1a` / `#f4f4f4` / `#3b82f6` / `#2563eb`

---

## 3. Estructura de Secciones (`site.json`)
1. **Header / Navbar:** Logo minimalista, navegación anclada y botón primario *"Agendar llamada estratégica"*.
2. **Hero:** Propuesta de valor contundente (*"Estrategia, finanzas y escalamiento para empresas en crecimiento"*), métrica de autoridad destacada y botón de diagnóstico.
3. **Proof / Authority (What Top Leaders Say):** Testimonios estructurados de CEOs y directores con impacto cuantitativo.
4. **Services Matrix (Chess Grid):** Cuadrícula ejecutiva de 6 áreas de impacto estratégico alternando módulos oscuros (`#151515`) y grises (`#212121`) con bordes de 1px.
5. **Mission & Key Metrics:** 3 bloques con métricas masivas (ej: 5000+ Consultorías, 100% Digital, 44% menos fricción operativa).
6. **Commitment / Principles (4 Pilares):** Módulos de compromiso: respuesta en <60 min, confidencialidad estricta, diagnóstico accionable y visión 360°.
7. **Steps (Metodología de 3 Pasos):** 01. Diagnóstico de Fugas y Cash Flow, 02. Plan de Escalamiento a Medida, 03. Ejecución y Acompañamiento Semanal.
8. **Pricing / Esquema de Inversión:** Asesoría Estratégica puntual o Acompañamiento Mensual con entregables nítidos.
9. **FAQ:** Acordeones `<details>` con respuestas claras sobre confidencialidad (NDA), tiempos de retorno y metodología.
10. **Final CTA & Footer:** Cierre de alta autoridad con enlace a Calendly/WhatsApp y footer corporativo.

---

## 4. Presupuesto y Política de JS
- **Presupuesto de JS propio:** `<= 35 KB` (ThemeSwitcher ~1.8 KB).
- **0 scripts de terceros no declarados** (sin Lenis, sin Webflow IX2, sin trackers pesados).
- Animaciones y hover effects implementados 100% en CSS puro accesible (`prefers-reduced-motion`).

---

## 5. Criterios de Aceptación (TDD & Build)
- [ ] **AC-01:** Directorio `templates/corporativo/` creado como proyecto Astro autónomo, desacoplado y gobernado por `src/site.json`.
- [ ] **AC-02:** Los scripts `resolveTemplateArchetype` y `resolveTemplateSourceDirectory` en `scripts/build-client-site.mjs` y `scripts/generate-client-fiche.mjs` resuelven `corporativo`, `consultor` y `high-ticket-consulting`.
- [ ] **AC-03:** Suite de tests unitarios en `templates/corporativo/tests/` pasando con 0 errores.
- [ ] **AC-04:** Ficha demo `clients/demo-corporativo.md` ("Lic. Ignacio Valenzuela - Consultoría Financiera & Escalamiento B2B") creada con copy de alta conversión en voseo argentino.
- [ ] **AC-05:** Compilación exitosa vía `npm run build-site clients/demo-corporativo.md` generando `sites/demo-corporativo/`.
- [ ] **AC-06:** Auditoría `npm run audit-site sites/demo-corporativo` pasando en verde con JS propio `<= 35 KB` y contrastes accesibles.
- [ ] **AC-07:** Tags git inmutables creados: `template/corporativo@1.0.0` y `template/high-ticket-consulting@1.0.0`.
- [ ] **AC-08:** Entrada activada en el catálogo de `web/src/config.ts` con demo pública en `https://preview.nexobow.site/demo-corporativo/`.
- [ ] **AC-09:** Suite total de pruebas del repositorio `npm test` 100% verde.
