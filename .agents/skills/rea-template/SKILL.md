---
name: rea-template
description: "Duplica una web de referencia real como template Astro en /templates/{rubro}/ usando el MCP REA (morluto/rea, rea-agents) por CDP: extrae DOM, CSS, fuentes, bundles y animaciones reales; reconstruye componentes propios; conserva el contrato site.json; registra el template en build-client-site; compila demo en /sites/demo-{rubro}/ y fija el tag git template/{rubro}@x.y.z. Usar cuando el usuario diga 'duplicá <URL>' o pida un ticket de template (20-32)."
tools: ["read_file", "write_to_file", "execute_command", "read_url_content"]
---

# 🎨 REA Template — Duplicar una web real como template NexoBow

## Qué hace cada parte (no confundir)
- **REA (MCP/CLI):** solo **observa** la web de referencia y devuelve evidencia (DOM, estilos computados, fuentes, scripts, bundles, red). **No genera código ni clona.**
- **Esta skill (el agente):** convierte la evidencia en un proyecto Astro propio, con la misma estética, estructura, animaciones y componentes únicos de la referencia.
- **Copy:** es texto de relleno por slots (`site.json`). El copy real de cada cliente lo inyecta `build-client-site`. Nunca copiar el texto de la referencia como copy final.

## Gate Ask-First (obligatorio, antes de escribir código)
Confirmar con el usuario: URL, `rubro` (slug del folder), `arquetipo`, secciones/animaciones a copiar, y si el template existente se **reemplaza** (ver "Templates existentes"). Declarar la fase (`/grill-me` → `/implement`) según `prompts_structure.md`.

## Estado del entorno (verificado 2026-10-22)
- `rea-agents@6.7.0` global, registrado en `~/.gemini/config/mcp_config.json`, 207 tools, skill oficial `reverse-engineer-anything` instalada, Chromium 154 en `/usr/bin/chromium`.
- Verificado de punta a punta contra `kuemmerlein.de`: `list-browser-targets`, `inspect-web-page` y `analyze-web-bundle` devuelven evidencia real.
- `rea-agents doctor` reporta `healthy:false` por motores nativos (Hopper/Ghidra/IDA/JADX/Kuna): **irrelevantes para web**. Re-verificar antes de cada template con `rea-agents doctor` + `rea-agents --version`.
- Si el MCP `rea` no figura como tool nativa, llamarlo con `call_mcp_tool` (server `rea`) o por CLI `rea-agents ...`.

## Paso 0 — Captura de evidencia con REA (CDP)
Las tools web **no aceptan `--url`**: requieren `<endpoint CDP> <targetId>`.

```bash
# 1) Chromium headless con CDP (usar PID file; NUNCA `pkill -f`/`pgrep -f`: matchea el propio shell y cancela el comando)
chromium --headless=new --no-sandbox --remote-debugging-port=9222 \
  --user-data-dir=/tmp/rea-profile-{rubro} "<URL>" >/tmp/rea-chromium.log 2>&1 &
echo $! > /tmp/rea-chromium.pid; sleep 9

# 2) targetId = el target con type=="page" y url http(s) (NO tomar el primer id de /json)
rea-agents list-browser-targets http://127.0.0.1:9222 --format json
TID=$(curl -s http://127.0.0.1:9222/json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(t=>t.type==='page'&&t.url.startsWith('http')).id))")

# 3) evidencia (cada salida queda en .reports/rea/{rubro}/)
mkdir -p .reports/rea/{rubro}
rea-agents inspect-web-page   http://127.0.0.1:9222 $TID --observation-ms 3000 --include-script-sources --format json > .reports/rea/{rubro}/page.json
rea-agents analyze-web-bundle http://127.0.0.1:9222 $TID --fetch-source-maps --format json > .reports/rea/{rubro}/bundle.json
# JS/animaciones legibles (GSAP, Lenis, three, etc.): toma el JSON guardado y un directorio ABSOLUTO inexistente
rea-agents export-web-scripts "$PWD/.reports/rea/{rubro}/page.json" "$PWD/.reports/rea/{rubro}/scripts"
rea-agents capture-web-screenshot http://127.0.0.1:9222 $TID --format json   # referencia visual para comparar luego

# 4) cerrar siempre
kill $(cat /tmp/rea-chromium.pid); rm -rf /tmp/rea-profile-{rubro} /tmp/rea-chromium.pid
```
- Para scroll/hover/transiciones usar `capture-browser-scenario <inputJson>` (Playwright) o `inspect-web-event-listeners`.
- Páginas internas (subpáginas relevantes): repetir con cada URL; una landing de template cubre las secciones de la home, pero registrar en el ticket qué subpáginas se omiten.
- Si falla CDP o el sitio exige login/captcha/cookies → **frenar y pedir al usuario** abrir la URL (H4). Fallback declarado: `read_url_content` + `node scripts/rea-inspect.mjs <url> [rubro]` (**no es REA**; avisar que animaciones y geometría no fueron verificadas).

