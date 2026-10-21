# ⚡ NexoBow — System Constitution (AGENTS.md)

## 📌 Misión y Arquitectura Core
Repositorio central de **NexoBow**: fábrica automatizada de embudos de venta y agendamiento para profesionales de servicios (nutricionistas, psicólogos, abogados, clínicas). Transformamos tráfico de WhatsApp, Instagram y Maps en consultorías agendadas mediante landings estáticas de carga instantánea (`<0.8s`).
- **Stack:** Astro + Tailwind CSS (`web/` mantiene SSG estricto con 0 JS ejecutable en cliente como benchmark; `/templates/` y `/sites/` usan arquitectura PREMIUM con presupuesto de JS propio `<= 35 KB` y cero scripts externos no declarados).
- **Integraciones:** Calendly / Google Calendar, Google Sheets (`'Prospección NexoBow'!B11:S1000`, Col B = ID, Col G = `Web Demo URL` vía `LeadStore`), Alianza Audiovisual con [**AfterBow**](https://www.afterbow.com).
- **Contratos del Sistema:** Leé `/brain.md` (conciencia técnica), `/memory.md` (estado del proyecto y errores documentados) y `/spec.md` (contrato maestro) **antes** de planificar o tocar código. Para términos de negocio, consultá `/GLOSSARY.md`. **IMPORTANTE:** `web/` = página de NexoBow (paleta **Soft-Obsidian**: `#040607`, `#0B0D12`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`), `/templates/` + `/sites/` = landings de prestadores (+10 direcciones estéticas exclusivas por REA). Identidades visuales TOTALMENTE distintas (ver `memory.md` → `ERROR-001`).

## 💻 Comandos de Ejecución y Verificación
- **Suite de Tests Completa:** `npm test` (`node --test tests/*.test.mjs`)
- **Build & Typecheck (`web/` o `/sites/{slug}`):** `npm run build` (Obligatorio ejecutar al finalizar cambios para verificar 0 errores de compilación, 0 `<script>` en `web/` y presupuesto JS en `/sites/{slug}`).
- **Ciclo de Vida 7 Días & Mejora Continua:** `npm run lead-lifecycle` y `npm run continuous-improvement`.
- **GitHub:** Utilizar git y pushear todo a producción (menos cuando se indique lo contrario).

## 📐 Convenciones e Idioma
- **Código y Arquitectura:** Nombres de archivos, componentes (`Header.astro`, `Hero.astro`, `BeforeAfter.astro`, `InteractiveFunnel.astro`, `TemplateCatalog.astro`, `RoiCalculator.astro`, `CaseStudies.astro`, `Pricing.astro`, `CreateBowSystem.astro`, `Founder.astro`, `Faq.astro`, `FinalCta.astro`, `Footer.astro`), variables y commits en **inglés**.
- **Copywriting y UI:** Todo texto visible para el usuario final en **español argentino** (voseo profesional).
- **Moneda y Precios Psicológicos:** Todo valor monetario debe expresarse en Pesos Argentinos con formato explícito (ej: `$189.999 ARS` Setup / `$12.259 ARS finales/mes`).
- **Correlatividad Google Sheets ↔ Fichas:** El ID de cada prospecto comienza en la **Columna B** (`B11:S1000`) de Google Sheets y mapea 1 a 1 al archivo `/clients/{id}-{nombre}-{apellido}-{rubro}.md` (ej: `22-alejandra-martinez-nutri.md`).
- **Política de Servidor Activo (TTL 7 Días):** Las demos de prospectos tienen una vigencia de 7 días desde su última actividad (`last_activity_at`). Si avanzan de estado en Google Sheets se renuevan por +7 días; en días 5–6 disparan alerta de seguimiento con urgencia; a los `>=7` días o estado `"Descartado"` se purgan automáticamente (protegiendo siempre `_ficha-template.md` y `demo-*`).

## 🛡️ Reglas Operativas del Agente (System Rules)
1. **Spec-Driven (No Vibe Coding):** Prohibido inventar dependencias, asumir datos faltantes o escribir código sin contexto. Respetá estrictamente la estructura modular del template.
2. **Gate de Planificación (Ask-First):** Si la ficha en `/clients/` tiene datos ambiguos o incompletos, **frená y preguntale al usuario** antes de generar o modificar un sitio.
3. **Conservación de Tokens y Edición:** Para cambios grandes en un archivo, usá una única operación de escritura completa en vez de múltiples ediciones secuenciales. No leas carpetas de `/sites/` ajenas al cliente actual.
4. **Orquestación y Sub-agentes:** Si una tarea requiere analizar +3 archivos o hacer auditoría de calidad, delegá en un sub-agente con ventana de contexto limpia.

## 📂 Mapa de Directorios y Límites (Boundaries)
- `/brain.md` -> **[LECTURA/ESCRITURA]** Cerebro de ejecución. Leelo al iniciar sesión; actualizalo al cerrar una tarea.
- `/memory.md` -> **[LECTURA/ESCRITURA]** Estado del proyecto + errores documentados (`ERROR-001`: NexoBow ≠ prestador). Leelo al iniciar sesión; actualizalo al cerrar una tarea.
- `/web/` -> **[SOLO LECTURA POR DEFECTO]** Página propia de la agencia NexoBow (Estándar Soft-Obsidian, 12 secciones). No copiar componentes a `/templates/` sin rediseño.
- `/clients/{id}-{nombre}-{apellido}-{rubro}.md` -> **[FUENTE DE VERDAD]** Ficha correlativa del prestador (YAML frontmatter con `sheet_id`, `lead_status`, `created_at`, `last_activity_at`, `expires_at` + Markdown). Plantilla base en `/clients/_ficha-template.md`.
- `/templates/{rubro}/` -> **[SOLO LECTURA POR DEFECTO]** Proyecto Astro maestro por vertical (ej: `nutricionista` Editorial Delta, y catálogo REA de +10 estilos). **Prohibido editar** salvo instrucción explícita.
- `/sites/{id}-{nombre}-{apellido}-{rubro}/` -> **[GENERADO / EFÍMERO]** Clon compilable del cliente. **Nunca se edita a mano**: se edita la ficha en `/clients/` y se regenera mediante skill (`edit-client-site` / `build-client-site`).
- `/assets/{id}-{nombre}-{apellido}-{rubro}/` -> **[LECTURA]** Recursos gráficos optimizados del prestador.
- `/.agents/skills/` -> **[PULL CONTEXT]** SOPs modulares ejecutables bajo demanda.

## 🛠️ Enrutamiento de Skills (Pull Workflows)
*No cargues estas instrucciones en memoria hasta que el usuario solicite la tarea. Cuando ocurra, leé el `SKILL.md` correspondiente en `/.agents/skills/`:*
- **`standard`**: **[GATE OBLIGATORIO DE CALIDAD VISUAL & 3D]** Define el estándar **Soft-Obsidian** (`#040607`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`) para `web/`: logo Outfit Bold (`Nexo` en `#F8F6FF` y `Bow` en `#BF40FA`), escena 3D CSS del embudo, interactividad 0-JS y respeto a `prefers-reduced-motion`.
- **`scout-lead`**: Prospección in-conversation con Google Maps Platform / Serper Dev, filtrado de profesionales sin sitio web propio, deduplicación contra Google Sheets (`'Prospección NexoBow'!B11:S1000`) e inserción desde Columna B con slug correlativo `{id}-{nombre}-{apellido}-{rubro}`.
- **`generate-client-fiche`**: Genera `/clients/{slug}.md` con copywriting en voseo argentino, dolores Hormozi, metadatos TTL de 7 días (`sheet_id`, `expires_at`), fallback a WhatsApp y cumplimiento Ley 25.326.
- **`build-client-site`**: Clona `/templates/{rubro}/` hacia `/sites/` verificando tag git `template/{rubro}@x.y.z`, inyecta assets locales y el contenido/tema de `/clients/{slug}.md`, verifica el build y registra `https://preview.nexobow.site/{slug}/` en Columna G vía `LeadStore`.
- **`edit-client-site`** (`/editar-web-cliente`): Modifica en 1 comando la ficha de un cliente en `/clients/`, recompila con `build-client-site` y audita con `audit-code`.
- **`lead-lifecycle`** (`/seguimiento-leads`): Sincroniza estados con Google Sheets, renueva leads activos (+7d), genera alertas de urgencia en días 5–6 (<48hs) y purga demos vencidas (`>=7d` o `"Descartado"`), además de correr el motor de Mejora Continua (`continuous-improvement.mjs`).
- **`flow-advisor`** (`/next-step` / `/ask-matt`): Unifica el flujo SDD de Matt Pocock (`prompts_structure.md`), `audit-code` y las métricas de Google Sheets para recomendar el siguiente paso exacto.
- **`audit-code`**: Ejecutar **siempre en un sub-agente con sesión limpia** tras construir o actualizar un sitio. Audita performance en Astro, accesibilidad, contraste de CTAs, 0 JS estricto en `web/` y presupuesto de JS propio (`<= 35 KB` sin terceros no declarados) en `/sites/`.
- **`deploy-cloudflare`**: Publica el sitio en Cloudflare Pages usando Wrangler CLI bajo el dominio unificado `https://preview.nexobow.site/{slug}/`.
- **`lead-to-live`**: Orquestador maestro end-to-end: ejecuta `scout-lead` → `generate-client-fiche` → `build-client-site` → `audit-code` → `deploy-cloudflare`.
- **`rea-template`**: Motor de Ingeniería Inversa de Templates (REA): toma una URL de referencia y un rubro, extrae la identidad visual (paleta 60-30-10, fuentes, layout), andamia el nuevo template Astro inmutable en `/templates/{rubro}/` con contrato `site.json` desacoplado, compila la demo en `/sites/demo-{rubro}/`, audita presupuesto JS (`<= 35 KB`) y genera el tag git `template/{rubro}@1.0.0`.

## 🔄 Ciclo de Desarrollo Agéntico & Tracking de Estado (Main Flow)
Para cualquier tarea de diseño, refactor o feature en el repo, el agente debe seguir obligatoriamente las fases definidas en [`/prompts_structure.md`](file:///home/juanmamerodio/Desktop/NexoBow/prompts_structure.md) e identificar explícitamente en qué etapa se encuentra:
1. **Fase 1: `/grill-me` (Alineación)** — Ronda estructurada de preguntas con opciones recomendadas. Prohibido saltar a código.
2. **Fase 2: `/to-spec` (Especificación)** — Colapsar respuestas en criterios de aceptación y arquitectura de componentes.
3. **Fase 3: `/to-tickets` (Descomposición)** — Dividir el spec en tajadas verticales atómicas con dependencias claras.
4. **Fase 4: `/implement` (TDD & Build)** — Construcción componente por componente con verificación `npm run build`.
5. **Fase 5: `/code-review` o `/audit-code` (Auditoría)** — Revisión de estándares (0 JS en `web/`, presupuesto JS en `/sites/`, a11y, identidad) y fidelidad al spec.
*El agente debe declarar en su respuesta la fase activa actual (ej: `[FASE ACTUAL: 4. IMPLEMENT]`) y guiar al usuario hacia el siguiente prompt de forma automática.*

## 🧠 Aprendizaje Aplicado (Self-Evolving Log)
- NexoBow ≠ prestador: `web/` (Soft-Obsidian) y `templates/` (estilos por rubro REA) tienen identidades visuales independientes (`ERROR-001`).
- No asumir el estilo de un template sin dirección estética previa del usuario (gate Ask-First de diseño).
- Identificar siempre la fase activa del Main Flow según `/prompts_structure.md` antes de actuar.
- En Google Sheets (`Prospección NexoBow`), el ID (`Nº`) comienza en la **Columna B** (`B11:S1000`), nunca en la Columna A.
- Mantener correlatividad 1:1 entre Google Sheets y fichas locales: `{id}-{nombre}-{apellido}-{rubro}.md` con expiración automática a los 7 días de inactividad.
