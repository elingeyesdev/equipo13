from apscheduler.schedulers.background import BackgroundScheduler
from app.db import fetch_all
from scraping.repo import cargar_fuentes, cargar_alias, persistir_filas, guardar_scrape_run
from scraping.runner import correr_fuentes
from scraping.registry import get_adapter


def listar_negocios_con_fuentes() -> list[str]:
    rows = fetch_all("SELECT DISTINCT negocio_id::text AS nid FROM fuentes_scraping WHERE activo = true")
    return [r["nid"] for r in rows]


def ejecutar_scraping_negocio(negocio_id: str) -> None:
    fuentes = cargar_fuentes(negocio_id)
    alias = cargar_alias(negocio_id)
    runs = correr_fuentes(
        fuentes, alias,
        lambda tipo, url, config, canal: get_adapter(tipo).fetch(url, config, canal),
        lambda fid, filas: persistir_filas(negocio_id, fid, filas),
    )
    for r in runs:
        guardar_scrape_run(negocio_id, r)


def scrapear_todos() -> None:
    for nid in listar_negocios_con_fuentes():
        try:
            ejecutar_scraping_negocio(nid)
        except Exception as e:
            print(f"[scheduler] error scrapeando {nid}: {e}")


def iniciar_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="America/La_Paz")
    sched.add_job(scrapear_todos, "cron", hour=5, minute=0, id="scraping_diario")
    sched.start()
    return sched
