#!/usr/bin/env node
/**
 * scripts/generate-voice-note.mjs
 * Helper CLI desacoplado para ElevenLabs Plan Starter:
 * toma el audio_script_35s humanizado de un lead o ficha y genera una nota de voz
 * lista para enviar de forma semi-asistida por WhatsApp (Gate 0), con --dry-run y fetch inyectable.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { resolveLeadMetadata } from "./generate-client-fiche.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  if (existsSync(join(REPO_ROOT, ".env"))) {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  }
} catch {
  // Ignorar si .env no existe o ya fue cargado
}

export const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";
export const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";

export function cleanVoiceScriptText(rawText = "") {
  let clean = String(rawText ?? "")
    .replace(/\[GUION\s+AUDIO\s+35s\]\s*/gi, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'")) ||
    (clean.startsWith("“") && clean.endsWith("”"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

export function extractAudioScriptFromLead(options = {}) {
  if (typeof options.text === "string" && options.text.trim()) {
    return cleanVoiceScriptText(options.text);
  }

  let leadObj = options.lead && typeof options.lead === "object" ? { ...options.lead } : null;
  const candidateFichePath = options.fichePath
    ? resolve(process.cwd(), options.fichePath)
    : options.slug
      ? join(REPO_ROOT, "clients", `${options.slug}.md`)
      : null;

  if (!leadObj && candidateFichePath && existsSync(candidateFichePath)) {
    const rawMd = readFileSync(candidateFichePath, "utf8");
    const fm = rawMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {
      const parsed = parseYaml(fm[1]) || {};
      leadObj = {
        id: parsed.id,
        slug: parsed.slug || options.slug,
        nombre: parsed.nombre,
        name: parsed.nombre,
        rubro: parsed.rubro,
        niche: parsed.rubro,
        website_url: parsed.website_url,
        website_bucket: parsed.website_bucket,
        audio_script_35s: parsed.audio_script_35s,
        demo_url: parsed.subdominio
          ? `https://${String(parsed.subdominio).replace(/^https?:\/\//, "")}`
          : undefined,
      };
    }
  }

  if (leadObj) {
    const meta = resolveLeadMetadata(leadObj);
    return cleanVoiceScriptText(meta.audio_script_35s);
  }

  return "";
}

export async function generateVoiceNote(options = {}) {
  const slug = String(options.slug || "voice-note").trim() || "voice-note";
  const outputFormat = String(options.outputFormat || DEFAULT_OUTPUT_FORMAT).trim();
  const modelId = String(options.modelId || DEFAULT_ELEVENLABS_MODEL).trim();
  const ext = outputFormat.toLowerCase().includes("ogg") || outputFormat.toLowerCase().includes("opus")
    ? "ogg"
    : "mp3";
  const outputDir = options.outputDir || join(REPO_ROOT, ".reports", "voice-notes");
  const outputPath = options.outputPath || join(outputDir, `${slug}.${ext}`);

  const cleanedText = extractAudioScriptFromLead(options);
  if (!cleanedText) {
    throw new Error(
      "No se encontró guion de voz (usá --text, --slug o --fiche con audio_script_35s)."
    );
  }

  if (options.dryRun) {
    return {
      status: "dry_run",
      slug,
      cleanedText,
      outputPath,
      outputFormat,
      modelId,
    };
  }

  const apiKey =
    options.apiKey !== undefined
      ? String(options.apiKey || "").trim()
      : String(process.env.ELEVENLABS_API_KEY || "").trim();
  const voiceId =
    options.voiceId !== undefined
      ? String(options.voiceId || "").trim()
      : String(process.env.ELEVENLABS_VOICE_ID || "").trim();

  if (!apiKey || !voiceId) {
    throw new Error(
      "Faltan ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID en el entorno para sintetizar el audio."
    );
  }

  const fetchFn = options.fetchImpl || globalThis.fetch;
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`;
  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: ext === "ogg" ? "audio/ogg" : "audio/mpeg",
    },
    body: JSON.stringify({
      text: cleanedText,
      model_id: modelId,
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.78,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`ElevenLabs HTTP ${res.status}: ${errTxt}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, audioBuffer);

  return {
    status: "generated",
    slug,
    cleanedText,
    outputPath,
    bytes: audioBuffer.byteLength,
    outputFormat,
    modelId,
  };
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--json") flags.json = true;
    else if (arg === "--slug" && argv[i + 1]) flags.slug = argv[++i];
    else if (arg === "--fiche" && argv[i + 1]) flags.fiche = argv[++i];
    else if (arg === "--text" && argv[i + 1]) flags.text = argv[++i];
    else if (arg === "--out" && argv[i + 1]) flags.out = argv[++i];
    else if (arg === "--format" && argv[i + 1]) flags.format = argv[++i];
    else if (arg === "--model" && argv[i + 1]) flags.model = argv[++i];
  }
  return flags;
}

async function main() {
  const flags = parseCliArgs();
  const result = await generateVoiceNote({
    slug: flags.slug,
    fichePath: flags.fiche,
    text: flags.text,
    outputPath: flags.out,
    outputFormat: flags.format,
    modelId: flags.model,
    dryRun: Boolean(flags.dryRun),
  });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(
    `\n\x1b[36m[voice-note]\x1b[0m Estado: ${result.status} | Slug: ${result.slug}\n- Texto: "${result.cleanedText}"\n- Destino: ${result.outputPath}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\x1b[31m[voice-note ERROR]\x1b[0m ${err.message}`);
    process.exit(1);
  });
}
