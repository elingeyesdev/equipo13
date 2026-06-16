# Plan de Implementación — Machine Learning + Web Scraping (Demo funcional)

> **Objetivo:** dejar el módulo de *Inteligencia de Ventas* (scraping de precios → pronóstico ML → recomendaciones de venta + alertas) **funcionando end-to-end en una demo** para cerrar el 50% restante del proyecto.
>
> **Modo entrega:** demo funcionando (no se requiere documento de investigación formal).
> **Datos para la demo:** seed histórico + al menos una fuente real de scraping (supermercado boliviano: IC Norte / Fidalga).
> **Plazo:** esta semana. Esfuerzo estimado: **~1.5 – 2 días** de trabajo enfocado.
> **Fecha del plan:** 2026-06-14

---

## 0. TL;DR — qué pasa y qué hay que hacer

El Machine Learning **ya está construido y probado** (30 tests unitarios en verde). NO hay que escribir los algoritmos. El módulo "no funciona" por **3 huecos de integración**, no de lógica:

1. El microservicio Python (`ml_service`) **no está en `docker-compose`** → nunca arranca.
2. **No hay datos históricos** → el pronóstico cae siempre al modo "fallback" en lugar de Prophet/Holt-Winters.
3. **No hay fuentes reales de scraping configuradas** → el pipeline de extracción no tiene de dónde leer.

El plan corrige esos 3 puntos + 1 bug visual menor, siembra datos para que el ML "luzca", conecta 1 supermercado real, y deja un guion de demo reproducible.

---

## 1. Lo que YA está implementado (inventario — esto es tu evidencia ante el docente)

### 1.1 Microservicio `ml_service/` (FastAPI + Python)

| Componente | Archivo | Qué hace | Estado |
|---|---|---|---|
| API HTTP | `app/main.py` | Endpoints `/health`, `/scraping/run`, `/recomendaciones/generar`, `/alertas/precios` con auth por token. | ✅ |
| Auth server-to-server | `app/auth.py` | Bearer token compartido con el backend. | ✅ |
| Conexión BD | `app/db.py`, `app/config.py` | `psycopg` 3 contra la misma PostgreSQL del backend. | ✅ |
| **Scraping — adaptadores** | `scraping/static_adapter.py` (BeautifulSoup), `json_api_adapter.py`, `dynamic_adapter.py` (Playwright), `pdf_adapter.py` (pdfplumber) | 4 estrategias de extracción según el tipo de fuente. | ✅ |
| Normalización | `scraping/normalize.py` | Mapea nombres crudos ("Pierna de Cerdo Frigor") → corte canónico ("Pierna") vía alias. | ✅ |
| Orquestador | `scraping/runner.py`, `registry.py`, `repo.py` | Corre todas las fuentes, persiste filas, registra `scrape_run` (observabilidad). | ✅ |
| Scheduler | `scheduler.py` (APScheduler) | Scraping automático diario 05:00 (America/La_Paz) + detección de alertas. | ✅ |
| **ML — features** | `ml/features.py` | Construye series temporales por (corte, canal). | ✅ |
| **ML — pronóstico** | `ml/forecast.py` | **Prophet** (estacional, N≥365, con métricas **MAE/MAPE** por backtesting), **Holt-Winters** (N≥21), fallback lineal. Decide tendencia (sube/baja/estable) y acción (vender_ahora/esperar). | ✅ |
| **ML — recomendación** | `ml/recommend.py` | Elige canal de mayor margen por corte; enriquece con el pronóstico. | ✅ |
| **ML — optimización** | `ml/optimize.py` | Asignación *greedy* de kilos a canales respetando topes de capacidad. | ✅ |
| **ML — alertas** | `ml/alertas.py` | Detecta variaciones de precio ±10% vs. promedio histórico. | ✅ |
| Tests | `tests/` (19 archivos) | **30 tests, todos pasan** (`pytest`). | ✅ |

### 1.2 Integración en el backend Node (`backend/`)

