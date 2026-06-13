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
    grupos: dict[tuple, list[float]] = defaultdict(list)
    for p in precios:
        key = (p["corte_canonico"], p["canal"])
        grupos[key].append(float(p["precio_kg"]))

    alertas = []
    for (corte, canal), serie in grupos.items():
        if len(serie) < 2:
            continue  # Sin referencia histórica, no hay alerta

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
