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
BASE = {
    "Pierna": 52.0, "Paleta": 42.0, "Lomo": 55.0, "Costilla": 48.0, 
    "Panceta": 45.0, "Chuleta": 46.0, "Hueso/Carnaza": 25.0, 
    "Bondiola": 50.0, "Grasa": 15.0, "Cuero": 12.0, 
    "Recortes": 20.0, "Patas": 10.0
}
# Días de histórico por corte. >=365 dispara Prophet; el resto, Holt-Winters.
HISTORIAL = {"Pierna": 420, "Lomo": 420}
DIAS_DEFAULT = 90
TOPES = {"minorista": 150, "mayorista": 500}

# Parámetros del lote demo (Camino B). El peso canal de cada corte se DERIVA de
# estos números para que sea físicamente coherente con el lote, en vez de aleatorio.
CABEZAS_DEMO = 20
PESO_PROM_PIE = 95.0          # kg de peso vivo por cabeza al momento de faenar
RENDIMIENTO_CANAL = 0.75      # cerdo: ~75% del peso vivo queda como canal aprovechable
COSTO_ADQUISICION_DEMO = 28000.0
# Reparto del canal por corte (fracción del peso canal; debe sumar 1.0).
# Rendimientos de despiece porcino de la plantilla real.
RENDIMIENTO_CORTE = {
    "Pierna": 0.24, "Paleta": 0.16, "Lomo": 0.12, "Costilla": 0.10, "Panceta": 0.09,
    "Chuleta": 0.08, "Hueso/Carnaza": 0.05, "Bondiola": 0.04, "Grasa": 0.04, 
    "Cuero": 0.03, "Recortes": 0.03, "Patas": 0.02
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
