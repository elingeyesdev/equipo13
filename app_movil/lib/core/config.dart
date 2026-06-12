class AppConfig {
  // En emulador Android usa 10.0.2.2 para alcanzar el host.
  // Ajusta a la URL real del backend en despliegue.
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
}
