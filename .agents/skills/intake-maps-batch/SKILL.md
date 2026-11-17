---
name: intake-maps-batch
description: "Ingesta Gate 0 de 1 a 10 links directos de Google Maps (cortos o /maps/place/): resuelve perfiles, extrae emails/redes (Cubeta A/B), califica score/tier, genera fichas, compila previews HUD 10x y sincroniza Supabase + WhatsApp/Audio 35s."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Intake Maps Batch — Pipeline Gate 0 de 10 Links Google Maps

## Propósito y Contexto
Esta skill opera la prospección asistida inicial (Gate 0, `$0` de costo fijo adicional) a partir de un lote curado de **1 a 10 links directos de Google Maps** pegados por el operador:
1. **Resolución y Deduplicación (`Seam 1`)**: Acepta URLs cortas (`maps.app.goo.gl/...`, `goo.gl/maps/...`), URLs canónicas (`/maps/place/...`, `?cid=...`) o consultas puntuales. Valida el límite duro de `1..10` links, deduplica variantes con parámetros de tracking y sigue redirecciones HTTP estándar sin evadir controles ni CAPTCHAs.
2. **Enriquecimiento & Scraping Cubeta A/B (`Seam 2`)**: Consulta Google Places API / Serper (o modo `--mock` para pruebas) para obtener nombre, rubro, dirección, WhatsApp argentino (`+549...`), rating, cantidad de reseñas, textos reales y `websiteUri`. Si hay sitio propio, inspecciona su HTML público (`timeout <= 6s`, máximo `1` salto interno a `/contacto` o `/contact`) extrayendo emails limpios (filtrando falsos positivos como `@2x`, `.png`, `.webp`, `sentry.io`, `wixpress.com`, `example.com`), links sociales y clasificación:
   - **Cubeta A (`cubeta_a`)**: Sin sitio web propio o únicamente redes/directorios (`instagram.com`, `facebook.com`, `linktr.ee`, `doctoralia.com`, `wa.me`).
   - **Cubeta B (`cubeta_b`)**: Sitio web propio con señales objetivas de obsolescencia (`no_https`, `missing_mobile_viewport`, `heavy_legacy_stack` WordPress/Wix/Elementor, `missing_whatsapp_or_booking_cta`).
3. **Calificación Gate 0 (`qualifyLeadForGate0`)**: Calcula puntaje `0–100` (`+35` WhatsApp válido, `+20` rating `>= 4.3` y reseñas `>= 5`, `+20` nicho High-Ticket, `+15` Cubeta A o Cubeta B con fallas, `+10` email válido), asigna grado `A/B/C`, `recommended_tier` (`tier_1_starter` o `tier_2_autonomous`) y ángulo Hormozi (`"Anti-Silla Vacía & Cero-Secretaria"`).
4. **Cadena End-to-End (`Seam 3`)**: Genera la ficha en `clients/{slug}.md` con cumplimiento estricto de la **Ley 25.326** (`consentimiento_testimonios: false` y reseñas atribuidas explícitamente a `"Google Maps"`), compila el clon con `Preview Studio HUD 10x` y telemetría `< 1 KB` (`/api/ping`), despliega a `https://preview.nexobow.site/{slug}/` (desactivable con `--no-deploy` / `--dry-run`), sincroniza en `LeadStore` / Supabase `public.leads` y devuelve el reporte consolidado listo para contactar (Preview URL, email, Cubeta, mensaje de WhatsApp en voseo y guion de audio de 35s).

## Requisitos Previos y Entradas
- Lista de **1 a 10** links de Google Maps por `--links`, archivo de texto por `--file` o argumentos posicionales.
- Flags operativos:
  - `--no-deploy`: Compila fichas y previews localmente sin correr `deploy-previews` en Cloudflare.
  - `--dry-run`: Simula todo el lote en memoria sin escribir en disco, Google Sheets, Supabase ni Cloudflare.
  - `--skip-build`: Genera fichas y metadata omitiendo la compilación Astro.
  - `--mock`: Usa datos simulados deterministas sin consumir `GOOGLE_MAPS_API_KEY` ni `SERPER_API_KEY`.
  - `--json`: Imprime la salida estructurada en JSON para integraciones o CRM.

## Paso a Paso de Ejecución (SOP)
1. **Recibir el lote de 1 a 10 links** del operador y verificar que no supere las 10 entradas únicas.
2. **Validar en seco (`--dry-run`) si se requiere inspección previa**:
   ```bash
   node scripts/intake-maps-batch.mjs --file lote-maps.txt --dry-run
   ```
3. **Ejecutar ingesta Gate 0 (con build local sin deploy o con deploy productivo)**:
   ```bash
   npm run intake-maps -- --file lote-maps.txt --no-deploy
   ```
   O pasando links directos:
   ```bash
   node scripts/intake-maps-batch.mjs --links "https://maps.app.goo.gl/xxx" --links "https://maps.app.goo.gl/yyy" --no-deploy
   ```
4. **Entregar el reporte de salida** con:
   - Score, Grado (`A/B/C`), Cubeta (`A`/`B`) y Tier recomendado (`tier_1_starter` / `tier_2_autonomous`).
   - Email extraído y `Preview URL` (`https://preview.nexobow.site/{slug}/`).
   - Mensaje personalizado de WhatsApp + enlace `wa.me` + guion de audio de 35 segundos.

## Cumplimiento Legal (Ley 25.326) & Negaciones Explícitas (Qué NO hacer)
- **SIEMPRE** mantener `consentimiento_testimonios: false` en las fichas generadas y atribuir las reseñas explícitamente a `"Google Maps"`.
- **NUNCA** procesar más de **10 links** en un mismo lote.
- **NUNCA** intentar evadir CAPTCHAs, gates anti-bot, logins privados ni controles de acceso de sitios externos.
- **NUNCA** superar 1 salto interno (`/contacto` o `/contact`) ni `6s` de timeout al inspeccionar el HTML público de una web.
- **NUNCA** enviar WhatsApp frío automatizado masivo desde bots; el envío permanece semi-asistido por el operador usando el mensaje y guion generados.
