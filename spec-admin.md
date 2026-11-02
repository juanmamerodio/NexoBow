# NexoBow & Alaynow Central Admin Cockpit — Master Specification (`spec-admin.md`)

Documento de especificación técnica formal para el Panel de Administración General alojado en `https://nexobow.site/admin`, resultante de la fase de alineación y cuestionamiento exhaustivo (`/grill-me`).

Términos de dominio definidos en [GLOSSARY.md](./GLOSSARY.md).

---

## Problem Statement

Actualmente, la gestión operativa, comercial y personal de NexoBow y el canal de YouTube Alaynow presenta fricciones críticas y limitaciones de escalabilidad:

1. **Gestión Comercial Frágil (Google Sheets como cuello de botella)**:
   - El pipeline de prospección (`'Prospección NexoBow'!B11:S1000`) depende del CLI `gsheets`, propenso a bloqueos de concurrencia, límites de cuota de Google Cloud y falta de reactividad en tiempo real.
   - El seguimiento de prospectos activos, el control de la caducidad del TTL de 7 días y la apertura manual de chats de WhatsApp con copy prearmado carecen de una interfaz visual ágil de alta densidad.

2. **Dispersión Multi-Unidad y Falta de Visibilidad Financiera**:
   - Los ingresos de la agencia NexoBow (pesos argentinos — ARS), los ingresos de Alaynow (Google AdSense y patrocinios de marcas en USD/ARS) y los gastos operativos/personales se registran de forma fragmentada o no consolidada, impidiendo conocer el flujo de caja neto (*Cashflow*) y el beneficio mensual real en tiempo real.

3. **Descoordinación de Tiempo y Hábitos**:
   - No existe un centro de mando único que sincronice los bloques de trabajo profundo (*time-blocking* semanal para prospección, grabación de videos y desarrollo de software) con los compromisos externos de Google Calendar.
   - El control de hábitos diarios y disciplina carece de un registro visual de consistencia y rachas (*streaks*), aumentando la fricción cognitiva al cambiar entre múltiples herramientas.

4. **Pipeline Desconectado para Producción de Video (Alaynow)**:
   - El ciclo de vida de los contenidos de YouTube (ideas, investigación, guionado, grabación, edición, miniaturas y publicación con métricas post-lanzamiento) se encuentra desvinculado de la agenda y de las finanzas de sponsors.

---

## Solution

Desarrollo y despliegue de un **Panel de Administración General y Centro de Mando ("Cockpit")** en `https://nexobow.site/admin`, construido como una aplicación de una sola página (**SPA interactiva**) con **React + Tailwind CSS + Lucide Icons**, montada sobre el framework Astro de `web/` sin alterar el benchmark de **0-JS ejecutable en cliente de las páginas públicas de marketing**.

El sistema se apoya en **Supabase** como única fuente de verdad relacional (PostgreSQL + Auth + RLS + Realtime) y se compone de 6 módulos operativos más una vista principal ejecutiva:

1. **Cockpit Diario (Home / Resumen Ejecutivo)**:
   - Resumen integral de la jornada: bloques horarios y reuniones de hoy, widget interactivo para tildar hábitos del día en 1 clic, alertas de prospección comercial con TTL próximo a expirar (<48h), próximo video en producción de Alaynow y métricas consolidadas de Cashflow mensual.

2. **CRM & Prospección de Clientes (Sustitución Total de Google Sheets)**:
   - Migración completa y corte definitivo de la planilla a Supabase (`leads`).
   - Vista dual: Tablero Kanban por etapas del embudo comercial + Tabla filtrable por nicho, ciudad y estado.
   - Acciones rápidas en 1 clic: disparar WhatsApp con copy predeterminado según el estado, abrir la Web Preview compilada (`https://preview.nexobow.site/{slug}/`), renovar el TTL de 7 días y actualizar notas.
   - Refactorización de los scripts existentes (`scout-lead`, `build-client-site`, `lead-lifecycle`) para que apunten a Supabase mediante la capa desacoplada `LeadStore`.

3. **Finanzas Multi-Unidad (NexoBow + Alaynow + Gastos)**:
   - Soporte multi-moneda (ARS y USD con tipo de cambio de referencia).
   - Centros de costo separados: `nexobow`, `alaynow`, `gastos_operativos`, `gastos_personales`.
   - Clasificación de transacciones en fijas (recurrentes) y variables.
   - Cálculo automático de ingresos brutos, gastos totales y beneficio neto mensual consolidado.

