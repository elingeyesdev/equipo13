-- Migración 025 — Pesaje programado configurable
-- Cadencia de pesaje por negocio (default) y por lote (override),
-- más metadatos de origen en el historial de pesajes.

-- Default del negocio (días entre pesajes)
ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS pesaje_intervalo_dias INT NOT NULL DEFAULT 14;

-- Override por lote (NULL = hereda el del negocio) + interruptor del recordatorio
ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS pesaje_intervalo_dias INT,
  ADD COLUMN IF NOT EXISTS pesaje_activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Metadatos del historial de pesajes (la tabla ya existe, migración 005)
ALTER TABLE pesajes_lote
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'dueno',
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS n_cabezas_muestra INT,
  ADD COLUMN IF NOT EXISTS notas TEXT;
