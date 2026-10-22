# 34: Skill y CLI objection-handler (Persuasión & Cierre por WhatsApp)

**What to build:** Un motor ejecutable interactivo y skill especializada (`objection-handler`) que proporciona respuestas persuasivas en voseo argentino para WhatsApp, estructuradas en 5 categorías de objeción y 3 ángulos psicológicos (Alivio & Costo de Oportunidad Hormozi, Reversión de Riesgo & 7 Días, Apalancamiento Audiovisual AfterBow), garantizando que el operador pueda responder al instante y cerrar prospectos.

**Blocked by:** 33: Higiene Anti-Bloat, Purga de Skills Obsoletas y Symlink Claude Code.

**Status:** done

- [x] Crear `.agents/skills/objection-handler/SKILL.md` con frontmatter YAML compatible con Claude Code / Antigravity, triggers explícitos, matriz de persuasión y reglas de voseo argentino.
- [x] Implementar `scripts/handle-objection.mjs` con soporte interactivo CLI y modo argumentos (`--objecion`, `--nicho`, `--nombre`, `--slug`).
- [x] Contemplar 5 categorías de objeción: `precio`, `instagram`, `tiempo`, `dudas_pacientes`, `decision`.
- [x] Generar 3 variantes de respuesta por objeción adaptadas a los precios de NexoBow (`$189.999 ARS` Setup / `$12.259 ARS` mes), la política de 7 días y la alianza con AfterBow.
- [x] Desarrollar suite de pruebas TDD `tests/objection-handler.test.mjs` verificando interpolación de datos, ángulos devueltos y cumplimiento sintáctico.
