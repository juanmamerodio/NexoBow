# 32: Template #14 REA — Ethos Music Academy Música & Clases (`harmonic-academy`)

**What to build:**
Duplicar la web **ENTERA** de **Ethos Music Academy** (`https://ethosmusicacademy.com/`) dentro de `templates/musica/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web artística y académica con su propia arquitectura musical, reproductores de audio, programas por instrumento y micro-interacciones acústicas.
- Paleta 60-30-10: Acoustic Stage Dark (`#18181b`), Ivory Key (`#f4f4f5`), Vibrant Tone Crimson (`#e11d48`), y Amber Stage Light (`#f59e0b`).
- Tipografías abiertas: `Syne` / `Clash Display` (Display contemporáneo y rítmico) + `Inter` (Sans de programas pedagógicos).
- Componentes y secciones exclusivas de Ethos Academy:
  - `Header.astro`: Encabezado con selector de instrumento/nivel y botón de clase de audición inicial.
  - `Hero.astro`: Composición escénica inmersiva con testimonios de alumnos, audio clips y llamada a agendar primera clase.
  - `Button.astro`: Botón con acento carmesí vibrante y micro-hover con efecto de pulsación armónica.
  - `InstrumentDisciplines.astro`: Módulos por instrumento (piano, guitarra, canto, producción musical) y niveles.
  - `FacultyArtists.astro`: Cuadro docente de músicos profesionales y directores de ensamble.
  - `StudentShowcases.astro`: Muestras en vivo, audiciones grabadas y evolución técnica de alumnos.
  - `AuditionTrialBooking.astro`: Agendamiento directo de clase diagnóstica o audición de nivel.
  - `Footer.astro`: Pie de academia con calendario de conciertos y términos legales.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-musica/` y sincronizar a `https://preview.nexobow.site/demo-musica/`.
- Fijar tags git inmutables `template/musica@1.0.0` y `template/harmonic-academy@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/musica/` contiene la web ENTERA duplicada de Ethos Music Academy mediante REA
- [ ] Tests unitarios en `templates/musica/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-musica/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
