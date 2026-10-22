# 27: Template #09 REA — Heavn One Hardware & Producto Específico (`minimalist-hardware`)

**What to build:**
Duplicar la web **ENTERA** de **Heavn One** (`https://heavn-lights.com/`) dentro de `templates/producto/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web de ingeniería de producto de autor, con precisión óptica, rotaciones y micro-interacciones de hardware.
- Paleta 60-30-10: Deep Matte Black (`#0a0a0a`), Pure White (`#fafafa`), Laser Blue (`#2563eb`), y Borde Metálico (`#27272a`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Mismas fuentes originales de Heavn One:** `Averta` (`Averta-Light`, extraída de los assets web de heavn-lights.com) + `Open Sans`.
  - **Fallback similar (si la original comercial no estuviera disponible):** `Space Grotesk` o `Plus Jakarta Sans` (Precisión de ingeniería limpia y óptica) + `Inter` (Sans de lectura técnica).
- Componentes y secciones exclusivas de Heavn One:
  - `Header.astro`: Encabezado minimalista de hardware de precisión con selector de modelo y botón de pedido.
  - `Hero.astro`: Primer plano inmersivo del producto con iluminación dinámica y especificaciones clave.
  - `Button.astro`: Botón técnico con micro-borde metálico y hover óptico.
  - `OpticalEngineering.astro`: Módulo interactivo de características ópticas, espectro lumínico y biorritmo.
  - `MaterialsCraftsmanship.astro`: Despiece técnico, materiales de aviación y sostenibilidad.
  - `CustomerExperiences.astro`: Reseñas de estudios de diseño y profesionales.
  - `OrderCheckoutSection.astro`: Configuración de producto y agendamiento de demostración / pedido directo.
  - `Footer.astro`: Pie técnico con especificaciones de patente y garantías.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-producto/` y sincronizar a `https://preview.nexobow.site/demo-producto/`.
- Fijar tags git inmutables `template/producto@1.0.0` y `template/minimalist-hardware@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/producto/` contiene la web ENTERA duplicada de Heavn One mediante REA
- [ ] Tipografía: utiliza las fuentes exactas de la web a copiar (`Averta` + `Open Sans`) o fallback visualmente similar verificado (`Space Grotesk` / `Plus Jakarta Sans` + `Inter`).
- [ ] Tests unitarios en `templates/producto/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-producto/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
