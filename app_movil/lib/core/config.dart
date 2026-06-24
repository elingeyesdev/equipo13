import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  // Override con: flutter run --dart-define=API_URL=http://192.168.x.x:3000
  static const String _override = String.fromEnvironment('API_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://localhost:3000';
    if (Platform.isAndroid) return 'http://10.0.2.2:3000'; // emulador
    return 'http://localhost:3000'; // Windows, macOS, Linux, iOS sim
  }
}
