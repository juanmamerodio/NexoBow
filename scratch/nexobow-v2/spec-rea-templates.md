# Especificación Técnica: Motor de Ingeniería Inversa de Templates (REA)
> Archivo: `.scratch/nexobow-v2/spec-rea-templates.md`  
> Estado: `BORRADOR APROBADO`  
> Referencia del flujo: `prompts_structure.md` (Fase 2: `/to-spec`)

---

## 1. Objetivo y Resumen Ejecutivo
Crear un flujo automatizado y ultra-fluido donde el usuario simplemente pasa una URL de referencia y el rubro/nicho en lenguaje natural en el chat (ej: *"Creá el template psicólogo con https://sitio-ejemplo.com"*). El agente ejecuta **REA (Reverse Engineering Architecture)**:
1. Inspecciona la URL objetivo (HTML, estilos CSS, paleta de colores dominante 60-30-10, tipografías display y de cuerpo, estructura de layout, espaciados y micro-interacciones).
2. Transforma la identidad visual en un nuevo template Astro inmutable en `templates/{rubro}/`.
3. Mantiene estrictamente el contrato desacoplado de datos `site.json` (`tema` + `content`), garantizando compatibilidad total con `build-client-site.mjs`, `generate-client-fiche.mjs` y `LeadStore`.
4. Genera automáticamente una demo de validación en `sites/demo-{rubro}/`, ejecuta la verificación de compilación y presupuesto de JS (`<= 35 KB`), y crea el tag git `template/{rubro}@1.0.0`.
5. Actualiza el catálogo en `web/src/config.ts` marcando el estilo como activo y enlazado.

---

## 2. Decisiones de Diseño Cerradas (Grilling Output)
1. **Interfaz de Usuario**: Activación directa en chat en lenguaje natural (cero fricción de parámetros manuales). El agente entiende la intención y extrae `<rubro>` y `<url>`.
2. **Contrato de Datos Inmutable**: `templates/{rubro}/src/site.json` mantiene la misma estructura que `templates/nutricionista/src/site.json` (`tema`: `primary`, `accent`, `fondo`, `tinta`, `fuente`, `fuente_sans`, `orden_secciones`; `content`: `hero`, `marquee`, `prestador`, `problema`, `pasos`, `reviews`, `casos`, `pricing`, `faq`, `cta`).
3. **Mapeo Tipográfico Abierto**: Si la web objetivo usa fuentes comerciales cerradas o de pago, el motor mapea automáticamente a fuentes de Google Fonts o fuentes abiertas equivalentes con cero costo de licencia y carga inmediata.
4. **Verificación y Tag Git**: Al terminar el ensamblaje, el flujo compila una demo en `sites/demo-{rubro}/`, audita el peso y la ausencia de scripts de terceros, y fija el tag git `template/{rubro}@1.0.0` para que quede inmediatamente listo para prospección.

---

## 3. Arquitectura del Flujo REA (Paso a Paso)

```text
[ Usuario: "Creá template {rubro} con {url}" ]
                      │
                      ▼
 1. Extracción & Análisis Estético (REA Engine)
    ├── Fetch de HTML y CSS de la URL objetivo
    ├── Detección de paleta 60-30-10 (fondo, texto, primario, acentos)
    ├── Identificación de familias tipográficas (Display / Sans)
    └── Extracción de arquetipos visuales (bordes, pills, sombras, layout)
                      │
                      ▼
 2. Andamiaje del Template (`templates/{rubro}/`)
    ├── Clonación de estructura base (Astro + Tailwind)
    ├── Reemplazo de componentes visuales (Hero, Problem, Steps, etc.)
    └── Inyección de tokens extraídos en `site.json`
                      │
                      ▼
 3. Verificación Automatizada & Build Demo
    ├── Compilación de `sites/demo-{rubro}/` con `build-client-site.mjs`
    ├── Auditoría técnica: build código 0 y presupuesto JS <= 35 KB
    └── Tests unitarios de orden y seams en `templates/{rubro}/tests/`
                      │
                      ▼
 4. Versionado & Disponibilidad en Catálogo
    ├── Creación del tag git: `template/{rubro}@1.0.0`
    └── Actualización del catálogo en `web/src/config.ts`
```

---

## 4. Archivos a Crear y Modificar
1. **Agent Skill**: `/.agents/skills/rea-template/SKILL.md` (SOP operativo paso a paso para ejecutar REA in-conversation).
2. **Script de Utilidad / Fetcher** (opcional para acelerar inspección de tokens): `scripts/rea-inspect.mjs` para extraer paleta de colores CSS y enlaces a tipografías de cualquier URL.
3. **Catálogo de Agencia**: `web/src/config.ts` (actualizar la lista de templates cuando se incorpora uno nuevo).
4. **Template Generado**: `templates/{rubro}/` (con su propio `site.json`, componentes adaptados, tests y `package.json`).

---

## 5. Criterios de Aceptación (Definición de Terminado)
- [ ] **CA-01 (Compatibilidad de Seam)**: `templates/{rubro}/src/site.json` respeta exactamente el esquema que consume `scripts/build-client-site.mjs`.
- [ ] **CA-02 (Diferenciación Visual / Anti ERROR-001)**: El template generado adopta la estética de la web de referencia (paleta, tipografías, layout) y NO hereda la identidad Soft-Obsidian de `web/`.
- [ ] **CA-03 (Presupuesto de Rendimiento)**: El build del template en `/sites/demo-{rubro}/` compila sin errores, no incluye scripts externos no declarados y su JS propio es `<= 35 KB`.
- [ ] **CA-04 (Inmutabilidad Git)**: Se crea el tag git `template/{rubro}@1.0.0`.
- [ ] **CA-05 (Pruebas Automatizadas)**: El template incluye sus tests unitarios en `templates/{rubro}/tests/` y `npm test` corre al 100% verde.
