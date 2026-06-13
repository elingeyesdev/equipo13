from collections import defaultdict


def construir_series(historico: list[dict]) -> dict[tuple, list[float]]:
    """Agrupa el histórico en series ordenadas por fecha ascendente, por (corte, canal)."""
    buckets = defaultdict(list)
    for h in historico:
        buckets[(h["corte_canonico"], h["canal"])].append((h["fecha"], float(h["precio_kg"])))
    series = {}
    for key, vals in buckets.items():
        vals.sort(key=lambda x: x[0])
        series[key] = [v for _, v in vals]
    return series
