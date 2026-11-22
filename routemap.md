# 🗺️ NexoBow System — Master RouteMap v4.0 & Estrategia de Escala ($0 a +$100,000 USD/mes)

> **Misión Core:** Devolverle al **prestador** de salud, estudios jurídicos y servicios profesionales **+10 horas libres por semana** y reducir de raíz el ausentismo de turnos, transformando las consultas dispersas de Google Maps, Instagram y WhatsApp en **consultorías agendadas y concretadas** mediante **embudos** "Bow" (su **landing** estática de carga `<0.8s`, posicionamiento AEO en buscadores e inteligencias artificiales y **turno automatizado** 24/7 con confirmación preventiva).
>
> **Regla Innegociable de Gates (`$0` gasto fijo):** Cada fase se financia con caja real de la etapa anterior. Ningún entregable de ingeniería en Gate 0 o en la preparación offline de Gate 1 puede generar gasto fijo mensual en servidores, telefonía o APIs antes de cobrar los primeros **setups** reales.

---

## 🎯 El Factor Diferencial Real: Por Qué Nos Eligen Profesionales +40

Ningún odontólogo, médico estético, nutricionista o abogado se despierta deseando comprar *"una landing en Astro SSG"*. Lo que necesita resolver todos los días son tres cuellos de botella concretos que consumen su tiempo y su rentabilidad:

| Desafío Diario del Prestador | Pérdida Real Hoy | Mecanismo NexoBow (Sobrio y Medible) | Resultado Cuantificable |
| :--- | :--- | :--- | :--- |
| **1. Atención dispersa por WhatsApp fuera de hora** | Responde manualmente decenas de consultas y audios por día tipo *"hola, arancel"* y pierde pacientes frente a quien contesta primero. | **Landing Filtro `<0.8s` + Atención automática por WhatsApp (n8n + Redis + Postgres)** que interpreta audios, aclara cobertura/modalidad y ordena la agenda 24/7. | **+10 horas libres por semana** y respuesta ordenada en segundos. |
| **2. Ausencias y cancelaciones de último momento** | Entre un **20% y 35%** de los turnos reservados se pierden sin aviso previo, generando huecos difíciles de cubrir a tiempo. | **Confirmación automática de turnos y lista de espera:** recordatorios interactivos 24h y 2h antes (`[Confirmar / Reprogramar]`) con oferta automática FIFO ante cancelaciones. | **Reducción sostenida del ausentismo** sin sumar carga administrativa. |
| **3. Baja visibilidad frente a colegas en Maps e IA** | Tiene una web obsoleta, lenta o solo redes sociales, por lo que Google y los asistentes de IA no comprenden su especialidad ni su zona. | **Impulso de reseñas 5★ en Google Maps + Posicionamiento AEO** (`JSON-LD` médico/legal + `/llms.txt` + `<link rel="canonical">`) en dominio propio. | Flujo predecible de **consultorías concretadas** de alto valor sin depender de publicar videos diarios. |

> **Tesis Central de Posicionamiento:** NexoBow no vende diseño suelto: entrega **horas de consulta ordenadas, menos ausencias y presencia profesional creíble** en Google Maps, buscadores y asistentes de IA.

---

## 📖 Ontología y Reglas del Lenguaje Oficial (`GLOSSARY.md` + Humanización +40)

Toda comunicación humana, prompt de agente, **ficha de cliente** y script del repositorio respeta el vocabulario oficial de NexoBow y mantiene un tono calmo, profesional y confiable en español argentino:

