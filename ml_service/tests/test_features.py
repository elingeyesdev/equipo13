from ml.features import construir_series

def test_construir_series_agrupa_por_corte_canal():
    historico = [
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 70, "fecha": "2026-06-01"},
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 72, "fecha": "2026-06-02"},
        {"corte_canonico": "Pierna", "canal": "mayorista", "precio_kg": 60, "fecha": "2026-06-01"},
    ]
    series = construir_series(historico)
    assert ("Pierna", "minorista") in series
    assert series[("Pierna", "minorista")] == [70.0, 72.0]  # ordenado por fecha asc
