#!/usr/bin/env node

/**
 * scripts/handle-objection.mjs
 * Motor táctico de respuestas para objeciones en WhatsApp (Voseo Argentino & Alex Hormozi)
 */

import { fileURLToPath } from 'node:url';

export const OBJECTION_CATEGORIES = [
  'precio',
  'instagram',
  'tiempo',
  'dudas_pacientes',
  'decision'
];

/**
 * Clasifica una consulta o texto libre en una de las 5 categorías oficiales
 */
export function classifyObjectionQuery(query = '') {
  const q = String(query).toLowerCase();

  if (/caro|precio|costo|presupuesto|plata|cuanto|dólar|pesos|carísimo/i.test(q)) {
    return 'precio';
  }
  if (/instagram|redes|facebook|tiktok|feed|historias|seguidores/i.test(q)) {
    return 'instagram';
  }
  if (/tiempo|ocupad|ahora no|después|mes que viene|coordinar|reunión/i.test(q)) {
    return 'tiempo';
  }
  if (/paciente|cliente|gente|edad|usar|van a agendar|virtual|tecnología/i.test(q)) {
    return 'dudas_pacientes';
  }
  if (/pensar|socio|socia|pareja|evaluar|veremos|te aviso|escribo/i.test(q)) {
    return 'decision';
  }

  return 'precio';
}

/**
 * Genera 3 ángulos persuasivos calibrados según el perfil del profesional
 */
export function generateObjectionResponses({
  category = 'precio',
  nombre = 'Doc',
  rubro = 'profesional',
  slug = 'demo'
} = {}) {
  const previewUrl = `https://preview.nexobow.site/${slug}/`;
  const nameDisplay = nombre || 'estimado/a';

  const matrices = {
    precio: {
      reliefOpportunity: `Hola ${nameDisplay}, ¡totalmente entendible! Fijate que la inversión de setup es de $189.999 ARS por única vez y luego solo $12.259 ARS mensuales de mantenimiento. Si hacés la cuenta, con que recuperes 1 o 2 consultas particulares al mes que hoy se pierden en el "visto" de WhatsApp, el sistema se paga 100% solo y el resto te queda como ganancia limpia. ¿Te parece que revisemos cómo se adapta a tu flujo?`,
      riskReversal7d: `Te entiendo perfecto, ${nameDisplay}. Por eso mismo armé la demo en vivo en ${previewUrl}. Tenés 7 días para probarla sin poner un solo peso ni compromiso. Si sentís que no te suma valor, a los 7 días el sistema la purga automáticamente y listo. Mirala tranquilo desde tu celular y avisame qué te parece.`,
      audiovisualAfterbow: `Totalmente, ${nameDisplay}. Si estás buscando una solución integral de mayor retorno, además del sistema de agendamiento tenemos una alianza con la productora AfterBow (afterbow.com): producimos un mes entero de contenido en video y reels estratégicos para tus redes que amortizan la inversión con creces en las primeras 3 semanas. ¿Querés que te pase los números de esa opción?`
    },
    instagram: {
      reliefOpportunity: `¡Excelente que ya tengas presencia en Instagram, ${nameDisplay}! El tema es que Instagram es para generar curiosidad, pero cuando te mandan un DM pidiendo info o precio, terminás respondiendo audios largos a deshora y el 70% te clava el visto. Con tu sistema NexoBow, ponés el link en la bio y el paciente que está interesado se autocalifica y agenda solo en 30 segundos. ¿Fijate cómo te ahorraría tiempo de gestión?`,
      riskReversal7d: `Totalmente de acuerdo, ${nameDisplay}. Instagram funciona genial para alcance, pero mirá cómo se complementa cuando enlazás tu web personalizada en ${previewUrl}. Tenés 7 días de reserva activa para testearla. Entrá, fijate cómo se siente la experiencia de agendamiento y si no te convence no pasa nada, se desactiva sola.`,
      audiovisualAfterbow: `Es el canal clave, ${nameDisplay}. De hecho, junto a AfterBow (afterbow.com) potenciamos cuentas de Instagram produciendo piezas audiovisuales profesionales en formato vertical que dirigen tráfico directo a tu landing, multiplicando tus consultas agendadas sin que tengas que vivir pegado al chat. ¿Querés que coordinemos un llamado de 10 minutos para mostrártelo?`
    },
    tiempo: {
      reliefOpportunity: `Te entiendo de primera mano, ${nameDisplay}, el día a día entre consultas y urgencias te consume todo. Justamente por eso diseñamos NexoBow: vos no tenés que diseñar nada, redactar textos ni aprender tecnología. Nosotros te entregamos el sistema 100% terminado y funcionando en menos de 48 hs. Dejá de perder tiempo contestando precios y que el sistema trabaje por vos 24/7.`,
      riskReversal7d: `Pensalo así, ${nameDisplay}: la demo ya está completamente armada y lista para usar en ${previewUrl}. No tenés que invertir tiempo en reuniones eternas. La dejé activa por 7 días; si en este plazo querés que la conectemos a tu WhatsApp oficial, lo hacemos en 1 clic. Si no tenés tiempo ahora, a los 7 días se apaga sola y no perdiste nada.`,
      audiovisualAfterbow: `Totalmente comprensible, ${nameDisplay}. Si el tiempo es tu cuello de botella, el combo AfterBow (afterbow.com) + NexoBow es ideal: en solo 2 horas de rodaje te grabamos todo el contenido del mes y dejamos tu embudo automatizado para que solo te preocupes por atender pacientes. ¿Querés que te envíe un resumen de cómo lo coordinamos?`
    },
    dudas_pacientes: {
      reliefOpportunity: `Es una duda muy común, ${nameDisplay}. Pero mirá: la página está pensada específicamente para que sea ridículamente simple. No requiere instalar apps ni registrarse. El paciente toca un botón grande y claro desde el celular y reserva su turno o te manda su consulta filtrada por WhatsApp en 0.6 segundos. Si saben usar WhatsApp, van a saber agendar acá. ¿Querés probar el botón de prueba vos mismo?`,
      riskReversal7d: `Hagamos una prueba sin riesgo, ${nameDisplay}: compartile el link de tu demo en ${previewUrl} a 2 o 3 pacientes de confianza durante los 7 días que la tenés activa y pediles su opinión honesta. Vas a ver que valoran muchísimo la rapidez y la seriedad del consultorio. Si no te gusta el feedback, se cancela sola a los 7 días.`,
      audiovisualAfterbow: `Para pacientes que necesitan más confianza antes de agendar, junto a AfterBow (afterbow.com) creamos micro-videos donde explicás brevemente tu método de atención. Esos videos incrustados en la landing transmiten una cercanía enorme y derriban cualquier miedo tecnológico. Fijate qué te parece este enfoque.`
    },
    decision: {
      reliefOpportunity: `Me parece perfecto que lo evalúes con calma, ${nameDisplay}. Pensá simplemente en esto: cada semana que pasa sin un embudo que responda de noche o los fines de semana, son consultas que terminan yendo a otro colega que respondió primero. El abono mensual es de apenas $12.259 ARS finales. Con una sola consulta retenida cubrís meses de servicio. ¿Tenés alguna duda puntual que podamos despejar?`,
      riskReversal7d: `¡Excelente idea, ${nameDisplay}! Para que puedan analizarlo juntos sobre algo tangible y no en el aire, compartiles el enlace de la demo en vivo: ${previewUrl}. Recordá que tenés 7 días de reserva en el servidor antes de que se libere el cupo. Miralo con tu equipo y cuando estén listos me avisan.`,
      audiovisualAfterbow: `Impecable, ${nameDisplay}. Si quieren evaluar la propuesta completa para el consultorio o estudio, les puedo preparar una propuesta conjunta con AfterBow (afterbow.com) con métricas proyectadas de captación y producción audiovisual para que tengan todo el panorama claro al momento de decidir. ¿Querés que te prepare un PDF ejecutivo?`
    }
  };

  const selectedCategory = matrices[category] ? category : 'precio';
  const angles = matrices[selectedCategory];

  return {
    category: selectedCategory,
    nombre: nameDisplay,
    rubro,
    slug,
    previewUrl,
    angles
  };
}

