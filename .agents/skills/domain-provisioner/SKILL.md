---
name: domain-provisioner
description: "Aprovisionamiento de dominios propios de clientes (.com.ar en NIC Argentina y .com) para Cloudflare Pages tras el pago. Genera registros DNS CNAME y verifica resolución y SSL."
tools: ["read_file", "execute_command"]
---

# 🌐 Domain Provisioner — Handoff Post-Venta Cloudflare Pages

## Propósito y Contexto
Esta skill automatiza el traspaso de la landing de un cliente desde la URL de preview efímera (`https://preview.nexobow.site/{slug}/`) hacia su dominio corporativo propio (`.com.ar` o `.com`) en Cloudflare Pages, una vez cerrado el pago del setup (`$189.999 ARS`).

Provee:
1. **Instrucciones DNS automáticas**: Diferenciadas para **NIC Argentina** (`.com.ar` vía CUIT/Clave Fiscal) o registradores internacionales (`.com`).
2. **Generación del comando Wrangler**: `npx wrangler pages project domain add nexobow-previews --domain <dominio>`.
3. **Verificación de propagación**: Comprueba si los CNAME ya apuntan a `nexobow-previews.pages.dev`.

## Requisitos Previos y Entradas
- Dominio elegido por el cliente (ej: `dramartinez.com.ar`, `estudioalbarracin.com`).
- Slug del cliente (ej: `22-alejandra-martinez-nutri`).
- Ejecutor CLI: `node scripts/domain-provisioner.mjs --domain <dominio> [--slug <slug>] [--check]`.

## Paso a Paso de Ejecución (SOP)

### 1. Generar Instrucciones para el Cliente / Operador
```bash
node scripts/domain-provisioner.mjs --domain "dramartinez.com.ar" --slug "22-alejandra-martinez-nutri"
```

### 2. Vincular el Dominio en Cloudflare Pages
Ejecutar el comando devuelto por el script:
```bash
npx wrangler pages project domain add nexobow-previews --domain dramartinez.com.ar
```

### 3. Verificar Propagación DNS
```bash
node scripts/domain-provisioner.mjs --domain "www.dramartinez.com.ar" --check
```

## Negaciones Explícitas (Qué NO hacer)
- **NO solicitar contraseñas de NIC Argentina al cliente**: Entregarle las instrucciones de CNAME o delegación para que las configure en su panel.
- **NO eliminar la preview hasta verificar el dominio**: Mantener `preview.nexobow.site/{slug}/` activo hasta que Cloudflare confirme SSL activo en el dominio personalizado.
