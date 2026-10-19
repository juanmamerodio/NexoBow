# Tickets del MVP — NexoBow

> Descomposición en **tajadas verticales (tracer bullets)** del `spec.md`, bajo el ciclo SDD de `brain.md`: cada ticket corta un camino completo y demoable (ficha → template → clon → build → auditoría → deploy), no una capa horizontal.
>
> **Convenciones:** vocabulario de `GLOSSARY.md` (prestador, paciente, embudo, landing, ficha, template, clon, consultoría gratuita, caso de éxito). Nombres de componentes en inglés (`Hero`, `Problem`, `Steps`, `Pricing`, `Reviews`, `CaseStudy`). Estado `ready-for-agent` salvo donde hay humano-en-el-medio.

## Mapa de dependencias (bloqueos)

```
T01 (scaffold template + tema)          ──►  T02 (Hero tracer: CTA a Calendly) ──► T03 (secciones completas)
                                                                                        │
                              ┌─────────────────────────────────────────────────────────┤
                              ▼                                                         ▼
                        T04 (skill build-client-site)                            T05 (skill audit-code)
                              └──────────────────────────────┬──────────────────────────┘
                                                             ▼
                                                        T06 (primer prestador e2e + deploy)

Paralelos (sin bloqueo, humano-en-el-medio):
   T07 (cuestionario de onboarding)   T08 (planilla de prospección)   T11 (revisión legal)
Dependientes del embudo vivo:
   T09 (WhatsApp Business)            T10 (métrica agendadas/concretadas)   ← bloqueados por T06
```

---

## Prefactor

### T01 — Scaffold del template `nutricionista` y componentes "theme-driven"

**Qué entrega (de punta a punta):** un proyecto Astro base por rubro donde la paleta, la tipografía y el orden de secciones se resuelven por **variables de tema** (Tailwind/CSS), sin valores hardcodeados de NexoBow. Es el paso "hacé fácil el cambio" antes de inyectar fichas reales.

**Blocked by:** Ninguno (puede empezar ya).

**Status:** ready-for-agent

- [x] Existe `templates/nutricionista/` con Astro SSG + Tailwind, partiendo del prototipo `web/` (se extraen los componentes existentes `Hero`, `Problem`, `Steps`, `Pricing`).
- [x] Los componentes leen paleta (`primary`, `accent`), `fuente` y `orden_secciones` desde tokens de tema, no desde un `config.ts` fijo.
- [x] `npm run build` termina con 0 errores y sin JS innecesario en el bundle (SSG estricto).
- [x] El contenido de ejemplo (lorem) se marca claramente como placeholder reemplazable por la ficha.

---

## Núcleo (vertical slices)

### T02 — Hero tracer bullet: CTA a Calendly en <3 clics

**Qué entrega:** el camino más fino del embudo: una landing estática cuyo `Hero` renderiza desde el tema y cuyo botón principal lleva a Calendly, con el botón de WhatsApp. Es el hilo conductor que valida el flujo punta a punta antes de sumar secciones.

**Blocked by:** T01.

**Status:** ready-for-agent

- [ ] El `Hero` pasa el gate de `standard` (logo `Nexo`/`Bow`, tipografía Outfit, micro-interacción de botón Büro, `prefers-reduced-motion`).
- [ ] El CTA principal abre el link de Calendly; el secundario abre WhatsApp (ambos configurables).
- [ ] Un paciente puede ir del `Hero` a Calendly en menos de 3 clics, con JS deshabilitado.
- [ ] `npm run build` verde.

### T03 — Secciones de confianza completas (Problem, Steps, Pricing, Reviews, CaseStudy)

**Qué entrega:** la landing completa del prestador con todas las secciones que concentran confianza (casos de éxito, reseñas, pasos, oferta), todas alimentadas por la ficha y ordenadas por `orden_secciones`.

**Blocked by:** T02.

**Status:** ready-for-agent

- [ ] Componentes `Reviews` y `CaseStudy` creados (no existen aún) y `Problem`, `Steps`, `Pricing` pasados a contenido de ficha.
- [ ] Reseñas solo de Google Maps públicas o con `consentimiento_testimonios: true` (regla de salud).
- [ ] Montos en ARS con formato explícito (`$200.000 ARS` / `$10.000 ARS`), copy voseo argentino, regla Hormozi (cero humo).
- [ ] `npm run build` verde y layout responde a `orden_secciones`.

