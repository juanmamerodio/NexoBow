# 03: Servidor Privado y API de NexoBow System

**What to build:** Un microservidor HTTP en Node.js (`server/index.mjs`) que sirva la interfaz web privada y provea endpoints autenticados vía Token de Autorización (`Authorization: Bearer <TOKEN>`) para:
1. `GET /api/leads` (retorna el historial de leads generados y estado de prospección).
2. `POST /api/batch-scout` (dispara el generador por lotes de 15 prospectos de forma asíncrona y devuelve status de tarea).
3. `POST /api/leads/:slug/status` (actualiza el estado de contacto del lead, ej: "contactado", "interesado", "descartado").

**Blocked by:** 01-batch-generator-previews.md

**Status:** ready-for-agent

- [ ] Middleware de autenticación simple contra variable de entorno `NEXOBOW_SYSTEM_KEY`.
- [ ] Respuestas JSON coherentes con manejo de errores y códigos HTTP adecuados (401 si no hay token, 200/202 para ejecución).
- [ ] Tests de integración con `node:test` validando seguridad (rechazo sin token) y endpoints.
