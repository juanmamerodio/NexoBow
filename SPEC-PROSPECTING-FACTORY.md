# Spec: Fábrica de Prospección y Conversión B2B (Skills de Alto Valor, Higiene Anti-Bloat & Compatibilidad Claude Code)

Términos de dominio definidos en [GLOSSARY.md](./GLOSSARY.md) y arquitectura en [ROUTEMAP.md](./ROUTEMAP.md).

## Problem Statement

NexoBow cuenta con un motor sólido de prospección (`scout-lead`, `sheets-sync`), generación de fichas (`generate-client-fiche`) y compilación de previews Astro SSG (`build-client-site`). Sin embargo, para salir a la calle a prospectar y cerrar los primeros 2-3 clientes pagos sin fricción, el sistema enfrenta cuatro cuellos de botella críticos:

1. **Riesgo de Inescalabilidad por Context Bloat (MCPs y Skills Infladas):**
   El entorno de desarrollo tenía habilitados plugins con 11 servidores MCPs y más de 37 skills irrelevantes (BigQuery, Spark, Dataproc, Bioinformática, Flutter) que consumían decenas de miles de tokens por turno, llevando al modelo a la "Dumb Zone" (>140k tokens). Además, existían skills huérfanas en `.agents/skills/` que no aportaban valor al negocio de NexoBow.

2. **Incompatibilidad de Descubrimiento con Claude Code:**
   NexoBow almacenaba sus skills en `.agents/skills/`. Al ejecutar Claude Code desde CLI, este busca por defecto en `.claude/skills/`, lo que impedía que Claude Code descubriera nativamente las herramientas del repositorio.

3. **Falta de QA Visual Automatizado antes del Envío (`screenshot-qa`):**
   Las previews personalizadas (`https://preview.nexobow.site/{slug}/`) se generan sin un pre-flight check visual en dispositivos móviles. Un desborde horizontal (`overflow-x`), un texto cortado o un contraste roto en una pantalla de `375px` destruye la autoridad de la agencia frente a médicos y abogados.

4. **Fricción en el Cierre Comercial de WhatsApp (`objection-handler`):**
   Cuando un prospecto responde con objeciones típicas ("es caro", "ya tengo Instagram", "no tengo tiempo", "tengo pocos pacientes"), el operador debe redactar respuestas improvisadas. Se carece de una matriz táctica estructurada en **voseo argentino profesional** anclada en la *Value Equation* de Alex Hormozi y los planes de NexoBow (`$189.999 ARS` / `$12.259 ARS`).

5. **Vacío Operativo en el Handoff Post-Venta (`domain-provisioner`):**
   Una vez que el cliente paga, no existe un procedimiento automatizado para migrar de la URL efímera `preview.nexobow.site/{slug}/` a su dominio definitivo (`.com.ar` en NIC Argentina o `.com`) en Cloudflare con SSL y DNS CNAME verificados.

6. **Ceguera de Apertura en Previews (`preview-telemetry`):**
   El operador no sabe si el prospecto abrió la preview, si interactuó con el `ThemeSwitcher` o si hizo clic en agendar, impidiendo calibrar el momento exacto del follow-up.

---

## Solution

Una solución integral y quirúrgica dividida en tres ejes:

1. **Higiene Operativa & Compatibilidad Claude Code:**
   - Desactivación definitiva de plugins pesados no relacionados (`data-agent-kit-plugin`, `science`, `flutter`).
   - Depuración de skills huérfanas o redundantes en `.agents/skills/` (`setup-matt-pocock-skills`, `teach`, `wayfinder`, `wait-what`, `to-questionnaire`).
   - Creación del symlink canónico `.claude/skills` -> `../.agents/skills` para que cualquier sesión de Claude Code o Antigravity comparta la misma biblioteca en tiempo real.

2. **Arsenal de Skills de Conversión y QA (Fase 2 ROUTEMAP):**
   - **`screenshot-qa`**: Script y skill ejecutora con Playwright headless para auditar previews en dual-viewport (`375px` móvil y `1440px` desktop), validando que no existan desbordes horizontales ni layout shifts y guardando reportes fotográficos en `.reports/screenshots/{slug}/`. Integrado como pre-flight check en `build-client-site.mjs` y `lead-to-live.mjs`.
   - **`objection-handler`**: Script interactivo CLI (`node scripts/handle-objection.mjs`) y skill con matriz de persuasión en voseo argentino con 3 ángulos (Alivio & Costo de oportunidad, Reversión de riesgo & 7 días, Apalancamiento AfterBow).
   - **`domain-provisioner`**: Script y skill para gestionar el handoff post-venta: configuración de registros DNS CNAME, validación de propagación y verificación de certificados SSL en Cloudflare Pages para dominios `.com.ar` y `.com`.
   - **`preview-telemetry`**: Componente/script ultraliviano (< 1 KB, 0 cookies, 0 scripts bloqueantes, Ley 25.326 compliant) para registrar aperturas, tiempo de permanencia, clics al CTA de WhatsApp y paleta activa en el ThemeSwitcher.

