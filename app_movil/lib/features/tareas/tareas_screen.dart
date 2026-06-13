import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      setState(() {
        _cargar();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tarea completada')));
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
      appBar: AppBar(title: const Text('Mis Tareas')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final tareas = snap.data!;
          if (tareas.isEmpty) {
            return const Center(child: Text('No tienes tareas pendientes.'));
          }
          return ListView.builder(
            itemCount: tareas.length,
            itemBuilder: (context, i) {
              final t = tareas[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(t['titulo'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (t['descripcion'] != null) Text(t['descripcion'] as String),
                      const SizedBox(height: 4),
                      if (t['lote_identificador'] != null) Text('Lote: ${t['lote_identificador']}', style: const TextStyle(color: Colors.blue)),
                      if (t['fecha_objetivo'] != null) Text('Límite: ${t['fecha_objetivo'].toString().substring(0, 10)}', style: const TextStyle(color: Colors.red)),
                    ],
                  ),
                  isThreeLine: true,
                  trailing: ElevatedButton(
                    onPressed: () => _completar(t['id'] as String),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                    child: const Text('Completar'),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
