import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _codigo = TextEditingController();
  final _usuario = TextEditingController();
  final _pin = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.agriculture, size: 64),
                const SizedBox(height: 8),
                Text('Registro de Lotes', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 24),
                TextField(controller: _codigo, textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'Código de negocio', hintText: 'AB-1234', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _usuario,
                  decoration: const InputDecoration(labelText: 'Usuario', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _pin, keyboardType: TextInputType.number, obscureText: true, maxLength: 6,
                  decoration: const InputDecoration(labelText: 'PIN', border: OutlineInputBorder())),
                if (session.error != null)
                  Padding(padding: const EdgeInsets.only(top: 8),
                    child: Text(session.error!, style: const TextStyle(color: Colors.red))),
                const SizedBox(height: 16),
                SizedBox(width: double.infinity,
                  child: FilledButton(
                    onPressed: session.loading ? null : () =>
                      ref.read(sessionProvider.notifier).login(_codigo.text.trim(), _usuario.text.trim(), _pin.text.trim()),
                    child: session.loading ? const CircularProgressIndicator() : const Text('Ingresar'),
                  )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
