# 02: Despliegue Unificado a Cloudflare Pages (preview.nexobow.com)

**What to build:** Adaptación o script de despliegue (`scripts/deploy-previews.mjs`) que tome el directorio `dist-previews/` con todas las subrutas de los clientes generados y lo sincronice/despliegue a un único proyecto de Cloudflare Pages (`nexobow-previews`) asignando el dominio custom `preview.nexobow.com`.

**Blocked by:** 01-batch-generator-previews.md

**Status:** ready-for-agent

- [ ] Soporte para despliegue incremental del directorio completo de previews con Wrangler CLI.
- [ ] Soporte para modo `--dry-run` para pruebas locales sin credenciales de Cloudflare.
- [ ] Verificación de que cada subruta `/{slug}/index.html` sea accesible y sirva código estático con 0 errores 404 de assets.
- [ ] Test unitario/integración validando el flujo de sync y comprobación de rutas.
