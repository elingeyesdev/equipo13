from fastapi import FastAPI, Depends
from .auth import auth_dependency

app = FastAPI(title="Inteligencia de Ventas")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml_service"}


# Endpoints protegidos (se implementan en fases siguientes). Ejemplo de stub:
@app.post("/scraping/run", dependencies=[Depends(auth_dependency)])
def scraping_run(payload: dict):
    # Implementado en Fase 1.
    return {"recibido": payload, "pendiente": "implementación en Fase 1"}
