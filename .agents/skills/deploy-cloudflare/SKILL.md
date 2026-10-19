---
name: deploy-cloudflare
description: "Despliega landings generadas en /sites/{slug}/dist hacia Cloudflare Pages utilizando Wrangler CLI, asignando URL pública https://{slug}.pages.dev y gestionando subdominios de NexoBow."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Deploy Cloudflare — Publicación Instantánea en Cloudflare Pages

## Propósito y Contexto
Esta skill se encarga de la publicación final y entrega de la landing page del cliente a producción en la red edge global de **Cloudflare Pages**. No requiere configuración manual en panel web: utiliza la API de Cloudflare y Wrangler CLI con las credenciales configuradas en `.env`.

## Requisitos Previos y Entradas
- Directorio de compilación: `sites/{slug}/dist`.
- Credenciales en `.env`: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
- Ejecutor CLI: `node scripts/deploy-cloudflare.mjs <slug> [--dry-run]` o `npm run deploy-cf -- <slug>`.

## Paso a Paso de Ejecución (SOP)
1. **Pre-vuelo:** Verificar que `sites/{slug}` haya pasado satisfactoriamente `audit-code`.
2. **Despliegue:**
   ```bash
   npm run deploy-cf -- <slug>
   ```
   *(Para probar sin subir a Cloudflare, utilizar el flag `--dry-run`)*.
3. **Verificación de URL:** Confirmar que la salida CLI reporte `https://{slug}.pages.dev` operativa con respuesta HTTP 200.
4. **Cierre de Ciclo:** Reportar la URL al usuario o al pipeline maestro.

## Negaciones Explícitas (Qué NO hacer)
- NO subir carpetas que contengan `node_modules` o archivos de configuración `.env`.
- NO realizar despliegues sin haber pasado previamente por `audit-code`.
