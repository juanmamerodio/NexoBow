# 🧭 NexoBow Prompt Structure & Workflows (Main Flow)

Este documento define la estructura y secuencia de prompts estándar para el desarrollo de funcionalidades, refactors y mejoras dentro de **NexoBow** (basado en el flujo `idea → ship` de Matt Pocock + la arquitectura de `brain.md` y `AGENTS.md`).

---

## 🗺️ Mapa del Flujo Principal (`idea → ship`)

```text
[ 1. /grill-me ] ──► [ 2. /to-spec ] ──► [ 3. /to-tickets ] ──► [ 4. /implement (TDD) ] ──► [ 5. /code-review ]
```

> **Regla de Context Hygiene:**
> Mantener las fases 1, 2 y 3 en una misma conversación. Para la fase 4 (`/implement`), podés trabajar ticket a ticket o limpiar ventana de contexto (`/clear` o nueva sesión) apuntando al ticket específico para mantener la *Smart Zone* (< 100k tokens).

---

## 1. Fase de Alineación & Cuestionamiento (`/grill-me`)

**Objetivo:** Interrogar implacablemente hasta agotar la frontera de decisiones (negocio, UX, copy y casos de borde) antes de redactar código o planes.

### Prompt Estándar:
```text
/grill-me

Quiero [describir la tarea, ej: mejorar la estructura y conversión de la Home de NexoBow en web/].
Hacéme preguntas en rondas estructuradas según la skill 'grilling', proponiendo tu respuesta recomendada por cada pregunta para que pueda validar o ajustar.

Enfocate en:
1. Perfil del visitante / dolor de negocio principal.
2. Nuevas secciones o cambios en la arquitectura visual.
3. Copywriting Hormozi y oferta en ARS.
No asumas nada; grilleame hasta agotar la frontera de decisiones.
```

---

## 2. Fase de Especificación Técnica (`/to-spec`)

**Objetivo:** Colapsar las respuestas del *grilling* en un contrato de especificación (`spec.md` o PRD) con criterios de aceptación ejecutables.

### Prompt Estándar:
```text
/to-spec

A partir de todas las decisiones que cerramos en la ronda de grilling, redactá el documento de especificación formal para [nombre de la tarea/feature].

El spec debe incluir:
1. Objetivo y métricas de éxito medibles.
2. Arquitectura de componentes (archivos a crear, modificar o eliminar).
3. Copywriting definitivo en voseo argentino.
4. Criterios de Aceptación ejecutables (0 JS innecesario, tokens Tailwind, contrastes accesibles y build limpio).

Guardalo como el contrato de verdad antes de pasar a tickets.
```

---

## 3. Fase de Descomposición en Tickets (`/to-tickets`)

**Objetivo:** Dividir el spec en tajadas verticales atómicas (*Tracer Bullets*), identificando dependencias y bloqueos.

### Prompt Estándar:
```text
/to-tickets

Tomá la especificación recién generada y dividila en tickets atómicos y secuenciales de implementación.

Cada ticket debe:
- Ser una tajada vertical concreta (cruza diseño + copy + integración).
- Declarar dependencias y bloqueos (quién bloquea a quién).
- Incluir su criterio de verificación y comando de validación (ej: `npm run build` o `npm test`).
```

---

## 4. Fase de Implementación (`/implement` con TDD)

**Objetivo:** Desarrollar el código de cada ticket respetando la identidad visual correspondiente (`web/` vs `templates/`), pruebas unitarias y 0 JS innecesario.

### Prompt Estándar:
```text
/implement

Tomá el Ticket [Nº / Nombre] de la lista.
Construí e integrá los componentes necesarios siguiendo las pautas de AGENTS.md:
- Identidad visual correspondiente (si es NexoBow: modo oscuro, violeta #DB1FFF; si es prestador: estilo editorial de su rubro).
- SSG estricto: 0 scripts cliente innecesarios.
- Al terminar la edición, corré `npm run build` para asegurar cero errores de compilación.
```

---

## 5. Fase de Auditoría y Revisión (`/code-review` / `/audit-code`)

**Objetivo:** Evaluar el diff resultante en dos ejes: Estándares NexoBow (Standards) y Cumplimiento del Spec (Spec).

### Prompt Estándar:
```text
/code-review

Realizá una revisión completa del diff generado frente a lo acordado en el spec:
1. Eje Standards: ¿Cumple con 0 JS cliente, accesibilidad de contrastes, tipografías y reglas de AGENTS.md?
2. Eje Spec: ¿Están todas las secciones acordadas implementadas con el copy y estructura correctos?
3. Reportá hallazgos críticos y ejecutá la verificación final de build.
```
