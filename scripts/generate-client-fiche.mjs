// scripts/generate-client-fiche.mjs — NexoBow: generación de ficha /clients/{slug}.md con copywriting Hormozi, correlatividad Sheets y TTL 7 días
// Uso: node scripts/generate-client-fiche.mjs assets/22-alejandra-martinez-nutri/lead-raw.json [--sheet-id 22]
// Códigos de salida: 0 = ok · 1 = error técnico · 2 = datos insuficientes

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stringify as stringifyYaml } from "yaml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Cargar variables de entorno si existe .env
try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si no se puede cargar automáticamente
}

export function addDaysToIsoDate(isoDateStr, days = 7) {
  const base = new Date(`${isoDateStr}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + Number(days));
  return base.toISOString().split("T")[0];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let rawJsonPath = null;
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!rawJsonPath) {
      rawJsonPath = args[i];
    }
  }
  return { rawJsonPath, flags };
}

async function enhanceWithGemini(lead, apiKey) {
  try {
    const prompt = `Actuá como el redactor senior de NexoBow (agencia que crea embudos de venta de alta conversión para profesionales de salud).
Tu tarea es redactar el contenido de la ficha de cliente en ESPAÑOL ARGENTINO (usando voseo estricto: "comé", "tenés", "agendá", "olvidate") y con el marco de Alex Hormozi (cero humo, dolor real del paciente ocupado, alivio concreto).

Datos del profesional extraídos de Google Maps:
- Nombre: ${lead.nombre}
- Rubro: ${lead.rubro}
- Especialidad / Ubicación: ${lead.especialidad || lead.direccion || "Atención Online y Presencial"}
- Calificación: ${lead.rating} estrellas con ${lead.userRatingCount} opiniones

Generá un JSON estricto con las siguientes claves:
{
  "bio": "Bio profesional en 2-3 oraciones destacando formación, enfoque humano y sin dietas restrictivas.",
  "enfoque": "Explicación en 2-3 oraciones de cómo trabaja, adaptado a la rutina del paciente real y sin prohibiciones absurdas.",
  "problema": "Descripción del dolor de las personas que intentaron mil dietas y rebotaron, o no tienen tiempo para cocinar cosas complejas.",
  "casos": [
    {
      "titulo": "Nombre y perfil del paciente (ej: Martín R., 35 años, programador)",
      "descripcion": "Problema inicial con el que llegó.",
      "resultado": "Resultado concreto y medible alcanzado (ej: -9 kg en 3 meses y energía estable)."
    },
    {
      "titulo": "Segundo paciente (ej: Florencia M., 41 años, médica de guardia)",
      "descripcion": "Problema de horarios y desorden alimentario.",
      "resultado": "Resultado concreto (ej: digestión recuperada y 5 cm menos de cintura sin suplementos mágicos)."
    }
  ],
  "faq": [
    {
      "q": "¿La primera consultoría tiene costo?",
      "a": "No, es 100% gratuita y dura 20 minutos por videollamada o WhatsApp. Evaluamos tu situación y te llevás un diagnóstico claro sin compromiso."
    },
    {
      "q": "¿Tengo que dejar de comer harinas o pasar hambre?",
      "a": "En absoluto. Las dietas restrictivas fracasan porque son insostenibles. Armamos platos con ingredientes que conseguís en cualquier súper y que se adaptan a tu vida social."
    },
    {
      "q": "¿Cómo es el seguimiento diario?",
      "a": "Hacemos seguimiento continuo por WhatsApp: me mandás fotos de tus comidas, resolvemos dudas en el día y ajustamos el plan cada 15 días."
    },
    {
      "q": "¿Sirve si tengo horarios rotativos o poco tiempo para cocinar?",
      "a": "Es exactamente para lo que está pensado. Trabajamos con preparaciones rápidas de 15 minutos y compras inteligentes para que comer bien no sea otra carga mental."
    }
  ]
}

Responde ÚNICAMENTE con el objeto JSON válido, sin bloques de código markdown ni texto adicional.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) return null;
    const jsonRes = await res.json();
    const rawText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;
    return JSON.parse(rawText);
  } catch (err) {
    console.warn(`[generate-fiche] AVISO: No se pudo conectar a Gemini API (${err.message}). Usando plantilla local.`);
    return null;
  }
}

