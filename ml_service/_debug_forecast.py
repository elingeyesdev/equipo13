"""Debug temporal: pipeline completo de /recomendaciones/generar (sin escribir BD)."""
import traceback
from ml.repo import cargar_cortes_disponibles, cargar_precios_recientes, cargar_topes_canal
from ml.recommend import recomendar_heuristico, enriquecer_con_forecast
from ml.features import construir_series
from ml.forecast import pronosticar
from ml.optimize import asignar_volumenes_con_topes

NID = "6dfb2265-e273-4bac-bb0c-cca9ba0a94fc"
try:
    cortes = cargar_cortes_disponibles(NID)
    precios = cargar_precios_recientes(NID)
    print("tipos corte:", {k: type(v).__name__ for k, v in cortes[0].items()})
    print("tipos precio:", {k: type(v).__name__ for k, v in precios[0].items()})
    items = recomendar_heuristico(cortes, precios)
    series = construir_series(precios)
    forecasts = {}
    for key, serie in series.items():
        f = pronosticar(serie, horizonte=7)
        forecasts[key] = f
    items = enriquecer_con_forecast(items, forecasts)
    topes = cargar_topes_canal(NID)
    items = asignar_volumenes_con_topes(items, topes)
    hay_forecast = any(f["modelo"] != "fallback" for f in forecasts.values())
    print("modo:", "forecast" if hay_forecast else "heuristico")
    print("modelos:", {f"{k[0]}/{k[1]}": (v["modelo"], v.get("mae"), v.get("mape")) for k, v in forecasts.items()})
    print("items optimizados:", len(items))
    import json
    print("ingreso_total:", round(sum(i["ingreso_estimado"] for i in items), 2),
          "(json-serializable:", json.dumps({"x": sum(i["ingreso_estimado"] for i in items)}) is not None, ")")
    for it in items:
        print(f"  {it['corte_canonico']:9} {it['canal_sugerido']:9} tend={it['tendencia']:8} accion={it['accion']:13} "
              f"kg={it.get('kg_sugeridos')} ingreso={it['ingreso_estimado']}")
except Exception:
    traceback.print_exc()
