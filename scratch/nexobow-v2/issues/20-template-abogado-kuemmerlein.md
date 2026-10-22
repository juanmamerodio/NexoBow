# Ticket 20: Template #02 REA — Kümmerlein Abogacía & Notaría (`obsidian-authority`)
> Archivo: `.scratch/nexobow-v2/issues/20-template-abogado-kuemmerlein.md`  
> Estado: `ready-for-agent`  
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
- **Tipografías:** `Space Grotesk` (titulares de impacto brutalista con tracking condensado) + `Inter` (sans de lectura legal clara).
- **Componentes y Secciones Propias de Kümmerlein:**
  - `Header.astro`: Navbar sobria con isotipo institucional, navegación por áreas de práctica y llamada de contacto.
  - `Hero.astro`: Composición asimétrica brutalista (`type__header_big`), micro-eyebrow en mayúsculas, esquinas con recorte SVG y botón signature.
  - `Button.astro`: Botón rectangular característico (`.button_wrap.square_style`) con esquinas de 8px, fondo `#f7f788` y dot indicador que se expande en escala al hacer hover.
  - `PracticeAreas.astro`: Módulo de áreas de práctica legal con navegación lateral y desglose detallado de servicios.
  - `Attorneys.astro`: Presentación de socios y directores del estudio con fichas de credenciales y trayectoria.
  - `ValueProposition.astro`: Bloque asimétrico de dos columnas (`cm_text two_col`) para autoridad y enfoque jurídico.
  - `CaseResults.astro`: Casos de éxito y transacciones relevantes sin violar secreto profesional.
  - `ConsultationCta.astro`: Agendamiento directo de consulta diagnóstica confidencial.
  - `Footer.astro`: Pie de página institucional con cumplimiento legal (Ley 25.326) y canales de contacto directo.
- **ThemeSwitcher.astro:** Integrado para alternar paletas en tiempo real en las previews con enlace directo a WhatsApp.
- **Política de JS:** Sin límite artificial de 35 KB; se admiten las micro-interacciones y animaciones de Kümmerlein respetando únicamente las restricciones de Cloudflare Pages (25 MB).

## 3. Criterios de Aceptación
- [ ] `templates/abogado/` contiene la web ENTERA duplicada de Kümmerlein mediante REA con sus propios componentes.
- [ ] `site.json` desacopla el copy y permite la inyección de cualquier cliente legal.
- [ ] Compila la demo oficial en `sites/demo-abogado/` con código de salida 0.
- [ ] Tests unitarios en `templates/abogado/tests/` 100% pasando.
- [ ] Tags git inmutables `template/abogado@1.0.0` y `template/obsidian-authority@1.0.0` fijados.
