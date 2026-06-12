import 'package:flutter_test/flutter_test.dart';
import 'package:app_movil/models/lote.dart';
import 'package:app_movil/models/hoja_vida.dart';

void main() {
  test('Lote.fromJson', () {
    final l = Lote.fromJson({
      'id': 'l1', 'identificador': 'L-01', 'tipo_animal': 'Cerdo',
      'cabezas_activas': 100, 'tiene_registro_hoy': true, 'confirmado_hoy': false,
    });
    expect(l.identificador, 'L-01');
    expect(l.cabezasActivas, 100);
    expect(l.tieneRegistroHoy, true);
  });

  test('DiaHojaVida.fromJson con registro nulo', () {
    final d = DiaHojaVida.fromJson({
      'fecha': '2026-06-12', 'dia_del_mes': 12, 'dias_en_lote': 30,
      'fase': 'Engorde', 'confirmado': false, 'tiene_registro': false, 'registro': null,
    });
    expect(d.diaDelMes, 12);
    expect(d.tieneRegistro, false);
  });
}