| Término Oficial | Definición Operativa en NexoBow | Términos a Evitar (_Avoid_) |
| :--- | :--- | :--- |
| **Prestador** | Profesional de la salud o servicios que contrata NexoBow (nutricionista, odontólogo, médico estético, abogado, clínica). | Cliente (ambiguo con paciente), usuario |
| **Paciente** | Persona que consulta al **prestador** y reserva un turno. | Cliente, lead (salvo antes de reservar) |
| **Turno automatizado** | Reserva de una **consultoría** que el **paciente** concreta por WhatsApp/agenda sin intervención manual del **prestador**. | Cita, reserva manual |
| **Consultoría** | Llamada o entrevista inicial del **prestador** con un **paciente** (`gratuita`, `arancelada` o `consultar` según `tipo_consulta`). | Demo, reunión |
| **Upsell del prestador** | Paso de la **consultoría** inicial al tratamiento o servicio completo pago (resuelto por el **prestador**). | Conversión (ambiguo) |
| **Setup** | Cobro único por implementar el **embudo** completo a un **prestador**. | Instalación, pago único |
| **Abono** | Cobro mensual recurrente por mantener y operar el sistema de **turno automatizado** (Tier 2 / Tier 3). | Mensualidad, fee, suscripción |
| **Caso de éxito** | Resultado comprobable de un **prestador**, publicado en la web de NexoBow o en su **landing**. | Testimonio |
| **Embudo** | Recorrido completo que lleva al **paciente** desde Google Maps, WhatsApp o Instagram hasta una **consultoría agendada**. | Sistema de turnos, bot, Calendly |
| **Landing** | Página propia del **prestador**, núcleo del **embudo**, con sus **casos de éxito**, reseñas e información de confianza. | Sitio web, embed |
| **Ficha de cliente** | Archivo Markdown (`{id}-{nombre}-{apellido}-{rubro}.md`) con datos, branding, contenido y estado de un **prestador**. | `client.json`, perfil |
| **Template** | Proyecto Astro base por rubro/arquetipo duplicado vía REA que se clona para cada **prestador**. | Plantilla, theme |
| **Clon** | Copia del **template** adaptada automáticamente con la **ficha de cliente** de un **prestador** (modo `preview` o `production`). | Fork, sitio |

---

## 💰 Tesis Económica & Escalera de Valor (Alineada a `web/src/config.ts`)

### 1. Decisiones Económicas y Técnicas Vigentes
1. **Erradicación del micro-abono de $10 USD/mes:** Un cobro mensual bajo genera comisiones de pasarela altas y la misma atención operativa que un abono corporativo. **Modelo vigente:** Tier 1 cobra un **Setup único (`$189.999 ARS`) con `$0 ARS/mes` durante el Año 1 de hosting en Cloudflare Pages**. El **abono** mensual nace en **Tier 2** cuando opera la infraestructura de atención automática por WhatsApp.
2. **Prohibición de WhatsApp No Oficial en Producción:** En Gate 0 se contacta en forma humana y asistida desde `/admin/crm`; en Gate 1 productivo se opera exclusivamente sobre **Meta Cloud API Oficial (WABA)** con cero riesgo de suspensión del número del consultorio.
3. **Desacople de RAM en VPS:** Chatwoot se mantiene desacoplado fuera del Compose central para preservar la estabilidad del VPS de `n8n 2.0 + Postgres 16 + Redis 7`.
4. **Prioridad de Nichos de Alto Margen:** Priorizar **Odontología Implantológica, Medicina Estética/Dermatología, Cirugía, Kinesiología, Nutrición Clínica y Estudios Jurídicos**. Un solo tratamiento o consulta corporativa amortiza el año completo.
5. **Seguridad Zero-Trust y Ley 25.326:** Sin puertos públicos para Postgres/Redis, sin credenciales literales en git, separación estricta de datos personales de **pacientes** en la red interna `data-tier` del VPS y solo métricas agregadas hacia Cloudflare Edge y Supabase.

### 2. La Escalera de Valor Oficial NexoBow

