# Integración de ElevenLabs MCP (Plan Starter) en NexoBow

Esta guía documenta cómo conectar el servidor MCP oficial de ElevenLabs (`elevenlabs-mcp`) en Antigravity para producir notas de voz personalizadas de ~35 segundos con tu propia voz clonada sobre el guion humanizado (`audio_script_35s`) de cada prospecto.

---

## 1. Requisitos Previos (Plan Starter)

1. Cuenta activa en ElevenLabs con **Plan Starter** (habilita *Instant Voice Cloning* y cuota mensual de caracteres para síntesis en español rioplatense con `eleven_multilingual_v2`).
2. Grabar una muestra limpia de 1–2 minutos de tu voz hablando en tono natural de conversación (sin eco ni música de fondo) y copiar el **`Voice ID`** generado en ElevenLabs.
3. Tener instalado `uv` / `uvx` en Linux para ejecutar servidores MCP en Python de forma aislada:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

---

## 2. Registro del Servidor MCP Local (Sin Guardar Claves en Git)

> **Regla de seguridad:** Nunca guardes `ELEVENLABS_API_KEY` dentro del repositorio ni en commits. Configurala únicamente en `~/.gemini/config/mcp_config.json` y en tu `.env` local (ignorado por Git).

Agregá la entrada `elevenlabs` dentro de `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "elevenlabs": {
      "command": "uvx",
      "args": ["elevenlabs-mcp"],
      "env": {
        "ELEVENLABS_API_KEY": "REEMPLAZAR_CON_TU_ELEVENLABS_API_KEY"
      }
    }
  }
}
```

Luego reiniciá la sesión del IDE / Antigravity para que el agente disponga de las herramientas MCP de texto a voz directamente en la conversación.

---

## 3. Variables de Entorno Locales (`.env`)

Completá las variables documentadas en `.env.example` dentro de tu `.env` local:

```env
ELEVENLABS_API_KEY="sk_tu_api_key_real"
ELEVENLABS_VOICE_ID="tu_voice_id_clonado"
```

---

## 4. Uso del Helper CLI `scripts/generate-voice-note.mjs`

Además del MCP interactivo, el repositorio incluye un helper CLI desacoplado que lee el `audio_script_35s` humanizado de un prospecto (o un texto personalizado), limpia marcas internas como `[GUION AUDIO 35s]` y guarda el archivo MP3/OGG en `.reports/voice-notes/{slug}.mp3`:

```bash
# Simulación sin consumir cuota ni hacer peticiones HTTP
npm run voice-note -- --slug 24-centro-odonto --dry-run

# Generar nota de voz MP3 real desde la ficha local clients/{slug}.md
npm run voice-note -- --slug 24-centro-odonto

# Generar con texto directo en formato OGG/Opus
npm run voice-note -- --slug prueba --text "Hola Dra. Gómez, te grabo este audio rápido..." --format opus_48000_64
```

### Política Gate 0 (WhatsApp Semi-Asistido)
El audio generado se adjunta manualmente desde WhatsApp Web / Desktop o móvil junto con el enlace de la preview (`https://preview.nexobow.site/{slug}/`) desde `/admin/crm`. Nunca realices envíos masivos automatizados en frío por WhatsApp no oficial.
