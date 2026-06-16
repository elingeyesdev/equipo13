import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../models/lote.dart';
import '../../models/hoja_vida.dart';
import 'registro_repository.dart';
import '../tareas/checklist_widget.dart';

class DetalleLoteScreen extends ConsumerStatefulWidget {
  final Lote lote;
  const DetalleLoteScreen({super.key, required this.lote});
  @override
  ConsumerState<DetalleLoteScreen> createState() => _DetalleLoteScreenState();
}

class _DetalleLoteScreenState extends ConsumerState<DetalleLoteScreen> {
  late int anio;
  late int mes;
  late Future<List<DiaHojaVida>> _future;

  static const _meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    anio = now.year; mes = now.month;
    _cargar();
  }

  void _cargar() {
    _future = ref.read(registroRepoProvider).vistaMensual(widget.lote.id, anio, mes);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.lote.identificador, overflow: TextOverflow.ellipsis),
            Text('${widget.lote.tipoAnimal} · ${widget.lote.cabezasActivas} cabezas',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textTertiary)),
          ],
        ),
      ),
      body: FutureBuilder<List<DiaHojaVida>>(
        future: _future,
        builder: (c, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          final dias = snap.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            children: [
              ChecklistWidget(loteId: widget.lote.id),
              const SizedBox(height: 8),
              // Encabezado del mes
              Row(
                children: [
                  const Icon(Icons.calendar_month_rounded, size: 18, color: AppColors.textSecondary),
                  const SizedBox(width: 8),
                  Text('${_meses[mes - 1]} $anio',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                ],
              ),
              const SizedBox(height: 12),
              // Calendario
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: GridView.count(
                  crossAxisCount: 7,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                  children: dias.map((d) {
                    final bg = d.confirmado
                        ? AppColors.primary
                        : d.tieneRegistro
                            ? AppColors.warningBg
                            : AppColors.surfaceMuted;
                    final fg = d.confirmado
                        ? Colors.white
                        : d.tieneRegistro
                            ? AppColors.warning
                            : AppColors.textSecondary;
                    final border = d.tieneRegistro && !d.confirmado
                        ? Border.all(color: AppColors.warning.withValues(alpha: 0.45))
                        : null;
                    return InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () async {
                        await context.push('/lote/${widget.lote.id}/dia/${d.fecha}', extra: widget.lote);
                        setState(_cargar);
                      },
                      child: Container(
                        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10), border: border),
                        child: Center(
                          child: Text('${d.diaDelMes}',
                              style: TextStyle(color: fg, fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 14),
              // Leyenda
              const Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  _LegendDot(color: AppColors.primary, label: 'Confirmado'),
                  _LegendDot(color: AppColors.warningBg, border: AppColors.warning, label: 'Borrador'),
                  _LegendDot(color: AppColors.surfaceMuted, label: 'Sin registro'),
                ],
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/lote/${widget.lote.id}/evento'),
        icon: const Icon(Icons.campaign_rounded),
        label: const Text('Reportar evento'),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final Color? border;
  final String label;
  const _LegendDot({required this.color, this.border, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          height: 14,
          width: 14,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
            border: border != null ? Border.all(color: border!) : null,
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
      ],
    );
  }
}
