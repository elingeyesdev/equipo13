from ml.recommend import recomendar_heuristico

def test_recomendar_elige_mejor_canal_por_margen():
    cortes = [{"corte_canonico": "Pierna", "costo_kg": 40.0, "kg_disponibles": 100.0}]
    precios = [
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 78.0},
        {"corte_canonico": "Pierna", "canal": "mayorista", "precio_kg": 60.0},
    ]
    items = recomendar_heuristico(cortes, precios)
    assert len(items) == 1
    it = items[0]
    assert it["canal_sugerido"] == "minorista"   # mayor margen
    assert it["margen_kg"] == 38.0
    assert it["ingreso_estimado"] == 7800.0

def test_recomendar_ignora_corte_sin_precio():
    cortes = [{"corte_canonico": "Costilla", "costo_kg": 30.0, "kg_disponibles": 10.0}]
    assert recomendar_heuristico(cortes, []) == []

def test_recomendar_ordena_por_margen_total_desc():
    cortes = [
        {"corte_canonico": "A", "costo_kg": 10, "kg_disponibles": 10},
        {"corte_canonico": "B", "costo_kg": 10, "kg_disponibles": 100},
    ]
    precios = [
        {"corte_canonico": "A", "canal": "minorista", "precio_kg": 30},
        {"corte_canonico": "B", "canal": "minorista", "precio_kg": 15},
    ]
    items = recomendar_heuristico(cortes, precios)
    assert items[0]["corte_canonico"] == "B"  # 5*100=500 > 20*10=200
