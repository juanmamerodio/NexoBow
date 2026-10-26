import json

with open(".reports/rea/producto/page.json") as f:
    data = json.load(f)

res = data.get("normalized_result", {})
dom = res.get("dom", {})
nodes = dom.get("nodes", [])

# Let's extract text previews or text values
texts = []
for n in nodes:
    val = n.get("text_preview") or n.get("node_value") or ""
    name = n.get("node_name", "")
    if val and len(val.strip()) > 3:
        texts.append(f"[{name}] {val.strip()}")

print(f"Total non-empty text nodes: {len(texts)}")
for t in texts[:50]:
    print(t)
