import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

class TareasRepository {
  final Ref ref;
  TareasRepository(this.ref);

  Future<List<Map<String, dynamic>>> misTareas() async {
    final api = ref.read(apiClientProvider);
    final data = await api.get('/api/operario/tareas') as List;
    return data.cast<Map<String, dynamic>>();
  }

  Future<void> completarTarea(String id) async {
    final api = ref.read(apiClientProvider);
    await api.post('/api/operario/tareas/$id/completar');
  }

  Future<List<Map<String, dynamic>>> checklistDia(String loteId, String fecha) async {
    final api = ref.read(apiClientProvider);
    final data = await api.get('/api/operario/lotes/$loteId/checklist?fecha=$fecha') as List;
    return data.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> toggleChecklist(String id) async {
    final api = ref.read(apiClientProvider);
    final data = await api.post('/api/operario/checklist/$id/toggle');
    return data as Map<String, dynamic>;
  }
}

final tareasRepoProvider = Provider((ref) => TareasRepository(ref));

final misTareasProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(tareasRepoProvider);
  return repo.misTareas();
});
