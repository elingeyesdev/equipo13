import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/hoja_vida.dart';

class RegistroRepository {
  final Ref ref;
  RegistroRepository(this.ref);

  Future<List<DiaHojaVida>> vistaMensual(String loteId, int anio, int mes) async {
    final api = ref.read(apiClientProvider);
    final data = await api.get('/api/operario/lotes/$loteId/hoja-de-vida', query: {'anio': anio, 'mes': mes});
    return (data['dias'] as List).map((e) => DiaHojaVida.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> detalleDia(String loteId, String fecha) async {
    final api = ref.read(apiClientProvider);
    return await api.get('/api/operario/lotes/$loteId/hoja-de-vida/$fecha');
  }

  Future<void> guardarBorrador(String loteId, String fecha, {String? notas, required List<ItemRegistro> items}) async {
    final api = ref.read(apiClientProvider);
    await api.post('/api/operario/lotes/$loteId/hoja-de-vida/$fecha', data: {
      'notas_del_dia': notas,
      'items': items.map((e) => e.toJson()).toList(),
    });
  }

  Future<List<Map<String, dynamic>>> insumos() async {
    final api = ref.read(apiClientProvider);
    final data = await api.get('/api/operario/insumos') as List;
    return data.cast<Map<String, dynamic>>();
  }
}

final registroRepoProvider = Provider((ref) => RegistroRepository(ref));