| Componente | Archivo | Estado |
|---|---|---|
| Cliente HTTP al ML | `src/services/mlClient.js` | ✅ |
| Controller proxy + CRUD | `src/controllers/ventasMlController.js` | ✅ |
| Rutas montadas (`requireMembership('admin')`) | `src/routes/negocio.js` líneas 313-324 | ✅ |
| Migraciones de tablas | `020_inteligencia_ventas.sql`, `021_tope_canal.sql`, `022_alerta_precio.sql` | ✅ |

### 1.3 Frontend (`frontend/`)

| Página | Archivo | Estado |
|---|---|---|
| Fuentes de datos + ejecutar scraping + historial de corridas + alias | `src/pages/agro/FuentesDatos.jsx` | ✅ (completa) |
| Recomendaciones de venta + tabla + export CSV/PDF + panel de alertas | `src/pages/agro/RecomendacionesVenta.jsx` | ✅ (1 bug menor, ver Fase 4) |

> **Resumen:** ~90% del módulo está hecho. El trabajo restante es *wiring*, *datos* y *pulido*, no algoritmia.

---

## 2. Arquitectura del flujo (cómo se conecta todo)

```
   ┌────────────┐   HTTP (Bearer token)   ┌─────────────────────┐
   │  Frontend  │ ───────────────────────►│   Backend Node      │
   │  React/Vite│                          │   (Express, :3000)  │
   └────────────┘                          └─────────┬───────────┘
        ▲                                            │ proxy server-to-server
        │ JSON                                       │ (mlClient.js, :8001)
        │                                            ▼
        │                              ┌──────────────────────────┐
        │                              │   ml_service (FastAPI)    │
        │                              │  ┌─────────┐ ┌──────────┐ │
        │                              │  │ Scraping│ │   ML     │ │
        │                              │  │ 4 adapt.│ │ forecast │ │
        │                              │  └────┬────┘ └────┬─────┘ │
        │                              └───────┼───────────┼───────┘
        │                                      │           │
        │                                      ▼           ▼
        │                              ┌────────────────────────────┐
        └──────────────────────────── │   PostgreSQL (:5432)        │
                                       │  fuentes_scraping,          │
                                       │  precio_mercado_historico,  │
                                       │  recomendacion_*, alerta_*  │
                                       └────────────────────────────┘
                                       Sitios reales (IC Norte / Fidalga) ─┐
                                                                            ▼
                                                          (scraping adapters httpx/Playwright)
```

**Pipeline de ML (al pedir recomendaciones):**
`precio_mercado_historico` → `construir_series` → `pronosticar` (Prophet/HW/fallback) → `recomendar_heuristico` → `enriquecer_con_forecast` → `asignar_volumenes_con_topes` → guarda `recomendacion_venta`/`recomendacion_item`.

---

## 3. Causa raíz — por qué "no funciona" hoy

| # | Síntoma observable | Causa real | Fase que lo arregla |
|---|---|---|---|
| 1 | Recomendaciones/alertas → error o vacío | `ml_service` ausente en `docker-compose`; backend apunta a `localhost:8001` (no resuelve en red Docker); faltan `ML_SERVICE_URL` y `ML_SERVICE_TOKEN`. | **Fase 1** |
| 2 | El ML "no predice" (siempre `modo: heuristico`) | Sin histórico: Prophet exige ≥365 días, Holt-Winters ≥21; scraping fresco da 1 dato/día → fallback (confianza 0.3). | **Fase 2** |
| 3 | "El scraping no funciona" | Cero fuentes reales en `fuentes_scraping`; los adaptadores solo se probaron contra fixtures. | **Fase 3** |
| 4 | Las flechas de tendencia nunca aparecen | `RecomendacionesVenta.jsx` compara `tendencia === 'sube'/'baja'`, pero el ML devuelve `'subiendo'/'bajando'/'estable'`. | **Fase 4** |
| 5 | Las alertas no se ven en demo on-demand | Las alertas solo se generan en el cron de las 05:00 (`scheduler.py`); no hay forma de recalcularlas al instante. | **Fase 2/4** |

