-- Migración 006 — Campo cantidad_kg en bitacora_lote
-- Permite registrar los kg de alimento consumido por entrada de bitácora.
-- Es opcional: solo las entradas de tipo 'alimento' lo utilizan para calcular ICa.
-- El campo monto sigue representando el costo monetario (Bs) en todos los casos.

ALTER TABLE bitacora_lote
  ADD COLUMN IF NOT EXISTS cantidad_kg DECIMAL(10,4);
