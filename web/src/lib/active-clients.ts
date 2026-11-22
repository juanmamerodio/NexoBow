// web/src/lib/active-clients.ts — Dominio de Prestadores Activos (Entrega 72h, 6 Hitos, Prueba 30d, Hosting 365d),
// Kit de Reseñas 5★ Offline, Handoff domain-provisioner y Repositorio Supabase bajo Verdad Única (Ticket #59)
import { getBrowserSupabaseClient } from "./supabase.ts";

export type ClientTierType = "starter_tier1" | "autonomous_tier2" | "growth_tier3";

export type DeliverySlaStatus =
  | "en_curso"
  | "entregado_en_tiempo"
  | "alerta_24h"
  | "vencido_sla"
  | "pausado";

export type AutonomousEventType =
  | "heartbeat"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "waitlist_filled"
  | "review_invite_sent"
  | "human_handoff";

export interface DeliveryChecklist {
  material_received: boolean;
  copy_approved: boolean;
  production_aeo_built: boolean;
  domain_ssl_verified: boolean;
  review_booster_ready: boolean;
  delivery_confirmed: boolean;
}

export interface ActiveClient {
  id: string;
  lead_id: number | null;
  slug: string;
  provider_name: string;
  niche: string;
  tier: ClientTierType;
  primary_domain: string | null;
  maps_place_id: string | null;
  review_url: string | null;
  delivery_status: DeliverySlaStatus;
  checklist: DeliveryChecklist;
  aeo_verified: boolean;
  promoted_at: string;
  delivery_deadline_at: string;
  delivered_at: string | null;
  trial_ends_at: string;
  hosting_renews_at: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AutonomousEvent {
  id: string;
  client_slug: string;
  event_type: AutonomousEventType;
  period_date: string;
  count_delta: number;
  engine_version: string;
  summary: Record<string, any>;
  received_at: string;
}

export interface OperationalAlert {
  id: string;
  type: "delivery_72h" | "trial_30d";
  severity: "critical" | "warning";
  clientId: string;
  clientSlug: string;
  providerName: string;
  tier: ClientTierType;
  title: string;
  description: string;
  dueAt: string;
  hoursRemaining: number | null;
  daysRemaining: number | null;
  actionRoute: string;
}

export interface Gate1AggregatedSummary {
  totalEvents: number;
  lastReceivedAt: string | null;
  byType: Record<AutonomousEventType, number>;
  byClientSlug: Record<string, number>;
}

export interface LeadPromotionInput {
  id?: number | null;
  slug?: string;
  name?: string;
  provider_name?: string;
  niche?: string;
  tier?: ClientTierType;
  potential_value?: string;
  location?: string;
  city?: string;
  social_link?: string | null;
  primary_domain?: string | null;
  maps_place_id?: string | null;
  review_url?: string | null;
  metadata?: Record<string, any>;
}

export interface DomainProvisionerPlan {
  valid: boolean;
  domain: string;
  slug: string;
  targetHost: string;
  isNicAr: boolean;
  checkCommand: string;
  buildProductionCommand: string;
  wranglerCommand: string;
  dnsRecords: Array<{ type: "CNAME"; name: string; target: string }>;
}

export interface ReviewKit {
  placeId: string | null;
  reviewUrl: string;
  qrTargetUrl: string;
  qrSvg: string;
  messageManual: string;
  messagePostConsult: string;
  whatsappShareUrl: string;
  workflowPayload: Record<string, any>;
}

export const DEFAULT_DELIVERY_CHECKLIST: DeliveryChecklist = {
  material_received: false,
  copy_approved: false,
  production_aeo_built: false,
  domain_ssl_verified: false,
  review_booster_ready: false,
  delivery_confirmed: false,
};

export const DELIVERY_CHECKLIST_ITEMS: Array<{
  key: keyof DeliveryChecklist;
  label: string;
  hint: string;
}> = [
  {
    key: "material_received",
    label: "1. Material y fotos reales recibidas",
    hint: "Logo, fotos de consultorio/equipo y matrícula profesional.",
  },
  {
    key: "copy_approved",
    label: "2. Copy y ficha aprobados por el prestador",
    hint: "Textos revisados en voseo claro, arancel y modalidad.",
  },
  {
    key: "production_aeo_built",
    label: "3. Build --mode production + AEO (/llms.txt + JSON-LD)",
    hint: "Sin banner 20% ni /api/ping; canonical apuntando a dominio propio.",
  },
  {
    key: "domain_ssl_verified",
    label: "4. Dominio propio CNAME + SSL verificados",
    hint: "Chequeado con scripts/domain-provisioner.mjs y Cloudflare Pages.",
  },
  {
    key: "review_booster_ready",
    label: "5. Kit de Reseñas 5★ en Google Maps entregado",
    hint: "Enlace directo writereview, QR SVG imprimible y mensaje WhatsApp.",
  },
  {
    key: "delivery_confirmed",
    label: "6. Entrega formal confirmada al prestador",
    hint: "Habilita período de garantía técnica y conteo de prueba 30d.",
  },
];

export const CLIENT_TIER_LABELS: Record<
  ClientTierType,
  { label: string; short: string; color: string; bg: string; border: string }
> = {
  starter_tier1: {
    label: "Tier 1 · Starter ($189.999 ARS · $0/mes Año 1)",
    short: "Tier 1 Starter",
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.35)",
  },
  autonomous_tier2: {
    label: "Tier 2 · Autonomous ($549.999 + $229.999/mes)",
    short: "Tier 2 Autonomous",
    color: "#BF40FA",
    bg: "rgba(191, 64, 250, 0.14)",
    border: "rgba(191, 64, 250, 0.38)",
  },
  growth_tier3: {
    label: "Tier 3 · Growth Partner + AfterBow",
    short: "Tier 3 Growth",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.14)",
    border: "rgba(16, 185, 129, 0.35)",
  },
};