## Paso 1 — Análisis estético (desde la evidencia, no de memoria)
- Paleta **60-30-10** con valores reales (`getComputedStyle`): `fondo` (60%), `tinta` (30%), `primary`/`accent` (10%). Sumar 3 `paletas_alternativas` armónicas para el ThemeSwitcher.
- Fuentes **exactas** (woff2/Fontshare/Google). Si son comerciales o inaccesibles → fallback libre de máxima fidelidad métrica, declarado (decisión H5 del usuario).
- Arquetipos de UI: radios, sombras, densidad, botones, grilla, recortes SVG, tipografía fluida, easing/duración de animaciones y librerías detectadas en el bundle.
- Inventario de secciones y componentes **únicos** (nav, hero, cursor, marquee, carruseles, 3D, loaders, transiciones de página). Cada uno se mapea a un componente Astro propio.

## Paso 2 — Andamiaje del template (`/templates/{rubro}/`)
- Base técnica: copiar solo la **infraestructura** de un template existente (`package.json`, `astro.config.mjs`, `tsconfig.json`, `src/theme.ts`, `src/site.ts`, `tests/`). **Los componentes, layout, estilos y orden de secciones se reescriben a partir de la referencia.** Prohibido dejar los componentes de Delta Cafés/nutricionista.
- JS sin límite artificial (GSAP, Lenis, three, Rive, motion ya disponibles); solo rigen 25 MB por activo (Cloudflare Pages). Respetar `prefers-reduced-motion`.
- Pasar `impeccable detect templates/{rubro}` y corregir antes de seguir.

### Contrato `site.json` (inmutable: lo consume `scripts/build-client-site.mjs`)
```
tema: { primary, accent, fondo, tinta, fuente, fuente_sans, orden_secciones[] }
paletas_alternativas: [{ nombre, fondo, tinta, primary, accent } x4]
content: { hero, marquee, prestador, problema, pasos, reviews, casos, pricing, faq, cta, ... }
```
- Se pueden **agregar** claves de `content` o secciones nuevas (propias de la referencia); **no** renombrar ni quitar las existentes: `build-client-site` hace `patch` sobre ellas (`reviews[]`, `casos[]`, `faq[{q,a}]`, WhatsApp, `bookingUrl`, `nombre`, `tagline`).
- Todo componente lee del `site.json`; cero texto hardcodeado de la referencia.
- Obligatorio: botón de WhatsApp/CTA de agenda visible (lo exige `audit-site`), `ThemeSwitcher.astro` con paletas + botón WhatsApp precargado, precios en `$X ARS`, voseo argentino, Ley 25.326 en footer.
- **Tipografía:** `src/theme.ts#fontUrl` solo genera URLs de Google Fonts. Si la fuente exacta no está allí, self-hostear en `public/fonts/` con `@font-face` y ajustar `fontUrl`/`Layout.astro` **sin cambiar** la forma de `tema`.

## Paso 3 — Registro en el pipeline
Editar `scripts/build-client-site.mjs` (y su test):
- `RUBRO_TO_ARCHETYPE_MAP`: `{rubro}` → arquetipo.
- `ARCHETYPE_ALIASES`: arquetipo → `[rubro, arquetipo]` para que `resolveTemplateSourceDirectory` encuentre la carpeta.
- Ejecutar `npm test` (suite raíz) tras el cambio.

