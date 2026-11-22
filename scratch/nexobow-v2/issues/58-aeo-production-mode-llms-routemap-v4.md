# 58: AEO (scripts/aeo-optimizer.mjs), --mode preview|production en build-client-site.mjs, web/public/llms.txt (0 JS) y routemap.md v4.0

**What to build:** Todo **prestador** que contrata Tier 1 (`$189.999 ARS` **setup** único + `$0 ARS/mes` Año 1) recibe su **clon** compilado en modo productivo limpio para dominio propio, mientras que `nexobow.site` publica su propio índice legible por asistentes de IA y actualiza su hoja de ruta comercial a v4.0 sin añadir JavaScript ejecutable en la web pública. Para lograrlo sin duplicar lógica en los 10 `/templates/*/`, se construye el módulo profundo offline `scripts/aeo-optimizer.mjs` (`RUBRO_SCHEMA_MAP`, `buildProviderJsonLd`, `buildProviderLlmsTxt`, `buildProviderRobotsTxt`, `injectAeoIntoHtml`) y se extiende `scripts/build-client-site.mjs` con `--mode preview|production` (manteniendo `preview` como valor predeterminado para preservar retrocompatibilidad), `--domain <dominio>` y `--out-dir <ruta>` opcional. Al compilar con `--mode production`, el orquestador exige un dominio propio válido (`--domain` o `fm.dominio_propio`, saliendo con código `2` si falta o es inválido), remueve el HUD `20%` únicamente sobre la copia efímera `sites/{slug}/src/pages/index.astro` mediante `stripPreviewHudFromIndexAstro` sin tocar `/templates/*/` ni requerir bumps de tags git, compila Astro con `--base /`, omite la inyección de `/api/ping`, inyecta `JSON-LD` específico por especialidad (`Dentist`, `MedicalClinic`, `Physician` / `MedicalBusiness`, `LegalService`, `ProfessionalService` + `FAQPage`), `<link rel="canonical">` y `<meta name="robots" content="index, follow" />`, emite `dist/llms.txt` y `dist/robots.txt`, y deja intactos `dist-previews/{slug}/` y la Columna G en `LeadStore`. En paralelo, se crea `web/public/llms.txt` (`0 JS`) con la propuesta de valor +40, planes vigentes, rubros y canal oficial de WhatsApp, y se actualiza `routemap.md` a **v4.0** separando Gate 0, Gate 1, Gate 2 y Fase 4 con lenguaje sobrio alineado al Ticket `#55`.

**Decisiones cubiertas de `spec-frente-i.md`:** Decisiones **Q1**, **Q3**, **Q5**, **Q10**, **Q12** · Sección **1** · **Seam 1** · **AC-01**, **AC-02**, **AC-03**, **AC-09**.

**Blocked by:** None (puede iniciarse de inmediato; Frente H `#54`–`#57` completados).

**Blocks:**
- 59: Motor de Reseñas 5★ (`review-booster.mjs`), Migración Supabase (`active_clients`, `autonomous_events`), `/admin/clients` (Entrega 72h, 6 Hitos), Promoción 1-Clic desde CRM, Alertas Cockpit & 8 Tablas
- 62: Endpoint `/api/v1/autonomous/ingest` (Sin PII), Panel Gate 1 en `/admin/settings`, Humanización Ampliada & Auditoría Final E2E (Cierre Frente I)

**Status:** done

## Archivos a Crear o Modificar

### Crear
- `scripts/aeo-optimizer.mjs` (módulo profundo 100% offline que exporta `RUBRO_SCHEMA_MAP`, `buildProviderJsonLd(siteData, options)`, `buildProviderLlmsTxt(siteData, options)`, `buildProviderRobotsTxt({ origin, allowIndexing })` e `injectAeoIntoHtml(html, { jsonLd, canonicalUrl, indexable })` para emitir `[EntitySchema, FAQPage]`, `/llms.txt` en español rioplatense claro, `robots.txt` condicional e inyección idempotente en `<head>` sin agregar JS ejecutable)
- `web/public/llms.txt` (archivo estático puro servido en `https://nexobow.site/llms.txt` con `0 JS`, detallando propuesta de valor +40, escalera de planes vigente — Starter `$189.999 ARS` con `$0/mes` Año 1, Autonomous `$549.999 ARS` + `$229.999 ARS/mes`, Growth Partner — rubros compatibles, enlaces a `/terminos/` y `/privacidad/` y canal oficial WhatsApp `+54 9 3489 53-6088`)
- `tests/aeo-production-mode.test.mjs` (suite TDD 100% offline para Seam 1 usando `acquireWebDistLock()` / `nexobow-web-dist.lock` al compilar `web/`)

