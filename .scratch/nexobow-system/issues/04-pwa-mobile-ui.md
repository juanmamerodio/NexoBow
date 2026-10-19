# 04: PWA / Dashboard Web Privado para Celular

**What to build:** Una interfaz web responsive y ligera (HTML/Tailwind/Vanilla JS o micro-framework sin sobrecarga) servida por el servidor privado de NexoBow System, con soporte de manifest PWA para instalar como aplicación en el celular del operador. La vista presenta el listado de los 15 leads del día, acceso con un tap a la demo en `preview.nexobow.com/{slug}`, botón directo para abrir WhatsApp con copy prellenado y botón para disparar nuevo lote.

**Blocked by:** 03-server-api-auth.md

**Status:** ready-for-agent

- [ ] UI mobile-first con modo oscuro/claro y diseño limpio (estándar NexoBow de alta gama).
- [ ] Pantalla de login/ingreso de PIN/Token que se guarda en `localStorage` para no requerir login diario en el celular.
- [ ] Acciones directas por lead: ver preview, copiar mensaje, abrir chat de WhatsApp directo con el prestador (`https://wa.me/{phone}?text=...`).
- [ ] Indicador en tiempo real del estado de generación de leads.
