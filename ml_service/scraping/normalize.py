def _limpiar(s: str) -> str:
    return " ".join(s.lower().strip().split())


def normalizar(nombre_crudo: str, alias_map: dict[str, str]) -> str | None:
    """alias_map: {alias_texto_en_minusculas: corte_canonico}.
    Match exacto primero; luego por inclusión del alias dentro del nombre crudo."""
    objetivo = _limpiar(nombre_crudo)
    if objetivo in alias_map:
        return alias_map[objetivo]
    for alias, canonico in alias_map.items():
        if alias and alias in objetivo:
            return canonico
    return None
