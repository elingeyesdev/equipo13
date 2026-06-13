from scraping.base import PrecioScrapeado

def test_precio_scrapeado_normaliza_numero():
    p = PrecioScrapeado(nombre_crudo="Pierna Sofia", precio_kg=46.0, canal="minorista")
    assert p.precio_kg == 46.0
    assert p.nombre_crudo == "Pierna Sofia"
    d = p.to_dict()
    assert d["precio_kg"] == 46.0
