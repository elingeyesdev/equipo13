import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { CsvRow, UploadTab } from '../types';

interface PreviewTableProps {
  rows: CsvRow[];
  tab: UploadTab;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ rows, tab }) => {
  if (rows.length === 0) return null;

  const isIndustrial = tab === 'industrial';
  const headers = Object.keys(rows[0]);
  const preview = rows.slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-gray-400" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Vista Previa del Archivo</h3>
            <p className="text-xs text-gray-500">
              Mostrando {preview.length} de {rows.length} filas · Verifica que los datos sean correctos
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${
            isIndustrial
              ? 'bg-blue-50 text-professionalBlue ring-blue-200'
              : 'bg-green-50 text-agroGreen ring-green-200'
          }`}
        >
          {rows.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preview.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                {headers.map((h) => (
                  <td key={h} className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap font-mono">
                    {row[h] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 5 && (
        <div className="px-6 py-2.5 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            + {rows.length - 5} filas adicionales no mostradas
          </p>
        </div>
      )}
    </div>
  );
};
