# 12: `template_version` de punta a punta y `--upgrade-template`

**What to build:** Cada ficha lleva `template_version: "{rubro}@x.y.z"`; el build usa esa versión resuelta desde tags de git (`template/{rubro}@x.y.z`), de modo que cambios en `/templates/` no alteran clientes existentes. El operador puede editar la versión en la ficha y recompilar, o forzar la última con `--upgrade-template`.

**Blocked by:** 08

**Status:** done

- [x] `generate-client-fiche` escribe `template_version` en toda ficha nueva; las fichas demo existentes lo reciben.
- [x] El build clona el template en la versión indicada (tag de git); si el tag no existe, falla con mensaje claro.
- [x] Editar `template_version` y recompilar cambia la versión usada.
- [x] `--upgrade-template` actualiza la ficha a la última versión y recompila.
- [x] Se crea el tag inicial `template/nutricionista@1.0.0`.
- [x] `tests/template-versioning.test.mjs` cubre: respeto de versión, aislamiento ante updates y upgrade explícito.
