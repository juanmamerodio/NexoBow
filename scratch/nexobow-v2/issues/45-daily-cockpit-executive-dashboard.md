# 45: Cockpit Diario (Home): Resumen Ejecutivo y Alertas Cruzadas

**What to build:** Centro de mando matutino principal del fundador (`views/CockpitView.tsx`) que consolida y cruza la información crítica de la jornada: widget de alertas de prospección con caducidad TTL inminente (<48h) con acciones directas de WhatsApp y renovación, widget interactivo para tildar hábitos del día en 1 clic, agenda de bloques y reuniones de hoy, video activo en producción de Alaynow y tarjetas de resumen del Cashflow neto mensual.

**Blocked by:** 40: CRM & Prospección: Sustitución de Sheets y Adaptador Supabase, 41: Finanzas Multi-Unidad y Cashflow Consolidado, 42: Horarios & Time-Blocking con Sincronización Calendar, 43: Videos Alaynow: Pipeline Editorial de Contenido YouTube, 44: Hábitos & Disciplina: Heatmap de Consistencia y Rachas.

**Status:** closed

- [x] Desarrollar servicio agregador del cockpit en `web/src/lib/cockpit.ts` que consulta y resume el estado diario de todos los submódulos.
- [x] Construir componente `views/CockpitView.tsx` como vista de aterrizaje predeterminada al ingresar a `/admin`.
- [x] Implementar widget de Alertas de Prospección TTL (<48h) con badge de urgencia, botón directo de WhatsApp y acción rápida de renovación (+7 días).
- [x] Implementar widget de Hábitos de Hoy interactivo para registrar completitud sin necesidad de navegar a la vista de hábitos.
- [x] Integrar widgets de Agenda de Hoy (bloques horarios activos), Próximo Video Alaynow y Tarjetas de Cashflow Consolidado (Ingresos, Gastos, Beneficio Neto en ARS/USD).
- [x] Escribir suite de pruebas unitarias y de integración en `tests/admin-cockpit.test.mjs` validando la agregación reactiva, alertas de caducidad y consistencia de datos cruzados.
- [x] Verificar que `npm test` pase 100% en verde y `npm run build` en `web/` compile sin errores.
