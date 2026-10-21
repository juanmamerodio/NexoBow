---
name: scout-lead
description: "Extrae y enriquece información comercial y prospectos sin sitio web propio mediante Google Maps Platform (Places API New) y sincroniza con Google Sheets directamente in-conversation."
tools: ["read_file", "write_to_file", "execute_command"]
---

# Scout Lead — Prospección & Enriquecimiento In-Conversation

## Propósito y Contexto
Esta skill automatiza la prospección de profesionales de servicios (abogados, nutricionistas, psicólogos) directamente desde una conversación de Antigravity:
1. Localiza prestadores en **Google Maps Platform (Places API New)** en la zona indicada.
2. **Filtra candidatos**: descarta a quienes ya tienen sitio web corporativo propio, priorizando a profesionales sin web (o solo con redes sociales/Instagram).
3. **Deduplica contra Google Sheets**: verifica la planilla de NexoBow (`1fIr3Lug-AALrlGN-Lr3N1syYmMVYTTCaNy0vfXEH2qY`) para no repetir prospectos.
4. **Inserta prospectos (máximo 10)**: formatea exactamente a las 18 columnas oficiales de `Prospección NexoBow` con sus links de WhatsApp prellenados.

## Requisitos Previos y Entradas
- Consulta en lenguaje natural o flag: `--query "abogados en Campana"` o `--mock` para modo demo.
- Opciones adicionales: `--nicho "Abogacía"` y `--limit 10`.
- Autenticación Google Sheets activa (`gsheets auth status`).
- Script ejecutor: `node scripts/prospect-in-conversation.mjs --query "..." --nicho "..."`.

## Paso a Paso de Ejecución (SOP)
1. **Identificar Nicho y Zona**:
   - Extraer del pedido del usuario el nicho (ej: Abogados, Nutricionistas, Psicólogos) y la localidad geográfica (ej: Campana, Buenos Aires).
2. **Ejecutar Prospección In-Conversation**:
   ```bash
   node scripts/prospect-in-conversation.mjs --query "abogados en Campana, Buenos Aires" --nicho "Abogacía" --limit 10
   ```
   *(Si no hay clave de Google Maps configurada en `.env`, el script recurre de forma segura a candidatos mock para desarrollo).*
3. **Verificación y Reporte**:
   - Informar al usuario la cantidad de prospectos encontrados, los deduplicados omitidos y los agregados a la planilla.
   - Listar los enlaces directos a WhatsApp para inicio de outreach manual en 1 clic.

## Negaciones Explícitas (Qué NO hacer)
- NO ingresar más de 10 prospectos por lote (control de cuota y tokens).
- NO duplicar prospectos existentes en el Google Sheet.
- NO incorporar profesionales que ya tengan sitio web corporativo establecido.
- NO depender de servidores locales (`localhost`), túneles ni workflows de n8n.
