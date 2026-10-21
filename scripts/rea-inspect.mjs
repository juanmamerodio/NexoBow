#!/usr/bin/env node
// scripts/rea-inspect.mjs — Inspector REA y Extractor Estético para ingeniería inversa de templates
// Uso CLI: node scripts/rea-inspect.mjs <url-o-path> [--json]
// Uso programático: import { inspectReaTarget, extractThemeTokens, mapToGoogleFont, parseColorPalette } from './rea-inspect.mjs'

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// 1. Mapeo de fuentes comerciales / propietarias a alternativas de Google Fonts
export const GOOGLE_FONTS_FALLBACK_MAP = {
  // Sans-Serif
  "helvetica": "Inter",
  "helvetica neue": "Inter",
  "arial": "Inter",
  "proxima nova": "Montserrat",
  "gotham": "Montserrat",
  "avenir": "Nunito",
  "avenir next": "Nunito",
  "trade gothic": "Archivo",
  "trade gothic next": "Archivo",
  "futura": "Jost",
  "futura pt": "Jost",
  "gilroy": "Plus Jakarta Sans",
  "circular": "DM Sans",
  "circular std": "DM Sans",
  "sf pro": "Inter",
  "sf pro display": "Inter",
  "sf pro text": "Inter",
  "neue haas grotesk": "Inter",

  // Serif / Display
  "garamond": "EB Garamond",
  "adobe garamond": "EB Garamond",
  "caslon": "Libre Caslon Text",
  "didot": "Playfair Display",
  "bodoni": "Bodoni Moda",
  "baskerville": "Libre Baskerville",
  "clarendon": "Fraunces",
  "delta-season": "Fraunces",
  "canela": "Fraunces",
  "gt super": "Fraunces",
  "ogg": "Playfair Display",
  "miller": "Lora",
  "chronicle": "Merriweather",
};

// Fuentes abiertas ampliamente disponibles en Google Fonts
export const KNOWN_GOOGLE_FONTS = new Set([
  "Fraunces",
  "Archivo",
  "Playfair Display",
  "Inter",
  "Lora",
  "Montserrat",
  "Plus Jakarta Sans",
  "DM Sans",
  "Outfit",
  "Syne",
  "Merriweather",
  "EB Garamond",
  "Libre Baskerville",
  "Jost",
  "Nunito",
  "Cinzel",
  "Cormorant Garamond",
]);

export function cleanFontName(raw = "") {
  return raw
    .replace(/["';,]/g, "")
    .split(",")[0]
    .trim();
}

export function mapToGoogleFont(fontFamilyName = "", role = "sans") {
  const cleaned = cleanFontName(fontFamilyName);
  const normalized = cleaned.toLowerCase();

  // 1. Si coincide con una conocida en el mapa de conversión
  for (const [key, replacement] of Object.entries(GOOGLE_FONTS_FALLBACK_MAP)) {
    if (normalized.includes(key)) {
      return {
        family: replacement,
        googleFontsUrl: `https://fonts.googleapis.com/css2?family=${replacement.replace(/ /g, "+")}:wght@400;600;700&display=swap`,
        wasMapped: true,
        original: cleaned,
      };
    }
  }

  // 2. Si ya es una fuente abierta conocida
  for (const font of KNOWN_GOOGLE_FONTS) {
    if (font.toLowerCase() === normalized) {
      return {
        family: font,
        googleFontsUrl: `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, "+")}:wght@400;600;700&display=swap`,
        wasMapped: false,
        original: cleaned,
      };
    }
  }

  // 3. Si parece una fuente personalizada desconocida, usar defaults según rol
  const defaultFamily = role === "display" ? "Fraunces" : "Inter";
  return {
    family: defaultFamily,
    googleFontsUrl: `https://fonts.googleapis.com/css2?family=${defaultFamily.replace(/ /g, "+")}:wght@400;600;700&display=swap`,
    wasMapped: true,
    original: cleaned || "unknown",
  };
}

export function normalizeHexColor(colorStr = "") {
  if (!colorStr || typeof colorStr !== "string") return "#000000";
  const str = colorStr.trim().toLowerCase();

  // Caso #RGB
  if (/^#[0-9a-f]{3}$/.test(str)) {
    return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
  }

  // Caso #RRGGBB
  if (/^#[0-9a-f]{6}$/.test(str)) {
    return str;
  }

  // Caso rgb(...) o rgba(...)
  const rgbMatch = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, "0");
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, "0");
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  return "#000000";
}

function hexToRgb(hex) {
  const norm = normalizeHexColor(hex).replace("#", "");
  return [
    parseInt(norm.slice(0, 2), 16),
    parseInt(norm.slice(2, 4), 16),
    parseInt(norm.slice(4, 6), 16),
  ];
}

