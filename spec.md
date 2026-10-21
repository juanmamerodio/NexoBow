# NexoBow System & B2B Flagship Web — Master Specification (`spec.md`)

Términos de dominio definidos en [GLOSSARY.md](./GLOSSARY.md).

## Problem Statement

NexoBow necesita evolucionar simultáneamente en dos frentes críticos para escalar a 100 prestadores en paralelo sin aumentar el gasto de tokens ni perder conversiones:

1. **Frente Comercial & Conversión B2B (`web/`)**:
   - La landing actual de la agencia (`Header -> Hero -> Problem -> Steps -> Pricing -> Faq -> FinalCta -> Footer`) tiene un estilo neón agresivo (`#DB1FFF` sobre negro duro) que resta autoridad ejecutiva frente a profesionales de salud, leyes y clínicas privadas.
   - Carece de bloques de persuasión de alto impacto estilo Alex Hormozi + Bürocratik: no muestra comparativa visual (*Antes vs. Después*), demostración interactiva del embudo, calculadora de retorno de inversión (ROI), catálogo de variedad estética (+10 estilos para que ningún prestador sienta que recibe una plantilla genérica), casos de éxito con métricas de velocidad (`<0.8s`), escalera de planes con precios psicológicos en ARS, bonos de acción rápida, alianza audiovisual con **AfterBow** (`https://www.afterbow.com`), autoridad del fundador (**Juanma Merodio** — `https://juanmamerodio.github.io/cv`) ni el teaser de Fase 2 (*"CREÁ TU SISTEMA BOW"*).

2. **Frente Operativo, Ciclo de Vida de Leads & Automatización Agéntica (`scripts/`, `clients/`, `.agents/skills/`)**:
   - Al insertar y leer datos en Google Sheets (`Prospección NexoBow`), el script actual ancla en la Columna A, cuando en la planilla real **el ID (`Nº`) comienza en la Columna B** (`B11:S1000`).
   - No existe una correlatividad estricta 1 a 1 entre el ID de la fila en Google Sheets y el nombre del archivo Markdown del prospecto (`{id}-{nombre}-{apellido}-{rubro}.md`), lo que dificulta el rastreo automatizado.
   - Los archivos `.md` y clones en `/sites/` de prospectos inactivos o descartados se acumulan indefinidamente sin generar urgencia comercial ni limpiar el repositorio.
   - Falta un motor de **Mejora Continua** con lectura completa de Google Sheets (métricas superiores y estados de seguimiento) y **Agent Skills autónomas** para mantenimiento en 1 comando (`/editar-web-cliente`, `/seguimiento-leads`, `/next-step`).

---

## Solution

### 1. Rebranding "NexoBow Soft-Obsidian" (`web/` & skill `standard`)
Reemplazo de la estética cyberpunk/neón por un sistema de diseño **Minimalista Soft-Tech Ejecutivo** basado en la regla `60-30-10` y contrastes accesibles AAA/AA:
- **Canvas Principal (`--color-ink`)**: `#040607` (*Obsidian Black* — espacioso, profundo y sereno).
- **Superficie Elevada (`--color-ink-surface`)**: `#0B0D12` con bordes sutiles.
- **Amortiguador Atmosférico (`--color-velvet`)**: `#5B2A62` (*Velvet Purple*) aplicado en opacidades del `10%` al `22%` para glows ambientales y fondos suaves, eliminando el peso neón.
- **Acento Secundario / Estructura (`--color-ultrasonic`)**: `#4928C2` (*Ultrasonic Blue*) para bordes activos, conectores del sistema, badges técnicos y resaltados secundarios.
- **Tono Intermedio / Énfasis Suave (`--color-periwinkle`)**: `#E3D9FC` (*Periwinkle*) para subtítulos, palabras en itálica, íconos y microcopys de alta legibilidad (`14.2:1` sobre `#040607`).
- **Acento Primario de Conversión (`--color-accent`)**: `#BF40FA` (*Hyper Magenta*) reservado exclusivamente para CTAs principales, indicadores críticos y el `Bow` del isotipo.

