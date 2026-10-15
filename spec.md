# NexoBow - Spec del MVP

Términos definidos en [GLOSSARY.md](./GLOSSARY.md).

## Qué y por qué

NexoBow vende a **prestadores** un **embudo** que lleva **pacientes** desde Google Maps, WhatsApp o Instagram hasta una **consultoría gratuita agendada**. La venta posterior (el upsell del prestador) no es parte del sistema.

La **landing** es el núcleo: concentra confianza (casos de éxito, reseñas, información) y su botón principal lleva a Calendly. Calendly es una pieza de terceros, no el producto.

## Alcance del MVP

- Rubro único: **nutricionistas**, con template `nutricionista`.
- Un solo tipo de turno: consultoría gratuita (Calendly, plan gratis, un tipo de evento).
- WhatsApp **sin API de Meta**: WhatsApp Business con mensaje de bienvenida y respuestas rápidas que envían el link de Calendly.
- Recordatorios por email de Calendly (gratis).
- Landing estática en Astro con Tailwind. Copy en español argentino, montos en ARS.
- Hosting: Vercel como estándar; Netlify para los primeros casos de éxito (dominio personalizado gratis).
- Subdominio de NexoBow incluido en el setup; dominio propio como extra.

## Fuera de alcance (por ahora)

- Cobro de consultas con Mercado Pago (el pago lo resuelve el prestador en la llamada).
- Obras sociales y precios de consultas.
- Bot de WhatsApp con Cloud API de Meta (fase 2, con un cliente que pague).
- Recordatorios por WhatsApp (fase 2).
- Scraping automatizado de Google Maps y mensajes masivos automáticos.
- Otros rubros (psicólogos: después de validar nutricionistas).

## Oferta comercial

| Concepto | Valor |
|---|---|
| Setup (único) | \$200.000 ARS |
| Abono mensual | \$10.000 ARS |
| Primer mes | Prueba, sin abono |

Los primeros 1 o 2 prestadores reciben el setup gratis o muy rebajado, a cambio de autorizar la publicación de sus resultados.

## Métrica de éxito

Consultorías agendadas por mes y cuántas se concretaron. Es lo que se le muestra al prestador para que renueve.

## Contenido de la landing

Se arma con el template en `Hero`, `Problem`, `Steps`, `Pricing`, más `Reviews` y `CaseStudy`. El contenido lo aporta el prestador mediante un cuestionario de onboarding único.

## Reglas de confianza y datos de salud

- Testimonios de pacientes solo con consentimiento escrito.
- Sin consentimiento, solo reseñas ya públicas en Google Maps.
- Cuidar la publicidad de resultados en salud y la Ley 25.326 de datos personales.

## Captación de prestadores

- Fuente principal: Google Maps (fichas con reseñas, WhatsApp visible, sin agenda online ni web).
- Contacto por WhatsApp. Instagram descartado como canal principal.
- Ritmo: al menos 20 contactos por semana, a mano y con planilla.
- Meta: primer cliente en 30 días.
- Prospectar desde la semana 1; la plantilla de landing lista en la semana 2.

## Criterios de aceptación

- Un paciente puede ir de la ficha de Google Maps a la landing, y de ahí a Calendly, en menos de 3 clics.
- Un paciente que escribe por WhatsApp recibe automáticamente el link de Calendly.
- La landing carga en milisegundos (sitio estático, sin JS innecesario).
- Cada prestador tiene su subdominio funcionando.
- Existe una planilla de prospección con los 20 contactos semanales.

## Pendientes abiertos

- Redactar el cuestionario de onboarding.
- Definir cómo se mide "consultoría concretada" (dato manual del prestador o del panel de Calendly).
- Revisar el marco legal de publicidad en salud con un profesional.
- Investigar la API de WhatsApp antes de la fase 2.

## Flujo agéntico (semi-automatizado)

**Principio:** el agente gestiona a los prestadores a nivel programación. NexoBow no escribe una landing desde cero por cliente: **clona el template Astro y adapta solo la ficha y algunos rasgos visuales**, para que las páginas no parezcan iguales.

### Estructura de archivos

```text
/templates/nutricionista/        <-- proyecto Astro base (un solo template por rubro)
/clients/
  _ficha-template.md             <-- plantilla vacía de la ficha
  1-nutri-camilomedina.md        <-- ficha: datos, branding, contenido, estado
/sites/1-nutri-camilomedina/     <-- clon generado (Astro), nunca se edita a mano
/.agents/skills/
  build-client-site/             <-- clona template + aplica ficha
  audit-code/                    <-- revisión en sesión limpia
```n
### Ficha de cliente (N-rubro-nombre.md)

Frontmatter YAML con datos estructurados, cuerpo Markdown con textos libres:
- **Frontmatter:** nombre, rubro, WhatsApp, link de Calendly, subdominio, estado del embudo, paleta (primary, ccent, ont), variante de layout (orden/estilo de secciones), consentimiento de testimonios (sí/no).
- **Cuerpo:** bio, enfoque, reseñas (con fuente), casos de éxito, preguntas frecuentes.
- **Estado:** prospecto, onboarding, en-construccion, publicado, prueba (mes gratis), ctivo.

### Qué cambia entre clones (y qué no)

- **Cambia:** paleta, tipografía, orden de secciones, imágenes, copy, subdominio.
- **No cambia:** estructura de componentes (Hero, Problem, Steps, Pricing, Reviews, CaseStudy), integración con Calendly y botón de WhatsApp.
- La personalización se hace por **variables de tema** (Tailwind/CSS), no tocando los componentes.

### Pasos semi-automatizados

1. Prospecto: se crea la ficha desde la plantilla (el agente puede pre-llenarla con datos públicos de Google Maps).
2. Onboarding: el prestador completa lo que falta; el agente valida campos obligatorios.
3. Build: el agente clona el template a `/sites/`, aplica la ficha y genera la landing.
4. Auditoría: sesión limpia con `audit-code`.
5. Deploy: Netlify (primeros casos) o Vercel.
6. Seguimiento: el agente actualiza el estado y las métricas mensuales en la ficha.

**Humano en el medio (a propósito):** enviar mensajes en frío, aprobar el copy, el consentimiento de testimonios y el deploy final.
