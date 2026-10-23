# 24: Template #06 REA — The Performance Lab Deporte & Gym (`kinetic-performance`)

**What to build:**
Duplicar la web **ENTERA** de **The Performance Lab** (`https://theperformancelab.ca/`) dentro de `templates/deportes/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web atlética de alto impacto con su propia arquitectura, componentes dinámicos y animaciones de rendimiento.
- Paleta 60-30-10: Dark Carbon (`#0f1419`), Blanco Puro (`#ffffff`), Kinetic Emerald Green (`#10b981`), y Gris Grafito (`#1f2937`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Mismas fuentes originales de The Performance Lab:** `ABC Diatype` + display condensada atlética original de theperformancelab.ca.
  - **Fallback similar (si la original comercial no estuviera disponible):** `Barlow Semi Condensed` / `Teko` (Display dinámico deportivo de alto impacto) + `Inter` (Sans de lectura atlética).
- Componentes y secciones exclusivas de The Performance Lab:
  - `Header.astro`: Barra compacta atlética con botón de valoración de rendimiento / sesión de prueba.
  - `Hero.astro`: Tipografía masiva de alto rendimiento con métricas de ganancia física y llamada de evaluación atlética.
  - `Button.astro`: Botón con bordes angulares afilados, acento verde cinético y micro-animación de aceleración.
  - `AthleticAssessment.astro`: Módulo de evaluación de estancamiento físico, movilidad y patrones de fuerza.
  - `TrainingPeriodization.astro`: Método de periodización, acondicionamiento y ganancia funcional.
  - `AthleteTransformations.astro`: Resultados y registros personales de atletas y alumnos.
  - `TrialBooking.astro`: Agendamiento directo de sesión de diagnóstico atlético.
  - `Footer.astro`: Pie de alto impacto atlético.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-deportes/` y sincronizar a `https://preview.nexobow.site/demo-deportes/`.
- Fijar tags git inmutables `template/deportes@1.0.0` y `template/kinetic-performance@1.0.0`.

**Blocked by:**
None.

**Status:** done

- [x] `templates/deportes/` contiene la web ENTERA duplicada de The Performance Lab mediante REA
- [x] Tipografía: utiliza las fuentes exactas de la web a copiar (`Diatype` + display original) o fallback visualmente similar verificado (`Barlow Semi Condensed` / `Teko` + `Chivo`).
- [x] Tests unitarios en `templates/deportes/tests/` 100% pasando
- [x] Demo compilada en `sites/demo-deportes/` con código 0 y JS sin límite artificial
- [x] Tags git inmutables creados (`template/deportes@1.0.0` y `template/kinetic-performance@1.0.0`)
