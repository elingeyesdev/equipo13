"""Siembra datos demo para el módulo de Inteligencia de Ventas (ML).

Genera histórico de precios para que el motor de pronóstico entrene de verdad:
  - Cortes con >=365 días  -> modelo Prophet (con métricas MAE/MAPE por backtesting)
  - Cortes con  <365 días  -> modelo Holt-Winters
Esto demuestra la SELECCIÓN AUTOMÁTICA de modelo según el volumen de datos.

También asegura cortes en el despiece (necesarios para las recomendaciones),
define topes de capacidad por canal y fuerza una alerta de precio para la demo.

Uso:
    python seed_demo.py                 # lista los negocios disponibles
    python seed_demo.py <NEGOCIO_ID>    # siembra datos para ese negocio

Idempotente: re-ejecutar borra el histórico sembrado previo (fuente_id IS NULL)
y lo regenera con la misma semilla, sin duplicar.
"""
import sys
import math
import random
import datetime as dt

from app.db import get_conn, fetch_all
import json as _json

# Fuentes de scraping reales (junio 2026). Ambas son Shopify y exponen products.json,
# que el adapter json_api ya parsea correctamente (campos title, price, grams, available).
# Config alineada con json_api_adapter.py (claves: products_path / title_key / price_path / grams_path).
# Para Shopify products.json el price y grams viven en la primera variant.
_SHOPIFY_PRODUCTS_JSON_CONFIG = {
    "products_path": "products",
    "title_key":     "title",
    "price_path":    "variants.0.price",
    "grams_path":    "variants.0.grams",
}

FUENTES_SCRAPING_SEED = [
    {
        "nombre": "Don Cerdo Bolivia",
        "url":    "https://doncerdobolivia.com/collections/cortes/products.json",
        "tipo":   "json_api",
        "canal":  "minorista",
        "config": _SHOPIFY_PRODUCTS_JSON_CONFIG,
    },
    {
        "nombre": "Amarket Cerdo",
        "url":    "https://amarket.com.bo/collections/cerdo/products.json",
        "tipo":   "json_api",
        "canal":  "minorista",
        "config": _SHOPIFY_PRODUCTS_JSON_CONFIG,
    },
]

# Alias para mapear títulos REALES del scraping a cortes canónicos. Substring
# match en minúsculas — el normalizador toma el primer alias que matchea.
ALIAS_COMERCIALES_SEED = [
    # Nombres anglo y comerciales que aparecen en Don Cerdo + Amarket
    ("pork belly", "Panceta"),   # premium boliviano de panceta
    ("ribs",       "Costilla"),
    ("rack",       "Costilla"),
    ("tomahawk",   "Lomo"),
    ("solomillo",  "Lomo"),
    ("matambre",   "Panceta"),   # matambre porcino viene de la panceta
    ("molida",     "Recortes"),  # "Carne molida de cerdo"
    ("colita",     "Recortes"),
]

CANALES = ("minorista", "mayorista")
FACTOR_MAYORISTA = 0.82
# Precio base minorista por corte (Bs/kg) — ajustá a la realidad boliviana.
BASE = {
    "Pierna":         38.0,  # Pierna entera 35.4, deshuesada 40
    "Paleta":         37.0,  # Paleta entera 34.2, deshuesada 38.9, chuleta 37
    "Lomo":           50.0,  # Don Cerdo 56.8, Chuleta 44, Amarket 65 → ~52
    "Costilla":       45.0,  # Costilla en tiras 45.8 (varias variantes)
    "Panceta":        63.0,  # Don Cerdo 60.6, Pork Belly 61.5, Amarket 76
    "Chuleta":        50.0,  # chuleta de lomo, se equipara al Lomo
    "Bondiola":       40.0,  # Bondiola carne 40, chuleta 39, Amarket 42.6
    "Hueso/Carnaza":  12.0,  # mercado: carnaza 10-15
    "Grasa":           6.0,  # subproducto bajo valor
    "Cuero":           8.0,  # para chicharrón
    "Recortes":       25.0,  # mejor que crudo, van a chorizo
    "Patas":          12.0,  # subproducto
}
# Días de histórico por corte. >=365 dispara Prophet; el resto, Holt-Winters.
HISTORIAL = {"Pierna": 420, "Lomo": 420}
DIAS_DEFAULT = 90
TOPES = {"minorista": 150, "mayorista": 500}

