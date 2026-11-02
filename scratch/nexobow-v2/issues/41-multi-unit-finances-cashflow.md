# 41: Finanzas Multi-Unidad y Cashflow Consolidado

**What to build:** Módulo financiero integral para registrar y consolidar ingresos y egresos de las 4 unidades de negocio (`nexobow`, `alaynow`, `gastos_operativos`, `gastos_personales`) con soporte multi-moneda (ARS y USD con tipo de cambio de referencia editable), diferenciación entre costos fijos (recurrentes) y variables, y panel visual `views/FinanceView.tsx` con KPIs de flujo de caja neto mensual, desglose por unidad y formulario modal/drawer para asentar transacciones.

**Blocked by:** 39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet.

**Status:** ready-for-agent

- [ ] Crear migración SQL para tabla `financial_transactions` con enums (`business_unit_type`, `financial_flow_type`, `recurrence_type`, `currency_type`), relaciones opcionales y RLS estricto.
- [ ] Desarrollar módulo de lógica contable pura en `web/src/lib/finances.ts` con funciones para balance mensual, cálculo de margen neto, conversión de divisa y filtros por unidad.
- [ ] Construir componente `views/FinanceView.tsx` con selector de período mensual, tarjetas KPI (Ingresos Totales, Gastos Totales, Margen Neto %), gráfico de barras comparativo y tabla detallada.
- [ ] Implementar modal/drawer interactivo para registrar nuevas transacciones con validación de inputs y selección de recurrencia.
- [ ] Escribir suite de pruebas unitarias en `tests/admin-finances.test.mjs` validando la precisión de los cálculos, agregaciones por unidad y conversiones cambiarias.
- [ ] Verificar que `npm test` pase 100% en verde y `npm run build` en `web/` compile sin errores.
