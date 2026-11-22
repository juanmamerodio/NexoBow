# Runbook Operativo Gate 1 — Activación VPS Zero-Trust (`NexoBow Autonomous`)

Guía práctica y paso a paso para pasar de **Gate 0 (`$0` gasto fijo)** a **Gate 1 operativo** cuando la facturación real de **prestadores** justifique encender el servidor dedicado de automatización (`n8n 2.0` + `Postgres 16` + `Redis 7`).

---

## 1. Regla Financiera Gate 1 (`$0` Fijo Previo)

- **Durante Gate 0 y Bloque 1 (Tier 1):** No se contrata VPS, no se encienden contenedores Docker ni se pagan APIs mensuales. Todo el blueprint de `infra/autonomous/` permanece versionado en disco y auditado de forma offline mediante:
  ```bash
  npm run activate-autonomous
  ```
- **Cuándo abrir Gate 1:** Recién después de cobrar **1 a 3 Setups Tier 1** (`$189.999 ARS` cada uno) o cerrar el primer **abono** Tier 2 (`$549.999 ARS` setup + `$229.999 ARS/mes`).
- **Aislamiento de privacidad (Ley 25.326):** Los datos de contacto e historial conversacional de **pacientes** viven exclusivamente en la instancia `Postgres 16` del VPS dentro de la red interna `data-tier`, sin replicarse a Supabase ni a Cloudflare Edge.

---

## 2. Arquitectura Zero-Trust y Presupuesto de VPS

- **Servidor recomendado:** VPS Hetzner Cloud **CPX11 / CX22** (2 a 4 GB RAM, Ubuntu 24.04 LTS, región cercana a tráfico o EU/US con baja latencia).
- **Segmentación de redes Docker (`infra/autonomous/docker-compose.yml`):**
  - `data-tier` (`internal: true`): confina `postgres:16-alpine` (`512m`) y `redis:7-alpine` (`256m`) sin salida directa a internet ni mapeo de puertos al host.
  - `app-tier`: conecta `n8n:2.0` (`1024m`) con `cloudflared` (cuando se habilita el perfil opcional `tunnel`).
  - `front-ingress`: red de salida controlada para el túnel cifrado hacia Cloudflare.
- **Controles adicionales del Compose:**
  - `security_opt: ["no-new-privileges:true"]` y `mem_limit` explícito en todos los contenedores.
  - Sin montaje de `/var/run/docker.sock` ni contenedores privilegiados.
  - `n8n` publicado únicamente en loopback (`127.0.0.1:5678:5678`), nunca en `0.0.0.0`.
- **Desacoplamiento de Chatwoot:** Chatwoot queda explícitamente fuera de este `docker-compose.yml` para evitar consumo excesivo de RAM (Sidekiq + Rails + indexadores) en VPS de 2 a 4 GB. Si más adelante se necesita bandeja humana multi-agente, se conecta en una instancia separada o en Gate 2 sin comprometer la estabilidad de turnos y recordatorios.

---

## 3. Hardening Inicial del VPS Hetzner (Tailscale + UFW + CrowdSec)

Ejecutar estos pasos una sola vez como usuario con `sudo` luego de crear el servidor en Hetzner:

1. **Acceso SSH con clave privada únicamente:** deshabilitar `PasswordAuthentication no` y `PermitRootLogin prohibit-password` en `/etc/ssh/sshd_config` y reiniciar `sshd`.
2. **Instalar Docker Engine y Compose v2** desde el repositorio oficial de Docker.
3. **Instalar Tailscale (red privada administrativa):**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --ssh
   ```
   El panel de `n8n` en `127.0.0.1:5678` se administra exclusivamente mediante túnel SSH sobre Tailscale o Cloudflare Zero Trust Access, sin abrir el puerto `5678` al público.
4. **Configurar UFW (firewall por defecto cerrado):**
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow in on tailscale0
   sudo ufw enable
   ```
   Con Cloudflare Tunnel saliente no necesitás abrir los puertos `80` ni `443` en `UFW`. (Si usás un proxy inverso tradicional en lugar de Tunnel, habilitá solo `443/tcp` restringido a rangos IP de Cloudflare).
5. **Instalar CrowdSec + bouncer de firewall:**
   ```bash
   sudo apt update && sudo apt install -y crowdsec crowdsec-firewall-bouncer-iptables
   sudo systemctl enable --now crowdsec
   ```

