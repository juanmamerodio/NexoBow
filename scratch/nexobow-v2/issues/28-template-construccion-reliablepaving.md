# 28: Template #10 REA — Reliable Paving Construcción & Pavimentación (`industrial-authority`)

**What to build:**
Duplicar la web **ENTERA** de **Reliable Paving** (`https://reliablepaving.com/`) dentro de `templates/construccion/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web industrial y de infraestructura con su propia arquitectura pesada, métricas de obra y credenciales de maquinaria.
- Paleta 60-30-10: Asphalt Dark (`#1c1917`), Concrete White (`#fafaf9`), Safety Amber (`#f59e0b`), y Heavy Steel (`#44403c`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Mismas fuentes originales de Reliable Paving:** `Roboto` / `Tahoma` (extraídas de los assets de Reliable Paving).
  - **Fallback similar (para mayor impacto display industrial o si fuera necesario):** `Oswald` / `Chakra Petch` (Display de ingeniería pesada e industrial) + `Roboto` (Sans de lectura clara).
- Componentes y secciones exclusivas de Reliable Paving:
  - `Header.astro`: Encabezado industrial con teléfono de emergencias de obra y botón para solicitar cotización.
  - `Hero.astro`: Composición de gran formato con maquinaria pesada, tonelaje pavimentado y botón de solicitud de presupuesto.
  - `Button.astro`: Botón robusto de alto contraste en amarillo seguridad con hover industrial.
  - `IndustrialCapabilities.astro`: Módulo de maquinaria pesada, capacidad de asfaltado, hormigón y movimiento de suelos.
  - `CompletedProjects.astro`: Fichas de obras públicas y comerciales de gran escala con métricas de entrega.
  - `SafetyCertifications.astro`: Normativas de seguridad laboral, bioseguridad y certificaciones ISO.
  - `QuoteEstimationSection.astro`: Formulario / agendamiento directo de relevamiento topográfico y presupuesto en obra.
  - `Footer.astro`: Pie industrial con cobertura geográfica y datos corporativos.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-construccion/` y sincronizar a `https://preview.nexobow.site/demo-construccion/`.
- Fijar tags git inmutables `template/construccion@1.0.0` y `template/industrial-authority@1.0.0`.

**Blocked by:**
None.

**Status:** done

- [x] `templates/construccion/` contiene la web ENTERA duplicada de Reliable Paving mediante REA
- [x] Tipografía: utiliza las fuentes exactas de la web a copiar (`Roboto` / `Tahoma`) o fallback visualmente similar verificado (`Oswald` / `Chakra Petch` + `Barlow`).
- [x] Tests unitarios en `templates/construccion/tests/` 100% pasando
- [x] Demo compilada en `sites/demo-construccion/` con código 0 y JS sin límite artificial
- [x] Tags git inmutables creados (`template/construccion@1.0.0` y `template/industrial-authority@1.0.0`)
