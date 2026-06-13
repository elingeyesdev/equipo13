from dataclasses import dataclass, asdict
from typing import Protocol


@dataclass
class PrecioScrapeado:
    nombre_crudo: str
    precio_kg: float
    canal: str
    raw: dict | None = None

    def to_dict(self) -> dict:
        return asdict(self)


class SourceAdapter(Protocol):
    """Cada fuente implementa fetch(config) y devuelve precios crudos."""
    def fetch(self, url: str, config: dict, canal: str) -> list[PrecioScrapeado]:
        ...
