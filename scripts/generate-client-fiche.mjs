// scripts/generate-client-fiche.mjs — NexoBow: generación de ficha /clients/{slug}.md con copywriting Hormozi, correlatividad Sheets y TTL 7 días
// Uso: node scripts/generate-client-fiche.mjs assets/22-alejandra-martinez-nutri/lead-raw.json [--sheet-id 22]
// Códigos de salida: 0 = ok · 1 = error técnico · 2 = datos insuficientes

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

export const RUBRO_BRANDING_MAP = {
  nutricionista: [CONTEXTUAL_BRANDING_PALETTES[0], CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[2], CONTEXTUAL_BRANDING_PALETTES[3]],
  psicologo: [CONTEXTUAL_BRANDING_PALETTES[2], CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[3], CONTEXTUAL_BRANDING_PALETTES[0]],
  abogado: [CONTEXTUAL_BRANDING_PALETTES[3], CONTEXTUAL_BRANDING_PALETTES[0], CONTEXTUAL_BRANDING_PALETTES[2], CONTEXTUAL_BRANDING_PALETTES[1]],
  odontologo: [CONTEXTUAL_BRANDING_PALETTES[3], CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[0], CONTEXTUAL_BRANDING_PALETTES[2]],
  kinesiologo: [CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[3], CONTEXTUAL_BRANDING_PALETTES[0], CONTEXTUAL_BRANDING_PALETTES[2]],
  estetica: [CONTEXTUAL_BRANDING_PALETTES[2], CONTEXTUAL_BRANDING_PALETTES[0], CONTEXTUAL_BRANDING_PALETTES[1], CONTEXTUAL_BRANDING_PALETTES[3]],
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
  if (clean.includes("abog") || clean.includes("jurid")) return "abogado";
  if (clean.includes("odont") || clean.includes("dent")) return "odontologo";
  if (clean.includes("kines") || clean.includes("fisio")) return "kinesiologo";
  if (clean.includes("estet") || clean.includes("derma")) return "estetica";
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
  const idx = resolveDeterministicIndex(lead, HORMOZI_PAIN_ANGLES.length);
  const angle = HORMOZI_PAIN_ANGLES[idx];
  const providerName = lead.nombre || lead.displayName || "Profesional";
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
  const templateVersion = rawData.template_version || `${vertical}@1.0.0`;

  // Fallback inteligente para agendamiento: si no tiene Calendly, apuntar el CTA a WhatsApp con mensaje predeterminado
  const fallbackWaBooking = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=Hola!%20Quiero%20agendar%20mi%20primera%20consultor%C3%ADa%20gratuita`
    : "";
  const calendlyUrl = (rawData.website && rawData.website.includes("calendly.com"))
    ? rawData.website
    : fallbackWaBooking;

  console.log(`\x1b[36m[generate-fiche]\x1b[0m Redactando ficha para ${rawData.nombre} (Slug: ${slug}, Sheet ID: ${sheetId})...`);

  let copy = null;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log(`[generate-fiche] Optimizando copy persuasivo con Gemini Flash API...`);
    copy = await enhanceWithGemini(rawData, geminiKey);
  }

  if (!copy) {
    copy = selectCopyAngle({ ...rawData, sheet_id: sheetId, slug });
  }

  const branding = selectContextualBranding({ ...rawData, rubro: vertical, sheet_id: sheetId, slug });

  // Reseñas oficiales atribuidas a Google Maps
  const reviewsMarkdown = (rawData.reviews && rawData.reviews.length > 0)
    ? rawData.reviews
        .map((r) => `- **${r.author} (Google Maps)**: "${r.text.replace(/\r?\n/g, ' ')}"`)
        .join("\n")
    : `- **Paciente Verificado (Google Maps)**: "Excelente atención y seguimiento. Muy profesional y con planes realistas."`;

  const casesMarkdown = copy.casos
    .map((c) => `- **${c.titulo}**: ${c.descripcion}. Resultado: ${c.resultado}`)
    .join("\n");

  const faqMarkdown = copy.faq
    .map((f) => `- **${f.q}**: ${f.a}`)
    .join("\n");

  const templateArchetype = rawData.template_archetype || "editorial-classic";
  const alternativePalettes = generateAlternativePalettes(branding);

  const formatPalettesYaml = (pals) => {
    return pals
      .map(
        (p) => `  - nombre: "${p.nombre}"
    fondo: "${p.fondo}"
    tinta: "${p.tinta}"
    primary: "${p.primary}"
    accent: "${p.accent}"`
      )
      .join("\n");
  };

  const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
  const clientMdContent = `---
id: ${sheetId || Date.now().toString().slice(-4)}
sheet_id: ${sheetId}
lead_status: "${leadStatus}"
created_at: "${createdAt}"
last_activity_at: "${lastActivityAt}"
expires_at: "${expiresAt}"
rubro: ${vertical}
template_archetype: "${templateArchetype}"
template_version: "${templateVersion}"
nombre: "${rawData.nombre}"
slug: "${slug}"
estado: prospecto
subdominio: "preview.${rootDomain}/${slug}/"
whatsapp: "${cleanPhone || "5491100000000"}"
calendly: "${calendlyUrl}"
google_maps: "${rawData.website || "https://maps.google.com/?cid=gmp-" + (rawData.placeId || slug)}"
instagram: "${rawData.website || ""}"
tema:
  nombre: "${branding.paletteName || "Editorial Delta"}"
  primary: "${branding.primary}"
  accent: "${branding.accent}"
  fondo: "${branding.fondo}"
  tinta: "${branding.tinta}"
  fuente: "${branding.fuente}"
  fuente_sans: "${branding.fuente_sans}"
  orden_secciones: ${JSON.stringify(branding.orden_secciones)}
paletas_alternativas:
${formatPalettesYaml(alternativePalettes)}
consentimiento_testimonios: false
setup_ars: 189999
abono_ars: 12259
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
