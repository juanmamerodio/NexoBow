import re
from bs4 import BeautifulSoup

with open(".reports/rea/producto/index.html", "r", encoding="utf-8") as f:
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
headings = soup.find_all(["h1", "h2", "h3", "h4"])
for h in headings:
    text = re.sub(r"\s+", " ", h.get_text()).strip()
    if text:
        print(f"[{h.name.upper()}] {text}")

print("\n--- BUTTONS / CTAS ---")
buttons = soup.find_all(["button", "a"])
for b in buttons:
    text = re.sub(r"\s+", " ", b.get_text()).strip()
    classes = " ".join(b.get("class", []))
    if any(k in classes.lower() for k in ["button", "btn", "cta"]) and text:
        print(f"[CTA] ({classes}) {text}")
