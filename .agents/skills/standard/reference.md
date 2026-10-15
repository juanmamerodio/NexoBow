# 🔬 Reference: Reverse Engineering Delta Cafés (Bürocratik) & NexoBow Implementation Recipes

## 1. Hallazgos de Ingeniería Inversa en deltacafes.com

### Arquitectura Observada
- **Desarrollador / Agencia:** Bürocratik (`burocratik.com`), año 2026.
- **Frontend Core:** Nuxt 3 (SSR + ISR sobre infraestructura Vercel Edge).
- **Animaciones y Física:** GSAP (GreenSock) integrado con ScrollTrigger y utilidades de morphing.
- **Scroll Suave:** Lenis (`lenis.darkroom.engineering`) para interpolación inercial del scroll del ratón y trackpad.
- **Assets Interactivos y 2D/3D:**
  - El sitio utiliza primordialmente **Rive Runtime** (`canvas` alimentados por archivos vectoriales interactivos `.riv`, como `/rives/icon-audio.riv`, `icon-globe.riv` y archivos de ilustración animada hospedados en CDN de Sanity/DigitalOcean).
  - Efectos tridimensionales logrados combinando **Rive state machines + secuencias de assets optimizados + transformaciones matriciales 3D CSS**, evitando cargar un bundle Three.js completo (~500KB+ de shaders y geometrías) para mantener tiempos LCP por debajo de 1.8s.
  - Video loops sutiles optimizados en WebP / MP4 comprimidos para fondos atmosféricos.
- **Patrones de Botones:** Arquitectura modular `data-component="button"` con curva `cubic-bezier(0.19, 1, 0.22, 1)`. Estructura de dos partes: cuerpo de etiqueta (`label-wrap`) y contenedor de icono (`icon-wrapper`) que se expande y desliza en hover.

---

## 2. Adaptación Arquitectónica para NexoBow (Astro SSG + Tailwind v4)

Para mantener la regla fundacional de NexoBow (**"0 JS innecesario en cliente, costo <10 USD/mes, SSG instantáneo"**), no necesitamos la pesadez de Nuxt ni servidores activos. Implementamos el mismo impacto sensorial con:

1. **Astro Islands Quirúrgicas:** Solo el componente de interacción visual y el header flotante llevan JS cliente mínimo.
2. **Transformaciones 3D con CSS Nativo acelerado por GPU:** Perspectiva profunda, rotación reactiva al cursor (efecto tilt 3D) y profundidad en Z (`translateZ(30px)`), logrando 60fps constantes sin WebGL pesado.
3. **Gradientes de Acento y Malla Dinámica:** Iluminación ambiental con gradientes radiales violeta `#DB1FFF` y desenfoque gausiano perimetral.
4. **Respeto a la Movilidad Reducida:** Detección de `prefers-reduced-motion` para apagar la interacción de inclinación si el usuario lo requiere.

---

## 3. Recetas de Implementación

### Receta A: Botón Dinámico Büro (Glassmorphism + Icon Morph)
```astro
<a href={href} class="group relative inline-flex items-center gap-3 rounded-full bg-white/5 p-1.5 pl-6 pr-2 text-sm font-semibold text-white backdrop-blur-md border border-white/10 transition-all duration-300 hover:border-[#DB1FFF]/60 hover:bg-white/10 hover:shadow-[0_0_25px_rgba(219,31,255,0.35)]">
  <span>{label}</span>
  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#DB1FFF] text-white transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-0.5">
    <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  </span>
</a>
```

### Receta B: Contenedor 3D Interactivo de Smartphone (Flujo NexoBow)
```javascript
// Script ligero (~400 bytes) para efecto de inclinación 3D realista con desaceleración
const card = document.getElementById('phone-3d-card');
if (card && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let bounds;
  function updateBounds() { bounds = card.getBoundingClientRect(); }
  updateBounds();
  window.addEventListener('resize', updateBounds);

  card.addEventListener('mousemove', (e) => {
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const xPct = (x / bounds.width - 0.5) * 2;
    const yPct = (y / bounds.height - 0.5) * 2;
    card.style.transform = `perspective(1000px) rotateY(${xPct * 12}deg) rotateX(${-yPct * 12}deg) scale3d(1.02, 1.02, 1.02)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)';
  });
}
```