4. **Horarios & Gestión de Tiempo (Time-Blocking + Google Calendar)**:
   - Planificador semanal nativo con bloques de foco categorizados (prospección comercial, grabación Alaynow, desarrollo de software, descanso).
   - Visualización y convivencia en la misma agenda de eventos externos y llamadas de clientes sincronizadas con Google Calendar.

5. **Videos Alaynow (Pipeline de Contenido YouTube)**:
   - Tablero Kanban y vista de tabla con las 5 etapas de producción: *Idea / Backlog ➔ Guión / Research ➔ Grabación ➔ Edición & Miniatura ➔ Publicado / Listo*.
   - Metadatos integrados: fecha objetivo de salida, marca/sponsor asociado, valor comercial del patrocinio, enlace a guión o recursos y métricas de rendimiento (vistas y CTR).

6. **Hábitos & Disciplina**:
   - Cuadrícula de consistencia visual (*heatmap* estilo GitHub) con cálculo automático de racha activa (*current streak*) y racha histórica récord (*best streak*).
   - Clasificación por pilares: Salud, Foco/Negocio, Aprendizaje y Personal.

7. **Seguridad y Control de Acceso**:
   - Autenticación mediante **Supabase Auth** con Email + Contraseña y opción de Magic Link.
   - Políticas de seguridad a nivel de fila (**Row Level Security - RLS**) estrictas y validación en frontend para garantizar acceso exclusivo al correo del creador/administrador.
   - Identidad visual ejecutiva **Soft-Obsidian** (paleta `#040607`, `#0B0D12`, `#BF40FA`, `#4928C2`, `#E3D9FC`, tipografía Outfit/Inter).

---

## User Stories

### A. Autenticación, Seguridad y Shell General
1. As an administrator, I want to log in securely at `/admin` using my email and password or a Magic Link, so that unauthorized users cannot access my private operations and metrics.
2. As an administrator, I want RLS policies on Supabase to reject any read or write request originating from unauthenticated sessions or emails outside the owner whitelist, so that my database remains secure even if the anon API key is exposed.
3. As an administrator, I want the admin interface to follow the executive "Soft-Obsidian" dark aesthetic, so that long working sessions are visually comfortable and aesthetically cohesive with the NexoBow brand.
4. As an administrator, I want a collapsible sidebar with immediate links to the Cockpit and all 6 modules, so that I can switch contexts in a single click.
5. As an administrator, I want the public marketing landing pages of NexoBow to maintain their strict 0-client-JS benchmark, so that embedding the `/admin` interactive SPA does not compromise public Core Web Vitals.

### B. Cockpit Diario (Home)
6. As an administrator, I want to open `/admin` and instantly see my schedule for the current day, so that I know what tasks and meetings require my attention without opening Google Calendar.
7. As an administrator, I want to see a habit checklist widget on the cockpit home to mark habits as completed today with a single click, so that daily discipline tracking requires zero friction.
8. As an administrator, I want an alert banner on the cockpit showing leads whose 7-day TTL expires in less than 48 hours, so that I can send urgency follow-ups before the demo is purged.
9. As an administrator, I want to see the current active video in production for Alaynow with its target publication date, so that content creation momentum is maintained.
10. As an administrator, I want to see this month's consolidated net cashflow (income minus expenses in ARS and USD), so that I have immediate financial awareness every morning.