function hashSeed(str = "") {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export const HORMOZI_PAIN_ANGLES = [
  {
    id: "rutina-tiempo",
    label: "1. Rutina colapsada y falta de tiempo",
    build(nombre) {
      return {
        bio: `${nombre}, especialista en nutrición clínica y organización alimentaria para agendas exigentes. Ayudo a profesionales y personas sin tiempo a ordenar sus comidas en 15 minutos sin vivir en la cocina ni depender del delivery.`,
        enfoque: `Diseñamos sistemas de alimentación simples: compras semanales resueltas en una sola lista, platos de ensamble rápido y viandas prácticas que se adaptan a tus horarios laborales y vida familiar.`,
        problema: `El problema no es que no sepas qué es saludable: es que después de 9 horas de trabajo no tenés energía para cocinar recetas imposibles. Comer bien tiene que ahorrarte tiempo, no quitártelo.`,
        casos: [
          {
            titulo: "Lautaro M. (34 años, Director Comercial)",
            descripcion: "Jornadas de 10 horas, almuerzos improvisados en oficina y fatiga constante a la tarde.",
            resultado: "-8 kg en 3 meses con menús de 15 minutos y cero delivery nocturno.",
          },
          {
            titulo: "Carolina V. (39 años, Médica de guardia)",
            descripcion: "Turnos rotativos, desorden horario y picoteo por ansiedad al volver a casa.",
            resultado: "Organización semanal completa, saciedad real y -6 cm de cintura en 8 semanas.",
          },
        ],
        faq: [
          {
            q: "¿La primera consultoría tiene algún costo oculto?",
            a: "No, es 100% gratuita y dura 20 minutos por videollamada o WhatsApp. Evaluamos tu rutina y te llevás un plan de acción claro.",
          },
          {
            q: "¿Qué pasa si no tengo tiempo para cocinar todos los días?",
            a: "Armamos estrategias de batch-cooking de 40 minutos semanales y platos de ensamble en 10 minutos con ingredientes de cualquier supermercado.",
          },
          {
            q: "¿Tengo que pesar cada gramo de comida?",
            a: "Para nada. Trabajamos con porciones visuales prácticas para que puedas comer bien tanto en tu casa como en un restaurante o la oficina.",
          },
          {
            q: "¿Cómo es el seguimiento entre sesiones?",
            a: "Tenés contacto directo por WhatsApp para resolver dudas en el supermercado, ajustar menús y mantener la constancia sin estrés.",
          },
        ],
      };
    },
  },
  {
    id: "fatiga-rebote",
    label: "2. Frustración y fatiga por dietas restrictivas / efecto rebote",
    build(nombre) {
      return {
        bio: `${nombre}, nutricionista enfocada en cambio de hábitos definitivos y relación sana con la comida. Acompaño a personas cansadas del efecto rebote a lograr resultados sostenibles sin prohibiciones absurdas.`,
        enfoque: `Reemplazamos la mentalidad de "todo o nada" por educación nutricional flexible. Aprendés a integrar tus comidas favoritas y eventos sociales sin culpa ni retrocesos.`,
        problema: `La mayoría de las personas no fracasan por falta de voluntad, sino por seguir dietas extremas que eliminan grupos enteros de alimentos hasta que el cuerpo y la cabeza no aguantan más.`,
        casos: [
          {
            titulo: "Valeria G. (29 años, Emprendedora)",
            descripcion: "Historial de 5 años de dietas keto y ayunos extremos seguidos de atracones y rebote.",
            resultado: "-7 kg sostenidos durante el último año comiendo hidratos y saliendo los fines de semana.",
          },
          {
            titulo: "Martín R. (42 años, Arquitecto)",
            descripcion: "Estancamiento metabólico y frustración por subir de peso cada vez que dejaba un plan estricto.",
            resultado: "Reeducación de porciones, -5% de grasa corporal y fin definitivo del efecto yo-yo.",
          },
        ],
        faq: [
          {
            q: "¿La primera consultoría inicial tiene costo?",
            a: "Es sin cargo. Conversamos 20 minutos para entender qué intentaste antes, por qué no funcionó y cómo destrabar tu proceso.",
          },
          {
            q: "¿Voy a tener que dejar las harinas o las juntadas con amigos?",
            a: "En absoluto. Prohibir lo que te gusta garantiza el abandono. Aprendemos a equilibrar tu semana para que disfrutes sin perder tus avances.",
          },
          {
            q: "¿Usan batidos, polvos o suplementos para adelgazar?",
            a: "Cero productos mágicos. Todo el proceso se basa en comida real, saciante y accesible en tu barrio.",
          },
          {
            q: "¿Cada cuánto hacemos los controles?",
            a: "Realizamos revisiones quincenales online o presenciales con soporte continuo por WhatsApp para acompañarte cuando aparece la ansiedad.",
          },
        ],
      };
    },
  },
  {
    id: "digestion-energia",
    label: "3. Digestión, energía vital y sintomatología clínica",
    build(nombre) {
      return {
        bio: `${nombre}, especialista en nutrición digestiva, antiinflamatoria y salud metabólica. Ayudo a pacientes con distensión abdominal, acidez y cansancio crónico a recuperar su bienestar diario desde la raíz.`,
        enfoque: `Abordamos la nutrición desde la fisiología y la clínica: identificamos alimentos gatillo, mejoramos tu microbiota y ordenamos tus nutrientes para que vuelvas a sentirte liviano después de cada comida.`,
        problema: `Normalizar vivir hinchado, con pesadez estomacal o sueño después de almorzar te apaga el día entero. Cuando corregís la inflamación con el plan adecuado, tu energía cambia en la primera semana.`,
        casos: [
          {
            titulo: "Sofía L. (31 años, Diseñadora UX)",
            descripcion: "Distensión abdominal diaria, colon irritable y caída de energía todas las tardes.",
            resultado: "Desinflamación completa en 21 días, digestión liviana y descanso profundo.",
          },
          {
            titulo: "Diego P. (46 años, Contador)",
            descripcion: "Reflujo gástrico constante, valores de laboratorio alterados y fatiga matutina.",
            resultado: "Normalización de perfil lipídico y glucemia en 90 días sin acidez.",
          },
        ],
        faq: [
          {
            q: "¿Cómo funciona la consultoría de evaluación gratuita?",
            a: "En una llamada breve de 20 minutos revisamos tus síntomas principales, tus análisis recientes y trazamos el protocolo nutricional indicado.",
          },
          {
            q: "¿El plan sirve si tengo SIBO, gastritis o hipotiroidismo?",
            a: "Sí, personalizamos la selección y cocción de alimentos según tu diagnóstico médico y tolerancia digestiva individual.",
          },
          {
            q: "¿En cuánto tiempo se empiezan a notar mejoras en la hinchazón?",
            a: "La mayoría de los pacientes reportan un alivio notable en la distensión y mayor claridad mental entre los primeros 7 y 14 días.",
          },
          {
            q: "¿Necesito llevar estudios de sangre a la primera sesión?",
            a: "Si tenés análisis de los últimos 6 meses sumalos; si no, podemos arrancar con la evaluación clínica y solicitarlos en el proceso.",
          },
        ],
      };
    },
  },
  {
    id: "rendimiento-vitalidad",
    label: "4. Rendimiento físico, composición corporal y vitalidad",
    build(nombre) {
      return {
        bio: `${nombre}, nutricionista orientada a recomposición corporal, rendimiento deportivo y longevidad activa. Ayudo a personas que entrenan a bajar grasa y ganar masa muscular con precisión nutricional.`,
        enfoque: `Sincronizamos tu ingesta proteica y energética con tu entrenamiento y descanso. Estrategias claras pre y post entreno basadas en evidencia científica para que el esfuerzo en el gimnasio por fin se note.`,
        problema: `Entrenar fuerte pero comer al azar es como acelerar el auto sin combustible: te estancás, perdés tono muscular y te lesionás más seguido. La nutrición correcta multiplica cada hora que entrenás.`,
        casos: [
          {
            titulo: "Nicolás F. (28 años, Crossfit & Running)",
            descripcion: "Entrenaba 5 veces por semana pero no lograba definir ni mejorar sus tiempos de recuperación.",
            resultado: "-4.5% de pliegues adiposos y +2.8 kg de masa muscular limpia en 12 semanas.",
          },
          {
            titulo: "Luciana T. (36 años, Entrenamiento de Fuerza)",
            descripcion: "Baja ingesta proteica, calambres frecuentes y falta de fuerza en los entrenamientos.",
            resultado: "Recomposición corporal visible y récord personal de energía y rendimiento.",
          },
        ],
        faq: [
          {
            q: "¿Qué incluye la consultoría diagnóstica sin cargo?",
            a: "Evaluamos tu entrenamiento actual, tus objetivos de composición corporal y definimos la estrategia exacta de macronutrientes.",
          },
          {
            q: "¿Es obligatorio tomar proteína en polvo o creatina?",
            a: "Nunca es obligatorio. Priorizamos cubrir tus requerimientos con alimentos reales y solo sugerimos suplementos con evidencia si aportan comodidad.",
          },
          {
            q: "¿Cómo medimos el avance si el peso en la balanza no lo es todo?",
            a: "Seguimos medidas perimetrales, fotos comparativas, progresión de fuerza en el entrenamiento y niveles de recuperación.",
          },
          {
            q: "¿Adaptan el plan para días de entrenamiento vs. días de descanso?",
            a: "Exacto: ajustamos las porciones de carbohidratos y proteínas según el gasto energético de cada día de tu semana.",
          },
        ],
      };
    },
  },
];

export const CONTEXTUAL_BRANDING_PALETTES = [
  {
    name: "Editorial Delta",
    primary: "#e70025",
    accent: "#e3c1ad",
    fondo: "#fcf3ed",
    tinta: "#35221a",
    fuente: "Fraunces",
    fuente_sans: "Archivo",
  },
  {
    name: "Botanical Sage",
    primary: "#1e5631",
    accent: "#cfe1b9",
    fondo: "#f6f8f3",
    tinta: "#1b2a20",
    fuente: "Lora",
    fuente_sans: "Archivo",
  },
  {
    name: "Terracotta Warmth",
    primary: "#b84a27",
    accent: "#e8ccb8",
    fondo: "#fbf6f1",
    tinta: "#2d1e18",
    fuente: "Playfair Display",
    fuente_sans: "Archivo",
  },
  {
    name: "Clinical Cobalt",
    primary: "#0f4c81",
    accent: "#c5d9ed",
    fondo: "#f4f7fb",
    tinta: "#142433",
    fuente: "Fraunces",
    fuente_sans: "Archivo",
  },
];

export const RUBRO_COPY_PACKS = {
  odontologo: [
    {
      id: "odonto-precision",
      label: "Odontología Estética & Implantología Sin Dolor",
      build(nombre) {
        return {
          rol: "Odontología Digital, Implantología & Estética Dental",
          subtitulo: "Odontología Digital & Estética Dental",
          tagline: "Recuperá tu sonrisa con planificación 3D, presupuesto cerrado y cero sorpresas",
          titulo: "Odontología digital e implantes de alta precisión para recuperar tu *sonrisa sin dolor*",
          bajada: "Valoración diagnóstica inicial con planificación digital y presupuesto cerrado por escrito. Turnos ágiles y atención personalizada sin esperas interminables.",
          bio: `${nombre} integra odontología digital, rehabilitación estética e implantología guiada con foco en el confort del paciente y tratamientos predecibles desde la primera visita.`,
          enfoque: `Trabajamos con diagnóstico claro y tiempos optimizados: conocés cada etapa de tu tratamiento, las opciones estéticas y el arancel cerrado antes de empezar.`,
          problema: `Muchos pacientes postergan años arreglarse la boca por miedo al dolor, presupuestos opacos que cambian a mitad de camino o turnos que se estiran meses.`,
          casos: [
            {
              titulo: "Implantología Guiada & Carga Rápida",
              descripcion: "Rehabilitación de piezas ausentes con planificación digital y mínima invasión quirúrgica.",
              resultado: "Recuperación funcional y estética natural con reincorporación laboral en 48 hs.",
            },
            {
              titulo: "Estética Dental & Carillas Biomiméticas",
              descripcion: "Diseño digital armónico respetando la anatomía facial y el esmalte natural.",
              resultado: "Sonrisa renovada en pocas sesiones con acabado completamente natural.",
            },
          ],
          faq: [
            {
              q: "¿Cómo es la primera consulta de valoración?",
              a: "Evaluamos tu caso en detalle, revisamos estudios previos y te entregamos un plan de tratamiento claro con tiempos y presupuesto cerrado.",
            },
            {
              q: "¿Los procedimientos generan dolor?",
              a: "Aplicamos protocolos mínimamente invasivos y técnicas de anestesia indolora para que vivas la atención con total tranquilidad.",
            },
            {
              q: "¿Qué modalidades de pago y reintegro manejan?",
              a: "Aceptamos cuotas, transferencias y emitimos factura electrónica oficial apta para gestión de reintegros en prepagas.",
            },
            {
              q: "¿Cómo reservo un turno prioritario?",
              a: "Tocá el botón de WhatsApp o agenda online y coordinamos el horario que mejor se adapte a tu semana sin demoras.",
            },
          ],
        };
      },
    },
  ],
  estetica: [
    {
      id: "estetica-clinica",
      label: "Medicina Estética & Dermatología Clínica",
      build(nombre) {
        return {
          rol: "Medicina Estética, Dermatología & Rejuvenecimiento Natural",
          subtitulo: "Medicina Estética & Dermatología",
          tagline: "Resultados armónicos y naturales con respaldo médico real, sin exageraciones",
          titulo: "Medicina estética de precisión para realzar tu rostro y piel con *resultados naturales*",
          bajada: "Evaluación médica personalizada, protocolos dermatológicos seguros e insumos certificados de primera línea. Sin resultados artificiales ni promesas vacías.",
          bio: `${nombre} combina criterio médico dermatológico y estética facial avanzada para acompañar a cada paciente con protocolos seguros, graduales y totalmente personalizados.`,
          enfoque: `Cada rostro y cada piel tienen necesidades distintas. Priorizamos la armonía natural, la bioseguridad médica y un seguimiento cercano post-aplicación.`,
          problema: `El mayor temor hoy en estética es caer en centros no médicos con resultados artificiales, productos sin trazabilidad o recomendaciones estandarizadas que no respetan tus rasgos.`,
          casos: [
            {
              titulo: "Bioestimulación & Calidad de Piel",
              descripcion: "Protocolo combinado de bioestimuladores de colágeno y láser dermatológico según diagnóstico clínico.",
              resultado: "Piel más firme, luminosa y uniforme sin tiempo de recuperación prolongado.",
            },
            {
              titulo: "Armonización Facial Conservadora",
              descripcion: "Reposición sutil de volúmenes y toxina botulínica aplicada con criterio anatómico.",
              resultado: "Expresión descansada y natural manteniendo tus facciones intactas.",
            },
          ],
          faq: [
            {
              q: "¿La evaluación inicial la realiza un médico especialista?",
              a: "Sí, cada diagnóstico y aplicación está 100% a cargo de profesionales médicos habilitados, evaluando tu historia clínica previa.",
            },
            {
              q: "¿Los resultados se ven naturales o exagerados?",
              a: "Nuestro criterio clínico prioriza la armonía y la frescura: nadie nota qué te hiciste, pero te ven descansada y luminosa.",
            },
            {
              q: "¿Cuánto tiempo lleva la recuperación?",
              a: "La mayoría de los procedimientos son ambulatorios e indoloros, permitiéndote retomar tu rutina habitual el mismo día.",
            },
            {
              q: "¿Cómo reservo mi consulta de valoración?",
              a: "Podés solicitar tu turno directamente por WhatsApp o agenda digital en menos de un minuto.",
            },
          ],
        };
      },
    },
  ],
  abogado: [
    {
      id: "abogado-estrategico",
      label: "Estrategia Legal & Defensa Patrimonial",
      build(nombre) {
        return {
          rol: "Estudio Jurídico · Asesoramiento Estratégico, Contratos & Litigios",
          subtitulo: "Estudio Jurídico & Estrategia Legal",
          tagline: "Defensa técnica precisa, claridad en honorarios y resolución rápida sin vueltas",
          titulo: "Protegé tu patrimonio y resolvé tu conflicto con *estrategia jurídica real*",
          bajada: "Sesión diagnóstica inicial para analizar tu documentación, medir riesgos concretos y trazar un plan de acción con honorarios claros desde el día uno.",
          bio: `${nombre} brinda asesoramiento jurídico de alto nivel a particulares, empresarios y pymes, combinando solidez técnica en tribunales con velocidad en negociaciones estratégicas.`,
          enfoque: `Convertimos conflictos complejos en hojas de ruta claras: evaluamos probabilidades reales, evitamos juicios innecesarios cuando conviene negociar y litigamos con firmeza cuando hace falta.`,
          problema: `Demorar una consulta legal o recibir respuestas llenas de tecnicismos sin soluciones prácticas termina costando tiempo, dinero y tranquilidad familiar o empresarial.`,
          casos: [
            {
              titulo: "Acuerdo Extrajudicial de Alto Impacto",
              descripcion: "Negociación técnica respaldada por auditoría documental y estrategia cautelar previa.",
              resultado: "Resolución definitiva en semanas evitando años de desgaste judicial.",
            },
            {
              titulo: "Blindaje Contractual & Preventivo",
              descripcion: "Revisión integral de acuerdos comerciales, societarios y patrimoniales con cláusulas de resguardo.",
              resultado: "Eliminación de contingencias y previsibilidad operativa total.",
            },
          ],
          faq: [
            {
              q: "¿Cómo funciona la primera consulta diagnóstica?",
              a: "Revisamos tu caso y la documentación clave, te explicamos tus opciones reales en lenguaje claro y definimos los próximos pasos.",
            },
            {
              q: "¿Cómo se fijan los honorarios del estudio?",
              a: "Trabajamos con presupuestos transparentes por etapa o gestión, acordados por escrito antes de iniciar cualquier trámite.",
            },
            {
              q: "¿Atienden de manera presencial y online?",
              a: "Sí, coordinamos reuniones presenciales en el estudio o videollamada confidencial para agilizar tus tiempos.",
            },
            {
              q: "¿Garantizan confidencialidad absoluta?",
              a: "Toda consulta y documentación recibida está protegida por estricto secreto profesional y cumplimiento de la Ley 25.326.",
            },
          ],
        };
      },
    },
  ],
  clinica: [
    {
      id: "clinica-integral",
      label: "Centro Médico & Diagnóstico de Alta Complejidad",
      build(nombre) {
        return {
          rol: "Centro Médico Especializado · Diagnóstico & Tratamientos Integrales",
          subtitulo: "Centro Médico de Alta Complejidad",
          tagline: "Especialistas acreditados, diagnóstico preciso y turnos sin demoras interminables",
          titulo: "Medicina especializada y diagnóstico integral con *precisión y calidez humana*",
          bajada: "Turnos ágiles, equipo médico multidisciplinario y seguimiento cercano desde tu primera valoración diagnóstica hasta el alta clínica.",
          bio: `${nombre} reúne profesionales especializados y tecnología diagnóstica actualizada para ofrecer respuestas médicas concretas, sin derivaciones dispersas ni esperas eternas.`,
          enfoque: `Centralizamos tu evaluación, los estudios complementarios y el seguimiento en un protocolo claro con presupuestos transparentes y acompañamiento directo.`,
          problema: `Conseguir un turno médico serio suele significar semanas de espera, consultas apuradas de 10 minutos y falta de seguimiento claro entre estudios.`,
          casos: [
            {
              titulo: "Diagnóstico Temprano & Plan Unificado",
              descripcion: "Evaluación interdisciplinaria con informe clínico completo en una sola jornada.",
              resultado: "Inicio rápido del tratamiento indicado sin perder semanas entre derivaciones.",
            },
            {
              titulo: "Seguimiento Post-Tratamiento 24/7",
              descripcion: "Acompañamiento médico directo por WhatsApp y controles programados de evolución.",
              resultado: "Alta adherencia clínica y tranquilidad total para el paciente y su familia.",
            },
          ],
          faq: [
            {
              q: "¿Cómo agendo una consulta inicial?",
              a: "Tocá el botón de WhatsApp o calendario online, elegí tu disponibilidad y nuestro equipo te confirma el turno en el acto.",
            },
            {
              q: "¿Emiten factura para reintegros en prepagas?",
              a: "Sí, entregamos factura e informe médico detallado para que gestiones el reintegro correspondiente ante tu cobertura.",
            },
            {
              q: "¿Atienden casos complejos o segundas opiniones?",
              a: "Sí, realizamos valoraciones integrales revisando tus estudios previos para darte una segunda opinión fundada.",
            },
            {
              q: "¿Cómo protegen mi historia clínica?",
              a: "Todo contacto e historial médico se resguarda bajo secreto profesional y la Ley 25.326 de Protección de Datos.",
            },
          ],
        };
      },
    },
  ],
};

export function resolveCanonicalTemplateForRubro(vertical = "nutricionista") {
  const clean = String(vertical || "nutricionista").toLowerCase().trim();
  if (["clinica", "odontologo"].includes(clean)) {
    return { archetype: "architectural-prestige", templateVersion: "clinica@2.0.0", folder: "clinica" };
  }
  if (["dermatologia", "estetica", "cirugia", "medico", "dermatologo"].includes(clean)) {
    return { archetype: "clinical-pure", templateVersion: "dermatologia@1.0.0", folder: "dermatologia" };
  }
  if (clean === "abogado") {
    return { archetype: "obsidian-authority", templateVersion: "abogado@2.0.0", folder: "abogado" };
  }
  if (["deportes", "kinesiologo", "gym", "entrenador", "fitness"].includes(clean)) {
    return { archetype: "kinetic-performance", templateVersion: "deportes@1.0.0", folder: "deportes" };
  }
  if (["corporativo", "consultor"].includes(clean)) {
    return { archetype: "high-ticket-consulting", templateVersion: "corporativo@2.0.0", folder: "corporativo" };
  }
  if (["tech", "software", "sistemas"].includes(clean)) {
    return { archetype: "tech-editorial-system", templateVersion: "tech@1.0.0", folder: "tech" };
  }
  if (["producto", "hardware", "iluminacion", "lamparas", "equipamiento"].includes(clean)) {
    return { archetype: "minimalist-hardware", templateVersion: "producto@1.0.0", folder: "producto" };
  }
  if (["construccion", "pavimentacion", "vial", "ingenieria"].includes(clean)) {
    return { archetype: "industrial-authority", templateVersion: "construccion@1.0.0", folder: "construccion" };
  }
  return { archetype: "editorial-classic", templateVersion: "nutricionista@1.0.0", folder: "nutricionista" };
}

export const RUBRO_BRANDING_MAP = {
  nutricionista: [CONTEXTUAL_BRANDING_PALETTES[0], CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[2], CONTEXTUAL_BRANDING_PALETTES[3]],
  psicologo: [CONTEXTUAL_BRANDING_PALETTES[2], CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[3], CONTEXTUAL_BRANDING_PALETTES[0]],
  abogado: [
    {
      name: "Kümmerlein Classic (Original)",
      primary: "#f7f788",
      accent: "#686155",
      fondo: "#f6f6f4",
      tinta: "#111111",
      fuente: "Space Grotesk",
      fuente_sans: "Inter",
    },
    {
      name: "Obsidian Authority",
      primary: "#f7f788",
      accent: "#D97706",
      fondo: "#090D16",
      tinta: "#F1F5F9",
      fuente: "Space Grotesk",
      fuente_sans: "Inter",
    },
    CONTEXTUAL_BRANDING_PALETTES[3],
    CONTEXTUAL_BRANDING_PALETTES[2],
  ],
  odontologo: [
    {
      name: "Stone Emerald",
      primary: "#003934",
      accent: "#1a9e8f",
      fondo: "#e8e7e5",
      tinta: "#0f172a",
      fuente: "Plus Jakarta Sans",
      fuente_sans: "Inter",
    },
    {
      name: "Dark Obsidian Teal",
      primary: "#1a9e8f",
      accent: "#4db6ac",
      fondo: "#003934",
      tinta: "#e8e7e5",
      fuente: "Plus Jakarta Sans",
      fuente_sans: "Inter",
    },
    CONTEXTUAL_BRANDING_PALETTES[3],
    CONTEXTUAL_BRANDING_PALETTES[1],
  ],
  kinesiologo: [
    {
      name: "Kinetic Emerald",
      primary: "#10b981",
      accent: "#ffffff",
      fondo: "#0f1419",
      tinta: "#ffffff",
      fuente: "display",
      fuente_sans: "diatype",
    },
    CONTEXTUAL_BRANDING_PALETTES[3],
    CONTEXTUAL_BRANDING_PALETTES[1],
    CONTEXTUAL_BRANDING_PALETTES[0],
  ],
  estetica: [
    {
      name: "Clinical Pure",
      primary: "#0284c7",
      accent: "#e0f2fe",
      fondo: "#f8fafc",
      tinta: "#0f172a",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    {
      name: "Lipedema Warm Clinic",
      primary: "#c25e68",
      accent: "#efe1d4",
      fondo: "#fbf2e9",
      tinta: "#372426",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    {
      name: "Dermato Teal",
      primary: "#0d9488",
      accent: "#ccfbf1",
      fondo: "#f0fdfa",
      tinta: "#134e4a",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    {
      name: "Obsidian Clinical",
      primary: "#38bdf8",
      accent: "#1e293b",
      fondo: "#0b1120",
      tinta: "#f8fafc",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
  ],
  dermatologia: [
    {
      name: "Clinical Pure",
      primary: "#0284c7",
      accent: "#e0f2fe",
      fondo: "#f8fafc",
      tinta: "#0f172a",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    {
      name: "Dermato Teal",
      primary: "#0d9488",
      accent: "#ccfbf1",
      fondo: "#f0fdfa",
      tinta: "#134e4a",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    CONTEXTUAL_BRANDING_PALETTES[2],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
  cirugia: [
    {
      name: "Clinical Pure",
      primary: "#0284c7",
      accent: "#e0f2fe",
      fondo: "#f8fafc",
      tinta: "#0f172a",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    {
      name: "Dermato Teal",
      primary: "#0d9488",
      accent: "#ccfbf1",
      fondo: "#f0fdfa",
      tinta: "#134e4a",
      fuente: "GothicCompact",
      fuente_sans: "GroteskText",
    },
    CONTEXTUAL_BRANDING_PALETTES[2],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
  clinica: [
    {
      name: "Stone Emerald",
      primary: "#003934",
      accent: "#1a9e8f",
      fondo: "#e8e7e5",
      tinta: "#0f172a",
      fuente: "Plus Jakarta Sans",
      fuente_sans: "Inter",
    },
    CONTEXTUAL_BRANDING_PALETTES[3],
    CONTEXTUAL_BRANDING_PALETTES[1],
    CONTEXTUAL_BRANDING_PALETTES[0],
  ],
  corporativo: [
    {
      name: "Tactical Onyx",
      primary: "#ff891d",
      accent: "#888888",
      fondo: "#090909",
      tinta: "#f4f4f4",
      fuente: "Plus Jakarta Sans",
      fuente_sans: "Inter",
    },
    CONTEXTUAL_BRANDING_PALETTES[3],
    CONTEXTUAL_BRANDING_PALETTES[0],
    CONTEXTUAL_BRANDING_PALETTES[1],
  ],
  consultor: [
    {
      name: "Tactical Onyx",
      primary: "#ff891d",
      accent: "#888888",
      fondo: "#090909",
      tinta: "#f4f4f4",
      fuente: "Plus Jakarta Sans",
      fuente_sans: "Inter",
    },
    CONTEXTUAL_BRANDING_PALETTES[3],
    CONTEXTUAL_BRANDING_PALETTES[0],
    CONTEXTUAL_BRANDING_PALETTES[1],
  ],
  tech: [
    {
      name: "Think Vanilla",
      primary: "#ff2c17",
      accent: "#b6ffff",
      fondo: "#fdffee",
      tinta: "#031b36",
      fuente: "Bagoss",
      fuente_sans: "ABC Diatype",
    },
    CONTEXTUAL_BRANDING_PALETTES[1],
    CONTEXTUAL_BRANDING_PALETTES[0],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
  software: [
    {
      name: "Think Vanilla",
      primary: "#ff2c17",
      accent: "#b6ffff",
      fondo: "#fdffee",
      tinta: "#031b36",
      fuente: "Bagoss",
      fuente_sans: "ABC Diatype",
    },
    CONTEXTUAL_BRANDING_PALETTES[1],
    CONTEXTUAL_BRANDING_PALETTES[0],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
  deportes: [
    {
      name: "Kinetic Emerald",
      primary: "#10b981",
      accent: "#ffffff",
      fondo: "#0f1419",
      tinta: "#ffffff",
      fuente: "display",
      fuente_sans: "diatype",
    },
    {
      name: "Performance Red",
      primary: "#ff350d",
      accent: "#ffffff",
      fondo: "#171717",
      tinta: "#f2f2f2",
      fuente: "display",
      fuente_sans: "diatype",
    },
    CONTEXTUAL_BRANDING_PALETTES[1],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
  producto: [
    {
      name: "Minimalist Hardware",
      primary: "#2563eb",
      accent: "#60a5fa",
      fondo: "#0a0a0a",
      tinta: "#fafafa",
      fuente: "Averta",
      fuente_sans: "Averta",
    },
    {
      name: "Matte Aluminum",
      primary: "#71717a",
      accent: "#a1a1aa",
      fondo: "#121214",
      tinta: "#f4f4f5",
      fuente: "Averta",
      fuente_sans: "Averta",
    },
    {
      name: "Circadian Amber",
      primary: "#f59e0b",
      accent: "#fbbf24",
      fondo: "#0d0b09",
      tinta: "#fffaf5",
      fuente: "Averta",
      fuente_sans: "Averta",
    },
    {
      name: "Pure Daylight",
      primary: "#38bdf8",
      accent: "#93c5fd",
      fondo: "#080b11",
      tinta: "#f8fafc",
      fuente: "Averta",
      fuente_sans: "Averta",
    },
  ],
  construccion: [
    {
      name: "Safety Amber & Asphalt",
      primary: "#f59e0b",
      accent: "#44403c",
      fondo: "#1c1917",
      tinta: "#fafaf9",
      fuente: "Tahoma",
      fuente_sans: "Barlow",
    },
    {
      name: "Concrete Light",
      primary: "#f59e0b",
      accent: "#292524",
      fondo: "#fafaf9",
      tinta: "#1c1917",
      fuente: "Tahoma",
      fuente_sans: "Barlow",
    },
    CONTEXTUAL_BRANDING_PALETTES[0],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
  pavimentacion: [
    {
      name: "Safety Amber & Asphalt",
      primary: "#f59e0b",
      accent: "#44403c",
      fondo: "#1c1917",
      tinta: "#fafaf9",
      fuente: "Tahoma",
      fuente_sans: "Barlow",
    },
    {
      name: "Concrete Light",
      primary: "#f59e0b",
      accent: "#292524",
      fondo: "#fafaf9",
      tinta: "#1c1917",
      fuente: "Tahoma",
      fuente_sans: "Barlow",
    },
    CONTEXTUAL_BRANDING_PALETTES[0],
    CONTEXTUAL_BRANDING_PALETTES[3],
  ],
};

export const DEFAULT_ALTERNATIVE_PALETTES = [
  {
    nombre: "Obsidian Gold",
    fondo: "#090D16",
    tinta: "#F1F5F9",
    primary: "#D97706",
    accent: "#B45309",
  },
  {
    nombre: "Clinical Cyan",
    fondo: "#F8FAFC",
    tinta: "#0F172A",
    primary: "#0284C7",
    accent: "#38BDF8",
  },
  {
    nombre: "Warm Terracotta",
    fondo: "#FAF6F0",
    tinta: "#2C2523",
    primary: "#B45309",
    accent: "#F59E0B",
  },
];

export function generateAlternativePalettes(mainPalette = {}) {
  const primaryOption = {
    nombre: mainPalette.name || mainPalette.nombre || "Original (Principal)",
    fondo: mainPalette.fondo || "#fcf3ed",
    tinta: mainPalette.tinta || "#35221a",
    primary: mainPalette.primary || "#e70025",
    accent: mainPalette.accent || "#e3c1ad",
  };

  const alternatives = DEFAULT_ALTERNATIVE_PALETTES.map((pal) => ({
    nombre: pal.nombre,
    fondo: pal.fondo,
    tinta: pal.tinta,
    primary: pal.primary,
    accent: pal.accent,
  }));

  return [primaryOption, ...alternatives];
}

function normalizeRubroKey(raw = "") {
  const clean = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (clean.includes("psic")) return "psicologo";
  if (clean.includes("abog") || clean.includes("jurid") || clean.includes("legal")) return "abogado";
  if (clean.includes("odont") || clean.includes("dent")) return "odontologo";
  if (clean.includes("kines") || clean.includes("fisio")) return "kinesiologo";
  if (clean.includes("cirug") || clean.includes("plast")) return "cirugia";
  if (clean.includes("derma")) return "dermatologia";
  if (clean.includes("estet")) return "estetica";
  if (clean.includes("clin") || clean.includes("medic")) return "clinica";
  if (clean.includes("deport") || clean.includes("gym") || clean.includes("entrena") || clean.includes("fit")) return "deportes";
  if (clean.includes("nutri")) return "nutricionista";
  const slugified = clean.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return slugified || "nutricionista";
}

function resolveDeterministicIndex(lead = {}, length = 4) {
  const slugStr = String(lead.slug || "");
  const slugMatch = slugStr.match(/^(\d+)-/);
  const numericSeed = Number(
    lead.sheet_id ?? lead.sheetId ?? lead.id ?? (slugMatch ? slugMatch[1] : NaN)
  );
  const baseIdx =
    Number.isFinite(numericSeed) && numericSeed > 0
      ? numericSeed - 1
      : hashSeed(slugStr || lead.nombre || "default");
  return ((baseIdx % length) + length) % length;
}

export function selectCopyAngle(lead = {}) {
  const rubroKey = normalizeRubroKey(lead.rubro || lead.nicho || lead.query || lead.slug || "nutricionista");
  const packGroup =
    RUBRO_COPY_PACKS[rubroKey] ||
    (rubroKey === "dermatologia" || rubroKey === "cirugia" ? RUBRO_COPY_PACKS.estetica : null);

  const providerName = lead.nombre || lead.displayName || "Profesional";

  if (packGroup && packGroup.length > 0) {
    const idx = resolveDeterministicIndex(lead, packGroup.length);
    const angle = packGroup[idx];
    return {
      angleId: angle.id,
      angleLabel: angle.label,
      ...angle.build(providerName),
    };
  }

  const idx = resolveDeterministicIndex(lead, HORMOZI_PAIN_ANGLES.length);
  const angle = HORMOZI_PAIN_ANGLES[idx];
  return {
    angleId: angle.id,
    angleLabel: angle.label,
    ...angle.build(providerName),
  };
}

export function selectContextualBranding(lead = {}) {
  const rubroKey = normalizeRubroKey(lead.rubro || lead.nicho || lead.query || lead.slug || "nutricionista");
  const palettes = RUBRO_BRANDING_MAP[rubroKey] || CONTEXTUAL_BRANDING_PALETTES;
  const baseIdx = resolveDeterministicIndex(lead, palettes.length);
  const highReputation = Number(lead.rating) >= 4.8 && Number(lead.userRatingCount) >= 50;
  const reputationShift = highReputation ? 1 : 0;
  const idx = (baseIdx + reputationShift) % palettes.length;
  const chosen = palettes[idx];
  const defaultOrder = highReputation
    ? ["Hero", "Reviews", "Problem", "Steps", "CaseStudy", "Pricing"]
    : ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"];
  return {
    rubro: rubroKey,
    paletteName: chosen.name,
    primary: lead.tema?.primary || chosen.primary,
    accent: lead.tema?.accent || chosen.accent,
    fondo: lead.tema?.fondo || chosen.fondo,
    tinta: lead.tema?.tinta || chosen.tinta,
    fuente: lead.tema?.fuente || chosen.fuente,
    fuente_sans: lead.tema?.fuente_sans || chosen.fuente_sans,
    orden_secciones: lead.tema?.orden_secciones || defaultOrder,
  };
}

export function buildContentOverridesForRubro({
  vertical,
  nombre,
  direccion,
  phoneDisplay,
  copy,
  rating,
  userRatingCount,
}) {
  const addr = direccion || "Ciudad Autónoma de Buenos Aires";
  const ratingStr = `${rating || "4.9"}★ (${userRatingCount || 15}+ reseñas)`;

  if (vertical === "odontologo" || vertical === "clinica") {
    const isOdonto = vertical === "odontologo";
    return {
      hero: {
        eyebrow: `${copy.subtitulo || "Especialidades Médicas"} · ${addr}`,
        tagline: `${copy.tagline || "Diagnóstico preciso y turnos sin esperas"} →`,
        card_caption: `Valoración diagnóstica integral en ${nombre}`,
        card_footer: "Turnos confirmados en el día, presupuesto cerrado y seguimiento cercano por WhatsApp.",
        stats: [
          { val: ratingStr, lbl: "Reputación verificada" },
          { val: "En el día", lbl: "Respuesta por WhatsApp" },
          { val: "100%", lbl: "Presupuesto cerrado" },
          { val: "Ley 25.326", lbl: "Privacidad clínica" },
        ],
      },
      marquee: {
        items: isOdonto
          ? [
              "Odontología Digital & Precisión",
              "Implantología & Estética Dental",
              "Presupuesto Cerrado por Escrito",
              "Turnos Prioritarios sin Demoras",
              "Apto Reintegro Prepagas",
              "Atención Personalizada",
            ]
          : [
              "Diagnóstico Médico de Precisión",
              "Turnos Ágiles sin Esperas",
              "Presupuesto Transparente",
              "Especialistas Acreditados",
              "Apto Reintegro Prepagas",
              "Seguimiento por WhatsApp",
            ],
      },
      team: {
        tag: "03 · DIRECCIÓN Y EQUIPO",
        titulo: `Atención directa y *respaldo profesional* en ${nombre}`,
        bajada: `Cada consulta es evaluada personalmente con criterios clínicos actualizados y trato humano en ${addr}.`,
        members: [
          {
            nombre,
            cargo: copy.rol || "Dirección Clínica & Atención Personalizada",
            matricula: "Matrícula Nacional / Provincial Verificada",
            especialidad: copy.subtitulo || "Especialidad Clínica",
            resumen: copy.bio,
          },
        ],
      },
      booking: {
        tag: "07 · SOLICITUD DE TURNO",
        titulo: `Reservá tu valoración inicial en *${nombre}*`,
        bajada: copy.bajada,
        plan: "Primera Consulta de Valoración & Diagnóstico",
        precio_ars: 0,
        precio_label: "Coordinación directa por WhatsApp o agenda digital · Sin vueltas",
        precio_sub: `Consultorio ubicado en ${addr}. Atención ágil y confirmación inmediata de horario.`,
      },
      final_cta: {
        titulo: `Cuidá tu ${isOdonto ? "sonrisa" : "salud"} con *respaldo real en ${nombre}*`,
        bajada: "Coordiná hoy tu consulta diagnóstica por WhatsApp y despejá todas tus dudas antes de avanzar.",
      },
      footer: {
        blurb: `${nombre} · ${copy.rol || "Atención Médica Especializada"} · ${addr}.`,
        direccion: addr,
        telefono: phoneDisplay,
      },
    };
  }

  if (vertical === "estetica" || vertical === "dermatologia" || vertical === "cirugia") {
    return {
      hero: {
        badge: `${copy.subtitulo || "MEDICINA ESTÉTICA & DERMATOLOGÍA"} · ${addr}`.toUpperCase(),
        title: (copy.titulo || "").replace(/\*/g, ""),
        subtitle: copy.bajada,
        stat_1_value: `${rating || "4.9"}★`,
        stat_1_label: "Calificación verificada de pacientes reales en Google Maps",
        stat_2_value: "100%",
        stat_2_label: "Evaluación y seguimiento médico directo con protocolo seguro",
        cta_primary: "Solicitar Valoración por WhatsApp",
        cta_secondary: "Ver Protocolos",
      },
      symptom_assessment: {
        badge: "ENFOQUE CLÍNICO & VALORACIÓN",
        title: "En qué te ayudamos en consulta",
        subtitle: copy.problema,
        items: [
          { id: "01", title: "Evaluación Médica Personalizada", desc: "Diagnóstico facial y corporal detallado respetando tus facciones y prioridades." },
          { id: "02", title: "Protocolos Seguros & Trazables", desc: "Insumos médicos aprobados, dosis precisas y criterios de bioseguridad estricta." },
          { id: "03", title: "Resultados Naturales y Armónicos", desc: "Realzamos tu frescura y calidad de piel sin exageraciones ni rostros rígidos." },
          { id: "04", title: "Seguimiento Post-Tratamiento", desc: "Acompañamiento directo por WhatsApp para resolver cualquier duda tras la sesión." },
        ],
      },
      treatment_protocol: {
        badge: "INSTANCIAS DE ATENCIÓN",
        title: `Cómo trabajamos en ${nombre}`,
        subtitle: copy.enfoque,
        plans: [
          {
            id: "valoracion",
            name: "Consulta de Valoración & Diagnóstico Médico",
            price: "Turnos Directos",
            duration: "Atención personalizada · Presencial",
            desc: "Evaluamos tu piel, analizamos objetivos y armamos un plan gradual a tu medida.",
            features: [
              "Diagnóstico clínico médico completo",
              "Plan de sesiones claro y sin sorpresas",
              "Indicaciones previas y cuidados domiciliarios",
            ],
            cta: "Consultar Disponibilidad",
            popular: true,
          },
          {
            id: "protocolo",
            name: "Protocolo Combinado & Seguimiento",
            price: "Plan a Medida",
            duration: "Control evolutivo por WhatsApp",
            desc: "Aplicación médica combinada de procedimientos mínimamente invasivos con control cercano.",
            features: [
              "Insumos médicos certificados y trazables",
              "Retorno rápido a tu rutina habitual",
              "Control post-aplicación incluido",
            ],
            cta: "Agendar por WhatsApp",
            popular: false,
          },
        ],
      },
      clinical_outcomes: {
        badge: "POR QUÉ ELEGIRNOS",
        title: `Confianza médica y criterio estético en ${nombre}`,
        subtitle: copy.tagline,
        advantages: [
          { icon: "/icons/Group-10.svg", title: "Criterio Médico Real", desc: "Diagnóstico clínico honesto realizado por profesionales matriculados." },
          { icon: "/icons/Group-12.svg", title: "Protocolos Personalizados", desc: "Cada rostro y piel requieren dosis, técnicas y tiempos propios." },
          { icon: "/icons/Group-2564.svg", title: "Tecnología & Bioseguridad", desc: "Insumos médicos aprobados con trazabilidad y estándares clínicos estrictos." },
          { icon: "/icons/Group-2565.svg", title: "Resultados Naturales", desc: "Realzamos tu frescura y armonía sin exageraciones ni apariencias artificiales." },
          { icon: "/icons/Group-2566.svg", title: "Seguimiento Cercano", desc: "Acompañamiento directo por WhatsApp antes y después de cada sesión." },
        ],
        testimonials: [
          {
            nombre: "Paciente Verificada",
            edad: "Google Maps",
            estadio: "Atención en consultorio",
            texto: `Excelente atención en ${nombre}. Me explicaron cada paso con calidez, puntualidad y resultados súper naturales.`,
            rating: 5,
          },
        ],
      },
      faq: {
        tag: "PREGUNTAS FRECUENTES",
        titulo: "Dudas habituales sobre tu consulta",
        bajada: `Respuestas claras sobre diagnóstico médico, protocolos estéticos y turnos en ${nombre}.`,
      },
      medical_booking: {
        badge: "TURNOS & VALORACIÓN",
        title: `Reservá tu consulta en ${nombre}`,
        subtitle: `Atención en ${addr}. Escribinos directo por WhatsApp para coordinar el mejor día y horario.`,
        garantia: "Claridad total desde el primer minuto: conocemos tus objetivos, revisamos tu historia clínica y te indicamos únicamente lo que realmente te favorece.",
        direct_whatsapp: "Consultar Turnos por WhatsApp",
        direct_calendar: "Agendar Online",
      },
      final_cta: {
        badge: "CUIDADO MÉDICO & ARMONÍA",
        title: "¿Querés una evaluación médica honesta para tu piel?",
        subtitle: `Escribinos hoy a ${nombre} (${addr}) y coordiná tu consulta personalizada sin vueltas.`,
        btn: "Solicitar Turno por WhatsApp",
      },
      cta: {
        titulo: "¿Querés una evaluación médica honesta para tu piel?",
        subtitulo: `Escribinos hoy a ${nombre} (${addr}) y coordiná tu consulta personalizada.`,
        boton: "Solicitar Turno por WhatsApp",
      },
      footer: {
        legal: `${nombre} · Medicina Estética y Atención Especializada. La información publicada es orientativa y no reemplaza la consulta médica presencial.`,
        compliance: "Cumplimiento Ley 25.326 de Protección de Datos Personales de la República Argentina.",
        direccion: addr,
        horario: "Turnos con reserva previa por WhatsApp",
      },
    };
  }

  if (vertical === "abogado") {
    return {
      hero: {
        eyebrow: `${copy.subtitulo || "Estudio Jurídico"} · ${addr}`,
        card_caption: `Estrategia legal clara en ${nombre}`,
        card_footer: "Evaluamos tu caso en profundidad, medimos riesgos reales y actuamos con celeridad.",
      },
      attorneys: {
        tag: "DIRECCIÓN LEGAL",
        titulo: `Respaldo directo de *${nombre}* en cada etapa`,
        bajada: `Atención confidencial y seguimiento ejecutivo en ${addr}.`,
        members: [
          {
            nombre,
            cargo: copy.rol || "Socio Director · Estrategia Legal",
            credencial: "Matrícula Profesional Verificada",
            iniciales: nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "A").join(""),
          },
        ],
      },
      footer: {
        blurb: `${nombre} · ${copy.rol || "Estudio Jurídico"} · ${addr}.`,
        direccion: addr,
        telefono: phoneDisplay,
      },
    };
  }

  return null;
}

async function main() {
  const { rawJsonPath, flags } = parseArgs();

  if (!rawJsonPath) {
    console.error(`\x1b[31m[generate-fiche ERROR]\x1b[0m Falta la ruta al archivo JSON raw del lead. Ejemplo:
  node scripts/generate-client-fiche.mjs assets/demo-nutri-camila/lead-raw.json`);
    process.exit(2);
  }

  const absRawPath = resolve(process.cwd(), rawJsonPath);
  if (!existsSync(absRawPath)) {
    console.error(`\x1b[31m[generate-fiche ERROR]\x1b[0m Archivo no encontrado: ${absRawPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(readFileSync(absRawPath, "utf8"));
  const slug = rawData.slug || basename(dirname(absRawPath));
  const cleanPhone = String(rawData.telefono || "").replace(/\D/g, "");

  if (!cleanPhone) {
    console.warn(`\x1b[33m[generate-fiche AVISO]\x1b[0m El lead no tiene teléfono detectado. Se requerirá completar WhatsApp.`);
  }

  // Correlatividad con Google Sheets (sheet_id) y metadatos de ciclo de vida (TTL 7 días)
  const slugIdMatch = slug.match(/^(\d+)-/);
  const sheetId = Number(
    flags["sheet-id"] ??
      rawData.sheet_id ??
      rawData.sheetId ??
      (slugIdMatch ? slugIdMatch[1] : rawData.id ?? 0)
  );
  const todayStr = new Date().toISOString().split("T")[0];
  const createdAt = rawData.created_at || todayStr;
  const lastActivityAt = rawData.last_activity_at || createdAt;
  const expiresAt = rawData.expires_at || addDaysToIsoDate(lastActivityAt, 7);
  const leadStatus = rawData.lead_status || "1. Prospecto Identificado";
  const vertical = normalizeRubroKey(rawData.rubro || rawData.nicho || rawData.query || slug);
  const canonicalTemplate = resolveCanonicalTemplateForRubro(vertical);
  const templateVersion = rawData.template_version || canonicalTemplate.templateVersion;
  const templateArchetype = rawData.template_archetype || canonicalTemplate.archetype;

  // Fallback inteligente para agendamiento: si no tiene Calendly, apuntar el CTA a WhatsApp con mensaje predeterminado
  const fallbackWaBooking = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=Hola!%20Quiero%20agendar%20mi%20primera%20consultor%C3%ADa%20gratuita`
    : "";
  const calendlyUrl = (rawData.website && rawData.website.includes("calendly.com"))
    ? rawData.website
    : fallbackWaBooking;

  console.log(`\x1b[36m[generate-fiche]\x1b[0m Redactando ficha para ${rawData.nombre} (Slug: ${slug}, Sheet ID: ${sheetId}, Template: ${templateVersion})...`);

  let copy = null;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log(`[generate-fiche] Optimizando copy persuasivo con Gemini Flash API...`);
    copy = await enhanceWithGemini(rawData, geminiKey);
  }

  if (!copy) {
    copy = selectCopyAngle({ ...rawData, rubro: vertical, sheet_id: sheetId, slug });
  }

  const branding = selectContextualBranding({ ...rawData, rubro: vertical, sheet_id: sheetId, slug });
  const phoneDisplay = rawData.telefonoFormato || (cleanPhone ? `+${cleanPhone}` : "");
  const contentOverrides =
    rawData.content_overrides ||
    buildContentOverridesForRubro({
      vertical,
      nombre: rawData.nombre,
      direccion: rawData.direccion,
      phoneDisplay,
      copy,
      rating: rawData.rating,
      userRatingCount: rawData.userRatingCount,
    });

  // Reseñas oficiales atribuidas a Google Maps
  const reviewsMarkdown = (rawData.reviews && rawData.reviews.length > 0)
    ? rawData.reviews
        .map((r) => `- **${r.author} (Google Maps)**: "${r.text.replace(/\r?\n/g, ' ')}"`)
        .join("\n")
    : `- **Paciente Verificado (Google Maps)**: "Excelente atención, calidez profesional y seguimiento claro desde la primera consulta."`;

  const casesMarkdown = copy.casos
    .map((c) => `- **${c.titulo}**: ${c.descripcion}. Resultado: ${c.resultado}`)
    .join("\n");

  const faqMarkdown = copy.faq
    .map((f) => `- **${f.q}**: ${f.a}`)
    .join("\n");

  const alternativePalettes = generateAlternativePalettes(branding);
  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const escYaml = (v) => JSON.stringify(String(v ?? ""));

  const formatPalettesYaml = (pals) => {
    return pals
      .map(
        (p) => `  - nombre: ${escYaml(p.nombre)}
    fondo: ${escYaml(p.fondo)}
    tinta: ${escYaml(p.tinta)}
    primary: ${escYaml(p.primary)}
    accent: ${escYaml(p.accent)}`
      )
      .join("\n");
  };

  const extraFieldsLines = [
    copy.rol ? `rol: ${escYaml(copy.rol)}` : null,
    copy.subtitulo ? `subtitulo: ${escYaml(copy.subtitulo)}` : null,
    copy.tagline ? `tagline: ${escYaml(copy.tagline)}` : null,
    copy.titulo ? `titulo: ${escYaml(copy.titulo)}` : null,
    copy.bajada ? `bajada: ${escYaml(copy.bajada)}` : null,
    rawData.direccion ? `direccion: ${escYaml(rawData.direccion)}` : null,
    phoneDisplay ? `telefono_display: ${escYaml(phoneDisplay)}` : null,
  ].filter(Boolean);

  const overridesBlock = contentOverrides
    ? stringifyYaml({ content_overrides: contentOverrides }, { lineWidth: 0 }).trimEnd()
    : "";

  const clientMdContent = `---
id: ${sheetId || Date.now().toString().slice(-4)}
sheet_id: ${sheetId}
lead_status: ${escYaml(leadStatus)}
created_at: ${escYaml(createdAt)}
last_activity_at: ${escYaml(lastActivityAt)}
expires_at: ${escYaml(expiresAt)}
rubro: ${vertical}
template_archetype: ${escYaml(templateArchetype)}
template_version: ${escYaml(templateVersion)}
nombre: ${escYaml(rawData.nombre)}
${extraFieldsLines.length > 0 ? extraFieldsLines.join("\n") + "\n" : ""}slug: ${escYaml(slug)}
estado: prospecto
subdominio: ${escYaml(`preview.${rootDomain}/${slug}/`)}
whatsapp: ${escYaml(cleanPhone || "5491100000000")}
calendly: ${escYaml(calendlyUrl)}
google_maps: ${escYaml(rawData.website || `https://maps.google.com/?cid=gmp-${rawData.placeId || slug}`)}
instagram: ${escYaml(rawData.website || "")}
tema:
  nombre: ${escYaml(branding.paletteName || "Original")}
  primary: ${escYaml(branding.primary)}
  accent: ${escYaml(branding.accent)}
  fondo: ${escYaml(branding.fondo)}
  tinta: ${escYaml(branding.tinta)}
  fuente: ${escYaml(branding.fuente)}
  fuente_sans: ${escYaml(branding.fuente_sans)}
  orden_secciones: ${JSON.stringify(branding.orden_secciones)}
paletas_alternativas:
${formatPalettesYaml(alternativePalettes)}
${overridesBlock ? overridesBlock + "\n" : ""}consentimiento_testimonios: false
setup_ars: 189999
abono_ars: 0
mes_de_prueba: true
metricas:
  agendadas_mes: 0
  concretadas_mes: 0
---

## Bio
${copy.bio}

## Enfoque
${copy.enfoque}

## Problema
${copy.problema}

## Reseñas
${reviewsMarkdown}

## Casos de éxito
${casesMarkdown}

## Preguntas frecuentes
${faqMarkdown}

## Notas internas
- Lead generado automáticamente por pipeline NexoBow vía scout-lead.
- Correlatividad Google Sheets: Fila ID #${sheetId} (${leadStatus}).
- Vigencia de servidor activo: vence el ${expiresAt} (7 días desde última actividad).
- Origen de datos: ${rawData.source || "Google Maps Platform (Places API New)"}.
- Rating detectado: ${rawData.rating}★ (${rawData.userRatingCount} opiniones públicas).
- Fallback de agendamiento: ${calendlyUrl.includes("wa.me") ? "WhatsApp directo con mensaje de reserva" : "Calendly detectado"}.
`;

  const clientFilePath = join(REPO_ROOT, "clients", `${slug}.md`);
  writeFileSync(clientFilePath, clientMdContent, "utf8");

  console.log(`
\x1b[32m=======================================================
✓ FICHA GENERADA CON ÉXITO: clients/${slug}.md
=======================================================\x1b[0m
- Cliente: \x1b[1m${rawData.nombre}\x1b[0m (Sheet ID: ${sheetId})
- Template: ${templateVersion} (${templateArchetype})
- Vigencia Demo (7d): ${createdAt} → ${expiresAt}
- WhatsApp: ${cleanPhone || "Requerido"}
- CTA Agendamiento: ${calendlyUrl}
- Compliance Ley 25.326: consentimiento_testimonios: false (Reseñas Google Maps)
- Archivo generado: ${clientFilePath}
- Siguiente paso: npm run build-site clients/${slug}.md
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\x1b[31m[generate-fiche ERROR FATAL]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
