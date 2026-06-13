import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
      appBar: AppBar(title: Text(widget.lote.identificador)),
      body: FutureBuilder<List<DiaHojaVida>>(
        future: _future,
        builder: (c, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final dias = snap.data!;
          return Column(
            children: [
              ChecklistWidget(loteId: widget.lote.id),
              Expanded(
                child: GridView.count(
                  crossAxisCount: 7,
                  padding: const EdgeInsets.all(8),
                  children: dias.map((d) {
                    final color = d.confirmado
                        ? Colors.green
                        : d.tieneRegistro ? Colors.amber : Colors.grey.shade200;
                    return InkWell(
                      onTap: () async {
                        await context.push('/lote/${widget.lote.id}/dia/${d.fecha}', extra: widget.lote);
                        setState(_cargar);
                      },
                      child: Container(
                        margin: const EdgeInsets.all(2),
                        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)),
                        child: Center(child: Text('${d.diaDelMes}')),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/lote/${widget.lote.id}/evento'),
        icon: const Icon(Icons.campaign),
        label: const Text('Reportar Evento'),
      ),
    );
  }
}
