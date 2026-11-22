# Checklist Operativo de Seguridad y WAF Perimetral — NexoBow

Guía de configuración en **Cloudflare Dashboard (Plan Free)**, verificación de credenciales y control de superficie para `nexobow.site`, `preview.nexobow.site` y el Cockpit `/admin`.

---

## 1. Controles Activos en el Repositorio

- **`web/public/robots.txt`**: habilita rastreo sobre `/`, `/terminos/` y `/privacidad/`; bloquea `/admin/`, `/api/`, `/solicitud-enviada/` y `/baja-email/`; apunta a `https://nexobow.site/sitemap.xml`.
- **Etiquetas `<meta name="robots" content="noindex, nofollow" />`**: verificadas en `/admin/*`, `/solicitud-enviada/` y `/baja-email/`.
- **`web/public/_headers`**: aplica `Content-Security-Policy` restrictiva (compatible con `/admin` en Supabase y GA4 únicamente desde `googletagmanager.com` / `google-analytics.com`, con `object-src 'none'`, `base-uri 'self'` y `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy`, más `Cache-Control: no-store` y `X-Robots-Tag: noindex, nofollow` sobre `/admin/*` y `/api/*`.
- **Endpoints y transporte endurecidos**:
  - `POST /api/ping`: allowlist dinámica de `Origin` (`Vary: Origin`, HTTP `403` a orígenes externos, sin `*`), límite `<= 2 KB` (`413`), acotamiento `meta.theme` / `meta.ctaLabel` (`<= 80` caracteres) y validación sin URL Supabase hardcodeada ni fallback a clave anónima.
  - `POST /api/v1/bow-system/create`: límite `<= 8 KB` (`413`), campo trampa `website_confirm === ""`, validación de T&C (`accept_terms`), rechazo de esquemas peligrosos en `maps_url` (`javascript:`, `data:`, `vbscript:`, `file:`), saneamiento anti-XSS de entradas, alerta interna independiente de `UNSUBSCRIBE_SECRET` y exigencia de `SUPABASE_SERVICE_ROLE_KEY`.
  - `/api/unsubscribe` y `POST /api/v1/email/send-preview`: falla cerrada (`CF_PAGES === "1"` sin `UNSUBSCRIBE_SECRET`), rechazo limpio `400`/`403` con `Cache-Control: no-store`, comparación en tiempo constante (`constantTimeEqual`) y bloqueo `skipped_unsubscribed`.
  - `scripts/send-zoho-outreach.mjs`: saneamiento contra inyección CRLF (`\r`/`\n`) en cabeceras SMTP (`to`, `subject`, `replyTo`, `fromName`, `headers`).
  - Dominios propios verificados de clientes que envían telemetría pueden autorizarse mediante `PING_ALLOWED_ORIGINS` (lista separada por comas en variables de entorno de Cloudflare Pages).

---

## 2. Reglas de Cloudflare Dashboard (Plan Gratuito)

Configurar en el panel de la zona `nexobow.site`:

### 2.1 Bot Fight Mode
1. Ir a **Security → Bots**.
2. Activar **Bot Fight Mode** en `On` para frenar bots automatizados conocidos antes de que consuman cuota de Pages Functions.
3. Verificar que no bloquee rastreadores legítimos de Google (`Googlebot`) ni webhooks propios.

### 2.2 Rate Limiting por IP (WAF Free)
1. Ir a **Security → WAF → Rate limiting rules** y crear reglas de protección por IP:
   - **Regla 1 — Formulario Inbound (`/api/v1/bow-system/create`)**:
     - Condición: `http.request.method eq "POST"` y `http.request.uri.path eq "/api/v1/bow-system/create"`.
     - Umbral: `5` solicitudes cada `10 minutes` (o el período permitido por el plan Free, ej. `10 seconds` / `1 minute` ajustado a `3 req / 1 min` según disponibilidad de la cuenta) por dirección IP (`ip.src`).
     - Acción: **Block** (o Managed Challenge) durante el intervalo mínimo disponible.
   - **Regla 2 — Telemetría de Previews (`/api/ping`)**:
     - Condición: `http.request.method eq "POST"` y `http.request.uri.path eq "/api/ping"`.
     - Umbral: `60` solicitudes por `1 minute` por IP.
     - Acción: **Block**.
   - **Regla 3 — Entrega Email & Baja (`/api/v1/email/send-preview` y `/api/unsubscribe`)**:
     - Condición: `http.request.uri.path in {"/api/v1/email/send-preview" "/api/unsubscribe"}`.
     - Umbral: `15` solicitudes por `1 minute` por IP para prevenir abuso o fuerza bruta sobre el endpoint administrativo.

### 2.3 Cloudflare Turnstile Progresivo (Opcional)
- **Por defecto (`0 JS`)**: la página pública principal opera sin scripts de terceros ni captcha gracias al honeypot `website_confirm`, la casilla obligatoria `accept_terms`, la validación estricta en servidor y las reglas de Rate Limiting en Cloudflare.
- **Activación progresiva**: si se observa spam automatizado que supere el Rate Limiting por IP, crear un widget **Turnstile (Invisible / Managed)** para `nexobow.site`, exponer únicamente la Site Key pública y validar el token `cf-turnstile-response` en `POST /api/v1/bow-system/create` usando la clave privada del servidor en Cloudflare Pages.

### 2.4 Cifrado TLS y Redirecciones
1. **SSL/TLS → Overview**: fijar modo **Full (strict)**.
2. **SSL/TLS → Edge Certificates**: activar **Always Use HTTPS**, **Automatic HTTPS Rewrites** y **HSTS** coherente con `web/public/_headers` (`max-age=31536000; includeSubDomains; preload`).

---

## 3. Inventario y Rotación de Credenciales / Claves Privadas

### Separación estricta Cliente vs. Worker
| Variable | Visibilidad | Dónde vive | Uso |
| :--- | :--- | :--- | :--- |
| `PUBLIC_SUPABASE_URL` | Pública | Build / Pages | URL base del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Pública (protegida por RLS) | Build `/admin` | Login y consultas autenticadas del propietario |
| `PUBLIC_GA_MEASUREMENT_ID` | Pública | Build `web/` | Cargador condicional GA4 tras consentimiento |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Pública | Build `web/` | Meta verificación Google Search Console |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privada (solo servidor)** | Cloudflare Pages Encrypted Env / `.env` local | Escritura/lectura privilegiada en `/api/*` y scripts CLI |
| `RESEND_API_KEY` | **Privada (solo servidor)** | Cloudflare Pages Encrypted Env / `.env` local | Envío de alertas y confirmaciones inbound |
| `UNSUBSCRIBE_SECRET` | **Privada (solo servidor)** | Cloudflare Pages Encrypted Env / `.env` local | Firma HMAC-SHA256 de tokens de baja |
| `ADMIN_API_SECRET` | **Privada (solo servidor)** | Cloudflare Pages Encrypted Env | Autorización programática de `/api/v1/email/send-preview` |
| `ZOHO_SMTP_PASS` | **Privada (solo servidor)** | `.env` local | App Password SMTP de Zoho Mail |
| `ELEVENLABS_API_KEY` | **Privada (solo servidor)** | `.env` local / config MCP | Generación de notas de voz de 35s |

### Procedimiento de Rotación (cada 90 días o ante incidente)
1. Generar la nueva clave en el proveedor correspondiente (Supabase Dashboard, Resend, Zoho App Passwords, ElevenLabs o `openssl rand -hex 32` para `UNSUBSCRIBE_SECRET` y `ADMIN_API_SECRET`).
2. Actualizar la variable encriptada en **Cloudflare Pages → Settings → Environment variables** (Production y Preview) y en `.env` local sin subirla a git.
3. Si se rota `UNSUBSCRIBE_SECRET`, planificar transición considerando que los enlaces de baja emitidos previamente dejan de validar con la clave anterior.
4. Ejecutar un nuevo deploy de Pages Functions para que los Workers tomen las nuevas credenciales y revocar la credencial anterior en el proveedor.

---

## 4. Puente hacia Hardening de Base de Datos & Verificación Post-Deploy

### Auditoría de RLS y exposición en bundle cliente
1. Verificar en Supabase SQL Editor que todas las tablas administrativas (`admin_profiles`, `leads`, `financial_transactions`, `schedule_blocks`, `alaynow_videos`, `habits`, `habit_logs`) tengan `ROW LEVEL SECURITY` habilitado y restringido mediante `is_admin_owner()`.
2. Confirmar que el bundle React de `/admin` no incluya nunca credenciales de servidor:
   ```bash
   grep -rn "SUPABASE_SERVICE_ROLE_KEY\|RESEND_API_KEY\|UNSUBSCRIBE_SECRET\|ADMIN_API_SECRET" web/dist/ || echo "Limpio"
   ```

### Verificación HTTP en vivo tras cada despliegue
```bash
# Cabeceras perimetrales de seguridad en raíz
curl -sI https://nexobow.site/

# Cabeceras no-store y noindex en admin y API
curl -sI https://nexobow.site/admin/
curl -sI -X OPTIONS -H "Origin: https://evil.example" https://preview.nexobow.site/api/ping

# Robots y sitemap
curl -s https://nexobow.site/robots.txt
```