export function calculateLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateSaturation(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (max === 0) return 0;
  return delta / max;
}

export function parseColorPalette(content = "") {
  if (!content) {
    return {
      fondo: "#fcf3ed",
      tinta: "#35221a",
      primary: "#e70025",
      accent: "#e3c1ad",
    };
  }

  // Regex para buscar colores en CSS o HTML
  const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)/g;

  const colorCounts = new Map();

  function registerColor(raw) {
    const hex = normalizeHexColor(raw);
    if (!hex) return;
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }

  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    registerColor(match[0]);
  }
  while ((match = rgbRegex.exec(content)) !== null) {
    registerColor(match[0]);
  }

  const sortedColors = Array.from(colorCounts.entries())
    .map(([hex, count]) => ({
      hex,
      count,
      luminance: calculateLuminance(hex),
      saturation: calculateSaturation(hex),
    }))
    .sort((a, b) => b.count - a.count);

  if (sortedColors.length === 0) {
    return {
      fondo: "#fcf3ed",
      tinta: "#35221a",
      primary: "#e70025",
      accent: "#e3c1ad",
    };
  }

  // 60-30-10:
  // - Fondo (60%): color de mayor frecuencia entre los claros o neutros (o si es dark mode, el más oscuro de fondo)
  // - Tinta (30%): alto contraste con el fondo
  // - Primary (10%): color saturado para CTAs
  // - Accent: variación complementaria o suavizada

  // Buscamos si el diseño es light o dark mode observando los 3 más frecuentes
  const topFrequent = sortedColors.slice(0, 5);
  const lightCandidate = topFrequent.find((c) => c.luminance > 0.7);
  const darkCandidate = topFrequent.find((c) => c.luminance < 0.15);

  let fondo;
  let tinta;

  if (lightCandidate) {
    fondo = lightCandidate.hex;
    // La tinta debe ser oscura
    const bestDark = sortedColors.find((c) => c.luminance < 0.2) || darkCandidate || { hex: "#1f2937" };
    tinta = bestDark.hex;
  } else if (darkCandidate) {
    fondo = darkCandidate.hex;
    const bestLight = sortedColors.find((c) => c.luminance > 0.8) || { hex: "#f9fafb" };
    tinta = bestLight.hex;
  } else {
    fondo = sortedColors[0].hex;
    tinta = calculateLuminance(fondo) > 0.5 ? "#111827" : "#f9fafb";
  }

  // Primary: el color con mayor saturación y presencia relevante que no sea fondo ni tinta
  const saturatedCandidates = sortedColors.filter(
    (c) => c.hex !== fondo && c.hex !== tinta && c.saturation > 0.25
  );

  let primary = saturatedCandidates.length > 0 ? saturatedCandidates[0].hex : null;
  if (!primary) {
    // Si no hay saturado, tomar el siguiente más frecuente que contraste
    const contrasting = sortedColors.find((c) => c.hex !== fondo && c.hex !== tinta);
    primary = contrasting ? contrasting.hex : (calculateLuminance(fondo) > 0.5 ? "#0f766e" : "#38bdf8");
  }

  // Accent: siguiente color distintivo o variante
  const accentCandidates = sortedColors.filter(
    (c) => c.hex !== fondo && c.hex !== tinta && c.hex !== primary
  );
  let accent = accentCandidates.length > 0 ? accentCandidates[0].hex : null;
  if (!accent) {
    // Generar o usar un tono complementario
    accent = calculateLuminance(fondo) > 0.5 ? "#e2e8f0" : "#334155";
  }

  return {
    fondo,
    tinta,
    primary,
    accent,
  };
}

