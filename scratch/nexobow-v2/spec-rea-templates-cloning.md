# Especificación Maestra: Motor REA de Clonación Visual & Catálogo de Templates (+13 Direcciones Estéticas)
> Archivo: `.scratch/nexobow-v2/spec-rea-templates-cloning.md`  
> Estado: `ESPECIFICACIÓN FORMAL APROBADA (FASE 2 /to-spec)`  
> Referencia del flujo: `prompts_structure.md` · `AGENTS.md` · `memory.md`

---

## Problem Statement

Actualmente, NexoBow cuenta con un catálogo y un benchmark industrial exitoso en su primer template (`templates/nutricionista/` basado en la arquitectura visual de Delta Cafés). Sin embargo, para escalar la prospección comercial a diversos rubros de servicios (abogados, clínicas de alta complejidad, consultorías B2B, tech, dermatología, deportes, propiedades, etc.), el sistema requiere que cada template no sea una simple variación cromática o una demo superficial con los mismos componentes `.astro` de Delta Cafés, sino **un clon real, auténtico e inmutable de la arquitectura visual, geometría espacial, jerarquía tipográfica y estilos de interacción (UI/UX) de cada web de referencia**.

Al mismo tiempo, debe mantenerse un estricto **equilibrio cliente ↔ página**: la landing no debe ser un sitio web corporativo laberíntico ni una tienda de software desarticulada, sino un **embudo de alta conversión para vender el servicio del profesional** (reserva de llamadas, agendamiento de citas, WhatsApp, clarificación de valor, dolores Hormozi y casos de éxito), garantizando carga ultrarrápida (<0.8s), sin límite artificial de JS (rigiendo únicamente las restricciones de infraestructura de Cloudflare Pages [25 MB]) y desacoplamiento absoluto mediante el contrato `site.json`.

---

## Solution

Implementar el protocolo de **Ingeniería Inversa de Arquitectura Visual (REA)** para procesar individualmente la lista de 13 URLs de referencia y convertirlas en **Templates Astro Base Inmutables** dentro de `templates/{slug}/`.

Cada nuevo template:
1. **Clona la anatomía visual real de la web objetivo:**
   - Paleta 60-30-10 (`fondo`, `tinta`, `primary`, `accent`).
   - Mapeo de tipografías display y sans a fuentes abiertas de Google Fonts con métricas idénticas.
   - Componentes `.astro` nativos y únicos que replican las secciones, grids, asimetrías, tarjetas, bordes y botones de la web de referencia (ej: el botón rectangular con dot animado y los recortes curvos de Kümmerlein; el sistema de cuadrícula táctica de Vetter; la estética clínica y de piedra mineral de SkyClinics; la composición editorial tech de Think Company).
2. **Implementa el Contrato Desacoplado `site.json`:**
   - Mantiene la interfaz de datos unificada (`content` + `tema` + `paletas_alternativas`).
   - Todos los textos y placeholders del negocio se leen dinámicamente desde `site.json` para permitir la inyección transparente de cualquier ficha de cliente desde `/clients/`.
3. **Integra Theme Switcher Anti-Rebote:**
   - Incluye `ThemeSwitcher.astro` con 4 paletas en vivo y persistencia en `localStorage`.
4. **Garantiza Inmutabilidad y Calidad:**
   - Cada template posee su propia suite de tests unitarios (`tests/theme.test.ts`, `tests/order.test.ts`).
    - Se compila la demo oficial en `sites/demo-{slug}/` validando código 0, carga instantánea y 0 scripts externos de terceros no declarados.
   - Se congelan los tags Git inmutables `template/{slug}@1.0.0` y `template/{arquetipo}@1.0.0`.
   - Se activa la demo en `web/src/config.ts`.

---

## User Stories

