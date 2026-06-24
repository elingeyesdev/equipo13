import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import 'evento_repository.dart';

class ReportarEventoScreen extends ConsumerStatefulWidget {
  final String loteId;
  const ReportarEventoScreen({super.key, required this.loteId});

  @override
  ConsumerState<ReportarEventoScreen> createState() => _ReportarEventoScreenState();
}

class _ReportarEventoScreenState extends ConsumerState<ReportarEventoScreen> {
  String _tipo = 'incidente';
  bool _isLoading = false;
  final List<File> _fotos = [];

  // Controllers para payload
  final _cabezasCtrl = TextEditingController();
  final _causaCtrl = TextEditingController();
  final _pesoCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  final _picker = ImagePicker();

  Future<void> _tomarFoto() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (photo != null) {
      setState(() {
        _fotos.add(File(photo.path));
      });
    }
  }

  // Devuelve un mensaje de error si el formulario no es válido, o null si lo es.
  String? _validar() {
    if (_tipo == 'baja') {
      final c = int.tryParse(_cabezasCtrl.text);
      if (c == null || c <= 0) return 'Ingresá la cantidad de cabezas (mayor a 0).';
      if (_causaCtrl.text.trim().isEmpty) return 'Ingresá la causa de la baja.';
    } else if (_tipo == 'incidente') {
      if (_descCtrl.text.trim().isEmpty) return 'Ingresá una descripción del incidente.';
    } else if (_tipo == 'stock_bajo') {
      if (_descCtrl.text.trim().isEmpty) return 'Ingresá el nombre del insumo.';
    }
    return null;
  }

  Future<void> _submit() async {
    final err = _validar();
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      return;
    }
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(eventoRepoProvider);
      List<String> urls = [];
      for (var f in _fotos) {
        final url = await repo.subirFoto(f.path);
        urls.add(url);
      }

      Map<String, dynamic> payload = {};
      if (_tipo == 'baja') {
        payload = {
          'cabezas': int.tryParse(_cabezasCtrl.text) ?? 1,
          'causa': _causaCtrl.text,
        };
        final pb = double.tryParse(_pesoCtrl.text);
        if (pb != null) payload['peso_baja'] = pb;
      } else if (_tipo == 'incidente') {
        payload = {
          'categoria': _causaCtrl.text,
          'descripcion': _descCtrl.text,
        };
      } else if (_tipo == 'stock_bajo') {
        payload = {
          'nombre': _descCtrl.text,
          'nivel': 'crítico',
        };
      }

      await repo.crearEvento(widget.loteId, _tipo, payload, urls);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_tipo == 'baja' ? 'Enviado, pendiente de aprobación' : 'Registrado'),
      ));
      context.pop();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  static const _tipos = [
    (value: 'incidente', label: 'Incidente', icon: Icons.warning_amber_rounded),
    (value: 'baja', label: 'Baja / Muerte', icon: Icons.heart_broken_rounded),
    (value: 'stock_bajo', label: 'Stock bajo', icon: Icons.inventory_2_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reportar evento')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _SectionLabel('Tipo de evento'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _tipos.map((t) {
                final selected = _tipo == t.value;
                return GestureDetector(
                  onTap: () => setState(() => _tipo = t.value),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: (MediaQuery.of(context).size.width - 32 - 10) / 2,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primaryLight : AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: selected ? 1.6 : 1),
                    ),
                    child: Row(
                      children: [
                        Icon(t.icon, size: 20, color: selected ? AppColors.primaryDark : AppColors.textSecondary),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(t.label,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: selected ? AppColors.primaryDark : AppColors.textPrimary,
                              )),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 22),
            const _SectionLabel('Detalles'),
            const SizedBox(height: 10),

            if (_tipo == 'baja') ...[
              TextField(controller: _cabezasCtrl, decoration: const InputDecoration(labelText: 'Cabezas', prefixIcon: Icon(Icons.numbers_rounded)), keyboardType: TextInputType.number),
              const SizedBox(height: 14),
              TextField(controller: _causaCtrl, decoration: const InputDecoration(labelText: 'Causa')),
              const SizedBox(height: 14),
              TextField(controller: _pesoCtrl, decoration: const InputDecoration(labelText: 'Peso estimado (kg)'), keyboardType: TextInputType.number),
            ],

            if (_tipo == 'incidente') ...[
              TextField(controller: _causaCtrl, decoration: const InputDecoration(labelText: 'Categoría')),
              const SizedBox(height: 14),
              TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Descripción', alignLabelWithHint: true), maxLines: 3),
            ],

            if (_tipo == 'stock_bajo') ...[
              TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Nombre del insumo', prefixIcon: Icon(Icons.label_outline_rounded))),
            ],

            const SizedBox(height: 22),
            const _SectionLabel('Evidencia fotográfica'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                ..._fotos.asMap().entries.map((e) => Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(e.value, height: 84, width: 84, fit: BoxFit.cover),
                    ),
                    Positioned(
                      top: 2,
                      right: 2,
                      child: GestureDetector(
                        onTap: () => setState(() => _fotos.removeAt(e.key)),
                        child: Container(
                          decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                          padding: const EdgeInsets.all(2),
                          child: const Icon(Icons.close_rounded, size: 16, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                )),
                GestureDetector(
                  onTap: _tomarFoto,
                  child: Container(
                    height: 84,
                    width: 84,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo_rounded, color: AppColors.textSecondary, size: 24),
                        SizedBox(height: 4),
                        Text('Añadir', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: _isLoading ? null : _submit,
              icon: _isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                  : const Icon(Icons.send_rounded),
              label: Text(_isLoading ? 'Enviando…' : 'Enviar reporte'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(),
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: AppColors.textTertiary));
  }
}
