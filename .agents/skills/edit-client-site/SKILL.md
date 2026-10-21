---
name: edit-client-site
description: "Modifica en 1 comando la landing de un prestador activo o prospecto (/editar-web-cliente): actualiza la ficha /clients/{id}-{nombre}-{apellido}-{rubro}.md, regenera el clon con build-client-site, audita con audit-code y opcionalmente redespliega."
tools: ["read_file", "write_to_file", "execute_command"]
---

# 🛠️ Edit Client Site (`/editar-web-cliente`)

## Propósito y Contexto
Permite escalar el mantenimiento de hasta **100 prestadores en paralelo** sin tocar jamás archivos dentro de `/sites/` a mano. Cuando el operador pide en lenguaje natural *"el cliente 22-alejandra-martinez-nutri quiere cambiar el valor de consulta, el WhatsApp o agregar una pregunta frecuente"*, esta skill aplica el cambio en la única fuente de verdad (`/clients/{slug}.md`), recompila y audita.

## Requisitos Previos y Entradas
- Identificador o nombre del cliente (ej: `22-alejandra-martinez-nutri` o ID de fila `22` en Google Sheets).
- Instrucción de cambio en lenguaje natural (colores de tema, orden de secciones, bio, enfoque, reseñas, FAQs, links de WhatsApp/Calendly).

## Paso a Paso de Ejecución (SOP)
1. **Localización de la Ficha**:
   - Buscar en `/clients/` el archivo `{id}-{nombre}-{apellido}-{rubro}.md` correspondiente.
   - Si falta información crítica para el cambio pedido, frenar y consultar al usuario (Gate Ask-First).
2. **Edición de la Fuente de Verdad**:
   - Modificar únicamente `/clients/{slug}.md` (frontmatter YAML o secciones Markdown) respetando el voseo argentino profesional y la regla Hormozi.
   - Actualizar `last_activity_at` a la fecha actual (`YYYY-MM-DD`) y extender `expires_at` (+7 días) si sigue en estado `prospecto`.
3. **Recompilación Determinista**:
   - Ejecutar `npm run build-site clients/{slug}.md` (`node scripts/build-client-site.mjs clients/{slug}.md`).
4. **Auditoría 0-JS**:
   - Ejecutar `npm run audit-site sites/{slug}` (`node scripts/audit-site.mjs sites/{slug}`) verificando 0 scripts en cliente y 16 tests verdes.
5. **Despliegue Opcional**:
   - Si el usuario solicitó publicar el cambio en vivo, invocar `deploy-cloudflare` (`npm run deploy-cf sites/{slug}`).

## Negaciones Explícitas (Qué NO hacer)
- **PROHIBIDO** editar directamente archivos dentro de `/sites/{slug}/` (son efímeros y se sobrescriben en cada build).
- **PROHIBIDO** mezclar la paleta Soft-Obsidian de NexoBow (`web/`) con el tema del prestador.
