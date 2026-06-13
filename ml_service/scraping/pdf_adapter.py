import re
from .base import PrecioScrapeado


def _parsear_precio(texto: str) -> float | None:
    """Extrae el primer número flotante de un texto."""
    if not texto:
        return None
    # Elimina separadores de miles y normaliza coma decimal
    cleaned = re.sub(r"[^\d,\.]", "", texto).replace(",", ".")
    # Si hay varios puntos (separadores de miles), toma solo el último segmento
    parts = cleaned.split(".")
    if len(parts) > 2:
        # "1.234.50" → solo tomar últimos dos tramos → "1234.50"
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    try:
        return float(cleaned)
    except ValueError:
        return None


class PdfAdapter:
    """Adaptador que extrae tablas de boletines de precios en formato PDF.

    Configuración esperada en `config`:
    - col_corte  (int): índice de columna que contiene el nombre del corte.
    - col_precio (int): índice de columna que contiene el precio kg.
    - skip_rows  (int, default=1): cuántas filas iniciales saltar (encabezados).
    """

    def fetch(self, url: str, config: dict, canal: str) -> list[PrecioScrapeado]:
        """Lee el PDF desde `url` (ruta local o URL http/https).

        Si `url` empieza por http, descarga el archivo primero.
        """
        # Import perezoso: pdfplumber es una dependencia opcional (solo para fuentes
        # 'pdf'); no debe romper la carga del servicio si no está instalada.
        import pdfplumber

        path = self._resolver_path(url)
        col_corte = config.get("col_corte", 0)
        col_precio = config.get("col_precio", 1)
        skip_rows = config.get("skip_rows", 1)

        out: list[PrecioScrapeado] = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for i, row in enumerate(table):
                        if i < skip_rows:
                            continue
                        if not row or len(row) <= max(col_corte, col_precio):
                            continue
                        nombre = (row[col_corte] or "").strip()
                        precio_txt = (row[col_precio] or "").strip()
                        precio = _parsear_precio(precio_txt)
                        if not nombre or precio is None:
                            continue
                        out.append(PrecioScrapeado(
                            nombre_crudo=nombre,
                            precio_kg=precio,
                            canal=canal,
                            raw={"row": row},
                        ))
        return out

    def _resolver_path(self, url: str) -> str:
        if url.startswith("http://") or url.startswith("https://"):
            import httpx, tempfile, os
            r = httpx.get(url, follow_redirects=True, timeout=30)
            r.raise_for_status()
            suffix = ".pdf"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            tmp.write(r.content)
            tmp.close()
            return tmp.name
        return url
