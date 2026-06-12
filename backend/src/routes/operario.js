import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { injectNegocio } from '../middleware/injectNegocio.js';
import { requireLoteAsignado } from '../middleware/membership.js';
import { misLotes, miPerfil, listarInsumosOperario } from '../controllers/operarioAppController.js';
import {
  getVistaMensual, getDetalleDia, guardarRegistroDia, getEstandarDelDia,
} from '../controllers/hojaVidaController.js';

const router = Router();

// Todas las rutas exigen token de operario; injectNegocio fija :negocioId.
router.use(authMiddleware, injectNegocio);

router.get('/perfil',  miPerfil);
router.get('/lotes',   misLotes);
router.get('/insumos', listarInsumosOperario);

// Hoja de vida (reusa controllers existentes; guard de asignación por lote)
router.get('/lotes/:loteId/estandar',                requireLoteAsignado, getEstandarDelDia);
router.get('/lotes/:loteId/hoja-de-vida',            requireLoteAsignado, getVistaMensual);
router.get('/lotes/:loteId/hoja-de-vida/:fecha',     requireLoteAsignado, getDetalleDia);
// Guardar BORRADOR (no confirma; el admin confirma desde la web)
router.post('/lotes/:loteId/hoja-de-vida/:fecha',    requireLoteAsignado, guardarRegistroDia);

export default router;
