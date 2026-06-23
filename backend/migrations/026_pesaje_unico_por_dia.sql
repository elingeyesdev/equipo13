-- Migración 026 — Un pesaje por (lote, fecha)
-- Permite UPSERT y evita pesajes duplicados el mismo día.

-- 1. Deduplicar: conservar solo el pesaje más reciente por (lote_id, fecha).
DELETE FROM pesajes_lote p
USING pesajes_lote q
WHERE p.lote_id = q.lote_id
  AND p.fecha   = q.fecha
  AND p.created_at < q.created_at;

-- 2. Índice único que habilita ON CONFLICT (lote_id, fecha).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pesaje_lote_fecha
  ON pesajes_lote (lote_id, fecha);
