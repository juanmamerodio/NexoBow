# 13: Alinear la auditoría con templates PREMIUM (JS permitido en `/sites/`)

**What to build:** `web/` mantiene 0 JS estricto como benchmark. En `/sites/` (templates PREMIUM) la auditoría deja de fallar por cualquier `<script>` y pasa a validar un presupuesto de JS y la ausencia de scripts de terceros no declarados.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] La auditoría de `web/` sigue fallando con cualquier `<script>` ejecutable.
- [x] La auditoría de `/sites/` acepta JS propio dentro de un presupuesto de peso definido y reporta el peso.
- [x] Skill `audit-code`, `AGENTS.md` y `brain.md` dicen lo mismo (sin contradicciones sobre 0 JS en templates).
- [x] Tests cubren ambos modos.
