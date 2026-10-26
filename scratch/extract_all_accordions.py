from bs4 import BeautifulSoup

with open(".reports/rea/producto/one-landingpage.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

for acc in soup.find_all(class_=lambda c: c and ("accordion" in c or "disclosure" in c)):
    title = acc.find(["button", "summary", "h3", "h4", "span"])
    t_text = title.get_text(strip=True) if title else "No title"
    body = acc.get_text(" ", strip=True)
    print(f"[{t_text}]: {body[:200]}...")
