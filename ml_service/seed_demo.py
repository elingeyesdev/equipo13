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

CANALES = ("minorista", "mayorista")
FACTOR_MAYORISTA = 0.82
# Precio base minorista por corte (Bs/kg) — ajustá a la realidad boliviana.
BASE = {"Pierna": 78.0, "Chorizo": 52.0, "Costilla": 60.0, "Paleta": 45.0, "Lomo": 95.0}
# Días de histórico por corte. >=365 dispara Prophet; el resto, Holt-Winters.
HISTORIAL = {"Pierna": 420, "Lomo": 420}
DIAS_DEFAULT = 90
TOPES = {"minorista": 150, "mayorista": 500}


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
    """Camino B: si el negocio no tiene despiece, crea un lote demo + cortes."""
    cur.execute(
        """INSERT INTO lotes (negocio_id, identificador, tipo_animal, cabezas_inicio,
                              cabezas_activas, peso_inicial_prom, peso_actual_prom, costo_adquisicion)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id::text""",
        (negocio_id, "LOTE-DEMO-ML", "porcino", 20, 20, 25.0, 95.0, 28000.0),
    )
    lote_id = cur.fetchone()["id"]
    for nombre, base in BASE.items():
        # costo_kg_derivado demo = 60% del precio base minorista
        cur.execute(
            """INSERT INTO despiece_cortes (lote_id, nombre, peso_kg, costo_kg_derivado)
               VALUES (%s, %s, %s, %s)""",
            (lote_id, nombre, round(random.uniform(40, 120), 2), round(base * 0.6, 2)),
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
    print("\nSiguiente: POST /recomendaciones/generar y POST /alertas/recalcular para este negocio.")


if __name__ == "__main__":
    main()
