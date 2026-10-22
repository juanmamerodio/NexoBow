# 03: Actualización de Skills y Orquestación In-Conversation

**What to build:**
Actualizar la skill `scout-lead` (`.agents/skills/scout-lead/SKILL.md`) y el script `scripts/scout-lead.mjs` para soportar el flag o modo `--sync-sheets`, permitiendo que una consulta conversacional (ej. "Buscá abogados en Campana") extraiga hasta 10 prospectos elegibles sin web, descarte duplicados con el Sheet y los inserte automáticamente con sus links de WhatsApp prellenados.

**Blocked by:** 02: Módulo de Integración con Google Sheets y Filtro de Prospectos

**Status:** ready-for-agent

- [ ] Adaptar `scripts/scout-lead.mjs` para invocar `sheets-sync.mjs`.
- [ ] Documentar en `.agents/skills/scout-lead/SKILL.md` el SOP in-conversation.
- [ ] Notificar al usuario con métricas claras (total encontrados, duplicados omitidos, agregados al Sheet).
