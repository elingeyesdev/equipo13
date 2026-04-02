import React from 'react';
import { FileDown } from 'lucide-react';
import { UploadTab } from '../types';
import { downloadCsvTemplate } from '../api/bulkUploadService';

interface TemplateDownloadBannerProps {
  tab: UploadTab;
}

export const TemplateDownloadBanner: React.FC<TemplateDownloadBannerProps> = ({ tab }) => {
  const isIndustrial = tab === 'industrial';

  return (
    <div
      className={`rounded-xl p-4 flex items-start gap-3 border transition-colors ${
        isIndustrial
          ? 'bg-blue-50/50 border-blue-100'
          : 'bg-green-50/50 border-green-100'
      }`}
    >
      <FileDown
        size={18}
        className={`shrink-0 mt-0.5 ${isIndustrial ? 'text-professionalBlue' : 'text-agroGreen'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          ¿Necesitas el formato correcto?
        </p>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          Descarga la plantilla CSV para asegurarte de que tus datos cumplan con los campos requeridos
          por el sistema (
          <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px] border border-gray-200">
            batch_number
          </code>
          ,{' '}
          <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px] border border-gray-200">
            material_id
          </code>
          ,{' '}
          <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px] border border-gray-200">
            quantity
          </code>
          ).
        </p>
        <button
          onClick={() => downloadCsvTemplate(tab)}
          id="btn-download-template"
          className={`inline-flex items-center gap-1.5 text-sm font-bold hover:underline transition-colors ${
            isIndustrial ? 'text-professionalBlue hover:text-blue-900' : 'text-agroGreen hover:text-green-900'
          }`}
        >
          <FileDown size={14} />
          Descargar Plantilla CSV
        </button>
      </div>
    </div>
  );
};