---

## Skills de orquestación

### T04 — Skill `build-client-site` (clonar template + inyectar ficha + build)

**Qué entrega:** el SOP que, a partir de una ficha válida en `/clients/`, clona `templates/nutricionista/`, inyecta contenido/tema y genera el clon en `/sites/` con build verde. Es el ejecutor del desacoplamiento Template/Contexto del `brain.md`.

**Blocked by:** T03.

**Status:** completed (2026-10-18)

- [x] Lee la ficha (`_ficha-template.md` o cliente real) y valida campos obligatorios antes de clonar; frena con pregunta si faltan datos (gate Ask-First).
- [x] Aplica tema (paleta Delta Cafés, fuente, orden) y contenido (bio, reseñas, casos, FAQ) **sin tocar componentes**.
- [x] Verifica `npm run build` del clon generado (build verde estático con 0 errores y 16 tests pasando).
- [x] Nunca edita a mano el clon para corregir datos de negocio (se edita la ficha y se regenera).

### T05 — Skill `audit-code` (auditoría en sesión limpia)

**Qué entrega:** el SOP de auditoría que corre en sub-agente con ventana limpia y valida performance Astro, accesibilidad, contraste de CTAs y purga de clases Tailwind, contra el checklist de `standard`.

**Blocked by:** T03.

**Status:** ready-for-agent

- [ ] Produce un reporte checklist (logo, Hero con flujo WhatsApp→agenda, botones, `prefers-reduced-motion`, build 0 errores, regla Hormozi).
- [ ] Revisa accesibilidad y contraste de CTAs.
- [ ] Purga clases duplicadas de Tailwind.
- [ ] Se ejecuta en sesión limpia (anti sesgo de confirmación), nunca en la misma sesión que generó el clon.

---

## Primer caso de éxito (embudo vivo)

### T06 — Primer prestador de punta a punta: ficha → build → audit → deploy con subdominio

**Qué entrega:** el primer clon real de un prestador publicado con subdominio (`*.nexobow.com`) en Netlify (primeros casos) o Vercel, con paciente yendo de Maps a la landing y de ahí a Calendly en <3 clics. Es la tajada que valida el negocio completo.

**Blocked by:** T04, T05.

**Status:** ready-for-agent

- [ ] Ficha real del prestador con consentimiento de testimonios definido, WhatsApp y link de Calendly.
- [ ] Clon generado y auditado; deploy final aprobado por humano (humano-en-el-medio).
- [ ] Subdominio funcionando y landing cargando en milisegundos (estático, sin JS innecesario).
- [ ] Copy y consentimiento aprobados por el prestador antes de publicar.

---

## Operación y cumplimiento (paralelos, humano-en-el-medio)

### T07 — Cuestionario de onboarding

**Qué entrega:** el cuestionario único que recolecta bio, enfoque, reseñas (con fuente), casos de éxito y FAQ, más el consentimiento de testimonios, para completar la ficha sin asumir datos.

**Blocked by:** Ninguno (puede empezar ya).

**Status:** ready-for-human

- [ ] Captura todos los campos obligatorios del frontmatter de la ficha.
- [ ] Incluye pregunta explícita de consentimiento escrito para testimonios.
- [ ] Redactado en voseo argentino profesional.

### T08 — Planilla de prospección (20 contactos/semana)

**Qué entrega:** la planilla de seguimiento del ritmo comercial: al menos 20 contactos semanales desde Google Maps (fichas con reseñas, WhatsApp visible, sin agenda ni web), hacia el meta de primer cliente en 30 días.

**Blocked by:** Ninguno (puede empezar ya).

**Status:** ready-for-human

- [ ] Registra fuente (Google Maps), estado del prestador y próxima acción.
- [ ] Soporta el ciclo de estados de la ficha (prospecto → onboarding → … → activo).
- [ ] Envío de mensajes en frío hecho por humano (fuera del agente).

### T09 — WhatsApp Business: bienvenida + respuestas rápidas → link de Calendly

