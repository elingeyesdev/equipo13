import { apiClient } from '../../../api/axiosConfig';
import { BulkUploadResult, InventoryRecord, UploadTab } from '../types';

/**
 * Sends a parsed array of inventory records to the backend bulk endpoint.
 * Endpoint: POST /api/inventory/bulk
 */
export const bulkUploadService = {
  upload: async (records: InventoryRecord[]): Promise<BulkUploadResult> => {
    const response = await apiClient.post('/inventory/bulk', records);
    return response.data;
  },
};

/**
 * Generates and triggers a CSV template download in the browser.
 * No backend call — file is created client-side.
 */
export const downloadCsvTemplate = (tab: UploadTab): void => {
  const industrialHeaders = ['batch_number', 'material_id', 'quantity'];
  const industrialExample = [
    ['LOTE-001', 'RM-001', '100'],
    ['LOTE-002', 'RM-002', '50'],
    ['LOTE-003', 'RM-003', '200'],
  ];

  const biologicalHeaders = ['batch_number', 'material_id', 'quantity'];
  const biologicalExample = [
    ['LOT-BIO-001', 'BIO-001', '25'],
    ['LOT-BIO-002', 'BIO-002', '12'],
    ['LOT-BIO-003', 'BIO-003', '500'],
  ];

  const headers = tab === 'industrial' ? industrialHeaders : biologicalHeaders;
  const rows = tab === 'industrial' ? industrialExample : biologicalExample;

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = tab === 'industrial'
    ? 'plantilla_inventario_industrial.csv'
    : 'plantilla_inventario_biologico.csv';
  link.click();
  URL.revokeObjectURL(url);
};

import { read, utils } from 'xlsx';

/**
 * Parses a File (CSV or XLSX) into an array of typed InventoryRecord objects.
 * Supports cases where pseudo-CSVs contain comma-separated strings inside a single Excel cell.
 */
export const parseFile = async (file: File): Promise<InventoryRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // The read function supports ArrayBuffer natively
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to a 2D array [row][col]
        const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
        if (!rows || rows.length < 2) return resolve([]);

        let headers: string[] = [];
        let dataRows: any[][] = [];

        const firstRowFirstCol = String(rows[0][0] || '');
        
        // Si Excel cargó un CSV mal separado por punto y coma/coma y todo quedó en la columna A:
        if (rows[0].length === 1 && firstRowFirstCol.includes(',')) {
          headers = firstRowFirstCol.split(',').map((h) => h.trim());
          for (let i = 1; i < rows.length; i++) {
            const cellStr = String(rows[i][0] || '');
            if (!cellStr.trim()) continue;
            dataRows.push(cellStr.split(',').map((v) => v.trim()));
          }
        } else {
          // Es un formato de columnas nativo válido
          headers = rows[0].map((h) => String(h).trim());
          dataRows = rows.slice(1);
        }

        const records: InventoryRecord[] = [];
        for (const values of dataRows) {
          if (!values || values.length === 0) continue;
          
          const row: Record<string, unknown> = {};
          headers.forEach((header, idx) => {
            const rawVal = values[idx];
            const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
            // Cast 'quantity' to number, everything else stays string
            row[header] = header === 'quantity' ? Number(valStr) : valStr;
          });
          
          // No empujar líneas completamente vacías, deben tener al menos batch_number
          if (row['batch_number']) {
            records.push(row as InventoryRecord);
          }
        }

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