| Nivel de Oferta | Nombre del Sistema | Qué Incluye el Embudo Entregado | Setup (Único) | Abono (Mensual) | Rol en la Escala a $100k/mes |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Tier 0 (Muestra Gratuita)** | **Preview Studio 10x + Diagnóstico Maps** | **Clon** vivo 7 días (`preview.nexobow.site/{slug}/`) con **Preview Studio HUD** (selector de 4 paletas, comparador *20% vs. 10x*, simulador de turno) + análisis Maps/AEO. | **$0** | **$0** | Rompehielos de alta respuesta: muestra el trabajo funcionando antes de cobrar. |
| **Tier 1 (Liquidez & Entrada)** | **NexoBow Starter** | **Clon** compilado en `--mode production` para dominio propio (`.com.ar`/`.com`) con AEO (`JSON-LD`, `/llms.txt`, `robots.txt`, `canonical`), Copy +40, entrega en **72h hábiles**, **1 año de hosting Cloudflare**, kit **review-booster** (link Maps + QR SVG) y **30 días de prueba** del Turno Automatizado. | **$189.999 ARS** *(o $189–$249 USD)* | **$0 ARS/mes** *(Año 1 incluido)* | **Caja rápida (`$0 → $5k/mes`)** sin soporte de micro-abonos. Financia el VPS. |
| **Tier 2 (Core Recurrente)** | **NexoBow Autonomous** | Todo Tier 1 + **Atención automática por WhatsApp 24/7** (audios + texto, Meta Cloud API + `n8n` + Redis + Postgres) + **Confirmación automática de turnos 24h/2h con lista de espera FIFO** + pedido automático de reseñas 5★ en Maps. | **$549.999 ARS** *(o $500–$950 USD)* | **$229.999 ARS/mes** *(o $197–$297 USD/m)* | **Motor principal de MRR.** Menos ausencias y agenda cubierta de forma continua. |
| **Tier 3 (High-Ticket Clínicas)** | **NexoBow Growth Partner (+ AfterBow)** | Todo Tier 2 multi-profesional + AEO completo + **Producción Audiovisual (AfterBow)** + reactivación ordenada de **pacientes** inactivos. | **$1,500 – $3,000 USD** *(o plan a medida)* | **$500 – $1,000 USD/mes** | Escala en clínicas privadas, centros médicos y arbitraje internacional. |
| **Tier 4 (Escala 1-a-Muchos)** | **NexoBow Digital Kit** | Recursos autogestionables + plantillas de atención por WhatsApp para el **upsell del prestador** (Fase 4). | **$47 – $97 USD** | **$29 USD/mes** *(Comunidad)* | Monetización digital complementaria en Fase 4. |

### 3. Ecuación Matemática hacia +$100,000 USD/mes (Objetivo Fase 4)

| Línea de Ingreso | Volumen Objetivo | Ticket Promedio | Facturación Mensual (USD) | Margen Neto Estimado |
| :--- | :--- | :--- | :---: | :---: |
| **1. Setups Tier 1 (Starter)** | 25 nuevos **setups**/mes | $200 Setup único | **$5,000 USD** | ~98% |
| **2. Motor Recurrente Tier 2 (Autonomous)** | 200 **prestadores** en **abono** + 20 nuevos **setups**/mes | $250 Abono / $650 Setup | **$63,000 USD** | ~92% |
| **3. Clínicas Tier 3 (Growth Partner)** | 35 clínicas en **abono** + 6 nuevos **setups**/mes | $700 Abono / $2,000 Setup | **$36,500 USD** | ~88% |
| **4. Activos Digitales Tier 4 (Kit IA)** | 180 ventas/mes (Meta Ads) | $67 USD promedio | **$12,060 USD** | ~65% (post-Ads) |
| **TOTAL CONSOLIDADO NEXOBOW** | **235 Prestadores en Abono + Setups + Digital** | **Mix Híbrido B2B** | **$116,560 USD / mes** | **~88% (~$102k netos)** |

---

## 🏗️ Catálogo de Templates REA (Estado Verificado)

> **Regla Innegociable de Producto:** Cada **template** (`/templates/{id}/`) es una arquitectura visual autónoma inspirada en un referente internacional real vía REA, con su layout propio, compatible con `ThemeSwitcher` en `--mode preview` y compilación limpia en `--mode production` con AEO.