// Ejecución como CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let query = '';
  let nombre = 'Doc';
  let rubro = 'salud';
  let slug = 'demo';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--objecion' || args[i] === '-o') query = args[++i];
    else if (args[i] === '--nombre' || args[i] === '-n') nombre = args[++i];
    else if (args[i] === '--rubro' || args[i] === '-r') rubro = args[++i];
    else if (args[i] === '--slug' || args[i] === '-s') slug = args[++i];
  }

  const cat = classifyObjectionQuery(query);
  const result = generateObjectionResponses({ category: cat, nombre, rubro, slug });

  console.log(`\n======================================================`);
  console.log(`💬 NEXOBOW OBJECTION HANDLER (Categoría: ${result.category.toUpperCase()})`);
  console.log(`Prospecto: ${result.nombre} | Rubro: ${result.rubro}`);
  console.log(`Preview: ${result.previewUrl}`);
  console.log(`======================================================\n`);

  console.log(`🔵 ÁNGULO 1: ALIVIO & COSTO DE OPORTUNIDAD (Hormozi)`);
  console.log(`"${result.angles.reliefOpportunity}"\n`);

  console.log(`🟢 ÁNGULO 2: REVERSIÓN DE RIESGO & 7 DÍAS`);
  console.log(`"${result.angles.riskReversal7d}"\n`);

  console.log(`🟣 ÁNGULO 3: APALANCAMIENTO AUDIOVISUAL AFTERBOW`);
  console.log(`"${result.angles.audiovisualAfterbow}"\n`);
  console.log(`======================================================\n`);
}
