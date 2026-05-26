-- Migración 003 — Slug de tipo para categorias_insumos
-- Permite clasificar bitácora por categoría sin depender del nombre literal.
-- Slugs válidos: 'alimento', 'sanidad', 'mano_obra', 'otros'.

ALTER TABLE categorias_insumos
  ADD COLUMN IF NOT EXISTS tipo TEXT;

UPDATE categorias_insumos
SET tipo = CASE
  WHEN nombre ILIKE '%aliment%'
    OR nombre ILIKE '%balanceado%'
    OR nombre ILIKE '%forraje%'
    OR nombre ILIKE '%pastura%'
    OR nombre ILIKE '%silaje%'
    OR nombre ILIKE '%suplement%'
    OR nombre ILIKE '%grano%'
    OR nombre ILIKE '%maiz%'
    OR nombre ILIKE '%maíz%'
    OR nombre ILIKE '%heno%'        THEN 'alimento'
  WHEN nombre ILIKE '%sanidad%'
    OR nombre ILIKE '%medicament%'
    OR nombre ILIKE '%vacuna%'
    OR nombre ILIKE '%veterinari%'
    OR nombre ILIKE '%antibiot%'
    OR nombre ILIKE '%desparasit%'  THEN 'sanidad'
  WHEN nombre ILIKE '%mano de obra%'
    OR nombre ILIKE '%jornal%'
    OR nombre ILIKE '%peón%'
    OR nombre ILIKE '%peon%'
    OR nombre ILIKE '%personal%'    THEN 'mano_obra'
  ELSE                                   'otros'
END
WHERE tipo IS NULL;
