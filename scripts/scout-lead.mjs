// scripts/scout-lead.mjs — NexoBow: extracción y enriquecimiento con Google Maps Platform (Places API New)
// Uso: node scripts/scout-lead.mjs --query "NutriAr, Belgrano 1221, Campana" [--slug nutriar] [--mock]
// Códigos de salida: 0 = ok · 1 = error técnico · 2 = datos insuficientes

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Cargar variables de entorno si existe .env
try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si no se puede cargar automáticamente
}

function parseArgs() {
  const args = process.argv.slice(2);
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
    }
  }
  return flags;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function inferRubroFromInput(raw = "") {
  const clean = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (clean.includes("psic")) return "psicologo";
  if (clean.includes("abog") || clean.includes("jurid")) return "abogado";
  if (clean.includes("odont") || clean.includes("dent")) return "odontologo";
  if (clean.includes("kines") || clean.includes("fisio")) return "kinesiologo";
  if (clean.includes("estet") || clean.includes("derma")) return "estetica";
  if (clean.includes("vet")) return "veterinaria";
  if (clean.includes("conta")) return "contador";
  if (clean.includes("arqu")) return "arquitecto";
  return "nutricionista";
}

function getMockLead(query, slug, rubro = "nutricionista") {
  return {
    source: "mock",
    query: query || "Lic. Camila Valenzuela - Nutrición & Salud Integral",
    slug: slug || "demo-nutri-camila",
    placeId: "places/ChIJN1t_tDeuEmsRUsoyG83frY4",
    nombre: "Lic. Camila Valenzuela",
    rubro,
    especialidad: "Nutrición Clínica y Composición Corporal",
    direccion: "Av. Corrientes 1234, CABA, Buenos Aires",
    telefono: "5491133445566",
    telefonoFormato: "+54 9 11 3344-5566",
    website: "https://instagram.com/camilanutri.ar",
    rating: 4.9,
    userRatingCount: 47,
    location: {
      latitude: -34.6037,
      longitude: -58.3816,
    },
    reviews: [
      {
        author: "Paula Fernández",
        rating: 5,
        text: "La mejor nutricionista que tuve. Me enseñó a comer de verdad sin prohibiciones. Super recomendada para personas con poco tiempo.",
        relativePublishTimeDescription: "hace 2 meses",
      },
      {
        author: "Gonzalo Ibarra",
        rating: 5,
        text: "Excelente profesional. Consultoría online super puntual y clara. El plan se adaptó 100% a mis horarios de trabajo.",
        relativePublishTimeDescription: "hace 3 semanas",
      },
      {
        author: "Mariana Soria",
        rating: 5,
        text: "Bajé 6 kg en 2 meses sin sufrir hambre y mejoré muchísimo mi digestión. La atención por WhatsApp para dudas diarias es genial.",
        relativePublishTimeDescription: "hace 1 mes",
      },
    ],
    assets: {
      avatarDownloaded: false,
      mapDownloaded: false,
      files: [],
    },
  };
}

async function searchSerperPlace(query, apiKey) {
  const url = 'https://google.serper.dev/places';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({
      q: query,
      gl: 'ar',
      hl: 'es',
      num: 5
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Serper API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.places || data.places.length === 0) {
    return null;
  }
  const p = data.places[0];
  return {
    id: p.cid || p.title,
    displayName: { text: p.title || '' },
    formattedAddress: p.address || '',
    nationalPhoneNumber: p.phoneNumber || '',
    internationalPhoneNumber: p.phoneNumber || '',
    websiteUri: p.website || '',
    rating: p.rating || 5.0,
    userRatingCount: p.ratingCount || 0,
    location: p.latitude && p.longitude ? { latitude: p.latitude, longitude: p.longitude } : null,
    reviews: []
  };
}

async function searchGooglePlaces(query, apiKey) {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.reviews",
    "places.photos",
    "places.location",
  ].join(",");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "es",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Places API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.places || data.places.length === 0) {
    return null;
  }
  return data.places[0];
}

async function downloadAsset(url, outputPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    writeFileSync(outputPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    console.warn(`[scout-lead] No se pudo descargar asset de ${url}: ${err.message}`);
    return false;
  }
}

