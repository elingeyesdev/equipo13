import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

class NotificacionesService {
  final Ref ref;

  NotificacionesService(this.ref);

  Future<void> init() async {
    debugPrint('[NotificacionesService MOCK] Inicializando...');
  }

  Future<void> registrarDispositivo() async {
    try {
      final token = 'mock_fcm_token_${Random().nextInt(10000)}';
      debugPrint('[NotificacionesService MOCK] Obtenido token: $token');
      
      final api = ref.read(apiClientProvider);
      await api.post('/api/operario/dispositivos', data: {
        'fcm_token': token,
        'plataforma': 'flutter_mock'
      });
      debugPrint('[NotificacionesService MOCK] Token registrado en el servidor');
    } catch (e) {
      debugPrint('[NotificacionesService MOCK] Error registrando dispositivo: $e');
    }
  }
}

final notificacionesServiceProvider = Provider((ref) => NotificacionesService(ref));
