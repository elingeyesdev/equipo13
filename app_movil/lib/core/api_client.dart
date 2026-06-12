import 'package:dio/dio.dart';
import 'config.dart';
import 'api_exception.dart';

typedef TokenProvider = Future<String?> Function();
typedef OnUnauthorized = void Function();

class ApiClient {
  final Dio dio;
  final TokenProvider tokenProvider;
  final OnUnauthorized? onUnauthorized;

  ApiClient({required this.tokenProvider, this.onUnauthorized})
      : dio = Dio(BaseOptions(
          baseUrl: AppConfig.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokenProvider();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (e, handler) {
        if (e.response?.statusCode == 401) onUnauthorized?.call();
        handler.next(e);
      },
    ));
  }

  Future<dynamic> _unwrap(Future<Response> req) async {
    try {
      final res = await req;
      return res.data;
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['error'] != null
          ? e.response!.data['error'] as String
          : (e.message ?? 'Error de red');
      throw ApiException(msg, statusCode: e.response?.statusCode);
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _unwrap(dio.get(path, queryParameters: query));

  Future<dynamic> post(String path, {dynamic data}) =>
      _unwrap(dio.post(path, data: data));
}
