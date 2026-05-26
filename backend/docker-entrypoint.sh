#!/bin/sh
set -e

echo "[entrypoint] Esperando a PostgreSQL en $PGHOST:$PGPORT..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; do
  sleep 1
done
echo "[entrypoint] PostgreSQL disponible."

echo "[entrypoint] Ejecutando migraciones..."
npm run db:migrate

echo "[entrypoint] Arrancando aplicacion: $@"
exec "$@"
