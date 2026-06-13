from scraping.dynamic_adapter import DynamicAdapter

def test_dynamic_adapter_interface(monkeypatch):
    class MockPage:
        def goto(self, url, wait_until): pass
        def wait_for_selector(self, sel, timeout=None): pass
        def query_selector_all(self, sel):
            class Element:
                def query_selector(self, s):
                    class Text:
                        def inner_text(self):
                            if s == ".n": return "Cerdo Fidalga"
                            return "Bs 50,00 x kg"
                    return Text()
            return [Element()]

    class MockBrowser:
        def new_page(self): return MockPage()
        def close(self): pass

    class MockPlaywright:
        @property
        def chromium(self):
            class Chrome:
                def launch(self, **kwargs): return MockBrowser()
            return Chrome()
        def __enter__(self): return self
        def __exit__(self, *args): pass

    monkeypatch.setattr("scraping.dynamic_adapter.sync_playwright", lambda: MockPlaywright())

    config = {
        "item_selector": ".card",
        "name_selector": ".n",
        "price_selector": ".p",
        "price_regex": r"Bs\s*([\d.,]+)\s*x\s*kg",
        "wait_for": ".card"
    }
    
    adapter = DynamicAdapter()
    res = adapter.fetch("http://x", config, "minorista")
    assert len(res) == 1
    assert res[0].nombre_crudo == "Cerdo Fidalga"
    assert res[0].precio_kg == 50.0
