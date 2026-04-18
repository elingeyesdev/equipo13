-- =============================================
-- Migración 005: Tablas Fundamentales del Sprint 2
-- Sistema de Costeo Estándar Productivo Universal
-- Entregables: Etapas, Plantillas, BOM y Simulador
-- =============================================

-- 1. Etapas de Producción (Entregable 1 - Módulo de Definición)
CREATE TABLE IF NOT EXISTS production_stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Industrial', 'Biológico')),
  sequence_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prod_stages_type ON production_stages(type);
CREATE INDEX IF NOT EXISTS idx_prod_stages_order ON production_stages(sequence_order);

-- 2. Plantillas de Rubro (Entregable 2 - Configurador)
CREATE TABLE IF NOT EXISTS production_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Industrial', 'Biológico')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Listas de Materiales / BOM (Entregable 3 - Calculadora BOM)
-- Registra una fórmula de producción para un producto específico
CREATE TABLE IF NOT EXISTS boms (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(20) NOT NULL REFERENCES materials(id),
  name VARCHAR(150),
  base_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  template_id INT REFERENCES production_templates(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boms_product ON boms(product_id);

-- Detalle de los insumos por etapa del BOM (Entregable 3)
CREATE TABLE IF NOT EXISTS bom_items (
  id SERIAL PRIMARY KEY,
  bom_id INT NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  stage_id INT NOT NULL REFERENCES production_stages(id),
  material_id VARCHAR(20) NOT NULL REFERENCES materials(id),
  quantity DECIMAL(10,4) NOT NULL,
  unit_id VARCHAR(20) NOT NULL REFERENCES units(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_stage ON bom_items(stage_id);

-- 4. Simulador de Costos (Entregable 4 - Visualizador de simulaciones)
CREATE TABLE IF NOT EXISTS cost_simulations (
  id SERIAL PRIMARY KEY,
  bom_id INT NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  simulated_quantity DECIMAL(10,2) NOT NULL,
  total_cost_estimated DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Datos semilla (Seed) para visualización inmediata
-- =============================================
INSERT INTO production_stages (name, description, type, sequence_order) VALUES
  ('Molienda y Mezclado', 'Trituración de granos y mezclado de suplementos vitaminicos', 'Biológico', 1),
  ('Peletización', 'Compactado de la mezcla en pellets', 'Biológico', 2),
  ('Enfriamiento y Empaque', 'Envasado en sacos', 'Biológico', 3),
  ('Corte y Troquelado', 'Corte en piezas maestras según patrón', 'Industrial', 1),
  ('Ensamblaje', 'Unión de todas las partes maquinadas', 'Industrial', 2),
  ('Pintura y Acabado', 'Baño final y revisión', 'Industrial', 3)
ON CONFLICT DO NOTHING;
