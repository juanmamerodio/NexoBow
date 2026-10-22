# 16: Inspector REA y Extractor Estético (`scripts/rea-inspect.mjs`)

**What to build:** Una herramienta de inspección ejecutable por CLI y consumible programáticamente que, dada una URL de referencia o archivo HTML/CSS, analiza y extrae automáticamente los tokens de diseño esenciales: paleta dominante 60-30-10 (`fondo`, `tinta`, `primary`, `accent`), familias tipográficas identificadas (mapeando fuentes comerciales a alternativas libres de Google Fonts) y arquetipos de bordes/layout, devolviendo una estructura compatible con `site.json` (`tema`).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `node scripts/rea-inspect.mjs <url-o-path>` analiza HTML y CSS extrayendo la paleta de color 60-30-10 (`fondo`, `tinta`, `primary`, `accent`).
- [x] Detecta fuentes display y de cuerpo; si son comerciales cerradas, las mapea a fuentes abiertas de Google Fonts con enlaces válidos.
- [x] Devuelve un bloque JSON compatible con la sección `tema` de `site.json`.
- [x] Maneja fallos de red o HTML malformado con mensajes claros y sugerencia de fallback manual sin crashear.
- [x] Incluye suite de pruebas unitarias (`tests/rea-inspect.test.mjs`) que pasa al 100% verde en `npm test`.
