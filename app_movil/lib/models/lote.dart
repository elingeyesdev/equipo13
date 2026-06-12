class Lote {
  final String id;
  final String identificador;
  final String tipoAnimal;
  final int cabezasActivas;
  final bool tieneRegistroHoy;
  final bool confirmadoHoy;

  Lote({
    required this.id,
    required this.identificador,
    required this.tipoAnimal,
    required this.cabezasActivas,
    required this.tieneRegistroHoy,
    required this.confirmadoHoy,
  });

  factory Lote.fromJson(Map<String, dynamic> j) => Lote(
        id: j['id'] as String,
        identificador: j['identificador'] as String? ?? '',
        tipoAnimal: j['tipo_animal'] as String? ?? '',
        cabezasActivas: (j['cabezas_activas'] as num?)?.toInt() ?? 0,
        tieneRegistroHoy: j['tiene_registro_hoy'] as bool? ?? false,
        confirmadoHoy: j['confirmado_hoy'] as bool? ?? false,
      );
}
