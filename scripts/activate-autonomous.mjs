#!/usr/bin/env node
// scripts/activate-autonomous.mjs — Preflight Zero-Trust y Activación en 1 Comando de NexoBow Autonomous (Ticket #60)

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_PATHS = {
  composeRelative: join("infra", "autonomous", "docker-compose.yml"),
  envExampleRelative: join("infra", "autonomous", ".env.autonomous.example"),
  defaultEnvFileRelative: join("infra", "autonomous", ".env.autonomous"),
  sqlInitRelative: join("infra", "autonomous", "sql", "001_autonomous_init.sql"),
};

export const REQUIRED_ENV_VARS = [
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "REDIS_PASSWORD",
  "N8N_ENCRYPTION_KEY",
  "WEBHOOK_URL",
  "META_WABA_VERIFY_TOKEN",
  "META_WABA_APP_SECRET",
  "META_WABA_ACCESS_TOKEN",
  "NEXOBOW_INGEST_URL",
  "AUTONOMOUS_INGEST_KEY",
  "N8N_LOCAL_PORT",
];

export const SENSITIVE_ENV_VARS = [
  "POSTGRES_PASSWORD",
  "REDIS_PASSWORD",
  "N8N_ENCRYPTION_KEY",
  "WEBHOOK_URL",
  "META_WABA_VERIFY_TOKEN",
  "META_WABA_APP_SECRET",
  "META_WABA_ACCESS_TOKEN",
  "NEXOBOW_INGEST_URL",
  "AUTONOMOUS_INGEST_KEY",
];

const MIN_LENGTH_RULES = {
  POSTGRES_PASSWORD: 16,
  REDIS_PASSWORD: 16,
  N8N_ENCRYPTION_KEY: 32,
  META_WABA_VERIFY_TOKEN: 12,
  META_WABA_APP_SECRET: 16,
  META_WABA_ACCESS_TOKEN: 16,
  AUTONOMOUS_INGEST_KEY: 16,
};

const PLACEHOLDER_PATTERNS = [
  /reemplazar/i,
  /placeholder/i,
  /ejemplo\.invalid/i,
  /example\.(com|org|net|invalid)/i,
  /^tu_/i,
  /_aqui$/i,
  /^your_/i,
  /changeme/i,
  /change_me/i,
  /replace_me/i,
  /xxxx/i,
  /^<[^>]+>$/,
];

const REAL_CREDENTIAL_PATTERNS = [
  /^sk_live_/i,
  /^EAA[A-Za-z0-9]{20,}/,
  /^ghp_[A-Za-z0-9]{20,}/,
  /^re_[A-Za-z0-9]{20,}/,
  /^eyJ[A-Za-z0-9_-]{10,}\./,
  /^AKIA[0-9A-Z]{16}/,
  /^AIza[0-9A-Za-z_-]{25,}/,
];

export function parseDotEnvContent(content) {
  const result = {};
  for (const rawLine of String(content || "").split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) {
      line = line.slice(7).trim();
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    } else {
      const commentIndex = val.indexOf(" #");
      if (commentIndex !== -1) {
        val = val.slice(0, commentIndex).trim();
      }
    }
    result[key] = val;
  }
  return result;
}

export function isPlaceholderValue(value) {
  const str = String(value ?? "").trim();
  if (!str) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(str));
}

export function looksLikeRealCredential(value) {
  const str = String(value ?? "").trim();
  if (!str) return false;
  return REAL_CREDENTIAL_PATTERNS.some((re) => re.test(str));
}

function normalizeNetworksList(networks) {
  if (Array.isArray(networks)) return networks.map(String);
  if (networks && typeof networks === "object") return Object.keys(networks);
  return [];
}

