from fastapi.testclient import TestClient
import app.main as main
from scraping.base import PrecioScrapeado

def test_scraping_run_endpoint(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "ML_SERVICE_TOKEN", "secreto")
    monkeypatch.setattr(main, "cargar_fuentes", lambda nid: [
        {"id": "f1", "tipo": "static", "url": "http://x", "config": {}, "canal": "minorista"}])
    monkeypatch.setattr(main, "cargar_alias", lambda nid: {"pierna": "Pierna"})
    monkeypatch.setattr("scraping.registry.StaticAdapter.fetch",
                        lambda self, u, c, canal: [PrecioScrapeado("Pierna 1kg", 70.0, canal)])
    monkeypatch.setattr(main, "persistir_filas", lambda nid, fid, filas: len(filas))
    monkeypatch.setattr(main, "guardar_scrape_run", lambda nid, run: None)

    client = TestClient(main.app)
    res = client.post("/scraping/run", json={"negocio_id": "n1"},
                      headers={"Authorization": "Bearer secreto"})
    assert res.status_code == 200
    assert res.json()["filas_insertadas"] == 1
