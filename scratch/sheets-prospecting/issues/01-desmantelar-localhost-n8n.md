# 01: Desmantelar Servidor Localhost, PWA y Workflows de n8n

**What to build:**
Eliminar de forma limpia y segura los archivos y configuraciones correspondientes a `server/`, `workflows/` y `public/` (PWA privada), eliminando dependencias innecesarias de `package.json` para que el repositorio no dependa de ningún servicio en ejecución local.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Eliminar directorio `server/` (index.mjs).
- [ ] Eliminar directorio `workflows/` (n8n-daily-prospecting.json y docs).
- [ ] Eliminar directorio `public/` (index.html, manifest.webmanifest).
- [ ] Limpiar scripts innecesarios en `package.json`.
- [ ] Verificar que la suite de tests existente siga pasando.