| Template (`/templates/{id}/`) | Arquetipo Visual | Referente Internacional REA | Estado Verificado | Nicho B2B Objetivo | Ticket Ideal |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `templates/nutricionista/` | `editorial-classic` (`@1.0.0`) | **Delta Cafés** (`deltacafes.com`) | ✅ Activo + Demo | Nutricionistas, psicólogos, terapeutas | Tier 1 → Tier 2 |
| `templates/abogado/` | `obsidian-authority` (`@2.0.0`) | **Kümmerlein** (`kuemmerlein.de`) | ✅ Activo + Demo | Estudios jurídicos, contadores, escribanías | Tier 2 → Tier 3 |
| `templates/clinica/` | `architectural-prestige` (`@2.0.0`) | **SkyClinics** (`skyclinics.al`) | ✅ Activo + Demo | Clínicas médicas, centros odontológicos | Tier 2 → Tier 3 |
| `templates/corporativo/` | `high-ticket-consulting` (`@2.0.0`) | **Vetter Consulting** | ✅ Activo + Demo | Consultoras B2B, asesores financieros | Tier 3 |
| `templates/tech/` | `tech-editorial-system` (`@1.0.0`) | **Think Company** | ✅ Activo + Demo | Consultoras software, arquitectura digital | Tier 3 |
| `templates/deportes/` | `kinetic-performance` (`@1.0.0`) | **The Performance Lab** | ✅ Activo + Demo | Kinesiólogos deportivos, deportólogos, gym | Tier 1 → Tier 2 |
| `templates/dermatologia/` | `clinical-pure` (`@1.0.0`) | **Lipedema Guru** | ✅ Activo + Demo | Dermatología, medicina estética, cirugía | Tier 2 → Tier 3 |
| `templates/producto/` | `minimalist-hardware` (`@1.0.0`) | **Heavn One** (`heavn-lights.com`) | ✅ Activo + Demo | Equipamiento médico, ortopedia, hardware | Tier 2 → Tier 3 |
| `templates/construccion/` | `industrial-authority` (`@1.0.0`) | **Reliable Paving** | ✅ Activo + Demo | Construcción, pavimentación, ingeniería | Tier 2 → Tier 3 |
| `templates/propiedades/` | `architectural-spaces` (Ticket #26) | **Lufte** (`lufte.us`) | ⏳ Congelado (`src/` base) | Desarrolladoras, arquitectura, inmobiliarias | Gate 2 / Out of Scope |
| `farmaceutica` a `musica` | Tickets `#29`–`#32` | *Roveia, Tahiti Numérique, Bluemore, Ethos* | ⏳ Congelados | No abrir nuevos **templates** antes de facturar >$5k/mes en Salud y Legales. | Gate 2 / Out of Scope |

---

## 🚀 Roadmap de Ejecución por 4 Fases y Gates de Facturación (`v4.0`)

```text
[FASE 1 / GATE 0: COMPLETADO (#50-#57 · $0 fijo)]
   └──► [FASE 2 / GATE 1: Frente I (#58-#62: Tier 1 $0 + Blueprint VPS Offline 1 Comando)]
           └──► [FASE 3 / GATE 2: Out of Scope actual (Hermes, Obsidian Sync, Treg.to, Arbitraje)]
                   └──► [FASE 4: Ads + Activos Digitales ($60k-$100k+/mes)]
```

### 🟢 FASE 1 / GATE 0: Validación de Oferta, Legalidad, UX +40 & Blindaje Perimetral `[COMPLETADO — Tickets #50–#57 · Costo Fijo $0]`
- [x] **Ticket #50 (Frente G):** `NexoBow Preview Studio HUD 10x` en los 10 **templates** (`PROTOTIPO CONCEPTUAL · 20%`, TTL 7 días, simulador de turno, `theme-switched`) + unificación de WhatsApp oficial `+54 9 3489 53-6088` (`5493489536088`).
- [x] **Ticket #51 (Frente G):** Pipeline de ingesta por lotes de `1–10` links de Google Maps (`scripts/intake-maps-batch.mjs`), scraping de email/web (`Cubeta A/B`), calificación determinista y publicación de previews.
- [x] **Ticket #52 (Frente G):** Outbound B2B controlado vía **Zoho Mail** (`scripts/send-zoho-outreach.mjs`), telemetría sin cookies (`scripts/preview-telemetry.mjs`) y endpoint Edge `/api/ping` con alerta Hot-Lead vía Resend.
- [x] **Ticket #53 (Frente G):** Workstation `/admin/crm` y `/admin` Cockpit con email, estado Zoho, reseñas, badge `Hot-Lead`, modal de lote Maps y botones de copiado/envío en 1 clic (`0 JS` en `web/` pública).
- [x] **Ticket #54 (Frente H):** Marco legal formal en Soft-Obsidian (`/terminos/#reembolsos`, `/terminos/#debito-automatico`, `/privacidad/#retencion` bajo Ley 25.326), banner Consent Mode v2 (`'denied'` por defecto) + GA4 condicional, SEO de marca y checklist Google Business Profile.
- [x] **Ticket #55 (Frente H):** Rediseño **UX Diagram-First +40** (`0 JS`), 4 capturas WebP reales optimizadas en `CaseStudies`, humanización total del lenguaje y guardia automatizada `tests/copy-humanization.test.mjs`.
- [x] **Ticket #56 (Frente H):** Flujo inbound completo (`CreateBowSystem` con casilla `accept_terms` sin pre-marcar), baja HMAC-SHA256 RFC 8058 (`/api/unsubscribe`, `/baja-email/`), Zoho + Resend + integración **ElevenLabs MCP Starter**.
- [x] **Ticket #57 (Frente H):** `web/public/robots.txt`, `web/public/_headers` (CSP, HSTS, `no-store` en `/admin/*` y `/api/*`), endurecimiento de endpoints Edge + SMTP CRLF y auditoría E2E limpia (`177` tests en verde).

---

### 🟡 FASE 2 / GATE 1: Valor Inmediato Tier 1 & Blueprint Offline `NexoBow Autonomous` `[Frente I — Tickets #58–#62]`
> **Principio Rector (Corte Híbrido `$0-fijo`):** El **Bloque 1 (`#58`–`#59`)** entrega valor inmediato a los primeros **prestadores** Tier 1 (`$189.999 ARS` **setup** + `$0 ARS/mes` Año 1) sin costo fijo. El **Bloque 2 (`#60`–`#62`)** construye y verifica 100% offline todo el código, esquema Postgres 16, Docker Compose Zero-Trust y workflows `n8n` de **NexoBow Autonomous** para activarlo en VPS Hetzner con **1 solo comando** al cobrar el primer **abono** Tier 2.

- [x] **Bloque 1 · Ticket #58 — AEO (`scripts/aeo-optimizer.mjs`), `--mode preview|production` en `build-client-site.mjs`, `web/public/llms.txt` (`0 JS`) y `routemap.md` v4.0:**
  * Modo productivo limpio sobre dominio propio: remueve el HUD `20%` únicamente en la copia efímera `sites/{slug}/src/pages/index.astro`, compila `--base /`, omite `/api/ping`, inyecta `JSON-LD` específico por especialidad (`Dentist`, `MedicalClinic`, `Physician`/`MedicalBusiness`, `LegalService`, `ProfessionalService` + `FAQPage`), `<link rel="canonical">`, `index, follow`, `dist/llms.txt` y `dist/robots.txt`, sin modificar `/templates/*/` ni pisar `dist-previews/`.
  * Publicación de `web/public/llms.txt` en `nexobow.site` manteniendo `0` bytes de JS de negocio.
- [ ] **Bloque 1 · Ticket #59 — Motor de Reseñas 5★ (`scripts/review-booster.mjs`), Supabase (`active_clients`, `autonomous_events`, 8 tablas) & `/admin/clients` (Entrega 72h):**
  * Enlace directo `writereview?placeid=...`, QR SVG offline imprimible para consultorio y mensaje respetuoso en voseo +40 en 1 clic desde `/admin/clients`, reutilizable en `n8n` post-consultoría.
  * Promoción en 1 clic desde `/admin/crm`, cálculo automático de `72h` hábiles de entrega, prueba de `30d`, renovación Año 1 (`365d`), checklist de 6 hitos y alertas `<24h` / `<=5d` en el Cockpit.
- [ ] **Bloque 2 · Ticket #60 — Blueprint IaC Zero-Trust Gate 1 (`infra/autonomous/`, Postgres 16 SQL, `scripts/activate-autonomous.mjs --dry-run` y `docs/gate1-vps-activation.md`):**
  * Compose Zero-Trust (`n8n 2.0` + `Postgres 16` + `Redis 7` en red `data-tier` `internal: true`, sin `docker.sock`, con `no-new-privileges:true` y puente opcional `cloudflared`), esquema SQL transaccional (`appointments`, `waitlist_entries`, `reminder_dispatches`, `conversation_state`) y preflight en 1 comando (`$0` gasto fijo hasta ejecutar `--apply` en VPS real).
- [ ] **Bloque 2 · Ticket #61 — Seams Puros `NexoBow Autonomous` (`waba-webhook.mjs`, `appointment-reminders.mjs`) & 3 Workflows `n8n` JSON (`workflows/n8n/`):**
  * Verificación Meta Cloud API (`GET` challenge + HMAC-SHA256 en tiempo constante), debounce Redis (`8–12s`), clasificador determinista `IntentClassifier` (`$0` con hook enchufable y derivación humana obligatoria ante urgencias clínicas), recordatorios `24h`/`2h` idempotentes, lista de espera FIFO bajo Ley 25.326 y workflows `01-waba-receptionist.json`, `02-reminders-waitlist.json`, `03-review-booster.json`.
- [ ] **Bloque 2 · Ticket #62 — Puente Edge `/api/v1/autonomous/ingest` (Sin PII), Panel Gate 1 en `/admin/settings` & Auditoría E2E:**
  * Autenticación `X-Autonomous-Key` en tiempo constante (falla cerrada en producción), rechazo `400` ante cualquier campo personal de **paciente**, estado `"Preparado (Gate 0 · $0 VPS)"` → `"Operativo"` en `/admin/settings`, ampliación de `tests/copy-humanization.test.mjs`, verificación `wrangler pages functions build` y dictamen `/audit-code`.
- **Meta Financiera Gate 1:** Cobrar **1–3 Setups Tier 1 (`~$500–$1.000 USD`)** para fondear VPS + activar el motor hacia **10–50 prestadores en abono Tier 2 (`$5,000 – $25,000 USD/mes`)**.

---

### 🟣 FASE 3 / GATE 2: Operación Autónoma 24/7, Bóveda Obsidian & Arbitraje Internacional `[Out of Scope actual — >$2,500–$5,000 USD/mes]`
> **Límite explícito de alcance:** Todo este bloque queda **`Out of Scope`** durante el Frente I (`#58`–`#62`). Solo se habilita tras superar `$2,500–$5,000 USD/mes` de facturación recurrente real.

- [ ] **Arnés Único 24/7 (`Hermes Agent` en VPS) & Bóveda `Obsidian Sync`:** Despliegue confinado de Hermes (`cap_drop: [ALL]`, `read_only: true`, sin `docker.sock`) conectado al Telegram del fundador, sincronizado con bóveda Obsidian (`/raw/`, `/wiki/`, `/diario/`, `/privado/`) vía Syncthing.
- [ ] **Tool Gateway & Decisor System-1 (`Treg.to` + `Jev` / `Crawl4AI`):** Enrutamiento seguro de herramientas vía `superdesigndev/treg`, activación de `Jev` o LLM pago sobre el hook `customClassifier`, y auditorías web automatizadas con `Crawl4AI`.
- [ ] **Infraestructura Multi-Sede & Arbitraje Geográfico:** `Cal.com` self-hosted/API, `Chatwoot Cloud` pago para atención multi-agente, apertura selectiva de **templates** congelados (`#26`, `#29`–`#32`) y expansión comercial hacia España, EE. UU. hispano, México y Chile (`$1,500–$3,000 USD` **setup** + `$500–$1,000 USD/mes`).
- **Meta Financiera Gate 2:** **120 prestadores Tier 2 + 15 clínicas Tier 3 = `~$25,000 – $60,000 USD/mes`**.

---

### 🔴 FASE 4: Ads + Activos Digitales & Escala Sostenida `[+$60,000 a +$100,000+ USD/mes]`
- [ ] **Motor de Adquisición Paga (`Creative-Ads-Bow`):** Campañas de pauta optimizadas con creativos y casos reales hacia `/solicitud-enviada/` para clínicas Tier 3.
- [ ] **Lanzamiento de Activos Digitales (Tier 4 — `NexoBow Digital Kit`):** Producto auto-entregable (`$47–$97 USD`) + comunidad (`$29 USD/mes`) para profesionales independientes en Iberoamérica.
- [ ] **Cobro Recurrente y Gobernanza (`Business-Bow` & `Legal-Bow`):** Pasarelas automáticas de suscripción (Stripe / MercadoPago Suscripciones) alineadas a `/terminos/#debito-automatico`, seguimiento LTV/CAC y monitoreo ejecutivo diario desde `/admin`.

---

## 🤝 Protocolo Operativo Co-Founder & Ciclo SDD

1. **Explicación Clara Primero:** Definir problema operativo, alternativas descartadas y criterio técnico antes de escribir código.
2. **Validación Manual Asistida Antes de Automatizar:** Validar mensaje, preview y cierre en operaciones reales antes de pasar a cron o daemon autónomo.
3. **Cristalización en `Agent Skills` y Seams TDD:** Cada flujo validado queda encapsulado en `/.agents/skills/{nombre}/SKILL.md` + scripts deterministas verificados con `node --test` (`npm test`).
4. **Ciclo SDD Estricto (`prompts_structure.md`):** `/grill-me` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/implement` (RED → GREEN → VERIFY) ➔ `/audit-code` + `impeccable detect`.
