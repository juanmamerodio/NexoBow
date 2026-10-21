// scripts/prospect-batch.mjs — NexoBow: generador por lotes de prospectos y subrutas unificadas
// Uso: node scripts/prospect-batch.mjs [--query "nutricionista en Palermo"] [--count 15] [--mock]
// Códigos de salida: 0 = ok · 1 = error en lote

import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const MOCK_PROSPECTS = [
  {
    nombre: "Lic. Camila Valenzuela",
    slug: "demo-nutri-camila",
    rubro: "nutricionista",
    especialidad: "Nutrición Clínica y Composición Corporal",
    direccion: "Av. Corrientes 1234, CABA, Buenos Aires",
    telefono: "5491133445566",
    telefonoFormato: "+54 9 11 3344-5566",
    rating: 4.9,
    userRatingCount: 47,
  },
  {
    nombre: "Lic. Martín Palermo",
    slug: "demo-nutri-palermo",
    rubro: "nutricionista",
    especialidad: "Nutrición Deportiva y Alto Rendimiento",
    direccion: "Godoy Cruz 2200, Palermo, CABA",
    telefono: "5491155667788",
    telefonoFormato: "+54 9 11 5566-7788",
    rating: 4.8,
    userRatingCount: 38,
  },
  {
    nombre: "Lic. Luciana Belgrano",
    slug: "demo-nutri-luciana",
    rubro: "nutricionista",
    especialidad: "Hábitos Saludables y Digestión",
    direccion: "Juramento 1900, Belgrano, CABA",
    telefono: "5491166778899",
    telefonoFormato: "+54 9 11 6677-8899",
    rating: 4.9,
    userRatingCount: 41,
  },
];

async function main() {
  const flags = parseArgs();
  const isMock = Boolean(flags.mock);
  const query = flags.query || flags.q || "nutricionista en Buenos Aires";
  const count = parseInt(flags.count || "15", 10);

  const startTime = Date.now();
  const distPreviewsDir = join(REPO_ROOT, "dist-previews");
  mkdirSync(distPreviewsDir, { recursive: true });

  const processedLeads = [];

  const targetCount = isMock ? Math.min(count, MOCK_PROSPECTS.length) : count;

  for (let i = 0; i < targetCount; i++) {
    const leadMeta = isMock ? MOCK_PROSPECTS[i] : null;
    const currentSlug = leadMeta ? leadMeta.slug : `prospecto-nutri-${i + 1}`;
    const currentQuery = leadMeta ? leadMeta.nombre : `${query} #${i + 1}`;

    // 1. Scout Lead
    const scoutArgs = ["scripts/scout-lead.mjs", "--slug", currentSlug];
    if (isMock) {
      scoutArgs.push("--mock");
    } else {
      scoutArgs.push("--query", currentQuery);
    }

    const scoutRes = spawnSync("node", scoutArgs, { cwd: REPO_ROOT, shell: process.platform === "win32" });
    if (scoutRes.status !== 0) {
      console.error(`Error al ejecutar scout-lead para ${currentSlug}`);
      continue;
    }

    // 2. Generate Fiche
    const rawPath = join("assets", currentSlug, "lead-raw.json");
    const ficheRes = spawnSync("node", ["scripts/generate-client-fiche.mjs", rawPath], {
      cwd: REPO_ROOT,
      shell: process.platform === "win32",
    });
    if (ficheRes.status !== 0) {
      console.error(`Error al generar ficha para ${currentSlug}`);
      continue;
    }

    // 3. Build Client Site con base path
    const fichePath = join("clients", `${currentSlug}.md`);
    const buildRes = spawnSync(
      "node",
      ["scripts/build-client-site.mjs", fichePath, "--base", `/${currentSlug}/`],
      {
        cwd: REPO_ROOT,
        shell: process.platform === "win32",
      }
    );
    if (buildRes.status !== 0) {
      console.error(`Error al compilar sitio para ${currentSlug}`);
      continue;
    }

    // 4. Copiar salida a dist-previews/{slug}/
    const siteDist = join(REPO_ROOT, "sites", currentSlug, "dist");
    const previewTarget = join(distPreviewsDir, currentSlug);
    if (existsSync(previewTarget)) {
      rmSync(previewTarget, { recursive: true, force: true });
    }
    cpSync(siteDist, previewTarget, { recursive: true });

    // Cargar datos procesados para el reporte
    const rawData = JSON.parse(readFileSync(join(REPO_ROOT, rawPath), "utf8"));
    const rootDomain = process.env.NEXOBOW_ROOT_DOMAIN || "nexobow.site";
    const previewUrl = `https://preview.${rootDomain}/${currentSlug}`;
    const cleanPhone = String(rawData.telefono || "").replace(/\D/g, "");
    const waText = encodeURIComponent(
      `Hola ${rawData.nombre}! Vi tu perfil en Google Maps y preparé esta demo de tu consultorio online para agendar pacientes: ${previewUrl}`
    );
    const waLink = `https://wa.me/${cleanPhone}?text=${waText}`;

    processedLeads.push({
      slug: currentSlug,
      nombre: rawData.nombre,
      telefono: rawData.telefonoFormato || rawData.telefono,
      rating: rawData.rating,
      userRatingCount: rawData.userRatingCount,
      direccion: rawData.direccion,
      previewUrl,
      whatsappOutreachLink: waLink,
      status: "generado",
    });
  }

  const durationMs = Date.now() - startTime;
  const report = {
    status: "completed",
    total: processedLeads.length,
    durationMs,
    timestamp: new Date().toISOString(),
    leads: processedLeads,
  };

  // Guardar reporte en dist-previews/manifest.json para consumo de la PWA/API
  writeFileSync(join(distPreviewsDir, "manifest.json"), JSON.stringify(report, null, 2) + "\n", "utf8");

  // Output en JSON por stdout
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err.message }));
  process.exit(1);
});
