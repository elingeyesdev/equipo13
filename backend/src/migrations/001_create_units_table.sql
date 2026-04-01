-- =============================================
-- Migración 001: Tabla de Unidades de Medida
-- Sistema de Costeo Estándar Productivo Universal
-- Sprint 0 - Entregable 1
-- =============================================

-- Crear tabla de unidades de medida
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(20) NOT NULL,
  base_unit_id VARCHAR(20) REFERENCES units(id) ON DELETE SET NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('Industrial', 'Biológico')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_units_category ON units(category);
CREATE INDEX IF NOT EXISTS idx_units_base_unit ON units(base_unit_id);

-- =============================================
-- Datos iniciales (Seed)
-- =============================================

-- Primero las unidades base (sin dependencia)
INSERT INTO units (id, name, abbreviation, base_unit_id, category) VALUES
  ('kg',      'Kilogramo',           'kg',      NULL, 'Industrial'),
  ('L',       'Litro',               'L',       NULL, 'Industrial'),
  ('m',       'Metro',               'm',       NULL, 'Industrial'),
  ('pz',      'Pieza',               'pz',      NULL, 'Industrial'),
  ('cbz',     'Cabeza',              'cbz',     NULL, 'Biológico')
ON CONFLICT (id) DO NOTHING;

-- Luego las unidades derivadas (dependen de las anteriores)
INSERT INTO units (id, name, abbreviation, base_unit_id, category) VALUES
  ('g',       'Gramo',               'g',       'kg',  'Industrial'),
  ('mL',      'Mililitro',           'mL',      'L',   'Industrial'),
  ('caja',    'Caja (24 pz)',        'caja',    'pz',  'Industrial'),
  ('kg_pv',   'Peso Vivo',           'kg PV',   'kg',  'Biológico'),
  ('kg_pg',   'Peso Gancho',         'kg PG',   'kg',  'Biológico'),
  ('dosis',   'Dosis Líquida',       'mL',      'mL',  'Biológico'),
  ('ration',  'Ración de Alimento',  'ración',  'kg',  'Biológico')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Rollback (ejecutar manualmente si se necesita deshacer)
-- DROP TABLE IF EXISTS units CASCADE;
-- =============================================
