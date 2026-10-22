# 25: Template #07 REA — Lipedema Guru Dermatología & Médicos (`clinical-pure`)

**What to build:**
Duplicar la web **ENTERA** de **Lipedema Guru** (`https://lipedemaguru.com/`) dentro de `templates/dermatologia/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web dermatológica y clínica con su propia arquitectura, componentes médicos y espacio negativo empático.
- Paleta 60-30-10: Pure Clinical White (`#f8fafc`), Slate Navy profundo (`#0f172a`), Clinical Medical Blue (`#0284c7`), y Soft Ice (`#e0f2fe`).
- Tipografías abiertas: `Plus Jakarta Sans` (Display clínico empático) + `Inter` (Sans de divulgación médica).
- Componentes y secciones exclusivas de Lipedema Guru:
  - `Header.astro`: Barra médica con teléfono directo, horarios y agendamiento clínico.
  - `Hero.astro`: Enfoque empático en el diagnóstico temprano, signos clínicos y llamada hacia valoración médica.
  - `Button.astro`: Botón con bordes redondeados (rounded-lg/xl) en azul clínico con hover de confianza médica.
  - `SymptomAssessment.astro`: Módulo interactivo de síntomas clínicos, dolor crónico y detección temprana.
  - `TreatmentProtocol.astro`: Protocolos médicos conservadores y quirúrgicos de tratamiento.
  - `ClinicalOutcomes.astro`: Casos clínicos documentados y mejoría de calidad de vida.
  - `MedicalBooking.astro`: Agendamiento directo de consulta dermatológica y médica.
  - `Footer.astro`: Pie médico con aviso legal y normativo.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-dermatologia/` y sincronizar a `https://preview.nexobow.site/demo-dermatologia/`.
- Fijar tags git inmutables `template/dermatologia@1.0.0` y `template/clinical-pure@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/dermatologia/` contiene la web ENTERA duplicada de Lipedema Guru mediante REA
- [ ] Tests unitarios en `templates/dermatologia/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-dermatologia/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