### C. CRM & Prospección de Clientes (Sustitución de Sheets)
11. As an administrator, I want all legacy records from `'Prospección NexoBow'!B11:S1000` migrated to Supabase, so that no historical prospect or client data is lost during the transition.
12. As an administrator, I want to view all leads in a Kanban board grouped by funnel stages (`Prospecto Identificado`, `Contactado`, `Interesado`, `En Negociación`, `Cliente Activo`, `Descartado`), so that I can track pipeline flow visually.
13. As an administrator, I want to switch to a searchable and filterable high-density Data Table view, so that I can filter leads by niche, city, contact status or potential value.
14. As an administrator, I want a quick WhatsApp button on every lead card/row that opens `https://wa.me/{phone}?text={pitch}` with pre-formatted Argentine voseo copy, so that prospecting takes under 3 seconds per lead.
15. As an administrator, I want a direct link button to open the compiled Web Preview (`https://preview.nexobow.site/{slug}/`), so that I can audit what the client will see before sending the message.
16. As an administrator, I want a visible TTL countdown badge on each lead (green > 48h, yellow < 48h, red expired), so that I know exactly when to renew or close.
17. As an administrator, I want a "Renew TTL (+7 days)" action on each lead, so that prospects showing active interest remain live in the system.
18. As an administrator, I want CLI scripts (`scout-lead`, `build-client-site`, `lead-lifecycle`) to read and write directly to Supabase, so that automated CLI jobs and the `/admin` UI operate on the exact same database.
19. As an administrator, I want top-level KPI counters displaying: Total Active Leads, Response Rate %, Total Value in ARS Pipeline, and Confirmed Meetings, so that commercial health is measured at a glance.

### D. Finanzas Multi-Unidad (NexoBow + Alaynow + Gastos)
20. As an administrator, I want to record income and expense transactions tagged by business unit (`nexobow`, `alaynow`, `gastos_operativos`, `gastos_personales`), so that each entity's profitability is tracked independently.
21. As an administrator, I want to select the transaction currency (ARS or USD) and enter an exchange rate, so that foreign currency earnings can be converted cleanly into consolidated metrics.
22. As an administrator, I want to mark transactions as either recurring (monthly fixed) or one-time variable, so that I can forecast recurring monthly overhead and MRR.
23. As an administrator, I want to view a monthly cashflow summary showing: Total Revenue, Total Expenses, Net Margin, and breakdown by business unit, so that I know exactly how much profit was generated.
24. As an administrator, I want to filter financial records by month, category, and business unit, so that accounting reconciliations take minimal effort.

### E. Horarios & Gestión de Tiempo
25. As an administrator, I want to define weekly recurring time-blocks for deep work (e.g., Prospection blocks, Alaynow recording blocks, Programming blocks), so that my ideal week is clearly structured.
26. As an administrator, I want external Google Calendar events (client meetings, personal appointments) rendered within the same weekly view, so that my schedule never double-books.
27. As an administrator, I want to mark whether a scheduled time block was accomplished or rescheduled, so that I can audit my focus discipline over time.

### F. Videos Alaynow (Pipeline de Contenido)
28. As an administrator, I want to manage video concepts through a Kanban board with stages: `Idea / Backlog`, `Guión / Research`, `Grabación`, `Edición & Miniatura`, `Programado / Publicado`, so that the YouTube production cycle is organized.
29. As an administrator, I want each video card to hold its target release date, script URL, sponsor brand, agreed sponsor fee, and thumbnail preview link, so that all production assets live in one place.
30. As an administrator, I want to record post-launch metrics (view count, CTR percentage) after a video goes live, so that editorial performance can be analyzed over time.

### G. Hábitos & Disciplina
31. As an administrator, I want to manage a list of core habits categorized under Health, Business Focus, Learning, and Personal, so that my routines are balanced.
32. As an administrator, I want an interactive GitHub-style consistency heatmap showing daily completion density over the last 90/365 days, so that consistency is tangibly rewarded.
33. As an administrator, I want automatic calculation of current active streaks and all-time longest streaks per habit, so that I stay motivated to maintain momentum.

---

## Implementation Decisions

### 1. Arquitectura de Despliegue e Islas Interactivas en `web/`
- La ruta `/admin` se define como una página Astro (`web/src/pages/admin/[...all].astro` o `web/src/pages/admin/index.astro`) que renderiza un componente raíz React montado con directiva `client:only="react"`.
- Esta arquitectura asegura que el generador estático de Astro empaquete el código interactivo de administración en un bundle aislado que solo se descarga al visitar `/admin`. Las rutas públicas (`/`, `/gracias`, etc.) permanecen con 0 bytes de JavaScript en cliente.
- El bundle de administración incluye `@supabase/supabase-js`, `lucide-react` y componentes estilizados con utilidades de Tailwind CSS ya configuradas en el proyecto.

### 2. Esquema Relacional de Base de Datos en Supabase (DDL)

El esquema SQL completo se diseña en un archivo de migración reproducible (`supabase/migrations/20261102000000_admin_cockpit_init.sql`).

