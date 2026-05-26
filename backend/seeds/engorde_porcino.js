// Seed: Engorde porcino bajo confinamiento
// Crea un negocio agro con:
//  - Catalogos base (unidades, categorias, proveedores)
//  - Insumos tipicos del engorde porcino (sin cortes — los cortes son output del despiece)
//  - Compras historicas que pueblan el inventario FIFO
//  - Catalogo de servicios veterinarios y operativos
//  - Un lote demo con 30 dias de registros diarios confirmados
//  - Pesajes intermedios para calcular ICA

export async function seedEngordePorcino(negocioId, db) {
  const unidades = {};
  const categorias = {};
  const proveedores = {};
  const insumos = {};

  // ───────── 1. Unidades de medida ─────────
  const unidadesData = [
    { nombre: 'Kilogramo', simbolo: 'kg',     tipo: 'Peso' },
    { nombre: 'Gramo',     simbolo: 'g',      tipo: 'Peso' },
    { nombre: 'Cabeza',    simbolo: 'cab',    tipo: 'Cantidad' },
    { nombre: 'Litro',     simbolo: 'L',      tipo: 'Volumen' },
    { nombre: 'Mililitro', simbolo: 'mL',     tipo: 'Volumen' },
    { nombre: 'Dosis',     simbolo: 'dosis',  tipo: 'Cantidad' },
    { nombre: 'Hora',      simbolo: 'h',      tipo: 'Tiempo' },
    { nombre: 'Visita',    simbolo: 'visita', tipo: 'Cantidad' },
  ];
  for (const u of unidadesData) {
    const { rows } = await db.query(
      `INSERT INTO unidades_medida (negocio_id, nombre, simbolo, tipo) VALUES ($1, $2, $3, $4) RETURNING id`,
      [negocioId, u.nombre, u.simbolo, u.tipo],
    );
    unidades[u.simbolo] = rows[0].id;
  }

  await db.query(
    `INSERT INTO equivalencias_unidades (negocio_id, unidad_origen_id, unidad_destino_id, factor)
     VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
    [negocioId, unidades.kg, unidades.g, 1000, unidades.L, unidades.mL, 1000],
  );

  // ───────── 2. Categorias (con tipo para clasificar bitacora/diario) ─────────
  const categoriasData = [
    { key: 'balanceado',   nombre: 'Balanceado',                color: '#22C55E', tipo: 'alimento'  },
    { key: 'vacunas',      nombre: 'Vacunas',                   color: '#EF4444', tipo: 'sanidad'   },
    { key: 'tratamientos', nombre: 'Tratamientos veterinarios', color: '#F97316', tipo: 'sanidad'   },
    { key: 'suplementos',  nombre: 'Vitaminas y electrolitos',  color: '#F59E0B', tipo: 'sanidad'   },
    { key: 'mano_obra',    nombre: 'Mano de obra',              color: '#3B82F6', tipo: 'mano_obra' },
    { key: 'otros',        nombre: 'Otros gastos',              color: '#9CA3AF', tipo: 'otros'     },
  ];
  for (const c of categoriasData) {
    const { rows } = await db.query(
      `INSERT INTO categorias_insumos (negocio_id, nombre, color, tipo) VALUES ($1, $2, $3, $4) RETURNING id`,
      [negocioId, c.nombre, c.color, c.tipo],
    );
    categorias[c.key] = rows[0].id;
  }

  // ───────── 3. Proveedores ─────────
  const proveedoresData = [
    { key: 'nutricion',   nombre: 'Granja Nutrición S.R.L.',     contacto: 'Andrea Rocha',  telefono: '70112233', email: 'ventas@nutricion.bo' },
    { key: 'veterinaria', nombre: 'Veterinaria Pulmar',          contacto: 'Dr. Iván Soto', telefono: '70445566', email: 'pedidos@vetpulmar.bo' },
    { key: 'agroquim',    nombre: 'Agroquímicos del Sur',        contacto: 'Lucía Vargas',  telefono: '70778899', email: null },
  ];
  for (const p of proveedoresData) {
    const { rows } = await db.query(
      `INSERT INTO proveedores (negocio_id, nombre, contacto, telefono, email) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [negocioId, p.nombre, p.contacto, p.telefono, p.email],
    );
    proveedores[p.key] = rows[0].id;
  }

  // ───────── 4. Insumos del engorde porcino ─────────
  const insumosData = [
    { key: 'bal_inicio',   nombre: 'Balanceado iniciador porcino',         precio:  8.50, unidad: 'kg',    categoria: 'balanceado',   proveedor: 'nutricion' },
    { key: 'bal_crecim',   nombre: 'Balanceado crecimiento porcino',       precio:  7.80, unidad: 'kg',    categoria: 'balanceado',   proveedor: 'nutricion' },
    { key: 'bal_desarr',   nombre: 'Balanceado desarrollo porcino',        precio:  7.30, unidad: 'kg',    categoria: 'balanceado',   proveedor: 'nutricion' },
    { key: 'bal_engorde',  nombre: 'Balanceado engorde porcino',           precio:  7.00, unidad: 'kg',    categoria: 'balanceado',   proveedor: 'nutricion' },
    { key: 'vac_myco',     nombre: 'Vacuna Mycoplasma hyopneumoniae',      precio: 12.00, unidad: 'dosis', categoria: 'vacunas',      proveedor: 'veterinaria' },
    { key: 'vac_peste',    nombre: 'Vacuna Peste Porcina Clásica',         precio: 15.00, unidad: 'dosis', categoria: 'vacunas',      proveedor: 'veterinaria' },
    { key: 'ivermectina',  nombre: 'Ivermectina 1% inyectable',            precio:  0.80, unidad: 'mL',    categoria: 'tratamientos', proveedor: 'veterinaria' },
    { key: 'vit_ade',      nombre: 'Vitaminas A+D+E inyectable',           precio:  1.20, unidad: 'mL',    categoria: 'suplementos',  proveedor: 'agroquim' },
    { key: 'electrolitos', nombre: 'Electrolitos en polvo (oral)',         precio: 28.00, unidad: 'kg',    categoria: 'suplementos',  proveedor: 'agroquim' },
    { key: 'desp_ext',     nombre: 'Desparasitante externo (piretroides)', precio:  2.50, unidad: 'mL',    categoria: 'tratamientos', proveedor: 'agroquim' },
  ];
  for (const ins of insumosData) {
    const { rows } = await db.query(
      `INSERT INTO insumos (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, proveedor_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [negocioId, ins.nombre, categorias[ins.categoria], unidades[ins.unidad], ins.precio, proveedores[ins.proveedor]],
    );
    insumos[ins.key] = rows[0].id;
  }

  // ───────── 5. Helper de fechas relativas (offset en dias desde hoy) ─────────
  const dateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // ───────── 6. Compras historicas (poblan inventario FIFO) ─────────
  const comprasData = [
    { insumo: 'bal_inicio',   cantidad:  500, precio: 8.50, dias_antes: 35, proveedor: 'nutricion',   factura: 'GN-001' },
    { insumo: 'bal_inicio',   cantidad:  300, precio: 8.70, dias_antes: 15, proveedor: 'nutricion',   factura: 'GN-014' },
    { insumo: 'bal_crecim',   cantidad:  600, precio: 7.80, dias_antes: 10, proveedor: 'nutricion',   factura: 'GN-019' },
    { insumo: 'vac_myco',     cantidad:  120, precio:12.00, dias_antes: 40, proveedor: 'veterinaria', factura: 'VP-008' },
    { insumo: 'vac_peste',    cantidad:   60, precio:15.00, dias_antes: 40, proveedor: 'veterinaria', factura: 'VP-008' },
    { insumo: 'ivermectina',  cantidad:  250, precio: 0.80, dias_antes: 45, proveedor: 'veterinaria', factura: 'VP-005' },
    { insumo: 'vit_ade',      cantidad:  150, precio: 1.20, dias_antes: 40, proveedor: 'agroquim',    factura: 'AS-022' },
    { insumo: 'electrolitos', cantidad:   10, precio:28.00, dias_antes: 40, proveedor: 'agroquim',    factura: 'AS-022' },
    { insumo: 'desp_ext',     cantidad:  500, precio: 2.50, dias_antes: 45, proveedor: 'agroquim',    factura: 'AS-018' },
  ];
  const comprasIds = {}; // por insumo: arreglo de {id, dias_antes, restante}
  for (const c of comprasData) {
    const { rows } = await db.query(
      `INSERT INTO compras_insumo (
         negocio_id, insumo_id, proveedor_id, fecha_compra,
         cantidad_comprada, cantidad_disponible, precio_unitario,
         unidad_id, numero_factura
       ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
       RETURNING id`,
      [
        negocioId,
        insumos[c.insumo],
        proveedores[c.proveedor],
        dateOffset(-c.dias_antes),
        c.cantidad,
        c.precio,
        unidades[insumosData.find(i => i.key === c.insumo).unidad],
        c.factura,
      ],
    );
    if (!comprasIds[c.insumo]) comprasIds[c.insumo] = [];
    comprasIds[c.insumo].push({ id: rows[0].id, precio: c.precio, restante: c.cantidad });
  }

  // ───────── 7. Catalogo de servicios veterinarios ─────────
  const serviciosData = [
    { nombre: 'Visita veterinaria',           unidad: 'visita', costo: 250, descripcion: 'Visita de rutina del médico veterinario' },
    { nombre: 'Consulta de emergencia',       unidad: 'visita', costo: 450, descripcion: 'Atención veterinaria de urgencia' },
    { nombre: 'Análisis de laboratorio',      unidad: 'muestra',costo: 180, descripcion: 'Análisis de sangre, heces o agua' },
    { nombre: 'Castración',                   unidad: 'cabeza', costo:  15, descripcion: 'Castración de lechones machos' },
    { nombre: 'Corte de colmillos',           unidad: 'cabeza', costo:   5, descripcion: 'Clipeo de colmillos en lechones' },
    { nombre: 'Corte de cola',                unidad: 'cabeza', costo:   5, descripcion: 'Descole preventivo de lechones' },
    { nombre: 'Areteo / Identificación',      unidad: 'cabeza', costo:   8, descripcion: 'Colocación de aretes o tatuaje' },
    { nombre: 'Muestreo de pesos',            unidad: 'visita', costo: 120, descripcion: 'Pesaje y muestreo del lote' },
    { nombre: 'Desinfección de instalaciones',unidad: 'visita', costo: 350, descripcion: 'Desinfección de galpones' },
    { nombre: 'Control de roedores',          unidad: 'visita', costo: 200, descripcion: 'Servicio de desratización' },
    { nombre: 'Control de moscas/vectores',   unidad: 'visita', costo: 180, descripcion: 'Aplicación de insecticidas' },
    { nombre: 'Retiro de cadáveres',          unidad: 'visita', costo: 150, descripcion: 'Recolección de animales muertos' },
    { nombre: 'Retiro de estiércol/purín',    unidad: 'viaje',  costo: 220, descripcion: 'Extracción de purín del galpón' },
    { nombre: 'Transporte a matadero',        unidad: 'viaje',  costo: 800, descripcion: 'Flete de animales para faena' },
    { nombre: 'Visita técnica nutricional',   unidad: 'visita', costo: 300, descripcion: 'Consultoría de nutricionista' },
    { nombre: 'Auditoría de bioseguridad',    unidad: 'visita', costo: 400, descripcion: 'Evaluación de protocolos sanitarios' },
  ];
  const serviciosIds = {};
  for (const s of serviciosData) {
    const { rows } = await db.query(
      `INSERT INTO catalogo_servicios (negocio_id, nombre, descripcion, costo_base, unidad)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [negocioId, s.nombre, s.descripcion, s.costo, s.unidad],
    );
    serviciosIds[s.nombre] = rows[0].id;
  }

  // ───────── 8. Lote demo ─────────
  const FECHA_ENTRADA_OFFSET = 30; // dias antes de hoy
  const cabezas = 50;
  const pesoInicial = 8.5;
  const costoAdquisicion = 17500; // 50 cab × ~350 Bs

  const { rows: [lote] } = await db.query(
    `INSERT INTO lotes (
       negocio_id, identificador, tipo_animal, fecha_entrada,
       cabezas_inicio, cabezas_activas, peso_inicial_prom, peso_actual_prom,
       costo_adquisicion, edad_promedio_dias
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      negocioId,
      'LOTE-CERD-001',
      'Cerdo',
      dateOffset(-FECHA_ENTRADA_OFFSET),
      cabezas,
      cabezas,
      pesoInicial,
      18.5, // peso actual estimado tras 30 dias en iniciacion
      costoAdquisicion,
      30, // edad promedio actual del lote
    ],
  );
  const loteId = lote.id;

  // ───────── 9. Pesajes intermedios ─────────
  await db.query(
    `INSERT INTO pesajes_lote (lote_id, fecha, peso_prom_kg)
     VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7), ($1, $8, $9)`,
    [
      loteId,
      dateOffset(-30),  8.5,
      dateOffset(-21), 11.0,
      dateOffset(-14), 13.5,
      dateOffset(-7),  16.0,
    ],
  );

  // ───────── 10. Registros diarios (30 dias confirmados) ─────────
  // Helper: descontar cantidad de las capas FIFO en memoria y devolver detalle_fifo
  const consumirFIFO = (insumoKey, cantidad) => {
    const capas = comprasIds[insumoKey] || [];
    let restante = cantidad;
    const detalle = [];
    let costoTotal = 0;
    for (const capa of capas) {
      if (restante <= 0) break;
      if (capa.restante <= 0) continue;
      const usar = Math.min(restante, capa.restante);
      capa.restante -= usar;
      restante -= usar;
      costoTotal += usar * capa.precio;
      detalle.push({ compra_id: capa.id, cantidad: usar, precio_unitario: capa.precio, subtotal: +(usar * capa.precio).toFixed(4) });
    }
    return { detalle, costoTotal: +costoTotal.toFixed(4), faltante: restante };
  };

  // Iteramos dias 1..30 (dia 1 = hace 29 dias, dia 30 = hoy)
  for (let dia = 1; dia <= 30; dia++) {
    const diasAtras = 30 - dia;
    const fecha = dateOffset(-diasAtras);

    // Crear registro_diario_lote confirmado
    const { rows: [registro] } = await db.query(
      `INSERT INTO registro_diario_lote (negocio_id, lote_id, fecha, confirmado, confirmado_en, notas_del_dia)
       VALUES ($1, $2, $3, TRUE, NOW(), $4) RETURNING id`,
      [negocioId, loteId, fecha, notasParaDia(dia)],
    );
    const registroId = registro.id;

    // 10.1 Consumo de balanceado (todos los dias)
    const balKey = dia <= 9 ? 'bal_inicio' : 'bal_crecim';
    // kg/cab/dia segun fase
    const kgPorCab = dia <= 9 ? 0.45 : 1.50;
    const cantBalanceado = +(kgPorCab * cabezas).toFixed(4);
    const consBal = consumirFIFO(balKey, cantBalanceado);
    await db.query(
      `INSERT INTO registro_diario_item (
         registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo
       ) VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
      [registroId, insumos[balKey], cantBalanceado, unidades.kg, consBal.costoTotal, JSON.stringify(consBal.detalle)],
    );

    // 10.2 Eventos especiales por dia
    if (dia === 1) {
      // Vitaminas A+D+E (2 mL/cab) + Electrolitos en agua (0.05 kg total)
      const vit = consumirFIFO('vit_ade', 2 * cabezas);
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo)
         VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
        [registroId, insumos.vit_ade, 2 * cabezas, unidades.mL, vit.costoTotal, JSON.stringify(vit.detalle)],
      );
      const elec = consumirFIFO('electrolitos', 0.05);
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo)
         VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
        [registroId, insumos.electrolitos, 0.05, unidades.kg, elec.costoTotal, JSON.stringify(elec.detalle)],
      );
    }

    if (dia === 7) {
      // Desparasitacion interna: ivermectina (0.3 mL/cab)
      const iv = consumirFIFO('ivermectina', 0.3 * cabezas);
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo)
         VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
        [registroId, insumos.ivermectina, 0.3 * cabezas, unidades.mL, iv.costoTotal, JSON.stringify(iv.detalle)],
      );
    }

    if (dia === 14) {
      // Vacuna Mycoplasma dosis 1
      const v = consumirFIFO('vac_myco', cabezas);
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo)
         VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
        [registroId, insumos.vac_myco, cabezas, unidades.dosis, v.costoTotal, JSON.stringify(v.detalle)],
      );
      // Servicio: visita veterinaria
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, servicio_id, servicio_nombre, costo_servicio, realizado_por)
         VALUES ($1, 'servicio', $2, $3, $4, $5)`,
        [registroId, serviciosIds['Visita veterinaria'], 'Visita veterinaria', 250, 'Dr. Iván Soto'],
      );
    }

    if (dia === 21) {
      // Muestreo de pesos (servicio)
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, servicio_id, servicio_nombre, costo_servicio, realizado_por)
         VALUES ($1, 'servicio', $2, $3, $4, $5)`,
        [registroId, serviciosIds['Muestreo de pesos'], 'Muestreo de pesos', 120, 'Equipo de granja'],
      );
    }

    if (dia === 28) {
      // Vacuna Mycoplasma dosis 2 (refuerzo)
      const v = consumirFIFO('vac_myco', cabezas);
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo)
         VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
        [registroId, insumos.vac_myco, cabezas, unidades.dosis, v.costoTotal, JSON.stringify(v.detalle)],
      );
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, servicio_id, servicio_nombre, costo_servicio, realizado_por)
         VALUES ($1, 'servicio', $2, $3, $4, $5)`,
        [registroId, serviciosIds['Visita veterinaria'], 'Visita veterinaria', 250, 'Dr. Iván Soto'],
      );
    }

    if (dia % 10 === 0) {
      // Limpieza/retiro de estiercol cada 10 dias
      await db.query(
        `INSERT INTO registro_diario_item (registro_diario_id, tipo, servicio_id, servicio_nombre, costo_servicio, realizado_por)
         VALUES ($1, 'servicio', $2, $3, $4, $5)`,
        [registroId, serviciosIds['Retiro de estiércol/purín'], 'Retiro de estiércol/purín', 220, 'Equipo de granja'],
      );
    }
  }

  // ───────── 11. Sincronizar cantidad_disponible en compras_insumo ─────────
  // Tras consumir FIFO en memoria, persistimos el remanente real
  for (const [insumoKey, capas] of Object.entries(comprasIds)) {
    for (const capa of capas) {
      await db.query(
        `UPDATE compras_insumo SET cantidad_disponible = $1 WHERE id = $2`,
        [Math.max(0, +capa.restante.toFixed(4)), capa.id],
      );
    }
  }
}

function notasParaDia(dia) {
  if (dia === 1)  return 'Llegada del lote. Aplicación de vitaminas inyectables y electrolitos en el agua.';
  if (dia === 7)  return 'Desparasitación interna con ivermectina. Lote estable, sin bajas.';
  if (dia === 14) return 'Primera dosis de vacuna Mycoplasma hyopneumoniae aplicada por el veterinario.';
  if (dia === 21) return 'Muestreo de pesos. Promedio de la muestra: 13.5 kg.';
  if (dia === 28) return 'Refuerzo de vacuna Mycoplasma. Animales activos y consumiendo bien.';
  if (dia % 10 === 0) return 'Limpieza general del galpón y retiro de estiércol.';
  return null;
}
