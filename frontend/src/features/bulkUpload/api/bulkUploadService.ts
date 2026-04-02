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

/**
 * Parses a CSV string into an array of typed InventoryRecord objects.
 */
export const parseCsv = (csvText: string): InventoryRecord[] => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const records: InventoryRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length !== headers.length) continue;

    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const val = values[idx];
      // Cast 'quantity' to number, everything else stays string
      row[header] = header === 'quantity' ? Number(val) : val;
    });
    records.push(row as InventoryRecord);
  }

  return records;
};
