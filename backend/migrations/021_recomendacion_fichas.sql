-- Migración 021 — Fichas guardadas de recomendaciones de venta
ALTER TABLE recomendacion_venta
  ADD COLUMN IF NOT EXISTS fijada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_recomendacion_fijada
  ON recomendacion_venta (negocio_id, fijada, generada_en DESC);
