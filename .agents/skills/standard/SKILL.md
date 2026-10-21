---
name: standard
description: "Estándar de calidad estética y de interacción NexoBow Soft-Obsidian (Minimalista Soft-Tech Ejecutivo inspirado en Bürocratik). Define paleta 60-30-10, tipografía, interacción 3D CSS y rendimiento 0-JS bajo Astro + Tailwind."
tools: ["read_file", "write_to_file", "execute_command"]
---

# 💎 NexoBow Visual & Motion Standard (Soft-Obsidian Executive Benchmark)

## Propósito y Contexto
Esta skill estandariza la excelencia visual, jerarquía ejecutiva y micro-interacciones 3D de la agencia **NexoBow** (`web/`), aplicando un sistema de diseño **Minimalista Soft-Tech Ejecutivo** con contrastes accesibles AAA/AA bajo la arquitectura **Astro SSG + Tailwind CSS (0 JS ejecutable en cliente)**.

> **IMPORTANTE (ERROR-001):** Este estándar aplica **exclusivamente** a la web de la agencia (`web/`). Las landings de los prestadores (`/templates/` y `/sites/`) utilizan sus propias direcciones estéticas por rubro (ej: Editorial Delta, Clinical Pure, Obsidian Authority).

---

## 🏛️ Los 5 Pilares del Estándar Soft-Obsidian

### 1. Identidad Tipográfica y Paleta "Soft-Obsidian" (Regla 60-30-10)
- **Logo:** `Nexo` en blanco cálido (`#F8F6FF`) + `Bow` en Hyper Magenta (`#BF40FA`). Fuente: **Outfit Bold** (700/800).
- **Canvas Principal (60% — `--color-ink`):** `#040607` (*Obsidian Black* — espacioso, profundo y sereno).
- **Superficie Elevada (`--color-ink-surface`):** `#0B0D12` con bordes sutiles.
- **Amortiguador Atmosférico (30% — `--color-velvet`):** `#5B2A62` (*Velvet Purple*) en opacidades del `10%` al `22%` para glows ambientales suaves, eliminando cualquier dureza neón.
- **Acento Secundario / Estructura (`--color-ultrasonic`):** `#4928C2` (*Ultrasonic Blue*) para bordes activos, conectores del sistema y badges técnicos.
- **Tono Intermedio / Énfasis Suave (`--color-periwinkle`):** `#E3D9FC` (*Periwinkle*) para subtítulos, palabras en itálica, íconos y microcopys de alta legibilidad (`14.2:1` sobre `#040607`).
- **Acento Primario de Conversión (10% — `--color-accent`):** `#BF40FA` (*Hyper Magenta*) reservado exclusivamente para CTAs principales, indicadores críticos y el `Bow` del isotipo.

### 2. Micro-Interacciones de Botones (Büro Magnetic & Morph)
- Botones de doble capa tipo píldora (`rounded-full`) con cápsula interior de icono en `#BF40FA`.
- En `hover`, expansión suave (`transition-all duration-300`), desplazamiento de etiqueta e icono, y borde activo `#4928C2` / `#BF40FA`.

### 3. Experiencia 3D CSS y Mockups Interactivos (0 JS)
- **Enfoque Hormozi / NexoBow:** Mostrar el flujo real que genera dinero: **Escena 3D CSS del embudo** (*Google Maps / IG → Landing `<0.8s` → WhatsApp Pre-filtrado → Turno Confirmado*) y controles interactivos (tabs de embudo y calculadora ROI) resueltos 100% con CSS (`:checked`, `perspective`, `rotateX/Y`).
- **Política 0 JS:** Prohibido inyectar `<script>` ejecutables en cliente cuando puede resolverse con HTML semántico (`<details>`, `<input type="radio" class="peer">`) y CSS moderno.

### 4. Suavidad y Fluidez de Navegación
- Header ejecutivo sticky con `backdrop-blur-xl bg-[#040607]/85 border-b border-[#4928C2]/20`, indicador de cupos activos y acceso directo a demo y planes.

### 5. Accesibilidad y Modo Reducido (Hard Rule)
- Todo efecto de rotación, flotación o gradiente animado **debe pausarse o anularse** si el usuario tiene activo `@media (prefers-reduced-motion: reduce)`.
- El contenido y la interactividad del embudo son 100% operativos con 0 bytes de JavaScript.

---

## 📋 Checklist de Verificación (Quality Gate)
Antes de certificar `web/`:
1. [ ] ¿El logo cumple `Nexo` (`#F8F6FF`) + `Bow` (`#BF40FA`) en Outfit Bold y no queda rastro de `#DB1FFF`?
2. [ ] ¿El Hero incluye la escena 3D CSS con el flujo Maps/IG → Landing `<0.8s` → WhatsApp → Turno?
3. [ ] ¿Los componentes interactivos (`InteractiveFunnel`, `RoiCalculator`, `Faq`) funcionan con 0 `<script>` en cliente?
4. [ ] ¿Se verificó `prefers-reduced-motion` en CSS?
5. [ ] ¿El build de Astro (`npm run build`) termina con 0 errores y 0 etiquetas `<script>`?
6. [ ] ¿Cumple con la regla Hormozi (precios psicológicos en ARS, bonos, urgencia real de 7 días, voseo argentino profesional)?