3. **Bases Estratégicas para Fase 3:**
   - Definición de directivas maestras para `legal-bow` (contratos B2B según Ley 25.326) y `business-bow` (CFO y finanzas en ARS).

---

## User Stories

1. As el operador de NexoBow, I want irrelevant plugins (DAK, Science, Flutter) disabled in the environment, so that my LLM token consumption is reduced by 20,000+ tokens per turn and the model remains in the Smart Zone (<100k tokens).
2. As el operador de NexoBow, I want `.claude/skills` to symlink to `.agents/skills`, so that Claude Code and Antigravity can discover and invoke the exact same skills without code duplication.
3. As el operador de NexoBow, I want obsolete and unused skills cleaned from the directory, so that the skills directory is lean, high-signal, and scalable.
4. As el operador de NexoBow, I want an automated visual QA test with Playwright (`screenshot-qa`), so that I can verify that my preview renders perfectly at 375px mobile and 1440px desktop before sending it to a lead.
5. As el operador de NexoBow, I want `screenshot-qa` to run automatically as a pre-flight check during `build-client-site` or `lead-to-live`, so that defective sites with horizontal overflow or clipped text are caught immediately.
6. As el operador de NexoBow, I want visual evidence screenshots saved in `.reports/screenshots/{slug}/`, so that I can inspect the final mobile view at a glance.
7. As el operador de NexoBow, I want an interactive objection handling CLI (`scripts/handle-objection.mjs`), so that I can enter a client's hesitation and get 3 calibrated responses in Argentine voseo ready to copy-paste into WhatsApp.
8. As el operador de NexoBow, I want objection responses grounded in Alex Hormozi's Value Equation and NexoBow's pricing ($189.999 ARS setup / $12.259 ARS/month), so that every reply emphasizes tangible return on investment and risk reversal.
9. As el operador de NexoBow, I want objection responses to leverage the AfterBow partnership, so that high-ticket prospects can be offered comprehensive video production alongside the conversion funnel.
10. As el operador de NexoBow, I want an automated domain provisioning tool (`domain-provisioner`), so that when a client pays, I can configure their custom domain (.com.ar or .com) on Cloudflare Pages in one command.
11. As el operador de NexoBow, I want `domain-provisioner` to output clear DNS CNAME instructions for Argentine registrars (NIC Argentina) and verify SSL certificate status, so that the client's site goes live without manual DNS errors.
12. As el operador de NexoBow, I want a lightweight (<1 KB, 0-cookie) telemetry snippet (`preview-telemetry`) injected in client previews, so that I receive signals when the prospect opens their landing, switches themes, or clicks the booking button.
13. As a prospective client visiting a preview, I want zero tracking cookies or invasive scripts, so that my privacy is strictly protected under Argentina's Ley 25.326.
14. As el operador de NexoBow, I want the full suite of unit and integration tests to pass with 0 failures, so that the existing 39 tests and new functionality remain 100% green.

---

## Implementation Decisions

1. **Higiene de Plugins y Desactivación de DAK**:
   - `data-agent-kit-plugin` se mantiene desactivado vía `JetboxWriteState` en el servidor de lenguaje local, eliminando 11 servidores MCPs y 37 herramientas de BigQuery/GCP.
   - Symlink canónico: `.claude/skills` apuntando a `.agents/skills`.

2. **Limpieza de Skills Obsoletas en `.agents/skills/`**:
   - Eliminación de scripts de setup e instructivos didácticos no utilizados en tiempo de ejecución: `setup-matt-pocock-skills`, `teach`, `wayfinder`, `wait-what`, `to-questionnaire`.
   - Preservación íntegra de las skills core del ciclo SDD (`grill-me`, `to-spec`, `to-tickets`, `implement`, `code-review`, `tdd`, `research`, `handoff`, `pr`).

