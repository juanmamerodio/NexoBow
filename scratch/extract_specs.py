from bs4 import BeautifulSoup

with open(".reports/rea/producto/one-landingpage.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

accordion = soup.find(class_=lambda c: c and "accordion" in c)
if accordion:
    print("Accordion text:")
    print(accordion.get_text("\n", strip=True))

specs = soup.find(id=lambda i: i and "accordion" in i)
if specs:
    print("\nSpecs details:")
    print(specs.get_text("\n", strip=True))
