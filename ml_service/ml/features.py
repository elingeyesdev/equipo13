from collections import defaultdict


def construir_series(historico: list[dict]) -> dict[tuple, list[tuple[str, float]]]:
    """Agrupa el histórico en series ordenadas por fecha ascendente, por (corte, canal)."""
    buckets = defaultdict(list)
    for h in historico:
        buckets[(h["corte_canonico"], h["canal"])].append((str(h["fecha"])[:10], float(h["precio_kg"])))
    series = {}
    for key, vals in buckets.items():
        vals.sort(key=lambda x: x[0])
        series[key] = vals
    return series
