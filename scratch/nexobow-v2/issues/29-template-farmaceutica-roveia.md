# 29: Template #11 REA — Roveia Farmacéutica & Biotecnología (`biotech-clarity`)

**What to build:**
Duplicar la web **ENTERA** de **Roveia** (`https://roveia.com/`) dentro de `templates/farmaceutica/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web de investigación clínica, biotecnología y formulaciones científicas con su propia espacialidad aséptica.
- Paleta 60-30-10: Laboratory Pure White (`#ffffff`), Deep Molecule Navy (`#0f172a`), Biotech Green (`#059669`), y Bio Cyan (`#06b6d4`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Misma fuente original de Roveia:** `Manrope` (sans geométrica de precisión científica utilizada en roveia.com).
  - **Fallback similar:** `Plus Jakarta Sans` (Display científico) + `Inter` (Sans de documentación técnica).
- Componentes y secciones exclusivas de Roveia:
  - `Header.astro`: Barra aséptica con selector de líneas terapéuticas y botón de contacto de I+D.
  - `Hero.astro`: Visualización molecular de alta resolución, acreditaciones farmacéuticas y llamada a consulta de formulación.
  - `Button.astro`: Botón redondeado de precisión clínica con micro-borde cian.
  - `TherapeuticPipelines.astro`: Módulo interactivo de etapas de desarrollo molecular y ensayos clínicos.
  - `LaboratoryStandards.astro`: Certificaciones GMP, bioseguridad y controles de pureza analítica.
  - `ScientificPublications.astro`: Ensayos revisados por pares y literatura médica respaldatoria.
  - `FormulationInquiry.astro`: Solicitud directa de dossier científico o acuerdos de distribución.
  - `Footer.astro`: Pie regulatorio farmacéutico.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-farmaceutica/` y sincronizar a `https://preview.nexobow.site/demo-farmaceutica/`.
- Fijar tags git inmutables `template/farmaceutica@1.0.0` y `template/biotech-clarity@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/farmaceutica/` contiene la web ENTERA duplicada de Roveia mediante REA
- [ ] Tipografía: utiliza la fuente exacta de la web a copiar (`Manrope`) o fallback visualmente similar verificado (`Plus Jakarta Sans` + `Inter`).
- [ ] Tests unitarios en `templates/farmaceutica/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-farmaceutica/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