### 2. Auditoría Estructural y Nuevo Funnel Psicológico de 12 Secciones (`web/`)
Se reemplaza la secuencia lineal de 8 bloques por una arquitectura de **12 componentes** diseñada bajo la psicología de conversión B2B de Alex Hormozi (*Promesa Cuantificable → Fricción Actual vs. Alivio → Mecanismo Único Interactuable → Variedad Exclusiva → Retorno Matemático → Prueba Técnica/Social → Oferta Irresistible con Precios Psicológicos + Bonos + Urgencia 7 Días → Visión Tecnológica → Autoridad del Creador → Derribo de Objeciones*):

| Orden | Componente (`.astro`) | Rol Psicológico en el Embudo | Interactividad (0 JS Cliente) |
| :--- | :--- | :--- | :--- |
| **01** | `Header.astro` | Navegación ejecutiva + indicador de cupos activos + acceso directo a planes y demo. | Sticky backdrop-blur CSS. |
| **02** | `Hero.astro` | Promesa Hormozi en <3 segundos + Mockup 3D CSS del flujo (`Maps/IG → Landing <0.8s → WhatsApp → Turno`) + Garantía de carga instantánea. | Perspectiva 3D CSS + hover suave. |
| **03** | `BeforeAfter.astro` | Contraste visceral: *"Tu WhatsApp hoy (caos, audios eternos y vistos clavados)"* vs. *"Tu Sistema NexoBow (pacientes pre-filtrados que agendan solos)"*. | Tarjetas comparativas duales + barra de urgencia 7 días. |
| **04** | `InteractiveFunnel.astro` | Demostración interactiva paso a paso de cómo el paciente pasa del clic a la consultoría agendada. | Tabs interactivos con `<input type="radio" class="peer">` (0 JS). |
| **05** | `TemplateCatalog.astro` | Prueba de exclusividad: vitrina de **+10 direcciones estéticas por rubro** (Editorial Delta, Clinical Pure, Obsidian Legal, Botanical Wellness, etc.) generadas por REA. | Filtros/categorías CSS + grillas de preview. |
| **06** | `RoiCalculator.astro` | Tangibilización financiera: cuántos turnos perdidos y horas de secretaría recupera el prestador por mes versus el abono mensual de `$12.259 ARS`. | Selector interactivo de volumen de consultas con CSS `:checked` (0 JS). |
| **07** | `CaseStudies.astro` | Prueba real y técnica: casos de estudio (incluyendo demo activa Lic. Sofía Ramos), métricas Core Web Vitals `100/100` y `0%` pérdida por lentitud. | Tarjetas de métricas verificables + link a demo en vivo. |
| **08** | `Pricing.astro` | Escalera de valor de **3 Planes** con precios psicológicos (`$189.999 ARS` Setup / `$12.259 ARS` finales/mes), alianza audiovisual con **AfterBow** (`https://www.afterbow.com`), **Stack de 3 Bonos Hormozi** y regla real de **Expiración de Demo a los 7 días**. | Destacado visual con `#BF40FA` + `#4928C2`. |
| **09** | `CreateBowSystem.astro` | Posicionamiento de vanguardia (*Teaser Fase 2*): apartado **"CREÁ TU SISTEMA BOW"**, mostrando el aprovisionamiento autónomo conectado por API. | Mockup de consola agéntica + lista de prioridad. |
| **10** | `Founder.astro` | Confianza humana y técnica (*"Quién está detrás"*): **Juanma Merodio** (Ingeniería de Sistemas de Conversión + Productora **AfterBow**), con enlace directo a `https://juanmamerodio.github.io/cv`. | Layout editorial B2B con credenciales y links verificables. |
| **11** | `Faq.astro` | Eliminación de fricciones finales (tiempos de entrega, propiedad del dominio, cambios por comando, cumplimiento Ley 25.326). | Acordeones nativos HTML `<details><summary>` (0 JS). |
| **12** | `FinalCta.astro` + `Footer.astro` | Cierre de alta urgencia recordando la ventana de 7 días para conservar la demo y los 3 bonos bonificados. | Glow `#5B2A62` + CTA directo a WhatsApp/Agenda. |

### 3. Especificación Detallada Componente por Componente (`web/`)

1. **`Header.astro`**:
   - **Copy**: Logo `Nexo` (`#F8F6FF`) + `Bow` (`#BF40FA`). Links: `El Problema`, `Cómo Funciona`, `Diseños (+10)`, `Calculadora ROI`, `Planes y Bonos`, `Quién Está Detrás`. Badge: `"Cupos de implementación abiertos"`. CTA: `"Ver mi demo / Agendar"`.
   - **Layout**: `sticky top-0 z-50 border-b border-[#4928C2]/20 bg-[#040607]/85 backdrop-blur-xl`.

