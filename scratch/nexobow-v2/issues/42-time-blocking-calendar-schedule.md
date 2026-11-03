# 42: Horarios & Time-Blocking con Sincronización Calendar

**What to build:** Centro de gestión del tiempo y estructuración de la semana ideal del fundador mediante una matriz horaria semanal interactiva (`views/ScheduleView.tsx`) con bloques de foco categorizados (`prospeccion`, `alaynow_grabacion`, `desarrollo`, `reunion`, `personal`), persistencia en Supabase (`schedule_blocks`), conmutador de cumplimiento de bloques y soporte para visualizar eventos externos sincronizados con Google Calendar.

**Blocked by:** 39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet.

**Status:** completed

- [x] Crear migración SQL para tabla `schedule_blocks` con enum `schedule_category`, campos de recurrencia semanal, identificador externo de Google Calendar y RLS.
- [x] Desarrollar lógica de agenda semanal en `web/src/lib/schedule.ts` para renderizar grilla horaria de lunes a domingo, detección de solapamientos y cálculo de horas de foco por categoría.
- [x] Construir componente `views/ScheduleView.tsx` con grilla interactiva, tarjetas de bloques codificadas por color, modal de alta/edición de bloques de trabajo profundo y toggle de cumplimiento.
- [x] Diseñar el seam de integración con Google Calendar (`fetchCalendarEventsSeam`) permitiendo convivencia de eventos externos en la vista sin colisiones.
- [x] Escribir suite de pruebas unitarias en `tests/admin-schedule.test.mjs` validando la generación de matriz horaria, validaciones de solapamiento y mutación de estado.
- [x] Verificar que `npm test` pase 100% en verde y `npm run build` en `web/` compile sin errores.
