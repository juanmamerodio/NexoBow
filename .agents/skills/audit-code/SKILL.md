---
name: audit-code
description: "Audita la calidad técnica, rendimiento, accesibilidad (a11y) y presupuesto de JS de las landings en /sites/{slug}/ (templates PREMIUM con presupuesto de JS propio) y el estándar 0 JS estricto en /web/."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Audit Code — Auditoría Automatizada de Calidad & Presupuesto JS

## Propósito y Contexto
Esta skill garantiza que ningún sitio se despliegue a producción con errores de compilación, problemas de contraste, fallas de accesibilidad o exceso de JavaScript.
- **`web/` (Agencia NexoBow):** Mantiene **0 JS ejecutable estricto** en el cliente como benchmark de velocidad.
- **`/sites/{slug}/` (Templates PREMIUM de prestadores):** Permite JavaScript propio ligero para micro-interacciones dentro del presupuesto definido (`DEFAULT_SITE_JS_BUDGET_BYTES = 35 KB`), reporta el peso exacto en bytes/KB y rechaza cualquier script externo de terceros no declarado.

De acuerdo con `brain.md` y `memory.md`, esta auditoría debe ejecutarse **preferentemente en un sub-agente con sesión limpia** o mediante `scripts/audit-site.mjs`.

## Requisitos Previos y Entradas
- Sitio compilado: `sites/{slug}/dist/index.html` o `web/dist/index.html`.
- Ejecutor CLI: `node scripts/audit-site.mjs <slug | web>` o `npm run audit-site -- <slug>`.

## Paso a Paso de Ejecución (SOP)
1. **Ejecutar Auditoría Automatizada:**
   ```bash
   node scripts/audit-site.mjs <slug>
   # o para auditar la web institucional de la agencia:
   node scripts/audit-site.mjs web
   ```
2. **Puntos de Control Verificados:**
   - **Política de JS diferenciada (`web/` vs `/sites/`):**
     - En `web/`: 0 etiquetas `<script>` ejecutables en el HTML compilado.
     - En `/sites/{slug}`: JS propio permitido hasta `35 KB` (`DEFAULT_SITE_JS_BUDGET_BYTES`) con reporte de peso; bloqueo de `<script src="https://...">` externos no declarados.
   - **Accesibilidad (a11y):** Atributo `lang="es"`, viewport responsivo, existencia de un único `<h1>`, y atributos `alt` en imágenes.
   - **Pruebas de Contrato:** Ejecución de los tests unitarios de tema, orden y contraste en el clon.
   - **Embudo Operativo:** Verificación de enlaces a WhatsApp y CTA de reserva en `/sites/{slug}`.
3. **Reporte:** Si la auditoría devuelve código 0, el sitio está calificado para `deploy-cloudflare`.

## Negaciones Explícitas (Qué NO hacer)
- NO permitir scripts externos de terceros no declarados ni superar el presupuesto de JS en `/sites/`.
- NO permitir ningún `<script>` ejecutable en `web/`.
- NO obviar errores de accesibilidad ni enlaces rotos.