export function auditComposeZeroTrust(composeText) {
  const errors = [];
  const raw = String(composeText || "");

  if (raw.includes("/var/run/docker.sock")) {
    errors.push("docker-compose.yml no debe referenciar /var/run/docker.sock");
  }

  let doc;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    return {
      ok: false,
      errors: [`YAML inválido en docker-compose.yml: ${err.message}`],
    };
  }

  if (!doc || typeof doc !== "object") {
    return { ok: false, errors: ["docker-compose.yml vacío o inválido"] };
  }

  const networks = doc.networks || {};
  for (const netName of ["front-ingress", "app-tier", "data-tier"]) {
    if (!networks[netName]) {
      errors.push(`Falta la red requerida "${netName}"`);
    }
  }
  if (networks["data-tier"]?.internal !== true) {
    errors.push('La red "data-tier" debe declarar internal: true');
  }

  const services = doc.services || {};
  for (const [svcName, svc] of Object.entries(services)) {
    if (/chatwoot/i.test(svcName) || /chatwoot/i.test(String(svc?.image || ""))) {
      errors.push(`Chatwoot debe quedar fuera del Compose (detectado en "${svcName}")`);
    }
    if (svc?.privileged === true) {
      errors.push(`El servicio "${svcName}" no puede ejecutarse con privileged: true`);
    }
    const secOpt = Array.isArray(svc?.security_opt) ? svc.security_opt : [];
    if (!secOpt.includes("no-new-privileges:true")) {
      errors.push(`El servicio "${svcName}" debe declarar security_opt: ["no-new-privileges:true"]`);
    }
    if (!svc?.mem_limit) {
      errors.push(`El servicio "${svcName}" debe declarar mem_limit`);
    }
    const vols = Array.isArray(svc?.volumes) ? svc.volumes : [];
    for (const vol of vols) {
      if (String(vol).includes("/var/run/docker.sock")) {
        errors.push(`El servicio "${svcName}" no puede montar /var/run/docker.sock`);
      }
    }
  }

  // Postgres 16
  const pg = services.postgres;
  if (!pg) {
    errors.push('Falta el servicio "postgres"');
  } else {
    if (pg.image !== "postgres:16-alpine") {
      errors.push('postgres debe usar imagen "postgres:16-alpine"');
    }
    const pgNets = normalizeNetworksList(pg.networks);
    if (pgNets.length !== 1 || pgNets[0] !== "data-tier") {
      errors.push('postgres debe estar confinado únicamente a la red "data-tier"');
    }
    if (Array.isArray(pg.ports) && pg.ports.length > 0) {
      errors.push("postgres no debe exponer puertos al host");
    }
    if (!JSON.stringify(pg.healthcheck || "").includes("pg_isready")) {
      errors.push("postgres debe definir healthcheck con pg_isready");
    }
    const pgVols = Array.isArray(pg.volumes) ? pg.volumes : [];
    const mountsInitSql = pgVols.some(
      (v) =>
        String(v).includes("./sql/001_autonomous_init.sql") &&
        String(v).includes("/docker-entrypoint-initdb.d/")
    );
    if (!mountsInitSql) {
      errors.push(
        "postgres debe montar ./sql/001_autonomous_init.sql en /docker-entrypoint-initdb.d/"
      );
    }
  }

  // Redis 7
  const redis = services.redis;
  if (!redis) {
    errors.push('Falta el servicio "redis"');
  } else {
    if (redis.image !== "redis:7-alpine") {
      errors.push('redis debe usar imagen "redis:7-alpine"');
    }
    const redisNets = normalizeNetworksList(redis.networks);
    if (redisNets.length !== 1 || redisNets[0] !== "data-tier") {
      errors.push('redis debe estar confinado únicamente a la red "data-tier"');
    }
    if (Array.isArray(redis.ports) && redis.ports.length > 0) {
      errors.push("redis no debe exponer puertos al host");
    }
    const redisCmd = Array.isArray(redis.command)
      ? redis.command.join(" ")
      : String(redis.command || "");
    if (!/appendonly\s+yes/i.test(redisCmd)) {
      errors.push('redis debe habilitar persistencia "--appendonly yes"');
    }
    if (!redisCmd.includes("${REDIS_PASSWORD}")) {
      errors.push("redis debe exigir ${REDIS_PASSWORD}");
    }
  }

  // n8n 2.x
  const n8n = services.n8n;
  if (!n8n) {
    errors.push('Falta el servicio "n8n"');
  } else {
    if (!/^n8nio\/n8n:2\./.test(String(n8n.image || ""))) {
      errors.push('n8n debe fijar imagen de la rama "n8nio/n8n:2.x"');
    }
    const n8nNets = normalizeNetworksList(n8n.networks).sort();
    if (
      n8nNets.length !== 2 ||
      n8nNets[0] !== "app-tier" ||
      n8nNets[1] !== "data-tier"
    ) {
      errors.push('n8n debe conectarse exactamente a ["app-tier", "data-tier"]');
    }
    const n8nPorts = Array.isArray(n8n.ports) ? n8n.ports : [];
    if (n8nPorts.length !== 1) {
      errors.push("n8n debe publicar exactamente un puerto en loopback 127.0.0.1");
    } else if (
      !/^127\.0\.0\.1:(?:\d{1,5}|\$\{[A-Z0-9_]+(?::-\d{1,5})?\}):5678$/.test(
        String(n8nPorts[0])
      )
    ) {
      errors.push(
        `n8n debe publicar únicamente en loopback 127.0.0.1 (actual: "${n8nPorts[0]}")`
      );
    }
  }

  // cloudflared opcional
  const cf = services.cloudflared;
  if (!cf) {
    errors.push('Falta el servicio opcional "cloudflared"');
  } else {
    const cfProfiles = Array.isArray(cf.profiles) ? cf.profiles : [];
    if (!cfProfiles.includes("tunnel")) {
      errors.push('cloudflared debe declararse bajo profiles: ["tunnel"]');
    }
    if (Array.isArray(cf.ports) && cf.ports.length > 0) {
      errors.push("cloudflared no debe exponer puertos entrantes al host");
    }
    const cfNets = normalizeNetworksList(cf.networks);
    if (cfNets.includes("data-tier")) {
      errors.push("cloudflared no debe conectarse a la red interna data-tier");
    }
  }

  return { ok: errors.length === 0, errors };
}

