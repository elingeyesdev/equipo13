import os

# El scheduler (APScheduler) nunca debe arrancar durante los tests: el lifespan
# de la app sólo lo inicia cuando ENABLE_SCHEDULER != "false". Lo forzamos aquí
# para que `pytest` sea seguro aunque algún test use `with TestClient(app)`.
os.environ.setdefault("ENABLE_SCHEDULER", "false")
