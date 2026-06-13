from playwright.sync_api import sync_playwright
from .base import PrecioScrapeado
from .static_adapter import _parsear_precio

class DynamicAdapter:
    def fetch(self, url: str, config: dict, canal: str) -> list[PrecioScrapeado]:
        out = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(url, wait_until="networkidle")
                if "wait_for" in config:
                    page.wait_for_selector(config["wait_for"], timeout=10000)
                
                elementos = page.query_selector_all(config["item_selector"])
                for item in elementos:
                    name_el = item.query_selector(config["name_selector"])
                    price_el = item.query_selector(config["price_selector"])
                    
                    if not name_el or not price_el:
                        continue
                        
                    name_text = name_el.inner_text().strip()
                    price_text = price_el.inner_text().strip()
                    precio = _parsear_precio(price_text, config["price_regex"])
                    
                    if precio is not None:
                        out.append(PrecioScrapeado(
                            nombre_crudo=name_text,
                            precio_kg=precio,
                            canal=canal,
                            raw={"price_text": price_text}
                        ))
            except Exception as e:
                print(f"Error scraping dinamico en {url}: {e}")
            finally:
                browser.close()
                
        return out