export const DELIVERY_STATUS_META: Record<
  DeliverySlaStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  en_curso: {
    label: "En curso (72h hábiles)",
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.3)",
  },
  alerta_24h: {
    label: "Alerta <24h entrega",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.14)",
    border: "rgba(245, 158, 11, 0.4)",
  },
  vencido_sla: {
    label: "SLA 72h vencido",
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
  },
  entregado_en_tiempo: {
    label: "Entregado en producción",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.14)",
    border: "rgba(16, 185, 129, 0.35)",
  },
  pausado: {
    label: "Pausado",
    color: "#A1A1AA",
    bg: "rgba(161, 161, 170, 0.12)",
    border: "rgba(161, 161, 170, 0.3)",
  },
};

export const INITIAL_MOCK_ACTIVE_CLIENTS: ActiveClient[] = [
  {
    id: "mock-active-1",
    lead_id: 24,
    slug: "24-centro-odonto-palermo",
    provider_name: "Centro Odonto Palermo",
    niche: "odontologo",
    tier: "starter_tier1",
    primary_domain: "centroodontopalermo.com.ar",
    maps_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    review_url: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
    delivery_status: "en_curso",
    checklist: {
      material_received: true,
      copy_approved: true,
      production_aeo_built: false,
      domain_ssl_verified: false,
      review_booster_ready: false,
      delivery_confirmed: false,
    },
    aeo_verified: false,
    promoted_at: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
    delivery_deadline_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    delivered_at: null,
    trial_ends_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    hosting_renews_at: new Date(Date.now() + 363 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { city: "Palermo, CABA" },
  },
];

export const INITIAL_MOCK_AUTONOMOUS_EVENTS: AutonomousEvent[] = [];

export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
const SHORT_MAPS_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const GOOGLE_MAPS_HOST_RE =
  /^(?:(?:www|maps|search)\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2})?)$/i;
const DOMAIN_SAFE_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

// Codificador QR ISO/IEC 18004 Nivel L puro offline (Versiones 1..10, 0 dependencias externas)
const QR_VERSIONS_L: Array<
  [number, number, number, number, number, number, number[]] | null
