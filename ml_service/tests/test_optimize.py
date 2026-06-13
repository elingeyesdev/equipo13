from ml.optimize import asignar_volumenes_con_topes

def test_asignar_volumenes_con_topes():
    # 100kg de Pierna
    items = [
        {"corte_canonico": "Pierna", "canal": "minorista", "margen_kg": 38.0, "kg_disponibles": 100},
        {"corte_canonico": "Pierna", "canal": "mayorista", "margen_kg": 25.0, "kg_disponibles": 100},
        {"corte_canonico": "Pierna", "canal": "industrial", "margen_kg": 15.0, "kg_disponibles": 100},
    ]
    # Minorista tope de 50kg, mayorista 100kg, industrial sin tope (o no listado).
    topes = {
        "minorista": 50,
        "mayorista": 100,
    }
    
    # Expected: 50 a minorista, 50 a mayorista
    # The output format should be a list of recommendation items with assigned 'kg_sugeridos'
    result = asignar_volumenes_con_topes(items, topes)
    
    assert len(result) == 2
    
    res_min = next(r for r in result if r["canal_sugerido"] == "minorista")
    res_may = next(r for r in result if r["canal_sugerido"] == "mayorista")
    
    assert res_min["kg_sugeridos"] == 50
    assert res_may["kg_sugeridos"] == 50
    assert res_min["margen_total"] == 50 * 38.0
    assert res_may["margen_total"] == 50 * 25.0
