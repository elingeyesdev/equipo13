import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStorage {
  final FlutterSecureStorage _s = const FlutterSecureStorage();

  Future<void> save({
    required String token,
    required String negocioNombre,
    required String operarioNombre,
  }) async {
    await _s.write(key: 'token', value: token);
    await _s.write(key: 'negocio_nombre', value: negocioNombre);
    await _s.write(key: 'operario_nombre', value: operarioNombre);
  }

  Future<String?> get token => _s.read(key: 'token');
  Future<String?> get negocioNombre => _s.read(key: 'negocio_nombre');
  Future<String?> get operarioNombre => _s.read(key: 'operario_nombre');

  Future<void> clear() => _s.deleteAll();
}
