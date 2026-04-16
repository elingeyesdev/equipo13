import React, { useCallback, useState } from 'react';
import {
  Factory,
  Leaf,
  CheckCircle2,
  Upload,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

import { DropZone } from '../components/DropZone';
import { AlertBanner } from '../components/AlertBanner';
import { PreviewTable } from '../components/PreviewTable';
import { DuplicatesModal } from '../components/DuplicatesModal';
import { TemplateDownloadBanner } from '../components/TemplateDownloadBanner';
import { bulkUploadService, parseFile } from '../api/bulkUploadService';
import { Alert, CsvRow, InventoryRecord, UploadTab } from '../types';

type Stage = 'idle' | 'preview' | 'uploading' | 'success' | 'error';

export const BulkUploadPage: React.FC = () => {
  const [tab, setTab] = useState<UploadTab>('industrial');
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultMessage, setResultMessage] = useState('');
  // Modal de duplicados
  const [duplicatesModal, setDuplicatesModal] = useState<{
    skipped: string[];
    insertedCount: number;
  } | null>(null);

  /* ── helpers ─────────────────────────────────────────── */
  const resetAll = () => {
    setStage('idle');
    setSelectedFile(null);
    setParsedRows([]);
    setRecords([]);
    setParseError(null);
    setAlert(null);
    setUploadProgress(0);
    setResultMessage('');
    setDuplicatesModal(null);
  };

  const switchTab = (t: UploadTab) => {
    resetAll();
    setTab(t);
  };

  /* ── file accepted ───────────────────────────────────── */
  const handleFileAccepted = useCallback(async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setAlert(null);

    try {
      const parsed = await parseFile(file);

      if (parsed.length === 0) {
        setParseError('El archivo no contiene filas de datos válidas. Verifica el formato.');
        setStage('idle');
        return;
      }

      // Validate required columns
      const required = ['batch_number', 'material_id', 'quantity'];
      const headers = Object.keys(parsed[0]);
      const missing = required.filter((r) => !headers.includes(r));

      if (missing.length > 0) {
        setParseError(
          `El archivo no contiene las columnas requeridas: ${missing.join(', ')}. Descarga la plantilla para ver el formato correcto.`
        );
        setStage('idle');
        return;
      }

      // Store both raw rows (for preview) and typed records (for upload)
      setParsedRows(parsed as CsvRow[]);
      setRecords(parsed);
      setStage('preview');
    } catch (err) {
      setParseError('No se pudo leer el archivo. Asegúrate de que sea un CSV válido.');
      setStage('idle');
    }
  }, []);

  /* ── submit ──────────────────────────────────────────── */
  const handleUpload = async () => {
    setStage('uploading');
    setAlert(null);

    // Simulate a progress animation while the request runs
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 20 + 5, 90);
      setUploadProgress(Math.round(prog));
    }, 250);

    try {
      const result = await bulkUploadService.upload(records);
      clearInterval(interval);
      setUploadProgress(100);

      if (result.success) {
        const msg = result.message ?? `${result.data?.length ?? records.length} registros insertados exitosamente.`;
        setResultMessage(msg);

        // Si hay duplicados → mostrar modal antes de pasar a éxito
        if (result.skipped && result.skipped.length > 0) {
          setDuplicatesModal({
            skipped: result.skipped,
            insertedCount: result.data?.length ?? 0,
          });
          setStage('preview'); // mantener la pantalla de preview de fondo
        } else {
          setStage('success');
        }
      } else {
        setAlert({
          type: 'error',
          title: 'Error del servidor',
          message: result.error ?? 'Ocurrió un error al procesar la carga masiva.',
        });
        setStage('preview');
      }
    } catch (err: any) {
      clearInterval(interval);
      setUploadProgress(0);
      const apiError =
        err?.response?.data?.error ??
        'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en localhost:3000.';
      setAlert({
        type: 'error',
        title: 'Error de conexión',
        message: apiError,
      });
      setStage('preview');
    }
  };

  /* ── modal confirm (cerrar modal → mostrar éxito) ─────── */
  const handleDuplicatesConfirm = () => {
    setDuplicatesModal(null);
    setStage('success');
  };

  const handleDuplicatesClose = () => {
    setDuplicatesModal(null);
    setStage('success'); // igual muestra éxito al cerrar
  };

  /* ── render ─────────────────────────────────────────── */
  const isIndustrial = tab === 'industrial';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">

      {/* Modal de duplicados (se muestra sobre todo si hay conflictos) */}
      {duplicatesModal && (
        <DuplicatesModal
          skipped={duplicatesModal.skipped}
          insertedCount={duplicatesModal.insertedCount}
          tab={tab}
          onConfirm={handleDuplicatesConfirm}
          onClose={handleDuplicatesClose}
        />
      )}

      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-fit">
        <button
          id="tab-industrial"
          onClick={() => switchTab('industrial')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            isIndustrial
              ? 'bg-[#1F2937] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Factory size={16} />
          Insumos Industriales
        </button>
        <button
          id="tab-biological"
          onClick={() => switchTab('biological')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            !isIndustrial
              ? 'bg-agroGreen text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Leaf size={16} />
          Activos Biológicos (Lotes)
        </button>
      </div>

      {/* Biological info banner */}
      {!isIndustrial && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-agroGreen/10 flex items-center justify-center shrink-0 mt-0.5">
            <Leaf className="text-agroGreen" size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-green-900">Hoja de Vida Financiera</p>
            <p className="text-sm text-green-700 mt-1">
              Cada lote registrado iniciará automáticamente su{' '}
              <span className="font-semibold">Hoja de Vida Financiera</span> desde la fecha de
              ingreso. Todos los costos de alimentación, sanidad e indirectos se acumularán sobre
              este registro base.
            </p>
          </div>
        </div>
      )}

      {/* Parse error alert */}
      {parseError && (
        <AlertBanner
          type="warning"
          title="Archivo no válido"
          message={parseError}
          onClose={() => setParseError(null)}
        />
      )}

      {/* API alert (success/error from backend) */}
      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* ── Upload Zone Card ─────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 space-y-6">

          {/* SUCCESS state */}
          {stage === 'success' ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  isIndustrial ? 'bg-blue-100 text-professionalBlue' : 'bg-green-100 text-agroGreen'
                }`}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Carga Exitosa!</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">{resultMessage}</p>
              <button
                id="btn-upload-again"
                onClick={resetAll}
                className="bg-[#1F2937] hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Cargar Otro Archivo
              </button>
            </div>
          ) : stage === 'uploading' ? (
            /* UPLOADING state */
            <div className="py-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Enviando {records.length} registros al servidor...
                </span>
                <span
                  className={`text-sm font-bold ${
                    isIndustrial ? 'text-professionalBlue' : 'text-agroGreen'
                  }`}
                >
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ease-out ${
                    isIndustrial ? 'bg-professionalBlue' : 'bg-agroGreen'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center animate-pulse">
                Validando datos y persistiendo en base de datos...
              </p>
            </div>
          ) : (
            /* IDLE / PREVIEW state */
            <>
              <DropZone
                tab={tab}
                onFileAccepted={handleFileAccepted}
                selectedFile={selectedFile}
                onClear={resetAll}
              />

              <TemplateDownloadBanner tab={tab} />

              {/* Preview table inline (preview stage) */}
              {stage === 'preview' && (
                <div className="mt-2 space-y-4">
                  <PreviewTable rows={parsedRows} tab={tab} />

                  {/* Confirm upload button */}
                  <div className="pt-2 flex items-center justify-between gap-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>
                        Revisa la vista previa antes de confirmar. Esta acción insertará{' '}
                        <span className="font-bold">{records.length} registros</span> en la base de datos.
                      </span>
                    </div>
                    <button
                      id="btn-confirm-upload"
                      onClick={handleUpload}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all active:scale-95 shrink-0 ${
                        isIndustrial
                          ? 'bg-professionalBlue hover:bg-blue-800'
                          : 'bg-agroGreen hover:bg-green-800'
                      }`}
                    >
                      <Upload size={16} />
                      Confirmar y Subir ({records.length})
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {/* Expected format table (shown only when idle) */}
      {stage === 'idle' && !parseError && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Formato Esperado del CSV</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tu archivo debe contener estas columnas exactamente con estos nombres
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr>
                  {['batch_number', 'material_id', 'quantity'].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(isIndustrial
                  ? [
                      ['LOTE-001', 'RM-001', '100'],
                      ['LOTE-002', 'RM-002', '50'],
                      ['LOTE-003', 'RM-003', '200'],
                    ]
                  : [
                      ['LOT-BIO-001', 'BIO-001', '25'],
                      ['LOT-BIO-002', 'BIO-002', '12'],
                      ['LOT-BIO-003', 'BIO-003', '500'],
                    ]
                ).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap font-mono"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
