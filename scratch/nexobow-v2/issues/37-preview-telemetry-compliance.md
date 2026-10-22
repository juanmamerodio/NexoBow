# 37: Skill y Snippet preview-telemetry (Telemetría Pasiva sin Cookies)

**What to build:** Un sistema de telemetría pasiva ultraliviano (<1 KB, 0 cookies, 100% acorde a la Ley 25.326 de Protección de Datos Personales) y skill (`preview-telemetry`) inyectable en las previews que envía pings anónimos cuando el lead abre la landing, interactúa con el ThemeSwitcher o hace clic en agendar por WhatsApp, eliminando la ceguera de apertura para el seguimiento comercial.

**Blocked by:** 33: Higiene Anti-Bloat, Purga de Skills Obsoletas y Symlink Claude Code.

**Status:** done

- [x] Crear `.agents/skills/preview-telemetry/SKILL.md` definiendo triggers, contrato de eventos y directivas éticas y legales.
- [x] Implementar módulo / generador `scripts/preview-telemetry.mjs` con payload de eventos anónimos (`preview_view`, `theme_switch`, `cta_click`).
- [x] Garantizar cero almacenamiento de IPs, cookies persistentes o trackers de terceros, asegurando cumplimiento estricto de la Ley 25.326.
- [x] Proveer snippet inyectable para `ThemeSwitcher.astro` y layouts de previews para registrar cambios de paleta y clics al CTA.
- [x] Desarrollar suite de pruebas TDD `tests/preview-telemetry.test.mjs` validando generación de payloads, tamaño en bytes (<1 KB) y contratos de eventos.
