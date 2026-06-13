from pathlib import Path
from scraping.static_adapter import StaticAdapter

def test_static_adapter_parsea_html(monkeypatch):
    html = (Path(__file__).parent / "fixtures" / "icnorte_sample.html").read_text(encoding="utf-8")
    # Mockear la descarga para no hacer red
    monkeypatch.setattr("scraping.static_adapter._descargar", lambda url, headers: html)

    config = {
        "item_selector": ".product-card",
        "name_selector": ".product-name",
        "price_selector": ".product-price",
        "price_regex": r"Bs\.?\s*([\d.,]+)\s*x\s*kg",
    }
    res = StaticAdapter().fetch("http://x", config, "minorista")
    assert len(res) == 2
    assert res[0].nombre_crudo == "Pierna de Cerdo Frigor"
    assert res[0].precio_kg == 78.20
    assert res[0].canal == "minorista"
