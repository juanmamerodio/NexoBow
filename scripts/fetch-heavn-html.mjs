import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

async function main() {
  const profileDir = "/tmp/rea-profile-one";
  try { rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}

  const url = process.argv[2] || "https://heavn-lights.com/pages/one-landingpage";
  const outFile = process.argv[3] || ".reports/rea/producto/one-landingpage.html";

  const chrome = spawn("chromium", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=9224",
    `--user-data-dir=${profileDir}`,
    url
  ]);

  await new Promise(r => setTimeout(r, 9000));

  try {
    const listRes = await fetch("http://127.0.0.1:9224/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page" && t.url && t.url.startsWith("http"));
    if (!page) throw new Error("No page target: " + JSON.stringify(targets));
    console.log("Target page ID:", page.id, "URL:", page.url);

    const ws = new globalThis.WebSocket(page.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise(resolve => {
        const id = msgId++;
        const onMsg = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener("message", onMsg);
            resolve(res.result);
          }
        };
        ws.addEventListener("message", onMsg);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const doc = await send("Runtime.evaluate", {
      expression: "document.documentElement.outerHTML"
    });

    if (doc?.result?.value) {
      writeFileSync(outFile, doc.result.value, "utf8");
      console.log(`Saved ${outFile}! Length: ${doc.result.value.length}`);
    }
    ws.close();
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    chrome.kill("SIGKILL");
  }
}

main().catch(err => {
  console.error("Main error:", err);
  process.exit(1);
});
