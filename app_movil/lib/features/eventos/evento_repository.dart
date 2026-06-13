import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

class EventoRepository {
  final Ref ref;
  EventoRepository(this.ref);

  Future<String> subirFoto(String path) async {
    final api = ref.read(apiClientProvider);
    final form = FormData.fromMap({'foto': await MultipartFile.fromFile(path)});
    final data = await api.post('/api/operario/upload', data: form);
    return data['url'] as String;
  }

  Future<void> crearEvento(String loteId, String tipo, Map<String, dynamic> payload, List<String> fotos) async {
    final api = ref.read(apiClientProvider);
    await api.post('/api/operario/lotes/$loteId/eventos',
        data: {'tipo': tipo, 'payload': payload, 'fotos': fotos});
  }

  Future<List<Map<String, dynamic>>> misEventos() async {
    final api = ref.read(apiClientProvider);
    final data = await api.get('/api/operario/eventos') as List;
    return data.cast<Map<String, dynamic>>();
  }
}

final eventoRepoProvider = Provider((ref) => EventoRepository(ref));
