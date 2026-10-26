import json, re

with open(".reports/rea/producto/page.json") as f:
    data = json.load(f)

res = data.get("normalized_result", {})
dom = res.get("dom", {})
resources = res.get("resources", [])

images = [r.get("url") for r in resources if r.get("type") == "image" or any(ext in (r.get("url") or "") for ext in [".jpg", ".png", ".webp", ".svg"])]
print("Total images found:", len(images))
for img in images[:15]:
    print(" - Image:", img)

# Let us find all text from raw_result or dom or network if any