#### A. Tipos Enumerados (Enums):
- `lead_funnel_status`: `'1. Prospecto Identificado'`, `'2. Contactado'`, `'3. Interesado'`, `'4. En Negociacion'`, `'5. Cliente Activo'`, `'Descartado'`.
- `lead_response_status`: `'Sin Contactar'`, `'Esperando Respuesta'`, `'Respondio Interesado'`, `'Respondio No Interesado'`.
- `business_unit_type`: `'nexobow'`, `'alaynow'`, `'gastos_operativos'`, `'gastos_personales'`.
- `financial_flow_type`: `'income'`, `'expense'`.
- `recurrence_type`: `'one_time'`, `'recurring_monthly'`.
- `currency_type`: `'ARS'`, `'USD'`.
- `schedule_category`: `'prospeccion'`, `'alaynow_grabacion'`, `'desarrollo'`, `'reunion'`, `'personal'`.
- `video_production_stage`: `'idea'`, `'guion'`, `'grabacion'`, `'edicion'`, `'programado'`, `'publicado'`.
- `habit_pillar`: `'salud'`, `'foco_negocio'`, `'aprendizaje'`, `'personal'`.

#### B. Tablas Maestras:
1. **`admin_profiles`**: Perfil y configuración del administrador (UUID de Supabase Auth, email, nombre, avatar, zona horaria).
2. **`leads`**: Registro maestro de prospectos y clientes de NexoBow (ID correlativo entero, fila de origen en Sheets, nombre profesional/clínica, nicho, teléfono normalizado, enlace de WhatsApp, URL de Web Preview, slug correlativo, handle de Instagram, dirección formateada, estado del embudo, fecha de primer contacto, fecha de último contacto, respuesta, indicador de reunión, fecha de reunión, valor potencial en ARS, estado del negocio, notas, fechas de creación, actualización, última actividad y caducidad TTL).
3. **`financial_transactions`**: Registro contable multi-unidad (unidad de negocio, tipo ingreso/egreso, recurrencia, monto, moneda, tipo de cambio a ARS, categoría, descripción, fecha de transacción, relación opcional con `lead_id`, nombre del sponsor para Alaynow, estado de cobro/pago).
4. **`schedule_blocks`**: Bloques semanales de time-blocking y eventos (título, categoría, día de la semana 0-6 o fecha específica, hora inicio, hora fin, indicador recurrente, ID externo de Google Calendar si aplica, color distintivo, estado de cumplimiento).
5. **`alaynow_videos`**: Pipeline editorial de YouTube (título, etapa de producción, fecha estimada de publicación, fecha real de publicación, marca patrocinadora, monto de patrocinio, moneda del patrocinio, enlace a guión/docs, enlace a miniatura, vistas acumuladas, CTR %, notas de producción).
6. **`habits`**: Catálogo de hábitos (título, pilar/categoría, frecuencia objetivo semanal, icono Lucide, color, estado activo).
7. **`habit_logs`**: Registros diarios de hábitos completados (relación con `habit_id`, fecha de completitud `YYYY-MM-DD`, notas breves).

