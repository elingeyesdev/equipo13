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


def aplicar_costeo_valor(items: list[dict], costo_total_lote: float) -> list[dict]:
    """Costeo conjunto por VALOR DE VENTA: reparte el costo total del lote entre los cortes
    en proporción a su valor de mercado (precio × kg), en vez de por peso físico.

    cost_kg_i = costo_total_lote × precio_i / Σ(precio_j × kg_j)
              = precio_i × k,   con k = costo_total_lote / valor_total_mercado

    Así un corte premium (lomo) absorbe más costo y uno barato (cuero) casi nada, y el margen
    de cada corte queda proporcional: margen_i = precio_i × (1 − k). Si el lote es rentable en
    conjunto (k < 1), todos los cortes quedan con margen positivo — sin pérdidas artificiales.
    """
    if not costo_total_lote or costo_total_lote <= 0:
        return items  # sin costo de lote (p. ej. modo catálogo): no se reparte nada

    valor_total = sum(
        it["precio_referencia"] * it["kg_disponibles"]
        for it in items
        if it.get("precio_referencia") and it.get("kg_disponibles")
    )
    if valor_total <= 0:
        return items

    k = costo_total_lote / valor_total
    for it in items:
        costo_kg = round(it["precio_referencia"] * k, 4)
        it["costo_kg"] = costo_kg
        it["margen_kg"] = round(it["precio_referencia"] - costo_kg, 4)
        it["ingreso_estimado"] = round(it["precio_referencia"] * it["kg_disponibles"], 4)
        it["margen_total"] = round(it["margen_kg"] * it["kg_disponibles"], 4)

    items.sort(key=lambda x: x["margen_total"], reverse=True)
    return items


def enriquecer_con_forecast(items: list[dict], forecasts: dict[tuple, dict]) -> list[dict]:
    """Inyecta tendencia/accion/precio_pronosticado a cada item según el canal sugerido."""
    for it in items:
        f = forecasts.get((it["corte_canonico"], it["canal_sugerido"]))
        if f:
            it["tendencia"] = f.get("tendencia")
            it["precio_pronosticado"] = f.get("precio_pronosticado")
            it["precio_min"] = f.get("precio_min")
            it["precio_max"] = f.get("precio_max")
            it["confianza"] = f.get("confianza")
            it["confianza_nivel"] = f.get("confianza_nivel")
            
            if it["precio_pronosticado"] is not None:
                it["margen_pronosticado"] = round(it["precio_pronosticado"] - it["costo_kg"], 4)
                it["ingreso_pronosticado"] = round(it["precio_pronosticado"] * it["kg_disponibles"], 4)
            else:
                it["margen_pronosticado"] = None
                it["ingreso_pronosticado"] = None
                
            margen = it["margen_kg"]
            tendencia = it["tendencia"]
            
            if margen < 0:
                it["accion"] = "no_vender"
            elif margen >= 0 and tendencia in ["subiendo", "sube", "up"]:
                it["accion"] = "esperar"
            else:
                it["accion"] = "vender_ahora"
    return items
