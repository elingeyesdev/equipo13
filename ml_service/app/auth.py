from fastapi import HTTPException, Header
from .config import settings


def verificar_token(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ", 1)[1]
    if not settings.ML_SERVICE_TOKEN or token != settings.ML_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Token inválido")


def auth_dependency(authorization: str | None = Header(default=None)) -> None:
    verificar_token(authorization)
