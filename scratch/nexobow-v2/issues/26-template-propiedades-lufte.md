# 26: Template #08 REA — Lufte Propiedades & Bienes Raíces (`architectural-spaces`)

**What to build:**
Duplicar la web **ENTERA** de **Lufte** (`https://www.lufte.us/`) dentro de `templates/propiedades/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web inmobiliaria arquitectónica con su propia estructura, galerías espaciales y micro-interacciones.
- Paleta 60-30-10: Lienzo Mineral Tiza (`#fbfbf9`), Stone Ink profundo (`#1c1917`), Bronze Oak cálido (`#854d0e`), y Arena Neutra (`#e7e5e4`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Mismas fuentes originales de Lufte:** `Outfit` (sans geométrica insignia de arquitectura en lufte.us) + `Manrope` (Sans geométrica de especificaciones y planos).
  - **Fallback similar:** `Plus Jakarta Sans` / `Manrope` (misma proporción geométrica y prestancia arquitectónica).
- Componentes y secciones exclusivas de Lufte:
  - `Header.astro`: Barra flotante transparente con acento arquitectónico y botón para solicitar dossier / visita privada.
  - `Hero.astro`: Composición inmersiva de gran formato con datos del desarrollo/propiedad y llamada a agendar visita.
  - `Button.astro`: Botón minimalista de trazo fino con acentos bronce y flecha estilizada.
  - `PropertyShowcase.astro`: Galerías arquitectónicas con detalles constructivos, planos y renders interactivos.
  - `DevelopmentSpecs.astro`: Especificaciones técnicas de materiales, sostenibilidad y amenidades.
  - `InvestmentProcess.astro`: Fases de adquisición y asesoría financiera personalizada.
  - `PrivateTourBooking.astro`: Agendamiento directo de visita guiada presencial o virtual.
  - `Footer.astro`: Pie arquitectónico con sellos de certificación y contacto.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-propiedades/` y sincronizar a `https://preview.nexobow.site/demo-propiedades/`.
- Fijar tags git inmutables `template/propiedades@1.0.0` y `template/architectural-spaces@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/propiedades/` contiene la web ENTERA duplicada de Lufte mediante REA
- [ ] Tipografía: utiliza las fuentes exactas de la web a copiar (`Outfit` + `Manrope`) o fallback visualmente similar verificado (`Plus Jakarta Sans` / `Manrope`).
- [ ] Tests unitarios en `templates/propiedades/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-propiedades/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
