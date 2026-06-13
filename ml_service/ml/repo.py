import psycopg
from psycopg.rows import dict_row
import json
from app.db import get_conn, fetch_all


def cargar_cortes_disponibles(negocio_id: str) -> list[dict]:
    # Agrega el despiece por nombre de corte: kg disponibles y costo promedio ponderado.
    return fetch_all(
        """SELECT dc.nombre AS corte_canonico,
                  SUM(dc.peso_kg) AS kg_disponibles,
                  CASE WHEN SUM(dc.peso_kg) > 0
                       THEN SUM(dc.costo_kg_derivado * dc.peso_kg) / SUM(dc.peso_kg)
                       ELSE 0 END AS costo_kg
             FROM despiece_cortes dc
             JOIN lotes l ON l.id = dc.lote_id
            WHERE l.negocio_id = %s
            GROUP BY dc.nombre
           HAVING SUM(dc.peso_kg) > 0""",
        (negocio_id,),
    )


def cargar_precios_recientes(negocio_id: str) -> list[dict]:
    return fetch_all(
        """SELECT corte_canonico, canal, precio_kg
             FROM precio_mercado_historico
            WHERE negocio_id = %s
            ORDER BY fecha DESC, scraped_at DESC""",
        (negocio_id,),
    )


def guardar_recomendacion(negocio_id: str, items: list[dict], modo: str, horizonte: int) -> str:
    ingreso = sum(i["ingreso_estimado"] for i in items)
    margen = sum(i.get("margen_total", 0) for i in items)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO recomendacion_venta (negocio_id, horizonte_dias, modo, resumen)
                   VALUES (%s,%s,%s,%s) RETURNING id::text""",
                (negocio_id, horizonte, modo,
                 json.dumps({"ingreso_total": ingreso, "margen_total": margen, "n_items": len(items)})),
            )
            rec_id = cur.fetchone()["id"]
            for it in items:
                cur.execute(
                    """INSERT INTO recomendacion_item
                         (recomendacion_id, corte_canonico, canal_sugerido, precio_referencia,
                          costo_kg, margen_kg, kg_disponibles, ingreso_estimado,
                          tendencia, precio_pronosticado, accion, confianza)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (rec_id, it["corte_canonico"], it["canal_sugerido"], it["precio_referencia"],
                     it["costo_kg"], it["margen_kg"], it["kg_disponibles"], it["ingreso_estimado"],
                     it.get("tendencia"), it.get("precio_pronosticado"), it.get("accion"), it.get("confianza")),
                )
            return rec_id

def guardar_modelo_meta(negocio_id, corte, canal, f: dict) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO modelo_forecast_meta (negocio_id, corte_canonico, canal, modelo, metricas, n_puntos)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (negocio_id, corte, canal, f.get("modelo"),
                 json.dumps({"confianza": f.get("confianza")}), f.get("n_puntos")),
            )
