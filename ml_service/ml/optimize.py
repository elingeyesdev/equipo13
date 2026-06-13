def asignar_volumenes_con_topes(corte_items: list[dict], topes: dict[str, float]) -> list[dict]:
    """
    Asigna volumenes disponibles a canales respetando topes.
    corte_items: items del mismo corte con margen en diferentes canales, o de varios cortes.
    Asumimos que agrupa por corte internamente si recibe una mezcla.
    """
    # Group items by corte
    from collections import defaultdict
    
    cortes_dict = defaultdict(list)
    for it in corte_items:
        cortes_dict[it["corte_canonico"]].append(it)
        
    resultado = []
    
    # Track remaining capacity for each canal
    capacidad_restante = dict(topes)
    
    for corte, items in cortes_dict.items():
        # Sort by margen_kg descending
        items_sorted = sorted(items, key=lambda x: x["margen_kg"], reverse=True)
        
        # We need to know how many kg_disponibles there are for this corte.
        # Since all items for the same corte have the same kg_disponibles in our data model:
        kg_restantes = items_sorted[0]["kg_disponibles"] if items_sorted else 0
        
        for it in items_sorted:
            if kg_restantes <= 0:
                break
            canal = it.get("canal_sugerido") or it.get("canal")
            # If canal is not in topes, assume infinite capacity.
            capacidad = capacidad_restante.get(canal, float("inf"))
            
            if capacidad <= 0:
                continue
                
            kg_a_asignar = min(kg_restantes, capacidad)
            
            # Record assignment
            nuevo_item = dict(it)
            nuevo_item["canal_sugerido"] = canal
            nuevo_item["kg_sugeridos"] = kg_a_asignar
            nuevo_item["ingreso_estimado"] = kg_a_asignar * it.get("precio_referencia", 0)
            nuevo_item["margen_total"] = kg_a_asignar * it.get("margen_kg", 0)
            
            resultado.append(nuevo_item)
            
            kg_restantes -= kg_a_asignar
            if canal in capacidad_restante:
                capacidad_restante[canal] -= kg_a_asignar
                
        # If there are still kg_restantes after trying all canals, they are left unassigned,
        # or we could force them to the best canal. The requirement says to respect topes.
        
    return resultado
