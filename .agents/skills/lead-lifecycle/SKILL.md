---
name: lead-lifecycle
description: "Gestiona el ciclo de vida de 7 días de los prospectos (/seguimiento-leads) y el motor de Mejora Continua sincronizado con Google Sheets (Col B = ID): detecta avances de etapa, genera links de WhatsApp de urgencia (<48hs) y purga demos vencidas (>=7d o Descartado)."
tools: ["read_file", "write_to_file", "execute_command"]
---

# ⏱️ Lead Lifecycle & Continuous Improvement (`/seguimiento-leads`)

## Propósito y Contexto
Mantiene el repositorio limpio, hace cumplir la **Política de Servidor Activo de 7 Días** y convierte los datos de Google Sheets (`'Prospección NexoBow'!B11:S1000`, donde **Columna B = ID**) en acciones comerciales de cierre y optimización de mensajes.

## Requisitos Previos y Entradas
- Planilla oficial de Google Sheets (`1fIr3Lug-AALrlGN-Lr3N1syYmMVYTTCaNy0vfXEH2qY`, pestaña `Prospección NexoBow`).
- Fichas locales correlativas en `/clients/{id}-{nombre}-{apellido}-{rubro}.md`.

## Paso a Paso de Ejecución (SOP)
1. **Sincronización y Chequeo de Vencimientos (TTL 7 Días)**:
   - Ejecutar `npm run lead-lifecycle` (`node scripts/lead-lifecycle.mjs --dry-run` primero si se desea previsualizar, o directo para aplicar).
   - **Renovación Automática**: Todo prospecto cuyo `Estado del Lead` (Columna J) haya avanzado en el Sheet respecto al `.md` renueva su ventana por +7 días.
   - **Ventana de Alerta (Días 5 y 6)**: Entregar al operador la lista de prospectos a `<48hs` de vencer junto con el link directo de WhatsApp pre-cargado con el mensaje de baja de servidor.
   - **Purga Automática (`>=7 días` o `"Descartado"`)**: Eliminar `/clients/{slug}.md`, `/sites/{slug}/` y `/assets/{slug}/` de prospectos vencidos o descartados.
2. **Análisis de Mejora Continua**:
   - Ejecutar `npm run continuous-improvement` (`node scripts/continuous-improvement.mjs`).
   - Reportar tasas de contacto, respuesta y reuniones por nicho y proponer ajustes concretos en el pitch de WhatsApp o en la selección de templates.

## Negaciones Explícitas (Qué NO hacer)
- **NUNCA** eliminar ni purgar `_ficha-template.md`, archivos que comiencen con `demo-` (`demo-nutri-sofia`) ni clientes con `estado: activo`.
- **NUNCA** escribir en la Columna A del Google Sheet; el rango de datos siempre ancla en la **Columna B** (`B11:S1000`).
