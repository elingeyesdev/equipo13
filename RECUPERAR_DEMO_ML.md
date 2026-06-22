# Prompt para recuperar la demo de Inteligencia de Ventas (ML + scraping)

Pega esto en un chat nuevo de Claude Code, abierto en
`C:\Users\Jairo\Documents\Sistema de Costeo Estandar Productivo Universal\equipo13`:

---

Estoy en el proyecto universitario "Sistema de Costeo Estandar Productivo Universal"
(carpeta `equipo13`), un stack Docker Compose con 4 servicios: `db` (Postgres 16),
`backend` (Node/Express, puerto 3000), `frontend` (React/Vite, puerto 5173) y
`ml_service` (FastAPI/Python, puerto 8001). Puertos del host: `DB_PORT=5433` (hay un
Postgres 18 nativo en 5432), backend 3000, frontend 5173, ml_service 8001.
Token backend↔ml en `.env`: `ML_SERVICE_TOKEN` (ya está seteado, no lo toques).

**Qué pasó:** corrí `docker compose down -v` por error, que borró el volumen de
Postgres. Las migraciones SQL se re-aplican solas al arrancar el backend (las corre
`docker-entrypoint.sh` vía `npm run db:migrate`), así que el esquema está OK, pero
**la base está vacía**: no hay usuarios, no hay negocios, no hay histórico de precios
ML ni fuentes de scraping configuradas.

**Quiero reconstruir desde cero la demo del módulo "Inteligencia de Ventas"**
(scraping de precios reales → pronóstico ML con Prophet/Holt-Winters →
recomendaciones de venta + alertas de precio), siguiendo estos pasos. Hacelos en
orden y verificá cada uno antes de avanzar:

1. **Levantar el stack** (si no está arriba): `docker compose up -d`. Confirmá los
   4 contenedores healthy con `docker compose ps`.

2. **Crear la cuenta de demo y el negocio agro**, vía la API del backend
   (no hace falta UI):
   - `POST http://localhost:3000/api/auth/register` con body
     `{"email":"gerardo@demo.com","password":"demo1234","nombre":"Gerardo"}`
     (revisá `backend/src/controllers/authController.js` si el body esperado
     difiere). Guardá el JWT de la respuesta.
   - `POST http://localhost:3000/api/negocios` (con el JWT en `Authorization: Bearer`)
     con body `{"nombre":"Granja Olmos","rubro":"agro_ganadero","plantilla":"t4","moneda":"BOB"}`.
     Guardá el `id` devuelto — es el `negocio_id` que vas a usar en todos los pasos
     siguientes.

3. **Sembrar el histórico de precios para ML** (esto SÍ tiene que ser por script,
   no hay endpoint):
   ```
   docker compose exec ml_service python seed_demo.py <NEGOCIO_ID>
   ```
   Es idempotente y, si el negocio no tiene despiece todavía, crea solo un lote
   demo (`LOTE-DEMO-ML`) + 5 cortes (Pierna/Chorizo/Costilla/Paleta/Lomo) antes de
   sembrar el histórico. Pierna y Lomo quedan con 420 días (dispara Prophet), el
   resto con 90 días (Holt-Winters). Fuerza una alerta de +15% en Pierna/minorista.

4. **Configurar las 2 fuentes de scraping reales ya validadas** (Shopify
   `/products.json`, adaptador `json_api`). Insertalas por SQL para ir rápido
   (después se pueden ver/editar desde la UI en "Fuentes de Datos"):
   ```sql
   INSERT INTO fuentes_scraping (negocio_id, nombre, url, tipo, canal, config, activo) VALUES
   ('<NEGOCIO_ID>', 'Don Cerdo Bolivia (cortes)',
    'https://doncerdobolivia.com/collections/cortes/products.json', 'json_api', 'minorista',
    '{"products_path":"products","title_key":"title","price_path":"variants.0.price","grams_path":"variants.0.grams"}', true),
   ('<NEGOCIO_ID>', 'Amarket (cerdo)',
    'https://amarket.com.bo/collections/cerdo/products.json', 'json_api', 'mayorista',
    '{"products_path":"products","title_key":"title","price_path":"variants.0.price","grams_path":"variants.0.grams"}', true);
   ```
   (Ojo: NO agregues Fidalga ni Hipermaxi — ya se probaron y se descartaron:
   Fidalga solo expone `/collections/all` con 250 productos mezclados y mete ruido
   en los alias; Hipermaxi bloquea al scraper con una página anti-bot cuando se
   accede desde dentro del contenedor, aunque desde un navegador normal cargue bien.)

5. **Correr el scraping y verificar:**
   ```
   curl -X POST http://localhost:3000/api/negocios/<NEGOCIO_ID>/scraping/run -H "Authorization: Bearer <JWT>"
   ```
   Confirmá que las 2 fuentes terminan en estado `ok` con filas > 0
   (`GET /api/negocios/<NEGOCIO_ID>/scrape-runs`).

6. **Generar recomendaciones y alertas:**
   ```
   curl -X POST http://localhost:3000/api/negocios/<NEGOCIO_ID>/recomendaciones?horizonte=7 ... (revisá el método/ruta exacta en backend/src/routes/negocio.js, líneas ~313-325)
   curl -X POST http://localhost:3000/api/negocios/<NEGOCIO_ID>/alertas-precio/recalcular -H "Authorization: Bearer <JWT>"
   ```
   Esperado: `modo=forecast`, 5 items (uno por corte), al menos 1 alerta de precio.

7. **Verificación final automatizada:** correr
   `.\verificar_demo.ps1 -NegocioId <NEGOCIO_ID>` desde PowerShell en la raíz de
   `equipo13` (hace los mismos 4 chequeos por su cuenta: health, recomendaciones,
   alertas/recalcular, listado de alertas). Tiene que terminar con exit code 0.

8. Decime el `negocio_id` final y la contraseña de la cuenta para que pueda
   entrar a la UI (`gerardo@demo.com` / `demo1234`) y probar manualmente
   "Fuentes de Datos" → "Ejecutar scraping ahora" → "Recomendaciones de Venta".

**Importante:** de ahora en más, para reiniciar el stack usar `docker compose down`
(SIN `-v`) y `docker compose up -d` — el flag `-v` borra los volúmenes y vuelve a
pasar esto.

---
