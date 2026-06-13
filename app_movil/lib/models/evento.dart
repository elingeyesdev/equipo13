class Evento {
  final String id;
  final String loteId;
  final String loteIdentificador;
  final String tipo;
  final String estado;
  final Map<String, dynamic> payload;
  final List<String> fotos;
  final DateTime createdAt;

  Evento({
    required this.id,
    required this.loteId,
    required this.loteIdentificador,
    required this.tipo,
    required this.estado,
    required this.payload,
    required this.fotos,
    required this.createdAt,
  });

  factory Evento.fromJson(Map<String, dynamic> json) {
    return Evento(
      id: json['id'] ?? '',
      loteId: json['lote_id'] ?? '',
      loteIdentificador: json['lote_identificador'] ?? '',
      tipo: json['tipo'] ?? '',
      estado: json['estado'] ?? '',
      payload: json['payload'] ?? {},
      fotos: List<String>.from(json['fotos'] ?? []),
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
    );
  }
}