#### C. Políticas RLS (Row Level Security):
- Habilitar RLS estricto en todas las 7 tablas.
- Crear una política restrictiva `auth.uid() = admin_id` o verificación contra `admin_profiles` donde solo el email autorizado del administrador tiene permisos `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- Cualquier petición con clave anónima sin sesión autenticada devolverá 0 filas.

### 3. Capa de Abstracción `LeadStore` y Scripts de Migración
- Se crea el script `scripts/migrate-sheets-to-supabase.mjs` que lee `'Prospección NexoBow'!B11:S1000` vía `LeadStore`, mapea las 18 columnas canónicas al esquema de la tabla `leads` y realiza un *upsert* idempotente por ID correlativo.
- Se actualiza el módulo `scripts/sheets-sync.mjs` para proporcionar un adaptador `createSupabaseLeadStore({ supabaseClient })` que implementa la misma interfaz canónica (`getAllLeads`, `getLeadById`, `appendLead`, `updateLead`, `deleteLead`), permitiendo que `scout-lead.mjs`, `lead-lifecycle.mjs` y `build-client-site.mjs` operen sobre Supabase sin romper sus contratos de prueba en memoria (`createMemoryLeadStore`).

### 4. Arquitectura de Componentes de la SPA en `/admin`
- `AdminApp.tsx`: Enrutador cliente y proveedor de contexto de autenticación y estado global.
- `AdminLayout.tsx`: Shell principal con sidebar colapsable, estado de sincronización en tiempo real y selector de módulos.
- `LoginView.tsx`: Pantalla de inicio de sesión sobria estilo Soft-Obsidian (email/password y botón de Magic Link).
- `views/CockpitView.tsx`: Vista ejecutiva de inicio (widgets de agenda de hoy, checklist de hábitos, alertas TTL de prospección, video actual y KPIs de finanzas).
- `views/CrmView.tsx`: Módulo de prospección con conmutador Kanban / Tabla, drawer lateral de edición de lead, acciones de WhatsApp y preview.
- `views/FinanceView.tsx`: Módulo financiero con filtros por unidad de negocio, selector de moneda, formulario de nueva transacción y gráficos de cashflow mensual.
- `views/ScheduleView.tsx`: Matriz horaria semanal interactiva con bloques de time-blocking y eventos de Google Calendar.
- `views/VideosView.tsx`: Tablero Kanban de producción de Alaynow con tarjetas de contenido, sponsors y estados.
- `views/HabitsView.tsx`: Panel de hábitos con selector diario y cuadrícula visual de consistencia (heatmap anual).
- `views/SettingsView.tsx`: Configuración de tokens, variables de entorno y estado de conexión con Supabase.

---

## Testing Decisions

### Seams (Puntos de Inserción para Pruebas)
Para mantener la arquitectura desacoplada y verificar la fiabilidad del sistema antes de tocar entornos reales, se definen dos costuras (*seams*) principales:

1. **Seam de Datos (`LeadStore` / `DataStore` Adapter)**:
   - Toda interacción con la base de datos pasa por una interfaz tipada.
   - Para las pruebas unitarias y de integración de scripts y servicios, se utiliza una implementación en memoria (`createMemoryDataStore`) que emula las tablas relacionales de Supabase, validando operaciones CRUD, filtros y lógica de negocio sin conexión a internet ni consumo de cuota.

2. **Seam de Lógica de Negocio y Formateo**:
   - Cálculos financieros (conversión ARS/USD, márgenes netos, agregaciones por unidad de negocio).
   - Generación de links de WhatsApp y expiración de TTL de 7 días.
   - Cálculo de rachas de hábitos (*current & max streak*).
   - Cada una de estas funciones puras se prueba de forma aislada mediante la suite nativa `node:test` (`tests/*.test.mjs`).

### Prior Art en el Repositorio
- Las pruebas existentes en `tests/sheets-sync.test.mjs` y `tests/lead-lifecycle.test.mjs` sirven como estándar directo: pruebas rápidas, deterministas y con cero dependencias externas.
- La verificación de compilación se asegura mediante `npm run build` en `web/` asegurando que no existan errores de tipos de TypeScript ni de empaquetado de Tailwind.

---

## Out of Scope

1. **Gestión Multiusuario o Roles Complejos**: El panel está concebido exclusivamente como centro de mando personal para el fundador (1 solo usuario administrador con control total). No se implementará sistema de permisos jerárquicos ni multi-tenancy.
2. **Pasarela de Cobros Automatizada dentro de `/admin`**: El panel registra y concilia transacciones comerciales, pero no procesará cargos automáticos a tarjetas de crédito ni interactuará con APIs de Stripe/MercadoPago en esta fase (los pagos se gestionan externamente y se asientan en el módulo de Finanzas).
3. **Editor de Video o Renderizado en la Nube**: El módulo de videos es estrictamente de gestión editorial, patrocinadores y seguimiento de métricas, no una herramienta de edición ni de subida automática a la API de YouTube.

---

## Further Notes

- **Variables de Entorno Requeridas (`web/.env` y Cloudflare Pages)**:
  - `PUBLIC_SUPABASE_URL`: Endpoint HTTPS del proyecto de Supabase.
  - `PUBLIC_SUPABASE_ANON_KEY`: Clave pública para autenticación en cliente con RLS.
  - `ADMIN_OWNER_EMAIL`: Dirección de correo autorizada para inicio de sesión único.
- **Persistencia y Compatibilidad**: El script de migración conservará los identificadores enteros originales de la Columna B de Google Sheets para mantener la correlatividad 1:1 con las carpetas y fichas existentes en `/clients/` y `/sites/`.
