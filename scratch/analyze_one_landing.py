import re
from bs4 import BeautifulSoup

with open(".reports/rea/producto/one-landingpage.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

print("--- TITLE ---")
print(soup.title.string if soup.title else "No title")

print("\n--- SECTIONS ---")
sections = soup.find_all(["section", "header", "footer", "main"])
for s in sections:
    s_id = s.get("id", "")
    s_class = " ".join(s.get("class", []))
    tag = s.name.upper()
    print(f"[{tag}] id='{s_id}' class='{s_class}'")

print("\n--- HEADINGS ---")
headings = soup.find_all(["h1", "h2", "h3", "h4", "h5"])
for h in headings:
    text = re.sub(r"\s+", " ", h.get_text()).strip()
    if text:
        print(f"[{h.name.upper()}] {text}")

print("\n--- IMAGES ---")
imgs = soup.find_all("img")
for img in imgs[:15]:
    src = img.get("src") or img.get("data-src") or ""
    alt = img.get("alt", "")
    print(f"[IMG] src='{src}' alt='{alt}'")
