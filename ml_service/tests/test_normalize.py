from scraping.normalize import normalizar

def test_normalizar_por_alias_exacto():
    alias = {"pierna de cerdo frigor": "Pierna", "chorizo parrillero sofia": "Chorizo"}
    assert normalizar("Pierna de Cerdo Frigor", alias) == "Pierna"

def test_normalizar_por_inclusion():
    alias = {"pierna": "Pierna"}
    assert normalizar("Rica Pierna De Chancho 1kg", alias) == "Pierna"

def test_normalizar_sin_match_devuelve_none():
    assert normalizar("Producto Raro", {"pierna": "Pierna"}) is None