export function extractFontFamilies(content = "") {
  const fontMatches = [];
  const fontFamilyRegex = /font-family\s*:\s*([^;}{]+)/gi;
  let match;
  while ((match = fontFamilyRegex.exec(content)) !== null) {
    const raw = match[1];
    const families = raw.split(",").map((s) => cleanFontName(s)).filter(Boolean);
    if (families.length > 0) {
      fontMatches.push(families[0]);
    }
  }

  // Buscar también enlaces de Google Fonts
  const googleFontRegex = /fonts\.googleapis\.com\/css2\?family=([^&"']+)/gi;
  while ((match = googleFontRegex.exec(content)) !== null) {
    const rawFam = decodeURIComponent(match[1]).split(":")[0].replace(/\+/g, " ");
    fontMatches.unshift(rawFam);
  }

  let displayFont = "Fraunces";
  let bodyFont = "Inter";

  if (fontMatches.length > 0) {
    // Distinguir por display vs sans
    const displayCandidate = fontMatches.find((f) => {
      const lower = f.toLowerCase();
      return (
        lower.includes("serif") ||
        lower.includes("display") ||
        lower.includes("fraunces") ||
        lower.includes("playfair") ||
        lower.includes("lora") ||
        lower.includes("garamond")
      );
    });

    const sansCandidate = fontMatches.find((f) => {
      const lower = f.toLowerCase();
      return (
        lower.includes("sans") ||
        lower.includes("inter") ||
        lower.includes("archivo") ||
        lower.includes("helvetica") ||
        lower.includes("montserrat")
      );
    });

    if (displayCandidate) {
      displayFont = mapToGoogleFont(displayCandidate, "display").family;
    } else {
      displayFont = mapToGoogleFont(fontMatches[0], "display").family;
    }

    if (sansCandidate) {
      bodyFont = mapToGoogleFont(sansCandidate, "sans").family;
    } else if (fontMatches[1]) {
      bodyFont = mapToGoogleFont(fontMatches[1], "sans").family;
    } else {
      bodyFont = "Inter";
    }
  }

  return {
    fuente: displayFont,
    fuente_sans: bodyFont,
  };
}

export function extractThemeTokens(htmlContent = "", cssContent = "") {
  const combined = `${htmlContent}\n${cssContent}`;
  const palette = parseColorPalette(combined);
  const fonts = extractFontFamilies(combined);

  // Arquetipo de orden de secciones estándar para templates de alta conversión
  const orden_secciones = [
    "Hero",
    "Problem",
    "Steps",
    "Reviews",
    "CaseStudy",
    "Pricing",
  ];

  return {
    tema: {
      primary: palette.primary,
      accent: palette.accent,
      fondo: palette.fondo,
      tinta: palette.tinta,
      fuente: fonts.fuente,
      fuente_sans: fonts.fuente_sans,
      orden_secciones,
    },
  };
}

export async function inspectReaTarget(urlOrPath = "", options = {}) {
  const timeoutMs = options.timeoutMs || 8000;

  // Fallback seguro en caso de error
  const defaultFallback = {
    tema: {
      primary: "#0284c7",
      accent: "#e0f2fe",
      fondo: "#f8fafc",
      tinta: "#0f172a",
      fuente: "Fraunces",
      fuente_sans: "Inter",
      orden_secciones: ["Hero", "Problem", "Steps", "Reviews", "CaseStudy", "Pricing"],
    },
  };

  if (!urlOrPath) {
    return {
      ok: false,
      message: "No se proporcionó URL ni ruta de archivo. Usando fallback predeterminado.",
      fallback: defaultFallback,
    };
  }

  // 1. Caso archivo local
  if (existsSync(urlOrPath)) {
    try {
      const content = readFileSync(resolve(urlOrPath), "utf-8");
      const tokens = extractThemeTokens(content);
      return {
        ok: true,
        source: urlOrPath,
        tema: tokens.tema,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Error al leer archivo local: ${err.message}. Sugerencia: use fallback.`,
        fallback: defaultFallback,
      };
    }
  }

  // 2. Caso URL remota HTTP/HTTPS
  if (/^https?:\/\//i.test(urlOrPath)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(urlOrPath, {
        signal: controller.signal,
        headers: {
          "User-Agent": "NexoBow-REA-Bot/1.0 (+https://nexobow.site)",
          Accept: "text/html,application/xhtml+xml,text/css;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          message: `Fallo de conexión HTTP (${res.status} ${res.statusText}) en ${urlOrPath}. Usando fallback.`,
          fallback: defaultFallback,
        };
      }

      const html = await res.text();
      const tokens = extractThemeTokens(html);

      return {
        ok: true,
        source: urlOrPath,
        tema: tokens.tema,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Fallo de conexión o timeout al inspeccionar '${urlOrPath}': ${err.message}. Se sugiere fallback manual.`,
        fallback: defaultFallback,
      };
    }
  }

  return {
    ok: false,
    message: `Ruta o URL desconocida: ${urlOrPath}. Usando fallback.`,
    fallback: defaultFallback,
  };
}

// Ejecución directa por CLI
if (process.argv[1] && process.argv[1].endsWith("rea-inspect.mjs")) {
  const target = process.argv[2];
  if (!target) {
    console.error("Uso: node scripts/rea-inspect.mjs <url-o-path> [--json]");
    process.exit(1);
  }

  const result = await inspectReaTarget(target);
  if (result.ok) {
    console.log(JSON.stringify(result.tema, null, 2));
    process.exit(0);
  } else {
    console.warn(`[rea-inspect AVISO] ${result.message}`);
    console.log(JSON.stringify(result.fallback.tema, null, 2));
    process.exit(0);
  }
}
