---
name: build-client-site
description: "Clona /templates/{rubro} hacia /sites/, inyecta tema y contenido desde la ficha de /clients/ y verifica el build. Usar cuando se pida crear o actualizar la landing de un prestador."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Build Client Site

## Propósito y Contexto

Ejecuta el desacoplamiento Template/Contexto de `brain.md`: a partir de una ficha
válida en `/clients/N-rubro-nombre.md` genera el clon compilable en `/sites/N-rubro-nombre/`
aplicando tema (paleta Delta Cafés, tipografías Fraunces/Archivo, orden de secciones) y contenido (bio, enfoque, reseñas,
casos, FAQ, links, oferta) **sin tocar ningún componente**.

## Requisitos Previos y Entradas

- Ficha de cliente: `/clients/N-rubro-nombre.md` (frontmatter YAML + cuerpo Markdown).
- Template base: `/templates/{rubro}/` (proyecto Astro; en el MVP inicial: `nutricionista`).
- Automatización: `npm run build-site <ficha>` o `node scripts/build-client-site.mjs <ficha>`.

## Paso a Paso de Ejecución (SOP)

1. **Gate Ask-First (validación):** ejecutar:
   `npm run build-site clients/N-rubro-nombre.md`.
   El script valida campos obligatorios (`nombre`, `slug`, `rubro`, `whatsapp`,
   `calendly`, `subdominio`, `consentimiento_testimonios`).
   Si faltan datos: **frenar y preguntarle al usuario** (nunca inventar).
2. **Clonar:** el script copia `templates/{rubro}/` → `sites/{slug}/` excluyendo
   `dist`, `.astro` y `.git`. Si el clon ya existe, se regenera desde cero de forma determinista.
3. **Inyectar:** el script escribe `sites/{slug}/src/site.json` con el deep-merge de
   la ficha sobre los placeholders del template Delta Cafés:
   - `tema` ← frontmatter `tema` (primary, accent, fondo, tinta, fuente, fuente_sans, orden_secciones).
   - `content.prestador.nombre` ← frontmatter `nombre`.
   - `content.links.calendly` ← frontmatter `calendly`.
   - `content.links.whatsapp` ← `https://wa.me/{whatsapp}` (formato internacional).
   - `content.consentimiento_testimonios` ← frontmatter.
   - Cuerpo Markdown: `## Bio` → `prestador.bio`, `## Enfoque` → `prestador.enfoque`,
     `## Reseñas` → `reviews.items`, `## Casos de éxito` → `casos.items`,
     `## Preguntas frecuentes` → `faq.items`.
   - Ítems de lista: `- **Nombre/Título**: texto` (y `Resultado: X` para casos).
   - `subdominio` y `estado` se validan para control y deploy.
4. **Verificar tests y build:** el script corre `npm test` (pruebas de tema y orden de secciones) y `npm run build`
   en el clon. La salida debe ser SSG pura (0 errores).
5. **Regenerar:** si hay que corregir datos de negocio, editar la ficha y volver a
   ejecutar el script (el clon se regenera entero). Nunca editar el clon a mano.

## Negaciones Explícitas (Qué NO hacer)

- NO editar a mano `sites/{slug}/` para corregir datos: se regenera desde la ficha.
- NO inventar datos faltantes: el gate Ask-First frena con pregunta.
- NO editar `/templates/` desde esta skill (solo lectura).
- NO asumir otros rubros: solo `nutricionista` en el MVP.

## Salidas

- `sites/{slug}/` clon compilable con `src/site.json` inyectado.
- Build estático verde (0 errores de Astro y 0 JS innecesario en cliente).
- Comando de deploy directo para Cloudflare Pages o Vercel.