---

## 4. Plan por fases

> Cada fase termina con un **criterio de verificación concreto**. No avances a la siguiente sin cumplirlo.

### Fase 0 — Línea base (≈30 min)

**Meta:** confirmar el punto de partida y que el ML corre aislado.

- [ ] Levantar el stack actual: `docker compose up -d --build` y abrir http://localhost:5173.
- [ ] Correr los tests del ML (deberían pasar 30/30):
  ```powershell
  cd ml_service
  .\.venv\Scripts\python.exe -m pytest -q
  ```
- [ ] Arrancar `ml_service` solo y verificar salud (en otra terminal):
  ```powershell
  cd ml_service
  $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/equipo13"
  $env:ML_SERVICE_TOKEN="token-demo"
  $env:ENABLE_SCHEDULER="false"
  .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
  # En otra terminal:  curl http://localhost:8001/health
  ```

**✅ Verificación:** `/health` responde `{"status":"ok"}` y los tests pasan.

---

### Fase 1 — Conectar `ml_service` al stack (≈1–2 h) — **bloqueante**

**Meta:** que el backend hable con el ML dentro de Docker.

**1.1 Agregar el servicio al `docker-compose.yml`:**
```yaml
  ml_service:
    build:
      context: ./ml_service
      dockerfile: Dockerfile
    container_name: equipo13-ml
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@db:5432/${POSTGRES_DB:-equipo13}
      ML_SERVICE_TOKEN: ${ML_SERVICE_TOKEN:-token-demo-larga}
      ENABLE_SCHEDULER: "false"   # demo: scraping manual. Poner "true" para el cron diario 05:00.
      PORT: 8001
    ports:
      - "${ML_PORT:-8001}:8001"
    volumes:
      - ./ml_service:/app
```

**1.2 Añadir variables al servicio `backend` (en `docker-compose.yml`):**
```yaml
    environment:
      # ...lo existente...
      ML_SERVICE_URL: http://ml_service:8001     # nombre del servicio en la red Docker, NO localhost
      ML_SERVICE_TOKEN: ${ML_SERVICE_TOKEN:-token-demo-larga}
```

**1.3 Documentar las variables en `.env.docker.example`:**
```dotenv
# --- ML service ---
ML_PORT=8001
ML_SERVICE_TOKEN=pon-aqui-un-token-largo-y-secreto
```
> ⚠️ El **mismo** `ML_SERVICE_TOKEN` debe quedar en backend y en ml_service, o el backend recibirá 401.

**1.4 Reconstruir:**
```powershell
Copy-Item .env.docker.example .env   # si aún no existe; edita el token
docker compose up -d --build
```

**✅ Verificación:**
- `docker compose ps` muestra `equipo13-ml` *Up*.
- Desde el contenedor backend: `docker compose exec backend wget -qO- http://ml_service:8001/health` → `{"status":"ok"}`.
- En la UI, la página *Recomendaciones de venta* ya no da error de red (mostrará "No hay datos suficientes" hasta la Fase 2 — eso es correcto).

---

### Fase 2 — Sembrar datos históricos (≈2–3 h) — **bloqueante para que el ML "luzca"**

**Meta:** que `/recomendaciones/generar` devuelva `modo: "forecast"` con métricas reales y que haya alertas.

**Prerrequisito de datos:** las recomendaciones leen los cortes disponibles de `despiece_cortes ⋈ lotes` (ver `ml/repo.py::cargar_cortes_disponibles`). Hay dos caminos:

- **Camino A (recomendado, más "real"):** en la UI, crear un negocio **agro** demo → 1 lote → registrar un **despiece** con cortes (Pierna, Chorizo, Costilla, Paleta, Lomo). Esto genera `despiece_cortes` con `costo_kg_derivado` reales heredados del lote.
- **Camino B (rápido):** el script de seed crea un lote mínimo + `despiece_cortes` si el negocio no tiene ninguno.

