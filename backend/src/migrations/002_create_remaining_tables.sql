-- =============================================
-- Migración 002: Tablas de Materials, Conversions, Inventory
-- Sistema de Costeo Estándar Productivo Universal
-- Sprint 0 - Entregables 2, 3 y 4
-- =============================================

-- 2. Insumos y Materia Prima
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(20) PRIMARY KEY,
  sku VARCHAR(50) UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Industrial', 'Biológico')),
  primary_unit_id VARCHAR(20) NOT NULL REFERENCES units(id),
  cost_standard DECIMAL(10,2),
  stage VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_unit ON materials(primary_unit_id);

-- 3. Conversiones y Equivalencias
CREATE TABLE IF NOT EXISTS unit_conversions (
  id SERIAL PRIMARY KEY,
  source_unit_id VARCHAR(20) NOT NULL REFERENCES units(id),
  target_unit_id VARCHAR(20) NOT NULL REFERENCES units(id),
  factor DECIMAL(10,4) NOT NULL,
  type VARCHAR(20),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversions_source ON unit_conversions(source_unit_id);
CREATE INDEX IF NOT EXISTS idx_conversions_target ON unit_conversions(target_unit_id);

-- 4. Carga Masiva / Inventario Inicial
CREATE TABLE IF NOT EXISTS inventory_batches (
  id SERIAL PRIMARY KEY,
  batch_number VARCHAR(30) UNIQUE NOT NULL,
  material_id VARCHAR(20) NOT NULL REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  location VARCHAR(100),
  acquisition_cost DECIMAL(10,2),
  entry_date DATE,
  initial_weight DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_material ON inventory_batches(material_id);

-- =============================================
-- Datos iniciales (Seed)
-- =============================================

-- Materials
INSERT INTO materials (id, sku, name, description, category, type, primary_unit_id, cost_standard, stage) VALUES
  ('RM-001', 'SKU-ACERO',   'Lámina de Acero (2mm)',  'Acero inoxidable calibre estándar',           'Metales',          'Industrial',  'kg',   45.00, NULL),
  ('RM-002', 'SKU-ALUM',    'Extrusión de Aluminio',  'Perfil de aluminio 6063',                     'Metales',          'Industrial',  'kg',   12.50, NULL),
  ('RM-003', 'SKU-RESINA',  'Resina Industrial',      'Resina epoxi de grado industrial',            'Químicos',         'Industrial',  'L',    18.20, NULL),
  ('RM-004', 'SKU-CABLE',   'Cable de Cobre (10 AWG)','Cable conductor calibre 10',                  'Eléctricos',       'Industrial',  'm',     8.90, NULL),
  ('RM-005', 'SKU-CARTON',  'Cartón de Empaque',      'Cartón corrugado doble pared',                'Empaque',          'Industrial',  'pz',    1.20, NULL),
  ('BIO-001','SKU-PREINIT', 'Alimento Pre-Iniciador', 'Alto en proteína para lechones 0-21 días',    'Nutrición',        'Biológico',   'kg',   28.50, 'Cría'),
  ('BIO-002','SKU-INIT',    'Alimento Iniciador',     'Transición nutricional 21-60 días',           'Nutrición',        'Biológico',   'kg',   22.00, 'Iniciador'),
  ('BIO-003','SKU-ALIM',    'Alimento de Engorde',    'Ganancia de peso acelerada 120+ días',        'Nutrición',        'Biológico',   'kg',   15.50, 'Engorde'),
  ('BIO-005','SKU-VACUNA',  'Vacuna Triple Porcina',  'Cólera, Peste, Erisipela — dosis de 2mL',    'Sanidad',          'Biológico',   'mL',    3.20, NULL),
  ('BIO-006','SKU-DESPAR',  'Desparasitante Oral',    'Ivermectina — aplicación oral directa',       'Sanidad',          'Biológico',   'mL',    5.80, NULL),
  ('BIO-007','SKU-LECHON',  'Lechón en Pie',          'Unidad biológica inicial — inicio Hoja de Vida','Activo Biológico','Biológico',   'cbz',  35.00, 'Cría')
ON CONFLICT (id) DO NOTHING;

-- Conversiones
INSERT INTO unit_conversions (source_unit_id, target_unit_id, factor, type, note) VALUES
  ('kg',    'g',     1000.0000, 'Industrial', NULL),
  ('L',     'mL',    1000.0000, 'Industrial', NULL),
  ('caja',  'pz',      24.0000, 'Industrial', '1 caja = 24 piezas'),
  ('kg_pv', 'kg_pg',    0.8000, 'Biológico',  'Rendimiento de canal estándar — 80% del peso vivo se convierte en carcasa aprovechable'),
  ('cbz',   'kg_pv',  110.0000, 'Biológico',  'Peso promedio de un cerdo en etapa de venta — configurable por especie')
ON CONFLICT DO NOTHING;

-- Inventory Batches
INSERT INTO inventory_batches (batch_number, material_id, quantity, location, acquisition_cost, entry_date, initial_weight) VALUES
  ('INV-001', 'RM-001',  500.00, 'Bodega Central',  45.00, NULL,          NULL),
  ('INV-002', 'RM-003',  200.00, 'Bodega Química',   18.20, NULL,          NULL),
  ('LOT-001', 'BIO-007',  25.00, 'Corral A1',        35.00, '2026-03-01',  8.50)
ON CONFLICT (batch_number) DO NOTHING;

-- =============================================
-- Rollback (ejecutar manualmente si se necesita deshacer)
-- DROP TABLE IF EXISTS inventory_batches CASCADE;
-- DROP TABLE IF EXISTS unit_conversions CASCADE;
-- DROP TABLE IF EXISTS materials CASCADE;
-- =============================================
