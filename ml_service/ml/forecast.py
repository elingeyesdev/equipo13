def _tendencia_y_accion(actual: float, pronosticado: float) -> tuple[str, str]:
    delta = pronosticado - actual
    umbral_rel = 0.02 * actual  # 2%
    if delta > umbral_rel:
        return "subiendo", "esperar"
    if delta < -umbral_rel:
        return "bajando", "vender_ahora"
    return "estable", "vender_ahora"


def _nivel_confianza(mape: float | None) -> str:
    if mape is None:        return "media"
    if mape < 5:            return "alta"
    if mape < 15:           return "media"
    return "baja"


def _pronosticar_prophet(serie: list[tuple[str, float]], horizonte: int) -> dict:
    import pandas as pd
    try:
        from prophet import Prophet
    except ImportError:
        return _pronosticar_fallback([v for _, v in serie], horizonte)
    
    df = pd.DataFrame(serie, columns=["ds", "y"])
    
    # Backtesting (últimos 7 días)
    train_df = df.iloc[:-7]
    test_df = df.iloc[-7:]
    
    if len(train_df) < 30:
        return _pronosticar_fallback([v for _, v in serie], horizonte)
    
    try:
        # Calcular metricas
        m_eval = Prophet(daily_seasonality=False)
        m_eval.fit(train_df)
        future_eval = m_eval.make_future_dataframe(periods=7)
        forecast_eval = m_eval.predict(future_eval)
        
        preds = forecast_eval.iloc[-7:]["yhat"].values
        reales = test_df["y"].values
        
        mae = float(sum(abs(p - r) for p, r in zip(preds, reales)) / 7)
        mape = float(sum(abs((r - p) / r) for p, r in zip(preds, reales)) / 7 * 100)
        
        # Pronostico real con toda la data
        m_final = Prophet(daily_seasonality=False)
        m_final.fit(df)
        future = m_final.make_future_dataframe(periods=horizonte)
        forecast_final = m_final.predict(future)
        
        pronosticado = round(float(forecast_final.iloc[-1]["yhat"]), 4)
        precio_min = round(float(forecast_final.iloc[-1]["yhat_lower"]), 4)
        precio_max = round(float(forecast_final.iloc[-1]["yhat_upper"]), 4)
        actual = serie[-1][1]
        tendencia, accion = _tendencia_y_accion(actual, pronosticado)
        
        return {
            "modelo": "prophet",
            "precio_pronosticado": pronosticado,
            "precio_min": precio_min,
            "precio_max": precio_max,
            "tendencia": tendencia,
            "accion": accion,
            "confianza": 0.85,
            "confianza_nivel": _nivel_confianza(mape),
            "n_puntos": len(serie),
            "mae": round(mae, 4),
            "mape": round(mape, 4)
        }
    except Exception:
        # Fallback si falla Prophet
        return _pronosticar_holt_winters([v for _, v in serie], horizonte)

def _pronosticar_holt_winters(serie_y: list[float], horizonte: int) -> dict:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    actual = serie_y[-1]
    try:
        modelo = ExponentialSmoothing(serie_y, trend="add", seasonal=None).fit()
        pronosticado = round(float(modelo.forecast(horizonte)[-1]), 4)
        modelo_nombre = "holt_winters"
        confianza = 0.7
    except Exception:
        return _pronosticar_fallback(serie_y, horizonte)
    tendencia, accion = _tendencia_y_accion(actual, pronosticado)
    return {
        "modelo": modelo_nombre,
        "precio_pronosticado": pronosticado,
        "precio_min": None,
        "precio_max": None,
        "tendencia": tendencia,
        "accion": accion,
        "confianza": confianza,
        "confianza_nivel": "media",
        "n_puntos": len(serie_y)
    }

def _pronosticar_fallback(serie_y: list[float], horizonte: int) -> dict:
    actual = serie_y[-1]
    pendiente = (serie_y[-1] - serie_y[0]) / max(len(serie_y) - 1, 1)
    pronosticado = round(actual + pendiente * horizonte, 4)
    tendencia, accion = _tendencia_y_accion(actual, pronosticado)
    return {
        "modelo": "fallback",
        "precio_pronosticado": pronosticado,
        "precio_min": None,
        "precio_max": None,
        "tendencia": tendencia,
        "accion": accion,
        "confianza": 0.3,
        "confianza_nivel": "baja",
        "n_puntos": len(serie_y)
    }

def pronosticar(serie: list[tuple[str, float]], horizonte: int = 7, umbral: int = 21) -> dict:
    """Predice el precio a `horizonte` pasos."""
    if len(serie) >= 365:
        return _pronosticar_prophet(serie, horizonte)
    
    serie_y = [v for _, v in serie]
    if len(serie_y) < umbral:
        return _pronosticar_fallback(serie_y, horizonte)

    return _pronosticar_holt_winters(serie_y, horizonte)