**Qué entrega:** que un paciente que escribe por WhatsApp reciba automáticamente el link de Calendly, **sin API de Meta** (mensaje de bienvenida y respuestas rápidas de WhatsApp Business).

**Blocked by:** T06.

**Status:** ready-for-human

- [ ] Mensaje de bienvenida configurado.
- [ ] Respuestas rápidas que entregan el link de Calendly del prestador.
- [ ] Verificado con un envío real de prueba.

### T10 — Métrica de consultorías agendadas / concretadas

**Qué entrega:** la definición y registro mensual de la métrica de éxito (consultorías gratuitas agendadas y cuántas se concretaron) que se muestra al prestador para que renueve.

**Blocked by:** T06.

**Status:** ready-for-agent

- [ ] Definido cómo se mide "concretada" (dato manual del prestador o panel de Calendly — pendiente del spec).
- [ ] Se registra en `metricas` de la ficha (agendadas_mes / concretadas_mes).
- [ ] Proceso de actualización mensual documentado.

### T11 — Revisión legal de publicidad en salud (Ley 25.326)

**Qué entrega:** checklist legal mínimo que blinda el copy y los testimonios (consentimiento, publicidad de resultados en salud, datos personales).

**Blocked by:** Ninguno (puede empezar ya).

**Status:** ready-for-human

- [ ] Revisado con un profesional el marco de publicidad en salud.
- [ ] Checklist incorporado al gate de `standard`/`build-client-site` (testimonios solo con consentimiento; si no, reseñas públicas).

---

## NexoBow System — Prospección & Web Privada (Tickets N01 - N05)

Gestionados también como archivos individuales bajo `.scratch/nexobow-system/issues/`:

### N01 — Generador por Lotes de Demos y Subrutas Unificadas
**Qué entrega:** Script CLI (`scripts/prospect-batch.mjs`) que procesa 15 prospectos de Google Maps, genera fichas en `/clients/` y compila cada landing en `dist-previews/{slug}/` devolviendo un JSON con metadatos y enlaces a `preview.nexobow.com/{slug}`.
**Blocked by:** Ninguno.
**Status:** completed (2026-10-19)

### N02 — Despliegue Unificado a Cloudflare Pages (preview.nexobow.com)
**Qué entrega:** Script de despliegue (`scripts/deploy-previews.mjs`) que sincroniza el directorio unificado `dist-previews/` con el proyecto de Cloudflare Pages para `preview.nexobow.com`.
**Blocked by:** N01.
**Status:** completed (2026-10-19)

### N03 — Servidor Privado y API de NexoBow System
**Qué entrega:** Microservidor en Node.js (`server/index.mjs`) con auth por Token Bearer (`NEXOBOW_SYSTEM_KEY`) para listar prospectos (`GET /api/leads`), disparar lote (`POST /api/batch-scout`) y actualizar estado (`POST /api/leads/:slug/status`).
**Blocked by:** N01.
**Status:** completed (2026-10-19)

### N04 — PWA / Dashboard Web Privado para Celular
**Qué entrega:** Dashboard mobile-first instalable como PWA en el celular del operador para revisar los 15 leads matutinos, ver preview con un tap, abrir WhatsApp con copy prellenado y disparar lotes.
**Blocked by:** N03.
**Status:** completed (2026-10-19)

### N05 — Workflow de Automatización n8n & Sincronización con Google Sheets
**Qué entrega:** Workflow exportable en JSON (`workflows/n8n-daily-prospecting.json`) que corre a las 08:00 AM, invoca la API de NexoBow System, vuelca los leads en Google Sheets y notifica a la web móvil.
**Blocked by:** N01, N03.
**Status:** completed (2026-10-19)

---

## Frontera (orden de trabajo)

- **Fase Core Pipeline**: Pipeline individual `lead-to-live` 100% verificado con tests verdes (2026-10-19).
- **Fase NexoBow System**: Tickets N01, N02, N03, N04 y N05 implementados y 100% verificados con tests automatizados.
- **Próximos pasos**: Revisión y configuración en vivo de credenciales de Cloudflare Pages (`preview.nexobow.com`) y Google Sheets en n8n por el operador.