## Paso 4 — Verificación (todo debe pasar)
```bash
cd templates/{rubro} && npm install && npm run build && npm test   # tests: site.json, orden de secciones, tema
cd ../.. && npm run build-site clients/demo-{rubro}.md             # ficha demo sintética en voseo (crearla antes)
npm run audit-site sites/demo-{rubro}
node scripts/screenshot-qa.mjs demo-{rubro}                         # 375px y 1440px: sin overflow-x (arg2 opcional: URL)
.agents/skills/impeccable/scripts/impeccable detect templates/{rubro}
npm test
```
- **Fidelidad:** comparar screenshots de la referencia vs la demo (1440px y 375px) y listar diferencias aceptadas. Anotar en el ticket qué animaciones/3D quedaron aproximadas.
- **Auditoría limpia:** correr `audit-code` en sub-agente con sesión limpia.

## Paso 5 — Versionado y catálogo
- **Tags inmutables:** nunca mover ni reescribir un tag existente. Hoy existen `template/abogado@1.0.0`, `clinica@1.0.0`, `corporativo@1.0.0`, `nutricionista@1.0.0`, `obsidian-authority@1.0.0`, `architectural-prestige@1.0.0`, `high-ticket-consulting@1.0.0`, `editorial-classic@1.0.0`. Verificar con `git tag -l 'template/*'`.
- Template nuevo → `@1.0.0`. **Reemplazo de uno existente → `@2.0.0`** (los clientes bloqueados en 1.0.0 conservan su código; `--upgrade-template` migra a 2.0.0).
- Crear el tag y hacer push **solo con aprobación del usuario** (H6).
- Actualizar `web/src/config.ts` (`active: true`, `demoUrl: https://preview.nexobow.site/demo-{rubro}/`).
- Actualizar `tickets.md`, `memory.md` y `brain.md` al cerrar.

## Templates existentes (advertencia)
`templates/abogado`, `clinica` y `corporativo` comparten **exactamente los mismos componentes** que `nutricionista` (re-skins): violan `ERROR-005`. Los tickets 20-22 los reemplazan con duplicaciones reales; por eso son `@2.0.0` si se conserva el rubro. `templates/nutricionista` (Delta Cafés) es el único legítimo y **no se toca**.

## 🧑 Acciones humanas (el agente no puede hacerlas)
| ID | Acción | Estado |
| :-- | :-- | :-- |
| H1 | Chromium con CDP (`sudo apt install chromium`) | ✅ hecho |
| H2 | `npx rea-agents setup` (skill oficial) | ✅ hecho |
| H3 | Reiniciar IDE para tools nativas | opcional (hoy vía `call_mcp_tool`) |
| H4 | Abrir manualmente URLs con login/captcha/cookie wall | por template, si aplica |
| H5 | Licencias tipográficas: comprar o autorizar fallback libre | por template |
| H6 | Aprobar tag git + push a producción | por template |

## Negaciones explícitas
- **PROHIBIDO** reusar componentes, layout o estilos de `nutricionista`/Delta Cafés o de `web/` (Soft-Obsidian) en otro template (`ERROR-001`, `ERROR-005`).
- **PROHIBIDO** romper el esquema `tema` + `content` de `site.json`.
- **PROHIBIDO** simular o inventar una inspección REA sin CDP: usar la evidencia real o declarar el fallback.
- **PROHIBIDO** tocar tags existentes, editar `/sites/{slug}` a mano o incluir telemetría de terceros no declarada.
- **PROHIBIDO** entregar sin build 0 errores, tests verdes, `audit-site`, QA dual-viewport e `impeccable detect` sin anti-patrones críticos.
- Usar `pkill -f`/`pgrep -f` con el patrón del puerto en el mismo comando (mata el shell).

## Salidas
- `/templates/{rubro}/` con componentes propios, `site.json`, tests y evidencia en `.reports/rea/{rubro}/`.
- Registro en `scripts/build-client-site.mjs` y entrada activa en `web/src/config.ts`.
- Demo en `/sites/demo-{rubro}/` → `https://preview.nexobow.site/demo-{rubro}/`.
- Tag `template/{rubro}@x.y.z` (tras aprobación) y ticket/memoria actualizados.
