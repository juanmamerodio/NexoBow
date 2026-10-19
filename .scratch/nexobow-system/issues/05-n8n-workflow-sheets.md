# 05: Workflow de Automatización n8n & Sincronización con Google Sheets

**What to build:** El archivo de especificación y el workflow JSON exportable (`workflows/n8n-daily-prospecting.json`) listo para importar en una instancia de n8n (local o cloud). El workflow:
1. Dispara un cron diario matutino (08:00 AM).
2. Llama al endpoint de NexoBow System (`POST /api/batch-scout`).
3. Itera sobre los 15 leads devueltos e inserta/actualiza filas en la planilla de Google Sheets con columnas: `Fecha`, `Nombre Profesional`, `Teléfono`, `Rating`, `Dirección`, `URL Preview`, `Mensaje WhatsApp`, `Estado`.
4. Envía notificación de resumen a la web privada.

**Blocked by:** 01-batch-generator-previews.md, 03-server-api-auth.md

**Status:** ready-for-agent

- [ ] JSON exportable compatible con n8n v1.x+.
- [ ] Mapeo limpio de campos hacia el nodo de Google Sheets.
- [ ] Documentación de configuración paso a paso en `workflows/README.md` (credenciales de Google Sheets y URL del webhook de NexoBow System).
