# 01: Generador por Lotes de Demos y Subrutas Unificadas

**What to build:** Un script CLI (`scripts/prospect-batch.mjs`) que procese una lista o búsqueda de prospectos de Google Maps, genere las fichas en `/clients/` y compile cada landing Astro con base path configurado hacia el directorio unificado `dist-previews/{slug}/`, devolviendo un objeto JSON estructurado con los metadatos de los prospectos y sus URLs públicas (`https://preview.nexobow.com/{slug}`).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Soporte de argumento `--count` (por defecto 15) y `--query` (ej. "nutricionista en Palermo").
- [ ] Compilación de cada sitio en `dist-previews/{slug}/` respetando base path relativo/absoluto para que assets y estilos carguen sin romperse en subruta.
- [ ] Salida estandarizada por stdout en JSON con array de leads procesados, tiempos de ejecución y status.
- [ ] Suite de tests en `tests/prospect-batch.test.mjs` pasando en verde.
