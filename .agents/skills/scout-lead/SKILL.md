---
name: scout-lead
description: "Extrae y enriquece información comercial y reseñas verificadas de un prestador de salud mediante Google Maps Platform (Places API New) o fuentes públicas, persistiendo fotos y assets en /assets/{slug}/."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Scout Lead — Extracción & Enriquecimiento de Prospectos

## Propósito y Contexto
Esta skill automatiza la primera fase del pipeline `lead-to-live` de NexoBow. Dado el nombre de un profesional, consultorio o dirección, localiza al prestador en **Google Maps Platform** utilizando la API moderna **Places API (New)**, extrae datos de contacto, reseñas oficiales de pacientes, fotos del lugar y genera un mapa estático de 0 JS persistiendo todo localmente en `/assets/{slug}/`.

## Requisitos Previos y Entradas
- Argumento de búsqueda: `--query "Nombre o Consultorio, Localidad"` o `--mock` para desarrollo local sin claves.
- Credenciales: `GOOGLE_MAPS_API_KEY` en `.env` (o Maps Demo Key para prototipado).
- Script ejecutor: `node scripts/scout-lead.mjs --query "..."` o `npm run scout-lead -- --query "..."`.

## Paso a Paso de Ejecución (SOP)
1. **Verificar entrada:** Identificar el nombre comercial, ubicación o handle del profesional.
2. **Ejecutar scout-lead:**
   ```bash
   node scripts/scout-lead.mjs --query "NutriAr, Belgrano 1221, Campana"
   ```
   *(Si se está en entorno sin conexión o sin clave de Google Maps, agregar `--mock`)*.
3. **Persistencia de Assets:**
   - Verifica que se haya creado el directorio `/assets/{slug}/`.
   - Revisa `assets/{slug}/lead-raw.json`.
   - Si la API devolvió fotos o ubicación, confirma que se hayan descargado `avatar.jpg` y `map.png`.
4. **Validación de Datos Mínimos:**
   - Nombre del prestador.
   - Teléfono o WhatsApp de contacto.
   - Reseñas con calificación y texto de pacientes.
5. **Transición a Siguiente Fase:** Invocar o notificar que el lead está listo para la skill `generate-client-fiche`.

## Negaciones Explícitas (Qué NO hacer)
- NO almacenar URLs remotas efímeras de Google CDN o Instagram en los archivos finales; siempre descargar y guardar en `/assets/{slug}/`.
- NO inventar reseñas: solo utilizar las provistas por Places API o marcar explícitamente atribución a Google Maps.
- NO usar endpoints deprecados como `PlacesService` o `google.maps.places.Autocomplete`.
