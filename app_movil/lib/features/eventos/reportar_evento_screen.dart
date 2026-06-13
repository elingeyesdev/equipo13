import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
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
    if (_tipo == 'pesaje') {
      final p = double.tryParse(_pesoCtrl.text);
      if (p == null || p <= 0) return 'Ingresá un peso promedio válido (mayor a 0).';
    } else if (_tipo == 'baja') {
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
      } else if (_tipo == 'pesaje') {
        payload = {
          'peso_promedio': double.parse(_pesoCtrl.text),
        };
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reportar Evento')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _tipo,
              decoration: const InputDecoration(labelText: 'Tipo de Evento', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'incidente', child: Text('Incidente')),
                DropdownMenuItem(value: 'baja', child: Text('Baja/Muerte')),
                DropdownMenuItem(value: 'pesaje', child: Text('Pesaje Lote')),
                DropdownMenuItem(value: 'stock_bajo', child: Text('Stock Bajo')),
              ],
              onChanged: (v) => setState(() => _tipo = v!),
            ),
            const SizedBox(height: 16),
            
            if (_tipo == 'baja') ...[
              TextField(controller: _cabezasCtrl, decoration: const InputDecoration(labelText: 'Cabezas', border: OutlineInputBorder()), keyboardType: TextInputType.number),
              const SizedBox(height: 16),
              TextField(controller: _causaCtrl, decoration: const InputDecoration(labelText: 'Causa', border: OutlineInputBorder())),
              const SizedBox(height: 16),
              TextField(controller: _pesoCtrl, decoration: const InputDecoration(labelText: 'Peso estimado (kg)', border: OutlineInputBorder()), keyboardType: TextInputType.number),
            ],
            
            if (_tipo == 'pesaje') ...[
              TextField(controller: _pesoCtrl, decoration: const InputDecoration(labelText: 'Peso promedio (kg)', border: OutlineInputBorder()), keyboardType: TextInputType.number),
            ],

            if (_tipo == 'incidente') ...[
              TextField(controller: _causaCtrl, decoration: const InputDecoration(labelText: 'Categoría', border: OutlineInputBorder())),
              const SizedBox(height: 16),
              TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Descripción', border: OutlineInputBorder()), maxLines: 3),
            ],

            if (_tipo == 'stock_bajo') ...[
              TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Nombre Insumo', border: OutlineInputBorder())),
            ],

            const SizedBox(height: 24),
            Row(
              children: [
                ElevatedButton.icon(
                  onPressed: _tomarFoto,
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Añadir Evidencia'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _fotos.map((f) => Image.file(f, height: 80, width: 80, fit: BoxFit.cover)).toList(),
            ),
            
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
              child: _isLoading ? const CircularProgressIndicator() : const Text('Enviar Reporte'),
            )
          ],
        ),
      ),
    );
  }
}