2. **`Hero.astro`**:
   - **Copy**:
     * Badge: `"SISTEMA DE CAPTACIÓN Y AGENDAMIENTO B2B · CARGA EN < 0.8 SEGUNDOS"`
     * H1: `"Dejá de perder pacientes que te piden info por WhatsApp y nunca agendan."`
     * Subtítulo: `"Transformamos tus clics de Google Maps e Instagram en consultorías agendadas automáticamente. Sin secretarias, sin plantillas lentas de WordPress y con una inversión que recuperás con 3 consultas."`
     * CTA Primario: `"Quiero mi Sistema NexoBow ahora"` | CTA Secundario: `"Probar flujo interactivo ↓"`
     * Micro-métricas: `"0.6s Tiempo de Carga" · "100/100 Google PageSpeed" · "+10 Diseños por Rubro" · "7 Días de Reserva de Demo"`
   - **Layout**: Grid asimétrico 12 columnas (`lg:col-span-7` copy + `lg:col-span-5` escena 3D CSS con tarjetas conectadas: *Google Maps → Landing del Prestador → WhatsApp Pre-filtrado → Turno Confirmado*).

3. **`BeforeAfter.astro`** (*Reemplaza y expande `Problem.astro`*):
   - **Copy**:
     * H2: `"El problema no es que te falten consultas. Es que tu WhatsApp hoy funciona como un embudo roto."`
     * Columna Izquierda (*Tu consultorio hoy — Sin Sistema*): `"1. Te escriben 'Hola, precio' a las 11 de la noche"`, `"2. Mandás un audio o texto largo explicando cómo trabajás"`, `"3. Te clavan el visto porque están comparando 5 profesionales a la vez"`, `"4. Perdés 6 horas por semana haciendo de secretaria en vez de atender"`.
     * Columna Derecha (*Con NexoBow Activo — Embudo 24/7*): `"1. El paciente entra desde Maps o Instagram a una página que abre en 0.6 segundos"`, `"2. Ve tus reseñas reales, tu método y resuelve sus dudas antes de escribirte"`, `"3. Toca un botón con intención real de reserva y elige horario o te envía su consulta pre-calificada"`, `"4. Vos solo abrís tu agenda y atendés pacientes listos para avanzar"`.
   - **Layout**: Dos paneles contrapuestos (`border-red-500/20 bg-[#0B0D12]` vs `border-[#4928C2]/50 bg-gradient-to-b from-[#5B2A62]/20 to-[#0B0D12]`).

4. **`InteractiveFunnel.astro`** (*Reemplaza y expande `Steps.astro`*):
   - **Copy**:
     * H2: `"Probá en vivo cómo funciona tu embudo en 4 pasos"`
     * 4 Tabs seleccionables (0 JS, CSS `:checked`):
       - **Paso 01: Captación (Maps & IG)** → *"Capturamos la búsqueda en caliente cuando el paciente necesita solución hoy."*
       - **Paso 02: Pre-Venta Instantánea (<0.8s)** → *"Tu landing estática muestra autoridad, reseñas de Google Maps y elimina la objeción del precio."*
       - **Paso 03: Agendamiento / Filtro WhatsApp** → *"El paciente reserva su consultoría en Calendly o llega a tu WhatsApp con todos sus datos listos."*
       - **Paso 04: Seguimiento & Expiración Inteligente** → *"El sistema rastrea cada oportunidad para que ninguna consulta quede olvidada."*

5. **`TemplateCatalog.astro`** (*Nuevo*):
   - **Copy**:
     * H2: `"Más de 10 arquitecturas visuales exclusivas. Cero páginas clonadas."`
     * Párrafo: `"Analizamos por ingeniería inversa (REA) los sitios de mayor conversión del mundo (como Delta Cafés y estudios europeos) para que tu consultorio o estudio tenga identidad propia, nunca la misma página que otro colega de tu ciudad."`
     * Grilla de 10 estilos (1 activo en vivo + 9 presets de industria en catálogo): `01. Editorial Delta (Nutrición & Salud)`, `02. Clinical Pure (Medicina & Dermatología)`, `03. Warm Empathy (Psicología & Terapia)`, `04. Obsidian Authority (Abogados & Estudios)`, `05. Kinetic Performance (Deporte & Kinesiología)`, `06. Minimalist Smile (Odontología Estética)`, `07. Botanical Balance (Medicina Funcional)`, `08. Swiss Advisory (Contadores & Consultores)`, `09. Velvet Aesthetics (Centros de Estética)`, `10. Executive Clinic (Clínicas Multi-Especialidad)`.

