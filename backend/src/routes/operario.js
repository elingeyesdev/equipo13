import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { injectNegocio } from '../middleware/injectNegocio.js';
import { requireLoteAsignado } from '../middleware/membership.js';
import { misLotes, miPerfil, listarInsumosOperario } from '../controllers/operarioAppController.js';
import {
  getVistaMensual, getDetalleDia, guardarRegistroDia, getEstandarDelDia,
} from '../controllers/hojaVidaController.js';
import { uploadFoto, handleUpload } from '../controllers/uploadController.js';
import { crearEvento, misEventos } from '../controllers/eventoController.js';

const router = Router();

// Todas las rutas exigen token de operario.
router.use(authMiddleware);

// injectNegocio fija :negocioId desde el token. Debe aplicarse POR RUTA (no en
// un router.use aparte): Express reescribe req.params con los params de la ruta
// concreta al despachar el handler, así que el negocioId solo sobrevive si se
// inyecta dentro de la misma cadena de middleware de la ruta.
router.get('/perfil',  injectNegocio, miPerfil);
router.get('/lotes',   injectNegocio, misLotes);
router.get('/insumos', injectNegocio, listarInsumosOperario);

// Hoja de vida (reusa controllers existentes; guard de asignación por lote)
router.get('/lotes/:loteId/estandar',                injectNegocio, requireLoteAsignado, getEstandarDelDia);
router.get('/lotes/:loteId/hoja-de-vida',            injectNegocio, requireLoteAsignado, getVistaMensual);
router.get('/lotes/:loteId/hoja-de-vida/:fecha',     injectNegocio, requireLoteAsignado, getDetalleDia);
// Guardar BORRADOR (no confirma; el admin confirma desde la web)
router.post('/lotes/:loteId/hoja-de-vida/:fecha',    injectNegocio, requireLoteAsignado, guardarRegistroDia);

// Subida de fotos de evidencia
router.post('/upload', uploadFoto, handleUpload);

// Eventos (bajas, pesajes, incidentes, stock_bajo)
router.post('/lotes/:loteId/eventos', injectNegocio, requireLoteAsignado, crearEvento);
router.get('/eventos', injectNegocio, misEventos);

export default router;
