import httpx
from .base import PrecioScrapeado
from .static_adapter import UA


def _descargar_json(url: str, headers: dict) -> dict:
    with httpx.Client(timeout=20, headers=headers, follow_redirects=True) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.json()


def _get_path(obj, path: str):
    cur = obj
    for part in path.split("."):
        if isinstance(cur, list):
            cur = cur[int(part)]
        else:
            cur = cur.get(part)
        if cur is None:
            return None
    return cur


class JsonApiAdapter:
    def fetch(self, url: str, config: dict, canal: str) -> list[PrecioScrapeado]:
        data = _descargar_json(url, {"User-Agent": UA, "Accept": "application/json"})
        productos = _get_path(data, config["products_path"]) or []
        out: list[PrecioScrapeado] = []
        for p in productos:
            title = _get_path(p, config["title_key"])
            price = _get_path(p, config["price_path"])
            grams = _get_path(p, config["grams_path"])
            if title is None or price is None:
                continue
            try:
                precio = float(price)
                gramos = float(grams) if grams else 1000.0
            except (ValueError, TypeError):
                continue
            if gramos <= 0:
                continue
            precio_kg = round(precio / (gramos / 1000.0), 4)
            out.append(PrecioScrapeado(nombre_crudo=str(title), precio_kg=precio_kg,
                                       canal=canal, raw={"price": price, "grams": grams}))
        return out