### Modificar
- `scripts/build-client-site.mjs` (agregar flags `--mode preview|production`, `--domain <dominio>` y `--out-dir <ruta>` opcional; exportar `stripPreviewHudFromIndexAstro(source)` para limpiar `import ThemeSwitcher from "../components/ThemeSwitcher.astro";` y `<ThemeSwitcher />` exclusivamente en `sites/{slug}/src/pages/index.astro`; en `production`, exigir dominio válido o salir con código `2`, compilar con `--base /`, omitir `injectTelemetryIntoSiteDist`, invocar `scripts/aeo-optimizer.mjs` para escribir `JSON-LD` + `canonical` + `index, follow` + `dist/llms.txt` + `dist/robots.txt`, y no sobreescribir `dist-previews/{slug}/` ni pisar Columna G en `LeadStore`)
- `routemap.md` (actualizar a **v4.0** reorganizando en las 4 fases reales del negocio — **Fase 1 / Gate 0** `[COMPLETADO — Tickets #50–#57]`, **Fase 2 / Gate 1** `[Frente I — Tickets #58–#62: Bloque Tier 1 $0 + Blueprint VPS Offline 1 Comando]`, **Fase 3 / Gate 2** `[Out of Scope actual — Hermes, Obsidian Sync, Treg.to, Arbitraje]` y **Fase 4** `[Ads + Activos Digitales]` — y depurando todas las expresiones previas al Ticket `#55` prohibidas por la guardia de humanización +40)

## Seams Under Test (`/tdd`)

- **Seam 1 (`AEO Optimizer & Production Mode Build Seam` en `tests/aeo-production-mode.test.mjs`):**
  - *Qué atrapa:* Generación determinista de `JSON-LD` válido (`Dentist`, `MedicalClinic`, `Physician` / `MedicalBusiness`, `LegalService`, `ProfessionalService` + `FAQPage` desde `content.faq.items`), `/llms.txt` estructurado y `robots.txt` por modo; rechazo con código `2` cuando falta o es inválido `--domain` en `--mode production`; compilación real offline sobre una **ficha de cliente** demo (ej. `clients/demo-clinica.md`) con `--mode production --domain clinicaejemplo.com.ar --out-dir <tmp> --skip-sheets-sync` verificando `0` ocurrencias de `PROTOTIPO CONCEPTUAL`, `ThemeSwitcher` o `/api/ping`, presencia de `<link rel="canonical" href="https://clinicaejemplo.com.ar/">`, `JSON-LD` parseable, `dist/llms.txt`, `dist/robots.txt`, preservación intacta de `dist-previews/` y `templates/` (`git diff templates/` vacío), retrocompatibilidad íntegra de `--mode preview`, presencia de `web/dist/llms.txt` y `0` bytes de JS de negocio en `web/dist/index.html`.
  - *Qué omite:* Despliegue real a Cloudflare Pages y rastreo en vivo por bots externos de buscadores o modelos de IA.

## Acceptance Criteria

- [x] **[RED]** Crear `tests/aeo-production-mode.test.mjs` cubriendo los contratos de `scripts/aeo-optimizer.mjs`, `--mode production` vs `--mode preview` en `scripts/build-client-site.mjs`, compilación real de ficha demo sin HUD `20%` ni `/api/ping`, preservación de `templates/` y `dist-previews/`, existencia de `web/dist/llms.txt` y `0 JS` de negocio en `web/dist/index.html`; confirmar que la suite falla antes de implementar.
- [x] **[GREEN]** Implementar `scripts/aeo-optimizer.mjs` con `RUBRO_SCHEMA_MAP`, `buildProviderJsonLd`, `buildProviderLlmsTxt`, `buildProviderRobotsTxt` e `injectAeoIntoHtml` 100% offline.
- [x] **[GREEN]** Extender `scripts/build-client-site.mjs` con `--mode preview|production`, `--domain` y `--out-dir`, exportación de `stripPreviewHudFromIndexAstro`, compilación `--base /`, omisión de telemetría de preview, inyección AEO en `dist/index.html` + `dist/llms.txt` + `dist/robots.txt`, preservación de `dist-previews/{slug}/` y Columna G en `LeadStore`, y cero modificaciones en `/templates/*/`.
- [x] **[GREEN]** Crear `web/public/llms.txt` (`0 JS`) y actualizar `routemap.md` a **v4.0** separando Gate 0, Gate 1, Gate 2 y Fase 4 con lenguaje sobrio +40 sin ninguna de las frases prohibidas por el Ticket `#55`.
- [x] **[VERIFY]** Ejecutar el comando de validación exacto comprobando tests en verde, build limpio de `web/`, aprobación de `audit-site.mjs web` (`0 JS` negocio) y `git diff --exit-code templates/` sin cambios.

## Comando de Validación Exacto

```bash
node --test tests/aeo-production-mode.test.mjs tests/web-redesign.test.mjs tests/theme-switcher.test.mjs tests/preview-telemetry.test.mjs && npm --prefix web run build && node scripts/audit-site.mjs web && git diff --exit-code templates/
```
