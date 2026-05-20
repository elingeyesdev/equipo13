-- Add cantidad and precio_unitario to bitacora_lote
ALTER TABLE bitacora_lote ADD COLUMN IF NOT EXISTS cantidad NUMERIC(10,2);
ALTER TABLE bitacora_lote ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2);
