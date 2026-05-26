-- Migración 002 — Liquidación de lotes
-- Persiste el resultado del cierre/liquidación de un lote en la propia tabla `lotes`.
-- La fila pasa a `activo = false` y el detalle queda en `liquidacion_jsonb`.

ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS liquidacion_jsonb JSONB;
