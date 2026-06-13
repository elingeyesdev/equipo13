def _tendencia_y_accion(actual: float, pronosticado: float) -> tuple[str, str]:
    delta = pronosticado - actual
    umbral_rel = 0.02 * actual  # 2%
    if delta > umbral_rel:
        return "subiendo", "esperar"
    if delta < -umbral_rel:
        return "bajando", "vender_ahora"
    return "estable", "vender_ahora"


def pronosticar(serie: list[float], horizonte: int = 7, umbral: int = 21) -> dict:
    """Predice el precio a `horizonte` pasos. Si la serie es corta (< umbral),
    usa un fallback simple (último valor + pendiente lineal reciente)."""
    actual = serie[-1]
    if len(serie) < umbral:
        # Fallback: pendiente entre primer y último punto, proyectada
        pendiente = (serie[-1] - serie[0]) / max(len(serie) - 1, 1)
        pronosticado = round(actual + pendiente * horizonte, 4)
        tendencia, accion = _tendencia_y_accion(actual, pronosticado)
        return {"modelo": "fallback", "precio_pronosticado": pronosticado,
                "tendencia": tendencia, "accion": accion, "confianza": 0.3, "n_puntos": len(serie)}

    # Serie suficiente: Holt-Winters (tendencia, sin estacionalidad fija)
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    try:
        modelo = ExponentialSmoothing(serie, trend="add", seasonal=None).fit()
        pronosticado = round(float(modelo.forecast(horizonte)[-1]), 4)
        modelo_nombre = "holt_winters"
        confianza = 0.7
    except Exception:
        pendiente = (serie[-1] - serie[0]) / max(len(serie) - 1, 1)
        pronosticado = round(actual + pendiente * horizonte, 4)
        modelo_nombre = "fallback"
        confianza = 0.4
    tendencia, accion = _tendencia_y_accion(actual, pronosticado)
    return {"modelo": modelo_nombre, "precio_pronosticado": pronosticado,
            "tendencia": tendencia, "accion": accion, "confianza": confianza, "n_puntos": len(serie)}
