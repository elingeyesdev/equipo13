import React, { useCallback, useRef, useState } from 'react';
import { CloudUpload, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
import { UploadTab } from '../types';

interface DropZoneProps {
  tab: UploadTab;
  onFileAccepted: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  tab,
  onFileAccepted,
  selectedFile,
  onClear,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isIndustrial = tab === 'industrial';
  const activeColor = isIndustrial ? 'professionalBlue' : 'agroGreen';
  const activeBg = isIndustrial
    ? 'hover:border-professionalBlue/60 hover:bg-blue-50/60'
    : 'hover:border-agroGreen/60 hover:bg-green-50/60';
  const draggingBg = isIndustrial
    ? 'border-professionalBlue bg-blue-50/70'
    : 'border-agroGreen bg-green-50/70';
  const buttonColor = isIndustrial
    ? 'bg-professionalBlue hover:bg-blue-800'
    : 'bg-agroGreen hover:bg-green-800';
  const iconColor = isIndustrial ? 'text-professionalBlue' : 'text-agroGreen';
  const iconBg = isIndustrial ? 'bg-blue-100' : 'bg-green-100';

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
        onFileAccepted(file);
      }
    },
    [onFileAccepted]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileAccepted(file);
      }
    },
    [onFileAccepted]
  );

  if (selectedFile) {
    return (
      <div
        className={`border-2 border-dashed rounded-xl p-8 flex items-center gap-4 transition-all ${
          isIndustrial ? 'border-professionalBlue/40 bg-blue-50/50' : 'border-agroGreen/40 bg-green-50/50'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <FileSpreadsheet size={24} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{selectedFile.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {(selectedFile.size / 1024).toFixed(1)} KB · Listo para procesar
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle2 size={20} className={iconColor} />
          <button
            onClick={onClear}
            title="Eliminar archivo"
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all group ${
        isDragging
          ? draggingBg + ' border-solid scale-[1.01]'
          : `border-gray-300 bg-gray-50/50 ${activeBg}`
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={handleInputChange}
        id="bulk-file-input"
      />

      <div
        className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform`}
      >
        <CloudUpload size={28} className={iconColor} />
      </div>

      <p className="text-sm font-semibold text-gray-900 mb-1">
        {isIndustrial
          ? 'Arrastra tu archivo CSV de insumos aquí'
          : 'Arrastra tu archivo CSV de lotes biológicos aquí'}
      </p>
      <p className="text-xs text-gray-500 mb-6">
        o haz clic para seleccionar · Formatos: .csv, .xlsx · Máx. 50MB
      </p>

      <button
        type="button"
        className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all active:scale-95 pointer-events-none ${buttonColor}`}
      >
        Seleccionar Archivo
      </button>
    </div>
  );
};
