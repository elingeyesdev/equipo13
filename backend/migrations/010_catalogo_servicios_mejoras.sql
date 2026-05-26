-- Agregar unidad al catálogo de servicios
ALTER TABLE catalogo_servicios
  ADD COLUMN IF NOT EXISTS unidad VARCHAR(50) NOT NULL DEFAULT 'visita';

-- Agregar campo "realizado por" en items del registro diario
ALTER TABLE registro_diario_item
  ADD COLUMN IF NOT EXISTS realizado_por TEXT;