3. **Arquitectura de `screenshot-qa` (Playwright Dual-Viewport)**:
   - Script ejecutor: `scripts/screenshot-qa.mjs`.
   - Soporte para ejecutar contra un servidor estático local o la URL pública de preview.
   - Viewports estándar:
     * Móvil: `375 x 812` (iPhone X / estándar móvil compacto).
     * Desktop: `1440 x 900` (Pantalla de escritorio ejecutiva).
   - Validaciones automáticas:
     * Detección de scroll horizontal no deseado (`document.documentElement.scrollWidth > window.innerWidth`).
     * Detección de elementos desbordados.
     * Captura de pantalla completa (full-page) y viewport inicial (above-the-fold) en `.reports/screenshots/{slug}/mobile.png` y `.reports/screenshots/{slug}/desktop.png`.
   - Integración opcional mediante flag `--skip-qa` o ejecución automática en `scripts/build-client-site.mjs`.

4. **Arquitectura de `objection-handler` (Persuasión en WhatsApp)**:
   - Script ejecutor: `scripts/handle-objection.mjs` con soporte interactivo CLI o argumentos (`--objecion "caro" --nicho "abogado" --nombre "Martín"`).
   - Matriz de 5 categorías de objeción principales:
     1. `precio`: "¿Por qué $189.999 ARS? Me parece caro."
     2. `instagram`: "Ya tengo Instagram / no necesito web."
     3. `tiempo`: "No tengo tiempo para ocuparme de una web."
     4. `dudas_pacientes`: "No sé si mis pacientes van a agendar por ahí."
     5. `decision`: "Tengo que pensarlo / consultarlo con mi socio."
   - Generación de 3 variantes de respuesta por categoría:
     * Variante 1: **Alivio & Costo de Oportunidad** (Hormozi: cuánto cuesta perder 2 pacientes particulares).
     * Variante 2: **Reversión de Riesgo & 7 Días** (Prueba activa de la demo, sin riesgo inicial).
     * Variante 3: **Apalancamiento Audiovisual AfterBow** (Para planes Pro / clínicas que buscan escalamiento integral).

5. **Arquitectura de `domain-provisioner` (Handoff Cloudflare)**:
   - Script ejecutor: `scripts/domain-provisioner.mjs`.
   - Argumentos: `--slug <slug> --domain <domain> [--check] [--dns-instructions]`.
   - Salida:
     * Generación de instrucciones paso a paso para NIC Argentina (`.com.ar`) o registradores de dominio (delegación DNS o registro CNAME `nexobow-previews.pages.dev`).
     * Verificación de resolución DNS vía `dns.resolveCname` y estado HTTP/HTTPS.

6. **Arquitectura de `preview-telemetry` (Telemetría Pasiva sin Cookies)**:
   - Script ejecutor / helper: `scripts/preview-telemetry.mjs`.
   - Payload mínimo de evento (<1 KB): `{ event: "preview_view" | "theme_switch" | "cta_click", slug: string, timestamp: number, theme?: string, cta?: string }`.
   - 0 almacenamiento de datos personales (IPs o cookies de terceros), garantizando 100% de cumplimiento con la Ley 25.326.

---

## Testing Decisions

- **Criterio de Buen Test**:
  - Probar comportamiento observable y contratos funcionales.
  - Cero dependencias de red externa en tests unitarios (usar mocks deterministas para Playwright o DNS).
- **Módulos bajo Prueba**:
  1. `tests/objection-handler.test.mjs`: Verifica que la matriz devuelva las 3 variantes de respuesta para cada una de las 5 objeciones principales con el slug y nombre del profesional inyectado en voseo argentino.
  2. `tests/domain-provisioner.test.mjs`: Verifica la generación correcta de instrucciones CNAME para NIC Argentina y el validador de configuración de dominio.
  3. `tests/screenshot-qa.test.mjs`: Verifica la función de auditoría visual (detección de overflow horizontal y generación de rutas de reportes).
  4. Suite de regresión global: `npm test` debe mantener los 39 tests existentes más los nuevos tests unitarios 100% en verde.

---

## Out of Scope

- Automatización robótica desatendida de WhatsApp (daemons de envío masivo / Baileys / Meta Cloud API) — queda planificada para Fase 3 tras validar los primeros clientes.
- Panel web administrativo (Dashboard React) — todo se opera vía CLI y Agent Skills en esta fase.

---

## Further Notes

- El archivo `.claude/skills` symlinkeado permite que cualquier usuario o agente que ejecute Claude Code interactúe de forma transparente con todas las herramientas de NexoBow.
- La estética Soft-Obsidian (`#040607`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`) se mantiene como estándar inmutable para `web/`.
