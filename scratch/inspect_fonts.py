import json, re

with open(".reports/rea/producto/page.json") as f:
    data = f.read()

averta_matches = re.findall(r"https?://[^\s\"'\\]*averta[^\s\"'\\]*", data, re.IGNORECASE)
print("Averta matches in page.json:", averta_matches)

woff_matches = set(re.findall(r"https?://[^\s\"'\\]+\.woff2?", data, re.IGNORECASE))
print("All woff matches in page.json:", list(woff_matches))
