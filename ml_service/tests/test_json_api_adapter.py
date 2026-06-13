import json
from pathlib import Path
from scraping.json_api_adapter import JsonApiAdapter

def test_json_adapter_calcula_precio_por_kg(monkeypatch):
    data = json.loads((Path(__file__).parent / "fixtures" / "fidalga_products.json").read_text())
    monkeypatch.setattr("scraping.json_api_adapter._descargar_json", lambda url, headers: data)

    config = {"products_path": "products", "title_key": "title",
              "price_path": "variants.0.price", "grams_path": "variants.0.grams"}
    res = JsonApiAdapter().fetch("http://x/products.json", config, "minorista")
    assert len(res) == 2
    # 38.50 por 1000g -> 38.50/kg ; 25.00 por 500g -> 50.00/kg
    assert res[0].precio_kg == 38.50
    assert res[1].precio_kg == 50.00
