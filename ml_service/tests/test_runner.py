from scraping.runner import correr_fuentes
from scraping.base import PrecioScrapeado

def test_runner_normaliza_y_persiste():
    fuentes = [{"id": "f1", "tipo": "static", "url": "http://x", "config": {}, "canal": "minorista"}]
    alias = {"pierna de cerdo frigor": "Pierna"}

    def fetch_fn(tipo, url, config, canal):
        return [PrecioScrapeado("Pierna de Cerdo Frigor", 78.2, canal),
                PrecioScrapeado("Producto Raro", 10.0, canal)]  # sin alias -> se descarta

    persistidos = []
    def persist_fn(fuente_id, filas):
        persistidos.extend(filas)
        return len(filas)

    runs = correr_fuentes(fuentes, alias, fetch_fn, persist_fn)
    assert runs[0]["estado"] == "ok"
    assert runs[0]["filas_insertadas"] == 1
    assert persistidos[0]["corte_canonico"] == "Pierna"
    assert persistidos[0]["precio_kg"] == 78.2

def test_runner_marca_error_si_fetch_falla():
    fuentes = [{"id": "f1", "tipo": "static", "url": "http://x", "config": {}, "canal": "minorista"}]
    def fetch_fn(*a): raise RuntimeError("boom")
    runs = correr_fuentes(fuentes, {}, fetch_fn, lambda *a: 0)
    assert runs[0]["estado"] == "error"
    assert "boom" in runs[0]["mensaje"]
