import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'storage.dart';
import 'api_client.dart';
import '../features/auth/session.dart';

final storageProvider = Provider<SessionStorage>((ref) => SessionStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.read(storageProvider);
  return ApiClient(
    tokenProvider: () => storage.token,
    onUnauthorized: () => ref.read(sessionProvider.notifier).logout(),
  );
});

final sessionProvider =
    StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  return SessionNotifier(ref);
});
