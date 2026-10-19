import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server/index.mjs";

test("N03 - server/index.mjs rechaza peticiones sin token (401)", async () => {
  const secretKey = "test-secret-key-123";
  const app = createServer({ apiKey: secretKey });
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/leads`);
    assert.equal(res.status, 401, "Debe rechazar con 401 sin Bearer token");
    const json = await res.json();
    assert.equal(json.error, "Unauthorized");
  } finally {
    server.close();
  }
});

test("N03 - server/index.mjs responde 200 en GET /api/leads con token válido", async () => {
  const secretKey = "test-secret-key-123";
  const app = createServer({ apiKey: secretKey });
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/leads`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.leads), "Debe devolver array de leads");
  } finally {
    server.close();
  }
});

test("N03 - server/index.mjs actualiza estado con POST /api/leads/:slug/status", async () => {
  const secretKey = "test-secret-key-123";
  const app = createServer({ apiKey: secretKey });
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/leads/demo-nutri-camila/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "contactado" }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.lead.status, "contactado");
  } finally {
    server.close();
  }
});

test("N03 - server/index.mjs dispara lote con POST /api/batch-scout", async () => {
  const secretKey = "test-secret-key-123";
  const app = createServer({ apiKey: secretKey });
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/batch-scout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mock: true, count: 2 }),
    });
    assert.equal(res.status, 202, "Debe retornar 202 Accepted para procesamiento en segundo plano");
    const json = await res.json();
    assert.equal(json.status, "started");
  } finally {
    server.close();
  }
});
