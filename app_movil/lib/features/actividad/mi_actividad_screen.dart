import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../eventos/evento_repository.dart';
import '../../models/evento.dart';

final misEventosProvider = FutureProvider<List<Evento>>((ref) async {
  final repo = ref.read(eventoRepoProvider);
  final data = await repo.misEventos();
  return data.map((e) => Evento.fromJson(e)).toList();
});

class MiActividadScreen extends ConsumerWidget {
  const MiActividadScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventosAsync = ref.watch(misEventosProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mi Actividad')),
      body: eventosAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(child: Text('Error: $err')),
        data: (eventos) {
          if (eventos.isEmpty) return const Center(child: Text('No hay actividad reciente'));
          return RefreshIndicator(
            onRefresh: () => ref.refresh(misEventosProvider.future),
            child: ListView.builder(
              itemCount: eventos.length,
              itemBuilder: (ctx, idx) {
                final ev = eventos[idx];
                return ListTile(
                  leading: Icon(
                    ev.tipo == 'incidente' ? Icons.warning :
                    ev.tipo == 'baja' ? Icons.health_and_safety :
                    ev.tipo == 'pesaje' ? Icons.monitor_weight : Icons.inventory,
                  ),
                  title: Text('${ev.tipo.toUpperCase()} - ${ev.loteIdentificador}'),
                  subtitle: Text(ev.createdAt.toString().split('.')[0]),
                  trailing: Chip(
                    label: Text(ev.estado),
                    backgroundColor: ev.estado == 'pendiente' ? Colors.orange[100] :
                                     ev.estado == 'aprobado' ? Colors.green[100] :
                                     ev.estado == 'rechazado' ? Colors.red[100] : Colors.blue[100],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