6. **`RoiCalculator.astro`** (*Nuevo — 0 JS*):
   - **Copy**:
     * H2: `"Hacé la cuenta rápida: ¿cuánta plata estás dejando arriba de la mesa cada mes?"`
     * Selector interactivo por niveles de pérdida semanal (Radio buttons CSS):
       - Opción A: `"Pierdo 2 pacientes por mes por no responder a tiempo"` → **Recuperás `~$80.000 a $120.000 ARS/mes` + 12 hs libres**.
       - Opción B (Default): `"Pierdo 5 pacientes por mes en el 'visto' de WhatsApp"` → **Recuperás `~$200.000 a $300.000 ARS/mes` + 24 hs libres**.
       - Opción C: `"Somos clínica / recibimos +30 consultas semanales"` → **Recuperás `+$600.000 ARS/mes` + 45 hs de secretaría ahorradas**.
     * Conclusión matemática: `"Tu abono mensual de $12.259 ARS se paga solo con el 25% de UNA sola consulta recuperada."`

7. **`CaseStudies.astro`** (*Nuevo*):
   - **Copy**:
     * H2: `"Ingeniería comprobable, no promesas vacías"`
     * Caso Destacado #1: **Lic. Sofía Ramos — Nutrición Funcional & Deportiva** (Demo de Producción en Vivo — `0.6s LCP`, `0 KB JS`, Reseñas Google Maps verificadas).
     * Caso Destacado #2: **Auditoría Técnica Comparativa** (WordPress/Elementor tradicional: `4.8s de carga y 42% de abandono móvil` vs. **Arquitectura Astro SSG NexoBow**: `0.6s de carga y retención inmediata`).

