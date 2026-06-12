import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/providers.dart';
import 'core/router.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Reconstruye el router cuando cambia la autenticación.
    ref.watch(sessionProvider);
    final router = buildRouter(ref);
    return MaterialApp.router(
      title: 'Registro de Lotes',
      theme: ThemeData(colorSchemeSeed: Colors.green, useMaterial3: true),
      routerConfig: router,
    );
  }
}
