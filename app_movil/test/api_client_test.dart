import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:app_movil/core/api_client.dart';

class _FakeAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? requestStream, Future<void>? cancelFuture) async {
    return ResponseBody.fromString('{"ok":true}', 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }
  @override
  void close({bool force = false}) {}
}

void main() {
  test('ApiClient adjunta y hace GET', () async {
    final client = ApiClient(tokenProvider: () async => 'abc');
    client.dio.httpClientAdapter = _FakeAdapter();
    final res = await client.get('/ping');
    expect(res['ok'], true);
  });
}