**2.1 Script de seed `ml_service/seed_demo.py`** (esqueleto — genera serie con tendencia + estacionalidad + ruido):
```python
"""Uso: python seed_demo.py <NEGOCIO_ID>
Siembra ~400 días de precios históricos para que Prophet entrene y reporte MAE/MAPE."""
import sys, math, random, datetime as dt
from app.db import get_conn, fetch_all

NEGOCIO = sys.argv[1]
DIAS = 400
CANALES = ["minorista", "mayorista"]
# Precio base por corte (Bs/kg) — ajustar a la realidad boliviana
BASE = {"Pierna": 78.0, "Chorizo": 52.0, "Costilla": 60.0, "Paleta": 45.0, "Lomo": 95.0}

def cortes_del_negocio():
    rows = fetch_all(
        """SELECT DISTINCT dc.nombre FROM despiece_cortes dc
             JOIN lotes l ON l.id = dc.lote_id WHERE l.negocio_id = %s""", (NEGOCIO,))
    return [r["nombre"] for r in rows]

def serie(base):
    hoy = dt.date.today()
    for i in range(DIAS, -1, -1):
        fecha = hoy - dt.timedelta(days=i)
        t = (DIAS - i)
        tendencia = base * 0.0003 * t                       # leve subida anual
        estacional = base * 0.06 * math.sin(2*math.pi*t/365) # estacionalidad anual
        semanal   = base * 0.02 * math.sin(2*math.pi*t/7)    # ciclo semanal
        ruido = random.uniform(-base*0.015, base*0.015)
        yield fecha, round(max(base*0.5, base + tendencia + estacional + semanal + ruido), 2)

def main():
    cortes = cortes_del_negocio() or list(BASE)   # fallback a la lista por defecto
    with get_conn() as conn, conn.cursor() as cur:
        for corte in cortes:
            base = BASE.get(corte, 60.0)
            for canal in CANALES:
                factor = 1.0 if canal == "minorista" else 0.82   # mayorista más barato
                for fecha, precio in serie(base*factor):
                    cur.execute(
                        """INSERT INTO precio_mercado_historico
                             (negocio_id, fuente_id, corte_canonico, canal, precio_kg, fecha)
                           VALUES (%s, NULL, %s, %s, %s, %s)
                           ON CONFLICT (negocio_id, fuente_id, corte_canonico, canal, fecha)
                           DO NOTHING""",
                        (NEGOCIO, corte, canal, precio, fecha))
        # Topes de capacidad por canal (para que la optimización reparta)
        for canal, kg in (("minorista", 150), ("mayorista", 500)):
            cur.execute("""INSERT INTO tope_canal (negocio_id, canal, kg_max_semana)
                           VALUES (%s,%s,%s) ON CONFLICT (negocio_id, canal)
                           DO UPDATE SET kg_max_semana = EXCLUDED.kg_max_semana""",
                        (NEGOCIO, canal, kg))
    print(f"Seed listo para {len(cortes)} cortes × {len(CANALES)} canales.")

if __name__ == "__main__":
    main()
```
> ⚠️ `precio_mercado_historico.fuente_id` es nullable: el seed lo deja `NULL` (datos sintéticos, no provienen de scraping). Está bien para el histórico de entrenamiento.

> **Nota Camino B:** si `cortes_del_negocio()` viene vacío, además de usar la lista por defecto, inserta un `lotes` mínimo + filas en `despiece_cortes` (columnas: `lote_id, nombre, peso_kg, costo_kg_derivado`) con esos mismos nombres y un `costo_kg_derivado` (p. ej. 60% del precio base) para que las recomendaciones tengan kilos y margen que mostrar.

**2.2 Ejecutar el seed** (con el `NEGOCIO_ID` del negocio demo — se ve en la URL o en la tabla `negocios`):
```powershell
docker compose exec ml_service python seed_demo.py <NEGOCIO_ID>
```

