import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../config/api';

export function useRecomendaciones(negocioId, loteId) {
  const [items, setItems] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modo, setModo] = useState('heuristico');
  const [metaModelos, setMetaModelos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [recId, setRecId] = useState(null);
  const [horizonte, setHorizonte] = useState(7);

  const cargar = useCallback(async () => {
    if (!negocioId || !loteId) return;
    setCargando(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/recomendaciones?loteId=${loteId}&horizonte=${horizonte}`);
      setItems(data.items || []); 
      setResumen(data.resumen || null); 
      setModo(data.modo || 'heuristico');
      setRecId(data.id || null);
      
      const meta = await apiFetch(`/api/negocios/${negocioId}/recomendaciones/meta`);
      setMetaModelos(meta || []);
      
      const hist = await apiFetch(`/api/negocios/${negocioId}/precios-historico`);
      setHistorico(hist || []);

      try {
        const alts = await apiFetch(`/api/negocios/${negocioId}/alertas-precio`);
        setAlertas(alts?.alertas || []);
      } catch (errAlerts) {
        console.warn('Error loading alerts', errAlerts);
        setAlertas([]);
      }

    } catch (e) { 
      console.error(e); 
      setError(e.message || 'Error de conexión al motor de Machine Learning.');
    }
    setCargando(false);
  }, [negocioId, loteId, horizonte]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    items,
    resumen,
    modo,
    metaModelos,
    historico,
    alertas,
    cargando,
    error,
    recId,
    horizonte,
    setHorizonte,
    recargar: cargar
  };
}
