---
name: generate-client-fiche
description: "Genera la ficha formal /clients/{slug}.md a partir de los datos crudos de prospección, aplicando voseo argentino, copywriting de alivio Hormozi, fallback inteligente de agendamiento y cumplimiento legal (Ley 25.326)."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Generate Client Fiche — Redacción Persuasiva & Compliance

## Propósito y Contexto
Esta skill transforma los datos estructurados extraídos por `scout-lead` (ubicados en `/assets/{slug}/lead-raw.json`) en una ficha formal `/clients/{slug}.md`. Aplica la fórmula de copywriting de Alex Hormozi adaptada a la salud en Argentina: dolor real del paciente ocupado, alivio inmediato, cero humo y voseo profesional rioplatense.

Además, garantiza el cumplimiento normativo:
1. **Fallback Inteligente:** Si no existe enlace público de Calendly, configura automáticamente el CTA principal hacia el WhatsApp del profesional con mensaje de solicitud de reserva, asegurando un embudo 100% funcional.
2. **Ley 25.326 de Protección de Datos Personales:** Fija `consentimiento_testimonios: false` por defecto, atribuyendo las reseñas a Google Maps y filtrando casos no autorizados.

## Requisitos Previos y Entradas
- Archivo de entrada: `/assets/{slug}/lead-raw.json`.
- Opcional: `GEMINI_API_KEY` en `.env` para enriquecer la redacción con IA.
- Comando de ejecución: `node scripts/generate-client-fiche.mjs assets/{slug}/lead-raw.json` o `npm run generate-fiche -- assets/{slug}/lead-raw.json`.

## Paso a Paso de Ejecución (SOP)
1. **Revisar Lead Crudo:** Comprobar que existe `/assets/{slug}/lead-raw.json` con nombre, teléfono y reseñas.
2. **Generar Ficha:**
   ```bash
   npm run generate-fiche -- assets/{slug}/lead-raw.json
   ```
3. **Verificación de Contenido:**
   - Confirmar la existencia de `/clients/{slug}.md`.
   - Verificar que el frontmatter contenga los campos requeridos (`nombre`, `slug`, `whatsapp`, `calendly`, `subdominio`).
   - Comprobar que las reseñas estén etiquetadas como `(Google Maps)`.
4. **Handoff:** Proceder con la compilación del sitio mediante la skill `build-client-site`.

## Negaciones Explícitas (Qué NO hacer)
- NO usar tuteo ("tú tienes", "regístrate"); siempre usar voseo profesional argentino ("tenés", "agendá", "comé").
- NO inventar promesas mágicas de salud ("bajá 20 kilos en 1 semana", "dieta milagrosa").
- NO marcar `consentimiento_testimonios: true` sin autorización explícita y documentada.