1. Como **prospecto que visita una demo de NexoBow**, quiero ver una página con un diseño visual de nivel mundial idéntico al referente líder de mi industria, para percibir autoridad y confianza inmediata.
2. Como **cliente de NexoBow (prestador de servicios)**, quiero que la página no me venda diseño web ni jerga técnica, sino que exponga con claridad mis servicios, propuesta de valor, dolores que resuelvo y credenciales para captar pacientes/clientes.
3. Como **usuario móvil**, quiero poder agendar una llamada de valoración o iniciar un chat de WhatsApp en un clic desde un botón visible y ergonómico, para resolver mi consulta sin fricción.
4. Como **visitante indeciso sobre la estética de su marca**, quiero poder alternar en tiempo real entre 4 paletas de color mediante una píldora flotante, para elegir la combinación visual que mejor represente mi práctica.
5. Como **operador de NexoBow**, quiero que al inyectar una ficha en `/clients/` sobre cualquier template del catálogo, el compilador `build-client-site.mjs` popule el contenido sin alterar la maquetación visual ni requerir tocar código fuente.
6. Como **desarrollador del sistema**, quiero que cada template cuente con tests automatizados independientes de orden de secciones y variables de tema, para prevenir regresiones al clonar o actualizar sitios.
7. Como **auditor de calidad de NexoBow**, quiero verificar que las páginas compilen limpiamente sin scripts de terceros no declarados y respetando el límite de Cloudflare Pages (25 MB), para mantener una carga instantánea inferior a 0.8s.
8. Como **agencia NexoBow**, quiero fijar tags Git inmutables (`template/{slug}@1.0.0`), para que las versiones de los templates permanezcan congeladas y reproducibles a lo largo del tiempo.
9. Como **visitante corporativo que evalúa un abogado (Kümmerlein)**, quiero experimentar un diseño sobrio, asimétrico, con tipografía brutalista y botón con punto indicador expansivo, para sentir el rigor y prestigio de un gran estudio jurídico.
10. Como **paciente que busca una clínica o cirugía (SkyClinics)**, quiero experimentar una interfaz de piedra mineral, verdes quirúrgicos y tarjetas de prestigio arquitectónico, para sentir seguridad y excelencia médica.
11. Como **empresa que busca consultoría estratégica B2B (Vetter / Think Company)**, quiero ver métricas claras, cuadrículas tácticas, bloques de problemas complejos y casos de estudio desglosados, para entender el retorno de inversión.
12. Como **usuario de tecnología con preferencias de accesibilidad**, quiero que todas las animaciones y transiciones respeten la regla `prefers-reduced-motion`, para evitar mareos o distracciones.

---

## Implementation Decisions

### 1. Lista Priorizada de Referencias & Mapeo de Arquetipos
El catálogo se implementa mediante tajadas verticales secuenciales independientes:

| Ticket | Rubro / Slug | URL de Referencia | Arquetipo Visual Desacoplado | Paleta Dominante 60-30-10 | Tipografías Abiertas Mapeadas |
|---|---|---|---|---|---|
| **T-REA-01** | `abogado` | `https://www.kuemmerlein.de/` | `obsidian-authority` | `#f6f6f4` (Fondo) · `#111111` (Tinta) · `#f7f788` (Primario Kümmerlein) · `#686155` (Acento) | `Space Grotesk` (Display) + `Inter` (Sans) |
| **T-REA-02** | `clinica` | `https://skyclinics.al` | `architectural-prestige` | `#e8e7e5` (Fondo) · `#003934` (Deep Forest) · `#1a9e8f` (Menta) · `#0f172a` (Tinta) | `Plus Jakarta Sans` (Display) + `Inter` (Sans) |
| **T-REA-03** | `corporativo` | `https://vetter-consulting-en.webflow.io/` | `high-ticket-consulting` | `#090909` (Onyx) · `#f4f4f4` (Tiza) · `#ff891d` (Tactical Orange) · `#1e1e1e` (Grid) | `Plus Jakarta Sans` (Display) + `Inter` (Sans) |
| **T-REA-04** | `tech` | `https://www.thinkcompany.com/` | `tech-editorial-system` | `#031b36` (Navy Ink) · `#fdffee` (Canvas Vanilla) · `#ff2c17` (Think Red) · `#b6ffff` (Soft Cyan) | `Syne` / `Familjen Grotesk` + `Space Grotesk` + `Inter` |
| **T-REA-05** | `deportes` | `https://theperformancelab.ca/` | `kinetic-performance` | `#0f1419` (Dark Carbon) · `#f3f4f6` (White) · `#10b981` (Kinetic Green) | `Barlow Semi Condensed` + `Inter` |
| **T-REA-06** | `dermatologia`| `https://lipedemaguru.com/` | `clinical-pure` | `#f8fafc` (Pure White) · `#0f172a` (Slate Navy) · `#0284c7` (Clinical Blue) | `Plus Jakarta Sans` + `Inter` |
| **T-REA-07** | `propiedades` | `https://www.lufte.us/` | `architectural-spaces` | `#fbfbf9` (Lienzo Tiza) · `#1c1917` (Stone Ink) · `#854d0e` (Bronze Oak) | `Playfair Display` + `Manrope` |
| **T-REA-08** | `producto` | `https://heavn-one.webflow.io/` | `minimalist-hardware` | `#0a0a0a` (Deep Matte) · `#fafafa` (Pure White) · `#2563eb` (Laser Indigo) | `Inter Tight` + `Inter` |
| **T-REA-09** | `construccion`| `https://www.reliablepaving.com/`| `industrial-authority` | `#1c1917` (Asphalt) · `#fafaf9` (Concrete) · `#f59e0b` (Safety Amber) | `Teko` / `Oswald` + `Inter` |
| **T-REA-10** | `farmaceutica`| `https://www.roveia.com/` | `biotech-clarity` | `#ffffff` (Lab White) · `#0f172a` (Deep Molecule) · `#059669` (Bio Green) | `Plus Jakarta Sans` + `Inter` |
| **T-REA-11** | `profesional` | `https://tahitinumerique.pf/` | `island-creative-pure` | `#0b0f19` (Lagoon Dark) · `#f8fafc` (Sand) · `#06b6d4` (Cyan Pacific) | `Outfit` + `Inter` |
| **T-REA-12** | `turismo` | `https://www.bluemoreyachting.com/` | `oceanic-luxury` | `#030712` (Midnight Deep) · `#f9fafb` (Sail White) · `#38bdf8` (Azure Wave) | `Cinzel` / `Cormorant Garamond` + `Montserrat` |
| **T-REA-13** | `musica` | `https://ethosmusicacademy.it/` | `harmonic-academy` | `#18181b` (Acoustic Stage) · `#f4f4f5` (Ivory Key) · `#e11d48` (Vibrant Tone) | `Cinzel Decorative` / `Syne` + `Inter` |

