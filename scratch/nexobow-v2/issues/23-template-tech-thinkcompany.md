# 23: Template #05 REA — Think Company Tech & Digital Systems (`tech-editorial-system`)

**What to build:**
Duplicar la web **ENTERA** de **Think Company** (`https://www.thinkcompany.com/`) dentro de `templates/tech/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web digital de sistemas complejos con su propia arquitectura, componentes interactivos y animaciones.
- Paleta 60-30-10: Canvas Vanilla claro (`#fdffee`), Navy Ink profundo (`#031b36`), Think Red de alto impacto (`#ff2c17`), y Soft Cyan (`#b6ffff`).
- Tipografías abiertas: `Syne` / `Familjen Grotesk` (Display de producto tecnológico) + `Space Grotesk` (Mono/Tech subheaders) + `Inter` (Sans de lectura).
- Componentes y secciones exclusivas de Think Company:
  - `Header.astro`: Barra digital minimalista con enlaces a casos de uso y botón de contacto de descubrimiento.
  - `Hero.astro`: Composición split editorial tech con foco en problemas de software complejos y botón directo a agendar demo.
  - `Button.astro`: Botón redondeado minimalista con micro-stroke y hover de elevación.
  - `SystemChallenges.astro`: Tarjetas interactivas de deuda técnica, fricción de sistemas legados y arquitectura digital.
  - `TransformationPhases.astro`: Showcase interactivo de transformación de sistemas y entregables de ingeniería.
  - `ClientCaseStudies.astro`: Casos de estudio interactivos de producto y ROI de desarrollo.
  - `DiscoveryBooking.astro`: Agendamiento directo de sesión de descubrimiento técnico.
  - `Footer.astro`: Pie técnico con especificaciones y canales directos.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-tech/` y sincronizar a `https://preview.nexobow.site/demo-tech/`.
- Fijar tags git inmutables `template/tech@1.0.0` y `template/tech-editorial-system@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/tech/` contiene la web ENTERA duplicada de Think Company mediante REA
- [ ] Tests unitarios en `templates/tech/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-tech/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
