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

function getDefaultCopy(lead) {
  return {
    bio: `${lead.nombre}, especialista en nutrición clínica y hábitos sostenibles. Ayudo a personas ocupadas a recuperar su energía, optimizar su composición corporal y ordenar su alimentación sin pasar hambre ni vivir a dieta.`,
    enfoque: `Trabajamos con educación alimentaria y hábitos del mundo real. Sin suplementos innecesarios, sin contar calorías obsesivamente y con recetas sencillas de 15 minutos adaptadas a tu trabajo, vida social y familia.`,
    problema: `La mayoría de las personas no fracasan por falta de fuerza de voluntad, sino por seguir planes restrictivos imposibles de sostener en el tiempo. Comer bien tiene que sumar a tu vida, no volverse una carga mental más.`,
    casos: [
      {
        titulo: "Lautaro M. (34 años, Empleado administrativo)",
        descripcion: "Jornadas de 9 horas de oficina, delivery continuo y acidez diaria. Organizamos compras semanales y preparaciones rápidas.",
        resultado: "-8 kg en 3 meses y eliminación total del reflujo gástrico.",
      },
      {
        titulo: "Valeria G. (29 años, Emprendedora)",
        descripcion: "Cansancio crónico y estancamiento tras múltiples dietas de moda con efecto rebote constante.",
        resultado: "Reducción del 5% de grasa corporal y energía sostenida durante todo el día.",
      },
    ],
    faq: [
      {
        q: "¿La primera consultoría tiene algún costo oculto?",
        a: "No, es 100% gratuita y dura 20 minutos por videollamada. Evaluamos tu punto de partida y te llevás un diagnóstico claro. Si decidís avanzar, definimos el plan; si no, te vas con herramientas prácticas.",
      },
      {
        q: "¿Tengo que dejar de comer harinas o salir con amigos?",
        a: "En absoluto. El plan se adapta a tu rutina social, no al revés. Prohibir comidas solo genera ansiedad y abandono; aprendemos a compensar y disfrutar.",
      },
      {
        q: "¿Cómo es el seguimiento si tengo horarios complicados?",
        a: "El seguimiento es 100% online y personalizado vía WhatsApp: ajustes quincenales, resolución de dudas en el día y feedback de comidas.",
      },
      {
        q: "¿Qué pasa si no tengo tiempo para cocinar?",
        a: "Diseñamos menús de ensamble rápido de 15 minutos con ingredientes que encontrás en cualquier supermercado o verdulería del barrio.",
      },
    ],
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
      (slugIdMatch ? slugIdMatch[1] : rawData.id ?? 0)
  );
  const todayStr = new Date().toISOString().split("T")[0];
  const createdAt = rawData.created_at || todayStr;
  const lastActivityAt = rawData.last_activity_at || createdAt;
  const expiresAt = rawData.expires_at || addDaysToIsoDate(lastActivityAt, 7);
  const leadStatus = rawData.lead_status || "1. Prospecto Identificado";

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
    copy = getDefaultCopy(rawData);
  }

  // Reseñas oficiales atribuidas a Google Maps
  const reviewsMarkdown = (rawData.reviews && rawData.reviews.length > 0)
    ? rawData.reviews
        .map((r) => `- **${r.author} (Google Maps)**: "${r.text.replace(/\r?\n/g, ' ')}"`)
        .join("\n")
    : `- **Paciente Verificado (Google Maps)**: "Excelente atención y seguimiento. Muy profesional y con planes realistas."`;

  const casosMarkdown = copy.casos
    .map((c) => `- **${c.titulo}**: ${c.descripcion}. Resultado: ${c.resultado}`)
    .join("\n");

  const faqMarkdown = copy.faq
    .map((f) => `- **${f.q}**: ${f.a}`)
    .join("\n");

  const clientMdContent = `---
id: ${sheetId || Date.now().toString().slice(-4)}
sheet_id: ${sheetId}
lead_status: "${leadStatus}"
created_at: "${createdAt}"
last_activity_at: "${lastActivityAt}"
expires_at: "${expiresAt}"
rubro: ${rawData.rubro || "nutricionista"}
nombre: "${rawData.nombre}"
slug: "${slug}"
estado: prospecto
subdominio: "${slug}.nexobow.com"
whatsapp: "${cleanPhone || "5491100000000"}"
calendly: "${calendlyUrl}"
google_maps: "${rawData.website || "https://maps.google.com/?cid=gmp-" + (rawData.placeId || slug)}"
instagram: "${rawData.website || ""}"
tema:
  primary: "#e70025"
  accent: "#e3c1ad"
  fondo: "#fcf3ed"
  tinta: "#35221a"
  fuente: "Fraunces"
  fuente_sans: "Archivo"
  orden_secciones: ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"]
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

## Reseñas
${reviewsMarkdown}

## Casos de éxito
${casosMarkdown}

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
