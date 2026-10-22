# SPEC — Template #02: Abogado & Estudio Jurídico (`templates/abogado/` / Arquetipo `obsidian-authority`)

## 1. Contexto & Diagnóstico
- **Referencia de Ingeniería Inversa (REA):** Kümmerlein Rechtsanwälte & Notare (`https://www.kuemmerlein.de/`).
- **Arquetipo Visual:** `obsidian-authority` (alias funcional `abogado`).
- **Enfoque:** Arquitectura editorial alemana adaptada a Dark Executive de alta sobriedad y prestigio para estudios jurídicos, abogados corporativos, litigantes y consultoría legal B2B/B2C en voseo argentino profesional.
- **Contrato Maestro:** Cumple con la arquitectura de desacoplamiento de datos `site.json` (`tema` + `paletas_alternativas` + `content`), preservando la inmutabilidad y la retrocompatibilidad con `build-client-site.mjs` y `LeadStore`.

---

## 2. Dirección de Arte & Tokens de Diseño (60-30-10)
- **Modo Predeterminado:** Dark Executive con acento oro/amarillo alemán Kümmerlein.
  - `fondo` (60%): `#090D16` (Deep Obsidian / Noche ejecutiva).
  - `tinta` (30%): `#F1F5F9` (Slate 100 de alta legibilidad sobre fondos oscuros).
  - `primary` (10%): `#D97706` (Amber Gold / Acento de autoridad y conversión).
  - `accent`: `#F7F788` (Amarillo insignia Kümmerlein para microdetalles y badges).
- **Tipografía Abierta:**
  - `fuente` (Display / Encabezados): `Archivo` (Sans geométrica de autor que emula Monument Grotesk).
  - `fuente_sans` (Lectura / Párrafos): `Inter` / `Archivo` (densidad editorial alemana).
- **Theme Switcher Anti-Rebote:**
  - 4 paletas precalibradas:
    1. *Obsidian Authority* (Default): `#090D16` / `#F1F5F9` / `#D97706` / `#F7F788`
    2. *Kümmerlein Classic* (Lienzo claro original): `#f6f6f4` / `#000000` / `#003388` / `#f7f788`
    3. *Editorial Navy*: `#0B132B` / `#F8FAFC` / `#3A86FF` / `#60A5FA`
    4. *Minimalist Carbon*: `#18181B` / `#FFFFFF` / `#71717A` / `#E4E4E7`

---

## 3. Estructura de Secciones (`site.json`)
1. **Hero:** Cabecera con propuesta de valor clara (*"Resolución legal estratégica sin dilaciones ni incertidumbre"*), credenciales y tarjeta de agendamiento directo.
2. **Problem (El Costo del Conflicto):** Exposición de los 3 dolores críticos Hormozi legales (litigios estancados, cláusulas contractuales riesgosas, falta de respuesta y honorarios opacos).
3. **Practice Areas / Specialties:** Enfoque en áreas clave (Derecho Corporativo, Laboral, Litigios Complejos y Asesoramiento Preventivo).
4. **Steps (Proceso de Trabajo):** Metodología de 3 pasos (01. Evaluación de Viabilidad, 02. Plan de Acción y Contingencia, 03. Ejecución Jurídica).
5. **Reviews & Social Proof:** Testimonios y métricas de resolución con cumplimiento ético y Ley 25.326.
6. **Pricing / Consulta Inicial:** Consulta diagnóstica inicial sin cargo o arancelada con garantía de claridad total en honorarios.
7. **FAQ:** Acordeones `<details>` con respuestas transparentes sobre plazos, modalidad online/presencial y confidencialidad (secreto profesional).
8. **Final CTA & Footer:** Cierre con botón directo a WhatsApp y enlace de reserva de llamada diagnóstica.

---

## 4. Criterios de Aceptación (TDD & Build)
- [ ] **AC-01:** Directorio `templates/abogado/` contiene proyecto Astro autónomo y desacoplado con su `src/site.json`.
- [ ] **AC-02:** Los scripts `resolveTemplateArchetype` y `resolveTemplateSourceDirectory` resuelven tanto `abogado` como `obsidian-authority`.
- [ ] **AC-03:** Presupuesto de JS en cliente `<= 35 KB` (ThemeSwitcher ~2.5 KB, 0 scripts de terceros).
- [ ] **AC-04:** Ficha demo `clients/demo-abogado.md` creada con datos verosímiles en voseo argentino y compilada en `sites/demo-abogado/`.
- [ ] **AC-05:** Auditoría `npm run audit-site sites/demo-abogado` pasa con 0 errores y contrastes accesibles.
- [ ] **AC-06:** Tag git inmutable fijado: `template/abogado@1.0.0` y alias `template/obsidian-authority@1.0.0`.
- [ ] **AC-07:** Catálogo en `web/src/config.ts` actualizado para el Template 02/04 con estado activo.
