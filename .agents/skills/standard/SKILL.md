---
name: standard
description: "Estándar de calidad estética y de interacción NexoBow (estilo Delta Cafés / Burocratik). Define animaciones, interacción 3D, tipografía y rendimiento bajo Astro + Tailwind. Invocar obligatoriamente antes de audit-code en build-client-site y en desarrollo de landings."
tools: ["read_file", "write_to_file", "execute_command"]
---

# 💎 NexoBow Visual & Motion Standard (Delta Cafés Benchmark)

## Propósito y Contexto
Esta skill estandariza la excelencia visual, micro-interacciones de alto impacto y sensación inmersiva 3D inspiradas en la ingeniería web de **Delta Cafés** (diseñado por *Bürocratik*), adaptándolas rigurosamente a la arquitectura **Astro SSG + Tailwind CSS + Vanilla JS/GSAP** de NexoBow sin sacrificar velocidad ni violar la regla de "0 JS innecesario".

---

## 🏛️ Los 5 Pilares del Estándar

### 1. Identidad Tipográfica y Paleta "NexoBow"
- **Logo:** `Nexo` en negro (`#000000` / `#0a0a0a`) + `Bow` en violeta vibrante (`#DB1FFF`). Fuente: **Outfit Bold** (700/800).
- **Acento Primario:** Violeta eléctrico `#DB1FFF`. Gradientes dinámicos `from-[#DB1FFF] via-[#8B5CF6] to-[#6366F1]`.
- **Fondos:** Modo oscuro profundo (`#0b0b0e` a `#121118`) con destellos de malla radial (`radial-gradient`), o crema premium suave para secciones específicas.
- **Jerarquía:** Display typography grande con contrastes de peso, tracking ajustado (`tracking-tight`) e interlineado compacto (`leading-[1.05]`).

### 2. Micro-Interacciones de Botones (Büro Magnetic & Morph)
- Botones de doble capa tipo píldora (`rounded-full`) con cápsula interior de icono.
- En `hover`, expansión de ancho (`transition-all duration-300 cubic-bezier(0.19, 1, 0.22, 1)`), desplazamiento de etiqueta e inversión suave de icono (deslizamiento diagonal/horizontal).
- Brillo perimetral (`glow`) sutil mediante gradientes o borde translúcido con efecto glassmorphism (`backdrop-blur-md`).

### 3. Experiencia 3D y Mockup Interactivo
- **Enfoque Hormozi / NexoBow:** Mostrar el flujo real que genera dinero: **Mockup de smartphone 3D interactivo** mostrando la conversación de WhatsApp automatizada y la confirmación inmediata de la consulta en calendario.
- **Técnica 3D:** Transformaciones CSS 3D coordinadas con movimiento de mouse/giroscopio (`perspective(1000px) rotateX(...) rotateY(...)`) y capas flotantes con profundidad (`translateZ`), con fallback accesible y rendimiento a 60fps constante sin el peso desmedido de un runtime WebGL completo a menos que sea estrictamente necesario.
- **Animaciones de scroll:** Parallax multicapa con `IntersectionObserver` y aceleración por GPU (`will-change: transform`).

### 4. Suavidad y Fluidez de Navegación
- Header flotante tipo píldora desacoplado de los bordes con efecto *glassmorphism* (`backdrop-blur-xl bg-black/40 border border-white/10`).
- Transiciones de entrada escalonadas (`stagger`) al entrar en viewport para títulos, tarjetas y listas de beneficios.

### 5. Accesibilidad y Modo Reducido (Hard Rule)
- Todo efecto de rotación continua, parallax o gradiente animado **debe pausarse o anularse** si el usuario tiene activo `@media (prefers-reduced-motion: reduce)`.
- El contenido y la funcionalidad del embudo deben ser 100% legibles y operativos aun con JavaScript deshabilitado.

---

## 📋 Checklist de Verificación (Quality Gate)
Antes de certificar una landing:
1. [ ] ¿El logo cumple exactamente `Nexo` (negro/blanco según fondo) + `Bow` (`#DB1FFF`) en Outfit Bold?
2. [ ] ¿El Hero incluye el dispositivo interactivo con el flujo visual WhatsApp → Consultoría agendada?
3. [ ] ¿Los botones principales implementan la interacción de deslizamiento/glow tipo Büro?
4. [ ] ¿Se verificó `prefers-reduced-motion` en CSS y scripts?
5. [ ] ¿El build de Astro (`npm run build`) termina con 0 errores y el bundle es ultra-rápido?
6. [ ] ¿Cumple con la regla Hormozi (beneficio directo, copy voseo argentino profesional, cero humo)?

---

## 📚 Documentación Técnica Detallada
Para ver la ingeniería inversa completa de Delta Cafés (animaciones, Rive, GSAP, WebGL vs CSS 3D) y recetas de código, consultar [reference.md](reference.md).
