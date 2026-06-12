import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/lote.dart';

final misLotesProvider = FutureProvider.autoDispose<List<Lote>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/operario/lotes') as List;
  return data.map((e) => Lote.fromJson(e as Map<String, dynamic>)).toList();
});
