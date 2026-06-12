// Copia el negocio_id del token del operario a req.params para reusar
// los controllers que esperan :negocioId en la ruta.
export function injectNegocio(req, res, next) {
  if (req.user && req.user.negocio_id) {
    req.params.negocioId = req.user.negocio_id;
  }
  next();
}
