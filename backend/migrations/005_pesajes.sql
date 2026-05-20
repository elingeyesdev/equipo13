-- Migración 005 — Tabla pesajes_lote
-- Historial de pesajes promedio por fecha para un lote.
-- Permite calcular la evolución de peso y la conversión alimenticia (ICa).

CREATE TABLE IF NOT EXISTS pesajes_lote (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id      UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  peso_prom_kg DECIMAL(10,4) NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);