# Parámetros del lote demo (Camino B). El peso canal de cada corte se DERIVA de
# estos números para que sea físicamente coherente con el lote, en vez de aleatorio.
CABEZAS_DEMO = 20
PESO_PROM_PIE = 95.0          # kg de peso vivo por cabeza al momento de faenar
RENDIMIENTO_CANAL = 0.78      # cerdo: ~78% del peso vivo queda como canal aprovechable
COSTO_ADQUISICION_DEMO = 28000.0
# Reparto del canal por corte (fracción del peso canal; debe sumar 1.0).
# DEBE coincidir con el rendimiento_pct del catálogo (backend/seeds/
# catalogoCortesPorcino.js) y con CUTS en backend/scripts/seed_demo_completo.js,
# para que el despiece de la demo (Granja Olmos) y el despiece que crea este seed
# (Camino B, negocio sin despiece) cuenten la MISMA historia.
RENDIMIENTO_CORTE = {
    "Pierna":         0.24,   # corte primario premium, el más grande
    "Paleta":         0.16,   # corte primario popular (brazuelo)
    "Lomo":           0.12,   # primario premium (región del lomo)
    "Costilla":       0.10,   # corte primario popular (costillar)
    "Panceta":        0.09,   # tocino / pork belly
    "Chuleta":        0.08,   # lomo con hueso
    "Hueso/Carnaza":  0.05,   # estructura no vendible como filete
    "Bondiola":       0.04,   # premium chico (cabeza de lomo)
    "Grasa":          0.04,   # tocino crudo / manteca
    "Cuero":          0.03,   # para chicharrón
    "Recortes":       0.03,   # van a embutidos
    "Patas":          0.02,   # subproducto menor
}


def listar_negocios():
    return fetch_all("SELECT id::text, nombre, rubro FROM negocios ORDER BY created_at")


def cortes_del_negocio(negocio_id):
    rows = fetch_all(
        """SELECT DISTINCT dc.nombre FROM despiece_cortes dc
             JOIN lotes l ON l.id = dc.lote_id
            WHERE l.negocio_id = %s""",
        (negocio_id,),
    )
    return [r["nombre"] for r in rows]


def crear_lote_y_despiece(cur, negocio_id):
    """Camino B: si el negocio no tiene despiece, crea un lote demo + cortes.

    El peso de cada corte se DERIVA del lote (cabezas × peso vivo × rendimiento
    canal) y se reparte por el rendimiento de despiece de cada corte, de modo que
    el peso canal total sea físicamente coherente con el lote (no aleatorio)."""
    peso_canal_total = CABEZAS_DEMO * PESO_PROM_PIE * RENDIMIENTO_CANAL
    cur.execute(
        """INSERT INTO lotes (negocio_id, identificador, tipo_animal, cabezas_inicio,
                              cabezas_activas, peso_inicial_prom, peso_actual_prom, costo_adquisicion)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id::text""",
        (negocio_id, "LOTE-DEMO-ML", "porcino", CABEZAS_DEMO, CABEZAS_DEMO,
         25.0, PESO_PROM_PIE, COSTO_ADQUISICION_DEMO),
    )
    lote_id = cur.fetchone()["id"]
    for nombre, base in BASE.items():
        peso_kg = round(peso_canal_total * RENDIMIENTO_CORTE[nombre], 2)
        # costo_kg_derivado demo = 60% del precio base minorista (alimenta el margen del ML)
        cur.execute(
            """INSERT INTO despiece_cortes (lote_id, nombre, peso_kg, costo_kg_derivado)
               VALUES (%s, %s, %s, %s)""",
            (lote_id, nombre, peso_kg, round(base * 0.6, 2)),
        )
    return list(BASE)


def serie(base, dias):
    """Genera (fecha, precio) con tendencia leve + estacionalidad anual + ciclo semanal + ruido."""
    hoy = dt.date.today()
    for i in range(dias, -1, -1):
        fecha = hoy - dt.timedelta(days=i)
        t = dias - i
        tendencia = base * 0.0003 * t
        estacional = base * 0.06 * math.sin(2 * math.pi * t / 365)
        semanal = base * 0.02 * math.sin(2 * math.pi * t / 7)
        ruido = random.uniform(-base * 0.015, base * 0.015)
        precio = max(base * 0.5, base + tendencia + estacional + semanal + ruido)
        yield fecha, round(precio, 2)


def sembrar_fuentes_scraping(cur, negocio_id):
    """Inserta las dos fuentes reales (Don Cerdo + Amarket). Idempotente:
    borra cualquier fuente con el mismo nombre antes de insertar, así re-correr
    el seed actualiza la config sin duplicar (la tabla no tiene UNIQUE)."""
    for f in FUENTES_SCRAPING_SEED:
        cur.execute(
            "DELETE FROM fuentes_scraping WHERE negocio_id = %s AND nombre = %s",
            (negocio_id, f["nombre"]),
        )
        cur.execute(
            """INSERT INTO fuentes_scraping
                 (negocio_id, nombre, url, tipo, canal, config, activo)
               VALUES (%s, %s, %s, %s, %s, %s, TRUE)""",
            (negocio_id, f["nombre"], f["url"], f["tipo"], f["canal"],
             _json.dumps(f["config"])),
        )


