# 57: robots.txt, Blindaje Cibernético Perimetral & Auditoría Final E2E (Cierre Frente H)

**What to build:** La superficie pública y los endpoints serverless de `nexobow.site` operan endurecidos frente a ataques comunes y rastreo indebido: `web/public/robots.txt` guía a los buscadores hacia `/`, `/terminos/` y `/privacidad/`, bloquea `/admin/`, `/api/`, `/solicitud-enviada/` y `/baja-email/` y referencia `https://nexobow.site/sitemap.xml`; `web/public/_headers` instruye a Cloudflare Pages a servir cabeceras HTTP estrictas (`Content-Security-Policy` restrictiva compatible con Supabase `/admin` y GA4 únicamente desde `googletagmanager.com`/`google-analytics.com`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, más `Cache-Control: no-store` y `X-Robots-Tag: noindex, nofollow` sobre `/admin/*` y `/api/*`); todas las rutas privadas (`admin/[...all].astro`, `solicitud-enviada.astro`, `baja-email.astro`) llevan `<meta name="robots" content="noindex, nofollow" />`. En los endpoints y transportes, `/api/ping` reemplaza `Access-Control-Allow-Origin: *` por una allowlist dinámica verificando `Origin` (`https://nexobow.site`, `https://www.nexobow.site`, `https://preview.nexobow.site`, `*.pages.dev` de preview y dominios propios verificados) + `Vary: Origin`, limita cuerpo `<= 2 KB` (HTTP `413`) y acota `meta.theme` / `meta.ctaLabel` (`<= 80` chars); `/api/v1/bow-system/create` impone límite `<= 8 KB` (HTTP `413`), verifica honeypot `website_confirm === ""`, exige esquema `https://` / `http://` en `maps_url` (bloqueando `javascript:`, `data:`, `vbscript:`), sanitiza caracteres de control/HTML anti-XSS antes de persistir o renderizar correos, y elimina URLs de Supabase hardcodeadas o fallback silencioso a `PUBLIC_SUPABASE_ANON_KEY`; `/api/unsubscribe` rechaza tokens alterados/expirados sin filtrar detalles internos; y `scripts/send-zoho-outreach.mjs` sanitiza `\r` y `\n` en cabeceras SMTP (`to`, `subject`, `replyTo`, `fromName`) contra inyección CRLF. Se entrega el runbook operativo Cloudflare Dashboard WAF (`docs/security-hardening-checklist.md`) y se cierra el Frente H con la regresión total (`npm test`, `npm --prefix web run build`, `audit-site.mjs web`, `impeccable detect`) y actualización de `tickets.md`, `memory.md` y `brain.md`.

**Puntos cubiertos de `spec-final-polish.md`:** Puntos **18** y **19** (Pilar 5 completo) + verificación integral de los 20 puntos del spec.

**Blocked by:**
- 54: Marco Legal (`/terminos/`, `/privacidad/`), Banner de Cookies + GA4 Condicional, SEO de Intención Real, Search Console & Google Business Profile
- 55: UX "Diagram-First" para +40 Años, Capturas Reales de Casos de Éxito & Humanización Total (Cero "Silla Vacía")
- 56: Inbound Preview End-to-End, Checkbox T&C Sin Marcar, Zoho Mail + Resend, Enlace de Baja HMAC & ElevenLabs MCP Starter

**Blocks:** None (cierra el Frente H y deja `nexobow.site` listo para lanzamiento productivo).

**Status:** done

## Archivos a Crear o Modificar

### Crear
- `web/public/robots.txt` (`Allow: /`, `/terminos/`, `/privacidad/`; `Disallow: /admin/`, `/api/`, `/solicitud-enviada/`, `/baja-email/`; `Sitemap: https://nexobow.site/sitemap.xml`)
- `web/public/_headers` (CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, más `Cache-Control: no-store` y `X-Robots-Tag: noindex, nofollow` en `/admin/*` y `/api/*`)
- `docs/security-hardening-checklist.md` (runbook Cloudflare Dashboard WAF gratuito: Bot Fight Mode, Rate Limiting por IP en `/api/v1/bow-system/create` y `/api/ping`, Turnstile progresivo opcional, rotación de secretos y puente hacia hardening DB/Admin)

