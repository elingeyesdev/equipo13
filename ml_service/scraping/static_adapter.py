import re
import httpx
from bs4 import BeautifulSoup
from .base import PrecioScrapeado

UA = "CosteoUniversalBot/1.0 (+contacto@tudominio.com)"


def _descargar(url: str, headers: dict) -> str:
    with httpx.Client(timeout=20, headers=headers, follow_redirects=True) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.text


def _parsear_precio(texto: str, regex: str) -> float | None:
    m = re.search(regex, texto)
    if not m:
        return None
    # "78,20" o "1.234,50" -> 78.20 / 1234.50 (formato boliviano)
    num = m.group(1).replace(".", "").replace(",", ".")
    try:
        return float(num)
    except ValueError:
        return None


class StaticAdapter:
    def fetch(self, url: str, config: dict, canal: str) -> list[PrecioScrapeado]:
        html = _descargar(url, {"User-Agent": UA})
        soup = BeautifulSoup(html, "html.parser")
        out: list[PrecioScrapeado] = []
        for item in soup.select(config["item_selector"]):
            name_el = item.select_one(config["name_selector"])
            price_el = item.select_one(config["price_selector"])
            if not name_el or not price_el:
                continue
            precio = _parsear_precio(price_el.get_text(" ", strip=True), config["price_regex"])
            if precio is None:
                continue
            out.append(PrecioScrapeado(
                nombre_crudo=name_el.get_text(" ", strip=True),
                precio_kg=precio,
                canal=canal,
                raw={"title": name_el.get_text(" ", strip=True), "price_text": price_el.get_text(" ", strip=True)},
            ))
        return out
