# 19: Flujo REA End-to-End, Catálogo en `web/` y Verificación Integral

**What to build:** La integración completa de la skill `rea-template` en el ciclo conversacional y la actualización automática del catálogo oficial en `web/src/config.ts`, permitiendo que al solicitar un template por chat (ej: *"Creá el template psicólogo con https://ejemplo.com"*), el sistema ejecute la inspección, el andamiaje, la compilación de demo y marque el template como activo en el catálogo público de NexoBow.

**Blocked by:** 18 (Validación de Demo, Auditoría de Rendimiento JS y Tag Git Inmutable)

**Status:** ready-for-agent

- [ ] `web/src/config.ts` actualiza la entrada del catálogo para el rubro generado (`active: true`, `demoUrl: https://preview.nexobow.site/demo-{rubro}/`).
- [ ] El build de `web/` (`npm run build`) compila con 0 errores y mantiene 0 scripts en cliente.
- [ ] El flujo completo puede dispararse in-conversation siguiendo el SOP de `/.agents/skills/rea-template/SKILL.md`.
- [ ] La suite de tests completa (`npm test`) corre al 100% verde sin regresiones en ningún componente existente.
