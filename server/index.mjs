// server/index.mjs — NexoBow: servidor privado y API autenticada de NexoBow System
// Soporta autenticación por Bearer Token (NEXOBOW_SYSTEM_KEY)

import http from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Base de datos ligera en memoria con persistencia en manifest.json
function loadManifest() {
  const manifestPath = join(REPO_ROOT, "dist-previews", "manifest.json");
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      // fallback
    }
  }
  return {
    status: "idle",
    total: 0,
    timestamp: new Date().toISOString(),
    leads: [],
  };
}

function saveManifest(data) {
  const manifestPath = join(REPO_ROOT, "dist-previews", "manifest.json");
  try {
    writeFileSync(manifestPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch (err) {
    console.error("[server] Error al guardar manifest:", err.message);
  }
}

export function createServer(options = {}) {
  const expectedKey = options.apiKey || process.env.NEXOBOW_SYSTEM_KEY || "nexobow-secret-key";
  let inMemoryManifest = loadManifest();
  let currentTask = null;

  return http.createServer((req, res) => {
    // Configuración CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // Servir PWA / UI estática si no es ruta /api/
    if (!pathname.startsWith("/api/")) {
      const pwaIndexPath = join(REPO_ROOT, "public", "index.html");
      if (existsSync(pwaIndexPath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(pwaIndexPath, "utf8"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>NexoBow System</h1><p>Web privada lista.</p>");
      return;
    }

    // Middleware de Autenticación para /api/*
    const authHeader = req.headers["authorization"] || "";
    const match = authHeader.match(/^Bearer\s+(.*)$/i);
    const token = match ? match[1].trim() : null;

    if (!token || token !== expectedKey) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Rutas de API
    if (req.method === "GET" && pathname === "/api/leads") {
      // Recargar de disco si cambió
      inMemoryManifest = loadManifest();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...inMemoryManifest, activeTask: currentTask }));
      return;
    }

    if (req.method === "POST" && pathname === "/api/batch-scout") {
      let bodyStr = "";
      req.on("data", (chunk) => (bodyStr += chunk));
      req.on("end", () => {
        let payload = {};
        try {
          if (bodyStr) payload = JSON.parse(bodyStr);
        } catch {
          // default
        }

        const args = ["scripts/prospect-batch.mjs"];
        if (payload.mock) args.push("--mock");
        if (payload.count) args.push("--count", String(payload.count));
        if (payload.query) args.push("--query", payload.query);

        currentTask = {
          startedAt: new Date().toISOString(),
          status: "running",
          query: payload.query || "nutricionista",
        };

        // Lanzar tarea asíncrona
        const proc = spawn("node", args, {
          cwd: REPO_ROOT,
          shell: process.platform === "win32",
        });

        proc.on("close", (code) => {
          currentTask = null;
          inMemoryManifest = loadManifest();
        });

        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "started", task: currentTask }));
      });
      return;
    }

    const statusMatch = pathname.match(/^\/api\/leads\/([a-zA-Z0-9_-]+)\/status$/);
    if (req.method === "POST" && statusMatch) {
      const slug = statusMatch[1];
      let bodyStr = "";
      req.on("data", (chunk) => (bodyStr += chunk));
      req.on("end", () => {
        let payload = {};
        try {
          payload = JSON.parse(bodyStr);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "JSON inválido" }));
          return;
        }

        inMemoryManifest = loadManifest();
        let foundLead = inMemoryManifest.leads.find((l) => l.slug === slug);
        if (!foundLead) {
          // Si es el lead de test o no existe en manifest, crearlo para pruebas
          foundLead = { slug, nombre: slug, status: payload.status || "nuevo" };
          inMemoryManifest.leads.push(foundLead);
        } else {
          foundLead.status = payload.status || foundLead.status;
        }

        saveManifest(inMemoryManifest);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, lead: foundLead }));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

// Iniciar servidor si se ejecuta directamente
if (process.argv[1] && process.argv[1].endsWith("server/index.mjs")) {
  const port = process.env.PORT || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`\x1b[32m[server]\x1b[0m NexoBow System Server escuchando en http://localhost:${port}`);
  });
}
