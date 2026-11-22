#!/usr/bin/env node
// scripts/review-booster.mjs — Motor de Reseñas 5★ en Google Maps (Doble Modo Tier 1 / Tier 2, 100% Offline)

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
const SHORT_MAPS_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const GOOGLE_MAPS_HOST_RE =
  /^(?:(?:www|maps|search)\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2})?)$/i;

// Tabla ISO/IEC 18004 Nivel L (Versiones 1..10):
// [dataCodewordsTotal, ecPerBlock, numBlocksG1, dataG1, numBlocksG2, dataG2, alignmentCenters]
const QR_VERSIONS_L = [
  null,
  [19, 7, 1, 19, 0, 0, []],
  [34, 10, 1, 34, 0, 0, [6, 18]],
  [55, 15, 1, 55, 0, 0, [6, 22]],
  [80, 20, 1, 80, 0, 0, [6, 26]],
  [108, 26, 1, 108, 0, 0, [6, 30]],
  [136, 18, 2, 68, 0, 0, [6, 34]],
  [156, 20, 2, 78, 0, 0, [6, 22, 38]],
  [194, 24, 2, 97, 0, 0, [6, 24, 42]],
  [232, 30, 2, 116, 0, 0, [6, 26, 46]],
  [274, 18, 2, 68, 2, 69, [6, 28, 50]],
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildRsGenerator(ecLen) {
  let poly = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeRsRemainder(data, ecLen) {
  const gen = buildRsGenerator(ecLen);
  const res = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        res[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return res;
}

function encodeQrBitBuffer(bytes, version) {
  const spec = QR_VERSIONS_L[version];
  const maxDataBytes = spec[0];
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode (0100)
  pushBits(0b0100, 4);
  pushBits(bytes.length, version >= 10 ? 16 : 8);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxBits = maxDataBytes * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  pushBits(0, terminator);
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    codewords.push(byte);
  }

  let padToggle = 0;
  while (codewords.length < maxDataBytes) {
    codewords.push(padToggle % 2 === 0 ? 0xec : 0x11);
    padToggle++;
  }

  const [, ecLen, b1, d1, b2, d2] = spec;
  const blocksData = [];
  const blocksEc = [];
  let offset = 0;

  for (let i = 0; i < b1; i++) {
    const slice = codewords.slice(offset, offset + d1);
    offset += d1;
    blocksData.push(slice);
    blocksEc.push(computeRsRemainder(slice, ecLen));
  }
  for (let i = 0; i < b2; i++) {
    const slice = codewords.slice(offset, offset + d2);
    offset += d2;
    blocksData.push(slice);
    blocksEc.push(computeRsRemainder(slice, ecLen));
  }

  const interleaved = [];
  const maxBlockData = Math.max(d1, d2);
  for (let i = 0; i < maxBlockData; i++) {
    for (const blk of blocksData) {
      if (i < blk.length) interleaved.push(blk[i]);
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (const ec of blocksEc) {
      interleaved.push(ec[i]);
    }
  }
  return interleaved;
}

function getBchFormatInfo(maskId) {
  // EC Level L = 01
  const data = (0b01 << 3) | (maskId & 0x7);
  let d = data << 10;
  while (d >>> 10 > 0) {
    const shift = Math.floor(Math.log2(d)) - 10;
    d ^= 0x537 << shift;
  }
  return ((data << 10) | d) ^ 0x5412;
}

function getBchVersionInfo(version) {
  let d = version << 12;
  while (d >>> 12 > 0) {
    const shift = Math.floor(Math.log2(d)) - 12;
    d ^= 0x1f25 << shift;
  }
  return (version << 12) | d;
}

function buildQrFunctionMatrix(version) {
  const size = 17 + version * 4;
  const modules = Array.from({ length: size }, () => new Int8Array(size));
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

  const setFn = (r, c, dark) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark ? 1 : 0;
      isFunction[r][c] = 1;
    }
  };

  const drawFinder = (top, left) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(r, c, inOuter && (inBorder || inCore));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setFn(6, i, dark);
    setFn(i, 6, dark);
  }

  // Alignment patterns
  const centers = QR_VERSIONS_L[version][6];
  for (const rCenter of centers) {
    for (const cCenter of centers) {
      const overlapsTL = rCenter <= 8 && cCenter <= 8;
      const overlapsTR = rCenter <= 8 && cCenter >= size - 9;
      const overlapsBL = rCenter >= size - 9 && cCenter <= 8;
      if (overlapsTL || overlapsTR || overlapsBL) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFn(rCenter + dr, cCenter + dc, dist === 2 || dist === 0);
        }
      }
    }
  }

  // Dark module & reserve format info slots
  setFn(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFn(8, size - 1 - i, false);
    setFn(size - 1 - i, 8, false);
  }

  // Reserve & write version info for V7+
  if (version >= 7) {
    const vBits = getBchVersionInfo(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((vBits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      setFn(a, size - 11 + b, dark);
      setFn(size - 11 + b, a, dark);
    }
  }

  return { size, modules, isFunction };
}

function writeFormatBits(modules, size, maskId) {
  const fmt = getBchFormatInfo(maskId);
  for (let i = 0; i <= 5; i++) {
    const dark = ((fmt >>> i) & 1) === 1 ? 1 : 0;
    modules[8][i] = dark;
    modules[size - 1 - i][8] = dark;
  }
  modules[8][7] = ((fmt >>> 6) & 1) === 1 ? 1 : 0;
  modules[8][8] = ((fmt >>> 7) & 1) === 1 ? 1 : 0;
  modules[7][8] = ((fmt >>> 8) & 1) === 1 ? 1 : 0;
  modules[size - 7][8] = ((fmt >>> 6) & 1) === 1 ? 1 : 0;
  modules[8][size - 8] = ((fmt >>> 7) & 1) === 1 ? 1 : 0;
  modules[8][size - 7] = ((fmt >>> 8) & 1) === 1 ? 1 : 0;

  for (let i = 9; i < 15; i++) {
    const dark = ((fmt >>> i) & 1) === 1 ? 1 : 0;
    modules[14 - i][8] = dark;
    modules[8][size - 15 + i] = dark;
  }
}

function maskBit(maskId, r, c) {
  switch (maskId) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function scoreQrPenalty(modules, size) {
  let penalty = 0;

  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const val = modules[r][c];
      if (
        modules[r][c + 1] === val &&
        modules[r + 1][c] === val &&
        modules[r + 1][c + 1] === val
      ) {
        penalty += 3;
      }
    }
  }

  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c] === 1) darkCount++;
    }
  }
  const pct = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(pct - 50) / 5);
  penalty += k * 10;

  return penalty;
}

function buildQrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  let version = -1;
  for (let v = 1; v < QR_VERSIONS_L.length; v++) {
    const headerBits = 4 + (v >= 10 ? 16 : 8);
    const neededDataBytes = Math.ceil((headerBits + bytes.length * 8) / 8);
    if (neededDataBytes <= QR_VERSIONS_L[v][0]) {
      version = v;
      break;
    }
  }
  if (version === -1) {
    throw new RangeError(
      `La URL supera la capacidad máxima offline (271 bytes UTF-8; recibidos ${bytes.length} bytes).`
    );
  }

  const codewords = encodeQrBitBuffer(bytes, version);
  const { size, modules: baseModules, isFunction } = buildQrFunctionMatrix(version);

  // Colocar bits en zigzag determinista sobre módulos no funcionales
  const rawDataMatrix = baseModules.map((row) => new Int8Array(row));
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const c of [right, right - 1]) {
        if (isFunction[r][c]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          const cw = codewords[bitIdx >>> 3];
          bit = (cw >>> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
        }
        rawDataMatrix[r][c] = bit;
      }
    }
    upward = !upward;
  }

  let bestMask = 0;
  let bestScore = Infinity;
  let bestMatrix = null;

  for (let maskId = 0; maskId < 8; maskId++) {
    const candidate = rawDataMatrix.map((row, r) => {
      const out = new Int8Array(size);
      for (let c = 0; c < size; c++) {
        if (isFunction[r][c]) {
          out[c] = row[c];
        } else {
          out[c] = maskBit(maskId, r, c) ? row[c] ^ 1 : row[c];
        }
      }
      return out;
    });
    writeFormatBits(candidate, size, maskId);
    const score = scoreQrPenalty(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = maskId;
      bestMatrix = candidate;
    }
  }

  return { size, matrix: bestMatrix, maskId: bestMask, version };
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHttpsUrl(rawUrl) {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript|file|http):/i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizePlaceId(candidate) {
  if (typeof candidate !== "string") return null;
  const clean = candidate.trim();
  return PLACE_ID_RE.test(clean) ? clean : null;
}

