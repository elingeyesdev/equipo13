class DiaHojaVida {
  final String fecha;
  final int diaDelMes;
  final int diasEnLote;
  final String? fase;
  final bool confirmado;
  final bool tieneRegistro;
  final Map<String, dynamic>? registro;

  DiaHojaVida({
    required this.fecha,
    required this.diaDelMes,
    required this.diasEnLote,
    required this.fase,
    required this.confirmado,
    required this.tieneRegistro,
    required this.registro,
  });

  factory DiaHojaVida.fromJson(Map<String, dynamic> j) => DiaHojaVida(
        fecha: j['fecha'] as String,
        diaDelMes: (j['dia_del_mes'] as num).toInt(),
        diasEnLote: (j['dias_en_lote'] as num?)?.toInt() ?? 0,
        fase: j['fase'] as String?,
        confirmado: j['confirmado'] as bool? ?? false,
        tieneRegistro: j['tiene_registro'] as bool? ?? false,
        registro: j['registro'] as Map<String, dynamic>?,
      );
}

class ItemRegistro {
  final String tipo; // 'insumo' | 'servicio'
  final String? insumoId;
  final double? cantidad;
  final String? unidadId;
  final String? servicioNombre;
  final double? costoServicio;
  final String? realizadoPor;

  ItemRegistro({
    required this.tipo,
    this.insumoId,
    this.cantidad,
    this.unidadId,
    this.servicioNombre,
    this.costoServicio,
    this.realizadoPor,
  });

  Map<String, dynamic> toJson() => {
        'tipo': tipo,
        if (insumoId != null) 'insumo_id': insumoId,
        if (cantidad != null) 'cantidad': cantidad,
        if (unidadId != null) 'unidad_id': unidadId,
        if (servicioNombre != null) 'servicio_nombre': servicioNombre,
        if (costoServicio != null) 'costo_servicio': costoServicio,
        if (realizadoPor != null) 'realizado_por': realizadoPor,
      };
}