**2.3 (Mejora pequeña y justificada) Endpoint para recalcular alertas on-demand.**
Hoy las alertas solo se calculan en el cron de las 05:00. Para mostrarlas en la demo sin esperar, añadir en `app/main.py` un endpoint que reutiliza la lógica existente:
```python
from ml.alertas import detectar_alertas_precio, guardar_alertas

@app.post("/alertas/recalcular", dependencies=[Depends(auth_dependency)])
def recalcular_alertas(payload: ScrapingRequest):
    precios = cargar_precios_recientes(payload.negocio_id)
    alertas = detectar_alertas_precio(precios)
    guardar_alertas(payload.negocio_id, alertas)
    return {"alertas_generadas": len(alertas)}
```
(Opcional: exponerlo por el backend como `POST /:negocioId/alertas-precio/recalcular`.) Para forzar una alerta vistosa en la demo, el seed puede subir el último precio de 1–2 cortes +15%.

**✅ Verificación:**
```powershell
# Token = ML_SERVICE_TOKEN
curl -X POST http://localhost:8001/recomendaciones/generar `
  -H "Authorization: Bearer token-demo-larga" -H "Content-Type: application/json" `
  -d '{\"negocio_id\":\"<NEGOCIO_ID>\",\"horizonte_dias\":7}'
```
- La respuesta trae `"modo": "forecast"` y los `items` tienen `tendencia`, `accion`, `precio_pronosticado`, `confianza` no nulos.
- En la tabla `modelo_forecast_meta` aparece `modelo = 'prophet'` con `metricas` que incluyen `mae`/`mape` (al menos para los cortes con ≥365 puntos).
- En la UI, *Recomendaciones de venta* muestra la tabla poblada y el badge "Pronóstico ML".

---

### Fase 3 — Scraping de una fuente real (≈2–3 h)

**Meta:** demostrar el pipeline de extracción contra un supermercado boliviano real (IC Norte / Fidalga), insertando precios del día reales en `precio_mercado_historico`.

> El histórico para el ML viene del seed (Fase 2). El scraping real **aporta el dato del día** y prueba que el pipeline funciona en vivo — ambos conviven (es justamente la opción "Ambos" elegida).

**3.1 Inspeccionar el sitio elegido** (con el navegador, F12):
- **Opción HTML estático (IC Norte, tipo `static`):** ubica el selector del contenedor de producto, del nombre y del precio. El fixture de referencia (`tests/fixtures/icnorte_sample.html`) usa `.product-card / .product-name / .product-price`; **verifica los selectores reales del sitio en vivo** (los sitios cambian).
  ```json
  {
    "item_selector": ".product-card",
    "name_selector": ".product-name",
    "price_selector": ".product-price",
    "price_regex": "([0-9][0-9.,]*)"
  }
  ```
- **Opción JSON API (Fidalga u otra tienda tipo Shopify/VTEX, tipo `json_api`):** si el sitio expone un endpoint JSON de productos (p. ej. `/products.json`), es **mucho más robusto**. Config de referencia (ver `tests/fixtures/fidalga_products.json`):
  ```json
  {
    "products_path": "products",
    "title_key": "title",
    "price_path": "variants.0.price",
    "grams_path": "variants.0.grams"
  }
  ```
- Si el sitio carga precios por JavaScript → tipo `js` (usa Playwright, ya instalado en la imagen Docker del ML).

**3.2 Cargar la fuente** desde la UI (*Fuentes de datos → Agregar*) o por SQL: nombre, URL real, tipo, canal, y el JSON de config de arriba.

**3.3 Cargar los alias** (UI: *Alias de cortes*) para mapear los nombres del sitio → cortes canónicos. Ej.: `pierna de cerdo frigor → Pierna`, `chorizo parrillero sofia → Chorizo`. (La normalización hace match exacto y por inclusión, en minúsculas.)

**3.4 Ejecutar el scraping:** botón *"Ejecutar scraping ahora"* en *Fuentes de datos*, o:
```powershell
curl -X POST http://localhost:3000/api/negocios/<NEGOCIO_ID>/scraping/run `
  -H "Authorization: Bearer <JWT_DEL_USUARIO>"
