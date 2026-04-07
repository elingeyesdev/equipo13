-- =============================================
-- Migración 003: Normalización y Constraints
-- Sistema de Costeo Estándar Productivo Universal
-- Correcciones de integridad referencial
-- =============================================

-- ────────────────────────────────────────────
-- 1. UNIT_CONVERSIONS: Evitar duplicados
--    No puede existir más de un factor para el
--    mismo par (source → target)
-- ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversion_pair'
  ) THEN
    -- Primero eliminar duplicados si existen (mantener el más reciente)
    DELETE FROM unit_conversions a
    USING unit_conversions b
    WHERE a.id < b.id
      AND a.source_unit_id = b.source_unit_id
      AND a.target_unit_id = b.target_unit_id;

    ALTER TABLE unit_conversions
      ADD CONSTRAINT uq_conversion_pair UNIQUE (source_unit_id, target_unit_id);
  END IF;
END $$;

-- Constraint: no puede convertirse a sí misma
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_conversion'
  ) THEN
    ALTER TABLE unit_conversions
      ADD CONSTRAINT chk_no_self_conversion CHECK (source_unit_id <> target_unit_id);
  END IF;
END $$;

-- Constraint: el factor siempre debe ser positivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_positive_factor'
  ) THEN
    ALTER TABLE unit_conversions
      ADD CONSTRAINT chk_positive_factor CHECK (factor > 0);
  END IF;
END $$;

-- Constraint: tipo válido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_conversion_type'
  ) THEN
    ALTER TABLE unit_conversions
      ADD CONSTRAINT chk_conversion_type CHECK (type IN ('Industrial', 'Biológico'));
  END IF;
END $$;

-- ────────────────────────────────────────────
-- 2. INVENTORY_BATCHES: Integridad referencial
--    Si se elimina un material, se eliminan
--    sus lotes automáticamente (CASCADE)
-- ────────────────────────────────────────────
DO $$
BEGIN
  -- Verificar si el FK actual NO tiene CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_batches_material_id_fkey'
      AND table_name = 'inventory_batches'
  ) THEN
    ALTER TABLE inventory_batches DROP CONSTRAINT inventory_batches_material_id_fkey;
    ALTER TABLE inventory_batches
      ADD CONSTRAINT inventory_batches_material_id_fkey
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Constraint: las cantidades siempre deben ser positivas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_positive_quantity'
  ) THEN
    ALTER TABLE inventory_batches
      ADD CONSTRAINT chk_positive_quantity CHECK (quantity > 0);
  END IF;
END $$;

-- ────────────────────────────────────────────
-- 3. UNIT_CONVERSIONS: Cascada al borrar unidad
--    Si se elimina una unidad, se eliminan sus
--    conversiones automáticamente
-- ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unit_conversions_source_unit_id_fkey'
  ) THEN
    ALTER TABLE unit_conversions DROP CONSTRAINT unit_conversions_source_unit_id_fkey;
    ALTER TABLE unit_conversions
      ADD CONSTRAINT unit_conversions_source_unit_id_fkey
      FOREIGN KEY (source_unit_id) REFERENCES units(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unit_conversions_target_unit_id_fkey'
  ) THEN
    ALTER TABLE unit_conversions DROP CONSTRAINT unit_conversions_target_unit_id_fkey;
    ALTER TABLE unit_conversions
      ADD CONSTRAINT unit_conversions_target_unit_id_fkey
      FOREIGN KEY (target_unit_id) REFERENCES units(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────
-- 4. MATERIALS: Restricción al borrar unidad usada
--    No se puede eliminar una unidad si hay
--    materiales que la usan como unidad primaria
-- ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'materials_primary_unit_id_fkey'
  ) THEN
    ALTER TABLE materials DROP CONSTRAINT materials_primary_unit_id_fkey;
    ALTER TABLE materials
      ADD CONSTRAINT materials_primary_unit_id_fkey
      FOREIGN KEY (primary_unit_id) REFERENCES units(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- =============================================
-- Resumen de normalización aplicada:
-- 
-- unit_conversions:
--   UNIQUE (source_unit_id, target_unit_id) → sin duplicados
--   CHECK  (source_unit_id <> target_unit_id) → no auto-conversión
--   CHECK  (factor > 0) → factor siempre positivo
--   CHECK  (type IN ...) → tipo validado
--   FK     ON DELETE CASCADE → limpieza automática
--
-- inventory_batches:
--   FK     ON DELETE CASCADE → borrar material borra sus lotes
--   CHECK  (quantity > 0) → cantidad siempre positiva
--
-- materials:
--   FK     ON DELETE RESTRICT → no borrar unidad si material la usa
-- =============================================