8. **`Pricing.astro`** (*Rediseñado con Precios Psicológicos, Bonos Hormozi, AfterBow y Urgencia de 7 Días*):
   - **Copy**:
     * H2: `"Elegí el plan para escalar tu consultorio hoy"`
     * Banner de Urgencia Real: `"⏱️ POLÍTICA DE SERVIDOR ACTIVO: Si recibiste una demo personalizada por WhatsApp, tu archivo y diseño quedan reservados por 7 días corridos. Pasado ese plazo sin actividad, el sistema libera el cupo y elimina la demo automáticamente."`
     * **Plan 1: Sistema NexoBow Core (Profesionales Independientes — Más Elegido)**:
       - Setup único: **`$189.999 ARS`** (antes `$260.000 ARS`)
       - Mantenimiento y Hosting Ultra-Rápido: **`$12.259 ARS finales/mes`** (*1er mes 100% bonificado*).
       - Incluye: Landing Astro SSG personalizada, conexión a WhatsApp + Agenda, reseñas de Google Maps, dominio/subdominio SSL y cambios rápidos a pedido.
     * **Plan 2: Sistema NexoBow Clínica / Pro (Equipos y Múltiples Especialistas)**:
       - Setup único: **`$329.999 ARS`**
       - Mantenimiento: **`$19.899 ARS finales/mes`**.
       - Incluye: Derivación inteligente por profesional o especialidad, múltiples calendarios y optimización mensual continua basada en métricas.
     * **Plan 3: Full Growth + Mes de Contenido Audiovisual (En alianza con AfterBow)**:
       - Precio: **`Plan Personalizado a Medida`**
       - Descripción: `"¿Además del embudo necesitás que te grabemos 1 mes entero de contenido profesional en video (Reels, Ads y piezas de autoridad) para estallar tu agenda?"`
       - Alianza: Producido junto a nuestra agencia audiovisual [**AfterBow (`afterbow.com`)**](https://www.afterbow.com).
       - CTA Plan 3: `"Cotizar Plan Embudo + Mes de Contenido"` + link a `https://www.afterbow.com`.
     * **Stack de 3 Bonos Hormozi (Incluidos GRATIS activando antes de los 7 días)**:
       - **Bono #1**: Optimización SEO Local en Google Maps (Valuado en `$85.000 ARS` → **GRATIS**).
       - **Bono #2**: Protocolo y Guiones de Cierre por WhatsApp para Consultorías (Valuado en `$60.000 ARS` → **GRATIS**).
       - **Bono #3**: Primer mes de mantenimiento (`$12.259 ARS`) 100% bonificado + Garantía de Carga `<1s` (si no carga en menos de 1 segundo, no pagás el setup).

9. **`CreateBowSystem.astro`** (*Nuevo — Apartado "CREÁ TU SISTEMA BOW" Fase 2*):
   - **Copy**:
     * Badge: `"PRÓXIMAMENTE EN FASE 2 · ARQUITECTURA AUTÓNOMA"`
     * H2: `"CREÁ TU SISTEMA BOW: Tu infraestructura generada en vivo vía API"`
     * Párrafo: `"Estamos construyendo el primer motor autoservicio donde ingresás el link de Google Maps de tu consultorio y nuestra API agéntica ensambla tu landing, redacta tu oferta y conecta tu WhatsApp en menos de 90 segundos."`
     * UI Visual: Mockup interactivo CSS de la terminal/panel API (`POST /api/v1/bow-system/create`) + botón `"Pedir acceso anticipado por WhatsApp"`.

10. **`Founder.astro`** (*Nuevo — "Quién está detrás"*):
    - **Copy**:
      * H2: `"Quién está detrás de NexoBow"`
      * Subtítulo: `"Juanma Merodio — Ingeniero de Sistemas de Conversión & Director en AfterBow"`
      * Bio en voseo: `"No soy una agencia tradicional que terceriza tu web en plantillas lentas. Diseñé la arquitectura de NexoBow combinando ingeniería de software de alto rendimiento (Astro SSG + automatización agéntica) con producción audiovisual estratégica en AfterBow. Mi obsesión es simple: que tu tecnología cueste monedas, cargue al instante y te traiga pacientes reales todas las semanas."`
      * Enlaces Oficiales Destacados:
        - Portfolio & Stack Técnico: [`https://juanmamerodio.github.io/cv`](https://juanmamerodio.github.io/cv)
        - Agencia de Producción Audiovisual: [`https://www.afterbow.com`](https://www.afterbow.com)

11. **`Faq.astro`** & **12. `FinalCta.astro` + `Footer.astro`**:
    - Actualizados a la paleta Soft-Obsidian, reflejando los precios `$189.999 ARS` / `$12.259 ARS finales/mes`, la garantía de 7 días de vigencia de demo y links directos a `afterbow.com` y `juanmamerodio.github.io/cv`.

---

### 4. Arquitectura del Sistema Core: Google Sheets (`Col B = ID`), Ciclo de 7 Días y Skills Autónomas

1. **Corrección de Desplazamiento a Columna B en Google Sheets (`scripts/sheets-sync.mjs`)**:
   - El rango oficial de lectura y escritura de prospectos pasa a ser `'Prospección NexoBow'!B11:S1000` (donde **Columna B = `Nº / ID`**, Columna C = `Prospecto / Clínica`, Columna D = `Nicho`, ..., Columna S = `Observaciones`).
   - Al insertar una fila con `gsheets`, se escribe directamente en el rango a partir de la **Columna B** para respetar el margen izquierdo de la Columna A.

2. **Correlatividad Estricta Google Sheets ↔ Archivo Markdown (`{id}-{nombre}-{apellido}-{rubro}.md`)**:
   - Función pura `buildCorrelativeSlug({ id, displayName, nicho })`:
     * Ejemplo: `id = 22`, `displayName = "Lic. Alejandra Martínez"`, `nicho = "nutricionista"` → **`22-alejandra-martinez-nutri`** (archivo `/clients/22-alejandra-martinez-nutri.md`, clon `/sites/22-alejandra-martinez-nutri/`).
   - El frontmatter YAML de `/clients/{slug}.md` incorpora metadatos obligatorios de sincronización:
     * `sheet_id: 22`
     * `lead_status: "1. Prospecto Identificado"`
     * `created_at: "YYYY-MM-DD"`
     * `last_activity_at: "YYYY-MM-DD"`
     * `expires_at: "YYYY-MM-DD"` (+7 días desde `last_activity_at`).

3. **Motor de Ciclo de Vida y Expiración de 7 Días (`scripts/lead-lifecycle.mjs`)**:
   - Compara el estado de las filas en Google Sheets (`B11:S1000`) y las fichas locales en `/clients/`:
     * **Cambio de Estado Positivo**: Si el estado en el Sheet cambió respecto al `.md` (ej. pasó de `"1. Prospecto Identificado"` a `"2. Contactado"` o `"3. Reunión Agendada"`), actualiza `lead_status`, renueva `last_activity_at` y extiende `expires_at` por 7 días más.
     * **Ventana de Alerta (Días 5 y 6 de inactividad)**: Devuelve la lista de leads próximos a expirar en `<48hs` junto con un link de WhatsApp de seguimiento con sesgo de urgencia (*"Hola {Nombre}, te aviso que en 48 hs el sistema da de baja la demo que armé para tu consultorio para liberar espacio en el servidor..."*).
     * **Purga Automática (>7 días de inactividad o Estado = `"Descartado"` en el Sheet)**: Elimina el archivo `/clients/{id}-*.md`, borra `/sites/{id}-*/` y `/assets/{id}-*/` (protegiendo siempre `_ficha-template.md` y `demo-*`), e informa qué prospectos fueron purgados para marcarlos como `"Descartado (Expiró 7d)"` en el Sheet.

4. **Motor de Mejora Continua (`scripts/continuous-improvement.mjs`)**:
   - Lee tanto el bloque superior de KPIs (`A1:S10`) como la tabla completa de leads (`B11:S1000`) de Google Sheets.
   - Calcula tasas de respuesta por nicho, efectividad de mensajes enviados vs. respuestas recibidas, leads estancados por etapa y genera recomendaciones accionables para ajustar el pitch de WhatsApp y los templates.

5. **Nuevas Agent Skills para Escalar a 100 Clientes en Paralelo (`/.agents/skills/`)**:
   - `edit-client-site` (`/editar-web-cliente`): Permite ejecutar en lenguaje natural *"el cliente 22-alejandra-martinez-nutri quiere cambiar X"* → aplica el cambio en `/clients/22-...md`, ejecuta `build-client-site`, corre `audit-code` y deja el sitio actualizado sin tocar código manual.
   - `lead-lifecycle` (`/seguimiento-leads`): Ejecuta el chequeo de vencimientos de 7 días, genera los links de seguimiento de urgencia y limpia automáticamente los prospectos descartados o vencidos.
   - `flow-advisor` (`/next-step` / `/ask-matt`): Unifica el ciclo de Matt Pocock (`prompts_structure.md`), el estado del repositorio (`audit-code`) y las métricas de Google Sheets para indicarle al operador exactamente cuál es el siguiente prompt óptimo.
   - **Backlog documentado (Fase 2)**: Generación de los +10 templates mediante **REA (Reverse Engineering Architecture)** para reducir a la mitad el costo de tokens por cliente, y endpoint API para la sección `"CREÁ TU SISTEMA BOW"`.

---

## Seams de Prueba y Verificación (Test Seams)

Se definen **2 seams de alto nivel** para pruebas deterministas con `node:test`:
1. **Web Build & Zero-JS Verification Seam (`web/`)**:
   - Compilación limpia mediante `npm run build` dentro de `web/`.
   - Verificación sobre `web/dist/index.html` asegurando: presencia de las 12 secciones del nuevo funnel, aplicación de los tokens de la paleta Soft-Obsidian (`#040607`, `#BF40FA`, `#4928C2`, `#5B2A62`, `#E3D9FC`), precios psicológicos (`$189.999 ARS` y `$12.259 ARS`), enlaces a `https://www.afterbow.com` y `https://juanmamerodio.github.io/cv`, y **0 etiquetas `<script>` ejecutables en cliente**.
2. **Sheets Correlativity & 7-Day Lifecycle Seam (`scripts/sheets-sync.mjs` & `scripts/lead-lifecycle.mjs`)**:
   - Funciones puras testeables sin depender de red: `buildCorrelativeSlug()`, `formatLeadToSheetRow()` alineado a 18 columnas desde `Columna B`, `evaluateLeadLifecycle()` (detección de activos, alertas en días 5-6 y candidatos a purga en `>=7 días` o estado `"Descartado"`) y `computeSheetMetricsSummary()`.

---

## User Stories

1. As a prestador de servicios visitando `nexobow.site`, I want to perceive an executive, soft-minimalist dark aesthetic (`#040607`, `#5B2A62`, `#4928C2`, `#BF40FA`, `#E3D9FC`) instead of harsh neon colors, so that I immediately trust the agency's professionalism.
2. As a prestador de servicios, I want to see a clear "Before vs. After" comparison of my WhatsApp workflow, so that I recognize how much time and money I lose with manual replies.
3. As a prestador de servicios, I want to interact with a 4-step funnel demonstration directly on the page, so that I understand the exact patient journey from Google Maps/Instagram to a booked consultation.
4. As a prestador de servicios, I want to browse a catalog of +10 visual template styles across niches, so that I know my landing page won't look like a generic clone of another professional in my city.
5. As a prestador de servicios, I want to use an instant ROI calculator on the page, so that I can see how recovering just 1 or 2 patients per month pays for the `$12.259 ARS` monthly plan many times over.
6. As a prestador de servicios, I want to inspect real case studies and PageSpeed metrics (`<0.8s`), so that I have technical and commercial proof that the system works.
7. As a prestador de servicios, I want to choose between 3 clear plans (Core at `$189.999 ARS` + `$12.259 ARS/mes`, Clínica Pro, or Full Growth with 1 month of video content produced by **AfterBow**), so that I can scale both my conversion funnel and my audiovisual traffic.
8. As a prestador de servicios who received a custom demo, I want to see the 3 Hormozi Fast-Action Bonuses and the 7-day active server expiration policy clearly stated, so that I have a compelling reason to make a decision this week.
9. As a prestador de servicios, I want to see the upcoming `"CREÁ TU SISTEMA BOW"` autonomous API preview, so that I perceive NexoBow as a cutting-edge software company.
10. As a prestador de servicios, I want to know who is behind NexoBow (**Juanma Merodio**) and check his engineering portfolio (`juanmamerodio.github.io/cv`) and audiovisual agency (`afterbow.com`), so that I know I am dealing with a proven builder.
11. As el operador de NexoBow, I want `sheets-sync.mjs` to read and write starting at **Column B (`B11:S1000`)** instead of Column A, so that the ID column in Google Sheets aligns properly with my spreadsheet design.
12. As el operador de NexoBow, I want every lead in Google Sheets to map deterministically to `/clients/{ID}-{nombre}-{apellido}-{rubro}.md`, so that Google Sheets and the local filesystem stay 100% synchronized.
13. As el operador de NexoBow, I want leads with 5–6 days of inactivity to trigger a follow-up alert with a pre-filled urgency WhatsApp link, so that I can close undecided prospects before their demo expires.
14. As el operador de NexoBow, I want leads with `>=7` days of inactivity or marked as `"Descartado"` in Google Sheets to have their `.md`, `/sites/` clone, and `/assets/` automatically purged, so that the repository stays clean and urgency is real.
15. As el operador de NexoBow, I want a Continuous Improvement script that analyzes my Google Sheets metrics (sent messages, replies, conversion rates by niche), so that I can optimize my outreach and templates based on data.
16. As el operador de NexoBow, I want dedicated skills (`/editar-web-cliente`, `/seguimiento-leads`, `/next-step`) documented and ready to invoke, so that I can maintain 100 client sites in parallel with single commands.

---

## Implementation Decisions

1. **Previews Unificadas y Dominio Oficial (`https://preview.nexobow.site/{slug}`)**:
   - Cada sitio de cliente generado a partir de una ficha Markdown (`{id}-{nombre}-{apellido}-{rubro}.md`) compila en `/sites/{slug}/dist/` y se sincroniza atómicamente a `dist-previews/{slug}/`.
   - La URL pública oficial es estrictamente:
     `https://preview.nexobow.site/{id}-{nombre}-{apellido}-{rubro}/`
   - Dicha URL exacta se registra de forma atómica en la **Columna G** (`Web Demo URL`) de Google Sheets al prospectar o compilar.

2. **Inmutabilidad y Versionado Estricto de Templates (`template_version`)**:
   - Cada ficha en `/clients/{slug}.md` incorpora obligatoriamente en su Frontmatter YAML:
     ```yaml
     template_version: "nutricionista@1.0.0"
     ```
   - **Regla de Desacoplamiento Operativo**: Las mejoras, adición de scripts interactivos o refactors en `/templates/` NO modifican las webs de clientes existentes.
   - Para migrar un cliente a una versión más reciente de un template se requiere ejecutar un comando explícito:
     ```bash
     node scripts/build-client-site.mjs clients/{slug}.md --upgrade-template
     ```
   - **La versión no es fija**: el operador puede editar `template_version` en la ficha cuando algo no le gusta o no combina y recompilar. Las versiones de cada template se conservan como tags de git (`template/{rubro}@x.y.z`).

3. **Arquitectura Visual PREMIUM en Templates (Apertura Controlada de JS & Micro-interacciones)**:
   - Se actualiza el principio en `brain.md`: La restricción estricta de *0 JS* aplica como benchmark técnico a la landing de la agencia (`web/`), mientras que los `/templates/` adoptan una arquitectura **PREMIUM** de nivel internacional: micro-animaciones refinadas, transiciones fluidas de agendamiento y componentes responsivos de alta conversión.

4. **Motor de Copywriting Multivariante & Branding Contextual**:
   - En `scripts/generate-client-fiche.mjs`, se reemplaza el copy estático por una **matriz rotativa de 4 ángulos de dolor (Alex Hormozi)**:
     1. Rutina colapsada y falta de tiempo.
     2. Frustración y fatiga por dietas restrictivas / efecto rebote.
     3. Digestión, energía vital y sintomatología clínica.
     4. Rendimiento físico, composición corporal y vitalidad.
   - El branding del cliente asigna de manera autónoma paletas de colores y duplas tipográficas acordes a la vertical y reputación extraída de Google Maps.

5. **Sincronización Atómica con Google Sheets (`Col B = ID`)**:
   - `scripts/sheets-sync.mjs` lee y escribe en `'Prospección NexoBow'!B11:S1000`.
   - Lee el último ID en Columna B para auto-incrementar de forma atómica y calcular el slug correlativo `{id}-{nombre}-{apellido}-{rubro}`.
   - Escribe en una sola operación la tupla completa de 18 columnas, incluyendo teléfono normalizado, enlace de WhatsApp y URL de preview.
   - Se diseña la capa de abstracción con adaptadores (seams) para permitir en el futuro una migración transparente a Supabase o Firebase cuando se escalen flujos automáticos en n8n.

6. **Desarrollo de los 9 Templates Restantes vía REA (Backlog Fase 2)**:
   - Los templates se desarrollarán en sesiones aisladas (`1 Template = 1 Sesión Limpia`) haciendo ingeniería inversa visual (REA) sobre sitios referentes para asegurar identidad visual única para cada una de las 10 verticales del catálogo oficial.

---

## Testing Decisions

- **Criterio de Buen Test**: Evaluar únicamente comportamiento externo observable y contratos de salida (HTML compilado de Astro, tuplas de 18 columnas para Sheets, slugs correlativos generados, preservación de `template_version` y purga/alerta por fechas), sin acoplarse a detalles internos.
- **Módulos bajo Prueba**:
  1. `tests/web-redesign.test.mjs`: Verifica build limpio en `web/`, 12 secciones del funnel, paleta Soft-Obsidian y precios en ARS.
  2. `tests/sheets-sync.test.mjs`: Verifica el rango en Columna B (`B11:S1000`), el formateo de 18 columnas con la URL `https://preview.nexobow.site/{slug}` y slugs correlativos.
  3. `tests/lead-lifecycle.test.mjs`: Verifica el ciclo de vida de 7 días, alertas de WhatsApp y purga de leads obsoletos.
  4. `tests/template-versioning.test.mjs`: Verifica que la inyección respete `template_version` y aísle el clon contra updates no solicitados.

---

## Out of Scope

- Automatizaciones avanzadas de WhatsApp con agentes autónomos o n8n autohospedado (previsto para Fase 3 tras alcanzar masa crítica).
- Base de datos relacional Supabase / Firebase en esta fase (se mantiene Google Sheets optimizado como base atómica actual).

---

## Further Notes

- Se respeta estrictamente el desacoplamiento de identidad visual (`ERROR-001`): la paleta Soft-Obsidian (`#040607`, `#BF40FA`, `#4928C2`, `#5B2A62`, `#E3D9FC`) aplica exclusivamente a `web/` (agencia NexoBow) y nunca contamina `/templates/`.

