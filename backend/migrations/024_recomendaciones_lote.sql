-- Migración 024 — Vincular recomendacion de venta a un lote específico
ALTER TABLE recomendacion_venta ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE;
