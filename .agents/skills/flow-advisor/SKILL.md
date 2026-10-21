---
name: flow-advisor
description: "Asesor unificado de flujo de desarrollo y operaciones (/next-step o /ask-matt): combina el ciclo SDD de Matt Pocock (prompts_structure.md), el estado de auditoría técnica (audit-code) y las métricas de Google Sheets para recomendar el siguiente paso exacto."
tools: ["read_file", "execute_command"]
---

# 🧭 Flow Advisor (`/next-step` · `/ask-matt`)

## Propósito y Contexto
Unifica la metodología de desarrollo agéntico de Matt Pocock (`/grill-me` → `/to-spec` → `/to-tickets` → `/implement` → `/code-review` en [`prompts_structure.md`](../../../prompts_structure.md)) con el estado operativo en vivo de NexoBow (`tickets.md`, `memory.md` y métricas de prospección en Google Sheets). Cuando el usuario pregunta *"¿cuál es el siguiente paso?"* o invoca `/next-step` / `/ask-matt`, esta skill diagnostica en segundos qué acción genera mayor retorno técnico o comercial.

## Paso a Paso de Ejecución (SOP)
1. **Diagnóstico del Ciclo SDD (Ingeniería)**:
   - Leer `tickets.md`, `spec.md` y `memory.md`.
   - Determinar en qué fase del Main Flow (`1. GRILL-ME`, `2. TO-SPEC`, `3. TO-TICKETS`, `4. IMPLEMENT`, `5. CODE-REVIEW`) se encuentra el repositorio.
   - Si hay cambios de código recientes sin auditar, recomendar o ejecutar `audit-code` / `code-review`.
2. **Diagnóstico del Ciclo Comercial (Operaciones & Leads)**:
   - Ejecutar en modo lectura `node scripts/lead-lifecycle.mjs --dry-run` y `node scripts/continuous-improvement.mjs`.
   - Detectar si existen prospectos en ventana crítica (días 5–6) o lotes pendientes de contacto.
3. **Recomendación Ejecutiva Accionable**:
   - Entregar al usuario:
     1. **Estado Actual**: Fase activa del flujo y salud de tests/builds.
     2. **Acción Técnica Recomendada**: El bloque de prompt exacto listo para copiar y pegar en la siguiente sesión limpia.
     3. **Acción Comercial Recomendada**: Seguimientos urgentes de WhatsApp o siguiente lote de prospección sugerido.
