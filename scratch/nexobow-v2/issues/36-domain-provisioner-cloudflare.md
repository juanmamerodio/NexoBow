# 36: Skill y Validador domain-provisioner (Handoff Post-Venta Cloudflare)

**What to build:** Un asistente de aprovisionamiento de dominios y skill (`domain-provisioner`) que permite al operador configurar en Cloudflare Pages la transición de la preview efímera hacia el dominio personalizado del cliente (`.com.ar` en NIC Argentina o `.com`), generando las instrucciones DNS CNAME exactas y verificando la propagación y el estado SSL.

**Blocked by:** 33: Higiene Anti-Bloat, Purga de Skills Obsoletas y Symlink Claude Code.

**Status:** done

- [x] Crear `.agents/skills/domain-provisioner/SKILL.md` con procedimiento operativo estándar (SOP) para Claude Code y Antigravity.
- [x] Implementar `scripts/domain-provisioner.mjs` con flags `--slug <slug> --domain <domain> [--check] [--dns-instructions]`.
- [x] Generar instrucciones paso a paso para delegación DNS y registros CNAME apuntando a `nexobow-previews.pages.dev` adaptadas a NIC Argentina y registradores internacionales.
- [x] Incorporar verificación de resolución DNS (`dns.resolveCname`) y verificación de estado HTTP/HTTPS.
- [x] Desarrollar suite de pruebas TDD `tests/domain-provisioner.test.mjs` validando contratos de salida, formato de instrucciones y manejo de errores.
