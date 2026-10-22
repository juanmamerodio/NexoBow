# 02: Módulo de Integración con Google Sheets y Filtro de Prospectos

**What to build:**
Crear el módulo `scripts/sheets-sync.mjs` con tests TDD en `tests/sheets-sync.test.mjs`. Debe proveer funciones deterministas para:
1. Normalizar y formatear un prospecto al esquema oficial de 18 columnas de `Prospección NexoBow`.
2. Deduplicar prospectos nuevos comparando contra los nombres y teléfonos leídos desde el Google Sheet.
3. Filtrar prospectos que ya tengan sitio web propio o descartar redes sociales/directorios.
4. Limitar el lote a un máximo estricto de 10 prospectos.
5. Métodos para leer e insertar filas utilizando el CLI nativo `gsheets`.

**Blocked by:** 01: Desmantelar Servidor Localhost, PWA y Workflows de n8n

**Status:** ready-for-agent

- [ ] Implementar `tests/sheets-sync.test.mjs` con casos de prueba para formateo de 18 columnas, deduplicación y filtro de webs.
- [ ] Implementar `scripts/sheets-sync.mjs` satisfaciendo todos los tests en verde.
- [ ] Verificar compatibilidad con el ID del Google Sheet: `1fIr3Lug-AALrlGN-Lr3N1syYmMVYTTCaNy0vfXEH2qY`.
