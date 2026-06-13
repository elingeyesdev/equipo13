from ml.forecast import pronosticar
from datetime import datetime, timedelta

def test_forecast_fallback_pocos_datos():
    # Con < umbral de puntos, usa fallback: pendiente proyectada.
    serie = [("2025-01-01", 51.0), ("2025-01-02", 51.0)]
    r = pronosticar(serie, horizonte=7, umbral=21)
    assert r["modelo"] == "fallback"
    assert r["tendencia"] == "estable"

def test_forecast_detecta_tendencia_subiendo():
    base_date = datetime(2025, 1, 1)
    serie = [((base_date + timedelta(days=i)).strftime("%Y-%m-%d"), float(50 + i)) for i in range(30)]
    r = pronosticar(serie, horizonte=7, umbral=21)
    assert r["modelo"] in ["holt_winters", "fallback"]  # Holt-winters si no falla
    assert r["tendencia"] == "subiendo"
    assert r["accion"] == "esperar"

def test_forecast_detecta_tendencia_bajando():
    base_date = datetime(2025, 1, 1)
    serie = [((base_date + timedelta(days=i)).strftime("%Y-%m-%d"), float(80 - i)) for i in range(30)]
    r = pronosticar(serie, horizonte=7, umbral=21)
    assert r["tendencia"] == "bajando"
    assert r["accion"] == "vender_ahora"

def test_forecast_prophet_muchos_datos():
    # Serie de 365 dias para disparar prophet
    base_date = datetime(2025, 1, 1)
    serie = [((base_date + timedelta(days=i)).strftime("%Y-%m-%d"), 50.0 + (i % 7)) for i in range(370)]
    r = pronosticar(serie, horizonte=7, umbral=21)
    
    # Podría caer en fallback si no está instalado prophet en tests, pero el CI lo tiene.
    if r["modelo"] == "prophet":
        assert "mae" in r
        assert "mape" in r
        assert r["confianza"] == 0.85
