import concurrent.futures
from .base import PrecioScrapeado, SourceAdapter
from .static_adapter import StaticAdapter
from .dynamic_adapter import DynamicAdapter

class ScrapingEngine:
    def __init__(self):
        self._adapters: dict[str, SourceAdapter] = {
            "static": StaticAdapter(),
            "dynamic": DynamicAdapter(),
        }

    def register_adapter(self, name: str, adapter: SourceAdapter):
        self._adapters[name] = adapter

    def run(self, sources: dict) -> list[PrecioScrapeado]:
        out = []
        # Ejecución en paralelo por fuente
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futuros = []
            for nombre, cfg in sources.items():
                adapter = self._adapters.get(cfg.get("type"))
                if not adapter:
                    continue
                futuros.append(
                    executor.submit(adapter.fetch, cfg["url"], cfg["config"], cfg.get("canal", "minorista"))
                )
            
            for f in concurrent.futures.as_completed(futuros):
                try:
                    res = f.result()
                    out.extend(res)
                except Exception as e:
                    print(f"Error en engine thread: {e}")
        return out
