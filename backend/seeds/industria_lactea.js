/**
 * Seed: Industria Láctea
 * Inserta datos demo completos para un negocio de industria láctea.
 * NO hace commit — el caller (onboarding) es responsable de la transacción.
 */

export async function seedIndustriaLactea(negocioId, db) {
  // ─────────────────────────────────────────────
  // 1. UNIDADES DE MEDIDA
  // ─────────────────────────────────────────────
  const unidades = await db.query(
    `INSERT INTO unidades_medida (negocio_id, nombre, simbolo, tipo) VALUES
      ($1, 'Kilogramo', 'kg', 'Peso'),
      ($1, 'Gramo', 'g', 'Peso'),
      ($1, 'Litro', 'L', 'Volumen'),
      ($1, 'Mililitro', 'ml', 'Volumen'),
      ($1, 'Unidad', 'u', 'Cantidad'),
      ($1, 'Hora', 'h', 'Tiempo')
    RETURNING id, simbolo`,
    [negocioId]
  );

  const uMap = {};
  for (const row of unidades.rows) {
    uMap[row.simbolo] = row.id;
  }

  // ─────────────────────────────────────────────
  // 2. EQUIVALENCIAS
  // ─────────────────────────────────────────────
  await db.query(
    `INSERT INTO equivalencias_unidades (negocio_id, unidad_origen_id, unidad_destino_id, factor) VALUES
      ($1, $2, $3, 1000),
      ($1, $4, $5, 1000)`,
    [negocioId, uMap['kg'], uMap['g'], uMap['L'], uMap['ml']]
  );

  // ─────────────────────────────────────────────
  // 3. CATEGORÍAS DE INSUMOS
  // ─────────────────────────────────────────────
  const categorias = await db.query(
    `INSERT INTO categorias_insumos (negocio_id, nombre, color, descripcion) VALUES
      ($1, 'Materia prima principal',       '#3B82F6', 'Insumos base del proceso productivo'),
      ($1, 'Insumos químicos y cultivos',   '#F59E0B', 'Enzimas, cultivos y aditivos químicos'),
      ($1, 'Empaque y presentación',        '#22C55E', 'Materiales de empaque y etiquetado'),
      ($1, 'Limpieza y saneamiento',        '#8B5CF6', 'Productos para higiene y limpieza')
    RETURNING id, nombre`,
    [negocioId]
  );

  const cMap = {};
  for (const row of categorias.rows) {
    cMap[row.nombre] = row.id;
  }

  // ─────────────────────────────────────────────
  // 4. PROVEEDORES
  // ─────────────────────────────────────────────
  const proveedores = await db.query(
    `INSERT INTO proveedores (negocio_id, nombre, contacto, telefono, email) VALUES
      ($1, 'Coboce Lácteos S.R.L.',    'Juan Pérez',   '71234567', 'ventas@coboce.bo'),
      ($1, 'TecnoLácteos Bolivia',     'María Flores', '76543210', 'info@tecnolacteos.bo'),
      ($1, 'Salinas de Uyuni Ltda.',   'Carlos Mamani','67891234', NULL),
      ($1, 'Plastibol Envases',        'Ana Quispe',   '72345678', NULL),
      ($1, 'Grafimundo Impresiones',   'Luis Torrez',  '71987654', NULL)
    RETURNING id, nombre`,
    [negocioId]
  );

  const pMap = {};
  for (const row of proveedores.rows) {
    pMap[row.nombre] = row.id;
  }

  // ─────────────────────────────────────────────
  // 5. INSUMOS
  // ─────────────────────────────────────────────
  const insumos = await db.query(
    `INSERT INTO insumos (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, proveedor_id) VALUES
      ($1, 'Leche entera fresca',        $2,  $3,  '4.80',  $4),
      ($1, 'Cuajo enzimático líquido',   $5,  $6,  '420.00',$7),
      ($1, 'Cloruro de calcio',          $5,  $6,  '95.00', $7),
      ($1, 'Fermento láctico mesófilo',  $5,  $6,  '650.00',$7),
      ($1, 'Sal refinada',               $2,  $6,  '8.50',  $8),
      ($1, 'Envase plástico 500g',       $9,  $10, '1.20',  $11),
      ($1, 'Etiqueta autoadhesiva',      $9,  $10, '0.35',  $12)
    RETURNING id, nombre`,
    [
      negocioId,
      cMap['Materia prima principal'],       // $2
      uMap['L'],                              // $3  — leche en litros
      pMap['Coboce Lácteos S.R.L.'],         // $4
      cMap['Insumos químicos y cultivos'],   // $5
      uMap['kg'],                             // $6  — cuajo, CaCl2, fermento, sal en kg
      pMap['TecnoLácteos Bolivia'],           // $7
      pMap['Salinas de Uyuni Ltda.'],        // $8
      cMap['Empaque y presentación'],        // $9
      uMap['u'],                              // $10 — envase y etiqueta en unidades
      pMap['Plastibol Envases'],             // $11
      pMap['Grafimundo Impresiones'],        // $12
    ]
  );

  const iMap = {};
  for (const row of insumos.rows) {
    iMap[row.nombre] = row.id;
  }

  // ─────────────────────────────────────────────
  // 6. INSUMO EXTRA: Envase plástico 250ml
  //    (para yogur — es insumo distinto)
  // ─────────────────────────────────────────────
  const envase250Res = await db.query(
    `INSERT INTO insumos (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, proveedor_id)
     VALUES ($1, 'Envase plástico 250ml', $2, $3, '0.90', $4)
     RETURNING id`,
    [
      negocioId,
      cMap['Empaque y presentación'],
      uMap['u'],
      pMap['Plastibol Envases'],
    ]
  );
  const envase250Id = envase250Res.rows[0].id;

  // ─────────────────────────────────────────────
  // 7. PRODUCTO 1: Queso fresco 500g
  // ─────────────────────────────────────────────
  const quesoRes = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, 'Queso fresco 500g', 'QF-001', $2)
     RETURNING id`,
    [negocioId, uMap['u']]
  );
  const quesoId = quesoRes.rows[0].id;

  // BOM queso — parámetros explícitos por fila
  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden) VALUES
      ($1,  $2,  5.000, $3,  1),
      ($1,  $4,  0.003, $5,  2),
      ($1,  $6,  0.002, $7,  3),
      ($1,  $8,  0.001, $9,  4),
      ($1,  $10, 0.015, $11, 5),
      ($1,  $12, 1,     $13, 6),
      ($1,  $14, 1,     $15, 7)`,
    [
      quesoId,                               // $1
      iMap['Leche entera fresca'],  uMap['L'],  // $2, $3
      iMap['Cuajo enzimático líquido'], uMap['kg'], // $4, $5
      iMap['Cloruro de calcio'],    uMap['kg'], // $6, $7
      iMap['Fermento láctico mesófilo'], uMap['kg'], // $8, $9
      iMap['Sal refinada'],         uMap['kg'], // $10, $11
      iMap['Envase plástico 500g'], uMap['u'],  // $12, $13
      iMap['Etiqueta autoadhesiva'], uMap['u'], // $14, $15
    ]
  );

  // Etapas queso
  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden) VALUES
      ($1, 'Pasteurización',         4,  18.50, 1),
      ($1, 'Adición de cultivos',    3,  18.50, 2),
      ($1, 'Coagulación',            12, 18.50, 3),
      ($1, 'Corte y agitación',      6,  22.00, 4),
      ($1, 'Desuerado y prensado',   8,  22.00, 5),
      ($1, 'Salado y moldeo',        4,  18.50, 6),
      ($1, 'Empaque',                3,  18.50, 7)`,
    [quesoId]
  );

  // ─────────────────────────────────────────────
  // 8. PRODUCTO 2: Yogur natural 250ml
  // ─────────────────────────────────────────────
  const yogurRes = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, 'Yogur natural 250ml', 'YN-002', $2)
     RETURNING id`,
    [negocioId, uMap['u']]
  );
  const yogurId = yogurRes.rows[0].id;

  // BOM yogur — parámetros explícitos por fila
  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden) VALUES
      ($1, $2,  0.300,  $3,  1),
      ($1, $4,  0.0005, $5,  2),
      ($1, $6,  1,      $7,  3),
      ($1, $8,  1,      $9,  4)`,
    [
      yogurId,
      iMap['Leche entera fresca'],       uMap['L'],  // $2, $3
      iMap['Fermento láctico mesófilo'], uMap['kg'], // $4, $5
      envase250Id,                       uMap['u'],  // $6, $7
      iMap['Etiqueta autoadhesiva'],     uMap['u'],  // $8, $9
    ]
  );

  // Etapas yogur
  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden) VALUES
      ($1, 'Pasteurización', 3, 18.50, 1),
      ($1, 'Inoculación',    5, 18.50, 2),
      ($1, 'Incubación',     2, 18.50, 3),
      ($1, 'Empaque',        3, 18.50, 4)`,
    [yogurId]
  );
}
