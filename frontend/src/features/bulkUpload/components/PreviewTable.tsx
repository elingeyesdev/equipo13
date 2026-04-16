import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Table2,
} from 'lucide-react';
import { CsvRow, UploadTab } from '../types';

interface PreviewTableProps {
  rows: CsvRow[];
  tab: UploadTab;
}

const REQUIRED_COLUMNS = ['batch_number', 'material_id', 'quantity'];
const PAGE_SIZE = 10;

/* ── per-row validation ─────────────────────────────── */
type RowStatus = 'ok' | 'warning' | 'error';

function validateRow(row: CsvRow): { status: RowStatus; issues: string[] } {
  const issues: string[] = [];

  if (!row['batch_number'] || String(row['batch_number']).trim() === '') {
    issues.push('batch_number vacío');
  }
  if (!row['material_id'] || String(row['material_id']).trim() === '') {
    issues.push('material_id vacío');
  }
  const qty = Number(row['quantity']);
  if (isNaN(qty)) {
    issues.push('quantity no es número');
  } else if (qty <= 0) {
    issues.push('quantity ≤ 0');
  }

  if (issues.length === 0) return { status: 'ok', issues: [] };
  if (issues.length === 1) return { status: 'warning', issues };
  return { status: 'error', issues };
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ rows, tab }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const isIndustrial = tab === 'industrial';
  const accentColor = isIndustrial ? 'professionalBlue' : 'agroGreen';
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  /* ── search filter ─────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      headers.some((h) => String(row[h] ?? '').toLowerCase().includes(q))
    );
  }, [rows, search, headers]);

  /* ── pagination ───────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── stats ────────────────────────────────────────── */
  const stats = useMemo(() => {
    let ok = 0, warn = 0, errors = 0;
    rows.forEach((r) => {
      const { status } = validateRow(r);
      if (status === 'ok') ok++;
      else if (status === 'warning') warn++;
      else errors++;
    });
    return { ok, warn, errors };
  }, [rows]);

  if (rows.length === 0) return null;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

      {/* ── Header ─────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isIndustrial ? 'bg-blue-50' : 'bg-green-50'
              }`}
            >
              <FileSpreadsheet
                size={20}
                className={isIndustrial ? 'text-professionalBlue' : 'text-agroGreen'}
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Vista Previa del Archivo</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {filtered.length === rows.length
                  ? `${rows.length} filas detectadas · Revisa los datos antes de confirmar`
                  : `${filtered.length} de ${rows.length} filas (filtradas)`}
              </p>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 size={12} />
              {stats.ok} válidas
            </span>
            {stats.warn > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                <AlertTriangle size={12} />
                {stats.warn} advertencias
              </span>
            )}
            {stats.errors > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
                <XCircle size={12} />
                {stats.errors} errores
              </span>
            )}
          </div>
        </div>

        {/* ── Columns detected ───────────────────────── */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1">
            <Table2 size={12} className="inline mr-1" />
            Columnas:
          </span>
          {headers.map((h) => {
            const isRequired = REQUIRED_COLUMNS.includes(h);
            return (
              <span
                key={h}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                  isRequired
                    ? isIndustrial
                      ? 'bg-blue-50 text-professionalBlue border border-blue-200'
                      : 'bg-green-50 text-agroGreen border border-green-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
              >
                {isRequired && <CheckCircle2 size={10} />}
                {h}
              </span>
            );
          })}
        </div>

        {/* ── Search ─────────────────────────────────── */}
        <div className="mt-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="preview-search"
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Buscar en los datos..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/80 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">
                Estado
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                    REQUIRED_COLUMNS.includes(h) ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {h}
                  {REQUIRED_COLUMNS.includes(h) && (
                    <span className="ml-1 text-red-400 text-xs">*</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length + 2}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  No se encontraron resultados para "{search}"
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                const { status, issues } = validateRow(row);
                return (
                  <tr
                    key={globalIdx}
                    className={`transition-colors ${
                      status === 'error'
                        ? 'bg-red-50/40 hover:bg-red-50/70'
                        : status === 'warning'
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : 'hover:bg-gray-50/60'
                    }`}
                    title={issues.length > 0 ? issues.join(' · ') : undefined}
                  >
                    {/* Row number */}
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {globalIdx + 1}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      {status === 'ok' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 size={13} /> OK
                        </span>
                      ) : status === 'warning' ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 cursor-help"
                          title={issues.join(' · ')}
                        >
                          <AlertTriangle size={13} /> Alerta
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 cursor-help"
                          title={issues.join(' · ')}
                        >
                          <XCircle size={13} /> Error
                        </span>
                      )}
                    </td>

                    {/* Data cells */}
                    {headers.map((h) => {
                      const val = row[h];
                      const isEmpty =
                        val === undefined || val === null || String(val).trim() === '';
                      return (
                        <td
                          key={h}
                          className={`px-5 py-3 text-sm whitespace-nowrap font-mono ${
                            isEmpty ? 'text-red-400 italic' : 'text-gray-700'
                          }`}
                        >
                          {isEmpty ? '(vacío)' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ──────────────────────── */}
      <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Página{' '}
          <span className="font-semibold text-gray-700">{safePage}</span> de{' '}
          <span className="font-semibold text-gray-700">{totalPages}</span>
          {' · '}
          {filtered.length} filas
          {search && ` (filtradas de ${rows.length})`}
        </p>

        <div className="flex items-center gap-1">
          <button
            id="preview-prev-page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page numbers */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (safePage <= 3) {
              pageNum = i + 1;
            } else if (safePage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = safePage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                id={`preview-page-${pageNum}`}
                onClick={() => setPage(pageNum)}
                className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors ${
                  pageNum === safePage
                    ? isIndustrial
                      ? 'bg-professionalBlue text-white shadow-sm'
                      : 'bg-agroGreen text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            id="preview-next-page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
