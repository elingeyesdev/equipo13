import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(session.negocioNombre ?? 'Mis lotes', overflow: TextOverflow.ellipsis),
            const Text('Mis lotes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textTertiary)),
          ],
        ),
        actions: [
          tareasAsync.when(
            data: (t) => IconButton(
              tooltip: 'Mis tareas',
              icon: Badge(
                label: Text('${t.length}'),
                isLabelVisible: t.isNotEmpty,
                backgroundColor: AppColors.danger,
                child: const Icon(Icons.assignment_outlined),
              ),
              onPressed: () => context.push('/tareas'),
            ),
            loading: () => const IconButton(icon: Icon(Icons.assignment_outlined), onPressed: null),
            error: (e, stackTrace) => const IconButton(icon: Icon(Icons.assignment_outlined), onPressed: null),
          ),
          IconButton(
            tooltip: 'Mi actividad',
            icon: const Icon(Icons.history_rounded),
            onPressed: () => context.push('/mi-actividad'),
          ),
          IconButton(
            tooltip: 'Salir',
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(sessionProvider.notifier).logout(),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => ref.refresh(misLotesProvider.future),
        child: lotesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (e, _) => ListView(children: [
            Padding(
              padding: const EdgeInsets.all(24),
              child: EmptyState(icon: Icons.cloud_off_rounded, title: 'No se pudieron cargar tus lotes', subtitle: '$e'),
            ),
          ]),
          data: (lotes) => lotes.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 80),
                  EmptyState(icon: Icons.pets_rounded, title: 'No tenés lotes asignados', subtitle: 'Pedile al administrador que te asigne un lote desde el panel.'),
                ])
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  itemCount: lotes.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (c, i) => _LoteCard(lote: lotes[i]),
                ),
        ),
      ),
    );
  }
}

class _LoteCard extends StatelessWidget {
  final dynamic lote;
  const _LoteCard({required this.lote});

  @override
  Widget build(BuildContext context) {
    final l = lote;
    Widget statusWidget;
    if (l.confirmadoHoy) {
      statusWidget = const StatusPill(label: 'Hoy', color: AppColors.success, bg: AppColors.successBg, icon: Icons.check_circle_rounded);
    } else if (l.tieneRegistroHoy) {
      statusWidget = const StatusPill(label: 'Borrador', color: AppColors.warning, bg: AppColors.warningBg, icon: Icons.edit_note_rounded);
    } else {
      statusWidget = const StatusPill(label: 'Pendiente', color: AppColors.textSecondary, bg: AppColors.surfaceMuted, icon: Icons.schedule_rounded);
    }

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/lote/${l.id}', extra: l),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                height: 46,
                width: 46,
                decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.pets_rounded, color: AppColors.primaryDark, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${l.identificador}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text('${l.tipoAnimal}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                        const Text('  ·  ', style: TextStyle(color: AppColors.textTertiary)),
                        Icon(Icons.groups_rounded, size: 14, color: AppColors.textTertiary),
                        const SizedBox(width: 3),
                        Text('${l.cabezasActivas} activas', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  statusWidget,
                  const SizedBox(height: 8),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
