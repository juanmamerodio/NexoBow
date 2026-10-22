# 31: Template #13 REA — Bluemore Yachting Viajes & Hotelería de Lujo (`oceanic-luxury`)

**What to build:**
Duplicar la web **ENTERA** de **Bluemore Yachting** (`https://bluemoreyachting.com/`) dentro de `templates/turismo/` mediante REA:
- **No es un re-skin de Delta Cafés.** Es una web náutica de ultralujo con su propia atmósfera marítima, galerías de yates y micro-interacciones de alta gama.
- Paleta 60-30-10: Midnight Deep Navy (`#030712`), Sail White (`#f9fafb`), Azure Wave (`#38bdf8`), y Acento Dorado Náutico (`#d97706`).
- Tipografías (Mismas fuentes de la web o fallback similar):
  - **Mismas fuentes originales de Bluemore Yachting:** `Big Caslon CC` (Display serif de ultralujo marítimo) + `Satoshi` (Sans de especificaciones náuticas de alta gama) + `Inter`.
  - **Fallback similar (si la original comercial no estuviera disponible):** `Playfair Display` o `Cinzel` (Serif de alta costura) + `Satoshi` / `Inter` (Sans de especificaciones).
- Componentes y secciones exclusivas de Bluemore Yachting:
  - `Header.astro`: Barra náutica minimalista con botón de reserva de chárter / asesor personal.
  - `Hero.astro`: Composición cinematográfica marina con ficha técnica del buque insignia y CTA a consulta de itinerario.
  - `Button.astro`: Botón de lujo con ribete dorado sutil y micro-interacción refinada.
  - `FleetShowcase.astro`: Catálogo de embarcaciones con especificaciones de eslora, camarotes y tripulación.
  - `CuratedDestinations.astro`: Rutas náuticas exclusivas, calas privadas y experiencias a medida.
  - `OnboardAmenities.astro`: Gastronomía a bordo, deportes acuáticos y servicio de conserjería 24/7.
  - `CharterConciergeBooking.astro`: Agendamiento directo con el broker de chárter vía calendario o WhatsApp VIP.
  - `Footer.astro`: Pie náutico institucional con términos marítimos internacionales.
- Desacoplamiento estricto con `site.json` (`content` + `tema` + `paletas_alternativas`).
- Integrar `ThemeSwitcher.astro` con 4 esquemas en vivo.
- Compilar la demo oficial en `sites/demo-turismo/` y sincronizar a `https://preview.nexobow.site/demo-turismo/`.
- Fijar tags git inmutables `template/turismo@1.0.0` y `template/oceanic-luxury@1.0.0`.

**Blocked by:**
None.

**Status:** ready-for-agent

- [ ] `templates/turismo/` contiene la web ENTERA duplicada de Bluemore Yachting mediante REA
- [ ] Tipografía: utiliza las fuentes exactas de la web a copiar (`Big Caslon CC` + `Satoshi`) o fallback visualmente similar verificado (`Playfair Display` / `Cinzel` + `Satoshi`).
- [ ] Tests unitarios en `templates/turismo/tests/` 100% pasando
- [ ] Demo compilada en `sites/demo-turismo/` con código 0 y JS sin límite artificial
- [ ] Tags git inmutables creados
