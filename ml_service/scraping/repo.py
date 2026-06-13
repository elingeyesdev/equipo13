from app.db import get_conn, fetch_all


def cargar_fuentes(negocio_id: str) -> list[dict]:
    return fetch_all(
        "SELECT id::text, nombre, url, tipo, config, canal FROM fuentes_scraping "
        "WHERE negocio_id = %s AND activo = true",
        (negocio_id,),
    )


def cargar_alias(negocio_id: str) -> dict[str, str]:
    rows = fetch_all(
        "SELECT lower(alias_texto) AS alias, corte_canonico FROM corte_alias WHERE negocio_id = %s",
        (negocio_id,),
    )
    return {r["alias"]: r["corte_canonico"] for r in rows}


def persistir_filas(negocio_id: str, fuente_id: str, filas: list[dict]) -> int:
    if not filas:
        return 0
    import json
    with get_conn() as conn:
        with conn.cursor() as cur:
            n = 0
            for f in filas:
                cur.execute(
                    """INSERT INTO precio_mercado_historico
                         (negocio_id, fuente_id, corte_canonico, canal, precio_kg, fecha, raw)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (negocio_id, fuente_id, corte_canonico, canal, fecha)
                       DO UPDATE SET precio_kg = EXCLUDED.precio_kg, scraped_at = NOW()""",
                    (negocio_id, fuente_id, f["corte_canonico"], f["canal"],
                     f["precio_kg"], f["fecha"], json.dumps(f.get("raw"))),
                )
                n += 1
            return n


def guardar_scrape_run(negocio_id: str, run: dict) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO scrape_run
                     (negocio_id, fuente_id, estado, filas_insertadas, mensaje, started_at, finished_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (negocio_id, run["fuente_id"], run["estado"], run["filas_insertadas"],
                 run["mensaje"], run["started_at"], run["finished_at"]),
            )
