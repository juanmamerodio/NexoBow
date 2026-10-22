# 17: Andamiaje Automatizado de Templates REA (`templates/{rubro}/`)

**What to build:** Un generador determinista que toma los tokens estéticos extraídos (o definidos) y el slug del nuevo rubro para andamiar una carpeta inmutable en `templates/{rubro}/` con su propio `site.json`, componentes visuales Astro adaptados al rubro, configuración Tailwind y tests de contrato sin copiar la identidad Soft-Obsidian de `web/`.

**Blocked by:** 16 (Inspector REA y Extractor Estético)

**Status:** ready-for-agent

- [ ] Se crea la estructura completa en `templates/{rubro}/` con `src/site.json`, componentes Astro, layout y `package.json`.
- [ ] `templates/{rubro}/src/site.json` respeta exactamente el esquema que consumen `build-client-site.mjs` y `generate-client-fiche.mjs` (`tema` + `content`).
- [ ] El diseño y paleta del template son distintivos del rubro (regla anti `ERROR-001`: cero copia de `web/`).
- [ ] Incluye suite de pruebas unitarias en `templates/{rubro}/tests/` validando integridad de `site.json`, tema y orden de secciones.
- [ ] `npm test` ejecuta los tests del nuevo template y se mantiene 100% verde.
