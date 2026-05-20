-- Migración 004 — Tabla despiece_cortes
-- Representa los cortes obtenidos al despiece del canal de un lote.
-- El costo_kg_derivado se calcula como: costo_total_lote / peso_canal_total.
-- insumo_generado_id apunta al insumo creado en la tabla `insumos` cuando se
-- ejecuta el endpoint "generar-insumos", cerrando el puente agro → industrial.

CREATE TABLE IF NOT EXISTS despiece_cortes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id             UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  nombre              VARCHAR(255) NOT NULL,
  peso_kg             DECIMAL(18,4) NOT NULL,
  porcentaje_canal    DECIMAL(7,4),   -- % sobre el peso_canal_total del lote
  costo_kg_derivado   DECIMAL(18,4),  -- costo_total_lote / peso_canal_total
  insumo_generado_id  UUID REFERENCES insumos(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW()
);
