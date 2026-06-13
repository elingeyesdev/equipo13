from .static_adapter import StaticAdapter
from .json_api_adapter import JsonApiAdapter
from .dynamic_adapter import DynamicAdapter
from .pdf_adapter import PdfAdapter

_ADAPTERS = {
    "static": StaticAdapter,
    "json_api": JsonApiAdapter,
    "js": DynamicAdapter,  # We use DynamicAdapter as JS adapter
    "dynamic": DynamicAdapter,
    "pdf": PdfAdapter,
}

def get_adapter(tipo: str):
    cls = _ADAPTERS.get(tipo)
    if not cls:
        raise ValueError(f"Tipo de fuente no soportado: {tipo}")
    return cls()
