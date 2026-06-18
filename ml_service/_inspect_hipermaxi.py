"""Debug temporal: prueba endpoints products.json de Fidalga (Shopify) desde el contenedor."""
import httpx

UA = "CosteoUniversalBot/1.0 (+contacto@tudominio.com)"
candidatos = [
    "https://www.fidalga.com/collections/cerdo/products.json?limit=50",
    "https://www.fidalga.com/collections/embutidos/products.json?limit=50",
    "https://www.fidalga.com/collections/carnes/products.json?limit=50",
    "https://www.fidalga.com/collections/all/products.json?limit=250",
    "https://www.fidalga.com/products.json?limit=250",
]
for url in candidatos:
    try:
        r = httpx.get(url, headers={"User-Agent": UA, "Accept": "application/json"}, timeout=25, follow_redirects=True)
        if r.status_code != 200:
            print(f"{r.status_code}  {url}")
            continue
        data = r.json()
        prods = data.get("products", [])
        cerdo = [p for p in prods if "cerdo" in (p.get("title", "") + " " + p.get("product_type", "")).lower()
                 or "chorizo" in p.get("title", "").lower()]
        print(f"200  productos={len(prods)}  cerdo/chorizo={len(cerdo)}  {url}")
        for p in cerdo[:8]:
            v = (p.get("variants") or [{}])[0]
            print(f"     - {p.get('title','')[:48]:48}  price={v.get('price')}  grams={v.get('grams')}")
    except Exception as e:
        print(f"ERR  {url}  -> {type(e).__name__}: {e}")
