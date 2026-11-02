# 43: Videos Alaynow: Pipeline Editorial de Contenido YouTube

**What to build:** Pipeline de gestión y producción audiovisual para el canal de YouTube Alaynow mediante un tablero Kanban en `views/VideosView.tsx` estructurado en 5 etapas (`idea`, `guion`, `grabacion`, `edicion`, `programado`, `publicado`), persistencia en Supabase (`alaynow_videos`), tarjetas con enlace a guión, preview de miniatura, datos de patrocinio comercial (marca y fee pactado) y registro de métricas post-publicación (vistas y CTR %).

**Blocked by:** 39: Admin Shell, Supabase Auth & RLS Core Tracer Bullet.

**Status:** ready-for-agent

- [ ] Crear migración SQL para tabla `alaynow_videos` con enum `video_production_stage`, campos de sponsor, enlaces de producción, métricas post-lanzamiento y RLS.
- [ ] Desarrollar lógica del pipeline audiovisual en `web/src/lib/videos.ts` con validación de transiciones de etapa, cálculo de ingresos por patrocinio y agregación de métricas.
- [ ] Construir componente `views/VideosView.tsx` con tablero Kanban interactivo, tarjetas de contenido con badges de sponsor, modal/drawer de edición detallada y enlaces directos a recursos de producción.
- [ ] Implementar inputs rápidos para actualizar métricas de rendimiento (vistas y CTR %) una vez publicado el video.
- [ ] Escribir suite de pruebas unitarias en `tests/admin-videos.test.mjs` validando transiciones de estado, cálculo de ingresos y persistencia de datos.
- [ ] Verificar que `npm test` pase 100% en verde y `npm run build` en `web/` compile sin errores.
