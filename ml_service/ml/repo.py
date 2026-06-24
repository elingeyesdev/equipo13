import psycopg
from psycopg.rows import dict_row
import json
from app.db import get_conn, fetch_all


# Rendimiento de canal por defecto (peso canal / peso vivo). Coincide con el default
# del sistema (analisisController.js usa 75% si no se especifica otro).
RENDIMIENTO_CANAL = 0.78


def cargar_cortes_disponibles(negocio_id: str, lote_id: str) -> list[dict]:
    # Calcula un despiece TEÓRICO del lote a partir del catálogo de cortes — NO requiere
    # un despiece guardado. Los kg vendibles de cada corte y el costo/kg salen de la
    # cantidad y el costo reales del lote:
    #   kg canal del lote = cabezas_activas * peso_actual_prom * RENDIMIENTO_CANAL
    #   kg por corte      = kg canal * (catalogo.rendimiento_pct / 100)
    #   costo/kg          = costo total del lote (adquisición + bitácora) / kg canal
    rows = fetch_all(
        """SELECT cc.nombre AS corte_canonico,
                  (l.cabezas_activas * l.peso_actual_prom * %s * cc.rendimiento_pct / 100.0)
                      AS kg_disponibles,
                  lc.costo_total
                      / NULLIF(l.cabezas_activas * l.peso_actual_prom * %s, 0) AS costo_kg,
                  lc.costo_total AS costo_total_lote
             FROM lotes l
             JOIN catalogo_cortes cc
               ON cc.negocio_id = l.negocio_id AND cc.activo = true
             CROSS JOIN LATERAL (
                 SELECT l.costo_adquisicion + COALESCE((
                          SELECT SUM(b.monto) FROM bitacora_lote b
                           WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
                        ), 0) AS costo_total
             ) lc
            WHERE l.negocio_id = %s AND l.id = %s
              AND l.cabezas_activas > 0 AND l.peso_actual_prom > 0
              AND cc.rendimiento_pct > 0""",
        (RENDIMIENTO_CANAL, RENDIMIENTO_CANAL, negocio_id, lote_id),
    )
    # PostgreSQL devuelve NUMERIC como Decimal; el ML opera con float (Prophet,
    # optimize y json.dumps no mezclan float con Decimal). Coercionamos en el borde.
    for r in rows:
        r["kg_disponibles"] = float(r["kg_disponibles"])
        r["costo_kg"] = float(r["costo_kg"])
        r["costo_total_lote"] = float(r["costo_total_lote"])
    return rows


def cargar_cortes_catalogo(negocio_id: str) -> list[dict]:
    # Modo SIN lote (p. ej. Liquidación): devuelve los cortes activos del catálogo solo para
    # poder adjuntarles el precio de mercado y el pronóstico. Sin lote no hay kg ni costo,
    # así que van en 0 (quien consume esto usa el precio sugerido, no kg/costo).
    rows = fetch_all(
        """SELECT cc.nombre AS corte_canonico, 0.0 AS kg_disponibles, 0.0 AS costo_kg
             FROM catalogo_cortes cc
            WHERE cc.negocio_id = %s AND cc.activo = true AND cc.rendimiento_pct > 0
            ORDER BY cc.orden, cc.nombre""",
        (negocio_id,),
    )
    for r in rows:
        r["kg_disponibles"] = float(r["kg_disponibles"])
        r["costo_kg"] = float(r["costo_kg"])
        r["costo_total_lote"] = 0.0
    return rows


def cargar_precios_recientes(negocio_id: str) -> list[dict]:
    rows = fetch_all(
        """SELECT corte_canonico, canal, precio_kg, fecha
             FROM precio_mercado_historico
            WHERE negocio_id = %s
            ORDER BY fecha DESC, scraped_at DESC""",
        (negocio_id,),
    )
    for r in rows:
        r["precio_kg"] = float(r["precio_kg"])
    return rows


def guardar_recomendacion(negocio_id: str, lote_id: str, items: list[dict], modo: str, horizonte: int) -> str:
    ingreso = sum(i["ingreso_estimado"] for i in items)
    margen = sum(i.get("margen_total", 0) for i in items)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO recomendacion_venta (negocio_id, lote_id, horizonte_dias, modo, resumen)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id::text""",
                (negocio_id, lote_id, horizonte, modo,
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
            metricas = {"confianza": f.get("confianza")}
            if "mae" in f:
                metricas["mae"] = f["mae"]
            if "mape" in f:
                metricas["mape"] = f["mape"]
            
            cur.execute(
                """INSERT INTO modelo_forecast_meta (negocio_id, corte_canonico, canal, modelo, metricas, n_puntos)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (negocio_id, corte, canal, f.get("modelo"),
                 json.dumps(metricas), f.get("n_puntos")),
            )

def cargar_topes_canal(negocio_id: str) -> dict[str, float]:
    rows = fetch_all(
        "SELECT canal, kg_max_semana FROM tope_canal WHERE negocio_id = %s",
        (negocio_id,)
    )
    return {r["canal"]: float(r["kg_max_semana"]) for r in rows}
