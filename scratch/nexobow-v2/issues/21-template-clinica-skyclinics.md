# Ticket 21: Template #03 REA — SkyClinics Clínicas & Salud Quirúrgica (`architectural-prestige`)
> Archivo: `.scratch/nexobow-v2/issues/21-template-clinica-skyclinics.md`  
> Estado: `ready-for-agent`  
> Spec padre: `spec.md` / `ROUTEMAP.md`  
> URL Referencia: `https://skyclinics.al/`

---

## 1. Misión Core (Duplicación Integral REA)
Duplicar la web **ENTERA** de **SkyClinics** (`https://skyclinics.al/`) dentro de `templates/clinica/` para utilizarla como template maestro de clínicas médicas de alta complejidad, centros quirúrgicos, medicina estética avanzada y traumatología:
- **No es un re-skin de Delta Cafés ni un volcado del texto de SkyClinics en componentes heredados.** Es la clonación auténtica de la web de SkyClinics (su layout visual, estructura, navegación, animaciones, componentes médicos, objetos gráficos y elementos 3D/interactivos).
- **Copywriting desacoplado:** El texto del template se define mediante slots y el contrato `site.json` para que la IA/skill redacte e inyecte el copy específico de cada profesional médico o clínica.

## 2. Arquitectura Visual & Componentes Auténticos de SkyClinics
- **Atmósfera & Estilo:** Prestigio médico internacional, diseño arquitectónico espacioso, serenidad clínica, micro-interacciones suaves y jerarquía de bioseguridad.
- **Paleta 60-30-10:** Lienzo mineral piedra (`#e8e7e5`), Deep Forest Teal (`#003934`), Menta quirúrgico (`#1a9e8f`), y Slate Navy (`#0f172a`).
- **Tipografías (Mismas fuentes de la web o fallback similar):**
  - **Mismas fuentes originales de SkyClinics:** `Satoshi` (Display arquitectónico y UI de alta gama disponible en Fontshare) + `Inter` (Sans de lectura clínica clara).
  - **Fallback similar:** `Plus Jakarta Sans` / `General Sans` (misma proporción y peso geométrico de prestigio médico).
- **Componentes y Secciones Propias de SkyClinics:**
  - `Header.astro`: Navbar espaciosa con logotipo institucional, cruz médica sobria, selector de especialidades y botón prioritario de agendamiento.
  - `Hero.astro`: Composición asimétrica de prestigio médico con badges de acreditación internacional, estadísticas clínicas (horas de quirófano, tasa de éxito) y llamada a la acción hacia valoración inicial.
  - `SpecialtiesShowcase.astro`: Grid interactivo de especialidades quirúrgicas y médicas con fotografías clínicas y micro-hover.
  - `TechnologyDiagnostics.astro`: Módulo de diagnóstico 3D y tecnología de vanguardia (quirófanos inteligentes, tomografía digital, recuperación acelerada).
  - `MedicalTeam.astro`: Cuadro médico de directores y cirujanos con números de matrícula y credenciales.
  - `PatientJourney.astro`: Fases del tratamiento desde la valoración inicial hasta el alta médica y seguimiento postoperatorio.
  - `FacilitiesShowcase.astro`: Galería de instalaciones de alta gama y quirófanos certificados.
  - `ClinicalReviews.astro`: Testimonios y casos de recuperación con consentimientos y validación médica.
  - `BookingScheduler.astro`: Bloque de agendamiento de consulta diagnóstica presencial o telemedicina con fallback a WhatsApp.
  - `Footer.astro`: Pie de página clínico con cumplimiento normativo y legal (Ley 25.326).
- **ThemeSwitcher.astro:** Selector flotante anti-rebote con 4 paletas en vivo y enlace directo a WhatsApp.
- **Política de JS:** Sin límite artificial de 35 KB; se admiten las animaciones y micro-interacciones de SkyClinics respetando únicamente las restricciones de Cloudflare Pages (25 MB).

## 3. Criterios de Aceptación
- [ ] `templates/clinica/` contiene la web ENTERA duplicada de SkyClinics mediante REA con sus propios componentes.
- [ ] Tipografía: utiliza las fuentes exactas de la web a copiar (`Satoshi` + `Inter`) o fallback visualmente similar verificado (`Plus Jakarta Sans` / `General Sans`).
- [ ] `site.json` desacopla el copy y permite la inyección de cualquier cliente médico/clínico.
- [ ] Compila la demo oficial en `sites/demo-clinica/` con código de salida 0.
- [ ] Tests unitarios en `templates/clinica/tests/` 100% pasando.
- [ ] Tags git inmutables `template/clinica@1.0.0` y `template/architectural-prestige@1.0.0` fijados.
