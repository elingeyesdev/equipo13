from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import asyncio
import sys
import os
from .auth import auth_dependency
from scraping.repo import cargar_fuentes, cargar_alias, persistir_filas, guardar_scrape_run
from scraping.runner import correr_fuentes
from scraping.registry import get_adapter
from ml.repo import cargar_cortes_disponibles, cargar_precios_recientes, guardar_recomendacion, guardar_modelo_meta
from ml.recommend import recomendar_heuristico, enriquecer_con_forecast
from ml.features import construir_series
from ml.forecast import pronosticar

@asynccontextmanager
async def lifespan(app: FastAPI):
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    yield

app = FastAPI(title="Inteligencia de Ventas", lifespan=lifespan)

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

@app.post("/recomendaciones/generar", dependencies=[Depends(auth_dependency)])
def generar_recomendaciones(payload: dict):
    negocio_id = payload.get("negocio_id")
    if not negocio_id:
        raise HTTPException(status_code=400, detail="negocio_id requerido")
    horizonte = int(payload.get("horizonte_dias", 7))
    try:
        cortes = cargar_cortes_disponibles(negocio_id)
        precios = cargar_precios_recientes(negocio_id)
        items = recomendar_heuristico(cortes, precios)
        
        series = construir_series(precios)
        forecasts = {}
        hay_forecast = False
        for (corte, canal), serie in series.items():
            f = pronosticar(serie, horizonte=horizonte)
            forecasts[(corte, canal)] = f
            guardar_modelo_meta(negocio_id, corte, canal, f)
            if f["modelo"] != "fallback":
                hay_forecast = True
                
        items = enriquecer_con_forecast(items, forecasts)
        modo = "forecast" if hay_forecast else "heuristico"
        
        rec_id = guardar_recomendacion(negocio_id, items, modo, horizonte)
        return {"id": rec_id, "modo": modo, "items": items,
                "resumen": {"ingreso_total": sum(i["ingreso_estimado"] for i in items),
                            "margen_total": sum(i.get("margen_total", 0) for i in items)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