async function main() {
  const flags = parseArgs();
  const query = flags.query || flags.q;
  const isMock = Boolean(flags.mock);

  if (!query && !isMock) {
    console.error(`\x1b[31m[scout-lead ERROR]\x1b[0m Falta el argumento --query. Ejemplo:
  node scripts/scout-lead.mjs --query "NutriAr, Belgrano 1221, Campana"
  o para prueba rápida sin API Key:
  node scripts/scout-lead.mjs --mock`);
    process.exit(2);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || flags["api-key"];
  const serperKey = process.env.SERPER_API_KEY;
  const targetSlug = flags.slug || (query ? slugify(query.slice(0, 30)) : "demo-nutri-lead");
  const assetsDir = join(REPO_ROOT, "assets", targetSlug);
  mkdirSync(assetsDir, { recursive: true });

  let leadData = null;
  const resolvedRubro = flags.rubro || inferRubroFromInput(flags.nicho || query);

  if (isMock || (!apiKey && !serperKey)) {
    if (!isMock && !apiKey && !serperKey) {
      console.warn(`\x1b[33m[scout-lead AVISO]\x1b[0m No se encontró SERPER_API_KEY ni GOOGLE_MAPS_API_KEY en .env.`);
      console.warn(`[scout-lead] Generando extracción de demostración / mock basada en la consulta.`);
    }
    leadData = getMockLead(query, targetSlug, resolvedRubro);
  } else {
    console.log(`\x1b[36m[scout-lead]\x1b[0m Consultando API para: "${query}"...`);
    let place = null;
    if (serperKey) {
      place = await searchSerperPlace(query, serperKey);
    } else {
      place = await searchGooglePlaces(query, apiKey);
    }
    if (!place) {
      console.error(`\x1b[31m[scout-lead ERROR]\x1b[0m No se encontraron resultados para "${query}".`);
      process.exit(1);
    }

    const cleanPhone = (place.internationalPhoneNumber || place.nationalPhoneNumber || "").replace(/\D/g, "");
    leadData = {
      source: "google-maps-platform",
      query,
      slug: targetSlug,
      placeId: place.id,
      nombre: place.displayName?.text || query,
      rubro: resolvedRubro,
      direccion: place.formattedAddress || "",
      telefono: cleanPhone,
      telefonoFormato: place.internationalPhoneNumber || place.nationalPhoneNumber || cleanPhone,
      website: place.websiteUri || "",
      rating: place.rating || 5.0,
      userRatingCount: place.userRatingCount || 0,
      location: place.location || null,
      reviews: (place.reviews || []).slice(0, 5).map((r) => ({
        author: r.authorAttribution?.displayName || "Paciente de Google Maps",
        rating: r.rating || 5,
        text: r.text?.text || r.originalText?.text || "",
        relativePublishTimeDescription: r.relativePublishTimeDescription || "",
      })),
      assets: {
        avatarDownloaded: false,
        mapDownloaded: false,
        files: [],
      },
    };

    // Descargar foto de perfil o lugar si existe
    if (place.photos && place.photos.length > 0) {
      const photoName = place.photos[0].name;
      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`;
      const photoDest = join(assetsDir, "avatar.jpg");
      console.log(`[scout-lead] Descargando foto oficial del lugar...`);
      const ok = await downloadAsset(photoUrl, photoDest);
      if (ok) {
        leadData.assets.avatarDownloaded = true;
        leadData.assets.files.push("avatar.jpg");
      }
    }

    // Descargar mapa estático (Maps Static API - 0 JS) si hay coordenadas
    if (leadData.location && leadData.location.latitude && leadData.location.longitude) {
      const lat = leadData.location.latitude;
      const lng = leadData.location.longitude;
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&scale=2&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
      const mapDest = join(assetsDir, "map.png");
      console.log(`[scout-lead] Descargando mapa estático (Maps Static API, 0 JS)...`);
      const ok = await downloadAsset(mapUrl, mapDest);
      if (ok) {
        leadData.assets.mapDownloaded = true;
        leadData.assets.files.push("map.png");
      }
    }
  }

  const rawJsonPath = join(assetsDir, "lead-raw.json");
  writeFileSync(rawJsonPath, JSON.stringify(leadData, null, 2) + "\n", "utf8");

  console.log(`
\x1b[32m=======================================================
✓ LEAD EXTRAÍDO CON ÉXITO: ${leadData.nombre}
=======================================================\x1b[0m
- Slug: \x1b[1m${leadData.slug}\x1b[0m
- Teléfono: ${leadData.telefono || "No detectado"}
- Dirección: ${leadData.direccion}
- Reseñas Google Maps: ${leadData.reviews.length} extraídas (Rating: ${leadData.rating}★)
- Archivo raw: ${rawJsonPath}
- Siguiente paso: npm run generate-fiche assets/${leadData.slug}/lead-raw.json
`);
}

main().catch((err) => {
  console.error(`\x1b[31m[scout-lead ERROR FATAL]\x1b[0m ${err.message}`);
  process.exit(1);
});
