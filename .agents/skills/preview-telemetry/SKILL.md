---
name: preview-telemetry
description: "Telemetría pasiva ultraliviana (< 1 KB, 0 cookies, Ley 25.326 compliant) para previews. Registra apertura de landing, cambios en ThemeSwitcher y clics a WhatsApp/Calendly sin rastreo invasivo."
tools: ["read_file", "execute_command"]
---

# 📡 Preview Telemetry — Telemetría Pasiva sin Cookies (Ley 25.326)

## Propósito y Contexto
Esta skill elimina la ceguera operativa de prospección comercial: permite saber con precisión matemática si un prospecto abrió el enlace de su demo, si probó distintas paletas en el `ThemeSwitcher` o si tocó el botón de agendamiento/WhatsApp, para coordinar el momento exacto del follow-up comercial.

Garantiza:
1. **0 Cookies & 0 LocalStorage tracking**: Cero almacenamiento intrusivo en el dispositivo del cliente.
2. **Cumplimiento estricto de la Ley 25.326 (Protección de Datos Personales en Argentina)**: No almacena IPs, direcciones de correo ni geolocalización invasiva.
3. **Carga ultraligera (<1 KB)**: Snippet de ~380 bytes que utiliza `navigator.sendBeacon` o `fetch(keepalive)`.

## Eventos Registrados
- `preview_view`: Se dispara al cargar la landing.
- `theme_switch`: Se dispara cuando el cliente alterna entre paletas en el `ThemeSwitcher`.
- `cta_click`: Se dispara cuando el cliente hace clic en el enlace de agendamiento o WhatsApp.

## Requisitos Previos y Entradas
- Slug de la preview (ej: `demo-abogado`, `22-alejandra-martinez-nutri`).
- Endpoint colector (por defecto `https://telemetry.nexobow.site/api/ping`).
- Ejecutor CLI: `node scripts/preview-telemetry.mjs <slug> [endpointUrl]`.

## Paso a Paso de Ejecución (SOP)

### 1. Generar Snippet para Preview
```bash
node scripts/preview-telemetry.mjs 22-alejandra-martinez-nutri
```

### 2. Inyección en Template / Preview
El snippet devuelto se inyecta directamente antes del cierre de `</body>` en la plantilla de preview, asegurando impacto cero en el tiempo de carga (<0.8s LCP).

## Negaciones Explícitas (Qué NO hacer)
- **NO recolectar IPs ni fingerprints**: Prohibido almacenar la IP o huellas digitales del navegador del visitante.
- **NO usar Google Analytics ni píxeles pesados**: La telemetría de NexoBow debe mantenerse por debajo de 1 KB y sin cookies de terceros.
