---
name: audit-code
description: "Auditoría de calidad de un clon de sitio (performance Astro, accesibilidad, contraste de CTAs, purga de clases Tailwind, gate standard). Ejecutar SIEMPRE en un sub-agente con sesión limpia, nunca en la sesión que generó el clon."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Audit Code

## Propósito y Contexto

Garantiza que un clon de `/sites/{slug}` cumple el estándar visual e interactivo de
`standard` (logo Nexo/Bow, flujo WhatsApp→agenda en el Hero, botones Büro,
`prefers-reduced-motion`), performance Astro, accesibilidad/contraste de CTAs y purga
de clases duplicadas de Tailwind. **Debe ejecutarse en un sub-agente con ventana de
contexto limpia** (anti sesgo de confirmación, regla 3.5 del `brain.md`).

## Requisitos Previos y Entradas

- Clon generado: `/sites/{slug}/` (recientemente generado por `build-client-site`).
- Leer el checklist del gate en `/.agents/skills/standard/SKILL.md` antes de auditar.

## Paso a Paso de Ejecución (SOP)

1. **Build:** correr `npm run build` en `/sites/{slug}` → 0 errores.
2. **Gate `standard`** (contra `standard/SKILL.md`):
   - Logo `Nexo` (blanco/negro según fondo) + `Bow` en `#DB1FFF`, fuente Outfit Bold.
   - Hero con dispositivo 3D mostrando el flujo WhatsApp → consultoría agendada.
   - Botones con micro-interacción Büro (expansión, glow, cápsula de icono).
   - `prefers-reduced-motion` respetado en CSS y scripts.
   - Regla Hormozi: copy voseo argentino, cero humo, beneficios directos.
3. **Accesibilidad y contraste de CTAs:**
   - Calcular contraste WCAG del color primario (ficha `tema.primary`) sobre los fondos
     usados (ink `#0a0a0c`, surfaces): texto normal ≥ 4.5:1, texto grande/bold ≥ 3:1.
     Si falla, reportar con el valor calculado (regla: `(L1+0.05)/(L2+0.05)`).
   - Verificar `lang="es-AR"`, `title`/`description` únicos, CTAs navegables por teclado
     (elementos `<a href>` reales, no `onclick`), sin JS requerido para agendar.
   - Reseñas/casos: solo Google Maps públicas o `consentimiento_testimonios: true`.
4. **Performance Astro:** verificar bundle sin JS innecesario (máx. 1 script de
   interacción: tilt 3D), página estática, sin requests bloqueantes salvo Google Fonts.
5. **Purga de clases Tailwind:** escanear `src/components/*.astro` y `src/layouts/*.astro`
   por clases duplicadas o utilitarias huérfanas; reportar sin reescribir el clon.
   (Si hay que corregir, el fix va al template y se regenera el clon.)
6. **Reporte:** escribir `docs/agents/audits/{slug}.md` con `report-template.md`
   completado (por ítem: ✅ / ⚠️ / ❌ + evidencia). Aprobar/rechazar con veredicto final.

## Negaciones Explícitas (Qué NO hacer)

- NO auditar en la misma sesión que generó el clon.
- NO editar el clon para corregir hallazgos: editar template/ficha y regenerar.
- NO aprobar si el contraste de CTAs falla o si hay testimonios sin consentimiento.
- NO inventar mediciones: contrastes y builds se calculan y citan.

## Salidas

- `docs/agents/audits/{slug}.md` con checklist completado y veredicto.
