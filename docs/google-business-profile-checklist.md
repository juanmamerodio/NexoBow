# Guía Operativa y Checklist — Google Business Profile (GBP) para NexoBow

## 1. Diagnóstico de Necesidad (¿NexoBow necesita ficha en Google?)
**Sí, es altamente recomendable y necesaria** por tres razones concretas:
1. **Validación de confianza para audiencia +40 años:** Antes de abonar el Setup (`$189.999 ARS`), médicos, odontólogos, psicólogos y abogados buscan `"NexoBow"` o `"NexoBow opiniones"` en Google. Contar con una ficha real verificada y reseñas visibles reduce la fricción de desconfianza.
2. **Coherencia comercial:** NexoBow ofrece optimización de Google Maps como bono y ventaja competitiva; la agencia debe exhibir una ficha impecable como caso propio.
3. **Visibilidad orgánica local:** Capta búsquedas de intención en Argentina (*"diseño de páginas web para consultorios"*, *"agencia web para médicos y abogados"*).

---

## 2. Modalidad Operativa Recomendada (Sin Exponer Domicilio Particular)
Crear el perfil bajo la modalidad **Empresa de Área de Servicio (Service-Area Business / SAB)**:
- **Dirección física:** Ingresar la dirección real únicamente para la validación interna de Google y **desactivar/ocultar el domicilio en el perfil público** ("No tengo un local al que asistan los clientes; visito o atiendo en un área de servicio").
- **Áreas de servicio configuradas (en orden):**
  1. `CABA` (Ciudad Autónoma de Buenos Aires)
  2. `Zona Norte` (Vicente López, San Isidro, Tigre, Pilar)
  3. `Campana`
  4. `Zárate`
  5. `Argentina` (cobertura remota nacional)

---

## 3. Ficha NAP y Categorización (Coherente con JSON-LD `ProfessionalService`)
- **Nombre del perfil:** `NexoBow` (sin relleno de keywords que dispare suspensión).
- **Categoría principal:** `Diseño de sitios web` (o `Diseñador de sitios web` / `Agencia de marketing`).
- **Categorías secundarias:** `Agencia de marketing` · `Consultor de marketing`.
- **Teléfono comercial (WhatsApp):** `+54 9 3489 53-6088` (idéntico al `telephone` de `ProfessionalService` en `web/src/lib/seo.ts`).
- **Sitio web:** `https://nexobow.site/`
- **Email de contacto administrativo:** `juanma@nexobow.site`
- **Descripción comercial (≤ 750 caracteres, orientada a +40):**
  > Diseñamos páginas web rápidas y sistemas de turnos online por WhatsApp para consultorios médicos, odontólogos, nutricionistas, psicólogos y estudios jurídicos en Argentina. Conectamos tu ficha de Google Maps e Instagram para que los pacientes lleguen informados y agenden sin ida y vuelta innecesario. Entrega en menos de 72 horas hábiles.

---

## 4. Verificación por Video y Evidencia Requerida en Argentina
Cuando Google solicite **verificación por video** (grabación continua sin cortes desde la app móvil de GBP):
1. **Contexto de ubicación / entorno operativo:** Mostrar la calle/edificio o zona de partida coincidente con la dirección declarada internamente (sin necesidad de tener cartel en vía pública si es Área de Servicio, pero aclarando que se trabaja en domicilio/estudio).
2. **Prueba de equipamiento y actividad comercial:** Mostrar tu espacio de trabajo con computadora abierta en `https://nexobow.site`, tablero de administración / código o dominio activo y facturas/monotributo o documentación comercial a nombre de Juanma Merodio vinculada a la actividad.
3. **Prueba de gestión:** Demostrar acceso a la cuenta administradora de `nexobow.site` / correo `juanma@nexobow.site`.

---

## 5. Checklist de Lanzamiento y Solicitud de Reseñas Post-Entrega
- [ ] Dar de alta la ficha como **Empresa de Área de Servicio** ocultando dirección particular.
- [ ] Cargar logo cuadrado **NexoBow** (estética Soft-Obsidian `#040607` + `#BF40FA`) y portada limpia `1200x675` con casos de éxito reales.
- [ ] Cargar al menos 3 servicios en el catálogo de GBP (*Página Web para Consultorio Médico*, *Página Web para Estudio Jurídico*, *Sistema de Turnos por WhatsApp*).
- [ ] Completar verificación por video y confirmar publicación en Google Maps.
- [ ] Copiar el **enlace directo para solicitar reseñas** desde el panel de GBP (`Pedir reseñas`) y enviarlo por WhatsApp a cada prestador 7 días después de publicar su web en producción.
- [ ] Verificar consistencia exacta entre GBP y el bloque JSON-LD `ProfessionalService` de `https://nexobow.site/`.
- [ ] Conectar Google Search Console mediante `PUBLIC_GOOGLE_SITE_VERIFICATION` o registro DNS TXT en Cloudflare para `nexobow.site` y enviar `https://nexobow.site/sitemap.xml`.
