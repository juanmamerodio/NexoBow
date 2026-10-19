---
name: audit-code
description: "Audita la calidad técnica, rendimiento, accesibilidad (a11y) y política de 0 JS en cliente de las landings generadas en /sites/{slug}/ antes de producción."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Audit Code — Auditoría Automatizada de Calidad & 0 JS

## Propósito y Contexto
Esta skill garantiza que ningún sitio generado para un cliente se despliegue a producción con errores de compilación, sobrecarga de JavaScript en el cliente, problemas de contraste o fallas de accesibilidad.
De acuerdo con `brain.md` y `memory.md`, esta auditoría debe ejecutarse **preferentemente en un sub-agente con sesión limpia** o de forma automatizada mediante el script verificador.

## Requisitos Previos y Entradas
- Directorio del sitio compilado: `sites/{slug}/dist/index.html`.
- Ejecutor CLI: `node scripts/audit-site.mjs <slug>` o `npm run audit-site -- <slug>`.

## Paso a Paso de Ejecución (SOP)
1. **Ejecutar Auditoría Automatizada:**
   ```bash
   node scripts/audit-site.mjs <slug>
   ```
2. **Puntos de Control Verificados:**
   - **0 JS en Cliente:** Ninguna etiqueta `<script>` de runtime en el HTML compilado.
   - **Accesibilidad (a11y):** Atributo `lang="es"`, viewport responsivo, existencia de un único `<h1>`, y atributos `alt` en imágenes.
   - **Pruebas de Contrato:** Ejecución de los 16 tests unitarios de tema, orden y contraste en el clon.
   - **Embudo Operativo:** Verificación de enlaces a WhatsApp y CTA de reserva.
3. **Reporte:** Si la auditoría devuelve código 0, el sitio está oficialmente calificado para `deploy-cloudflare`.

## Negaciones Explícitas (Qué NO hacer)
- NO permitir scripts de analítica pesados o frameworks JS en el cliente; Astro SSG debe entregar HTML puro con estilos CSS.
- NO obviar errores de accesibilidad ni enlaces rotos.