def sembrar_alias_comerciales(cur, negocio_id):
    """Inserta los alias de nombres comerciales (Pork Belly, Tomahawk, etc.) que
    aparecen en Don Cerdo y Amarket. Idempotente con ON CONFLICT."""
    for alias, canonico in ALIAS_COMERCIALES_SEED:
        cur.execute(
            """INSERT INTO corte_alias (negocio_id, alias_texto, corte_canonico)
               VALUES (%s, %s, %s)
               ON CONFLICT (negocio_id, alias_texto)
               DO UPDATE SET corte_canonico = EXCLUDED.corte_canonico""",
            (negocio_id, alias, canonico),
        )


def main():
    if len(sys.argv) < 2:
        print("Negocios disponibles (pasá el ID como argumento):\n")
        for n in listar_negocios():
            print(f"  {n['id']}  {n['nombre']}  ({n.get('rubro')})")
        print("\nUso: python seed_demo.py <NEGOCIO_ID>")
        return

    negocio_id = sys.argv[1]
    if negocio_id not in {n["id"] for n in listar_negocios()}:
        print(f"ERROR: no existe un negocio con id {negocio_id}. Corré sin argumentos para ver la lista.")
        sys.exit(1)

    random.seed(42)  # reproducible para la defensa
    with get_conn() as conn, conn.cursor() as cur:
        cortes = cortes_del_negocio(negocio_id)
        if not cortes:
            print("El negocio no tiene despiece; creando lote + cortes demo (Camino B)...")
            cortes = crear_lote_y_despiece(cur, negocio_id)

        # Idempotencia: limpiar histórico sembrado previo (datos sintéticos, sin fuente).
        cur.execute(
            "DELETE FROM precio_mercado_historico WHERE negocio_id = %s AND fuente_id IS NULL",
            (negocio_id,),
        )

        total = 0
        for corte in cortes:
            base = BASE.get(corte, 60.0)
            dias = HISTORIAL.get(corte, DIAS_DEFAULT)
            for canal in CANALES:
                factor = 1.0 if canal == "minorista" else FACTOR_MAYORISTA
                puntos = list(serie(base * factor, dias))
                # Forzar una alerta vistosa: +15% en el último precio de Pierna/minorista.
                if corte == "Pierna" and canal == "minorista":
                    f, p = puntos[-1]
                    puntos[-1] = (f, round(p * 1.15, 2))
                for fecha, precio in puntos:
                    cur.execute(
                        """INSERT INTO precio_mercado_historico
                             (negocio_id, fuente_id, corte_canonico, canal, precio_kg, fecha)
                           VALUES (%s, NULL, %s, %s, %s, %s)""",
                        (negocio_id, corte, canal, precio, fecha),
                    )
                    total += 1

        # Fuentes reales de scraping (Don Cerdo + Amarket) + alias comerciales
        sembrar_fuentes_scraping(cur, negocio_id)
        sembrar_alias_comerciales(cur, negocio_id)

        for canal, kg in TOPES.items():
            cur.execute(
                """INSERT INTO tope_canal (negocio_id, canal, kg_max_semana)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (negocio_id, canal) DO UPDATE SET kg_max_semana = EXCLUDED.kg_max_semana""",
                (negocio_id, canal, kg),
            )

    prophet = [c for c in cortes if HISTORIAL.get(c, DIAS_DEFAULT) >= 365]
    print(f"Seed listo: {len(cortes)} cortes × {len(CANALES)} canales, {total} filas de histórico.")
    print(f"  Prophet (>=365 días): {', '.join(prophet) or '—'}")
    print(f"  Holt-Winters (<365): {', '.join(c for c in cortes if c not in prophet)}")
    print("  Topes de canal definidos. Alerta forzada en Pierna/minorista (+15%).")
    print(f"  Fuentes de scraping sembradas: {len(FUENTES_SCRAPING_SEED)} (Don Cerdo + Amarket).")
    print(f"  Alias comerciales sembrados: {len(ALIAS_COMERCIALES_SEED)} (pork belly, tomahawk, etc.).")
    print("\nSiguiente: POST /recomendaciones/generar y POST /alertas/recalcular para este negocio.")


if __name__ == "__main__":
    main()
