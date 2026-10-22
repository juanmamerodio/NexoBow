# 22: Template #04 REA — Vetter Consulting Negocios B2B (`high-ticket-consulting`)

**What to build:**
Duplicar la web **ENTERA** de **Vetter Consulting** (`https://vetter-consulting-en.webflow.io/`) dentro de `templates/corporativo/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web completa e independiente con su propia arquitectura, componentes, animaciones y geometría.
- Atmósfera táctica corporativa: cuadrícula estilo tablero de ajedrez corporativo, alto contraste, métricas financieras de impacto y bloques modulares.
- Paleta 60-30-10: Onyx Black (`#090909`), Tiza pura (`#f4f4f4`), Tactical Orange (`#ff891d`), superficies cuadriculadas estilo ajedrez (`#151515` / `#1e1e1e`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Misma fuente original de Vetter Consulting:** `Neue Montreal` (Pangram Pangram, extraída de los assets web de Vetter).
  - **Fallback similar (si la original comercial no estuviera disponible):** `General Sans` o `Plus Jakarta Sans` (misma estructura neo-grotesca de alta gama) + `Inter` (sans de análisis financiero).
- Componentes y secciones exclusivas de Vetter:
  - `Header.astro`: Encabezado táctico de alto contraste con badge de estatus de consultoría.
  - `Hero.astro`: Cuadrícula estilo tablero de ajedrez corporativo con métricas de facturación y botón de llamada de diagnóstico.
  - `Button.astro`: Botón rectangular táctico con flecha oblicua y hover de aceleración.
  - `StrategicGrid.astro`: Bloques modulares con bordes de 1px en `#262626` para cuellos de botella de escalamiento y diagnóstico.
  - `ConsultingRoadmap.astro`: Fases de intervención estratégica y entregables concretos.
  - `RoiMetrics.astro`: Métricas de retorno sobre inversión y casos de estudio financieros.
  - `BookingSection.astro`: Agendamiento directo de llamada de diagnóstico.
  - `Footer.astro`: Pie corporativo de alta gama.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-corporativo/` y sincronizar a `https://preview.nexobow.site/demo-corporativo/`.
- Fijar tags git inmutables `template/corporativo@1.0.0` y `template/high-ticket-consulting@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/corporativo/` contiene la web ENTERA duplicada de Vetter Consulting mediante REA
- [ ] Tipografía: utiliza la fuente exacta de la web a copiar (`Neue Montreal`) o fallback visualmente similar verificado (`General Sans` / `Plus Jakarta Sans` + `Inter`).
- [ ] Tests unitarios en `templates/corporativo/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-corporativo/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
