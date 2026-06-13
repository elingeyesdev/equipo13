
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers.dart';
import '../features/auth/login_screen.dart';
import '../features/lotes/lotes_screen.dart';
import '../../models/lote.dart';
import '../features/registro_dia/detalle_lote_screen.dart';
import '../features/registro_dia/registro_dia_screen.dart';
import '../features/eventos/reportar_evento_screen.dart';
import '../features/actividad/mi_actividad_screen.dart';
import '../features/tareas/tareas_screen.dart';

GoRouter buildRouter(WidgetRef ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final auth = ref.read(sessionProvider).authenticated;
      final enLogin = state.matchedLocation == '/login';
      if (!auth) return enLogin ? null : '/login';
      if (auth && enLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/', builder: (c, s) => const LotesScreen()),
      GoRoute(path: '/lote/:id', builder: (c, s) => DetalleLoteScreen(lote: s.extra as Lote)),
      GoRoute(path: '/lote/:id/dia/:fecha', builder: (c, s) =>
          RegistroDiaScreen(lote: s.extra as Lote, fecha: s.pathParameters['fecha']!)),
      GoRoute(path: '/lote/:id/evento', builder: (c, s) =>
          ReportarEventoScreen(loteId: s.pathParameters['id']!)),
      GoRoute(path: '/mi-actividad', builder: (c, s) => const MiActividadScreen()),
      GoRoute(path: '/tareas', builder: (c, s) => const TareasScreen()),
    ],
  );
}
