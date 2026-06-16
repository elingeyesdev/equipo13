import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import 'tareas_repository.dart';

class TareasScreen extends ConsumerStatefulWidget {
  const TareasScreen({super.key});

  @override
  ConsumerState<TareasScreen> createState() => _TareasScreenState();
}

class _TareasScreenState extends ConsumerState<TareasScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    _future = ref.read(tareasRepoProvider).misTareas();
  }

  Future<void> _completar(String id) async {
    try {
      await ref.read(tareasRepoProvider).completarTarea(id);
      setState(_cargar);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tarea completada ✓')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis tareas')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          final tareas = snap.data!;
          if (tareas.isEmpty) {
            return const EmptyState(
              icon: Icons.task_alt_rounded,
              title: '¡Todo al día!',
              subtitle: 'No tenés tareas pendientes por ahora.',
            );
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => setState(_cargar),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: tareas.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _TareaCard(tarea: tareas[i], onComplete: _completar),
            ),
          );
        },
      ),
    );
  }
}

class _TareaCard extends StatelessWidget {
  final Map<String, dynamic> tarea;
  final Future<void> Function(String) onComplete;
  const _TareaCard({required this.tarea, required this.onComplete});

  @override
  Widget build(BuildContext context) {
    final t = tarea;
    final fecha = t['fecha_objetivo']?.toString();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 2),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.checklist_rtl_rounded, color: AppColors.primaryDark, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t['titulo'] as String,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    if (t['descripcion'] != null) ...[
                      const SizedBox(height: 4),
                      Text(t['descripcion'] as String, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (t['lote_identificador'] != null || fecha != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                if (t['lote_identificador'] != null)
                  StatusPill(label: 'Lote ${t['lote_identificador']}', color: AppColors.info, bg: AppColors.infoBg, icon: Icons.pets_rounded),
                if (fecha != null)
                  StatusPill(label: 'Límite ${fecha.substring(0, 10)}', color: AppColors.warning, bg: AppColors.warningBg, icon: Icons.event_rounded),
              ],
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => onComplete(t['id'] as String),
              icon: const Icon(Icons.check_rounded, size: 20),
              label: const Text('Marcar completada'),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 46)),
            ),
          ),
        ],
      ),
    );
  }
}
