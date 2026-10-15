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

**Status:** ready-for-agent

- [ ] Lee la ficha (`_ficha-template.md`) y valida campos obligatorios antes de clonar; frena con pregunta si faltan datos (gate Ask-First).
- [ ] Aplica tema (paleta, fuente, orden) y contenido (bio, reseñas, casos, FAQ) **sin tocar componentes**.
- [ ] Verifica `npm run build` del clon generado.
- [ ] Nunca edita a mano el clon para corregir datos de negocio (se edita la ficha y se regenera).

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

## Frontera (orden de trabajo)

Estado al 2026-10-14: **T01 completado** (template `nutricionista` reconstruido con dirección estética del usuario: referencia **Delta Cafés** — editorial crema/café/rojo `#e70025`, serif Fraunces + sans Archivo, REA de deltacafes.com; theme-driven vía `site.json` con `fondo`/`tinta`/`fuente_sans` nuevos, tests `node:test` en `tests/`). Siguientes: **T02 → T03** (pendientes, con T02 sin gate `standard`: el estándar del template es el estilo Delta, no el de NexoBow — ver ERROR-001), luego **T04 ∥ T05** (skills borradas en el reset, recrear contra el template nuevo), **T06 → (T09, T10)**. T07/T08/T11: ready-for-human.

## Pendientes abiertos que bloquean tickets

- **T10** depende de decidir cómo se mide "consultoría concretada" (Pendiente abierto del spec).
- **T11** requiere un profesional legal (Pendiente abierto del spec).
- **Fase 2 (fuera de MVP):** bot WhatsApp con Cloud API de Meta, recordatorios por WhatsApp, scraping de Maps — no entran en estos tickets.
