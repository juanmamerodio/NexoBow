// tests/admin-videos.test.mjs — Suite TDD para Videos Alaynow: Pipeline Editorial de Contenido YouTube (Ticket 43)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_FILE = join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20261102040000_alaynow_videos_init.sql"
);
const VIDEOS_LIB = join(REPO_ROOT, "web", "src", "lib", "videos.ts");
const VIDEOS_VIEW_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "views",
  "VideosView.tsx"
);
const VIDEOS_REEXPORT_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "VideosView.tsx"
);
const ADMIN_APP_FILE = join(
  REPO_ROOT,
  "web",
  "src",
  "components",
  "admin",
  "AdminApp.tsx"
);

test("T43: Videos Alaynow: Pipeline Editorial de Contenido YouTube", async (t) => {
  // --- SEAM 1: MIGRACIÓN SQL Y POLÍTICAS RLS ---
  await t.test(
    "1. Migración SQL crea tabla alaynow_videos, enum video_production_stage, sponsor, métricas y RLS",
    () => {
      assert.ok(
        existsSync(MIGRATION_FILE),
        `La migración ${MIGRATION_FILE} debe existir`
      );
      const sql = readFileSync(MIGRATION_FILE, "utf8");

      // Validar enum video_production_stage
      assert.match(
        sql,
        /CREATE TYPE public\.video_production_stage AS ENUM/i,
        "Debe crear enum video_production_stage"
      );
      assert.match(
        sql,
        /'idea'[\s\S]*'guion'[\s\S]*'grabacion'[\s\S]*'edicion'[\s\S]*'programado'[\s\S]*'publicado'/i,
        "video_production_stage debe incluir las 6 etapas: idea, guion, grabacion, edicion, programado, publicado"
      );

      // Validar tabla alaynow_videos
      assert.match(
        sql,
        /CREATE TABLE IF NOT EXISTS public\.alaynow_videos/i,
        "Debe crear la tabla public.alaynow_videos"
      );
      assert.match(
        sql,
        /stage public\.video_production_stage/i,
        "Debe contener columna stage con enum video_production_stage"
      );
      assert.match(
        sql,
        /target_date date/i,
        "Debe contener columna target_date de tipo date"
      );
      assert.match(
        sql,
        /script_url text/i,
        "Debe contener columna script_url para enlaces a guiones"
      );
      assert.match(
        sql,
        /thumbnail_url text/i,
        "Debe contener columna thumbnail_url para preview de miniatura"
      );
      assert.match(
        sql,
        /video_url text/i,
        "Debe contener columna video_url para enlaces a YouTube"
      );
      assert.match(
        sql,
        /has_sponsor boolean/i,
        "Debe contener columna has_sponsor"
      );
      assert.match(
        sql,
        /sponsor_name text/i,
        "Debe contener columna sponsor_name"
      );
      assert.match(
        sql,
        /sponsor_fee numeric/i,
        "Debe contener columna sponsor_fee"
      );
      assert.match(
        sql,
        /is_sponsor_paid boolean/i,
        "Debe contener columna is_sponsor_paid"
      );
      assert.match(
        sql,
        /views_count integer/i,
        "Debe contener columna views_count para vistas de YouTube"
      );
      assert.match(
        sql,
        /ctr_percent numeric/i,
        "Debe contener columna ctr_percent para Click-Through Rate"
      );

      // Validar RLS y Políticas
      assert.match(
        sql,
        /ALTER TABLE public\.alaynow_videos ENABLE ROW LEVEL SECURITY/i,
        "Debe habilitar Row Level Security (RLS)"
      );
      assert.match(
        sql,
        /CREATE POLICY "Admin owner has full access to alaynow_videos"/i,
        "Debe crear la política restrictiva para el admin owner"
      );
    }
  );

  // --- SEAM 2: ETAPAS DE PRODUCCIÓN, SECUENCIA Y TRANSICIONES ---
  await t.test(
    "2. Etapas editoriales en web/src/lib/videos.ts: orden, configuración y transiciones",
    async () => {
      assert.ok(existsSync(VIDEOS_LIB), `El módulo ${VIDEOS_LIB} debe existir`);
      const {
        STAGE_ORDER,
        VIDEO_STAGES,
        isValidVideoStage,
        getNextStage,
        getPreviousStage,
      } = await import(VIDEOS_LIB);

      assert.deepEqual(STAGE_ORDER, [
        "idea",
        "guion",
        "grabacion",
        "edicion",
        "programado",
        "publicado",
      ]);

      assert.equal(VIDEO_STAGES.length, 6);
      for (const stage of STAGE_ORDER) {
        const found = VIDEO_STAGES.find((s) => s.stage === stage);
        assert.ok(found, `Debe existir configuración para la etapa ${stage}`);
        assert.ok(found.label, `Etapa ${stage} debe tener label`);
        assert.ok(found.color, `Etapa ${stage} debe tener color`);
      }

      // Validación de etapas
      assert.equal(isValidVideoStage("idea"), true);
      assert.equal(isValidVideoStage("guion"), true);
      assert.equal(isValidVideoStage("grabacion"), true);
      assert.equal(isValidVideoStage("edicion"), true);
      assert.equal(isValidVideoStage("programado"), true);
      assert.equal(isValidVideoStage("publicado"), true);
      assert.equal(isValidVideoStage("desconocido"), false);
      assert.equal(isValidVideoStage(null), false);

      // Avance secuencial
      assert.equal(getNextStage("idea"), "guion");
      assert.equal(getNextStage("guion"), "grabacion");
      assert.equal(getNextStage("grabacion"), "edicion");
      assert.equal(getNextStage("edicion"), "programado");
      assert.equal(getNextStage("programado"), "publicado");
      assert.equal(getNextStage("publicado"), null);

      // Retroceso secuencial
      assert.equal(getPreviousStage("publicado"), "programado");
      assert.equal(getPreviousStage("programado"), "edicion");
      assert.equal(getPreviousStage("edicion"), "grabacion");
      assert.equal(getPreviousStage("grabacion"), "guion");
      assert.equal(getPreviousStage("guion"), "idea");
      assert.equal(getPreviousStage("idea"), null);
    }
  );

  // --- SEAM 3: VALIDACIÓN DE PAYLOADS DE VIDEO ---
  await t.test(
    "3. Validación de contratos y restricciones para creación/edición de videos",
    async () => {
      const { validateVideoPayload } = await import(VIDEOS_LIB);

      // Válido
      const validVideo = {
        title: "Estrategias de Prospección en Frío",
        stage: "idea",
        has_sponsor: false,
      };
      assert.equal(validateVideoPayload(validVideo).valid, true);

      // Título vacío
      const emptyTitle = { title: "   ", stage: "idea" };
      const resEmpty = validateVideoPayload(emptyTitle);
      assert.equal(resEmpty.valid, false);
      assert.ok(resEmpty.errors.some((e) => e.includes("obligatorio")));

      // Título demasiado largo
      const longTitle = { title: "A".repeat(200), stage: "idea" };
      const resLong = validateVideoPayload(longTitle);
      assert.equal(resLong.valid, false);
      assert.ok(resLong.errors.some((e) => e.includes("180")));

      // Sponsor sin marca
      const sponsorNoBrand = {
        title: "Video Patrocinado",
        stage: "guion",
        has_sponsor: true,
        sponsor_name: "",
        sponsor_fee: 500,
      };
      const resSponsor = validateVideoPayload(sponsorNoBrand);
      assert.equal(resSponsor.valid, false);
      assert.ok(resSponsor.errors.some((e) => e.includes("marca")));

      // CTR fuera de rango
      const invalidCtr = {
        title: "Video Publicado",
        stage: "publicado",
        views_count: 1000,
        ctr_percent: 150,
      };
      const resCtr = validateVideoPayload(invalidCtr);
      assert.equal(resCtr.valid, false);
      assert.ok(resCtr.errors.some((e) => e.includes("CTR")));
    }
  );

  // --- SEAM 4: CÁLCULO DE KPIS Y AGREGACIÓN DEL PIPELINE ---
  await t.test(
    "4. computeVideoPipelineKpis calcula métricas globales, vistas, CTR y sponsor revenue",
    async () => {
      const { computeVideoPipelineKpis, groupVideosByStage } = await import(
        VIDEOS_LIB
      );

      const sampleVideos = [
        {
          id: 1,
          title: "Video Idea 1",
          stage: "idea",
          has_sponsor: false,
        },
        {
          id: 2,
          title: "Video Guion 1",
          stage: "guion",
          has_sponsor: true,
          sponsor_name: "Brand A",
          sponsor_fee: 400,
          sponsor_currency: "USD",
          is_sponsor_paid: true,
        },
        {
          id: 3,
          title: "Video Rodaje 1",
          stage: "grabacion",
          has_sponsor: false,
        },
        {
          id: 4,
          title: "Video Edición 1",
          stage: "edicion",
          has_sponsor: true,
          sponsor_name: "Brand B",
          sponsor_fee: 600,
          sponsor_currency: "USD",
          is_sponsor_paid: false,
        },
        {
          id: 5,
          title: "Video Publicado 1",
          stage: "publicado",
          has_sponsor: true,
          sponsor_name: "Brand C",
          sponsor_fee: 500,
          sponsor_currency: "USD",
          is_sponsor_paid: true,
          views_count: 10000,
          ctr_percent: 8.0,
        },
        {
          id: 6,
          title: "Video Publicado 2",
          stage: "publicado",
          has_sponsor: false,
          views_count: 5000,
          ctr_percent: 6.0,
        },
      ];

      const kpis = computeVideoPipelineKpis(sampleVideos);

      assert.equal(kpis.totalVideos, 6);
      assert.equal(kpis.inProductionCount, 4); // idea, guion, grabacion, edicion
      assert.equal(kpis.publishedCount, 2); // 2 publicados
      assert.equal(kpis.totalViews, 15000);
      assert.equal(kpis.avgCtr, 7.0); // (8 + 6) / 2 = 7.0
      assert.equal(kpis.totalSponsorRevenueUsd, 1500); // 400 + 600 + 500
      assert.equal(kpis.paidSponsorRevenueUsd, 900); // 400 + 500
      assert.equal(kpis.pendingSponsorRevenueUsd, 600); // 600
      assert.equal(kpis.sponsoredVideosCount, 3);
      assert.equal(kpis.videosByStage.idea, 1);
      assert.equal(kpis.videosByStage.guion, 1);
      assert.equal(kpis.videosByStage.grabacion, 1);
      assert.equal(kpis.videosByStage.edicion, 1);
      assert.equal(kpis.videosByStage.programado, 0);
      assert.equal(kpis.videosByStage.publicado, 2);

      // Verificación de agrupamiento por etapas para el Kanban
      const grouped = groupVideosByStage(sampleVideos);
      assert.equal(grouped.idea.length, 1);
      assert.equal(grouped.guion.length, 1);
      assert.equal(grouped.grabacion.length, 1);
      assert.equal(grouped.edicion.length, 1);
      assert.equal(grouped.programado.length, 0);
      assert.equal(grouped.publicado.length, 2);
    }
  );

  // --- SEAM 5: INGRESOS POR PATROCINIO Y FILTRADO ---
  await t.test(
    "5. calculateSponsorRevenue y filterVideos gestionan finanzas de YouTube y búsqueda",
    async () => {
      const { calculateSponsorRevenue, filterVideos } = await import(
        VIDEOS_LIB
      );

      const videos = [
        {
          id: 1,
          title: "Video Tech",
          description: "Desarrollo con IA",
          stage: "idea",
          has_sponsor: true,
          sponsor_name: "Notion",
          sponsor_fee: 300,
          sponsor_currency: "USD",
          is_sponsor_paid: true,
          tags: ["ia", "tech"],
        },
        {
          id: 2,
          title: "Video Salud",
          description: "Nutricionistas y clínicas",
          stage: "publicado",
          has_sponsor: true,
          sponsor_name: "Laboratorio AR",
          sponsor_fee: 250000,
          sponsor_currency: "ARS",
          is_sponsor_paid: false,
          tags: ["salud", "clinica"],
        },
        {
          id: 3,
          title: "Video Orgánico",
          description: "Sin sponsor",
          stage: "guion",
          has_sponsor: false,
          tags: ["crecimiento"],
        },
      ];

      // Cálculo de ingresos con tipo de cambio (250000 ARS / 1250 = 200 USD)
      const rev = calculateSponsorRevenue(videos, 1250);
      assert.equal(rev.totalUsd, 500); // 300 + 200
      assert.equal(rev.paidUsd, 300);
      assert.equal(rev.pendingUsd, 200);
      assert.equal(rev.totalArs, 625000); // 500 * 1250

      // Filtro por patrocinio
      const sponsoredOnly = filterVideos(videos, { hasSponsor: true });
      assert.equal(sponsoredOnly.length, 2);

      const noSponsorOnly = filterVideos(videos, { hasSponsor: false });
      assert.equal(noSponsorOnly.length, 1);

      // Filtro por texto
      const searchMatch = filterVideos(videos, { search: "notion" });
      assert.equal(searchMatch.length, 1);
      assert.equal(searchMatch[0].id, 1);

      const tagMatch = filterVideos(videos, { search: "salud" });
      assert.equal(tagMatch.length, 1);
      assert.equal(tagMatch[0].id, 2);
    }
  );

  // --- SEAM 6: FORMATEO DE MÉTRICAS Y ENGAGEMENT ---
  await t.test(
    "6. Funciones de formateo de vistas, CTR y engagement post-lanzamiento",
    async () => {
      const {
        formatViewsCount,
        formatCtrPercent,
        calculateEngagementRate,
      } = await import(VIDEOS_LIB);

      // Formato de vistas
      assert.equal(formatViewsCount(0), "0");
      assert.equal(formatViewsCount(850), "850");
      assert.equal(formatViewsCount(1500), "1.5K");
      assert.equal(formatViewsCount(14250), "14.3K");
      assert.equal(formatViewsCount(1200000), "1.2M");

      // Formato de CTR %
      assert.equal(formatCtrPercent(0), "0.0%");
      assert.equal(formatCtrPercent(7.42), "7.4%");
      assert.equal(formatCtrPercent(10), "10.0%");

      // Engagement Rate
      // 1000 vistas, 50 likes, 10 comentarios = 60 / 1000 = 6%
      assert.equal(calculateEngagementRate(1000, 50, 10), 6);
      assert.equal(calculateEngagementRate(0, 50, 10), 0);
    }
  );

  // --- SEAM 7: INTEGRACIÓN UI, COMPONENTE KANBAN Y ROUTING ---
  await t.test(
    "7. VideosView.tsx implementa tablero Kanban (6 etapas), modal de edición y enrutador /admin/alaynow",
    () => {
      assert.ok(
        existsSync(VIDEOS_VIEW_FILE),
        `El componente ${VIDEOS_VIEW_FILE} debe existir`
      );
      assert.ok(
        existsSync(VIDEOS_REEXPORT_FILE),
        `El re-export ${VIDEOS_REEXPORT_FILE} debe existir`
      );

      const viewCode = readFileSync(VIDEOS_VIEW_FILE, "utf8");
      const appCode = readFileSync(ADMIN_APP_FILE, "utf8");

      // Validar presencia de las 6 etapas en la UI
      assert.match(
        viewCode,
        /STAGE_ORDER\.map/i,
        "VideosView debe mapear STAGE_ORDER para renderizar las 6 columnas Kanban"
      );
      assert.match(
        viewCode,
        /VideoCard/i,
        "VideosView debe renderizar subcomponente VideoCard"
      );
      assert.match(
        viewCode,
        /isModalOpen/i,
        "VideosView debe incluir modal de creación/edición completa"
      );
      assert.match(
        viewCode,
        /isMetricsModalOpen/i,
        "VideosView debe incluir modal rápido de actualización de métricas post-publicación"
      );
      assert.match(
        viewCode,
        /script_url/i,
        "VideosView debe soportar enlace directo al guión"
      );
      assert.match(
        viewCode,
        /has_sponsor/i,
        "VideosView debe soportar y visualizar badges de patrocinio"
      );

      // Validar integración en AdminApp.tsx
      assert.match(
        appCode,
        /import\s*\{\s*VideosView\s*\}\s*from\s*"\.\/views\/VideosView"/i,
        "AdminApp.tsx debe importar VideosView"
      );
      assert.match(
        appCode,
        /currentPath === "\/admin\/alaynow"/i,
        "AdminApp.tsx debe enrutar /admin/alaynow hacia VideosView"
      );
    }
  );
});
