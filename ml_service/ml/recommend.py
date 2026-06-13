def _precio_mas_reciente(precios, corte, canal):
    # precios ya viene ordenado por fecha DESC; toma el primero que matchea.
    for p in precios:
        if p["corte_canonico"] == corte and p["canal"] == canal:
            return p["precio_kg"]
    return None


def recomendar_heuristico(cortes: list[dict], precios: list[dict]) -> list[dict]:
    """Para cada corte disponible, elige el canal de mayor margen y arma el item.
    cortes: [{corte_canonico, costo_kg, kg_disponibles}]
    precios: [{corte_canonico, canal, precio_kg}] (ordenado por fecha DESC)."""
    items = []
    for c in cortes:
        mejor = None
        for canal in ("minorista", "mayorista"):
            precio = _precio_mas_reciente(precios, c["corte_canonico"], canal)
            if precio is None:
                continue
            margen = round(precio - c["costo_kg"], 4)
            if mejor is None or margen > mejor["margen_kg"]:
                mejor = {"canal_sugerido": canal, "precio_referencia": precio, "margen_kg": margen}
        if mejor is None:
            continue
        kg = c["kg_disponibles"]
        items.append({
            "corte_canonico": c["corte_canonico"],
            "canal_sugerido": mejor["canal_sugerido"],
            "precio_referencia": mejor["precio_referencia"],
            "costo_kg": c["costo_kg"],
            "margen_kg": mejor["margen_kg"],
            "kg_disponibles": kg,
            "ingreso_estimado": round(mejor["precio_referencia"] * kg, 4),
            "margen_total": round(mejor["margen_kg"] * kg, 4),
            "tendencia": None,
            "precio_pronosticado": None,
            "accion": None,
            "confianza": None,
        })
    items.sort(key=lambda x: x["margen_total"], reverse=True)
    return items


def enriquecer_con_forecast(items: list[dict], forecasts: dict[tuple, dict]) -> list[dict]:
    """Inyecta tendencia/accion/precio_pronosticado a cada item según el canal sugerido."""
    for it in items:
        f = forecasts.get((it["corte_canonico"], it["canal_sugerido"]))
        if f:
            it["tendencia"] = f.get("tendencia")
            it["accion"] = f.get("accion")
            it["precio_pronosticado"] = f.get("precio_pronosticado")
            it["confianza"] = f.get("confianza")
    return items
