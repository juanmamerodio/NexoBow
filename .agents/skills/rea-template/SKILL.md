---
name: rea-template
description: "Motor de Ingeniería Inversa de Templates (REA): integra el MCP oficial de REA (morluto/rea via rea-agents) para inspección profunda de bundles web, extracción de paleta 60-30-10, tipografías y arquetipos visuales, creación de templates Astro inmutables en /templates/{rubro}/ bajo site.json, generación de demos en /sites/demo-{rubro}/ y versionado con tags git template/{rubro}@1.0.0."
tools: ["read_file", "write_to_file", "execute_command", "read_url_content"]
---

# 🎨 REA Template — Motor de Ingeniería Inversa de Templates

## Propósito y Contexto

Permite expandir el catálogo de NexoBow a las **+10 direcciones estéticas por rubro** de forma industrializada y sin fricción manual. Esta skill ejecuta el protocolo **REA (Reverse Engineering Architecture)** potenciado por el MCP oficial de REA ([**morluto/rea**](https://github.com/morluto/rea)):
1. **Inspección Profunda REA:** Conecta mediante `rea-agents` (o herramientas CDP/inspección de assets web) para examinar la arquitectura visual real, tokens CSS, componentes y bundles de la web de referencia.
2. **Extracción Estética 60-30-10:** Identifica fondo de lienzo (60%), tinta/soporte (30%) y acentos de conversión (10%), más tipografías exactas de la web a duplicar o fallbacks métricos idénticos.
3. **Duplicación Integral (Web ENTERA):** Construye un nuevo template Astro inmutable en `/templates/{rubro}/` desacoplado bajo el contrato `site.json`.
4. **Compilación & Auditoría:** Compila la demo oficial en `/sites/demo-{rubro}/` y sincroniza la vista previa a `dist-previews/`.
5. **Versionado Inmutable Git:** Fija el tag git inmutable `template/{rubro}@1.0.0`.

## Requisitos Previos y Herramientas

- **REA MCP Server (`morluto/rea`):** Instalado globalmente como `rea-agents` y registrado en `~/.gemini/config/mcp_config.json`. Ofrece 207 herramientas de ingeniería inversa y comandos como `rea-agents analyze-web-bundle`, `rea-agents inspect-web-page` y `rea-agents export-web-scripts`.
- **URL de referencia:** enlace HTTP/HTTPS público con diseño inspirador o representativo del rubro (ej: `https://www.kuemmerlein.de/`).
- **Rubro / Vertical:** slug normalizado (ej: `abogado`, `clinica`, `corporativo`, `nutricionista`).
- **Comando de inspección o chat directo:** `rea-agents` o `node scripts/rea-inspect.mjs <url> [rubro]`.

## Paso a Paso de Ejecución (SOP)

1. **Extracción & Análisis Estético (Inspección REA):**
   - Obtener el HTML y CSS de la URL objetivo (usando `read_url_content` o `scripts/rea-inspect.mjs`).
   - Identificar la paleta armónica **60-30-10**:
     - `fondo` (60%): color de lienzo base (claro, crema, sepia o neutro según el estilo).
     - `tinta` / secundario (30%): color de texto principal y fondos de tarjetas/secciones alternadas.
     - `primary` y `accent` (10%): color de botones de acción (CTA) y acentos de conversión.
   - Detectar familias tipográficas:
     - `fuente`: tipografía display/títulos (Serif elegante, Sans geométrica o Display editorial).
     - `fuente_sans`: tipografía de lectura y cuerpo.
     - *Regla mandatoria de tipografía (Misma fuente o similar):* Priorizar y utilizar las **mismas fuentes exactas de la web a copiar** (extraídas como webfonts/woff2 o CDNs abiertas como Fontshare/Google Fonts). De no ser viable utilizar la misma fuente original (por restricciones de licencia comercial cerrada o inaccesibilidad), buscar y configurar una **fuente similar / equivalente de máxima fidelidad visual y métrica**.
   - Analizar arquetipos de UI: curvatura de bordes (`rounded-none`, `rounded-xl`, `rounded-full`), sombras, densidad de espaciados y estilo de botones.

2. **Andamiaje del Template (`/templates/{rubro}/`):**
   - Crear el directorio `/templates/{rubro}/` clonando el andamiaje Astro desacoplado.
   - Configurar `templates/{rubro}/src/site.json` respetando rigurosamente el contrato inmutable:
     - Bloque `tema`: `primary`, `accent`, `fondo`, `tinta`, `fuente`, `fuente_sans`, `orden_secciones`.
     - Bloque `content`: `hero`, `marquee`, `prestador`, `problema`, `pasos`, `reviews`, `casos`, `pricing`, `faq`, `cta`.
   - Adaptar los componentes de presentación en `templates/{rubro}/src/components/` para reflejar la personalidad visual del nicho (ej: layout cálido y acogedor para psicología, minimalista y clínico para estética, estructurado y sobrio para abogacía).
   - Generar la suite de tests unitarios en `templates/{rubro}/tests/` verificando `site.json`, orden de secciones y compatibilidad con el motor de inyección.

3. **Verificación Automatizada & Build Demo:**
   - Crear la ficha de demo en `/clients/demo-{rubro}.md` con datos sintéticos verosímiles en voseo argentino profesional.
   - Compilar el clon de demo ejecutando:
     ```bash
     npm run build-site clients/demo-{rubro}.md
     ```
   - Auditar el sitio generado en `/sites/demo-{rubro}/` corriendo:
     ```bash
     npm run audit-site sites/demo-{rubro}
     ```
   - Verificar:
     - Cero errores de compilación Astro (SSG puro).
     - Cero scripts de terceros no declarados.
     - Presupuesto de JS propio `<= 35 KB`.
     - Contrastes accesibles en botones y textos.

4. **Versionado Inmutable Git & Disponibilidad en Catálogo:**
   - Crear el tag git correspondiente para congelar la versión del template:
     ```bash
     git tag template/{rubro}@1.0.0
     ```
   - Actualizar el catálogo de templates en `web/src/config.ts`:
     - Marcar el rubro como implementado/activo (`active: true`).
     - Enlazar la URL de demo pública (`https://preview.nexobow.site/demo-{rubro}/`).
   - Ejecutar la suite completa de pruebas:
     ```bash
     npm test
     ```

## Negaciones Explícitas (Qué NO hacer)

- **PROHIBIDO** copiar componentes o estilos de `web/` a `/templates/{rubro}/` (Violación de `ERROR-001`: la identidad Soft-Obsidian ejecutiva es exclusiva de la agencia NexoBow; cada rubro debe tener su identidad visual distintiva).
- **PROHIBIDO** alterar o romper el esquema de datos en `site.json` (`tema` + `content`), ya que causaría fallos en `scripts/build-client-site.mjs`, `generate-client-fiche.mjs` y `LeadStore`.
- **PROHIBIDO** ignorar la identidad tipográfica de la web de referencia: se deben utilizar las mismas fuentes originales del sitio a copiar (self-hosted o CDNs abiertas); solo si son inaccesibles o cerradas con DRM estricto se permite un fallback similar de máxima proximidad visual.
- **PROHIBIDO** superar el presupuesto de JS propio de `35 KB` en las landings generadas ni incluir scripts de telemetría de terceros no declarados.
- **PROHIBIDO** crear o desplegar un template sin su tag git inmutable `template/{rubro}@1.0.0` y su suite de tests unitarios verde.

## Salidas

- Nuevo template inmutable en `/templates/{rubro}/` con su propio `site.json` y suite de tests.
- Demo funcional compilada en `/sites/demo-{rubro}/` y accesible en `https://preview.nexobow.site/demo-{rubro}/`.
- Tag git inmutable `template/{rubro}@1.0.0`.
- Entrada activada en el catálogo de `web/src/config.ts`.
