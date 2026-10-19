# NexoBow — Workflow de Automatización Diaria n8n

Este workflow (`n8n-daily-prospecting.json`) automatiza la prospección matutina y sincronización con Google Sheets para el operador de NexoBow.

## Flujo de Ejecución:
1. **08:00 AM (Lunes a Viernes)**: Dispara la tarea de prospección.
2. **HTTP Request a NexoBow System (`POST /api/batch-scout`)**: Ejecuta el pipeline por lotes (`scripts/prospect-batch.mjs`) para generar las 15 fichas y landings demo compiladas en `dist-previews/{slug}/`.
3. **HTTP Request (`GET /api/leads`)**: Recupera la lista estructurada de los 15 prospectos listos.
4. **Google Sheets (`Append or Update`)**: Vuelca cada contacto con su URL de demo `https://preview.nexobow.com/{slug}` y el link de WhatsApp listo para envío en un tap.

## Configuración:
- Importar `n8n-daily-prospecting.json` en n8n (**Workflows** > **Import from File**).
- Configurar credencial de Google Sheets en el nodo final seleccionando tu Spreadsheet de "Prospección Diaria".
- Definir la variable de entorno `NEXOBOW_SYSTEM_KEY` en tu entorno de n8n para autenticar con la API de NexoBow System.
