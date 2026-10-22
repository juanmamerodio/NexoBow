---
name: screenshot-qa
description: "Auditoría visual automatizada dual-viewport con Playwright (375px móvil y 1440px desktop). Detecta desborde horizontal (overflow-x), layout shifts y guarda evidencia en .reports/screenshots/{slug}/."
tools: ["read_file", "execute_command"]
---

# 📸 Screenshot QA — Auditoría Visual Dual-Viewport con Playwright

## Propósito y Contexto
Esta skill garantiza que ninguna landing de prospecto o cliente se envíe a WhatsApp con errores visuales, textos truncados o desborde horizontal (`overflow-x`).
Valida dos anchos de pantalla fundamentales:
1. **Móvil (`375 x 812`)**: Representa la experiencia real de WhatsApp en smartphones compactos. Si `scrollWidth > innerWidth`, el sitio falla la auditoría.
2. **Desktop (`1440 x 900`)**: Pantalla de escritorio ejecutiva para profesionales que abren el enlace desde su consultorio o estudio.

Las capturas de pantalla completa se almacenan en `.reports/screenshots/{slug}/` para auditoría fotográfica inmediata.

## Requisitos Previos y Entradas
- Slug del prospecto o demo (ej: `demo-clinica`, `20-martin-albarracin-abogado`).
- URL de la preview (opcional; por defecto consulta `https://preview.nexobow.site/{slug}/`).
- Ejecutor CLI: `node scripts/screenshot-qa.mjs <slug> [url]`.

## Paso a Paso de Ejecución (SOP)

### 1. Ejecutar Auditoría Visual
```bash
node scripts/screenshot-qa.mjs 20-martin-albarracin-abogado
```

### 2. Interpretación de Resultados
- **`✅ LIMPIO (0 overflow)`**: La landing no tiene scroll horizontal no deseado y cumple el estándar de maquetación responsiva.
- **`❌ DESBORDE: +Xpx`**: Existe un elemento CSS que desborda el viewport. Debe corregirse antes de enviar el link al cliente (utilizar `impeccable detect` y `polish` para corregir márgenes o anchos rotos).

### 3. Evidencia Generada
- `.reports/screenshots/{slug}/mobile.png` (vista completa móvil)
- `.reports/screenshots/{slug}/desktop.png` (vista completa escritorio)

## Negaciones Explícitas (Qué NO hacer)
- **NO enviar previews con desborde horizontal**: Si el móvil tiene desborde, se debe ajustar el CSS antes del contacto comercial.
- **NO bloquear builds locales si Playwright no está instalado**: El script reporta el diagnóstico defensivamente sin romper CI/CD.
