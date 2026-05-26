-- Migración 011 — Tabla gastos_cif
-- Costos Indirectos de Fabricación (CIF): gastos mensuales fijos o variables
-- que deben prorratearse entre los lotes de producción (luz, agua, gas,
-- alquileres, depreciación de maquinaria, etc.).
--
-- El prorrateo se calcula en backend/src/services/calculoCif.js según el
-- `metodo_prorrateo` elegido para cada gasto:
--   'kilos'          → proporcional a los kilos procesados por el lote.
--   'horas'          → proporcional a las horas de producción del lote.
--   'partes_iguales' → dividido en partes iguales entre los lotes activos.

CREATE TABLE IF NOT EXISTS gastos_cif (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id        UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  concepto          VARCHAR(255) NOT NULL,
  categoria         VARCHAR(50) CHECK (
                      categoria IN ('servicios', 'alquiler', 'depreciacion', 'otros')
                    ),
  monto_mensual     DECIMAL(18,4) NOT NULL CHECK (monto_mensual >= 0),
  metodo_prorrateo  VARCHAR(20) NOT NULL CHECK (
                      metodo_prorrateo IN ('kilos', 'horas', 'partes_iguales')
                    ),
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  notas             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_cif_negocio_activo
  ON gastos_cif(negocio_id, activo);
