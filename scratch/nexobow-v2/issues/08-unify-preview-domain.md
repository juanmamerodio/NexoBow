# 08: Unificar el dominio `nexobow.site` y la URL pública de preview (prefactor)

**What to build:** Toda ficha, build, deploy y reporte del pipeline expone una única URL pública: `https://preview.nexobow.site/{slug}/` (con `/` final). No queda rastro de `nexobow.com` ni de `{slug}.pages.dev` como URL oficial.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `npm test` vuelve a 21/21 (el test de `formatLeadToSheetRow` espera `.site` y barra final).
- [x] Fichas generadas, `build-client-site`, `deploy-previews`, `deploy-cloudflare` y `lead-to-live` reportan la misma URL.
- [x] No quedan referencias a `preview.nexobow.com` ni a `subdominio: {slug}.nexobow.com` en scripts, tests ni plantilla de ficha.
- [x] `memory.md` documenta el dominio oficial.
