# 09: Capa de almacenamiento de leads `LeadStore` (prefactor)

**What to build:** Los scripts de prospección y ciclo de vida leen/escriben leads mediante una interfaz `LeadStore` con dos adaptadores: Google Sheets (el CLI `gsheets` de hoy) y uno en memoria para tests. Ningún script fuera del adaptador llama al CLI directamente. Deja lista la migración futura a Supabase/Firebase.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Existe la interfaz con operaciones de leer filas, leer último ID, agregar fila y actualizar celda.
- [x] Adaptador Sheets conserva el comportamiento actual (`B11:S1000`).
- [x] Adaptador en memoria usado por los tests existentes sin acceso a red.
- [x] `prospect-in-conversation`, `lead-lifecycle`, `continuous-improvement` y `sheets-sync` consumen la interfaz.
- [x] `npm test` sin regresiones.
