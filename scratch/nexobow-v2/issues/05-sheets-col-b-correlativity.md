# 05: Alineación Google Sheets a Columna B (B11:S1000) y Correlatividad de Slugs (T-SYS-01)

**What to build:** Corrección del rango de lectura/escritura de Google Sheets para que comience en la **Columna B** (`'Prospección NexoBow'!B11:S1000`, donde `Col B = ID`) y función canónica `buildCorrelativeSlug({ id, displayName, nicho })` que nombra cada ficha y sitio como `{id}-{nombre}-{apellido}-{rubro}.md` (ej: `22-alejandra-martinez-nutri.md`) con metadatos de ciclo de vida en el YAML frontmatter.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] El sincronizador de Sheets utiliza el rango `B11:S1000` / `B11` por defecto y exporta `buildCorrelativeSlug()`.
- [ ] El generador de fichas inyecta `sheet_id`, `lead_status`, `created_at`, `last_activity_at` y `expires_at` (+7 días) en la ficha generada.
- [ ] Pruebas unitarias de sincronización y slugs correlativos pasan al 100%.
