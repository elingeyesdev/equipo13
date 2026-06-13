import pytest
from fastapi import HTTPException
from app.auth import verificar_token

def test_token_valido(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "ML_SERVICE_TOKEN", "secreto")
    # No lanza
    verificar_token("Bearer secreto")

def test_token_invalido(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "ML_SERVICE_TOKEN", "secreto")
    with pytest.raises(HTTPException):
        verificar_token("Bearer otro")

def test_token_ausente():
    with pytest.raises(HTTPException):
        verificar_token(None)
