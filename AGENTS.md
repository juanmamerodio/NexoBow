# ⚡ NexoBow — System Constitution (AGENTS.md)

## 📌 Misión y Arquitectura Core
Repositorio central de **NexoBow**: fábrica automatizada de embudos de venta y agendamiento para profesionales de servicios (nutricionistas, psicólogos). Transformamos tráfico de WhatsApp, Instagram y Maps en consultorías agendadas mediante landings estáticas de carga instantánea.
- **Stack:** Astro (SSG estricto, 0 JS innecesario en cliente) + Tailwind CSS.
- **Integraciones:** Calendly / Google Calendar, Webhooks para WhatsApp Bots.
- **Contratos del Sistema:** Leé `/brain.md` (conciencia técnica), `/memory.md` (estado del proyecto y errores documentados) y `/spec.md` (contrato del MVP) **antes** de planificar o tocar código[cite: 1]. Para términos de negocio, consultá `/GLOSSARY.md`[cite: 1]. **IMPORTANTE:** `web/` = página de NexoBow, `/templates/` + `/sites/` = landings de prestadores. Identidades visuales TOTALMENTE distintas (ver `memory.md` → Errores Documentados).

## 💻 Comandos de Ejecución y Verificación
*(Ajustar según gestor de paquetes del template activo en `/sites/{cliente}` o `/templates/{rubro}`)*[cite: 1]
- **Build & Typecheck:** `npm run build` (Obligatorio ejecutar al finalizar cambios para verificar 0 errores de compilación en Astro).
- **Dev Server:** `npm run dev`
- **GitHub:** Utilizar git y pushear todo a producción (menos cuando se indique lo contrario). 

## 📐 Convenciones e Idioma
- **Código y Arquitectura:** Nombres de archivos, componentes (`Hero.astro`, `Problem.astro`, `Steps.astro`, `Pricing.astro`), variables y commits en **inglés**[cite: 1].
- **Copywriting y UI:** Todo texto visible para el usuario final en **español argentino** (voseo profesional)[cite: 1].
- **Moneda por Defecto:** Todo valor monetario debe expresarse en Pesos Argentinos con formato explícito (ej: `$186.000 ARS`)[cite: 1].
- **Copywriting (Regla Hormozi):** Cero humo[cite: 1]. Enfoque directo en aliviar dolores reales del profesional ("ahorrá tiempo", "dejá de perder pacientes"), sin promesas irreales[cite: 1].

## 🛡️ Reglas Operativas del Agente (System Rules)
1. **Spec-Driven (No Vibe Coding):** Prohibido inventar dependencias, asumir datos faltantes o escribir código sin contexto[cite: 1]. Respetá estrictamente la estructura modular del template[cite: 1].
2. **Gate de Planificación (Ask-First):** Si la ficha en `/clients/` tiene datos ambiguos o incompletos (ej: falta el valor de la consulta, nicho específico o link de agenda), **frená y preguntale al usuario** antes de generar o modificar un sitio[cite: 1].
3. **Conservación de Tokens y Edición:** Para cambios grandes en un archivo, usá una única operación de escritura completa en vez de múltiples ediciones secuenciales. No leas carpetas de `/sites/` ajenas al cliente actual[cite: 1].
4. **Orquestación y Sub-agentes:** Si una tarea requiere analizar +3 archivos o hacer auditoría de calidad, delegá en un sub-agente con ventana de contexto limpia.

## 📂 Mapa de Directorios y Límites (Boundaries)
- `/brain.md` -> **[LECTURA/ESCRITURA]** Cerebro de ejecución[cite: 1]. Leelo al iniciar sesión; actualizalo al cerrar una tarea[cite: 1].
- `/memory.md` -> **[LECTURA/ESCRITURA]** Estado del proyecto + errores documentados (ERROR-001: NexoBow ≠ prestador)[cite: 1]. Leelo al iniciar sesión; actualizalo al cerrar una tarea[cite: 1].
- `/web/` -> **[SOLO LECTURA POR DEFECTO]** Página propia de la agencia NexoBow. Identidad visual distinta a la de los templates. No copiar componentes a `/templates/` sin rediseño.
- `/clients/N-rubro-nombre.md` -> **[FUENTE DE VERDAD]** Ficha del prestador (YAML frontmatter + Markdown)[cite: 1]. Plantilla base en `/clients/_ficha-template.md`[cite: 1].
- `/templates/{rubro}/` -> **[SOLO LECTURA POR DEFECTO]** Proyecto Astro maestro por vertical (ej: `nutricionista`)[cite: 1]. **Prohibido editar** salvo que el usuario pida explícitamente mejorar la plantilla base[cite: 1]. Estilo de prestadores: propio de cada rubro, NO el de NexoBow.
- `/sites/N-rubro-nombre/` -> **[GENERADO / EFÍMERO]** Clon compilable del cliente[cite: 1]. **Nunca se edita a mano para corregir datos del negocio**: se edita la ficha en `/clients/` y se regenera mediante skill[cite: 1].
- `/assets/N-rubro-nombre/` -> **[LECTURA]** Recursos gráficos optimizados del prestador[cite: 1].
- `/.agents/skills/` -> **[PULL CONTEXT]** SOPs modulares ejecutables bajo demanda[cite: 1].

## 🛠️ Enrutamiento de Skills (Pull Workflows)
*No cargues estas instrucciones en memoria hasta que el usuario solicite la tarea. Cuando ocurra, leé el `SKILL.md` correspondiente en `/.agents/skills/`:*[cite: 1]
- **`standard`**: **[GATE OBLIGATORIO DE CALIDAD VISUAL & 3D]** Define el estándar estético de clase mundial (referencia Delta Cafés / Bürocratik) adaptado a Astro SSG: logo Outfit Bold (`Nexo` en negro/blanco y `Bow` en `#DB1FFF`), gradientes violeta dinámicos, botones con micro-interacciones de expansión, mockups interactivos 3D del flujo de WhatsApp/Agenda y respeto a `prefers-reduced-motion`. Todo sitio debe pasar este checklist antes de auditarse.
- **`build-client-site`**: Usar cuando se pida crear o actualizar la landing de un cliente[cite: 1]. Clona `/templates/{rubro}/` hacia `/sites/`, inyecta el contenido/tema de `/clients/N-rubro-nombre.md` y verifica el build[cite: 1].
- **`audit-code`**: Ejecutar **siempre en un sub-agente con sesión limpia** tras construir o actualizar un sitio[cite: 1]. Audita performance en Astro, accesibilidad, contraste de CTAs y purga clases duplicadas de Tailwind[cite: 1].
- **`whatsapp-bot`** *(Fase 2 - Fuera de MVP)*: Flujos de automatización con API de Meta y webhooks[cite: 1]. Ignorar salvo instrucción explícita[cite: 1].

## 🧠 Aprendizaje Aplicado (Self-Evolving Log)
*Regla: Cuando algo falle repetidamente o el usuario te corrija un patrón, agregá un bullet acá abajo (máximo 15 palabras, sin explicaciones, solo la regla accionable).*
- NexoBow ≠ prestador: page web/ y landings de templates/ tienen identidades visuales independientes (ERROR-001).
- No asumir el estilo de un template sin dirección estética previa del usuario (gate Ask-First de diseño).
