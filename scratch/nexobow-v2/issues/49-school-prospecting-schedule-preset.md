# 49: Onboarding de Rutina Real Escuela + Prospección en `/admin/calendar` y Verificación E2E

**What to build:** Cuando el fundador abre `/admin/calendar` (`ScheduleView.tsx`) conectado a Supabase con `0` bloques cargados en `public.schedule_blocks`, visualiza el estado honesto `Supabase Live (0 bloques)` (sin bloques ficticios silenciosos) y un banner de onboarding de 1 clic (`"Cargar Rutina Escuela (07:30–13:00) + Prospección (17:00–17:45)"`) que siembra automáticamente en Supabase los 10 bloques recurrentes de Lunes a Viernes: cursada de Escuela por la mañana (`07:30`–`13:00`, categoría `"personal"`) y Sprint Diario de Prospección NexoBow por la tarde (`17:00`–`17:45`, categoría `"prospeccion"`). Cierra el ciclo de alineación verificando la suite E2E completa y el guardrail de 0 bytes de JS en la Home pública de `web/`.

**Blocked by:** 48: Verdad Única en `/admin` (0 Datos Fantasma) y Alineación de Tiers `routemap.md`.

**Status:** done

## Seams Under Test (`/tdd`)

- **Seam 1 (`SCHOOL_AND_PROSPECTING_PRESET`, `seedSchoolAndProspectingSchedule()` y `fetchScheduleBlocks()` en `web/src/lib/schedule.ts`):**
  - *Qué atrapa:* Que `SCHOOL_AND_PROSPECTING_PRESET` contenga exactamente 10 bloques de Lunes (`day_of_week: 1`) a Viernes (`day_of_week: 5`) sin solapamientos (`findOverlappingBlocks(SCHOOL_AND_PROSPECTING_PRESET)` retorna `[]`), con horarios exactos `07:30`–`13:00` (`"Cursada Escuela (Mañana)"`, `"personal"`) y `17:00`–`17:45` (`"Sprint Prospección NexoBow (45m)"`, `"prospeccion"`); que `fetchScheduleBlocks()` retorne `[]` con `isOffline: false` cuando Supabase devuelve `0` filas sin error; y que `seedSchoolAndProspectingSchedule()` inserte el lote en `public.schedule_blocks`.
  - *Qué omite:* Drag-and-drop visual en el navegador.
- **Seam 2 (Integración E2E & Guardrail 0-JS en `tests/admin-cockpit-e2e.test.mjs`):**
  - *Qué atrapa:* Consistencia de punta a punta entre los 3 tickets (47, 48 y 49), banner de 1 clic en `ScheduleView.tsx` cuando hay `0` bloques en vivo, y verificación de que `web/dist/index.html` mantiene estrictamente `0` etiquetas `<script>` ejecutables tras `npm --prefix web run build`.

## Preset Contract (`SCHOOL_AND_PROSPECTING_PRESET`)

```ts
// 10 bloques recurrentes (day_of_week: 1..5):
// 1) "Cursada Escuela (Mañana)" -> 07:30 a 13:00, category: "personal", is_recurring: true
// 2) "Sprint Prospección NexoBow (45m)" -> 17:00 a 17:45, category: "prospeccion", is_recurring: true
```

## Acceptance Criteria

- [x] **[RED]** Ampliar `tests/admin-schedule.test.mjs` y `tests/admin-cockpit-e2e.test.mjs` para verificar `SCHOOL_AND_PROSPECTING_PRESET` (10 bloques Lun–Vie, 0 solapamientos), `seedSchoolAndProspectingSchedule()`, el estado vacío real (`0` bloques cuando `error === null`) y el banner de 1 clic en `ScheduleView.tsx`, confirmando que fallen en rojo antes de implementar.
- [x] **[GREEN]** Implementar `SCHOOL_AND_PROSPECTING_PRESET`, `seedSchoolAndProspectingSchedule(client)` y la distinción `isOffline` en `fetchScheduleBlocks()` dentro de `web/src/lib/schedule.ts`.
- [x] **[GREEN]** Actualizar `web/src/components/admin/views/ScheduleView.tsx` para mostrar el badge `Supabase Live (0 bloques)` cuando la tabla está vacía en vivo y el banner de acción de 1 clic `"Cargar Rutina Escuela (07:30–13:00) + Prospección (17:00–17:45)"`.
- [x] **[GREEN]** Actualizar la documentación viva (`tickets.md`, `memory.md`, `brain.md`) reflejando el cierre del Frente F de alineación operativa y comercial.
- [x] **[VERIFY]** Ejecutar `node --test tests/admin-schedule.test.mjs tests/admin-cockpit-e2e.test.mjs && npm test && npm --prefix web run build` verificando 100% de tests en verde y 0 etiquetas `<script>` en `web/dist/index.html`.
