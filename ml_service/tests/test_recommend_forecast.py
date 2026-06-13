from ml.recommend import enriquecer_con_forecast

def test_enriquecer_agrega_tendencia_y_accion():
    items = [{"corte_canonico": "Pierna", "canal_sugerido": "minorista", "precio_referencia": 78.0,
              "costo_kg": 40, "margen_kg": 38, "kg_disponibles": 100, "ingreso_estimado": 7800,
              "margen_total": 3800, "tendencia": None, "precio_pronosticado": None,
              "accion": None, "confianza": None}]
    forecasts = {("Pierna", "minorista"): {"tendencia": "bajando", "accion": "vender_ahora",
                 "precio_pronosticado": 70.0, "confianza": 0.7}}
    out = enriquecer_con_forecast(items, forecasts)
    assert out[0]["tendencia"] == "bajando"
    assert out[0]["accion"] == "vender_ahora"
    assert out[0]["precio_pronosticado"] == 70.0
