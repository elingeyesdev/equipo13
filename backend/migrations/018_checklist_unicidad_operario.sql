-- Migración 018 — Corrige la unicidad del checklist diario.
-- El checklist es por (item, lote, operario, fecha): una misma rutina asignada
-- al mismo lote para DOS operarios debe materializar filas independientes por
-- operario. La constraint original (plantilla_item_id, lote_id, fecha) excluía
-- al operario, así que el segundo operario en abrir el checklist no recibía sus
-- filas (la materialización hacía ON CONFLICT DO NOTHING) y veía la lista vacía.

ALTER TABLE checklist_dia DROP CONSTRAINT IF EXISTS uq_checklist_dia;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_checklist_dia'
  ) THEN
    ALTER TABLE checklist_dia
      ADD CONSTRAINT uq_checklist_dia
      UNIQUE (plantilla_item_id, lote_id, operario_user_id, fecha);
  END IF;
END $$;
