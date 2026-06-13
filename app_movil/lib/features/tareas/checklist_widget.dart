import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      setState(() {
        _cargar();
      });
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
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final items = snap.data!;
        if (items.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('No hay rutina asignada para hoy.', style: TextStyle(color: Colors.grey)),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('Checklist de hoy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ...items.map((item) {
              return CheckboxListTile(
                title: Text(item['titulo'] as String, style: TextStyle(decoration: item['completado'] == true ? TextDecoration.lineThrough : null)),
                value: item['completado'] == true,
                onChanged: (bool? val) => _toggle(item['id'] as String),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                dense: true,
              );
            }),
            const Divider(),
          ],
        );
      },
    );
  }
}
