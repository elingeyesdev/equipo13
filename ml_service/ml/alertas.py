from collections import defaultdict
from app.db import get_conn
import json

UMBRAL_PCT = 10.0  # ±10%


def detectar_alertas_precio(
    precios: list[dict], umbral_pct: float = UMBRAL_PCT
) -> list[dict]:
    """Compara el último precio de cada (corte, canal) con el promedio histórico previo.

    Devuelve una lista de alertas (dicts) para los pares donde la variación
    supera el umbral (en valor absoluto).
    """
    # Agrupar por (corte, canal)
    grupos: dict[tuple, list[dict]] = defaultdict(list)
    for p in precios:
        key = (p["corte_canonico"], p["canal"])
        grupos[key].append(p)

    alertas = []
    for (corte, canal), registros in grupos.items():
        if len(registros) < 2:
            continue  # Sin referencia histórica, no hay alerta

        # Ordenar cronológicamente ascendente cuando haya fecha: el origen real
        # (cargar_precios_recientes) viene en orden DESC, así que sin esto el
        # "precio_nuevo" (serie[-1]) sería el más antiguo, invirtiendo la alerta.
        if all("fecha" in r for r in registros):
            registros = sorted(registros, key=lambda r: str(r["fecha"]))
        serie = [float(r["precio_kg"]) for r in registros]

        precio_nuevo = serie[-1]
        precio_promedio = sum(serie[:-1]) / len(serie[:-1])

        if precio_promedio == 0:
            continue

        variacion_pct = ((precio_nuevo - precio_promedio) / precio_promedio) * 100

        if abs(variacion_pct) >= umbral_pct:
            alertas.append(
                {
                    "corte_canonico": corte,
                    "canal": canal,
                    "precio_nuevo": precio_nuevo,
                    "precio_promedio": round(precio_promedio, 4),
                    "variacion_pct": round(variacion_pct, 4),
                }
            )
    return alertas


def guardar_alertas(negocio_id: str, alertas: list[dict]) -> None:
    """Persiste las alertas detectadas en la tabla alerta_precio."""
    if not alertas:
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            for a in alertas:
                cur.execute(
                    """INSERT INTO alerta_precio
                         (negocio_id, corte_canonico, canal, precio_nuevo, precio_promedio, variacion_pct)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    (
                        negocio_id,
                        a["corte_canonico"],
                        a["canal"],
                        a["precio_nuevo"],
                        a["precio_promedio"],
                        a["variacion_pct"],
                    ),
                )


def cargar_alertas_recientes(negocio_id: str, limit: int = 20) -> list[dict]:
    """Devuelve las alertas más recientes para el negocio."""
    from app.db import fetch_all
    return fetch_all(
        """SELECT corte_canonico, canal, precio_nuevo, precio_promedio,
                  variacion_pct, created_at::text AS created_at
             FROM alerta_precio
            WHERE negocio_id = %s
            ORDER BY created_at DESC
            LIMIT %s""",
        (negocio_id, limit),
    )
