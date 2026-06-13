from ml.alertas import detectar_alertas_precio, UMBRAL_PCT

def test_detecta_alerta_cuando_variacion_supera_umbral():
    # precio actual 90, promedio reciente 78 → variación = +15.4% > 10%
    precios = [
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 78.0},
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 80.0},
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 82.0},
        {"corte_canonico": "Pierna", "canal": "minorista", "precio_kg": 90.0},  # último = nuevo
    ]
    alertas = detectar_alertas_precio(precios, umbral_pct=UMBRAL_PCT)
    assert len(alertas) == 1
    a = alertas[0]
    assert a["corte_canonico"] == "Pierna"
    assert a["canal"] == "minorista"
    assert a["precio_nuevo"] == 90.0
    assert a["variacion_pct"] > 10.0

def test_no_alerta_cuando_variacion_dentro_umbral():
    precios = [
        {"corte_canonico": "Costilla", "canal": "mayorista", "precio_kg": 60.0},
        {"corte_canonico": "Costilla", "canal": "mayorista", "precio_kg": 61.0},
        {"corte_canonico": "Costilla", "canal": "mayorista", "precio_kg": 62.0},
    ]
    alertas = detectar_alertas_precio(precios, umbral_pct=UMBRAL_PCT)
    assert alertas == []

def test_no_alerta_con_serie_unica():
    # Con un solo punto no hay referencia histórica → sin alerta
    precios = [{"corte_canonico": "Lomo", "canal": "minorista", "precio_kg": 100.0}]
    alertas = detectar_alertas_precio(precios, umbral_pct=UMBRAL_PCT)
    assert alertas == []
