#!/usr/bin/env bash
set -e

mkdir -p .reports/rea/producto
rm -rf /tmp/rea-profile-producto
mkdir -p /tmp/rea-profile-producto

echo "[REA] Starting Chromium with CDP on port 9222..."
chromium --headless=new --no-sandbox --remote-debugging-port=9222 \
  --user-data-dir=/tmp/rea-profile-producto "https://heavn-lights.com/" >/tmp/rea-chromium.log 2>&1 &
CHROME_PID=$!
echo $CHROME_PID > /tmp/rea-chromium.pid

cleanup() {
  echo "[REA] Cleaning up Chromium..."
  if [ -f /tmp/rea-chromium.pid ]; then
    kill $(cat /tmp/rea-chromium.pid) 2>/dev/null || true
    rm -f /tmp/rea-chromium.pid
  fi
  rm -rf /tmp/rea-profile-producto
}
trap cleanup EXIT

echo "[REA] Waiting for target to load..."
sleep 10

TARGETS=$(curl -s http://127.0.0.1:9222/json)
echo "$TARGETS" > .reports/rea/producto/targets.json

TID=$(node -e '
  const targets = JSON.parse(process.argv[1]);
  const page = targets.find(t => t.type === "page" && t.url && t.url.startsWith("http"));
  if (page) console.log(page.id);
  else process.exit(1);
' "$TARGETS")

echo "[REA] Found targetId: $TID"

echo "[REA] Inspecting web page..."
rea-agents inspect-web-page http://127.0.0.1:9222 "$TID" --observation-ms 3000 --include-script-sources --format json > .reports/rea/producto/page.json || echo "inspect-web-page warning"

echo "[REA] Analyzing web bundle..."
rea-agents analyze-web-bundle http://127.0.0.1:9222 "$TID" --fetch-source-maps --format json > .reports/rea/producto/bundle.json || echo "analyze-web-bundle warning"

echo "[REA] Capturing screenshot..."
rea-agents capture-web-screenshot http://127.0.0.1:9222 "$TID" --format json > .reports/rea/producto/screenshot.json || echo "screenshot warning"

echo "[REA] Exporting web scripts..."
mkdir -p "$PWD/.reports/rea/producto/scripts"
rea-agents export-web-scripts "$PWD/.reports/rea/producto/page.json" "$PWD/.reports/rea/producto/scripts" || echo "export scripts warning"

echo "[REA] Downloading raw HTML and assets..."
curl -sL -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" https://heavn-lights.com/ > .reports/rea/producto/index-raw.html

echo "[REA] Capture complete!"
