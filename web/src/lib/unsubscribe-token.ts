// web/src/lib/unsubscribe-token.ts — Tokens de baja firmados con HMAC-SHA256 (Web Crypto puro, compatible con Workers y Node 22)

export const DEFAULT_UNSUBSCRIBE_TTL_SECONDS = 90 * 24 * 60 * 60;
export const DEV_FALLBACK_UNSUBSCRIBE_SECRET = "nexobow-dev-unsubscribe-key";

export interface UnsubscribeTokenPayload {
  slug: string;
  email: string;
  exp: number;
}

export interface VerifyUnsubscribeTokenResult {
  valid: boolean;
  reason?: "malformed" | "missing_key" | "invalid_signature" | "expired";
  payload?: UnsubscribeTokenPayload;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(str: string): Uint8Array | null {
  const clean = String(str || "").trim();
  if (!clean || !/^[A-Za-z0-9\-_]+$/.test(clean)) {
    return null;
  }
  try {
    const padded = clean.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((clean.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Comparación en tiempo constante sobre arreglos de bytes del mismo tamaño.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function resolveUnsubscribeSecret(env?: Record<string, string | undefined>): string {
  const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
  const source = env !== undefined ? env : procEnv;
  const explicit = String(source.UNSUBSCRIBE_SECRET || "").trim();
  if (explicit) return explicit;

  const nodeEnv = String(source.NODE_ENV || "").trim().toLowerCase();
  const runtimeEnv = String(source.ENVIRONMENT || "").trim().toLowerCase();
  const cfPages = String(source.CF_PAGES || "").trim();
  if (nodeEnv === "production" || runtimeEnv === "production" || cfPages === "1") {
    return "";
  }
  return DEV_FALLBACK_UNSUBSCRIBE_SECRET;
}

async function importHmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  const keyBytes = textEncoder.encode(secret);
  return await globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

async function computeHmacSignature(payloadB64: string, secret: string): Promise<Uint8Array> {
  const key = await importHmacKey(secret, "sign");
  const sigBuffer = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payloadB64)
  );
  return new Uint8Array(sigBuffer);
}

export async function createUnsubscribeToken(
  input: { slug?: string; email?: string; exp?: number },
  secret: string,
  options: { ttlSeconds?: number; nowSeconds?: number } = {}
): Promise<string> {
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET requerido para firmar el enlace de baja.");
  }
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_UNSUBSCRIBE_TTL_SECONDS;
  const exp =
    typeof input.exp === "number" && Number.isFinite(input.exp)
      ? Math.floor(input.exp)
      : nowSeconds + ttlSeconds;

  const canonicalPayload: UnsubscribeTokenPayload = {
    slug: String(input.slug || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    exp,
  };

  const payloadB64 = toBase64Url(textEncoder.encode(JSON.stringify(canonicalPayload)));
  const sigBytes = await computeHmacSignature(payloadB64, secret);
  return `${payloadB64}.${toBase64Url(sigBytes)}`;
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
  options: { nowSeconds?: number } = {}
): Promise<VerifyUnsubscribeTokenResult> {
  if (!secret) {
    return { valid: false, reason: "missing_key" };
  }
  const clean = String(token || "").trim();
  const parts = clean.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "malformed" };
  }

  const [payloadB64, sigB64] = parts;
  const sigBytes = fromBase64Url(sigB64);
  if (!sigBytes || sigBytes.length !== 32) {
    return { valid: false, reason: "invalid_signature" };
  }

  const expectedSig = await computeHmacSignature(payloadB64, secret);
  if (!constantTimeEqual(sigBytes, expectedSig)) {
    return { valid: false, reason: "invalid_signature" };
  }

  const payloadBytes = fromBase64Url(payloadB64);
  if (!payloadBytes) {
    return { valid: false, reason: "malformed" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(payloadBytes));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as UnsubscribeTokenPayload).email !== "string" ||
    typeof (parsed as UnsubscribeTokenPayload).exp !== "number" ||
    !Number.isFinite((parsed as UnsubscribeTokenPayload).exp)
  ) {
    return { valid: false, reason: "malformed" };
  }

  const payload: UnsubscribeTokenPayload = {
    slug: String((parsed as UnsubscribeTokenPayload).slug || "").trim(),
    email: String((parsed as UnsubscribeTokenPayload).email || "").trim().toLowerCase(),
    exp: Number((parsed as UnsubscribeTokenPayload).exp),
  };

  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (nowSeconds > payload.exp) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, payload };
}

export function buildUnsubscribeUrl(
  token: string,
  rootDomain = "nexobow.site"
): string {
  const cleanDomain = String(rootDomain || "nexobow.site").trim() || "nexobow.site";
  const origin = /^https?:\/\//i.test(cleanDomain)
    ? cleanDomain.replace(/\/+$/, "")
    : `https://${cleanDomain.replace(/^\/+|\/+$/g, "")}`;
  return `${origin}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function buildUnsubscribeFooterHtml(unsubscribeUrl: string): string {
  const safeUrl = unsubscribeUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#6b7280;">Si preferís no recibir más correos sobre tu muestra web, podés <a href="${safeUrl}" style="color:#4b5563;text-decoration:underline;">darte de baja acá en 1 clic</a>.</p>`;
}

export function buildUnsubscribeFooterText(unsubscribeUrl: string): string {
  return `Si preferís no recibir más correos sobre tu muestra web, podés darte de baja acá en 1 clic: ${unsubscribeUrl}`;
}