> = [
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

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildRsGenerator(ecLen: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeRsRemainder(data: number[], ecLen: number): Uint8Array {
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

function encodeQrBitBuffer(bytes: Uint8Array, version: number): number[] {
  const spec = QR_VERSIONS_L[version]!;
  const maxDataBytes = spec[0];
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, version >= 10 ? 16 : 8);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxBits = maxDataBytes * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  pushBits(0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  let padToggle = 0;
  while (codewords.length < maxDataBytes) {
    codewords.push(padToggle % 2 === 0 ? 0xec : 0x11);
    padToggle++;
  }

  const [, ecLen, b1, d1, b2, d2] = spec;
  const blocksData: number[][] = [];
  const blocksEc: Uint8Array[] = [];
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

  const interleaved: number[] = [];
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

function getBchFormatInfo(maskId: number): number {
  const data = (0b01 << 3) | (maskId & 0x7);
  let d = data << 10;
  while (d >>> 10 > 0) {
    const shift = Math.floor(Math.log2(d)) - 10;
    d ^= 0x537 << shift;
  }
  return ((data << 10) | d) ^ 0x5412;
}

function getBchVersionInfo(version: number): number {
  let d = version << 12;
  while (d >>> 12 > 0) {
    const shift = Math.floor(Math.log2(d)) - 12;
    d ^= 0x1f25 << shift;
  }
  return (version << 12) | d;
}

function buildQrFunctionMatrix(version: number) {
  const size = 17 + version * 4;
  const modules = Array.from({ length: size }, () => new Int8Array(size));
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

  const setFn = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark ? 1 : 0;
      isFunction[r][c] = 1;
    }
  };

  const drawFinder = (top: number, left: number) => {
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

  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setFn(6, i, dark);
    setFn(i, 6, dark);
  }

  const centers = QR_VERSIONS_L[version]![6];
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

function writeFormatBits(modules: Int8Array[], size: number, maskId: number): void {
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

function maskBit(maskId: number, r: number, c: number): boolean {
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

function scoreQrPenalty(modules: Int8Array[], size: number): number {
  let penalty = 0;
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) runLen++;
      else {
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
      if (modules[r][c] === runColor) runLen++;
      else {
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
  penalty += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return penalty;
}

function buildQrMatrix(text: string): { size: number; matrix: Int8Array[] } {
  const bytes = new TextEncoder().encode(text);
  let version = -1;
  for (let v = 1; v < QR_VERSIONS_L.length; v++) {
    const headerBits = 4 + (v >= 10 ? 16 : 8);
    const neededDataBytes = Math.ceil((headerBits + bytes.length * 8) / 8);
    if (neededDataBytes <= QR_VERSIONS_L[v]![0]) {
      version = v;
      break;
    }
  }
  if (version === -1) {
    throw new RangeError("URL demasiado larga para QR offline.");
  }

  const codewords = encodeQrBitBuffer(bytes, version);
  const { size, modules: baseModules, isFunction } = buildQrFunctionMatrix(version);
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

  let bestScore = Infinity;
  let bestMatrix: Int8Array[] = rawDataMatrix;
  for (let maskId = 0; maskId < 8; maskId++) {
    const candidate = rawDataMatrix.map((row, r) => {
      const out = new Int8Array(size);
      for (let c = 0; c < size; c++) {
        out[c] = isFunction[r][c] ? row[c] : maskBit(maskId, r, c) ? row[c] ^ 1 : row[c];
      }
      return out;
    });
    writeFormatBits(candidate, size, maskId);
    const score = scoreQrPenalty(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = candidate;
    }
  }

  return { size, matrix: bestMatrix };
}

function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHttpsUrl(rawUrl?: string | null): string | null {
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

function normalizePlaceId(candidate?: string | null): string | null {
  if (typeof candidate !== "string") return null;
  const clean = candidate.trim();
  return PLACE_ID_RE.test(clean) ? clean : null;
}

export function extractClientPlaceIdFromMapsUrl(mapsUrl?: string | null): string | null {
  const safeUrl = sanitizeHttpsUrl(mapsUrl);
  if (!safeUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(safeUrl);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (SHORT_MAPS_HOSTS.has(host)) return null;
  if (!GOOGLE_MAPS_HOST_RE.test(host)) return null;

  for (const key of ["query_place_id", "place_id", "placeid"]) {
    const val = normalizePlaceId(parsed.searchParams.get(key));
    if (val) return val;
  }
  const qParam = parsed.searchParams.get("q") || parsed.searchParams.get("query") || "";
  const qMatch = qParam.match(/^place_id:([A-Za-z0-9_-]{10,200})$/i);
  return qMatch?.[1] ? normalizePlaceId(qMatch[1]) : null;
}

export function buildClientReviewUrl(input: {
  placeId?: string | null;
  mapsUrl?: string | null;
  businessName?: string;
  location?: string;
} = {}): string {
  const resolvedPlaceId =
    normalizePlaceId(input.placeId) || extractClientPlaceIdFromMapsUrl(input.mapsUrl);
  if (resolvedPlaceId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(resolvedPlaceId)}`;
  }
  const safeMapsUrl = sanitizeHttpsUrl(input.mapsUrl);
  if (safeMapsUrl) return safeMapsUrl;
  const query = [input.businessName, input.location]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ") || "Consultorio Profesional Argentina";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function generateClientReviewQrSvg(
  targetUrl: string,
  options: { size?: number; label?: string } = {}
): string {
  const safeTarget = sanitizeHttpsUrl(targetUrl);
  if (!safeTarget) {
    throw new Error("URL inválida para generar QR de reseñas.");
  }
  const numericSize = Math.min(1024, Math.max(128, Math.round(Number(options.size) || 256)));
  const quietZone = 4;
  const { size: matrixSize, matrix } = buildQrMatrix(safeTarget);
  const totalModules = matrixSize + quietZone * 2;

  const pathParts: string[] = [];
  for (let r = 0; r < matrixSize; r++) {
    let runStart = -1;
    for (let c = 0; c <= matrixSize; c++) {
      const dark = c < matrixSize && matrix[r][c] === 1;
      if (dark && runStart === -1) runStart = c;
      else if (!dark && runStart !== -1) {
        const len = c - runStart;
        pathParts.push(`M${runStart + quietZone},${r + quietZone}h${len}v1h-${len}z`);
        runStart = -1;
      }
    }
  }

  const escapedLabel = escapeXml(String(options.label || "Escaneá para dejar tu reseña en Google").trim());
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${numericSize}" height="${numericSize}" ` +
    `viewBox="0 0 ${totalModules} ${totalModules}" role="img" aria-label="${escapedLabel}" shape-rendering="crispEdges">` +
    `<title>${escapedLabel}</title>` +
    `<rect width="${totalModules}" height="${totalModules}" fill="#FFFFFF"/>` +
    `<path d="${pathParts.join("")}" fill="#040607"/>` +
    `</svg>`
  );
}

export function buildClientReviewMessage(params: {
  providerName?: string;
  specialty?: string;
  patientFirstName?: string;
  reviewUrl?: string;
  mode?: "tier1_manual" | "tier2_post_consult";
}): string {
  const mode = params.mode || "tier1_manual";
  const safeUrl =
    sanitizeHttpsUrl(params.reviewUrl) ||
    buildClientReviewUrl({ businessName: params.providerName });
  const provider = String(params.providerName || "nuestro consultorio").trim();
  const specialtyText = params.specialty ? ` (${String(params.specialty).trim()})` : "";
  const greeting = params.patientFirstName ? `Hola ${String(params.patientFirstName).trim()}` : "Hola";

  if (mode === "tier2_post_consult") {
    return (
      `${greeting}, ¿cómo estás? Te escribimos de parte de ${provider}${specialtyText} para agradecerte ` +
      `por la consulta de hoy. Si podés compartir en 30 segundos cómo fue tu experiencia en Google Maps, ` +
      `ayudás a otros pacientes a encontrarnos con tranquilidad: ${safeUrl} ` +
      `Si preferís no recibir este tipo de avisos, respondé "baja" y lo desactivamos de inmediato.`
    );
  }

  return (
    `${greeting}, ¿cómo estás? Te saludamos desde el equipo de ${provider}${specialtyText}. ` +
    `Si tenés un minuto y te sentiste cómodo con la atención recibida, nos ayudaría muchísimo que ` +
    `compartas tu experiencia en Google Maps desde este enlace directo: ${safeUrl} ` +
    `¡Muchas gracias por tu tiempo y confianza!`
  );
}

export function buildClientReviewKit(client: Partial<ActiveClient> & { maps_url?: string | null }): ReviewKit {
  const placeId =
    normalizePlaceId(client.maps_place_id) ||
    extractClientPlaceIdFromMapsUrl(client.maps_url || client.metadata?.maps_url);
  const reviewUrl = placeId
    ? buildClientReviewUrl({ placeId })
    : sanitizeHttpsUrl(client.review_url) ||
      buildClientReviewUrl({
        mapsUrl: client.maps_url || client.metadata?.maps_url,
        businessName: client.provider_name || "Consultorio Profesional",
        location: client.metadata?.city || "",
      });

  const providerName = String(client.provider_name || "Consultorio Profesional").trim();
  const specialty = String(client.niche || "").trim();
  const slug = String(client.slug || "prestador-activo").trim();
  const qrLabel = `Código QR para reseñas de ${providerName}`;

  let qrTargetUrl = reviewUrl;
  let qrSvg: string;
  try {
    qrSvg = generateClientReviewQrSvg(qrTargetUrl, {
      size: 240,
      label: qrLabel,
    });
  } catch {
    qrTargetUrl = buildClientReviewUrl({
      businessName: providerName.slice(0, 40),
      location: String(client.metadata?.city || "").slice(0, 30),
    });
    if (new TextEncoder().encode(qrTargetUrl).length > 270) {
      qrTargetUrl = qrTargetUrl.slice(0, 270).replace(/%[0-9a-fA-F]?$/, "");
    }
    qrSvg = generateClientReviewQrSvg(qrTargetUrl, {
      size: 240,
      label: qrLabel,
    });
  }

  const messageManual = buildClientReviewMessage({
    providerName,
    specialty,
    reviewUrl,
    mode: "tier1_manual",
  });
  const messagePostConsult = buildClientReviewMessage({
    providerName,
    specialty,
    reviewUrl,
    mode: "tier2_post_consult",
  });

  return {
    placeId,
    reviewUrl,
    qrTargetUrl,
    qrSvg,
    messageManual,
    messagePostConsult,
    whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(messageManual)}`,
    workflowPayload: {
      schema_version: "1.0",
      workflow_id: "03-review-booster",
      client_slug: slug,
      provider_name: providerName,
      specialty: specialty || "Atención Especializada",
      tier: client.tier || "starter_tier1",
      maps_place_id: placeId,
      review_url: reviewUrl,
      dispatch_delay_hours: { min: 2, max: 4 },
      compliance: {
        ley_25326: true,
        require_opt_in: true,
        respect_opt_out_keyword: "baja",
        no_incentives_policy: true,
        idempotent_reminder_type: "review_5star",
      },
      message_templates: {
        tier1_manual: messageManual,
        tier2_post_consult: messagePostConsult,
      },
      telemetry_event: {
        client_slug: slug,
        event_type: "review_invite_sent",
        count_delta: 1,
      },
    },
  };
}

/**
 * Calcula fecha límite sumando horas hábiles (lunes a viernes UTC), saltando sábados y domingos.
 */
export function addBusinessHours(startDate: Date | string, hours = 72): Date {
  const start =
    startDate instanceof Date ? new Date(startDate.getTime()) : new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    throw new RangeError("Fecha de inicio inválida para addBusinessHours");
  }

  let remainingMs = Math.max(0, Number(hours) * 60 * 60 * 1000);
  let cursor = start.getTime();
  if (remainingMs === 0) return new Date(cursor);

  while (remainingMs > 0) {
    const d = new Date(cursor);
    const day = d.getUTCDay(); // 0=Dom, 6=Sáb
    const nextMidnightUtc = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      0,
      0,
      0,
      0
    );

    if (day === 0 || day === 6) {
      cursor = nextMidnightUtc;
      continue;
    }

    const availableInDay = nextMidnightUtc - cursor;
    if (remainingMs <= availableInDay) {
      cursor += remainingMs;
      remainingMs = 0;
    } else {
      remainingMs -= availableInDay;
      cursor = nextMidnightUtc;
    }
  }

  return new Date(cursor);
}

export function normalizeChecklist(raw?: Partial<DeliveryChecklist> | null): DeliveryChecklist {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    material_received: Boolean(source.material_received),
    copy_approved: Boolean(source.copy_approved),
    production_aeo_built: Boolean(source.production_aeo_built),
    domain_ssl_verified: Boolean(source.domain_ssl_verified),
    review_booster_ready: Boolean(source.review_booster_ready),
    delivery_confirmed: Boolean(source.delivery_confirmed),
  };
}

export function computeChecklistProgress(checklist?: Partial<DeliveryChecklist> | null): {
  completed: number;
  total: number;
  percent: number;
  isComplete: boolean;
  pendingKeys: Array<keyof DeliveryChecklist>;
} {
  const normalized = normalizeChecklist(checklist);
  const keys = Object.keys(DEFAULT_DELIVERY_CHECKLIST) as Array<keyof DeliveryChecklist>;
  const pendingKeys = keys.filter((k) => !normalized[k]);
  const completed = keys.length - pendingKeys.length;
  const total = keys.length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    isComplete: completed === total,
    pendingKeys,
  };
}

function resolveTierFromLead(
  lead: LeadPromotionInput,
  explicitTier?: ClientTierType
): ClientTierType {
  if (
    explicitTier === "starter_tier1" ||
    explicitTier === "autonomous_tier2" ||
    explicitTier === "growth_tier3"
  ) {
    return explicitTier;
  }
  if (
    lead.tier === "starter_tier1" ||
    lead.tier === "autonomous_tier2" ||
    lead.tier === "growth_tier3"
  ) {
    return lead.tier;
  }
  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const recommended = String(
    meta.qualification?.recommended_tier || meta.tier_interes || ""
  ).toLowerCase();
  if (recommended.includes("tier_3") || recommended.includes("growth")) return "growth_tier3";
  if (recommended.includes("tier_2") || recommended.includes("autonomous")) return "autonomous_tier2";
  if (String(lead.potential_value || "").includes("549.999")) return "autonomous_tier2";
  return "starter_tier1";
}

function normalizeDomainInput(rawDomain?: string | null): string | null {
  if (!rawDomain) return null;
  let candidate = String(rawDomain).trim().toLowerCase();
  candidate = candidate.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/\.+$/, "");
  return DOMAIN_SAFE_RE.test(candidate) ? candidate : null;
}

/**
 * Construye un ActiveClient completo desde un prospecto del CRM con fechas SLA (+72h hábiles, +30d prueba, +365d Año 1).
 */
export function buildActiveClientFromLead(
  lead: LeadPromotionInput,
  options: {
    promotedAt?: Date | string;
    tier?: ClientTierType;
    primaryDomain?: string | null;
    mapsPlaceId?: string | null;
  } = {}
): ActiveClient {
  const promotedDate = options.promotedAt ? new Date(options.promotedAt) : new Date();
  const safePromoted = Number.isNaN(promotedDate.getTime()) ? new Date() : promotedDate;

  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const providerName = String(
    lead.provider_name || lead.name || "Prestador NexoBow"
  ).trim();
  const slug = String(lead.slug || `client-${lead.id || Date.now()}`).trim();
  const niche = String(lead.niche || "clinica").trim().toLowerCase() || "clinica";
  const tier = resolveTierFromLead(lead, options.tier);
  const mapsUrl = String(meta.maps_url || lead.social_link || "").trim();
  const mapsPlaceId =
    normalizePlaceId(options.mapsPlaceId) ||
    normalizePlaceId(lead.maps_place_id) ||
    extractClientPlaceIdFromMapsUrl(mapsUrl);

  const reviewUrl =
    sanitizeHttpsUrl(lead.review_url) ||
    buildClientReviewUrl({
      placeId: mapsPlaceId,
      mapsUrl,
      businessName: providerName,
      location: lead.location || lead.city || "",
    });

  const primaryDomain = normalizeDomainInput(
    options.primaryDomain ?? lead.primary_domain ?? meta.primary_domain ?? null
  );

  const numericLeadId =
    typeof lead.id === "number" && Number.isFinite(lead.id) && lead.id > 0
      ? lead.id
      : Number.isFinite(Number(lead.id)) && Number(lead.id) > 0
        ? Number(lead.id)
        : null;

  const deliveryDeadline = addBusinessHours(safePromoted, 72);
  const trialEnds = new Date(safePromoted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const hostingRenews = new Date(safePromoted.getTime() + 365 * 24 * 60 * 60 * 1000);

  return {
    id: `active-${slug}`,
    lead_id: numericLeadId,
    slug,
    provider_name: providerName,
    niche,
    tier,
    primary_domain: primaryDomain,
    maps_place_id: mapsPlaceId,
    review_url: reviewUrl,
    delivery_status: "en_curso",
    checklist: { ...DEFAULT_DELIVERY_CHECKLIST },
    aeo_verified: false,
    promoted_at: safePromoted.toISOString(),
    delivery_deadline_at: deliveryDeadline.toISOString(),
    delivered_at: null,
    trial_ends_at: trialEnds.toISOString(),
    hosting_renews_at: hostingRenews.toISOString(),
    metadata: {
      city: lead.city || lead.location || "Argentina",
      maps_url: mapsUrl || null,
      source_funnel_value: lead.potential_value || "$189.999 ARS",
    },
  };
}

export function resolveDeliverySlaState(
  client: Pick<
    ActiveClient,
    "delivery_status" | "delivery_deadline_at" | "delivered_at" | "trial_ends_at" | "hosting_renews_at" | "checklist"
  >,
  nowInput: Date | string = new Date()
): {
  effectiveStatus: DeliverySlaStatus;
  hoursToDelivery: number;
  isDelivered: boolean;
  isPaused: boolean;
  isUrgent24h: boolean;
  isOverdue: boolean;
  daysToTrialEnd: number;
  isTrialEndingSoon: boolean;
  daysToHostingRenewal: number;
} {
  const nowMs = (nowInput instanceof Date ? nowInput : new Date(nowInput)).getTime();
  const deadlineMs = new Date(client.delivery_deadline_at).getTime();
  const trialMs = new Date(client.trial_ends_at).getTime();
  const hostingMs = new Date(client.hosting_renews_at).getTime();

  const isPaused = client.delivery_status === "pausado";
  const isDelivered = Boolean(
    client.delivered_at ||
      client.delivery_status === "entregado_en_tiempo" ||
      client.checklist?.delivery_confirmed
  );

  const diffDeliveryMs = deadlineMs - nowMs;
  const hoursToDelivery = Math.round(diffDeliveryMs / (1000 * 60 * 60));
  const isOverdue = !isDelivered && !isPaused && diffDeliveryMs <= 0;
  const isUrgent24h =
    !isDelivered && !isPaused && diffDeliveryMs > 0 && diffDeliveryMs < 24 * 60 * 60 * 1000;

  let effectiveStatus: DeliverySlaStatus = "en_curso";
  if (isPaused) effectiveStatus = "pausado";
  else if (isDelivered) effectiveStatus = "entregado_en_tiempo";
  else if (isOverdue) effectiveStatus = "vencido_sla";
  else if (isUrgent24h) effectiveStatus = "alerta_24h";

  const diffTrialMs = trialMs - nowMs;
  const daysToTrialEnd = Math.ceil(diffTrialMs / (1000 * 60 * 60 * 24));
  const isTrialEndingSoon =
    !isPaused && diffTrialMs >= 0 && diffTrialMs <= 5 * 24 * 60 * 60 * 1000;

  const daysToHostingRenewal = Math.ceil((hostingMs - nowMs) / (1000 * 60 * 60 * 24));

  return {
    effectiveStatus,
    hoursToDelivery,
    isDelivered,
    isPaused,
    isUrgent24h,
    isOverdue,
    daysToTrialEnd,
    isTrialEndingSoon,
    daysToHostingRenewal,
  };
}

export function extractOperationalAlerts(
  clients: ActiveClient[],
  nowInput: Date | string = new Date()
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  for (const client of clients || []) {
    const sla = resolveDeliverySlaState(client, nowInput);
    if (!sla.isDelivered && !sla.isPaused && (sla.isOverdue || sla.isUrgent24h)) {
      alerts.push({
        id: `delivery-${client.slug}`,
        type: "delivery_72h",
        severity: sla.isOverdue ? "critical" : "warning",
        clientId: client.id,
        clientSlug: client.slug,
        providerName: client.provider_name,
        tier: client.tier,
        title: sla.isOverdue ? "SLA 72h vencido" : "Entrega 72h (<24h)",
        description: sla.isOverdue
          ? `Superó el plazo de 72h hábiles (${Math.abs(sla.hoursToDelivery)}h atrás).`
          : `Faltan ${Math.max(1, sla.hoursToDelivery)}h para vencer la entrega comprometida.`,
        dueAt: client.delivery_deadline_at,
        hoursRemaining: sla.hoursToDelivery,
        daysRemaining: null,
        actionRoute: "/admin/clients",
      });
    }

    if (sla.isTrialEndingSoon) {
      alerts.push({
        id: `trial-${client.slug}`,
        type: "trial_30d",
        severity: sla.daysToTrialEnd <= 1 ? "critical" : "warning",
        clientId: client.id,
        clientSlug: client.slug,
        providerName: client.provider_name,
        tier: client.tier,
        title: "Fin de Prueba 30d (<=5d)",
        description:
          sla.daysToTrialEnd <= 0
            ? "La prueba de 30 días finaliza hoy."
            : `La prueba de 30 días finaliza en ${sla.daysToTrialEnd} día(s).`,
        dueAt: client.trial_ends_at,
        hoursRemaining: null,
        daysRemaining: sla.daysToTrialEnd,
        actionRoute: "/admin/clients",
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

export function aggregateAutonomousEvents(
  events: AutonomousEvent[]
): Gate1AggregatedSummary {
  const byType: Record<AutonomousEventType, number> = {
    heartbeat: 0,
    appointment_confirmed: 0,
    appointment_rescheduled: 0,
    appointment_cancelled: 0,
    waitlist_filled: 0,
    review_invite_sent: 0,
    human_handoff: 0,
  };
  const byClientSlug: Record<string, number> = {};
  let totalEvents = 0;
  let lastReceivedAt: string | null = null;
  let latestMs = 0;

  for (const ev of events || []) {
    const delta = Math.max(0, Number(ev.count_delta) || 0);
    totalEvents += delta;
    if (ev.event_type in byType) {
      byType[ev.event_type] += delta;
    }
    if (ev.client_slug) {
      byClientSlug[ev.client_slug] = (byClientSlug[ev.client_slug] || 0) + delta;
    }
    if (ev.received_at) {
      const ms = new Date(ev.received_at).getTime();
      if (!Number.isNaN(ms) && ms > latestMs) {
        latestMs = ms;
        lastReceivedAt = ev.received_at;
      }
    }
  }

  return {
    totalEvents,
    lastReceivedAt,
    byType,
    byClientSlug,
  };
}

export function buildDomainProvisionerCommand(
  rawDomain: string,
  slug = ""
): DomainProvisionerPlan {
  const cleanDomain = normalizeDomainInput(rawDomain) || "";
  const cleanSlug = String(slug || "").replace(/[^a-z0-9-_]/gi, "").trim();
  const targetHost = "nexobow-previews.pages.dev";
  const isNicAr = cleanDomain.endsWith(".ar");

  if (!cleanDomain) {
    return {
      valid: false,
      domain: "",
      slug: cleanSlug,
      targetHost,
      isNicAr: false,
      checkCommand: "node scripts/domain-provisioner.mjs --domain <dominio> --check",
      buildProductionCommand: cleanSlug
        ? `node scripts/build-client-site.mjs clients/${cleanSlug}.md --mode production --domain <dominio>`
        : "node scripts/build-client-site.mjs clients/<slug>.md --mode production --domain <dominio>",
      wranglerCommand: "npx wrangler pages project domain add nexobow-previews --domain <dominio>",
      dnsRecords: [
        { type: "CNAME", name: "www", target: targetHost },
        { type: "CNAME", name: "@", target: targetHost },
      ],
    };
  }

  return {
    valid: true,
    domain: cleanDomain,
    slug: cleanSlug,
    targetHost,
    isNicAr,
    checkCommand: `node scripts/domain-provisioner.mjs --domain ${cleanDomain} --check${
      cleanSlug ? ` --slug ${cleanSlug}` : ""
    }`,
    buildProductionCommand: `node scripts/build-client-site.mjs clients/${
      cleanSlug || "<slug>"
    }.md --mode production --domain ${cleanDomain}`,
    wranglerCommand: `npx wrangler pages project domain add nexobow-previews --domain ${cleanDomain}`,
    dnsRecords: [
      { type: "CNAME", name: "www", target: targetHost },
      { type: "CNAME", name: "@", target: targetHost },
    ],
  };
}

// -------------------------------------------------------------
// Repositorio Supabase con Contrato Verdad Única { data, isOffline }
// -------------------------------------------------------------

function isUnconfiguredSupabase(client: any): boolean {
  return Boolean(
    !client ||
      typeof client.from !== "function" ||
      (client.supabaseUrl && String(client.supabaseUrl).includes("mockproject"))
  );
}

function mapActiveClientRow(row: any): ActiveClient {
  return {
    id: String(row.id || `active-${row.slug}`),
    lead_id:
      row.lead_id !== null && row.lead_id !== undefined && Number.isFinite(Number(row.lead_id))
        ? Number(row.lead_id)
        : null,
    slug: String(row.slug || ""),
    provider_name: String(row.provider_name || "Prestador"),
    niche: String(row.niche || "clinica"),
    tier: (row.tier || "starter_tier1") as ClientTierType,
    primary_domain: row.primary_domain || null,
    maps_place_id: row.maps_place_id || null,
    review_url: row.review_url || null,
    delivery_status: (row.delivery_status || "en_curso") as DeliverySlaStatus,
    checklist: normalizeChecklist(row.checklist),
    aeo_verified: Boolean(row.aeo_verified),
    promoted_at: row.promoted_at || new Date().toISOString(),
    delivery_deadline_at:
      row.delivery_deadline_at || addBusinessHours(row.promoted_at || new Date(), 72).toISOString(),
    delivered_at: row.delivered_at || null,
    trial_ends_at:
      row.trial_ends_at ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    hosting_renews_at:
      row.hosting_renews_at ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchActiveClients(
  customClient?: any,
  options?: { forceMock?: boolean }
): Promise<ActiveClient[] & { data: ActiveClient[]; isOffline: boolean }> {
  const supabase = customClient !== undefined ? customClient : getBrowserSupabaseClient();
  if (options?.forceMock || isUnconfiguredSupabase(supabase)) {
    const fallback = [...INITIAL_MOCK_ACTIVE_CLIENTS];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }

  try {
    const { data, error } = await supabase
      .from("active_clients")
      .select("*")
      .order("promoted_at", { ascending: false });

    if (error) {
      const fallback = [...INITIAL_MOCK_ACTIVE_CLIENTS];
      return Object.assign(fallback, { data: fallback, isOffline: true });
    }

    const rows = (data || []).map(mapActiveClientRow);
    return Object.assign(rows, { data: rows, isOffline: false });
  } catch {
    const fallback = [...INITIAL_MOCK_ACTIVE_CLIENTS];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }
}

export async function fetchAutonomousEvents(
  customClient?: any,
  options?: { forceMock?: boolean }
): Promise<AutonomousEvent[] & { data: AutonomousEvent[]; isOffline: boolean }> {
  const supabase = customClient !== undefined ? customClient : getBrowserSupabaseClient();
  if (options?.forceMock || isUnconfiguredSupabase(supabase)) {
    const fallback = [...INITIAL_MOCK_AUTONOMOUS_EVENTS];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }

  try {
    const { data, error } = await supabase
      .from("autonomous_events")
      .select("*")
      .order("received_at", { ascending: false });

    if (error) {
      const fallback = [...INITIAL_MOCK_AUTONOMOUS_EVENTS];
      return Object.assign(fallback, { data: fallback, isOffline: true });
    }

    const rows: AutonomousEvent[] = (data || []).map((row: any) => ({
      id: String(row.id),
      client_slug: String(row.client_slug || ""),
      event_type: (row.event_type || "heartbeat") as AutonomousEventType,
      period_date: String(row.period_date || ""),
      count_delta: Number(row.count_delta) || 0,
      engine_version: String(row.engine_version || "gate1-v1"),
      summary: row.summary && typeof row.summary === "object" ? row.summary : {},
      received_at: String(row.received_at || ""),
    }));
    return Object.assign(rows, { data: rows, isOffline: false });
  } catch {
    const fallback = [...INITIAL_MOCK_AUTONOMOUS_EVENTS];
    return Object.assign(fallback, { data: fallback, isOffline: true });
  }
}

export async function promoteLeadToActiveClient(
  lead: LeadPromotionInput,
  options: {
    supabaseClient?: any;
    promotedAt?: Date | string;
    tier?: ClientTierType;
    primaryDomain?: string | null;
    mapsPlaceId?: string | null;
    forceMock?: boolean;
  } = {}
): Promise<{
  ok: boolean;
  data: ActiveClient;
  isOffline: boolean;
  alreadyExisted?: boolean;
  error?: string;
}> {
  const built = buildActiveClientFromLead(lead, options);
  const supabase =
    options.supabaseClient !== undefined ? options.supabaseClient : getBrowserSupabaseClient();

  if (options.forceMock || isUnconfiguredSupabase(supabase)) {
    return { ok: true, data: built, isOffline: true };
  }

  try {
    // Verificar si ya existe por slug (o lead_id) para no sobrescribir checklist ni fechas SLA
    let existingRow: any = null;
    const { data: bySlug, error: lookupError } = await supabase
      .from("active_clients")
      .select("*")
      .eq("slug", built.slug);

    if (lookupError) {
      return { ok: false, data: built, isOffline: true, error: lookupError.message };
    }
    if (Array.isArray(bySlug) && bySlug.length > 0) {
      existingRow = bySlug[0];
    } else if (built.lead_id !== null) {
      const { data: byLeadId, error: leadLookupError } = await supabase
        .from("active_clients")
        .select("*")
        .eq("lead_id", built.lead_id);
      if (leadLookupError) {
        return { ok: false, data: built, isOffline: true, error: leadLookupError.message };
      }
      if (Array.isArray(byLeadId) && byLeadId.length > 0) {
        existingRow = byLeadId[0];
      }
    }

    if (existingRow) {
      const existing = mapActiveClientRow(existingRow);
      const syncPatch = {
        lead_id: existing.lead_id ?? built.lead_id,
        provider_name: built.provider_name || existing.provider_name,
        niche: built.niche || existing.niche,
        primary_domain: existing.primary_domain || built.primary_domain,
        maps_place_id: existing.maps_place_id || built.maps_place_id,
        review_url: existing.review_url || built.review_url,
        metadata: {
          ...(existing.metadata || {}),
          ...(built.metadata || {}),
        },
      };

      const { data: updated, error: updateError } = await supabase
        .from("active_clients")
        .update(syncPatch)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        return {
          ok: false,
          data: existing,
          isOffline: false,
          alreadyExisted: true,
          error: updateError.message,
        };
      }

      return {
        ok: true,
        data: updated ? mapActiveClientRow(updated) : { ...existing, ...syncPatch },
        isOffline: false,
        alreadyExisted: true,
      };
    }

    const dbPayload = {
      lead_id: built.lead_id,
      slug: built.slug,
      provider_name: built.provider_name,
      niche: built.niche,
      tier: built.tier,
      primary_domain: built.primary_domain,
      maps_place_id: built.maps_place_id,
      review_url: built.review_url,
      delivery_status: built.delivery_status,
      checklist: built.checklist,
      aeo_verified: built.aeo_verified,
      promoted_at: built.promoted_at,
      delivery_deadline_at: built.delivery_deadline_at,
      delivered_at: built.delivered_at,
      trial_ends_at: built.trial_ends_at,
      hosting_renews_at: built.hosting_renews_at,
      metadata: built.metadata || {},
    };

    const { data, error } = await supabase
      .from("active_clients")
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      return { ok: false, data: built, isOffline: true, error: error.message };
    }

    return {
      ok: true,
      data: data ? mapActiveClientRow(data) : built,
      isOffline: false,
      alreadyExisted: false,
    };
  } catch (err: any) {
    return {
      ok: false,
      data: built,
      isOffline: true,
      error: err?.message || "Fallo de conexión Supabase",
    };
  }
}

export async function updateActiveClient(
  slugOrId: { id?: string; slug?: string },
  patch: Partial<Omit<ActiveClient, "id" | "slug">>,
  customClient?: any
): Promise<{ ok: boolean; data?: ActiveClient; error?: string }> {
  const supabase = customClient !== undefined ? customClient : getBrowserSupabaseClient();
  if (isUnconfiguredSupabase(supabase)) {
    return { ok: true };
  }

  try {
    let query = supabase.from("active_clients").update(patch);
    if (slugOrId.id && !slugOrId.id.startsWith("active-") && !slugOrId.id.startsWith("mock-")) {
      query = query.eq("id", slugOrId.id);
    } else if (slugOrId.slug) {
      query = query.eq("slug", slugOrId.slug);
    } else if (slugOrId.id) {
      query = query.eq("id", slugOrId.id);
    }

    const { data, error } = await query.select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ? mapActiveClientRow(data) : undefined };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error actualizando prestador" };
  }
}
