from datetime import date, datetime
from .normalize import normalizar


def correr_fuentes(fuentes, alias_map, fetch_fn, persist_fn) -> list[dict]:
    """Orquesta el scraping de una lista de fuentes.
    fetch_fn(tipo, url, config, canal) -> list[PrecioScrapeado]
    persist_fn(fuente_id, filas) -> int (filas insertadas)
    Devuelve un resumen por fuente (para scrape_run)."""
    runs = []
    hoy = date.today().isoformat()
    for f in fuentes:
        started = datetime.utcnow().isoformat()
        try:
            crudos = fetch_fn(f["tipo"], f["url"], f.get("config", {}), f["canal"])
            filas = []
            for c in crudos:
                canonico = normalizar(c.nombre_crudo, alias_map)
                if not canonico:
                    continue
                filas.append({
                    "fuente_id": f["id"],
                    "corte_canonico": canonico,
                    "canal": c.canal,
                    "precio_kg": c.precio_kg,
                    "fecha": hoy,
                    "raw": c.raw,
                })
            insertadas = persist_fn(f["id"], filas)
            estado = "ok" if filas else "parcial"
            runs.append({"fuente_id": f["id"], "estado": estado,
                         "filas_insertadas": insertadas, "mensaje": None,
                         "started_at": started, "finished_at": datetime.utcnow().isoformat()})
        except Exception as e:
            runs.append({"fuente_id": f["id"], "estado": "error",
                         "filas_insertadas": 0, "mensaje": str(e),
                         "started_at": started, "finished_at": datetime.utcnow().isoformat()})
    return runs
