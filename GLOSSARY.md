# NexoBow

Agencia que vende a prestadores de servicios de salud un sistema de turnos automatizados (WhatsApp + agenda), como upsell de una consultoría gratuita.

## Language

**Prestador**:
Profesional de la salud que contrata NexoBow. Rubro inicial: nutricionista.
_Avoid_: Cliente (ambiguo con paciente), usuario

**Paciente**:
Persona que consulta al prestador y reserva un turno.
_Avoid_: Cliente, lead (salvo antes de reservar)

**Turno automatizado**:
Reserva de una consultoría gratuita que el paciente concreta por WhatsApp y queda en la agenda sin intervención del prestador. Es el único tipo de turno que agenda NexoBow.
_Avoid_: Cita, reserva manual

**Consultoría gratuita**:
Llamada del prestador con un paciente, agendada como gratuita. En ella el prestador vende su servicio pago. NexoBow no participa de esa venta.
_Avoid_: Demo, reunión

**Upsell del prestador**:
Paso de la consultoría gratuita a la consulta personalizada paga. Lo resuelve el prestador, no NexoBow.
_Avoid_: Conversión (ambiguo)

**Setup**:
Cobro único por implementar el sistema a un prestador.

**Abono**:
Cobro mensual bajo por mantener el sistema. El primer mes es de prueba y no se paga.

**Caso de éxito**:
Resultado comprobable de un prestador, publicado en la web de NexoBow.
_Avoid_: Testimonio

**Embudo**:
Recorrido completo que lleva al paciente desde Google Maps, WhatsApp o Instagram hasta una consultoría gratuita agendada. Es lo que vende NexoBow.
_Avoid_: Sistema de turnos, bot, Calendly

**Landing**:
Página propia del prestador, núcleo del embudo, con sus casos de éxito, reseñas e información que generan confianza. Su botón principal lleva a Calendly.
_Avoid_: Sitio web, embed

**Consultoría agendada / concretada**:
Métrica del embudo: consultorías gratuitas reservadas por mes, y cuántas de ellas se realizaron.
_Avoid_: Lead, conversión

**Ficha de cliente**:
Archivo Markdown (`N-rubro-nombre.md`) con los datos, branding, contenido y estado de un prestador. Es la única fuente de verdad para generar su landing.
_Avoid_: client.json, perfil

**Template**:
Proyecto Astro base por rubro que se clona para cada prestador.
_Avoid_: Plantilla, theme

**Clon**:
Copia del template adaptada con la ficha de un prestador. Se genera, no se edita a mano.
_Avoid_: Fork, sitio
