// tests/autonomous-infra.test.mjs — Suite TDD Seam 4 (Ticket #60: Blueprint IaC Zero-Trust Gate 1, Postgres 16 SQL y Activación en 1 Comando)
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_PATH = join(REPO_ROOT, "infra", "autonomous", "docker-compose.yml");
const ENV_EXAMPLE_PATH = join(
  REPO_ROOT,
  "infra",
  "autonomous",
  ".env.autonomous.example"
);
const SQL_INIT_PATH = join(
  REPO_ROOT,
  "infra",
  "autonomous",
  "sql",
  "001_autonomous_init.sql"
);
const ACTIVATE_SCRIPT_PATH = join(REPO_ROOT, "scripts", "activate-autonomous.mjs");
const RUNBOOK_PATH = join(REPO_ROOT, "docs", "gate1-vps-activation.md");
const PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");

const EXPECTED_ENV_VARS = [
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

const SENSITIVE_PLACEHOLDER_VARS = [
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

// Patrones de Ticket #55 construidos por fragmentos para cumplir con copy-humanization.test.mjs
const HUMANIZATION_GUARDS = [
  {
    label: "guard-01",
    regex: new RegExp(["si" + "lla", "vac[ií]a"].join("\\s+"), "i"),
  },
  {
    label: "guard-02",
    regex: new RegExp(["si" + "llas", "vac[ií]as"].join("\\s+"), "i"),
  },
  {
    label: "guard-03",
    regex: new RegExp(["an" + "ti-si" + "lla", "vac[ií]a"].join("\\s+"), "i"),
  },
  {
    label: "guard-04",
    regex: new RegExp("ce" + "ro-" + "secre" + "taria", "i"),
  },
  {
    label: "guard-05",
    regex: new RegExp(["esta" + "llar", "tu", "agenda"].join("\\s+"), "i"),
  },
  {
    label: "guard-06",
    regex: new RegExp("\\b" + "revoluc" + "ionario\\b", "i"),
  },
  {
    label: "guard-07",
    regex: new RegExp("\\b" + "secr" + "etos\\b", "i"),
  },
  {
    label: "guard-08",
    regex: new RegExp("\\b" + "disrup" + "tivo\\b", "i"),
  },
];

function collectHumanizationHits(text, fileLabel) {
  const hits = [];
  const lines = String(text || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const guard of HUMANIZATION_GUARDS) {
      const m = lines[i].match(guard.regex);
      if (m) {
        hits.push(`${fileLabel}:${i + 1} [${guard.label}] -> ${m[0]}`);
      }
    }
  }
  return hits;
}

function parseSimpleEnv(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function createSyntheticValidEnv() {
  return {
    POSTGRES_DB: "nexobow_autonomous_prod",
    POSTGRES_USER: "nexobow_autonomous_svc",
    POSTGRES_PASSWORD: "nb_pg_9d84f2a7c1b3e6084a55f192d0c3b71a",
    REDIS_PASSWORD: "nb_rd_4c18e9b207a6f3d519c8e402a7b6d31f",
    N8N_ENCRYPTION_KEY: "7f4e9c1b8a3d6052e4f19b8c7d2a5e034b6c8d9e1f2a3b4c5d6e7f8a9b0c1d2e",
    WEBHOOK_URL: "https://hook.clinica-valle.com.ar/",
    META_WABA_VERIFY_TOKEN: "nb_waba_verify_c3f8a19d204b7e6591a2c4f8",
    META_WABA_APP_SECRET: "nb_waba_app_7b2d9e14c8f035a6d19e4b7c2f08",
    META_WABA_ACCESS_TOKEN: "nb_waba_tok_8e1f4c7a9b2d0563f8a1c4e9b2d7",
    NEXOBOW_INGEST_URL: "https://nexobow.site/api/v1/autonomous/ingest",
    AUTONOMOUS_INGEST_KEY: "nb_ing_6a9c2e4f8b1d7035a4c6e8f0b2d4a6c8e0f2b4d6",
    N8N_LOCAL_PORT: "5678",
  };
}

test("T60 (Seam 4): Blueprint IaC Zero-Trust Gate 1, Postgres 16 SQL y Activación en 1 Comando", async (t) => {
  await t.test(
    "1. infra/autonomous/docker-compose.yml cumple la topología Zero-Trust",
    () => {
      assert.ok(existsSync(COMPOSE_PATH), `Falta ${COMPOSE_PATH}`);
      const raw = readFileSync(COMPOSE_PATH, "utf8");
      const doc = parseYaml(raw);

      assert.equal(
        collectHumanizationHits(raw, "infra/autonomous/docker-compose.yml").length,
        0,
        "docker-compose.yml no debe contener expresiones prohibidas"
      );

      assert.ok(doc && typeof doc === "object", "docker-compose.yml debe parsear como objeto");
      assert.ok(doc.networks, "Debe declarar sección networks");
      assert.ok(doc.networks["front-ingress"], "Debe declarar red front-ingress");
      assert.ok(doc.networks["app-tier"], "Debe declarar red app-tier");
      assert.ok(doc.networks["data-tier"], "Debe declarar red data-tier");
      assert.equal(
        doc.networks["data-tier"].internal,
        true,
        "La red data-tier debe tener internal: true"
      );

      assert.equal(
        /chatwoot/i.test(Object.keys(doc.services || {}).join(" ")),
        false,
        "Chatwoot debe quedar fuera de los servicios del Compose"
      );
      for (const [svcName, svc] of Object.entries(doc.services || {})) {
        assert.equal(
          /chatwoot/i.test(String(svc?.image || "")),
          false,
          `El servicio ${svcName} no puede usar imagen chatwoot`
        );
        assert.notEqual(
          svc?.privileged,
          true,
          `El servicio ${svcName} no puede correr con privileged: true`
        );
        const vols = Array.isArray(svc?.volumes) ? svc.volumes : [];
        for (const v of vols) {
          assert.equal(
            String(v).includes("/var/run/docker.sock"),
            false,
            `El servicio ${svcName} no puede montar /var/run/docker.sock`
          );
        }
      }
      assert.equal(
        raw.includes("/var/run/docker.sock"),
        false,
        "docker-compose.yml no debe referenciar /var/run/docker.sock"
      );

      // postgres
      const pg = doc.services?.postgres;
      assert.ok(pg, "Debe existir servicio postgres");
      assert.equal(pg.image, "postgres:16-alpine");
      assert.deepEqual(pg.networks, ["data-tier"]);
      assert.equal(pg.ports, undefined, "postgres no debe exponer puertos al host");
      assert.ok(
        Array.isArray(pg.security_opt) && pg.security_opt.includes("no-new-privileges:true"),
        "postgres debe incluir no-new-privileges:true"
      );
      assert.ok(pg.mem_limit, "postgres debe declarar mem_limit");
      assert.ok(
        JSON.stringify(pg.healthcheck || "").includes("pg_isready"),
        "postgres debe tener healthcheck pg_isready"
      );
      assert.ok(
        Array.isArray(pg.volumes) &&
          pg.volumes.some(
            (v) =>
              String(v).includes("./sql/001_autonomous_init.sql") &&
              String(v).includes("/docker-entrypoint-initdb.d/")
          ),
        "postgres debe montar ./sql/001_autonomous_init.sql en /docker-entrypoint-initdb.d/"
      );

      // redis
      const redis = doc.services?.redis;
      assert.ok(redis, "Debe existir servicio redis");
      assert.equal(redis.image, "redis:7-alpine");
      assert.deepEqual(redis.networks, ["data-tier"]);
      assert.equal(redis.ports, undefined, "redis no debe exponer puertos al host");
      assert.ok(
        Array.isArray(redis.security_opt) &&
          redis.security_opt.includes("no-new-privileges:true"),
        "redis debe incluir no-new-privileges:true"
      );
      assert.ok(redis.mem_limit, "redis debe declarar mem_limit");
      const redisCmdStr = Array.isArray(redis.command)
        ? redis.command.join(" ")
        : String(redis.command || "");
      assert.match(redisCmdStr, /appendonly\s+yes/i);
      assert.ok(
        redisCmdStr.includes("${REDIS_PASSWORD}"),
        "redis debe exigir ${REDIS_PASSWORD}"
      );

      // n8n
      const n8n = doc.services?.n8n;
      assert.ok(n8n, "Debe existir servicio n8n");
      assert.match(String(n8n.image || ""), /^n8nio\/n8n:2\./);
      assert.deepEqual(
        [...(n8n.networks || [])].sort(),
        ["app-tier", "data-tier"],
        "n8n debe conectarse exactamente a app-tier y data-tier"
      );
      assert.ok(
        Array.isArray(n8n.ports) && n8n.ports.length === 1,
        "n8n debe declarar exactamente 1 mapeo de puerto loopback"
      );
      assert.equal(
        n8n.ports[0],
        "127.0.0.1:${N8N_LOCAL_PORT:-5678}:5678",
        "n8n debe publicar únicamente en loopback 127.0.0.1"
      );
      assert.ok(
        Array.isArray(n8n.security_opt) &&
          n8n.security_opt.includes("no-new-privileges:true"),
        "n8n debe incluir no-new-privileges:true"
      );
      assert.ok(n8n.mem_limit, "n8n debe declarar mem_limit");

      // cloudflared opcional
      const cf = doc.services?.cloudflared;
      assert.ok(cf, "Debe existir servicio opcional cloudflared");
      assert.ok(
        Array.isArray(cf.profiles) && cf.profiles.includes("tunnel"),
        "cloudflared debe pertenecer al perfil tunnel"
      );
      assert.equal(cf.ports, undefined, "cloudflared no debe exponer puertos");
      assert.equal(
        (cf.networks || []).includes("data-tier"),
        false,
        "cloudflared no debe estar conectado a data-tier"
      );
      assert.ok(
        Array.isArray(cf.security_opt) &&
          cf.security_opt.includes("no-new-privileges:true"),
        "cloudflared debe incluir no-new-privileges:true"
      );
      assert.ok(cf.mem_limit, "cloudflared debe declarar mem_limit");
    }
  );

  await t.test(
    "2. infra/autonomous/.env.autonomous.example declara las 12 variables con placeholders seguros y 0 credenciales reales",
    () => {
      assert.ok(existsSync(ENV_EXAMPLE_PATH), `Falta ${ENV_EXAMPLE_PATH}`);
      const raw = readFileSync(ENV_EXAMPLE_PATH, "utf8");

      assert.equal(
        collectHumanizationHits(raw, "infra/autonomous/.env.autonomous.example").length,
        0,
        ".env.autonomous.example no debe contener expresiones prohibidas"
      );
      assert.match(
        raw,
        /(credenciales|claves\s+privadas)/i,
        ".env.autonomous.example debe usar terminología limpia (credenciales / claves privadas)"
      );

      const parsed = parseSimpleEnv(raw);
      for (const varName of EXPECTED_ENV_VARS) {
        assert.ok(
          Object.hasOwn(parsed, varName) && parsed[varName].length > 0,
          `Falta variable ${varName} en .env.autonomous.example`
        );
      }

      const realSecretPatterns = [
        /^sk_live_/i,
        /^EAA[A-Za-z0-9]{20,}/,
        /^ghp_[A-Za-z0-9]{20,}/,
        /^re_[A-Za-z0-9]{20,}/,
        /^eyJ[A-Za-z0-9_-]{10,}\./,
        /^AKIA[0-9A-Z]{16}/,
        /^AIza[0-9A-Za-z_-]{25,}/,
      ];
      for (const [k, v] of Object.entries(parsed)) {
        for (const pat of realSecretPatterns) {
          assert.equal(
            pat.test(v),
            false,
            `${k} en .env.autonomous.example parece contener una credencial real`
          );
        }
      }

      for (const varName of SENSITIVE_PLACEHOLDER_VARS) {
        assert.match(
          parsed[varName],
          /(reemplazar|ejemplo\.invalid)/i,
          `${varName} debe contener un placeholder explícito en .env.autonomous.example`
        );
      }
    }
  );

  await t.test(
    "3. infra/autonomous/sql/001_autonomous_init.sql define las 4 tablas, CHECK, índice FIFO, UNIQUE y triggers updated_at",
    () => {
      assert.ok(existsSync(SQL_INIT_PATH), `Falta ${SQL_INIT_PATH}`);
      const sql = readFileSync(SQL_INIT_PATH, "utf8");

      assert.equal(
        collectHumanizationHits(sql, "infra/autonomous/sql/001_autonomous_init.sql").length,
        0,
        "001_autonomous_init.sql no debe contener expresiones prohibidas"
      );

      for (const table of [
        "appointments",
        "waitlist_entries",
        "reminder_dispatches",
        "conversation_state",
      ]) {
        assert.match(
          sql,
          new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}\\b`, "i"),
          `Debe crear la tabla ${table}`
        );
      }

      // appointments
      for (const col of [
        "client_slug",
        "patient_phone_hash",
        "patient_phone_e164",
        "patient_first_name",
        "specialty",
        "scheduled_at",
        "confirmed_24h",
        "confirmed_2h",
        "review_requested_at",
        "external_calendar_event_id",
      ]) {
        assert.match(sql, new RegExp(`\\b${col}\\b`, "i"), `Falta columna ${col}`);
      }
      for (const st of [
        "pendiente",
        "confirmado",
        "reprogramado",
        "cancelado",
        "concretado",
        "ausente",
      ]) {
        assert.match(
          sql,
          new RegExp(`'${st}'`, "i"),
          `appointments debe validar estado '${st}'`
        );
      }

      // waitlist_entries
      for (const col of [
        "consent_waitlist",
        "opted_out",
        "offered_slot_id",
        "offer_expires_at",
      ]) {
        assert.match(sql, new RegExp(`\\b${col}\\b`, "i"), `Falta columna ${col}`);
      }
      for (const st of ["esperando", "ofertado", "tomado", "expirado", "baja"]) {
        assert.match(
          sql,
          new RegExp(`'${st}'`, "i"),
          `waitlist_entries debe validar estado '${st}'`
        );
      }
      assert.match(
        sql,
        /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s+ON\s+waitlist_entries\s*\(\s*client_slug\s*,\s*status\s*,\s*created_at\s+ASC\s*\)/i,
        "Debe crear índice FIFO (client_slug, status, created_at ASC) sobre waitlist_entries"
      );

      // reminder_dispatches
      assert.match(
        sql,
        /appointment_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+appointments\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i,
        "reminder_dispatches debe referenciar appointments(id) ON DELETE CASCADE"
      );
      for (const rt of ["24h", "2h", "waitlist_offer", "review_5star"]) {
        assert.match(
          sql,
          new RegExp(`'${rt}'`, "i"),
          `reminder_dispatches debe validar tipo '${rt}'`
        );
      }
      assert.match(
        sql,
        /UNIQUE\s*\(\s*appointment_id\s*,\s*reminder_type\s*\)/i,
        "reminder_dispatches debe declarar UNIQUE (appointment_id, reminder_type)"
      );

      // conversation_state
      for (const col of [
        "current_intent",
        "pending_slot",
        "handoff_active",
        "last_message_at",
      ]) {
        assert.match(sql, new RegExp(`\\b${col}\\b`, "i"), `Falta columna ${col}`);
      }
      assert.match(
        sql,
        /UNIQUE\s*\(\s*client_slug\s*,\s*patient_phone_hash\s*\)/i,
        "conversation_state debe declarar UNIQUE (client_slug, patient_phone_hash)"
      );

      // triggers updated_at en las 4 tablas
      assert.match(
        sql,
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+set_autonomous_updated_at\s*\(/i,
        "Debe definir función trigger set_autonomous_updated_at()"
      );
      const triggerMatches =
        sql.match(/BEFORE\s+UPDATE\s+ON\s+(appointments|waitlist_entries|reminder_dispatches|conversation_state)\b/gi) ||
        [];
      assert.equal(
        triggerMatches.length,
        4,
        "Debe registrar trigger BEFORE UPDATE de updated_at en las 4 tablas"
      );
    }
  );

  await t.test(
    "4. docs/gate1-vps-activation.md y package.json cumplen el runbook +40 y script npm",
    () => {
      const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
      assert.equal(
        pkg.scripts?.["activate-autonomous"],
        "node scripts/activate-autonomous.mjs --dry-run",
        'package.json debe registrar "activate-autonomous"'
      );

      assert.ok(existsSync(RUNBOOK_PATH), `Falta ${RUNBOOK_PATH}`);
      const doc = readFileSync(RUNBOOK_PATH, "utf8");
      assert.equal(
        collectHumanizationHits(doc, "docs/gate1-vps-activation.md").length,
        0,
        "docs/gate1-vps-activation.md no debe contener expresiones prohibidas"
      );

      for (const requiredTerm of [
        /Gate\s*1/i,
        /\$0/,
        /Hetzner/i,
        /Tailscale/i,
        /UFW/i,
        /CrowdSec/i,
        /Cloudflare\s+Tunnel/i,
        /cloudflared/i,
        /Meta\s+Embedded\s+Signup/i,
        /WABA/i,
        /Chatwoot/i,
        /rotaci[oó]n/i,
        /(credenciales|claves\s+privadas)/i,
        /--apply/,
      ]) {
        assert.match(
          doc,
          requiredTerm,
          `El runbook debe documentar ${requiredTerm}`
        );
      }
    }
  );

  await t.test(
    "5. scripts/activate-autonomous.mjs cumple --dry-run, --strict-env, --env-file, --apply e inyección de envLoader/commandRunner",
    async () => {
      assert.ok(existsSync(ACTIVATE_SCRIPT_PATH), `Falta ${ACTIVATE_SCRIPT_PATH}`);
      const scriptSource = readFileSync(ACTIVATE_SCRIPT_PATH, "utf8");
      assert.equal(
        collectHumanizationHits(scriptSource, "scripts/activate-autonomous.mjs").length,
        0,
        "activate-autonomous.mjs no debe contener expresiones prohibidas"
      );

      const {
        activateAutonomous,
        auditComposeZeroTrust,
        REQUIRED_ENV_VARS,
      } = await import("../scripts/activate-autonomous.mjs");

      assert.deepEqual([...REQUIRED_ENV_VARS], EXPECTED_ENV_VARS);

      // Rechazo de mutaciones inseguras en auditComposeZeroTrust
      const validComposeRaw = readFileSync(COMPOSE_PATH, "utf8");
      assert.equal(auditComposeZeroTrust(validComposeRaw).ok, true);

      const badInternal = validComposeRaw.replace("internal: true", "internal: false");
      assert.equal(
        auditComposeZeroTrust(badInternal).ok,
        false,
        "Debe rechazar data-tier con internal: false"
      );

      const badPgPorts = validComposeRaw.replace(
        "    networks:\n      - data-tier\n    environment:\n      POSTGRES_DB",
        "    ports:\n      - \"5432:5432\"\n    networks:\n      - data-tier\n    environment:\n      POSTGRES_DB"
      );
      assert.equal(
        auditComposeZeroTrust(badPgPorts).ok,
        false,
        "Debe rechazar postgres exponiendo puertos al host"
      );

      const badDockerSock = validComposeRaw.replace(
        "n8n_data:/home/node/.n8n",
        "n8n_data:/home/node/.n8n\n      - /var/run/docker.sock:/var/run/docker.sock"
      );
      assert.equal(
        auditComposeZeroTrust(badDockerSock).ok,
        false,
        "Debe rechazar montaje de /var/run/docker.sock"
      );

      const badChatwoot = `${validComposeRaw}\n  chatwoot:\n    image: chatwoot/chatwoot:latest\n`;
      assert.equal(
        auditComposeZeroTrust(badChatwoot).ok,
        false,
        "Debe rechazar servicio chatwoot dentro del Compose"
      );

      // Modo --dry-run (sin --strict-env ni --env-file)
      const callsDry = [];
      const resDry = await activateAutonomous({
        argv: ["--dry-run"],
        commandRunner: (cmd, args) => {
          callsDry.push({ cmd, args });
          return { status: 0 };
        },
      });
      assert.equal(resDry.ok, true);
      assert.equal(resDry.exitCode, 0);
      assert.match(resDry.gateStatus, /Gate\s*0/i);
      assert.match(resDry.gateStatus, /\$0\s*VPS/i);
      assert.equal(callsDry.length, 0, "--dry-run no debe invocar docker");

      // CLI real en --dry-run
      const cliDry = spawnSync(
        process.execPath,
        ["scripts/activate-autonomous.mjs", "--dry-run"],
        { cwd: REPO_ROOT, encoding: "utf8" }
      );
      assert.equal(cliDry.status, 0, `CLI --dry-run falló: ${cliDry.stderr}`);
      assert.match(cliDry.stdout, /Gate\s*0/i);
      assert.match(cliDry.stdout, /\$0\s*VPS/i);

      // Modo --strict-env con env vacío -> falla
      const callsStrictEmpty = [];
      const resStrictEmpty = await activateAutonomous({
        argv: ["--strict-env"],
        envLoader: () => ({}),
        commandRunner: (cmd, args) => {
          callsStrictEmpty.push({ cmd, args });
          return { status: 0 };
        },
      });
      assert.equal(resStrictEmpty.ok, false);
      assert.notEqual(resStrictEmpty.exitCode, 0);
      assert.equal(callsStrictEmpty.length, 0);

      // Modo --strict-env con placeholders de .env.autonomous.example -> falla
      const exampleEnv = parseSimpleEnv(readFileSync(ENV_EXAMPLE_PATH, "utf8"));
      const resStrictExample = await activateAutonomous({
        argv: ["--strict-env"],
        envLoader: () => exampleEnv,
        commandRunner: () => ({ status: 0 }),
      });
      assert.equal(resStrictExample.ok, false);
      assert.notEqual(resStrictExample.exitCode, 0);

      // Modo --strict-env con valores válidos sintéticos -> éxito sin ejecutar docker
      const validEnv = createSyntheticValidEnv();
      const callsStrictValid = [];
      const resStrictValid = await activateAutonomous({
        argv: ["--strict-env"],
        envLoader: () => validEnv,
        commandRunner: (cmd, args) => {
          callsStrictValid.push({ cmd, args });
          return { status: 0 };
        },
      });
      assert.equal(resStrictValid.ok, true);
      assert.equal(resStrictValid.exitCode, 0);
      assert.equal(callsStrictValid.length, 0);

      // Modo --env-file contra .env.autonomous.example -> falla por placeholders
      const resEnvFileExample = await activateAutonomous({
        argv: ["--env-file", "infra/autonomous/.env.autonomous.example"],
        commandRunner: () => ({ status: 0 }),
      });
      assert.equal(resEnvFileExample.ok, false);
      assert.notEqual(resEnvFileExample.exitCode, 0);

      // Modo --env-file inexistente -> falla
      const resEnvFileMissing = await activateAutonomous({
        argv: ["--env-file", "infra/autonomous/.env.no-existe.local"],
        commandRunner: () => ({ status: 0 }),
      });
      assert.equal(resEnvFileMissing.ok, false);
      assert.notEqual(resEnvFileMissing.exitCode, 0);

      // Modo --env-file temporal válido sin --apply -> éxito sin invocar docker
      const tmpDir = mkdtempSync(join(tmpdir(), "nexobow-t60-"));
      t.after(() => {
        try {
          rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
      });
      const tmpEnvFile = join(tmpDir, ".env.autonomous.valid");
      writeFileSync(
        tmpEnvFile,
        Object.entries(validEnv)
          .map(([k, v]) => `${k}="${v}"`)
          .join("\n") + "\n",
        "utf8"
      );

      const callsEnvFileValid = [];
      const resEnvFileValid = await activateAutonomous({
        argv: ["--env-file", tmpEnvFile],
        commandRunner: (cmd, args) => {
          callsEnvFileValid.push({ cmd, args });
          return { status: 0 };
        },
      });
      assert.equal(resEnvFileValid.ok, true);
      assert.equal(resEnvFileValid.exitCode, 0);
      assert.equal(callsEnvFileValid.length, 0);

      // Modo --apply con env inválido -> falla sin invocar docker
      const callsApplyFail = [];
      const resApplyFail = await activateAutonomous({
        argv: ["--apply"],
        envLoader: () => exampleEnv,
        commandRunner: (cmd, args) => {
          callsApplyFail.push({ cmd, args });
          return { status: 0 };
        },
      });
      assert.equal(resApplyFail.ok, false);
      assert.notEqual(resApplyFail.exitCode, 0);
      assert.equal(callsApplyFail.length, 0);

      // Modo --apply con env válido -> invoca exactamente docker compose -f infra/autonomous/docker-compose.yml up -d
      const callsApplyOk = [];
      const resApplyOk = await activateAutonomous({
        argv: ["--apply"],
        envLoader: () => validEnv,
        commandRunner: (cmd, args, opts) => {
          callsApplyOk.push({ cmd, args, opts });
          return { status: 0, stdout: "started" };
        },
      });
      assert.equal(resApplyOk.ok, true);
      assert.equal(resApplyOk.exitCode, 0);
      assert.equal(callsApplyOk.length, 1);
      assert.equal(callsApplyOk[0].cmd, "docker");
      assert.deepEqual(callsApplyOk[0].args, [
        "compose",
        "-f",
        "infra/autonomous/docker-compose.yml",
        "up",
        "-d",
      ]);

      // Modo --apply cuando commandRunner devuelve error
      const resApplyRunnerFail = await activateAutonomous({
        argv: ["--apply"],
        envLoader: () => validEnv,
        commandRunner: () => ({ status: 1, stderr: "daemon offline" }),
      });
      assert.equal(resApplyRunnerFail.ok, false);
      assert.equal(resApplyRunnerFail.exitCode, 1);

      // Combinación conflictiva --dry-run --apply
      const callsConflict = [];
      const resConflict = await activateAutonomous({
        argv: ["--dry-run", "--apply"],
        envLoader: () => validEnv,
        commandRunner: (cmd, args) => {
          callsConflict.push({ cmd, args });
          return { status: 0 };
        },
      });
      assert.equal(resConflict.ok, false);
      assert.notEqual(resConflict.exitCode, 0);
      assert.equal(callsConflict.length, 0);
    }
  );
});
