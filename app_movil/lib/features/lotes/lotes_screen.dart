import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import 'lotes_repository.dart';
import '../tareas/tareas_repository.dart';

class LotesScreen extends ConsumerWidget {
  const LotesScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lotesAsync = ref.watch(misLotesProvider);
    final session = ref.watch(sessionProvider);
    final tareasAsync = ref.watch(misTareasProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(session.negocioNombre ?? 'Mis lotes'),
        actions: [
          tareasAsync.when(
            data: (t) => IconButton(
              icon: Badge(
                label: Text('${t.length}'),
                isLabelVisible: t.isNotEmpty,
                child: const Icon(Icons.assignment),
              ),
              onPressed: () => context.push('/tareas'),
            ),
            loading: () => const IconButton(icon: Icon(Icons.assignment), onPressed: null),
            error: (e, stackTrace) => const IconButton(icon: Icon(Icons.assignment), onPressed: null),
          ),
          IconButton(icon: const Icon(Icons.history),
            onPressed: () => context.push('/mi-actividad')),
          IconButton(icon: const Icon(Icons.logout),
            onPressed: () => ref.read(sessionProvider.notifier).logout()),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(misLotesProvider.future),
        child: lotesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: [Padding(padding: const EdgeInsets.all(24), child: Text('Error: $e'))]),
          data: (lotes) => lotes.isEmpty
              ? ListView(children: const [Padding(padding: EdgeInsets.all(24), child: Text('No tienes lotes asignados.'))])
              : ListView.separated(
                  itemCount: lotes.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (c, i) {
                    final l = lotes[i];
                    return ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.pets)),
                      title: Text('${l.identificador} · ${l.tipoAnimal}'),
                      subtitle: Text('${l.cabezasActivas} cabezas activas'),
                      trailing: l.confirmadoHoy
                          ? const Chip(label: Text('Hoy ✓'))
                          : l.tieneRegistroHoy
                              ? const Chip(label: Text('Borrador'))
                              : const Icon(Icons.chevron_right),
                      onTap: () => context.push('/lote/${l.id}', extra: l),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
