import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../eventos/evento_repository.dart';
import '../../models/evento.dart';

final misEventosProvider = FutureProvider<List<Evento>>((ref) async {
  final repo = ref.read(eventoRepoProvider);
  final data = await repo.misEventos();
  return data.map((e) => Evento.fromJson(e)).toList();
});

class MiActividadScreen extends ConsumerWidget {
  const MiActividadScreen({super.key});

  ({IconData icon, Color color, Color bg}) _tipoStyle(String tipo) {
    switch (tipo) {
      case 'incidente':
        return (icon: Icons.warning_amber_rounded, color: AppColors.warning, bg: AppColors.warningBg);
      case 'baja':
        return (icon: Icons.heart_broken_rounded, color: AppColors.danger, bg: AppColors.dangerBg);
      case 'pesaje':
        return (icon: Icons.monitor_weight_rounded, color: AppColors.info, bg: AppColors.infoBg);
      default:
        return (icon: Icons.inventory_2_rounded, color: AppColors.textSecondary, bg: AppColors.surfaceMuted);
    }
  }

  ({Color color, Color bg}) _estadoStyle(String estado) {
    switch (estado) {
      case 'pendiente':
        return (color: AppColors.warning, bg: AppColors.warningBg);
      case 'aprobado':
        return (color: AppColors.success, bg: AppColors.successBg);
      case 'rechazado':
        return (color: AppColors.danger, bg: AppColors.dangerBg);
      default:
        return (color: AppColors.info, bg: AppColors.infoBg);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventosAsync = ref.watch(misEventosProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mi actividad')),
      body: eventosAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, st) => EmptyState(icon: Icons.cloud_off_rounded, title: 'No se pudo cargar', subtitle: '$err'),
        data: (eventos) {
          if (eventos.isEmpty) {
            return const EmptyState(
              icon: Icons.timeline_rounded,
              title: 'Sin actividad reciente',
              subtitle: 'Acá vas a ver los eventos que reportes.',
            );
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => ref.refresh(misEventosProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: eventos.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (ctx, idx) {
                final ev = eventos[idx];
                final ts = _tipoStyle(ev.tipo);
                final es = _estadoStyle(ev.estado);
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        height: 42,
                        width: 42,
                        decoration: BoxDecoration(color: ts.bg, borderRadius: BorderRadius.circular(11)),
                        child: Icon(ts.icon, color: ts.color, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(ev.tipo[0].toUpperCase() + ev.tipo.substring(1),
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                const SizedBox(width: 6),
                                Text('· ${ev.loteIdentificador}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(ev.createdAt.toString().split('.')[0],
                                style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                          ],
                        ),
                      ),
                      StatusPill(label: ev.estado, color: es.color, bg: es.bg),
                    ],
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
