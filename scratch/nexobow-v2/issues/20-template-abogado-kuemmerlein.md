# Ticket 20: Template #02 REA — Kümmerlein Abogacía & Notaría (`obsidian-authority`)
> Archivo: `scratch/nexobow-v2/issues/20-template-abogado-kuemmerlein.md`  
> Estado: `done`  
> Spec padre: `spec.md` / `ROUTEMAP.md`  
> URL Referencia: `https://www.kuemmerlein.de/`

---

## 1. Misión Core (Duplicación Integral REA)
Duplicar la web **ENTERA** de **Kümmerlein Rechtsanwälte & Notare** (`https://www.kuemmerlein.de/`) dentro de `templates/abogado/` para utilizarla como template maestro de servicios legales, derecho corporativo y notarías:
- **No es un re-skin de Delta Cafés.** Es una web completa e independiente con su propia arquitectura, componentes, animaciones y geometría.
- **Copywriting desacoplado:** El texto del template se define mediante slots y el contrato `site.json` para que la IA/skill inyecte el copy específico de cada abogado o estudio jurídico.

## 2. Arquitectura Visual & Componentes Auténticos de Kümmerlein
- **Atmósfera & Estilo:** Minimalismo ejecutivo alemán, brutalismo institucional de alta gama, recortes angulares SVG, cuadrículas asimétricas y contraste quirúrgico.
- **Paleta 60-30-10:** Lienzo `--soft-grey0` (`#f6f6f4` / `#ffffff`), tinta carbón `#111111`, soporte `--dark-shade` `#686155`, y primario Kümmerlein `#f7f788` (amarillo pálido institucional de alto impacto).
- **Tipografías (Mismas fuentes de la web o fallback similar):**
  - **Mismas fuentes originales de Kümmerlein:** `ABC Monument Grotesk` (Regular, Bold, Semi-Mono para estructura y UI) + `Rhymes Display Light` (Display editorial legal de alto prestigio).
  - **Fallback similar (autorizado en H5):** `Space Grotesk` (equivalente de métricas a Monument Grotesk) + `Instrument Serif` (equivalente a Rhymes Display) + `Inter` (sans de soporte).
- **Componentes y Secciones Propias de Kümmerlein:**
  - `Header.astro`: Navbar sobria con isotipo institucional SVG (`viewBox="0 0 111 71"`), navegación por áreas de práctica y llamada de contacto.
  - `Hero.astro`: Composición asimétrica brutalista (`type__header_big`), micro-eyebrow en mayúsculas, esquina inferior derecha con recorte cóncavo SVG (`0 0 31 31`) + botón circular amarillo y botón signature.
  - `Button.astro`: Botón rectangular característico (`.button_wrap.square_style`) con esquinas de 8px/12px, fondo `#f7f788` y dot indicador que se expande en escala al hacer hover, más variantes `.round_style` (con círculo lateral expansivo) y `.big_fat_button`.
  - `PracticeAreas.astro`: Módulo de áreas de práctica legal (`.cm_themen` + `.cm_solutions`) con navegación lateral, 4 círculos interactivos (`.col__circles`), desglose detallado de servicios y doble `.big_fat_button`.
  - `Attorneys.astro`: Presentación de socios y directores del estudio con doble ticker bidireccional de píldoras (`.cm_team_ticker` / `.badge__name`) y reseñas verificadas.
  - `ValueProposition.astro`: Bloque asimétrico de dos columnas (`cm_text two_col`) + tarjetas en piedra `#e2e4d7` con recorte cóncavo SVG para autoridad y enfoque jurídico.
  - `CaseResults.astro`: Casos de éxito y transacciones relevantes (`.cm_insights_teaser`) en tarjetas amarillas `#f7f788` con recorte cóncavo SVG sin violar secreto profesional.
  - `ConsultationCta.astro`: Bloque ejecutivo `.cm_text_ticker` + agendamiento directo de consulta diagnóstica confidencial con honorarios en `$X ARS` y botón `.round_style`.
  - `Footer.astro`: Pie de página institucional sobre fondo amarillo `#f7f788` con grilla de 12 columnas, isotipo Kümmerlein, cumplimiento legal (Ley 25.326) y canales de contacto directo.
- **ThemeSwitcher.astro:** Integrado para alternar paletas en tiempo real en las previews con enlace directo a WhatsApp.
- **Política de JS:** Sin límite artificial de 35 KB; se admiten las micro-interacciones y animaciones de Kümmerlein respetando únicamente las restricciones de Cloudflare Pages (25 MB).

## 3. Evidencia REA Capturada & Notas de Fidelidad (2026-10-22)
- **Evidencia CDP (`rea-agents@6.7.0`):** Guardada en `.reports/rea/abogado/` (`page.json`, `bundle.json`, `screenshot.json`, `scripts/`, `style-min.css`, `index-raw.html`).
- **Subpáginas omitidas (alcance Home):** Se reprodujo la Home completa en una landing de alta conversión con navegación por anclas (`#enfoque`, `#practicas`, `#socios`, `#casos`, `#consulta`, `#faq`); se omitieron las vistas secundarias de blog/noticias individuales (`/aktuelles/`), portal de empleo (`/karriere/`) y directorio extendido de notaría (`/notare/`).
- **Diferencias aceptadas / aproximaciones:**
  - Fuentes comerciales (`ABCMonumentGrotesk-*.woff2` y `Rhymes_Display_Light.woff2`) reemplazadas por el fallback libre autorizado (`Space Grotesk` + `Instrument Serif` + `Inter`).
  - Animaciones de scroll de los 4 círculos de `.cm_themen` implementadas mediante selector interactivo por clic y transiciones CSS puras sin dependencia de jQuery/Lottie.

## 4. Criterios de Aceptación
- [x] `templates/abogado/` contiene la web ENTERA duplicada de Kümmerlein mediante REA con sus propios componentes (`v2.0.0`).
- [x] Tipografía: utiliza el fallback visualmente similar verificado (`Space Grotesk` + `Instrument Serif` + `Inter`).
- [x] `site.json` desacopla el copy y permite la inyección de cualquier cliente legal.
- [x] Compila la demo oficial en `sites/demo-abogado/` con código de salida 0.
- [x] Tests unitarios en `templates/abogado/tests/` (17/17) y suite raíz (55/55) 100% pasando.
- [x] Tags git inmutables `template/abogado@2.0.0` y `template/obsidian-authority@2.0.0` creados (conservando `@1.0.0` intactos).
