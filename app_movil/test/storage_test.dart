import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:app_movil/core/storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  test('guarda y recupera la sesión', () async {
    final storage = SessionStorage();
    await storage.save(token: 't123', negocioNombre: 'Granja', operarioNombre: 'Juan');
    expect(await storage.token, 't123');
    expect(await storage.negocioNombre, 'Granja');
    await storage.clear();
    expect(await storage.token, isNull);
  });
}
