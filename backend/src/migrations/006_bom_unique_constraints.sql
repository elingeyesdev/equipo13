-- Un solo BOM por producto (material) y sin líneas duplicadas insumo+etapa en el mismo BOM
CREATE UNIQUE INDEX IF NOT EXISTS idx_boms_one_per_product ON boms(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bom_items_stage_material ON bom_items(bom_id, stage_id, material_id);
