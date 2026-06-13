from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from .auth import auth_dependency
from scraping.engine import ScrapingEngine

app = FastAPI(title="Inteligencia de Ventas")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ml_service"}


class ScrapingRequest(BaseModel):
    negocio_id: str

SOURCES_MOCK = {
    "fidalga": {
        "url": "https://www.fidalga.com/collections/cerdo",
        "type": "dynamic",
        "canal": "minorista",
        "config": {
            "item_selector": ".product-card",
            "name_selector": ".product-title",
            "price_selector": ".price",
            "price_regex": r"Bs\.\s*([\d.,]+)",
            "wait_for": ".product-card"
        }
    }
}

engine = ScrapingEngine()

@app.post("/scraping/run")
def scraping_run(payload: ScrapingRequest, token: str = Depends(auth_dependency)):
    try:
        precios = engine.run(SOURCES_MOCK)
        return {
            "status": "ok",
            "negocio_id": payload.negocio_id,
            "items_encontrados": len(precios),
            "precios": [p.to_dict() for p in precios]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