### 2. Anatomía de Componentes Únicos por Template
Cada directorio `templates/{slug}/src/components/` debe ser una implementación original adaptada a la estética del referente:
- **`Header.astro`**: Tipografía del referente, layout de barra superior (flotante, dividida o integrada en el hero), botón de agendamiento y WhatsApp.
- **`Hero.astro`**: Replicación exacta del referente (ej. asimetría y recortes curvos en Kuemmerlein; cuadrícula táctica en Vetter; layout de pantalla dividida con testimoniales en Think Company).
- **`Button.astro`**: Esquinas, bordes, estados de hover y acentos según el diseño objetivo (ej. botón cuadrado de 8px con punto `.dot` para Kuemmerlein; botón táctico con flecha oblicua para Vetter; botón píldora minimalista para Think Company).
- **`Sections/`**: Componentes `Problem`, `Steps`, `Reviews`, `CaseStudy`, `Pricing`, `Faq` y `FinalCta` respetando la modulación del referente, pero vinculados semánticamente al embudo de conversión del cliente.

### 3. Contrato de Datos Desacoplado `site.json`
El archivo `templates/{slug}/src/site.json` expone los siguientes bloques:
```json
{
  "_meta": "Punto de inyección del motor build-client-site",
  "tema": {
    "primary": "#HEX",
    "accent": "#HEX",
    "fondo": "#HEX",
    "tinta": "#HEX",
    "fuente": "NombreFuenteDisplay",
    "fuente_sans": "NombreFuenteSans",
    "orden_secciones": ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"]
  },
  "paletas_alternativas": [
    { "nombre": "Original", "fondo": "...", "tinta": "...", "primary": "...", "accent": "..." },
    { "nombre": "Paleta 2", ... },
    { "nombre": "Paleta 3", ... },
    { "nombre": "Paleta 4", ... }
  ],
  "content": {
    "hero": { ... },
    "marquee": { ... },
    "prestador": { ... },
    "problema": { ... },
    "pasos": { ... },
    "reviews": { ... },
    "casos": { ... },
    "pricing": { ... },
    "faq": { ... },
    "links": { "calendly": "...", "whatsapp": "..." },
    "footer": { ... },
    "final_cta": { ... }
  }
}
```

---

## Testing Decisions

1. **Pruebas de Contrato y Tema Unitarias (`templates/{slug}/tests/`):**
   - `tests/theme.test.ts`: Valida que `site.json` contenga todos los tokens del tema, valores HEX válidos, contraste suficiente y fuentes Google Fonts declaradas.
   - `tests/order.test.ts`: Valida que `orden_secciones` resuelva correctamente las secciones declaradas sin fallos de importación.
2. **Pruebas de Integración y Resolución (`tests/archetype-decoupling.test.mjs`):**
   - Valida que `resolveTemplateArchetype` y `resolveTemplateSourceDirectory` resuelvan tanto el nombre del slug como el arquetipo visual hacia el directorio físico correspondiente.
3. **Auditoría Técnica del Clon Compilado (`npm run audit-site`):**
   - Cero scripts de terceros no declarados y activos dentro del límite de Cloudflare Pages (25 MB).
   - Animaciones y micro-interacciones sin límite artificial de JS propio.
   - Contraste de texto y botones según WCAG AA.
4. **Suite Global de Regresión:**
   - La suite completa de `npm test` debe mantener el 100% de tests pasando en verde.

---

## Out of Scope

- Copiar o transferir elementos gráficos de la agencia NexoBow (`web/`) a los templates (estricta observancia de `ERROR-001`).
- Rellenar los templates con carritos de compra o catálogos e-commerce complejos para la opción de productos: el objetivo es vender el servicio, consultoría o pedido directo vía embudo ágil.
- Descarga de tipografías comerciales con licencia cerrada: se usan exclusivamente fuentes abiertas de Google Fonts.
- Integración de scripts de tracking externos (Google Tag Manager, Facebook Pixel) en el template base sin configuración explícita del cliente.

---

## Further Notes

- Cada template se desarrollará en una sesión limpia / ticket atómico individual siguiendo el ciclo **TDD Red-Green-Refactor**.
- El primer ticket a ejecutar de forma inmediata es **T-REA-01: Kümmerlein Abogacía (`templates/abogado/`)**, reconstruyendo sus componentes `.astro` para que sean el clon fiel de su diseño real.
