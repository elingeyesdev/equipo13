-- Migración 014 — Liquidaciones parciales de lote
--
-- Permite vender una parte del lote (ej. 20 de 50 cerdos) sin cerrarlo.
-- Cada parcial:
--   1. Inserta un snapshot completo en `liquidaciones_parciales`.
--   2. Decrementa `lotes.cabezas_activas`.
--   3. Registra una entrada en `bitacora_lote` con monto NEGATIVO igual al
--      costo imputado a la venta parcial. Esto se descuenta automáticamente
--      del costo total del lote remanente en todas las consultas existentes
--      (que computan: costo_adquisicion + SUM(bitacora_lote.monto)).
--
-- El lote remanente conserva su `costo_adquisicion` original (referencia
-- histórica) y queda con un costo neto correcto vía bitácora.

CREATE TABLE IF NOT EXISTS liquidaciones_parciales (
  id              SERIAL PRIMARY KEY,
  lote_id         UUID NOT NULL REFERENCES lotes(id)    ON DELETE CASCADE,
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cabezas_venta   INTEGER NOT NULL CHECK (cabezas_venta > 0),
  peso_prom_final NUMERIC(10,2),
  escenario       TEXT NOT NULL,
  pvp_kg          NUMERIC(10,4),
  gastos_finales  NUMERIC(12,2),
  ingreso_total   NUMERIC(12,2),
  costo_imputado  NUMERIC(12,2),
  utilidad        NUMERIC(12,2),
  liquidacion_jsonb JSONB
);

CREATE INDEX IF NOT EXISTS idx_liquidaciones_parciales_lote
  ON liquidaciones_parciales(lote_id);

CREATE INDEX IF NOT EXISTS idx_liquidaciones_parciales_negocio
  ON liquidaciones_parciales(negocio_id, fecha DESC);
