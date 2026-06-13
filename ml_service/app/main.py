from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from .auth import auth_dependency
from scraping.repo import cargar_fuentes, cargar_alias, persistir_filas, guardar_scrape_run
from scraping.runner import correr_fuentes
from scraping.registry import get_adapter

app = FastAPI(title="Inteligencia de Ventas")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ml_service"}


class ScrapingRequest(BaseModel):
    negocio_id: str


@app.post("/scraping/run", dependencies=[Depends(auth_dependency)])
def scraping_run(payload: ScrapingRequest):
    negocio_id = payload.negocio_id
    if not negocio_id:
        raise HTTPException(status_code=400, detail="negocio_id requerido")
    
    try:
        fuentes = cargar_fuentes(negocio_id)
        alias = cargar_alias(negocio_id)

        def fetch_fn(tipo, url, config, canal):
            return get_adapter(tipo).fetch(url, config, canal)

        def persist_fn(fuente_id, filas):
            return persistir_filas(negocio_id, fuente_id, filas)

        runs = correr_fuentes(fuentes, alias, fetch_fn, persist_fn)
        for r in runs:
            guardar_scrape_run(negocio_id, r)
            
        total = sum(r["filas_insertadas"] for r in runs)
        return {"fuentes": len(fuentes), "filas_insertadas": total, "runs": runs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
