from fastapi.testclient import TestClient
from app.main import app
from scraping.engine import ScrapingEngine
from scraping.base import PrecioScrapeado
from app.auth import auth_dependency

app.dependency_overrides[auth_dependency] = lambda: "dummy_token"

client = TestClient(app)

def test_scraping_run_endpoint(monkeypatch):
    # Mockear run del engine
    def mock_run(self, sources):
        return [PrecioScrapeado(nombre_crudo="Test", precio_kg=10.0, canal="minorista")]
    monkeypatch.setattr(ScrapingEngine, "run", mock_run)

    headers = {"Authorization": "Bearer TEST_TOKEN"}
    res = client.post("/scraping/run", json={"negocio_id": "n1"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert len(data["precios"]) == 1
    assert data["precios"][0]["nombre_crudo"] == "Test"
