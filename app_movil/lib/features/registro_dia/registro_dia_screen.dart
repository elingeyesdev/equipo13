import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/lote.dart';
import '../../models/hoja_vida.dart';
import 'registro_repository.dart';

class RegistroDiaScreen extends ConsumerStatefulWidget {
  final Lote lote;
  final String fecha;
  const RegistroDiaScreen({super.key, required this.lote, required this.fecha});
  @override
  ConsumerState<RegistroDiaScreen> createState() => _RegistroDiaScreenState();
}

class _RegistroDiaScreenState extends ConsumerState<RegistroDiaScreen> {
  List<Map<String, dynamic>> _insumos = [];
  final List<ItemRegistro> _items = [];
  final _notas = TextEditingController();
  Map<String, dynamic>? _detalle;
  bool _cargando = true;
  bool _confirmado = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final repo = ref.read(registroRepoProvider);
    _insumos = await repo.insumos();
    _detalle = await repo.detalleDia(widget.lote.id, widget.fecha);
    final reg = _detalle?['registro'];
    _confirmado = reg?['confirmado'] == true;
    setState(() => _cargando = false);
  }

  void _agregarItem() {
    if (_insumos.isEmpty) return;
    setState(() => _items.add(ItemRegistro(
      tipo: 'insumo',
      insumoId: _insumos.first['id'],
      unidadId: _insumos.first['unidad_id'],
      cantidad: 0,
    )));
  }

  Future<void> _guardar() async {
    await ref.read(registroRepoProvider).guardarBorrador(
      widget.lote.id, widget.fecha, notas: _notas.text, items: _items);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Borrador guardado. El administrador lo confirmará.')));
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final estandar = _detalle?['estandar'];
    return Scaffold(
      appBar: AppBar(title: Text('Registro ${widget.fecha}')),
      body: _confirmado
          ? const Center(child: Padding(padding: EdgeInsets.all(24),
              child: Text('Este día ya fue confirmado por el administrador y no puede editarse.')))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (estandar != null && estandar['alimentacion'] != null)
                  Card(color: Colors.blue.shade50, child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text('Guía del día (estándar): ${estandar['alimentacion']}'))),
                const SizedBox(height: 8),
                ..._items.asMap().entries.map((entry) {
                  final i = entry.key; final item = entry.value;
                  return Card(child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Row(children: [
                      Expanded(flex: 3, child: DropdownButton<String>(
                        isExpanded: true,
                        value: item.insumoId,
                        items: _insumos.map((ins) => DropdownMenuItem(
                          value: ins['id'] as String, child: Text(ins['nombre']))).toList(),
                        onChanged: (v) {
                          final ins = _insumos.firstWhere((x) => x['id'] == v);
                          setState(() => _items[i] = ItemRegistro(
                            tipo: 'insumo', insumoId: v, unidadId: ins['unidad_id'], cantidad: item.cantidad));
                        },
                      )),
                      const SizedBox(width: 8),
                      Expanded(flex: 2, child: TextFormField(
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        initialValue: item.cantidad?.toString() ?? '',
                        decoration: const InputDecoration(labelText: 'Cantidad'),
                        onChanged: (v) => _items[i] = ItemRegistro(
                          tipo: 'insumo', insumoId: item.insumoId, unidadId: item.unidadId,
                          cantidad: double.tryParse(v)),
                      )),
                      IconButton(icon: const Icon(Icons.delete),
                        onPressed: () => setState(() => _items.removeAt(i))),
                    ]),
                  ));
                }),
                TextButton.icon(onPressed: _agregarItem,
                  icon: const Icon(Icons.add), label: const Text('Agregar insumo')),
                const SizedBox(height: 8),
                TextField(controller: _notas, maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Notas del día', border: OutlineInputBorder())),
                const SizedBox(height: 16),
                FilledButton(onPressed: _guardar, child: const Text('Guardar borrador')),
              ],
            ),
    );
  }
}
