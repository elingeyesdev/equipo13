import type { MaterialType } from '../../materials/types';

export interface BomListRow {
  id: number;
  product_id: string;
  name: string | null;
  base_quantity: string | number;
  template_id: number | null;
  created_at?: string;
  updated_at?: string;
  product_name: string;
  product_type: MaterialType;
  product_primary_unit_id?: string;
  product_unit_abbreviation?: string | null;
}

export interface BomItemRow {
  id: number;
  bom_id: number;
  stage_id: number;
  material_id: string;
  quantity: string | number;
  unit_id: string;
  note: string | null;
  stage_name: string;
  stage_sequence_order: number;
  stage_type: MaterialType;
  material_name: string;
  material_type: MaterialType;
  unit_name: string;
  unit_abbreviation: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BomDetail extends BomListRow {
  product_description?: string | null;
  product_primary_unit_id: string;
  product_unit_name: string;
  product_unit_abbreviation: string | null;
  items: BomItemRow[];
}

export interface CreateBomPayload {
  product_id: string;
  name?: string | null;
  base_quantity?: number;
  template_id?: number | null;
}

export interface UpdateBomPayload {
  name?: string | null;
  base_quantity?: number;
  template_id?: number | null;
}

export interface BomItemPayload {
  stage_id: number;
  material_id: string;
  quantity: number;
  unit_id: string;
  note?: string | null;
}
