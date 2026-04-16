-- =============================================
-- Migración 004: Módulo de Categorías
-- Sistema de Costeo Estándar Productivo Universal
-- =============================================

-- 1. Crear la Tabla de Categorías Maestra
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_module VARCHAR(50) NOT NULL CHECK (target_module IN ('Units', 'Materials')),
  type VARCHAR(50) NOT NULL CHECK (type IN ('Industrial', 'Biológico')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_category_name_module_type UNIQUE (name, target_module, type)
);

-- 2. Insertar Categorías Iniciales (Extraídas del Seeder Base)
-- Categorías de Insumos (Materials)
INSERT INTO categories (name, target_module, type, description) VALUES
  ('Metales', 'Materials', 'Industrial', 'Variedad de aceros, aluminios y metales'),
  ('Químicos', 'Materials', 'Industrial', 'Para procesos de transformación industrial'),
  ('Eléctricos', 'Materials', 'Industrial', 'Conductores y componentes eléctricos'),
  ('Empaque', 'Materials', 'Industrial', 'Cartón, plásticos y materiales de presentación'),
  ('Nutrición', 'Materials', 'Biológico', 'Alimento para animales según su etapa productiva'),
  ('Sanidad', 'Materials', 'Biológico', 'Vacunas, vitaminas y desparasitantes'),
  ('Activo Biológico', 'Materials', 'Biológico', 'Animales en pie')
ON CONFLICT DO NOTHING;

-- Categorías de Unidades (Units) -- Creadas para agrupar
INSERT INTO categories (name, target_module, type, description) VALUES
  ('Masa / Peso', 'Units', 'Industrial', 'Medidas de peso en estado inerte'),
  ('Volumen', 'Units', 'Industrial', 'Medidas de líquidos o gases'),
  ('Longitud', 'Units', 'Industrial', 'Medidas lineales'),
  ('Embalaje', 'Units', 'Industrial', 'Cajas, piezas o empaques unitarios'),
  ('Masa Viva / Canal', 'Units', 'Biológico', 'Kilogramos aplicados a animales en pie o faenados'),
  ('Dosificación', 'Units', 'Biológico', 'Sistemas de dosis, raciones o individuos')
ON CONFLICT DO NOTHING;

-- 3. Modificaciones a la tabla UNITS
-- Renombrar 'category' a 'type'
ALTER TABLE units RENAME COLUMN category TO type;

-- Agregar Category ID
ALTER TABLE units ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- Asignar la categoría de unidad según su unidad base/ID (Seed data reconciliation)
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Masa / Peso' AND target_module = 'Units' LIMIT 1) WHERE id IN ('kg', 'g');
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Volumen' AND target_module = 'Units' LIMIT 1) WHERE id IN ('L', 'mL') AND type = 'Industrial';
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Longitud' AND target_module = 'Units' LIMIT 1) WHERE id IN ('m');
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Embalaje' AND target_module = 'Units' LIMIT 1) WHERE id IN ('pz', 'caja');
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Masa Viva / Canal' AND target_module = 'Units' LIMIT 1) WHERE id IN ('kg_pv', 'kg_pg');
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Dosificación' AND target_module = 'Units' LIMIT 1) WHERE id IN ('cbz', 'dosis', 'ration');
UPDATE units SET category_id = (SELECT id FROM categories WHERE name = 'Dosificación' AND target_module = 'Units' AND type = 'Biológico' LIMIT 1) WHERE id IN ('mL') AND type = 'Biológico';

-- 4. Modificaciones a la tabla MATERIALS
-- Añadir nueva columna FK
ALTER TABLE materials ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT;

-- Migrar la información del texto a la Foreign Key real
UPDATE materials
SET category_id = c.id
FROM categories c
WHERE materials.category = c.name AND c.target_module = 'Materials';

-- Eliminar la columna vieja ahora que hemos respaldado la info
ALTER TABLE materials DROP COLUMN category;
