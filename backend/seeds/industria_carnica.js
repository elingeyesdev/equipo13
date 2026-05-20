export async function seedIndustriaCarnica(negocioId, db) {
  // ── Unidades de medida ──────────────────────────────────────
  const unidades = {};
  for (const u of [
    { nombre: 'Kilogramo',  simbolo: 'kg', tipo: 'Peso' },
    { nombre: 'Gramo',      simbolo: 'g',  tipo: 'Peso' },
    { nombre: 'Cabeza',     simbolo: 'cab',tipo: 'Cantidad' },
    { nombre: 'Unidad',     simbolo: 'u',  tipo: 'Cantidad' },
    { nombre: 'Litro',      simbolo: 'L',  tipo: 'Volumen' },
    { nombre: 'Hora',       simbolo: 'h',  tipo: 'Tiempo' },
  ]) {
    const { rows } = await db.query(
      `INSERT INTO unidades_medida (negocio_id, nombre, simbolo, tipo)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [negocioId, u.nombre, u.simbolo, u.tipo]
    );
    unidades[u.simbolo] = rows[0].id;
  }

  // ── Categorías de insumos ───────────────────────────────────
  const cat = {};
  for (const c of [
    { key: 'alimento',   nombre: 'Alimento / Balanceado',       color: '#22C55E' },
    { key: 'sanidad',    nombre: 'Sanidad / Medicamento',        color: '#EF4444' },
    { key: 'mano_obra',  nombre: 'Mano de obra',                 color: '#6366F1' },
    { key: 'condimento', nombre: 'Condimentos y especias',        color: '#F59E0B' },
    { key: 'empaque',    nombre: 'Empaque y presentación',        color: '#8B5CF6' },
    { key: 'carnes',     nombre: 'Cortes cárnicos',              color: '#EC4899' },
  ]) {
    const { rows } = await db.query(
      `INSERT INTO categorias_insumos (negocio_id, nombre, color)
       VALUES ($1, $2, $3) RETURNING id`,
      [negocioId, c.nombre, c.color]
    );
    cat[c.key] = rows[0].id;
  }

  // ── Proveedores ─────────────────────────────────────────────
  const prov = {};
  for (const p of [
    { key: 'agrobol',   nombre: 'Agrobol Santa Cruz S.R.L.',    contacto: 'Marco Soliz',    telefono: '73441122', email: 'ventas@agrobol.bo' },
    { key: 'vetpig',    nombre: 'VetPig Bolivia',               contacto: 'Dra. Ana Vargas', telefono: '72985566', email: null },
    { key: 'empaques',  nombre: 'Plastiempaques del Oriente',   contacto: 'Luis Pedraza',   telefono: '71334455', email: null },
    { key: 'condim',    nombre: 'Condimentos Naturales S.A.',   contacto: 'Rosa Terán',      telefono: '76112233', email: 'pedidos@condim.bo' },
  ]) {
    const { rows } = await db.query(
      `INSERT INTO proveedores (negocio_id, nombre, contacto, telefono, email)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [negocioId, p.nombre, p.contacto, p.telefono, p.email]
    );
    prov[p.key] = rows[0].id;
  }

  // ── Insumos de producción (no cárnicos) ────────────────────
  const ins = {};
  for (const i of [
    { key: 'balanceado',   nombre: 'Balanceado porcino engorde',  precio: 1.16,  unidad: 'kg', cat: 'alimento',   pr: 'agrobol' },
    { key: 'ivermectina',  nombre: 'Ivermectina 1% inyectable',   precio: 95.00, unidad: 'L',  cat: 'sanidad',    pr: 'vetpig'  },
    { key: 'vacuna_ppc',   nombre: 'Vacuna PPC (Cólera Porcino)', precio: 22.50, unidad: 'u',  cat: 'sanidad',    pr: 'vetpig'  },
    { key: 'vitamina_ae',  nombre: 'Vitamina AE inyectable',      precio: 78.00, unidad: 'L',  cat: 'sanidad',    pr: 'vetpig'  },
    { key: 'condimentos',  nombre: 'Mix de condimentos chorizo',   precio: 28.00, unidad: 'kg', cat: 'condimento', pr: 'condim'  },
    { key: 'tripa_nat',    nombre: 'Tripa natural porcina',        precio: 12.00, unidad: 'u',  cat: 'condimento', pr: 'condim'  },
    { key: 'arroz',        nombre: 'Arroz precocido',              precio: 4.50,  unidad: 'kg', cat: 'condimento', pr: 'condim'  },
    { key: 'cebolla',      nombre: 'Cebolla blanca',               precio: 2.20,  unidad: 'kg', cat: 'condimento', pr: 'agrobol' },
    { key: 'bolsa_vac',    nombre: 'Bolsa al vacío 250g',          precio: 0.85,  unidad: 'u',  cat: 'empaque',    pr: 'empaques'},
    { key: 'etiqueta',     nombre: 'Etiqueta autoadhesiva',        precio: 0.30,  unidad: 'u',  cat: 'empaque',    pr: 'empaques'},
  ]) {
    const { rows } = await db.query(
      `INSERT INTO insumos (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, proveedor_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [negocioId, i.nombre, cat[i.cat], unidades[i.unidad], i.precio, prov[i.pr]]
    );
    ins[i.key] = rows[0].id;
  }

  // ── Lote principal (ACTIVO — se usará en la demo) ───────────
  // 50 cerdos · peso inicial 8.5 kg → actual 95 kg
  // costo adq: 50 × 350 = 17,500 Bs
  // ICa objetivo: 2.80 (verde) ← se logra con 12,100 kg_alimento consumidos
  // Costo total (solo con bitácora abajo): 17,500 + 14,000 + 600 + 1,200 = 33,300 Bs
  const { rows: loteRows } = await db.query(
    `INSERT INTO lotes
       (negocio_id, identificador, tipo_animal, fecha_entrada,
        cabezas_inicio, cabezas_activas,
        peso_inicial_prom, peso_actual_prom,
        costo_adquisicion, activo)
     VALUES ($1, $2, $3, NOW() - INTERVAL '28 days', 50, 50, 8.5, 95, 17500, true)
     RETURNING id`,
    [negocioId, 'LOTE-CERD-001', 'Cerdo']
  );
  const loteId = loteRows[0].id;

  // ── Bitácora 28 días (alimento + sanidad + MO) ─────────────
  // IMPORTANTE: cantidad_kg es lo que usa el endpoint GET /ica
  // monto es el costo en Bs (balanceado a 1.16 Bs/kg ≈ 14,000 Bs total)
  // Los 12,100 kg de alimento → ICa = 12,100 / (50 × 86.5) = 2.80
  const bitacoraEntries = [
    // Alimento — distribuido en 6 entregas quincenales/semanales
    { dias: 4,  tipo: 'Alimento / Balanceado', detalle: 'Balanceado inicio — semana 1',    monto: 2200, cantidad_kg: 1900, cantidad: 1900, precio_unitario: 1.16 },
    { dias: 8,  tipo: 'Alimento / Balanceado', detalle: 'Balanceado crecimiento — sem 2',  monto: 2500, cantidad_kg: 2150, cantidad: 2150, precio_unitario: 1.16 },
    { dias: 12, tipo: 'Alimento / Balanceado', detalle: 'Balanceado crecimiento — sem 3',  monto: 2300, cantidad_kg: 2000, cantidad: 2000, precio_unitario: 1.15 },
    { dias: 18, tipo: 'Alimento / Balanceado', detalle: 'Balanceado engorde — sem 4',      monto: 2500, cantidad_kg: 2150, cantidad: 2150, precio_unitario: 1.16 },
    { dias: 23, tipo: 'Alimento / Balanceado', detalle: 'Balanceado engorde — sem 5',      monto: 2200, cantidad_kg: 1900, cantidad: 1900, precio_unitario: 1.16 },
    { dias: 27, tipo: 'Alimento / Balanceado', detalle: 'Balanceado acabado — sem 6',      monto: 2300, cantidad_kg: 2000, cantidad: 2000, precio_unitario: 1.15 },
    // Sanidad — 600 Bs total
    { dias: 2,  tipo: 'Sanidad / Medicamento', detalle: 'Vacunación inicial PPC (50 dosis)', monto: 250, cantidad_kg: null, cantidad: 50,  precio_unitario: 5.00 },
    { dias: 15, tipo: 'Sanidad / Medicamento', detalle: 'Desparasitación Ivermectina',       monto: 200, cantidad_kg: null, cantidad: 2,   precio_unitario: 100.00 },
    { dias: 25, tipo: 'Sanidad / Medicamento', detalle: 'Refuerzo vitamínico AE',            monto: 150, cantidad_kg: null, cantidad: 1,   precio_unitario: 150.00 },
    // Mano de obra — 1,200 Bs total (4 pagos semanales)
    { dias: 7,  tipo: 'Mano de obra', detalle: 'Jornal semana 1 (cuidado + limpieza)', monto: 300, cantidad_kg: null, cantidad: null, precio_unitario: null },
    { dias: 14, tipo: 'Mano de obra', detalle: 'Jornal semana 2',                      monto: 300, cantidad_kg: null, cantidad: null, precio_unitario: null },
    { dias: 21, tipo: 'Mano de obra', detalle: 'Jornal semana 3',                      monto: 300, cantidad_kg: null, cantidad: null, precio_unitario: null },
    { dias: 28, tipo: 'Mano de obra', detalle: 'Jornal semana 4 + cierre engorde',     monto: 300, cantidad_kg: null, cantidad: null, precio_unitario: null },
  ];

  for (const e of bitacoraEntries) {
    await db.query(
      `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, monto, cantidad_kg, es_baja, cantidad, precio_unitario)
       VALUES ($1, NOW() - INTERVAL '${28 - e.dias} days', $2, $3, $4, $5, false, $6, $7)`,
      [loteId, e.tipo, e.detalle, e.monto, e.cantidad_kg, e.cantidad ?? null, e.precio_unitario ?? null]
    );
  }

  // ── Pesajes intermedios ─────────────────────────────────────
  for (const p of [
    { dias: 7,  peso: 25.5 },
    { dias: 14, peso: 47.0 },
    { dias: 21, peso: 70.0 },
  ]) {
    await db.query(
      `INSERT INTO pesajes_lote (lote_id, fecha, peso_prom_kg)
       VALUES ($1, NOW() - INTERVAL '${28 - p.dias} days', $2)`,
      [loteId, p.peso]
    );
  }

  // ── Despiece del canal ──────────────────────────────────────
  // Canal total: 50 × 95 × 0.75 = 3,562.5 kg
  // costo_kg_derivado = 33,300 / 3,562.5 = 9.35 Bs/kg
  const COSTO_KG = 9.3464; // 33300 / 3562.5
  const PESO_CANAL = 3562.5;
  const cortesDef = [
    { nombre: 'Lomo',     peso: 356.0 },  // 10%
    { nombre: 'Costilla', peso: 534.0 },  // 15%
    { nombre: 'Paleta',   peso: 641.5 },  // 18%
    { nombre: 'Jamón',    peso: 783.5 },  // 22%
    { nombre: 'Panceta',  peso: 712.5 },  // 20%
    { nombre: 'Grasa',    peso: 535.0 },  // 15%
  ];

  const corteIds = {};
  const corteInsumoIds = {};

  for (const c of cortesDef) {
    const pct = (c.peso / PESO_CANAL) * 100;

    // Crear insumo "corte" con precio derivado del costeo del lote
    const { rows: insRows } = await db.query(
      `INSERT INTO insumos
         (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, es_variable, activo)
       VALUES ($1, $2, $3, $4, $5, false, true) RETURNING id`,
      [negocioId, `${c.nombre} de cerdo (Lote CERD-001)`, cat.carnes, unidades.kg, COSTO_KG]
    );
    const insumoId = insRows[0].id;
    corteInsumoIds[c.nombre] = insumoId;

    // Crear corte en despiece_cortes con el vínculo al insumo ya generado
    const { rows: corteRows } = await db.query(
      `INSERT INTO despiece_cortes
         (lote_id, nombre, peso_kg, porcentaje_canal, costo_kg_derivado, insumo_generado_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [loteId, c.nombre, c.peso, pct, COSTO_KG, insumoId]
    );
    corteIds[c.nombre] = corteRows[0].id;
  }

  // ── Producto 1: Chorizo artesanal (BOM por 1 kg de producto) ─
  // Composición: Paleta 55%, Panceta 20%, Grasa 10%, Condimentos 8%, Tripa 1u, Empaque 1u
  const { rows: chorizoRows } = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [negocioId, 'Chorizo artesanal', 'CH-001', unidades.kg]
  );
  const chorizoId = chorizoRows[0].id;

  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden) VALUES
       ($1, $2, 0.55, $3, 1),
       ($1, $4, 0.20, $5, 2),
       ($1, $6, 0.10, $7, 3),
       ($1, $8, 0.08, $9, 4),
       ($1, $10, 1,   $11, 5),
       ($1, $12, 1,   $13, 6)`,
    [
      chorizoId,
      corteInsumoIds['Paleta'],   unidades.kg,
      corteInsumoIds['Panceta'],  unidades.kg,
      corteInsumoIds['Grasa'],    unidades.kg,
      ins.condimentos,            unidades.kg,
      ins.tripa_nat,              unidades.u,
      ins.bolsa_vac,              unidades.u,
    ]
  );

  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden) VALUES
       ($1, 'Picado y mezcla de carnes',       20, 18.50, 1),
       ($1, 'Incorporación de condimentos',     10, 18.50, 2),
       ($1, 'Embutido en tripa',                25, 18.50, 3),
       ($1, 'Porcionado y atado',               10, 18.50, 4),
       ($1, 'Empaque al vacío y etiquetado',    10, 18.50, 5)`,
    [chorizoId]
  );

  // ── Producto 2: Morcilla artesanal (BOM por 1 kg de producto) ─
  // Composición: Costilla 25%, Panceta 15%, Arroz 25%, Cebolla 10%,
  //              Condimentos 5%, Tripa 1u, Empaque 1u
  const { rows: morcillaRows } = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [negocioId, 'Morcilla artesanal', 'MC-001', unidades.kg]
  );
  const morcillaId = morcillaRows[0].id;

  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden) VALUES
       ($1, $2, 0.25, $3, 1),
       ($1, $4, 0.15, $5, 2),
       ($1, $6, 0.25, $7, 3),
       ($1, $8, 0.10, $9, 4),
       ($1, $10, 0.05, $11, 5),
       ($1, $12, 1,    $13, 6),
       ($1, $14, 1,    $15, 7)`,
    [
      morcillaId,
      corteInsumoIds['Costilla'], unidades.kg,
      corteInsumoIds['Panceta'],  unidades.kg,
      ins.arroz,                  unidades.kg,
      ins.cebolla,                unidades.kg,
      ins.condimentos,            unidades.kg,
      ins.tripa_nat,              unidades.u,
      ins.bolsa_vac,              unidades.u,
    ]
  );

  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden) VALUES
       ($1, 'Cocción de carnes y arroz',         30, 18.50, 1),
       ($1, 'Mezcla y condimentado',             10, 18.50, 2),
       ($1, 'Embutido en tripa',                 20, 18.50, 3),
       ($1, 'Cocción final (escaldado)',          25, 22.00, 4),
       ($1, 'Empaque y refrigeración',           10, 18.50, 5)`,
    [morcillaId]
  );

  // ── Lote LIQUIDADO (ciclo anterior — muestra widget S5 en Dashboard) ──
  // 30 cerdos · 85 kg finales · costo total 18,900 Bs
  // Escenario gancho: canal 1,912.5 kg × 32 Bs/kg = 61,200 Bs → utilidad 42,300 Bs
  const { rows: lotePrevRows } = await db.query(
    `INSERT INTO lotes
       (negocio_id, identificador, tipo_animal, fecha_entrada,
        cabezas_inicio, cabezas_activas,
        peso_inicial_prom, peso_actual_prom,
        costo_adquisicion, activo,
        liquidacion_jsonb)
     VALUES ($1, $2, $3, NOW() - INTERVAL '65 days',
             30, 0, 8.5, 85, 10500, false,
             $4)
     RETURNING id`,
    [
      negocioId,
      'LOTE-CERD-000',
      'Cerdo',
      JSON.stringify({
        cabezas_venta:      30,
        peso_prom_final:    85,
        rendimiento_canal:  75,
        escenario:          'gancho',
        pvp_kg:             32,
        gastos_finales:     1440,
        peso_total_pie:     2550,
        peso_total_gancho:  1912.5,
        costo_total:        18900,
        costo_kg_vivo:      7.41,
        costo_kg_canal:     9.88,
        ingreso:            61200,
        utilidad:           40860,
        margen:             66.77,
        liquidado_en:       new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]
  );
  const lotePrevId = lotePrevRows[0].id;

  // Bitácora mínima del lote anterior (para que aparezca en historial)
  await db.query(
    `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, monto, es_baja)
     VALUES
       ($1, NOW() - INTERVAL '60 days', 'Alimento / Balanceado', 'Balanceado ciclo 0 — primera entrega', 4200, false),
       ($1, NOW() - INTERVAL '50 days', 'Alimento / Balanceado', 'Balanceado ciclo 0 — segunda entrega', 3500, false),
       ($1, NOW() - INTERVAL '45 days', 'Sanidad / Medicamento', 'Vacunación y desparasitación',          350, false),
       ($1, NOW() - INTERVAL '40 days', 'Mano de obra',          'Jornal 4 semanas',                      350, false)`,
    [lotePrevId]
  );

  // ── LOTE TUTORIAL: 1 solo cerdito (para entender cada número) ──────────────
  //
  //  COSTO TOTAL:
  //    Adquisición:  1 cab × 350 Bs          =  350 Bs
  //    Alimento:     242 kg × 1.16 Bs/kg     ≈  282 Bs  (3 entregas)
  //    Sanidad:      1 vacuna                =   12 Bs
  //    TOTAL                                 =  644 Bs
  //
  //  CANAL (75 %):  95 kg × 0.75 = 71.25 kg
  //  COSTO/kg canal: 644 / 71.25 = 9.04 Bs/kg
  //
  //  ICa: 242 kg alimento / (1 cab × 86.5 kg ganancia) = 2.80  [verde]
  //
  const { rows: miniRows } = await db.query(
    `INSERT INTO lotes
       (negocio_id, identificador, tipo_animal, fecha_entrada,
        cabezas_inicio, cabezas_activas,
        peso_inicial_prom, peso_actual_prom,
        costo_adquisicion, activo)
     VALUES ($1, $2, $3, NOW() - INTERVAL '28 days', 1, 1, 8.5, 95, 350, true)
     RETURNING id`,
    [negocioId, 'LOTE-MINI-001', 'Cerdo']
  );
  const miniId = miniRows[0].id;

  // Bitácora: 3 entregas de alimento (242 kg) + 1 sanidad
  // Podés sumar estos números a mano y obtener exactamente 644 Bs de costo total.
  await db.query(
    `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, monto, cantidad_kg, es_baja, cantidad, precio_unitario)
     VALUES
       ($1, NOW() - INTERVAL '21 days', 'Alimento / Balanceado', 'Balanceado semanas 1–2 (80 kg × 1.16)',  93, 80,  false, 80,   1.16),
       ($1, NOW() - INTERVAL '14 days', 'Alimento / Balanceado', 'Balanceado semanas 3–4 (82 kg × 1.16)',  95, 82,  false, 82,   1.16),
       ($1, NOW() - INTERVAL '5 days',  'Alimento / Balanceado', 'Balanceado semanas 5–6 (80 kg × 1.16)',  94, 80,  false, 80,   1.16),
       ($1, NOW() - INTERVAL '26 days', 'Sanidad / Medicamento', 'Vacuna PPC — dosis individual (1 u)',    12, NULL, false,  1,  12.00)`,
    [miniId]
  );
  // Totales alimento: 93+95+94 = 282 Bs · 80+82+80 = 242 kg · ICa = 242/86.5 = 2.80

  // Pesaje intermedio (día 14)
  await db.query(
    `INSERT INTO pesajes_lote (lote_id, fecha, peso_prom_kg)
     VALUES ($1, NOW() - INTERVAL '14 days', 47.0)`,
    [miniId]
  );

  // Despiece (71.25 kg canal) — mismos porcentajes que el lote grande
  // costo_kg_derivado = 644 / 71.25 = 9.04 Bs/kg
  const COSTO_KG_MINI = parseFloat((644 / 71.25).toFixed(4)); // 9.0386
  const PESO_CANAL_MINI = 71.25;
  const cortesMini = [
    { nombre: 'Lomo',     peso: 7.13  }, // 10 %
    { nombre: 'Costilla', peso: 10.69 }, // 15 %
    { nombre: 'Paleta',   peso: 12.83 }, // 18 %
    { nombre: 'Jamón',    peso: 15.68 }, // 22 %
    { nombre: 'Panceta',  peso: 14.25 }, // 20 %
    { nombre: 'Grasa',    peso: 10.67 }, // 15 %
    // suma: 71.25 kg ✓
  ];

  for (const c of cortesMini) {
    const pct = parseFloat(((c.peso / PESO_CANAL_MINI) * 100).toFixed(2));

    const { rows: insRowsMini } = await db.query(
      `INSERT INTO insumos
         (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, es_variable, activo)
       VALUES ($1, $2, $3, $4, $5, false, true) RETURNING id`,
      [negocioId, `${c.nombre} de cerdo (Lote MINI-001)`, cat.carnes, unidades.kg, COSTO_KG_MINI]
    );
    const insumoMiniId = insRowsMini[0].id;

    await db.query(
      `INSERT INTO despiece_cortes
         (lote_id, nombre, peso_kg, porcentaje_canal, costo_kg_derivado, insumo_generado_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [miniId, c.nombre, c.peso, pct, COSTO_KG_MINI, insumoMiniId]
    );
  }
}
