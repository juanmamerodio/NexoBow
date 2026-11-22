// web/functions/api/unsubscribe.ts — Cloudflare Pages Function
// Procesa bajas de correo firmadas con HMAC-SHA256 (GET redirect + POST RFC 8058 One-Click)

import {
  resolveUnsubscribeSecret,
  verifyUnsubscribeToken,
} from "../../src/lib/unsubscribe-token.ts";

export interface UnsubscribeEnv {
  PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  UNSUBSCRIBE_SECRET?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  CF_PAGES?: string;
}

export const MAX_UNSUB_BODY_BYTES = 4 * 1024;
const textEncoder = new TextEncoder();

export interface UnsubscribeLeadRow {
  id?: number | string;
  slug: string;
  metadata?: Record<string, unknown> | null;
}

export interface SupabaseLikeQuery {
  select(columns?: string): {
    eq(
      column: string,
      value: string | number
    ): {
      maybeSingle(): Promise<{ data: UnsubscribeLeadRow | null; error: { message: string } | null }>;
    };
  };
  update(patch: Record<string, unknown>): {
    eq(
      column: string,
      value: string | number
    ): Promise<{ data: UnsubscribeLeadRow[] | null; error: { message: string } | null }>;
  };
}

export interface SupabaseLikeClient {
  from(table: string): SupabaseLikeQuery;
}

export interface UnsubscribeContext {
  request: Request;
  env?: UnsubscribeEnv;
  supabaseClient?: SupabaseLikeClient;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function buildRestSupabaseAdapter(
  supabaseUrl: string,
  supabaseKey: string,
  fetchFn: typeof fetch
): SupabaseLikeClient {
  const cleanBase = supabaseUrl.replace(/\/+$/, "");
  const baseHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  return {
    from(table: string): SupabaseLikeQuery {
      return {
        select(columns = "*") {
          return {
            eq(column: string, value: string | number) {
              return {
                async maybeSingle() {
                  const queryUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(columns)}&${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}&limit=1`;
                  const res = await fetchFn(queryUrl, {
                    method: "GET",
                    headers: baseHeaders,
                  });
                  if (!res.ok) {
                    const errText = await res.text().catch(() => "");
                    return { data: null, error: { message: `HTTP ${res.status}: ${errText}` } };
                  }
                  const rows = (await res.json()) as UnsubscribeLeadRow[];
                  return {
                    data: Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
                    error: null,
                  };
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            async eq(column: string, value: string | number) {
              const patchUrl = `${cleanBase}/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}`;
              const res = await fetchFn(patchUrl, {
                method: "PATCH",
                headers: {
                  ...baseHeaders,
                  Prefer: "return=representation",
                },
                body: JSON.stringify(patch),
              });
              if (!res.ok) {
                const errText = await res.text().catch(() => "");
                return { data: null, error: { message: `HTTP ${res.status}: ${errText}` } };
              }
              const updated = (await res.json().catch(() => [])) as UnsubscribeLeadRow[];
              return { data: updated, error: null };
            },
          };
        },
      };
    },
  };
}

function resolveSupabaseClient(context: UnsubscribeContext): SupabaseLikeClient | null {
  if (context.supabaseClient) return context.supabaseClient;
  const env = context.env || {};
  const supabaseUrl = (env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  const supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey) return null;
  return buildRestSupabaseAdapter(supabaseUrl, supabaseKey, context.fetchImpl || globalThis.fetch);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function markLeadUnsubscribed(
  db: SupabaseLikeClient | null,
  slug: string,
  nowIso: string
): Promise<boolean> {
  if (!db || !slug) return false;
  try {
    const { data: lead, error: selectError } = await db
      .from("leads")
      .select("id, slug, metadata")
      .eq("slug", slug)
      .maybeSingle();

    if (selectError || !lead) return false;

    const currentMeta = isPlainObject(lead.metadata) ? lead.metadata : {};
    const currentEmailMarketing = isPlainObject(currentMeta.email_marketing)
      ? currentMeta.email_marketing
      : {};

    const nextMetadata = {
      ...currentMeta,
      marketing_opt_in: false,
      email_marketing: {
        ...currentEmailMarketing,
        unsubscribed: true,
        unsubscribed_at: nowIso,
      },
    };

    const { error: updateError } = await db
      .from("leads")
      .update({ metadata: nextMetadata })
      .eq("slug", lead.slug);

    return !updateError;
  } catch {
    return false;
  }
}

async function extractPostToken(
  request: Request,
  url: URL
): Promise<{ token: string; tooLarge: boolean }> {
  const fromQuery = (url.searchParams.get("token") || "").trim();
  if (fromQuery) return { token: fromQuery, tooLarge: false };

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  try {
    const raw = await request.text();
    if (textEncoder.encode(raw).byteLength > MAX_UNSUB_BODY_BYTES) {
      return { token: "", tooLarge: true };
    }
    if (!raw.trim()) return { token: "", tooLarge: false };
    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        token: typeof parsed?.token === "string" ? parsed.token.trim() : "",
        tooLarge: false,
      };
    }
    const params = new URLSearchParams(raw);
    return { token: (params.get("token") || "").trim(), tooLarge: false };
  } catch {
    return { token: "", tooLarge: false };
  }
}

function jsonNoStore(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const onRequestGet = async (context: UnsubscribeContext): Promise<Response> => {
  const { request, env = {}, now = () => new Date() } = context;
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();
  const signingKey = resolveUnsubscribeSecret(env as Record<string, string | undefined>);

  const verified =
    token && signingKey
      ? await verifyUnsubscribeToken(token, signingKey, {
          nowSeconds: Math.floor(now().getTime() / 1000),
        })
      : { valid: false };

  if (!verified.valid || !verified.payload) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${url.origin}/baja-email/?status=invalid`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const db = resolveSupabaseClient(context);
  const nowIso = now().toISOString();
  await markLeadUnsubscribed(db, verified.payload.slug, nowIso);

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${url.origin}/baja-email/?status=ok`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

export const onRequestPost = async (context: UnsubscribeContext): Promise<Response> => {
  const { request, env = {}, now = () => new Date() } = context;
  const url = new URL(request.url);
  const { token, tooLarge } = await extractPostToken(request, url);

  if (tooLarge) {
    return jsonNoStore({ ok: false, error: "Payload excede el tamaño máximo permitido." }, 413);
  }

  if (!token) {
    return jsonNoStore({ ok: false, error: "Token de baja requerido." }, 400);
  }

  const signingKey = resolveUnsubscribeSecret(env as Record<string, string | undefined>);
  const verified = signingKey
    ? await verifyUnsubscribeToken(token, signingKey, {
        nowSeconds: Math.floor(now().getTime() / 1000),
      })
    : { valid: false };

  if (!verified.valid || !verified.payload) {
    return jsonNoStore({ ok: false, error: "Token de baja inválido o expirado." }, 403);
  }

  const db = resolveSupabaseClient(context);
  const nowIso = now().toISOString();
  const leadUpdated = await markLeadUnsubscribed(db, verified.payload.slug, nowIso);

  return jsonNoStore(
    {
      ok: true,
      unsubscribed: true,
      slug: verified.payload.slug,
      email: verified.payload.email,
      unsubscribed_at: nowIso,
      lead_updated: leadUpdated,
    },
    200
  );
};
