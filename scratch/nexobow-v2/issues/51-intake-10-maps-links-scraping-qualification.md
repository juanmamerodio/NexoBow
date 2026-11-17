# 51: Pipeline Ingesta de 10 Links Google Maps → Calificación, Scraping Email/Web (Cubeta A/B) & Preview Live

**What to build:** El operador pega un lote curado de 1 a 10 links directos de Google Maps (links cortos `maps.app.goo.gl/...`, `goo.gl/maps/...`, URLs completas `/maps/place/...` o consultas puntuales por línea) y un orquestador dedicado (`scripts/intake-maps-batch.mjs` + skill `/.agents/skills/intake-maps-batch/SKILL.md`) ejecuta de punta a punta la ingesta Gate 0: resuelve redirecciones HTTP estándar sin evadir controles ni CAPTCHAs, consulta Places API / Serper para obtener nombre limpio, rubro inferido, dirección, ciudad, teléfono normalizado en formato WhatsApp argentino (`+549...`), rating, cantidad de reseñas, textos reales de reseñas (atribuidas explícitamente a `"Google Maps"` con `consentimiento_testimonios: false` según Ley 25.326) y `websiteUri`. Si existe web o bio vinculada, el scraper inspecciona el HTML público (máximo 1 salto interno a `/contacto` o `/contact`, timeout `<= 6s`) para capturar emails válidos filtrando falsos positivos, detectar links sociales (Instagram, Facebook, `wa.me`) y clasificar al prestador en **`Cubeta A`** (sin sitio propio / solo redes, Linktree, Doctoralia o `wa.me`) o **`Cubeta B`** (sitio propio existente con señales objetivas de obsolescencia: falta de HTTPS, sin `<meta name="viewport">`, stack pesado WordPress/Wix/Elementor o ausencia de CTA directo a WhatsApp/turno). Luego califica al prospecto (`0–100`, grado `A/B/C`), asigna `tier_recomendado` (`tier_1_starter` `$189.999 ARS` o `tier_2_autonomous` `$549.999 ARS`), modalidad, tipo de consulta y ángulo Hormozi (`"Anti-Silla Vacía & Cero-Secretaria"`), genera la ficha correlativa en `clients/{slug}.md`, compila el clon con el `Preview Studio HUD 10x`, despliega a `https://preview.nexobow.site/{slug}/` (desactivable vía `--no-deploy` / `--dry-run`), sincroniza en Supabase `public.leads` con el contrato extendido de `LeadMetadata` y entrega la tabla/JSON consolidada lista para contactar (Preview URL, email, Cubeta, mensaje de WhatsApp y guion de audio de 35s).

**Blocked by:** 50: NexoBow Preview Studio HUD 10x + Fix WhatsApp 5493489536088 en 10 Templates.

**Status:** done

## Seams Under Test (`/tdd`)

- **Seam 1 (`parseGoogleMapsUrlInput` & `resolveGoogleMapsUrl` con `fetch` inyectable):**
  - *Qué atrapa:* Validación de límite duro de `1` a `10` links por lote, deduplicación de URLs equivalentes, resolución de links cortos (`maps.app.goo.gl`, `goo.gl/maps`) mediante redirección estándar, y extracción de nombre/coordenadas/`cid` desde URLs canónicas `/maps/place/...`.
  - *Qué omite:* Conexión real a servidores de Google o Serper.
- **Seam 2 (`extractEmailsFromHtml`, `extractContactFromWebsite`, `classifyWebsiteBucket` & `qualifyLeadForGate0`):**
  - *Qué atrapa:* Extracción limpia de emails desde `mailto:` y texto HTML (con salto de hasta 1 ruta `/contacto` o `/contact`), rechazo de falsos positivos (`@2x`, `.png`, `.jpg`, `.svg`, `.webp`, `sentry.io`, `wixpress.com`, `example.com`), captura de links sociales, clasificación determinista `cubeta_a` vs `cubeta_b` con señales `has_https`/`has_mobile_viewport`/`signals`, y puntaje exacto `0–100` (`+35` WhatsApp válido, `+20` rating `>= 4.3` y reseñas `>= 5`, `+20` nicho High-Ticket, `+15` Cubeta A o Cubeta B con fallas, `+10` email válido) junto con `tier_recomendado`.
  - *Qué omite:* Scraping en vivo sobre sitios reales externos.
- **Seam 3 (Orquestación de Lote End-to-End con proveedores inyectables):**
  - *Qué atrapa:* Generación de ficha correlativa con `email`, `website_url`, `website_bucket`, `maps_url`, `qualification` y reseñas; invocación al build del clon con HUD 10x (`--no-deploy` / `--dry-run`); armado del payload para Supabase `public.leads`; y salida consolidada sin duplicados lista para outbound.
  - *Qué omite:* Despliegue real con Wrangler CLI.

## Schema & State Contract (`LeadMetadata` — Gate 0 Intake)

```ts
export interface Gate0LeadEnrichment {
  website_url?: string | null;
  website_bucket?: "cubeta_a" | "cubeta_b";
  website_audit?: {
    has_https?: boolean;
    has_mobile_viewport?: boolean;
    signals?: string[];
  };
  rating?: number | null;
  reviews_count?: number;
  reviews_summary?: Array<{ author: string; rating?: number; text: string }>;
  qualification?: {
    score: number; // 0..100
    grade: "A" | "B" | "C";
    recommended_tier: "tier_1_starter" | "tier_2_autonomous" | "tier_3_growth";
    reasons: string[];
  };
}
```

## Acceptance Criteria

- [x] **[RED]** Crear `tests/intake-maps-batch.test.mjs` cubriendo las 3 costuras (`parseGoogleMapsUrlInput`/`resolveGoogleMapsUrl`, `extractEmailsFromHtml`/`classifyWebsiteBucket`/`qualifyLeadForGate0`, y orquestación de lote con proveedores mock sin llamadas externas) y verificar que falle antes de implementar.
- [x] **[GREEN]** Implementar `scripts/intake-maps-batch.mjs` con límite de `1..10` links, resolvedor de redirecciones estándar, extractor de email/redes con límite `<= 6s` y 1 salto a `/contacto`, clasificador `Cubeta A/B`, motor `qualifyLeadForGate0`, generación de ficha, build con HUD 10x, despliegue opcional, sincronización Supabase y salida estructurada.
- [x] **[GREEN]** Documentar la skill operativa en `/.agents/skills/intake-maps-batch/SKILL.md` (y verificar disponibilidad vía `.claude/skills`) con el flujo de entrada de hasta 10 links y respeto estricto a Ley 25.326.
- [x] **[VERIFY]** Ejecutar `node --test tests/intake-maps-batch.test.mjs && npm test && npm --prefix web run build` con 0 errores y 0 etiquetas `<script>` ejecutables en `web/dist/index.html`.
