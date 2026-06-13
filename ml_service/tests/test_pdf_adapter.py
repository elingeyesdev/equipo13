import os
import pytest
from scraping.pdf_adapter import PdfAdapter
from scraping.base import PrecioScrapeado

FIXTURE_PDF = os.path.join(os.path.dirname(__file__), "fixtures", "boletin_test.pdf")

def test_pdf_adapter_extrae_precios():
    """El adaptador debe leer la tabla del PDF y devolver PrecioScrapeado por cada fila de datos."""
    adapter = PdfAdapter()
    config = {
        "col_corte": 0,       # índice de columna con el nombre del corte
        "col_precio": 1,      # índice de columna con el precio
        "skip_rows": 1,       # filas de encabezado a ignorar
    }
    results = adapter.fetch(FIXTURE_PDF, config, canal="mayorista")

    assert len(results) == 2
    pierna = next(r for r in results if "Pierna" in r.nombre_crudo)
    assert pierna.precio_kg == pytest.approx(78.50)
    assert pierna.canal == "mayorista"

    costilla = next(r for r in results if "Costilla" in r.nombre_crudo)
    assert costilla.precio_kg == pytest.approx(65.00)
