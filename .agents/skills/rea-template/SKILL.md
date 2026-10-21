---
name: rea-template
description: "Motor de Ingeniería Inversa de Templates (REA): toma una URL de referencia y un rubro en lenguaje natural, extrae la paleta 60-30-10, tipografías y arquetipos visuales, crea un nuevo template Astro inmutable en /templates/{rubro}/ con contrato site.json desacoplado, genera la demo en /sites/demo-{rubro}/, audita presupuesto JS (<= 35 KB) y fija el tag git template/{rubro}@1.0.0."
tools: ["read_file", "write_to_file", "execute_command", "read_url_content"]
---

# 🎨 REA Template — Motor de Ingeniería Inversa de Templates

## Propósito y Contexto

Permite expandir el catálogo de NexoBow a las **+10 direcciones estéticas por rubro** de forma industrializada y sin fricción manual. Cuando el usuario pasa en lenguaje natural una URL de referencia y un rubro (ej: *"Creá el template psicólogo con https://sitio-ejemplo.com"*), esta skill ejecuta el protocolo **REA (Reverse Engineering Architecture)**:
1. Inspecciona la identidad visual de la web de referencia (colores dominantes 60-30-10, tipografías, layout, espaciados).
2. Construye un nuevo template Astro inmutable en `/templates/{rubro}/` desacoplado bajo el contrato `site.json`.
3. Compila y audita la demo en `/sites/demo-{rubro}/` con presupuesto de JS propio `<= 35 KB` y cero scripts de terceros.
4. Fija el tag git `template/{rubro}@1.0.0` y actualiza el catálogo en `web/src/config.ts`.

## Requisitos Previos y Entradas

- **URL de referencia:** enlace HTTP/HTTPS público con diseño inspirador o representativo del rubro.
- **Rubro / Vertical:** slug normalizado (ej: `psicologo`, `abogado`, `clinica-estetica`, `odontologo`, `kinesiologo`, `pediatra`, `arquitecto`, `contador`, `veterinario`).
- **Comando de inspección o chat directo:** `node scripts/rea-inspect.mjs <url> [rubro]` o invocación en conversación.

## Paso a Paso de Ejecución (SOP)

1. **Extracción & Análisis Estético (Inspección REA):**
   - Obtener el HTML y CSS de la URL objetivo (usando `read_url_content` o `scripts/rea-inspect.mjs`).
   - Identificar la paleta armónica **60-30-10**:
     - `fondo` (60%): color de lienzo base (claro, crema, sepia o neutro según el estilo).
     - `tinta` / secundario (30%): color de texto principal y fondos de tarjetas/secciones alternadas.
     - `primary` y `accent` (10%): color de botones de acción (CTA) y acentos de conversión.
   - Detectar familias tipográficas:
     - `fuente`: tipografía display/títulos (Serif elegante, Sans geométrica o Display editorial).
     - `fuente_sans`: tipografía de lectura y cuerpo.
     - *Regla de fuentes abiertas:* si la web usa fuentes cerradas de pago, mapear automáticamente a alternativas libres en Google Fonts de idéntica métrica y peso.
   - Analizar arquetipos de UI: curvatura de bordes (`rounded-none`, `rounded-xl`, `rounded-full`), sombras, densidad de espaciados y estilo de botones.

2. **Andamiaje del Template (`/templates/{rubro}/`):**
   - Crear el directorio `/templates/{rubro}/` clonando el andamiaje Astro desacoplado.
   - Configurar `templates/{rubro}/src/site.json` respetando rigurosamente el contrato inmutable:
     - Bloque `tema`: `primary`, `accent`, `fondo`, `tinta`, `fuente`, `fuente_sans`, `orden_secciones`.
     - Bloque `content`: `hero`, `marquee`, `prestador`, `problema`, `pasos`, `reviews`, `casos`, `pricing`, `faq`, `cta`.
   - Adaptar los componentes de presentación en `templates/{rubro}/src/components/` para reflejar la personalidad visual del nicho (ej: layout cálido y acogedor para psicología, minimalista y clínico para estética, estructurado y sobrio para abogacía).
   - Generar la suite de tests unitarios en `templates/{rubro}/tests/` verificando `site.json`, orden de secciones y compatibilidad con el motor de inyección.

3. **Verificación Automatizada & Build Demo:**
   - Crear la ficha de demo en `/clients/demo-{rubro}.md` con datos sintéticos verosímiles en voseo argentino profesional.
   - Compilar el clon de demo ejecutando:
     ```bash
     npm run build-site clients/demo-{rubro}.md
     ```
   - Auditar el sitio generado en `/sites/demo-{rubro}/` corriendo:
     ```bash
     npm run audit-site sites/demo-{rubro}
     ```
   - Verificar:
     - Cero errores de compilación Astro (SSG puro).
     - Cero scripts de terceros no declarados.
     - Presupuesto de JS propio `<= 35 KB`.
     - Contrastes accesibles en botones y textos.

4. **Versionado Inmutable Git & Disponibilidad en Catálogo:**
   - Crear el tag git correspondiente para congelar la versión del template:
     ```bash
     git tag template/{rubro}@1.0.0
     ```
   - Actualizar el catálogo de templates en `web/src/config.ts`:
     - Marcar el rubro como implementado/activo (`active: true`).
     - Enlazar la URL de demo pública (`https://preview.nexobow.site/demo-{rubro}/`).
   - Ejecutar la suite completa de pruebas:
     ```bash
     npm test
     ```

## Negaciones Explícitas (Qué NO hacer)

- **PROHIBIDO** copiar componentes o estilos de `web/` a `/templates/{rubro}/` (Violación de `ERROR-001`: la identidad Soft-Obsidian ejecutiva es exclusiva de la agencia NexoBow; cada rubro debe tener su identidad visual distintiva).
- **PROHIBIDO** alterar o romper el esquema de datos en `site.json` (`tema` + `content`), ya que causaría fallos en `scripts/build-client-site.mjs`, `generate-client-fiche.mjs` y `LeadStore`.
- **PROHIBIDO** incluir dependencias comerciales o fuentes privadas con licencias de pago; utilizar siempre alternativas libres con carga vía Google Fonts.
- **PROHIBIDO** superar el presupuesto de JS propio de `35 KB` en las landings generadas ni incluir scripts de telemetría de terceros no declarados.
- **PROHIBIDO** crear o desplegar un template sin su tag git inmutable `template/{rubro}@1.0.0` y su suite de tests unitarios verde.

## Salidas

- Nuevo template inmutable en `/templates/{rubro}/` con su propio `site.json` y suite de tests.
- Demo funcional compilada en `/sites/demo-{rubro}/` y accesible en `https://preview.nexobow.site/demo-{rubro}/`.
- Tag git inmutable `template/{rubro}@1.0.0`.
- Entrada activada en el catálogo de `web/src/config.ts`.
