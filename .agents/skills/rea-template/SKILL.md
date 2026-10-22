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

- **REA MCP Server (`morluto/rea`) — Estado verificado el 2026-10-22:**
  - ✅ Paquete oficial `rea-agents@6.7.0` (npm, `repository: github.com/morluto/rea`, MIT), instalado globalmente con binarios `rea` y `rea-agents` (nvm Node v22).
  - ✅ Registrado en `~/.gemini/config/mcp_config.json` como `npx -y rea-agents@6.7.0 mcp`; esquemas de herramientas en `~/.gemini/antigravity/mcp/rea/`.
  - ✅ Handshake MCP real: `serverInfo = rea@6.7.0`, `tools/list` = **207 herramientas**.
  - ⚠️ `rea-agents doctor` → `healthy: false` por (a) motores nativos ausentes (Hopper/Ghidra/IDA/JADX/Kuna: **irrelevantes** para REA web) y (b) `skill:identity` = `config_drift` (la skill oficial de REA no está instalada: ver acción humana H2).
  - ⚠️ **No hay Chrome/Chromium instalado** (solo Firefox) ni navegadores Playwright en caché: bloquea las herramientas web de REA hasta resolver H1.
- **Re-verificar antes de usar:** `rea-agents --version` y `rea-agents doctor`. Si el MCP `rea` no aparece como herramienta nativa del agente, reiniciar la sesión (H3); mientras tanto usar la CLI `rea-agents ...` por terminal.
- **Contrato REAL de la CLI web (NO aceptan `--url`):**
  - `rea-agents list-browser-targets <endpoint>` → obtiene el `targetId` de la pestaña abierta.
  - `rea-agents inspect-web-page <endpoint> <targetId>` → inspección pasiva (DOM, CSS, estilos).
  - `rea-agents analyze-web-bundle <endpoint> <targetId> [--fetch-source-maps]` → bundle estático.
  - `rea-agents export-web-scripts ...` → exporta scripts a un directorio inexistente.
  - `rea-agents capture-web-screenshot ...` / `capture-browser-scenario <inputJson>` (Playwright).
  - `<endpoint>` = CDP loopback, ej: `http://127.0.0.1:9222`, levantado con `chromium --remote-debugging-port=9222 --user-data-dir=/tmp/rea-profile <URL>`.
- **Fallback si REA web no está operativo:** `read_url_content` + `node scripts/rea-inspect.mjs <url> [rubro]` (script propio basado en fetch, **no** es REA). Declarar en la entrega que se usó el fallback y que la geometría/animaciones no fueron verificadas por CDP.
- **URL de referencia:** enlace HTTP/HTTPS público con diseño inspirador o representativo del rubro (ej: `https://www.kuemmerlein.de/`).
- **Rubro / Vertical:** slug normalizado (ej: `abogado`, `clinica`, `corporativo`, `nutricionista`).

## 🧑 Acciones Humanas Requeridas (el agente NO puede hacerlas)

| ID | Acción | Comando / Detalle | Bloquea |
| :-- | :-- | :-- | :-- |
| **H1** | Instalar un navegador Chromium (CDP) | `sudo apt install chromium` (o Chrome estable `.deb`). Alternativa Playwright: `npx playwright install chromium` | Inspección web REA (`inspect-web-page`, `analyze-web-bundle`, capturas) |
| **H2** | Instalar la skill oficial de REA y corregir `config_drift` | `npx rea-agents setup` (aprobar prompts interactivos; **rechazar** instalar Hopper salvo que se necesite análisis nativo). Luego `rea-agents doctor` | Warning `skill:identity`; workflows oficiales REA |
| **H3** | Reiniciar sesión/IDE de Antigravity | Para que el MCP `rea` quede expuesto como herramientas nativas del agente | Uso nativo de las 207 herramientas |
| **H4** | Por cada template: abrir la URL de referencia en el Chromium con puerto de depuración (si hay login/cookie wall o captcha) | `chromium --remote-debugging-port=9222 --user-data-dir=/tmp/rea-profile <URL>` | Capturas de sitios con muro de consentimiento |
| **H5** | Licencias tipográficas (Monument Grotesk, Rhymes Display, etc.) | Decidir comprar licencia o autorizar fallback libre (Space Grotesk / Instrument Serif / Inter) | Fidelidad tipográfica de cada template |
| **H6** | Aprobar el tag git y el push | `git tag template/{rubro}@1.0.0` + push a producción tras revisar la demo | Versionado inmutable |

> Opcionales (solo si se hace análisis nativo/APK, fuera del alcance web): `GHIDRA_INSTALL_DIR`, `HOPPER_LAUNCHER_PATH`, `REA_JADX_MCP_JAR`, `REA_KUNA_COMMAND`, `REA_IDA_MCP_CONFIG`.

## Paso a Paso de Ejecución (SOP)

0. **Pre-flight REA:** correr `rea-agents doctor` y confirmar que existe Chromium (H1). Si falta, **frenar y pedir la acción humana** (Gate Ask-First); no simular la inspección.

1. **Extracción & Análisis Estético (Inspección REA):**
   - Con Chromium en `--remote-debugging-port=9222` apuntando a la URL: `list-browser-targets` → `inspect-web-page` → `analyze-web-bundle` / `export-web-scripts` para obtener tokens CSS, fuentes, bundles y animaciones reales.
   - Complementar con `read_url_content` o `scripts/rea-inspect.mjs` (HTML/CSS estático).
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
     - Sin límite artificial de JS en `/templates/` y `/sites/` (solo tope Cloudflare Pages: 25 MB por activo); `web/` mantiene 0 JS.
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
- **PROHIBIDO** incluir scripts de telemetría de terceros no declarados. (No existe tope de JS en templates/sites; solo el límite de 25 MB por activo de Cloudflare Pages.)
- **PROHIBIDO** simular o inventar una inspección REA si Chromium/CDP no está disponible: frenar y pedir la acción humana H1, o declarar explícitamente el uso del fallback `read_url_content`/`rea-inspect.mjs`.
- **PROHIBIDO** crear o desplegar un template sin su tag git inmutable `template/{rubro}@1.0.0` y su suite de tests unitarios verde.

## Salidas

- Nuevo template inmutable en `/templates/{rubro}/` con su propio `site.json` y suite de tests.
- Demo funcional compilada en `/sites/demo-{rubro}/` y accesible en `https://preview.nexobow.site/demo-{rubro}/`.
- Tag git inmutable `template/{rubro}@1.0.0`.
- Entrada activada en el catálogo de `web/src/config.ts`.
