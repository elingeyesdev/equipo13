from scheduler import scrapear_todos

def test_scrapear_todos_itera_negocios(monkeypatch):
    llamados = []
    monkeypatch.setattr("scheduler.listar_negocios_con_fuentes", lambda: ["n1", "n2"])
    monkeypatch.setattr("scheduler.ejecutar_scraping_negocio", lambda nid: llamados.append(nid))
    scrapear_todos()
    assert llamados == ["n1", "n2"]