/**
 * Extrae place_id / query_place_id desde URLs de Google Maps sin efectuar red.
 * Devuelve null en enlaces acortados o URLs sin place_id explícito.
 */
export function extractPlaceIdFromMapsUrl(mapsUrl) {
  const safeUrl = sanitizeHttpsUrl(mapsUrl);
  if (!safeUrl) return null;

  let parsed;
  try {
    parsed = new URL(safeUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (SHORT_MAPS_HOSTS.has(host)) return null;
  if (!GOOGLE_MAPS_HOST_RE.test(host)) return null;

  for (const key of ["query_place_id", "place_id", "placeid"]) {
    const val = normalizePlaceId(parsed.searchParams.get(key) || "");
    if (val) return val;
  }

  const qParam = parsed.searchParams.get("q") || parsed.searchParams.get("query") || "";
  const qMatch = qParam.match(/^place_id:([A-Za-z0-9_-]{10,200})$/i);
  if (qMatch?.[1]) {
    return normalizePlaceId(qMatch[1]);
  }

  return null;
}

/**
 * Construye el enlace directo de reseña en Google Maps (writereview?placeid=...)
 * o fallback sanitizado https:// rechazando esquemas javascript:/data:.
 */
export function buildGoogleReviewUrl({
  placeId = "",
  mapsUrl = "",
  businessName = "",
  location = "",
} = {}) {
  const explicitPlaceId =
    normalizePlaceId(String(placeId || "")) || extractPlaceIdFromMapsUrl(mapsUrl);
  if (explicitPlaceId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(explicitPlaceId)}`;
  }

  const safeMapsUrl = sanitizeHttpsUrl(mapsUrl);
  if (safeMapsUrl) {
    return safeMapsUrl;
  }

  const queryParts = [businessName, location]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const queryText = queryParts.join(" ") || "Consultorio Profesional Argentina";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
}

/**
 * Genera un <svg> QR determinista autocontenido 100% offline para la URL de reseña.
 */
export function generateReviewQrSvg(
  targetUrl,
  { size = 256, label = "Escaneá para dejar tu reseña en Google" } = {}
) {
  const safeTarget = sanitizeHttpsUrl(targetUrl);
  if (!safeTarget) {
    throw new Error("URL de destino inválida o no segura: se requiere https:// válido.");
  }

  const numericSize = Math.min(1024, Math.max(128, Math.round(Number(size) || 256)));
  const quietZone = 4;
  const { size: matrixSize, matrix } = buildQrMatrix(safeTarget);
  const totalModules = matrixSize + quietZone * 2;

  const pathParts = [];
  for (let r = 0; r < matrixSize; r++) {
    let runStart = -1;
    for (let c = 0; c <= matrixSize; c++) {
      const dark = c < matrixSize && matrix[r][c] === 1;
      if (dark && runStart === -1) {
        runStart = c;
      } else if (!dark && runStart !== -1) {
        const len = c - runStart;
        pathParts.push(`M${runStart + quietZone},${r + quietZone}h${len}v1h-${len}z`);
        runStart = -1;
      }
    }
  }

  const escapedLabel = escapeXml(String(label || "Código QR de reseñas").trim());
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${numericSize}" height="${numericSize}" ` +
    `viewBox="0 0 ${totalModules} ${totalModules}" role="img" aria-label="${escapedLabel}" shape-rendering="crispEdges">` +
    `<title>${escapedLabel}</title>` +
    `<rect width="${totalModules}" height="${totalModules}" fill="#FFFFFF"/>` +
    `<path d="${pathParts.join("")}" fill="#040607"/>` +
    `</svg>`
  );
}

/**
 * Redacta mensaje cordial en voseo argentino +40 sin incentivos económicos prohibidos por Google.
 */
export function buildReviewRequestMessage({
  providerName = "nuestro consultorio",
  specialty = "",
  patientFirstName = "",
  reviewUrl = "",
  mode = "tier1_manual",
} = {}) {
  if (mode !== "tier1_manual" && mode !== "tier2_post_consult") {
    throw new RangeError(`Modo de mensaje review-booster inválido: ${String(mode)}`);
  }

  const safeUrl = sanitizeHttpsUrl(reviewUrl) || buildGoogleReviewUrl({ businessName: providerName });
  const cleanProvider = String(providerName || "nuestro consultorio").trim();
  const cleanSpecialty = String(specialty || "").trim();
  const cleanPatient = String(patientFirstName || "").trim();
  const greeting = cleanPatient ? `Hola ${cleanPatient}` : "Hola";
  const specialtyText = cleanSpecialty ? ` (${cleanSpecialty})` : "";

  if (mode === "tier2_post_consult") {
    return (
      `${greeting}, ¿cómo estás? Te escribimos de parte de ${cleanProvider}${specialtyText} para agradecerte ` +
      `por la consulta de hoy. Si podés compartir en 30 segundos cómo fue tu experiencia en Google Maps, ` +
      `ayudás a otros pacientes a encontrarnos con tranquilidad: ${safeUrl} ` +
      `Si preferís no recibir este tipo de avisos, respondé "baja" y lo desactivamos de inmediato.`
    );
  }

  return (
    `${greeting}, ¿cómo estás? Te saludamos desde el equipo de ${cleanProvider}${specialtyText}. ` +
    `Si tenés un minuto y te sentiste cómodo con la atención recibida, nos ayudaría muchísimo que ` +
    `compartas tu experiencia en Google Maps desde este enlace directo: ${safeUrl} ` +
    `¡Muchas gracias por tu tiempo y confianza!`
  );
}

/**
 * Construye el payload compartido con workflows/n8n/03-review-booster.json (0 PII).
 */
export function buildReviewBoosterWorkflowPayload(clientRecord = {}, options = {}) {
  const slug = String(clientRecord.slug || options.slug || "prestador-activo").trim();
  const providerName = String(
    clientRecord.provider_name || clientRecord.name || options.providerName || "Consultorio Profesional"
  ).trim();
  const specialty = String(
    options.specialty || clientRecord.specialty || clientRecord.niche || "Atención Especializada"
  ).trim();
  const tier = String(clientRecord.tier || options.tier || "starter_tier1").trim();
  const mapsUrl = String(clientRecord.maps_url || options.mapsUrl || "").trim();
  const resolvedPlaceId =
    normalizePlaceId(String(clientRecord.maps_place_id || options.placeId || "")) ||
    extractPlaceIdFromMapsUrl(mapsUrl);

  const rawExistingReviewUrl = sanitizeHttpsUrl(clientRecord.review_url || "");
  const reviewUrl = resolvedPlaceId
    ? buildGoogleReviewUrl({ placeId: resolvedPlaceId })
    : rawExistingReviewUrl ||
      buildGoogleReviewUrl({
        mapsUrl,
        businessName: providerName,
        location: clientRecord.location || options.location || "",
      });

  return {
    schema_version: "1.0",
    workflow_id: "03-review-booster",
    client_slug: slug,
    provider_name: providerName,
    specialty,
    tier,
    maps_place_id: resolvedPlaceId,
    review_url: reviewUrl,
    dispatch_delay_hours: {
      min: 2,
      max: 4,
    },
    compliance: {
      ley_25326: true,
      require_opt_in: true,
      respect_opt_out_keyword: "baja",
      no_incentives_policy: true,
      idempotent_reminder_type: "review_5star",
    },
    message_templates: {
      tier1_manual: buildReviewRequestMessage({
        providerName,
        specialty,
        reviewUrl,
        mode: "tier1_manual",
      }),
      tier2_post_consult: buildReviewRequestMessage({
        providerName,
        specialty,
        reviewUrl,
        mode: "tier2_post_consult",
      }),
    },
    telemetry_event: {
      client_slug: slug,
      event_type: "review_invite_sent",
      count_delta: 1,
    },
  };
}

function parseCliArgs(argv) {
  const opts = {
    name: "Consultorio Profesional",
    specialty: "",
    placeId: "",
    mapsUrl: "",
    slug: "prestador-activo",
    mode: "tier1_manual",
    patientFirstName: "",
    size: 256,
    json: false,
    svgOut: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--name" || arg === "-n") opts.name = argv[++i] || opts.name;
    else if (arg === "--specialty" || arg === "-s") opts.specialty = argv[++i] || "";
    else if (arg === "--place-id" || arg === "-p") opts.placeId = argv[++i] || "";
    else if (arg === "--maps-url" || arg === "-u") opts.mapsUrl = argv[++i] || "";
    else if (arg === "--slug") opts.slug = argv[++i] || opts.slug;
    else if (arg === "--mode" || arg === "-m") opts.mode = argv[++i] || opts.mode;
    else if (arg === "--patient") opts.patientFirstName = argv[++i] || "";
    else if (arg === "--size") opts.size = Number(argv[++i]) || 256;
    else if (arg === "--svg-out") opts.svgOut = argv[++i] || "";
    else if (arg === "--json") opts.json = true;
  }

  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parseCliArgs(process.argv.slice(2));
  const reviewUrl = buildGoogleReviewUrl({
    placeId: opts.placeId,
    mapsUrl: opts.mapsUrl,
    businessName: opts.name,
  });
  let qrSvg;
  try {
    qrSvg = generateReviewQrSvg(reviewUrl, {
      size: opts.size,
      label: `Dejá tu reseña a ${opts.name}`,
    });
  } catch {
    let compactUrl = buildGoogleReviewUrl({ businessName: opts.name.slice(0, 60) });
    if (new TextEncoder().encode(compactUrl).length > 270) {
      compactUrl = compactUrl.slice(0, 270).replace(/%[0-9a-fA-F]?$/, "");
    }
    qrSvg = generateReviewQrSvg(compactUrl, {
      size: opts.size,
      label: `Dejá tu reseña a ${opts.name}`,
    });
  }
  const message = buildReviewRequestMessage({
    providerName: opts.name,
    specialty: opts.specialty,
    patientFirstName: opts.patientFirstName,
    reviewUrl,
    mode: opts.mode,
  });
  const workflowPayload = buildReviewBoosterWorkflowPayload({
    slug: opts.slug,
    provider_name: opts.name,
    specialty: opts.specialty,
    maps_place_id: opts.placeId || null,
    maps_url: opts.mapsUrl,
    review_url: reviewUrl,
  });

  if (opts.svgOut) {
    writeFileSync(opts.svgOut, qrSvg, "utf8");
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          reviewUrl,
          qrSvg,
          message,
          workflowPayload,
        },
        null,
        2
      )
    );
  } else {
    console.log(`Enlace Google Reviews: ${reviewUrl}`);
    console.log(`\nMensaje (${opts.mode}):\n${message}`);
    console.log(`\nQR SVG generado offline (${qrSvg.length} bytes).`);
  }
}