export function auditEnvExample(envExampleText) {
  const errors = [];
  const parsed = parseDotEnvContent(envExampleText);

  for (const key of REQUIRED_ENV_VARS) {
    if (!Object.hasOwn(parsed, key) || !String(parsed[key]).trim()) {
      errors.push(`Falta la variable "${key}" en .env.autonomous.example`);
    }
  }

  for (const [key, val] of Object.entries(parsed)) {
    if (looksLikeRealCredential(val)) {
      errors.push(
        `La variable "${key}" en .env.autonomous.example parece contener una credencial real`
      );
    }
  }

  for (const key of SENSITIVE_ENV_VARS) {
    if (Object.hasOwn(parsed, key) && !isPlaceholderValue(parsed[key])) {
      errors.push(
        `La variable sensible "${key}" en .env.autonomous.example debe usar un placeholder explícito`
      );
    }
  }

  return { ok: errors.length === 0, errors, variables: Object.keys(parsed) };
}

export function auditSqlSchema(sqlText) {
  const errors = [];
  const sql = String(sqlText || "");

  for (const table of [
    "appointments",
    "waitlist_entries",
    "reminder_dispatches",
    "conversation_state",
  ]) {
    const re = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}\\b`, "i");
    if (!re.test(sql)) {
      errors.push(`Falta definición CREATE TABLE IF NOT EXISTS ${table}`);
    }
  }

  if (
    !/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s+ON\s+waitlist_entries\s*\(\s*client_slug\s*,\s*status\s*,\s*created_at\s+ASC\s*\)/i.test(
      sql
    )
  ) {
    errors.push(
      "Falta índice FIFO (client_slug, status, created_at ASC) sobre waitlist_entries"
    );
  }

  if (!/UNIQUE\s*\(\s*appointment_id\s*,\s*reminder_type\s*\)/i.test(sql)) {
    errors.push("Falta restricción UNIQUE (appointment_id, reminder_type) en reminder_dispatches");
  }

  if (!/UNIQUE\s*\(\s*client_slug\s*,\s*patient_phone_hash\s*\)/i.test(sql)) {
    errors.push("Falta restricción UNIQUE (client_slug, patient_phone_hash) en conversation_state");
  }

  if (!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+set_autonomous_updated_at\s*\(/i.test(sql)) {
    errors.push("Falta función trigger set_autonomous_updated_at()");
  }

  const triggerCount = (
    sql.match(
      /BEFORE\s+UPDATE\s+ON\s+(appointments|waitlist_entries|reminder_dispatches|conversation_state)\b/gi
    ) || []
  ).length;
  if (triggerCount !== 4) {
    errors.push(
      `Se esperaban 4 triggers BEFORE UPDATE para updated_at (encontrados: ${triggerCount})`
    );
  }

  return { ok: errors.length === 0, errors };
}

export function validateRuntimeEnv(envMap, { withTunnel = false } = {}) {
  const errors = [];
  const source = envMap && typeof envMap === "object" ? envMap : {};

  for (const key of REQUIRED_ENV_VARS) {
    const rawVal = source[key];
    const val = rawVal === undefined || rawVal === null ? "" : String(rawVal).trim();
    if (!val) {
      errors.push(`Variable obligatoria faltante: ${key}`);
      continue;
    }
    if (isPlaceholderValue(val)) {
      errors.push(`Variable ${key} conserva un placeholder sin reemplazar`);
      continue;
    }
    const minLen = MIN_LENGTH_RULES[key];
    if (minLen && val.length < minLen) {
      errors.push(`Variable ${key} es demasiado corta (mínimo ${minLen} caracteres)`);
    }
  }

  for (const urlKey of ["WEBHOOK_URL", "NEXOBOW_INGEST_URL"]) {
    const rawUrl = String(source[urlKey] ?? "").trim();
    if (!rawUrl || isPlaceholderValue(rawUrl)) continue;
    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== "https:") {
        errors.push(`${urlKey} debe usar protocolo https://`);
      }
      if (parsedUrl.hostname.endsWith(".invalid")) {
        errors.push(`${urlKey} no puede apuntar a un dominio .invalid`);
      }
    } catch {
      errors.push(`${urlKey} no tiene formato URL válido`);
    }
  }

  const rawPort = String(source.N8N_LOCAL_PORT ?? "").trim();
  if (rawPort && !isPlaceholderValue(rawPort)) {
    const portNum = Number(rawPort);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`N8N_LOCAL_PORT debe ser un puerto TCP válido entre 1 y 65535`);
    }
  }

  if (withTunnel) {
    const tunnelToken = String(source.CLOUDFLARE_TUNNEL_TOKEN ?? "").trim();
    if (!tunnelToken || isPlaceholderValue(tunnelToken)) {
      errors.push(
        "CLOUDFLARE_TUNNEL_TOKEN es obligatorio al activar con --with-tunnel"
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function parseCliArgs(argv = []) {
  const opts = {
    dryRun: false,
    strictEnv: false,
    apply: false,
    withTunnel: false,
    envFile: null,
    errors: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = String(argv[i]);
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--strict-env") {
      opts.strictEnv = true;
    } else if (arg === "--apply") {
      opts.apply = true;
    } else if (arg === "--with-tunnel") {
      opts.withTunnel = true;
    } else if (arg === "--env-file") {
      const next = argv[i + 1];
      if (!next || String(next).startsWith("--")) {
        opts.errors.push("Falta la ruta luego de --env-file");
      } else {
        opts.envFile = String(next);
        i++;
      }
    } else if (arg.startsWith("--env-file=")) {
      const val = arg.slice("--env-file=".length).trim();
      if (!val) {
        opts.errors.push("La ruta de --env-file= no puede estar vacía");
      } else {
        opts.envFile = val;
      }
    } else {
      opts.errors.push(`Flag no reconocido: ${arg}`);
    }
  }

  if (opts.dryRun && opts.apply) {
    opts.errors.push("No se pueden combinar --dry-run y --apply en la misma ejecución");
  }

  if (!opts.apply && !opts.strictEnv && !opts.envFile) {
    opts.dryRun = true;
  }

  return opts;
}

function defaultCommandRunner(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: options.cwd || REPO_ROOT,
    env: options.env || process.env,
    encoding: "utf8",
  });
}

