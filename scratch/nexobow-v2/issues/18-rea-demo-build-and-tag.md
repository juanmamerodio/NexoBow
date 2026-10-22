# 18: Validación de Demo, Auditoría de Rendimiento JS y Tag Git Inmutable

**What to build:** Un pipeline automatizado que genera una demo de validación en `sites/demo-{rubro}/` usando `build-client-site.mjs`, corre la auditoría de calidad técnica (`audit-site.mjs`) garantizando SSG estricto, presupuesto de JS propio `<= 35 KB` y 0 scripts de terceros no declarados, y fija el tag git inmutable `template/{rubro}@1.0.0`.

**Blocked by:** 17 (Andamiaje Automatizado de Templates REA)

**Status:** ready-for-agent

- [ ] Genera automáticamente la ficha sintética `clients/demo-{rubro}.md` con datos verosímiles en voseo argentino.
- [ ] Ejecuta `npm run build-site clients/demo-{rubro}.md` produciendo `sites/demo-{rubro}/dist/` sin errores de compilación Astro.
- [ ] `npm run audit-site sites/demo-{rubro}` valida presupuesto de JS `<= 35 KB` y cero scripts externos no declarados.
- [ ] Crea y valida el tag git inmutable `template/{rubro}@1.0.0` compatible con el sistema de lock `.template-lock.json`.
- [ ] Genera la preview unificada en `dist-previews/demo-{rubro}/` accesible para deploy.