```

**✅ Verificación:**
- En *Fuentes de datos → Historial de corridas*: una corrida con estado **OK** y `filas_insertadas > 0`.
- En `precio_mercado_historico` hay filas de hoy con `fuente_id` = la fuente real.
- Si falla por selectores/anti-bot → ver **§5 Riesgos / Plan B**.

---

### Fase 4 — Arreglos de frontend y pulido (≈1 h)

**4.1 Bug de tendencia (`frontend/src/pages/agro/RecomendacionesVenta.jsx`, ~línea 102):**
El ML devuelve `'subiendo' | 'bajando' | 'estable'`, pero la UI compara con `'sube'/'up'` y `'baja'/'down'`. Corregir el mapeo:
```jsx
const tend = (it.tendencia === 'subiendo' || it.tendencia === 'sube' || it.tendencia === 'up')
  ? { icon: 'arrowUp', color: 'var(--accent-success)' }
  : (it.tendencia === 'bajando' || it.tendencia === 'baja' || it.tendencia === 'down')
    ? { icon: 'arrowDown', color: 'var(--accent-danger)' }
    : null;
```

**4.2 (Opcional) Mostrar `precio_pronosticado` y `confianza`** como columnas/tooltip en la tabla — refuerza visualmente que hay ML detrás.

**4.3 Validar `FuentesDatos.jsx` end-to-end:** crear fuente → correr scraping → ver corrida OK e histórico. (La página ya está completa; solo confirmar que todo conecta tras la Fase 1.)

**✅ Verificación:** las flechas de tendencia aparecen junto a cada recomendación y los colores corresponden (verde sube / rojo baja).

---

### Fase 5 — Guion de demo + smoke test (≈1 h)

**5.1 Script de smoke test** `verificar_demo.ps1` (o lista manual) que recorra: `/health` del ML → recomendaciones `forecast` → scrape run OK → alertas. Sirve para no improvisar el día de la defensa.

**5.2 Guion de demo (ver §6).** Ensayarlo una vez completo.

**✅ Verificación:** correr el smoke test de principio a fin sin errores, con el stack recién levantado (`docker compose down && docker compose up -d`).

---

## 5. Riesgos y planes B

| Riesgo | Mitigación / Plan B |
|---|---|
| El sitio real cambia selectores o bloquea el bot (anti-scraping) | (a) Cambiar a la fuente JSON API (más estable). (b) Usar el adaptador `pdf` con un **boletín de precios** oficial (SEDEM/alcaldía) — ya soportado. (c) **Último recurso para la demo:** servir el HTML de muestra (`tests/fixtures/icnorte_sample.html`) desde un archivo/URL local y apuntar la fuente ahí — el pipeline real corre igual. |
| Prophet tarda varios segundos con 365+ puntos × varias series | Sembrar ≥365 días solo para 2–3 cortes clave (Prophet) y menos para el resto (Holt-Winters). La primera carga de recomendaciones puede tomar ~5–15 s; pre-cargarla antes de la demo. |
| `docker compose` no levanta `ml_service` (build de Playwright pesado) | La imagen base `playwright/python` es grande; correr `docker compose build ml_service` con anticipación (no en vivo). Alternativa: correr el ML local con `uvicorn` (Fase 0) y apuntar `ML_SERVICE_URL=http://host.docker.internal:8001`. |
| Token desincronizado → 401 entre backend y ML | Definir `ML_SERVICE_TOKEN` una sola vez en `.env` y referenciarlo en ambos servicios. |
| Race: ML arranca antes de que el backend corra migraciones | Las tablas las crea el backend al iniciar; el ML solo se invoca on-demand (después). Para la demo no hay carrera real. Si se ejecutan tests/seed muy temprano, esperar a que backend loguee "migraciones OK". |

---

## 6. Guion de demo para la defensa (5–7 min)

