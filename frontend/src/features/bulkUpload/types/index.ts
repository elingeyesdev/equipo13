export type UploadTab = 'industrial' | 'biological';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  type: AlertType;
  title: string;
  message: string;
}

/** Row shape expected by POST /api/inventory/bulk */
export interface InventoryRecord {
  batch_number: string;
  material_id: string;
  quantity: number;
  [key: string]: unknown;
}

/** Response from POST /api/inventory/bulk */
export interface BulkUploadResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: InventoryRecord[];
  skipped?: string[];   // batch_numbers que ya existían en la BD
}

/** One parsed row from CSV (all string values before conversion) */
export type CsvRow = Record<string, string>;
