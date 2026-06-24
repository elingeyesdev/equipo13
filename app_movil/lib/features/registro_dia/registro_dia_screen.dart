import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
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
  final _items = <ItemRegistro>[];
  final _notas = TextEditingController();
  final _pesoCtrl = TextEditingController();
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
    _notas.text = reg?['notas_del_dia'] ?? '';
    if (reg?['peso_promedio_kg'] != null) {
      _pesoCtrl.text = reg!['peso_promedio_kg'].toString();
    }
    // Precargar los ítems del borrador existente: si no, abrir un día ya
    // registrado mostraría el formulario vacío y al guardar borraría todo.
    final existentes = reg?['items'];
    if (existentes is List) {
      for (final raw in existentes) {
        final it = raw as Map<String, dynamic>;
        _items.add(ItemRegistro(
          tipo: (it['tipo'] as String?) ?? 'insumo',
          insumoId: it['insumo_id'] as String?,
          cantidad: _toDouble(it['cantidad']),
          unidadId: it['unidad_id'] as String?,
          servicioNombre: it['servicio_nombre'] as String?,
          costoServicio: _toDouble(it['costo_servicio']),
          realizadoPor: it['realizado_por'] as String?,
        ));
      }
    }
    setState(() => _cargando = false);
  }

  double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
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
    try {
      await ref.read(registroRepoProvider).guardarBorrador(
        widget.lote.id, widget.fecha,
        notas: _notas.text,
        pesoPromedioKg: _toDouble(_pesoCtrl.text),
        items: _items,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Borrador guardado. El administrador lo confirmará.')));
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo guardar: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    final estandar = _detalle?['estandar'];
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Registro del día', overflow: TextOverflow.ellipsis),
            Text('${widget.lote.identificador} · ${widget.fecha}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textTertiary)),
          ],
        ),
      ),
      body: _confirmado
          ? const EmptyState(
              icon: Icons.lock_rounded,
              title: 'Día confirmado',
              subtitle: 'Este día ya fue confirmado por el administrador y no puede editarse.',
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                if (estandar != null && estandar['alimentacion'] != null)
                  Container(
                    padding: const EdgeInsets.all(14),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: AppColors.infoBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border(left: BorderSide(color: AppColors.info, width: 3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.lightbulb_outline_rounded, size: 18, color: AppColors.info),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Guía del día (estándar)',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.info)),
                              const SizedBox(height: 2),
                              if (estandar['alimentacion'] is List)
                                ...(estandar['alimentacion'] as List).map((a) => Text(
                                  '• ${a['descripcion']}: ${a['cantidad_por_cabeza_kg']} kg/cab (${a['frecuencia']})',
                                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, height: 1.4),
                                )),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                const Padding(
                  padding: EdgeInsets.only(bottom: 8, left: 2),
                  child: Text('Insumos usados', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                ),
                if (_items.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('Todavía no agregaste insumos para este día.',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  ),
                ..._items.asMap().entries.map((entry) {
                  final i = entry.key; final item = entry.value;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(children: [
                      Expanded(flex: 3, child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          itemHeight: null, // Permite altura dinámica para textos largos
                          value: item.insumoId,
                          borderRadius: BorderRadius.circular(12),
                          items: _insumos.map((ins) => DropdownMenuItem(
                            value: ins['id'] as String,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Text(ins['nombre'], style: const TextStyle(height: 1.2)),
                            ),
                          )).toList(),
                          onChanged: (v) {
                            final ins = _insumos.firstWhere((x) => x['id'] == v);
                            setState(() => _items[i] = ItemRegistro(
                              tipo: 'insumo', insumoId: v, unidadId: ins['unidad_id'], cantidad: item.cantidad));
                          },
                        ),
                      )),
                      const SizedBox(width: 8),
                      Expanded(flex: 2, child: TextFormField(
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        initialValue: item.cantidad?.toString() ?? '',
                        decoration: const InputDecoration(
                          labelText: 'Cantidad',
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        ),
                        onChanged: (v) => _items[i] = ItemRegistro(
                          tipo: 'insumo', insumoId: item.insumoId, unidadId: item.unidadId,
                          cantidad: double.tryParse(v)),
                      )),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                        onPressed: () => setState(() => _items.removeAt(i)),
                      ),
                    ]),
                  );
                }),
                const SizedBox(height: 4),
                OutlinedButton.icon(
                  onPressed: _agregarItem,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Agregar insumo'),
                ),
                const SizedBox(height: 18),
                TextField(controller: _pesoCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Peso promedio del lote (kg) - Opcional', prefixIcon: Icon(Icons.scale_rounded))),
                const SizedBox(height: 14),
                TextField(controller: _notas, maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Notas del día', alignLabelWithHint: true)),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: _guardar,
                  icon: const Icon(Icons.save_rounded),
                  label: const Text('Guardar borrador'),
                ),
                const SizedBox(height: 10),
                const Center(
                  child: Text('El administrador confirmará el registro.',
                      style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                ),
              ],
            ),
    );
  }
}
