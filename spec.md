# NexoBow System — Spec del Sistema de Prospección & Web Privada

Términos de dominio definidos en [GLOSSARY.md](./GLOSSARY.md).

## Problem Statement

El operador de NexoBow necesita prospectar diariamente 15 prestadores de salud (nutricionistas) contactándolos en frío por WhatsApp con una demostración interactiva de su landing real ya compilada y accesible en línea.

Actualmente:
1. El canal de comunicación móvil con el sistema estaba ideado mediante un bot de Telegram, lo cual introduce dependencia de la infraestructura y límites de la plataforma de Telegram, fragmenta la experiencia de usuario y agrega complejidad innecesaria.
2. No existía un concentrador unificado para almacenar y servir las 15 demos diarias bajo una URL limpia y profesional para enviar a prospectos sin saturar la creación de proyectos individuales en Cloudflare.
3. El pipeline de generación de prospectos (`lead-to-live`) funciona por CLI localmente, pero carece del acople determinista para ser invocado automáticamente cada mañana, sincronizarse con Google Sheets y ser monitoreado desde el celular del operador.

## Solution

1. **Suspensión formal de Telegram** y reemplazo por **"NexoBow System"**: una web privada / PWA ligera, protegida por token/PIN, optimizada para consumo mobile del operador y sus equipos seleccionados.
2. **Subrutas de Demos Unificadas**: Unificación del despliegue de previews bajo subrutas de un único dominio estático: `preview.nexobow.com/{slug}`.
3. **Orquestación Matutina con n8n**: Un workflow de n8n que dispara diariamente la ejecución local del pipeline de prospección (`lead-to-live` por lotes), recibe el reporte JSON de los 15 prospectos generados, actualiza automáticamente la planilla de Google Sheets del operador con datos de contacto y URL de demo, y emite una notificación de "Lote Listo" al dashboard web de NexoBow System.

## Seams de Prueba y Verificación (Test Seams)

Se definen dos costuras (seams) de alto nivel:
1. **Pipeline Seam (CLI/Batch API)**: `scripts/prospect-batch.mjs` que acepta parámetros de búsqueda geográfica/rubro, genera las fichas y compila las landings en una carpeta unificada `dist-previews/{slug}/` emitiendo un reporte JSON determinista estructurado.
2. **Webhook / Server Seam de NexoBow System**: Endpoint local ultraligero que sirve tanto la PWA privada como el endpoint de ingesta/consulta consumido por n8n y el teléfono móvil.

## User Stories

1. As an operador de NexoBow, I want Telegram to be completely deprecated and removed from the operational roadmap, so that all communication and controls live in a self-owned web interface.
2. As an operador de NexoBow, I want a private web application ("NexoBow System") accessible from my mobile phone, so that I can monitor daily prospect batches and access prospect links without opening a terminal.
3. As an operador de NexoBow, I want the web interface to be restricted to selected internal team members via access token or credentials, so that no external party can view operational lead data.
4. As an operador de NexoBow, I want my automated morning workflow in n8n to trigger the prospect generation pipeline, so that 15 new personalized demo sites are ready when my workday starts.
5. As an operador de NexoBow, I want all generated demo landings to be hosted under a single root domain with subpaths (`preview.nexobow.com/{slug}`), so that prospect links look professional and don't require managing dozens of Cloudflare projects.
6. As an operador de NexoBow, I want the system to sync each generated lead's name, phone, Google Maps rating, address and preview URL directly into a Google Sheet, so that I can conduct manual cold WhatsApp outreach directly from my spreadsheet.
7. As an operador de NexoBow, I want each demo landing to remain 100% pure static SSG (zero unnecessary client JS, Delta Cafés editorial style), so that page load speed on the prospect's mobile device is instantaneous.
8. As an operador de NexoBow, I want to trigger a manual batch run directly from the NexoBow System web interface, so that I can generate additional leads on demand if needed.
9. As an operador de NexoBow, I want clear status indicators (generando, completado, error) in NexoBow System, so that I know immediately if a Google Maps quota or network issue occurred during batch scouting.
10. As an operador de NexoBow, I want the Google Sheet row to link directly to WhatsApp with a prefilled cold pitch message mentioning their specific clinic name, so that outreach takes less than 15 seconds per lead.

## Implementation Decisions

1. **Deprecación de Telegram**:
   - Todo rastro de bot de Telegram se elimina del alcance del MVP y de la documentación activa.

2. **NexoBow System Web (PWA Privada)**:
   - Implementada con Astro / Svelte o vanilla web ultraligero con tailwind y service worker básico (instalable en Android/iOS).
   - Autenticación simple basada en pre-shared key (PSK / Bearer Token o Basic Auth) en headers o cookie segura.
   - Vista móvil con lista de los 15 leads del día, enlace directo a preview, enlace a WhatsApp con mensaje precargado y botón de "Disparar nuevo lote".

3. **Arquitectura de Demos (`preview.nexobow.com/{slug}`)**:
   - El script `build-client-site.mjs` y el nuevo orquestador por lote compilan cada landing con `--base /{slug}/` hacia `dist-previews/{slug}/`.
   - Se despliega el directorio `dist-previews/` hacia el proyecto único de Cloudflare Pages `nexobow-previews` conectado al subdominio `preview.nexobow.com`.

4. **Orquestación con n8n**:
   - Se crea la especificación y el JSON exportable del workflow de n8n:
     - Disparador Cron (Lunes a Viernes 08:00 AM).
     - HTTP Request al webhook local de NexoBow System (`POST /api/batch-scout`).
     - Nodo Google Sheets: Agrega filas a la pestaña "Prospección Diaria" con columnas: `Fecha`, `Nombre`, `Teléfono`, `Rating`, `Dirección`, `URL Demo`, `Estado Contacto`.
     - Notificación Push/Webhook de finalización.

5. **Batch Scout CLI (`scripts/prospect-batch.mjs`)**:
   - Wrapper que ejecuta `lead-to-live` en serie o concurrencia controlada para 15 prospectos basados en una consulta (ej. "nutricionista en Belgrano, Buenos Aires"), generando fichas en `/clients/` y previews en `dist-previews/{slug}/`.

## Testing Decisions

- **Seam Tests**: Pruebas automáticas en Node.js (`node:test`) para `scripts/prospect-batch.mjs` verificando que 2 prospectos de prueba generen sus estructuras en `dist-previews/{slug}/` con base path correcto, URLs relativas y salida JSON estructurada sin fallos.
- **Auth & API Test**: Test de seguridad simple sobre el endpoint de NexoBow System asegurando rechazo 401 si no se provee el token configurado en `.env`.
- **Compatibilidad con tests existentes**: Todos los tests de `tests/pipeline-tanda1.test.mjs` y `tests/pipeline-e2e.test.mjs` deben continuar pasando al 100%.

## Out of Scope

- Chatbots automatizados que respondan automáticamente por WhatsApp (el contacto en frío sigue siendo humano y manual).
- Roles complejos multi-usuario y base de datos relacional para usuarios de la web (un solo token de equipo es suficiente para esta etapa).
- Integración de pasarelas de pago dentro de las landings demo.

## Further Notes

- Respeto estricto de la Ley 25.326 y directivas de salud: los testimonios en las demos solo se mostrarán si provienen de reseñas verificadas públicas de Google Maps.
