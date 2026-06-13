from ml.forecast import pronosticar

def test_forecast_fallback_pocos_datos():
    # Con < umbral de puntos, usa fallback: pendiente proyectada.
    r = pronosticar([51.0, 51.0], horizonte=7, umbral=21)
    assert r["modelo"] == "fallback"
    assert r["precio_pronosticado"] == 51.0
    assert r["confianza"] <= 0.3

def test_forecast_detecta_tendencia_subiendo():
    serie = [float(x) for x in range(50, 50 + 30)]  # creciente
    r = pronosticar(serie, horizonte=7, umbral=21)
    assert r["tendencia"] == "subiendo"
    assert r["accion"] == "esperar"   # sube -> conviene esperar
    assert r["precio_pronosticado"] > serie[-1]

def test_forecast_detecta_tendencia_bajando():
    serie = [float(x) for x in range(80, 50, -1)]  # decreciente
    r = pronosticar(serie, horizonte=7, umbral=21)
    assert r["tendencia"] == "bajando"
    assert r["accion"] == "vender_ahora"
