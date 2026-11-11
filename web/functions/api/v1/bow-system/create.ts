// web/functions/api/v1/bow-system/create.ts — Cloudflare Pages Function
// Maneja el formulario inbound de solicitud de preview gratuita desde la web oficial

interface Env {
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

function slugifyPart(text: string, fallback: string): string {
  const clean = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 28);
  return clean || fallback;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    let name = "";
    let rubro = "";
    let mapsUrl = "";
    let whatsapp = "";
    let email = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, string>;
      name = String(body.name || body.nombre || "").trim();
      rubro = String(body.rubro || body.especialidad || "").trim();
      mapsUrl = String(body.maps_url || body.link || "").trim();
      whatsapp = String(body.whatsapp || body.telefono || "").trim();
      email = String(body.email || "").trim();
    } else {
      const formData = await request.formData();
      name = String(formData.get("name") || formData.get("nombre") || "").trim();
      rubro = String(formData.get("rubro") || formData.get("especialidad") || "").trim();
      mapsUrl = String(formData.get("maps_url") || formData.get("link") || "").trim();
      whatsapp = String(formData.get("whatsapp") || formData.get("telefono") || "").trim();
      email = String(formData.get("email") || "").trim();
    }

    const supabaseUrl = env.PUBLIC_SUPABASE_URL || "https://bcfhwwqkgmwboflytmtm.supabase.co";
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseKey && (name || whatsapp || email)) {
      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      };

      // Calcular el próximo ID correlativo real para evitar colisiones si la secuencia IDENTITY quedó desfasada
      let nextId = Date.now() % 100000;
      const latestRes = await fetch(`${supabaseUrl}/rest/v1/leads?select=id&order=id.desc&limit=1`, {
        headers,
      }).catch(() => null);

      if (latestRes && latestRes.ok) {
        const latestRows = (await latestRes.json()) as Array<{ id?: number }>;
        const maxId = Number(latestRows?.[0]?.id || 0);
        if (Number.isFinite(maxId) && maxId >= 0) {
          nextId = maxId + 1;
        }
      }

      const cleanDigits = whatsapp.replace(/\D/g, "");
      const nameToken = slugifyPart(name, "inbound");
      const rubroToken = slugifyPart(rubro, "salud");
      const slug = `${nextId}-${nameToken}-${rubroToken}`;
      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const insertPayload = {
        id: nextId,
        slug,
        name: name || "Prospecto Inbound Web",
        niche: rubro || "Salud / Servicios",
        contact_channel: "WhatsApp",
        whatsapp_link: cleanDigits ? `https://wa.me/${cleanDigits}` : null,
        social_link: mapsUrl || null,
        location: "Argentina / LATAM",
        city: "Argentina",
        funnel_status: "1. Prospecto Identificado",
        response_status: "Sin Contactar",
        potential_value: "$189.999 ARS",
        business_status: "En Proceso",
        phone: cleanDigits ? `+${cleanDigits}` : whatsapp || null,
        notes: `Solicitud Inbound Web. Email: ${email || "No provisto"}. Rubro: ${rubro || "No indicado"}. Maps/IG: ${mapsUrl || "No provisto"}`,
        last_activity_at: nowIso,
        expires_at: expiresIso,
        metadata: {
          source: "inbound_web",
          email: email || null,
          maps_url: mapsUrl || null,
        },
      };

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(insertPayload),
      });

      if (!insertRes.ok) {
        const errBody = await insertRes.text();
        console.error("Error al registrar lead en Supabase:", insertRes.status, errBody);
      }
    }

    if (contentType.includes("application/json")) {
      return new Response(JSON.stringify({ ok: true, redirect: "/solicitud-enviada/" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${url.origin}/solicitud-enviada/`,
      },
    });
  } catch (error) {
    console.error("Error en endpoint /api/v1/bow-system/create:", error);
    return Response.redirect(`${url.origin}/solicitud-enviada/`, 303);
  }
};
