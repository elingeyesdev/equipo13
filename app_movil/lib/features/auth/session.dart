import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/api_exception.dart';

class SessionState {
  final bool loading;
  final bool authenticated;
  final String? operarioNombre;
  final String? negocioNombre;
  final String? error;

  const SessionState({
    this.loading = false,
    this.authenticated = false,
    this.operarioNombre,
    this.negocioNombre,
    this.error,
  });

  SessionState copyWith({bool? loading, bool? authenticated, String? operarioNombre, String? negocioNombre, String? error}) =>
      SessionState(
        loading: loading ?? this.loading,
        authenticated: authenticated ?? this.authenticated,
        operarioNombre: operarioNombre ?? this.operarioNombre,
        negocioNombre: negocioNombre ?? this.negocioNombre,
        error: error,
      );
}

class SessionNotifier extends StateNotifier<SessionState> {
  final Ref ref;
  SessionNotifier(this.ref) : super(const SessionState()) {
    _restore();
  }

  Future<void> _restore() async {
    final storage = ref.read(storageProvider);
    final token = await storage.token;
    if (token != null) {
      state = state.copyWith(
        authenticated: true,
        operarioNombre: await storage.operarioNombre,
        negocioNombre: await storage.negocioNombre,
      );
    }
  }

  Future<void> login(String codigoNegocio, String username, String pin) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final api = ref.read(apiClientProvider);
      final data = await api.post('/api/auth/operario/login', data: {
        'codigo_negocio': codigoNegocio,
        'username': username,
        'pin': pin,
      });
      final storage = ref.read(storageProvider);
      await storage.save(
        token: data['token'],
        negocioNombre: data['negocio']['nombre'],
        operarioNombre: data['user']['nombre'] ?? data['user']['username'],
      );
      state = state.copyWith(
        loading: false, authenticated: true,
        operarioNombre: data['user']['nombre'] ?? data['user']['username'],
        negocioNombre: data['negocio']['nombre'],
      );
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    }
  }

  Future<void> logout() async {
    await ref.read(storageProvider).clear();
    state = const SessionState(authenticated: false);
  }
}
