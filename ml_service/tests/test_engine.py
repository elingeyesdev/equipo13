from scraping.engine import ScrapingEngine
from scraping.base import PrecioScrapeado, SourceAdapter

class DummyAdapter(SourceAdapter):
    def fetch(self, url, config, canal):
        return [PrecioScrapeado(nombre_crudo="Test", precio_kg=10.0, canal=canal)]

def test_engine_run():
    # Simulamos el dict config para Fidalga (dynamic) e ICNorte (static)
    sources = {
        "fidalga": {
            "url": "http://x",
            "type": "dynamic",
            "canal": "minorista",
            "config": {}
        }
    }
    engine = ScrapingEngine()
    # Inyectar el adapter dummy
    engine.register_adapter("dynamic", DummyAdapter())
    
    resultados = engine.run(sources)
    assert len(resultados) == 1
    assert resultados[0].nombre_crudo == "Test"
    assert resultados[0].canal == "minorista"
