# 04: Verificación de Build y Suite E2E de Web Redesign (T-WEB-04)

**What to build:** Prueba automatizada end-to-end que ejecuta el build de Astro en la web de NexoBow y audita el HTML estático resultante validando las 12 secciones, ausencia total de `<script>`, paleta Soft-Obsidian, precios psicológicos y enlaces externos.

**Blocked by:** 02: Secciones de Diagnóstico, Embudo Interactivo, Catálogo (+10 Templates) y Calculadora ROI 0-JS (T-WEB-02), 03: Casos de Éxito, Escalera de 3 Planes + Bonos + AfterBow, "CREÁ TU SISTEMA BOW" y Founder Bio (T-WEB-03)

**Status:** ready-for-agent

- [ ] `npm run build` en la web de la agencia finaliza con código 0.
- [ ] Suite automatizada `node:test` pasa al 100% verificando 0 scripts en cliente y presencia de todos los bloques del spec.
