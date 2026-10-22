# 33: Higiene Anti-Bloat, Purga de Skills Obsoletas y Symlink Claude Code

**What to build:** Eliminar la sobrecarga de contexto deshabilitando MCPs innecesarios en el servidor de lenguaje local, depurando skills huérfanas en `.agents/skills/` y configurando el symlink `.claude/skills` apuntando a `.agents/skills/` para que Claude Code y Antigravity descubran y ejecuten las mismas skills sin duplicar archivos ni tokens.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Deshabilitar `data-agent-kit-plugin` en el servidor de lenguaje local eliminando 11 servidores MCPs y 37 herramientas ajenas al proyecto.
- [x] Purgar de `.agents/skills/` las carpetas no operativas (`setup-matt-pocock-skills`, `teach`, `wayfinder`, `wait-what`, `to-questionnaire`).
- [x] Crear y verificar el enlace simbólico canónico `.claude/skills` apuntando a `../.agents/skills`.
- [x] Ejecutar la suite completa de tests (`npm test`) asegurando que los 39 tests se mantengan 100% en verde con código 0.
