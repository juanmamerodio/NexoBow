# 35: Skill y Pre-flight Check screenshot-qa (Playwright Dual-Viewport)

**What to build:** Un auditor visual automatizado y skill (`screenshot-qa`) con Playwright headless que valida que la landing preview cargue sin desbordes horizontales ni layout shifts tanto en móvil (`375px`) como en desktop (`1440px`), capturando evidencia visual en `.reports/screenshots/{slug}/` e integrándose como pre-flight check en el pipeline antes de enviar demos.

**Blocked by:** 33: Higiene Anti-Bloat, Purga de Skills Obsoletas y Symlink Claude Code.

**Status:** done

- [x] Crear `.agents/skills/screenshot-qa/SKILL.md` con especificación Claude Code / Antigravity para QA visual.
- [x] Implementar `scripts/screenshot-qa.mjs` con soporte para servidor estático local o URL pública (`https://preview.nexobow.site/{slug}/`).
- [x] Configurar doble viewport: Móvil (`375x812`) y Desktop (`1440x900`).
- [x] Implementar aserción automática de desborde horizontal (`scrollWidth <= innerWidth`) y elementos rotos.
- [x] Generar capturas de pantalla completa y above-the-fold en `.reports/screenshots/{slug}/`.
- [x] Integrar pre-flight check opcional o automático en `scripts/build-client-site.mjs` (con flag `--run-qa`).
- [x] Desarrollar suite de pruebas TDD `tests/screenshot-qa.test.mjs` con mocks deterministas verificando análisis de viewport y reporte.
