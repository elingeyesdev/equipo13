from fastapi.testclient import TestClient
import app.main as main

def test_generar_recomendaciones(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "ML_SERVICE_TOKEN", "secreto")
    monkeypatch.setattr(main, "cargar_cortes_disponibles",
                        lambda nid: [{"corte_canonico": "Pierna", "costo_kg": 40.0, "kg_disponibles": 100.0}])
    monkeypatch.setattr(main, "cargar_precios_recientes",
                        lambda nid: [{"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 78.0, "fecha": "2026-06-13"}])
    monkeypatch.setattr(main, "guardar_recomendacion", lambda nid, items, modo, hz: "rec1")
    monkeypatch.setattr(main, "guardar_modelo_meta", lambda nid, corte, canal, f: None)
    
    client = TestClient(main.app)
    res = client.post("/recomendaciones/generar", json={"negocio_id": "n1"},
                      headers={"Authorization": "Bearer secreto"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "rec1"
    assert data["items"][0]["canal_sugerido"] == "minorista"
    assert data["items"][0]["ingreso_estimado"] == 7800.0