### Modificar
- `web/functions/api/ping.ts` (reemplazar CORS `*` por allowlist dinámica de orígenes permitidos + `Vary: Origin` rechazando orígenes no autorizados con HTTP `403`, límite de cuerpo `<= 2 KB` HTTP `413`, acotamiento `meta.theme` y `meta.ctaLabel <= 80` chars, y eliminación de URL de Supabase hardcodeada)
- `web/functions/api/v1/bow-system/create.ts` (límite de payload `<= 8 KB` HTTP `413`, verificación honeypot `website_confirm === ""`, validación de esquema `https://`/`http://` en `maps_url` rechazando `javascript:`/`data:`/`vbscript:`, acotamiento de longitud por campo, sanitización anti-XSS en almacenamiento/correos, y eliminación de URL Supabase hardcodeada / fallback silencioso a `PUBLIC_SUPABASE_ANON_KEY`)
- `web/functions/api/unsubscribe.ts` (asegurar rechazo limpio HTTP `400`/`403` ante tokens alterados o expirados y cabecera `Cache-Control: no-store`)
- `scripts/send-zoho-outreach.mjs` (función pura exportada de sanitización SMTP eliminando `\r` y `\n` de `to`, `subject`, `replyTo` y `fromName` contra inyección CRLF)
- `web/src/pages/admin/[...all].astro`, `web/src/pages/solicitud-enviada.astro`, `web/src/pages/baja-email.astro` (confirmar `<meta name="robots" content="noindex, nofollow" />` en las 3 rutas)
- `tests/inbound-security.test.mjs`, `tests/preview-telemetry.test.mjs`, `tests/email-unsubscribe.test.mjs`, `tests/legal-seo-cookies.test.mjs` (ampliar con todas las pruebas del Seam 5: allowlist `Origin` en `/api/ping`, HTTP `413` `> 8 KB` / `> 2 KB`, rechazo `javascript:` URLs, honeypot, sanitización XSS, tokens HMAC manipulados, neutralización `\r\n` SMTP Zoho, validación de `robots.txt` y `_headers` en `web/dist/`)
- `tickets.md`, `memory.md`, `brain.md` (marcar `#54`–`#57` como `done` y registrar el cierre del Frente H tras completar la implementación)

## Seams Under Test (`/tdd`)

- **Seam 5 (`Cybersecurity & API Perimeter Hardening Seam` + regresión completa Seams 1–5):**
  - *Qué atrapa:* Presencia exacta en `web/dist/` de `robots.txt` y `_headers` con todas las directivas de seguridad y rutas `noindex`; rechazo HTTP `403` para orígenes no permitidos y `Vary: Origin` en `/api/ping` (sin `Access-Control-Allow-Origin: *`); rechazo HTTP `413` ante payloads `> 8 KB` en `/api/v1/bow-system/create` y `> 2 KB` en `/api/ping`; rechazo de esquemas peligrosos (`javascript:`, `data:`, `vbscript:`) en `maps_url` y honeypot no vacío; rechazo de tokens HMAC alterados en `/api/unsubscribe`; neutralización de saltos `\r\n` en cabeceras SMTP de `send-zoho-outreach.mjs`; y regresión 100% verde de los Seams 1–5 + `audit-site.mjs web` + `impeccable detect`.
  - *Qué omite:* Evaluación en vivo de reglas WAF/Rate Limiting del plano de Cloudflare Edge en producción y escaneo DAST externo sobre el dominio desplegado.

## Acceptance Criteria

- [x] **[RED]** Ampliar `tests/inbound-security.test.mjs`, `tests/preview-telemetry.test.mjs`, `tests/email-unsubscribe.test.mjs` y `tests/legal-seo-cookies.test.mjs` con casos de prueba para Seam 5 (CORS allowlist `/api/ping`, HTTP `413`, `javascript:` URLs, honeypot, escape XSS, HMAC manipulado, CRLF en Zoho SMTP, `robots.txt` y `_headers`); confirmar que fallen antes de implementar.
- [x] **[GREEN]** Crear `web/public/robots.txt`, `web/public/_headers` y `docs/security-hardening-checklist.md`, y asegurar `<meta name="robots" content="noindex, nofollow" />` en `admin/[...all].astro`, `solicitud-enviada.astro` y `baja-email.astro`.
- [x] **[GREEN]** Endurecer `web/functions/api/ping.ts`, `web/functions/api/v1/bow-system/create.ts`, `web/functions/api/unsubscribe.ts` y `scripts/send-zoho-outreach.mjs` cumpliendo todas las validaciones de origen, tamaño, esquema, sanitización anti-XSS, CRLF y manejo seguro de variables de entorno Supabase.
- [x] **[GREEN]** Al cierre de la implementación, actualizar `tickets.md`, `memory.md` y `brain.md` documentando el cierre del Frente H (`#54`–`#57`).
- [x] **[VERIFY]** Ejecutar la suite completa (`npm test`), build de producción (`npm --prefix web run build`), auditoría técnica (`node scripts/audit-site.mjs web`) y filtro anti-mediocridad (`impeccable detect web/dist/index.html`) con 0 errores.

## Comando de Validación Exacto

```bash
node --test tests/inbound-security.test.mjs tests/preview-telemetry.test.mjs tests/email-unsubscribe.test.mjs tests/legal-seo-cookies.test.mjs && npm test && npm --prefix web run build && node scripts/audit-site.mjs web && .agents/skills/impeccable/scripts/impeccable detect web/dist/index.html
```
