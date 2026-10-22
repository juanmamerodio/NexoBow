# 30: Template #12 REA — Tahiti Numérique Profesional Independiente (`island-creative-pure`)

**What to build:**
Duplicar la web **ENTERA** de **Tahiti Numérique** (`https://tahitinumerique.com/`) dentro de `templates/profesional/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web fresca, creativa y ágil de marca personal y servicios digitales con su propio diseño lúdico y elegante.
- Paleta 60-30-10: Lagoon Dark (`#0b0f19`), Fine Sand (`#f8fafc`), Pacific Cyan (`#06b6d4`), y Coral Accent (`#f43f5e`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Mismas fuentes originales de Tahiti Numérique:** `Instrument Sans` (sans contemporánea fresca) + `Instrument Serif` (Serif editorial refinada de marca personal) + `Inter`.
  - **Fallback similar:** `Outfit` (Display moderno y enérgico) + `Inter` (Sans de lectura ágil) + `Playfair Display`.
- Componentes y secciones exclusivas de Tahiti Numérique:
  - `Header.astro`: Barra flotante vibrante con enlaces a servicios y botón directo a agendar café virtual.
  - `Hero.astro`: Composición fresca de marca personal con badges de clientes internacionales y propuesta de valor directa.
  - `Button.astro`: Botón con bordes redondeados completos (pill), degradado suave cian-coral y hover elástico.
  - `ServicesCards.astro`: Tarjetas interactivas de servicios modulares (consultoría, desarrollo, estrategia).
  - `PortfolioShowcase.astro`: Proyectos destacados con capturas en vivo y testimonios de clientes.
  - `ClientTestimonials.astro`: Reseñas en primera persona con avatares y enlaces verificados.
  - `VirtualCoffeeBooking.astro`: Agendamiento directo de llamada exploratoria de 20 minutos con fallback a WhatsApp.
  - `Footer.astro`: Pie minimalista creativo con redes sociales y cumplimiento.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-profesional/` y sincronizar a `https://preview.nexobow.site/demo-profesional/`.
- Fijar tags git inmutables `template/profesional@1.0.0` y `template/island-creative-pure@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/profesional/` contiene la web ENTERA duplicada de Tahiti Numérique mediante REA
- [ ] Tipografía: utiliza las fuentes exactas de la web a copiar (`Instrument Sans` + `Instrument Serif`) o fallback visualmente similar verificado (`Outfit` + `Inter`).
- [ ] Tests unitarios en `templates/profesional/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-profesional/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
