from .static_adapter import StaticAdapter
from .dynamic_adapter import DynamicAdapter

_ADAPTERS = {
    "static": StaticAdapter,
    "js": DynamicAdapter,  # We use DynamicAdapter as JS adapter
    "dynamic": DynamicAdapter,
}

def get_adapter(tipo: str):
    cls = _ADAPTERS.get(tipo)
    if not cls:
        raise ValueError(f"Tipo de fuente no soportado: {tipo}")
    return cls()
