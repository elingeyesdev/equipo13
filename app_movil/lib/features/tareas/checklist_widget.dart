import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import 'tareas_repository.dart';

class ChecklistWidget extends ConsumerStatefulWidget {
  final String loteId;
  const ChecklistWidget({super.key, required this.loteId});

  @override
  ConsumerState<ChecklistWidget> createState() => _ChecklistWidgetState();
}

class _ChecklistWidgetState extends ConsumerState<ChecklistWidget> {
  late Future<List<Map<String, dynamic>>> _future;
  final String fechaHoy = DateTime.now().toIso8601String().split('T')[0];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    _future = ref.read(tareasRepoProvider).checklistDia(widget.loteId, fechaHoy);
  }

  Future<void> _toggle(String id) async {
    try {
      await ref.read(tareasRepoProvider).toggleChecklist(id);
      setState(_cargar);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _future,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          );
        }
        final items = snap.data!;
        if (items.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: const [
                Icon(Icons.event_available_rounded, size: 18, color: AppColors.textTertiary),
                SizedBox(width: 10),
                Expanded(child: Text('No hay rutina asignada para hoy.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13))),
              ],
            ),
          );
        }

        final done = items.where((i) => i['completado'] == true).length;
        final total = items.length;
        final pct = total > 0 ? done / total : 0.0;

        return Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                child: Row(
                  children: [
                    const Icon(Icons.checklist_rounded, size: 18, color: AppColors.primaryDark),
                    const SizedBox(width: 8),
                    const Text('Checklist de hoy',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const Spacer(),
                    Text('$done/$total',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 6,
                    backgroundColor: AppColors.surfaceMuted,
                    valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              ...items.map((item) {
                final completado = item['completado'] == true;
                return InkWell(
                  onTap: () => _toggle(item['id'] as String),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          completado ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                          color: completado ? AppColors.primary : AppColors.textTertiary,
                          size: 22,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            item['titulo'] as String,
                            style: TextStyle(
                              fontSize: 14,
                              color: completado ? AppColors.textTertiary : AppColors.textPrimary,
                              decoration: completado ? TextDecoration.lineThrough : null,
                              decorationColor: AppColors.textTertiary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}