1. **Contexto (30 s):** "El sistema costea cortes; este módulo decide *qué corte vender, en qué canal y cuándo*, usando precios de mercado y Machine Learning."
2. **Fuentes de datos (1 min):** mostrar *Fuentes de datos*, la fuente real cargada y los alias. Clic en **"Ejecutar scraping ahora"** → aparece una corrida **OK** con N filas. *"Acabamos de traer precios reales de [IC Norte/Fidalga] en vivo."*
3. **El ML (2 min):** ir a *Recomendaciones de venta*. Señalar el badge **"Pronóstico ML"**, la columna de **tendencia** (flechas), la **acción** (vender/esperar) y el **margen**. Explicar: *"El histórico alimenta un modelo Prophet/Holt-Winters que pronostica el precio a 7 días; si va a subir, recomienda esperar."*
4. **Métricas (1 min):** mostrar `modelo_forecast_meta` (o un panel) con **MAE/MAPE** → *"el modelo se auto-evalúa con backtesting."*
5. **Alertas (30 s):** mostrar el panel de **alertas de cambio de precio** (±10%).
6. **Cierre técnico (1 min):** el diagrama de §2 — *"investigación aplicada de ML: scraping multi-fuente, series temporales, modelos de pronóstico con selección automática según volumen de datos, y optimización con restricciones."*

---

## 7. Cómo defender esto como "investigación de Machine Learning"

Aunque la entrega es una demo, conviene tener el discurso listo. Técnicas de ML/IA efectivamente implementadas:

- **Series temporales y pronóstico:** Prophet (modelo aditivo con estacionalidad) y Holt-Winters (suavizado exponencial); **selección automática de modelo** según el tamaño de la muestra (≥365 → Prophet; ≥21 → Holt-Winters; si no, fallback).
- **Evaluación de modelos:** *backtesting* con partición train/test y métricas **MAE** y **MAPE** → cuantifica el error del pronóstico.
- **Sistema de recomendación:** heurística de maximización de margen enriquecida con el pronóstico (decisión vender/esperar).
- **Optimización con restricciones:** asignación *greedy* de volumen a canales sujeta a topes de capacidad.
- **Detección de anomalías:** alertas por desviación porcentual sobre el promedio histórico.
- **Adquisición de datos (data engineering):** scraping multi-estrategia (HTML estático, JSON API, render JS con Playwright, PDF) + normalización de entidades (alias → corte canónico).

---

## 8. Checklist final (orden de ejecución)

- [ ] **F0** Stack arriba, `pytest` 30/30, `/health` del ML OK.
- [ ] **F1** `ml_service` en docker-compose + `ML_SERVICE_URL`/`ML_SERVICE_TOKEN` (backend y ML) + `.env.docker.example`. Backend alcanza `http://ml_service:8001/health`.
- [ ] **F2** Negocio agro demo con lote + despiece; `seed_demo.py` ejecutado; `/recomendaciones/generar` → `modo: forecast` con MAE/MAPE; endpoint `/alertas/recalcular` añadido.
- [ ] **F3** Fuente real cargada + alias; "Ejecutar scraping" → corrida OK con filas reales.
- [ ] **F4** Bug de tendencia corregido; flechas visibles; páginas validadas.
- [ ] **F5** Smoke test verde tras `docker compose down && up`; guion de demo ensayado.

---

## 9. Archivos que se tocan o se crean

| Acción | Archivo |
|---|---|
| **Editar** | `docker-compose.yml` (servicio `ml_service` + env del backend) |
| **Editar** | `.env.docker.example` (vars del ML) |
| **Editar** | `ml_service/app/main.py` (endpoint `/alertas/recalcular` — mejora pequeña) |
| **Editar** | `frontend/src/pages/agro/RecomendacionesVenta.jsx` (bug de tendencia) |
| **Crear** | `ml_service/seed_demo.py` (seed de histórico + topes) |
| **Crear** | `verificar_demo.ps1` (smoke test, opcional) |
| **(Opcional) Editar** | `backend/src/controllers/ventasMlController.js` + `routes/negocio.js` (proxy de recalcular alertas) |

> Nota: NO se reescribe ninguno de los algoritmos de `ml/` ni de `scraping/` — ya funcionan y están testeados.
