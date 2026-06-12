import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers.dart';
import '../features/auth/login_screen.dart';
import '../features/lotes/lotes_screen.dart';

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
    ],
  );
}