---

## 4. Túnel Saliente con Cloudflare Tunnel (`cloudflared`)

Para recibir webhooks de Meta WhatsApp Business API sin exponer la IP real del VPS ni abrir puertos entrantes:

1. En **Cloudflare Zero Trust → Networks → Tunnels**, crear un túnel llamado `nexobow-gate1-vps` y copiar el token generado.
2. En **Public Hostname**, apuntar un subdominio dedicado (ej. `hook.nexobow.site`) hacia el servicio interno de Compose `http://n8n:5678`.
3. Guardar el token como `CLOUDFLARE_TUNNEL_TOKEN` dentro del archivo local `.env.autonomous` del VPS.
4. Al activar el stack, sumar `--with-tunnel` (que habilita el perfil `--profile tunnel` de `cloudflared` en `docker-compose.yml`).

---

## 5. Configuración de Meta Embedded Signup / WABA

1. En **Meta for Developers**, crear una aplicación tipo **Business** y agregar el producto **WhatsApp**.
2. Completar el onboarding de **Meta Embedded Signup / WABA** vinculando la cuenta comercial verificada y un número telefónico exclusivo de atención (sin sesión previa de WhatsApp Business App).
3. Obtener y guardar únicamente en `.env.autonomous` del VPS (nunca en git):
   - `META_WABA_VERIFY_TOKEN`: token aleatorio propio para validar el handshake `GET`.
   - `META_WABA_APP_SECRET`: clave privada de la aplicación Meta para validar `X-Hub-Signature-256`.
   - `META_WABA_ACCESS_TOKEN`: credencial de acceso de sistema con permiso `whatsapp_business_messaging`.
4. Configurar el Webhook de WhatsApp apuntando a `https://hook.nexobow.site/webhook/waba` (el `WEBHOOK_URL` configurado en `n8n`) y suscribirse únicamente al campo `messages`.

---

## 6. Preparación y Rotación de Credenciales y Claves Privadas

1. En el VPS, copiar la plantilla sin modificar el repositorio:
   ```bash
   cp infra/autonomous/.env.autonomous.example infra/autonomous/.env.autonomous
   chmod 600 infra/autonomous/.env.autonomous
   ```
2. Generar valores criptográficos aleatorios para todas las **credenciales** y **claves privadas**:
   ```bash
   openssl rand -hex 32
   ```
   Completar `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `N8N_ENCRYPTION_KEY`, `META_WABA_VERIFY_TOKEN`, `META_WABA_APP_SECRET`, `META_WABA_ACCESS_TOKEN`, `NEXOBOW_INGEST_URL` y `AUTONOMOUS_INGEST_KEY` (coincidente con la configurada en Cloudflare Pages).
3. **Política de rotación (cada 90 días o ante incidente):**
   - Rotar primero `AUTONOMOUS_INGEST_KEY` actualizándola en Cloudflare Pages y en `.env.autonomous`, luego reiniciar `n8n`.
   - Rotar `META_WABA_ACCESS_TOKEN` desde System Users de Meta Business Manager antes de revocar el token anterior.
   - Rotar `POSTGRES_PASSWORD` y `REDIS_PASSWORD` mediante ventana de mantenimiento breve; **no** cambiar `N8N_ENCRYPTION_KEY` sin exportar previamente las credenciales guardadas dentro de `n8n`.

---

## 7. Activación en 1 Comando y Verificación Post-Despliegue

1. Verificar preflight estricto del archivo `.env.autonomous` antes de tocar Docker:
   ```bash
   node scripts/activate-autonomous.mjs --strict-env --env-file infra/autonomous/.env.autonomous
   ```
2. Activar el motor completo en 1 comando:
   ```bash
   node scripts/activate-autonomous.mjs --apply --env-file infra/autonomous/.env.autonomous --with-tunnel
   ```
   *(Sin `--with-tunnel` levanta `postgres`, `redis` y `n8n` en `127.0.0.1:5678`).*
3. Comprobar aislamiento y salud tras el arranque:
   ```bash
   docker compose -f infra/autonomous/docker-compose.yml ps
   ss -tulpn | grep 5678
   docker compose -f infra/autonomous/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"
   ```
   Confirmar que solo `127.0.0.1:5678` aparece escuchando en el host y que figuran las 4 tablas (`appointments`, `waitlist_entries`, `reminder_dispatches`, `conversation_state`).
