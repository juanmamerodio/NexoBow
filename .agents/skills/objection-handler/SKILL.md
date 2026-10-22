---
name: objection-handler
description: "Manejo de objeciones comerciales y cierre en WhatsApp en voseo argentino para profesionales de salud, leyes y servicios. Usa cuando el prospecto plantee dudas de precio, tiempo, Instagram o reticencia a agendar."
tools: ["read_file", "execute_command"]
---

# 💬 Objection Handler — Cierre & Persuasión en WhatsApp (Voseo Argentino)

## Propósito y Contexto
Esta skill asiste al operador comercial de NexoBow cuando un prospecto responde a la prospección inicial con objeciones o dudas típicas ("es caro", "ya tengo Instagram", "no tengo tiempo", "tengo que pensarlo").

El motor formula **3 variantes tácticas de respuesta** en **voseo argentino profesional**:
1. **Ángulo 1 (Alivio & Costo de Oportunidad - Hormozi)**: Calcula cuántas consultas particulares se pierden en el "visto" de WhatsApp vs. la inversión de `$189.999 ARS` setup y `$12.259 ARS` mes.
2. **Ángulo 2 (Reversión de Riesgo & 7 Días)**: Apalanca la política de servidor activo a 7 días. El prospecto prueba la demo en `preview.nexobow.site/{slug}/` sin pagar ni comprometerse; si no le sirve, la demo se purga sola.
3. **Ángulo 3 (Apalancamiento Audiovisual con AfterBow)**: Para clínicas o profesionales que buscan traccionar tráfico, ofrece el plan Full Growth con 1 mes de producción de video y reels junto a [**AfterBow**](https://www.afterbow.com).

## Requisitos Previos y Entradas
- Nombre del prospecto (ej: "Dra. Gómez", "Martín").
- Rubro (ej: "nutricionista", "abogado", "clinica").
- Slug correlativo de la preview (ej: `20-martin-albarracin-abogado`).
- Objeción planteada por el cliente (texto libre o categoría).

## Paso a Paso de Ejecución (SOP)

### 1. Invocación CLI Directa
```bash
node scripts/handle-objection.mjs --objecion "me parece caro" --nombre "Martín" --rubro "abogado" --slug "20-martin-albarracin-abogado"
```

### 2. Categorías Soportadas
- `precio`: Objeciones monetarias o de presupuesto.
- `instagram`: "¿Para qué quiero web si ya tengo Instagram?".
- `tiempo`: "No tengo tiempo para coordinar una web".
- `dudas_pacientes`: "No sé si mis pacientes van a saber usar una página".
- `decision`: "Tengo que pensarlo / hablarlo con mi socio".

### 3. Salida y Selección de Variante
El script devuelve las 3 respuestas listas para copiar y pegar en WhatsApp Web. Seleccionar la variante que mejor conecte con el nivel de formalidad y necesidad del prospecto.

## Negaciones Explícitas (Qué NO hacer)
- **NO usar tuteo neutro**: Prohibido usar "tienes", "puedes", "mira esto", "piénsalo". Siempre utilizar voseo argentino ("tenés", "podés", "mirá", "pensalo").
- **NO mentir sobre precios**: Respetar los valores oficiales de NexoBow (`$189.999 ARS` Setup / `$12.259 ARS` finales/mes).
- **NO prometer plazos infinitos**: La política de reserva de demo es estrictamente de 7 días.
