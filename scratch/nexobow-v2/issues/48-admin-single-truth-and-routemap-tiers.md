# 48: Verdad Única en `/admin` (0 Datos Fantasma) y Alineación de Tiers `routemap.md`

**What to build:** El panel administrativo `/admin` refleja con fidelidad absoluta el estado real de la base de datos productiva en Supabase (`henpyuwguwvflhgbxmvn.supabase.co`): cuando una tabla (`financial_transactions`, `habit_logs`, `habits`) responde sin error con `0` registros, la vista muestra `0` registros reales junto con el badge `Supabase Live (0 registros)` y acciones opcionales de carga/semilla, reservando los mocks de demostración exclusivamente para fallos reales de red (`isOffline: true` → `Modo Offline (Demo)`). En paralelo, el módulo de Finanzas reemplaza el abono antiguo de `$12.259 ARS/mes` por las categorías oficiales de la Escalera de Valor de `routemap.md` (Tier 1 Starter `$189.999 ARS` Setup + `$0/mes` Año 1; Tier 2 Autonomous `$549.999 ARS` Setup + `$229.999 ARS/mes`), el Cockpit Diario adapta el sustantivo de los mensajes urgentes de WhatsApp según el rubro del prestador (`"tu estudio"`, `"tu centro"`, `"tu consultorio"`), y el endpoint `/api/v1/bow-system/create` apunta al proyecto productivo real etiquetando cada lead entrante con `metadata.source = "inbound_web"`.

**Blocked by:** 47: Embudos Flexibles (Presencial / Consulta Paga / Turnero o Secretaría) y CRM Táctico.

**Status:** done

## Seams Under Test (`/tdd`)

- **Seam 1 (`CATEGORIES_BY_UNIT.nexobow` & `fetchFinancialTransactions()` en `web/src/lib/finances.ts`):**
  - *Qué atrapa:* Presencia exacta de los Tiers de `routemap.md` (`"Tier 1 · Setup Starter ($189.999 ARS · $0/mes Año 1)"`, `"Tier 2 · Setup Autonomous ($549.999 ARS)"`, `"Tier 2 · Abono Mensual Autonomous ($229.999 ARS/mes)"`), erradicación de `"Abono Mensual ($12.259 ARS)"`, y retorno de `{ data: [], isOffline: false }` cuando Supabase responde `data: []` y `error: null`.
  - *Qué omite:* Eventos DOM de clic en `FinanceView.tsx`.
- **Seam 2 (`fetchHabitLogs()`, `fetchHabits()` en `web/src/lib/streaks.ts` y `fetchDailyCockpitSummary()`, `buildUrgentWhatsAppUrl(lead)` en `web/src/lib/cockpit.ts`):**
  - *Qué atrapa:* Que con `habit_logs = 0` en Supabase vivo la racha inicial sea honestamente `0 días` (sin inyectar los ~300 logs mock de `INITIAL_MOCK_LOGS`), que `fetchDailyCockpitSummary()` respete listas vacías reales cuando Supabase está online, y que `buildUrgentWhatsAppUrl(lead)` adapte el sustantivo según `lead.niche` (`"tu estudio"` para abogacía/contables, `"tu centro"` para clínicas/estética, `"tu consultorio"` para salud).
  - *Qué omite:* Animaciones CSS del heatmap.
- **Seam 3 (`onRequestPost` en `web/functions/api/v1/bow-system/create.ts`):**
  - *Qué atrapa:* Fallback URL apuntando a `https://henpyuwguwvflhgbxmvn.supabase.co` e inyección en `insertPayload.metadata` de `source: "inbound_web"`, `modalidad: "presencial"`, `tipo_consulta: "consultar"`, `canal_agenda: "whatsapp_secretaria"`.

## Schema & Categories Contract (`CATEGORIES_BY_UNIT.nexobow`)

```ts
export const CATEGORIES_BY_UNIT: Record<BusinessUnit, string[]> = {
  nexobow: [
    "Tier 1 · Setup Starter ($189.999 ARS · $0/mes Año 1)",
    "Tier 2 · Setup Autonomous ($549.999 ARS)",
    "Tier 2 · Abono Mensual Autonomous ($229.999 ARS/mes)",
    "Tier 3 · Growth Partner Clínicas (High-Ticket)",
    "Alianza Audiovisual AfterBow",
    "Adicional Dominio (.com.ar / .com)",
    "Otros Ingresos Agencia",
  ],
  // alaynow, gastos_operativos, gastos_personales intactos
};
```

## Acceptance Criteria

- [x] **[RED]** Actualizar y ampliar `tests/admin-finances.test.mjs`, `tests/admin-habits.test.mjs` y `tests/admin-cockpit.test.mjs` para exigir los nuevos Tiers de `routemap.md`, el contrato de `0` datos fantasma cuando `error === null` y `data: []`, la adaptación por rubro en `buildUrgentWhatsAppUrl(lead)` y el fallback URL productivo en `bow-system/create.ts`, verificando que fallen en rojo antes de implementar.
- [x] **[GREEN]** Actualizar `web/src/lib/finances.ts` y `web/src/components/admin/views/FinanceView.tsx` con `CATEGORIES_BY_UNIT.nexobow` alineado a `routemap.md`, estado vacío real con badge `Supabase Live (0 registros)`, botón secundario `"Cargar ejemplos de prueba"` y fallback `Modo Offline (Demo)` solo ante error de red.
- [x] **[GREEN]** Actualizar `web/src/lib/streaks.ts` y `web/src/components/admin/views/HabitsView.tsx` para retornar `[]` cuando `habit_logs` está vacío en Supabase vivo (0 mocks silenciosos) y ofrecer el botón `"Restaurar pack de 6 hábitos base"` cuando `habits` tenga menos de los 6 hábitos iniciales.
- [x] **[GREEN]** Actualizar `web/src/lib/cockpit.ts` y `web/src/components/admin/views/CockpitView.tsx` para respetar las listas vacías reales de Supabase vivo y adaptar `buildUrgentWhatsAppUrl(lead)` según `lead.niche`.
- [x] **[GREEN]** Actualizar `web/functions/api/v1/bow-system/create.ts` reemplazando el fallback URL antiguo por `"https://henpyuwguwvflhgbxmvn.supabase.co"` e inyectando los defaults de embudo en `metadata`.
- [x] **[VERIFY]** Ejecutar `node --test tests/admin-finances.test.mjs tests/admin-habits.test.mjs tests/admin-cockpit.test.mjs && npm test && npm --prefix web run build` con 0 fallos y 0 `<script>` en `web/dist/index.html`.
