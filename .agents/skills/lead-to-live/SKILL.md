---
name: lead-to-live
description: "Orquestador maestro del pipeline de NexoBow: encadena scout-lead -> generate-client-fiche -> build-client-site -> audit-code -> deploy-cloudflare para crear y publicar una landing de salud completa en un solo comando."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Lead To Live — Orquestador Maestro Autónomo

## Propósito y Contexto
Esta skill es la interfaz de más alto nivel de NexoBow. Permite tomar el nombre o dirección de un profesional de la salud o consultorio, y convertirlo de forma autónoma, reproducible y sin intervención manual en una landing page estática lista en producción sobre Cloudflare Pages.

Encadena secuencialmente:
1. `scout-lead`: Extracción de datos y reseñas mediante Google Maps Platform Places API (New) y persistencia en `/assets/{slug}/`.
2. `generate-client-fiche`: Redacción persuasiva con voseo argentino y dolores Hormozi en `/clients/{slug}.md`, aplicando fallback inteligente a WhatsApp y Ley 25.326.
3. `build-client-site`: Clonado del template editorial (Delta Cafés), inyección de `site.json`, copia de assets locales y verificación de tests.
4. `audit-code`: Auditoría estricta de 0 JS en cliente, marcado accesible y contraste.
5. `deploy-cloudflare`: Publicación instantánea en Cloudflare Pages (`https://{slug}.pages.dev`).

## Requisitos Previos y Entradas
- Nombre o consultorio: `--query "Nombre o Consultorio, Localidad"`.
- Opcional: `--deploy` para subir directamente a producción en Cloudflare Pages (por defecto corre en dry-run seguro).
- Opcional: `--mock` para demostración instantánea sin consumo de APIs externas.

## Paso a Paso de Ejecución (SOP)
1. **Ejecutar el Pipeline:**
   ```bash
   npm run lead-to-live -- --query "NutriAr, Campana"
   ```
   *(o con despliegue en producción: `npm run lead-to-live -- --query "NutriAr, Campana" --deploy`)*.
2. **Monitoreo de Fases:** El orquestador reporta el progreso paso a paso de cada fase. Si alguna falla, frena inmediatamente reportando la causa exacta.
3. **Entrega Final:** Presentar al usuario la URL pública y el resumen del prospecto listo para prospección comercial.

## Negaciones Explícitas (Qué NO hacer)
- NO omitir la fase de `audit-code` antes de desplegar.
- NO alterar la estética del template sin autorización del usuario.