function resolveEnvMapFromDisk(repoRoot, envFile) {
  if (envFile) {
    const targetPath = isAbsolute(envFile) ? envFile : resolve(repoRoot, envFile);
    if (!existsSync(targetPath)) {
      return {
        ok: false,
        error: `No existe el archivo de entorno especificado: ${targetPath}`,
        env: {},
      };
    }
    return {
      ok: true,
      env: parseDotEnvContent(readFileSync(targetPath, "utf8")),
    };
  }

  const defaultLocalEnv = join(repoRoot, DEFAULT_PATHS.defaultEnvFileRelative);
  const fileEnv = existsSync(defaultLocalEnv)
    ? parseDotEnvContent(readFileSync(defaultLocalEnv, "utf8"))
    : {};

  return {
    ok: true,
    env: {
      ...fileEnv,
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined)
      ),
    },
  };
}

export async function activateAutonomous({
  argv = process.argv.slice(2),
  repoRoot = REPO_ROOT,
  envLoader,
  commandRunner = defaultCommandRunner,
} = {}) {
  const cli = parseCliArgs(argv);
  if (cli.errors.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      mode: "invalid-args",
      gateStatus: "Error de argumentos",
      errors: cli.errors,
    };
  }

  const composePath = join(repoRoot, DEFAULT_PATHS.composeRelative);
  const envExamplePath = join(repoRoot, DEFAULT_PATHS.envExampleRelative);
  const sqlInitPath = join(repoRoot, DEFAULT_PATHS.sqlInitRelative);

  const staticErrors = [];
  if (!existsSync(composePath)) {
    staticErrors.push(`Falta ${DEFAULT_PATHS.composeRelative}`);
  } else {
    const composeAudit = auditComposeZeroTrust(readFileSync(composePath, "utf8"));
    if (!composeAudit.ok) staticErrors.push(...composeAudit.errors);
  }

  if (!existsSync(envExamplePath)) {
    staticErrors.push(`Falta ${DEFAULT_PATHS.envExampleRelative}`);
  } else {
    const envExAudit = auditEnvExample(readFileSync(envExamplePath, "utf8"));
    if (!envExAudit.ok) staticErrors.push(...envExAudit.errors);
  }

  if (!existsSync(sqlInitPath)) {
    staticErrors.push(`Falta ${DEFAULT_PATHS.sqlInitRelative}`);
  } else {
    const sqlAudit = auditSqlSchema(readFileSync(sqlInitPath, "utf8"));
    if (!sqlAudit.ok) staticErrors.push(...sqlAudit.errors);
  }

  if (staticErrors.length > 0) {
    return {
      ok: false,
      exitCode: 1,
      mode: cli.apply ? "apply" : "dry-run",
      gateStatus: "Fallo de auditoría IaC/SQL",
      errors: staticErrors,
    };
  }

  const needsStrictEnv = cli.strictEnv || Boolean(cli.envFile) || cli.apply;
  if (!needsStrictEnv) {
    return {
      ok: true,
      exitCode: 0,
      mode: "dry-run",
      gateStatus: "Preparado (Gate 0 · $0 VPS)",
      checks: {
        composeZeroTrust: true,
        envExamplePlaceholdersOnly: true,
        sqlSchemaValid: true,
      },
      errors: [],
    };
  }

  let runtimeEnv;
  if (typeof envLoader === "function") {
    runtimeEnv = await envLoader({ envFile: cli.envFile, repoRoot });
  } else {
    const loaded = resolveEnvMapFromDisk(repoRoot, cli.envFile);
    if (!loaded.ok) {
      return {
        ok: false,
        exitCode: 2,
        mode: cli.apply ? "apply" : "env-file",
        gateStatus: "Archivo de entorno no encontrado",
        errors: [loaded.error],
      };
    }
    runtimeEnv = loaded.env;
  }

  const envCheck = validateRuntimeEnv(runtimeEnv, { withTunnel: cli.withTunnel });
  if (!envCheck.ok) {
    return {
      ok: false,
      exitCode: 2,
      mode: cli.apply ? "apply" : cli.strictEnv ? "strict-env" : "env-file",
      gateStatus: "Variables faltantes o placeholders sin reemplazar",
      errors: envCheck.errors,
    };
  }

  if (!cli.apply) {
    return {
      ok: true,
      exitCode: 0,
      mode: cli.strictEnv ? "strict-env" : "env-file",
      gateStatus: "Preflight estricto aprobado (sin despliegue activo)",
      checks: {
        composeZeroTrust: true,
        envExamplePlaceholdersOnly: true,
        sqlSchemaValid: true,
        runtimeEnvValid: true,
      },
      errors: [],
    };
  }

  const composeArgs = [
    "compose",
    "-f",
    "infra/autonomous/docker-compose.yml",
    ...(cli.withTunnel ? ["--profile", "tunnel"] : []),
    "up",
    "-d",
  ];

  const runResult = await commandRunner("docker", composeArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...runtimeEnv,
    },
  });

  const status = typeof runResult?.status === "number" ? runResult.status : 1;
  if (status !== 0) {
    return {
      ok: false,
      exitCode: status,
      mode: "apply",
      gateStatus: "Error al levantar contenedores en Docker",
      errors: [
        String(runResult?.stderr || runResult?.message || "").trim() ||
          `docker compose finalizó con código ${status}`,
      ],
    };
  }

  return {
    ok: true,
    exitCode: 0,
    mode: "apply",
    gateStatus: "Operativo (Gate 1 activado)",
    checks: {
      composeZeroTrust: true,
      envExamplePlaceholdersOnly: true,
      sqlSchemaValid: true,
      runtimeEnvValid: true,
      dockerComposeUp: true,
    },
    errors: [],
  };
}

function isMainEntrypoint() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntrypoint()) {
  const result = await activateAutonomous({ argv: process.argv.slice(2) });
  if (result.ok) {
    console.log(`[activate-autonomous] ${result.gateStatus} (${result.mode})`);
  } else {
    console.error(`[activate-autonomous ERROR] ${result.gateStatus}`);
    for (const err of result.errors || []) {
      console.error(`  - ${err}`);
    }
  }
  process.exitCode = result.exitCode;
}
