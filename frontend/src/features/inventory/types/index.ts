export interface InventoryBatch {
  id: number;
  batch_number: string;
  material_id: string;
  quantity: string | number;
  location: string | null;
  acquisition_cost: string | number | null;
  entry_date: string | null;
  initial_weight: string | number | null;
  created_at: string;
  
  // Joined fields
  material_name: string;
  material_type: 'Industrial' | 'Biológico';
  primary_unit_id: string;
  unit_abbreviation: string;
}
