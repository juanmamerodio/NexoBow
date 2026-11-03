# 44: Hábitos & Disciplina: Heatmap de Consistencia y Rachas

**What to build:** Sistema de seguimiento de hábitos y disciplina diaria clasificados por 4 pilares (`salud`, `foco_negocio`, `aprendizaje`, `personal`), persistencia en Supabase (`habits` y `habit_logs`), motor algorítmico de rachas activas (*current streak*) y máximas (*best streak*), y visualización interactiva en `views/HabitsView.tsx` con un mapa de calor anual estilo GitHub de 90/365 días y checklist de completitud diaria.

**Blocked by:** 39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet.

**Status:** closed

- [x] Crear migración SQL para tablas `habits` y `habit_logs` con enum `habit_pillar`, restricciones de unicidad por día/hábito y RLS.
- [x] Desarrollar motor algorítmico de rachas en `web/src/lib/streaks.ts` calculando rachas activas, récords históricos y matriz de densidad para heatmap sin saltos erróneos de fecha.
- [x] Construir componente `views/HabitsView.tsx` con cuadrícula de calor visual (90/365 días en paleta Soft-Obsidian), selector de completitud rápida de la jornada y métricas destacadas de racha.
- [x] Implementar modal para crear y personalizar hábitos (título, pilar, icono, frecuencia semanal objetivo).
- [x] Escribir suite de pruebas unitarias en `tests/admin-habits.test.mjs` validando casos de borde en cálculo de rachas (días salteados, hábitos completados a destiempo y consistencia del heatmap).
- [x] Verificar que `npm test` pase 100% en verde y `npm run build` en `web/` compile sin errores.
