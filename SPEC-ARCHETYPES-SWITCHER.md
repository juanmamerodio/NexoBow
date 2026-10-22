# 📋 SPEC: Desacoplamiento de Arquetipos Visuales & Theme Switcher Anti-Rebote

> **Fase del Ciclo**: 2. SPECIFICATION (`/to-spec`)
> **Objetivo**: Implementar los dos cambios más críticos e inmediatos en el pipeline de NexoBow antes de construir los 9 templates REA restantes:
> 1. Desacoplar el código de los templates de la profesión (introduciendo **Arquetipos Visuales** con retrocompatibilidad híbrida).
> 2. Incorporar el componente **Theme Switcher** en las previews de clientes con persistencia en `localStorage` y botón de cierre por WhatsApp para evitar rebotes por color.

---

## 1. Alcance y Criterios de Aceptación (Acceptance Criteria)

### AC-01: Desacoplamiento Híbrido de Arquetipos Visuales
- La ficha de cliente en `/clients/{slug}.md` debe soportar el campo `template_archetype` (ej: `editorial-classic`).
- Si `template_archetype` no está presente, debe inferirse con retrocompatibilidad a partir del campo `rubro` (ej: `rubro: nutricionista` mapea a `editorial-classic`).
- El orquestador `build-client-site.mjs` debe aceptar tanto nombres de arquetipo (`editorial-classic`) como nombres heredados de rubro (`nutricionista`), resolviendo la carpeta física correspondiente de manera transparente.
- Se mantiene el tag git `template/nutricionista@1.0.0` y se introduce el tag alias `template/editorial-classic@1.0.0`.
- La suite de 32 tests existentes debe seguir pasando al 100%.

### AC-02: Generación Dinámica de Paletas Alternativas en la Ficha
- En `generate-client-fiche.mjs`, además de la paleta principal asignada, se inyectan en el frontmatter 3 paletas precalibradas adicionales en la clave `paletas_alternativas`:
  1. *Paleta Principal* (ej: Editorial Delta / Terracotta / Cobalt / Sage).
  2. *Obsidian Gold* (Dark luxury ejecutivo: `#090D16` fondo, `#F1F5F9` tinta, `#D97706` primary, `#B45309` accent).
  3. *Clinical Cyan* (Pulcritud médica: `#F8FAFC` fondo, `#0F172A` tinta, `#0284C7` primary, `#38BDF8` accent).
  4. *Warm Sand* (Calidez terapéutica: `#FAF6F0` fondo, `#2C2523` tinta, `#B45309` primary, `#F59E0B` accent).
- Cada paleta contiene sus tokens CSS indispensables: `nombre`, `fondo`, `tinta`, `primary`, `accent`.

### AC-03: Componente `ThemeSwitcher.astro` en Sitios de Clientes
- Implementar un componente flotante discreto fijado en la esquina inferior derecha (`bottom-4 right-4 z-50`).
- Muestra una píldora colapsable con pequeñas muestras circulares de color (swatches) de cada paleta disponible.
- Al hacer clic en un swatch:
  - Aplica de forma inmediata las CSS custom properties en `:root` (`--color-primary`, `--color-accent`, `--color-bg`, `--color-ink`).
  - Guarda la selección en `localStorage.getItem("nexobow_theme")`.
  - Actualiza el enlace del botón *"Pedir esta versión"* para abrir WhatsApp hacia el número de Juanma con el texto:
    `"Hola Juanma! Estuve viendo la web demo y me encantó la combinación [Nombre de Paleta]. ¿Cómo seguimos para activarla?"`
- El script embebido debe ser ultra-liviano (< 2 KB, JS nativo vanilla sin dependencias) y cumplir estrictamente el presupuesto de JS propio de `/sites/` (`<= 35 KB`).
- Al cargar la página, si existe una preferencia guardada en `localStorage`, se aplica automáticamente antes del render para evitar parpadeos (FOUC).

### AC-04: Verificación y Auditoría Automatizada
- Nuevos tests unitarios en `tests/theme-switcher.test.mjs` y `tests/archetype-decoupling.test.mjs`.
- Ejecución completa de `npm test` verificando cero regresiones y compilación Astro SSG limpia.

---

## 2. Arquitectura de Datos y Contratos

### 2.1 Esquema YAML de la Ficha (`/clients/{slug}.md`)
```yaml
---
sheet_id: 22
rubro: nutricionista
template_archetype: editorial-classic
template_version: editorial-classic@1.0.0
slug: 22-alejandra-martinez-nutri
nombre: Lic. Alejandra Martínez
whatsapp: "+5491123456789"
subdominio: https://preview.nexobow.site/22-alejandra-martinez-nutri/
consentimiento_testimonios: false
tema:
  nombre: "Editorial Delta"
  fondo: "#fcf3ed"
  tinta: "#35221a"
  primary: "#e70025"
  accent: "#e3c1ad"
  fuente: "Fraunces"
  fuente_sans: "Archivo"
paletas_alternativas:
  - nombre: "Original (Editorial)"
    fondo: "#fcf3ed"
    tinta: "#35221a"
    primary: "#e70025"
    accent: "#e3c1ad"
  - nombre: "Obsidian Gold"
    fondo: "#090D16"
    tinta: "#F1F5F9"
    primary: "#D97706"
    accent: "#B45309"
  - nombre: "Clinical Cyan"
    fondo: "#F8FAFC"
    tinta: "#0F172A"
    primary: "#0284C7"
    accent: "#38BDF8"
  - nombre: "Warm Terracotta"
    fondo: "#FAF6F0"
    tinta: "#2C2523"
    primary: "#B45309"
    accent: "#F59E0B"
---
```

### 2.2 Inyección en `site.json`
`build-client-site.mjs` deep-mergea el bloque `paletas_alternativas` directamente en el `site.json` del sitio clonado, permitiendo que el componente `ThemeSwitcher.astro` lo consuma en tiempo de compilación.

---

## 3. Descomposición en Tickets de Implementación (TICKETS)

- **`TICK-01`**: Desacoplamiento de Arquetipos en Scripts de Build y Fichas (`scripts/build-client-site.mjs` y `scripts/generate-client-fiche.mjs` con soporte híbrido de `template_archetype` y alias retrocompatibles).
- **`TICK-02`**: Inyección de `paletas_alternativas` multivariantes en la generación de fichas.
- **`TICK-03`**: Componente `ThemeSwitcher.astro` con reactividad en CSS variables, persistencia en `localStorage` y botón de cierre por WhatsApp.
- **`TICK-04`**: Suite TDD de pruebas unitarias (`archetype-decoupling.test.mjs`, `theme-switcher.test.mjs`) y validación integral con `npm test`.
