export type MaterialType = 'Industrial' | 'Biológico';

export interface Material {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  type: MaterialType;
  primary_unit_id: string;
  primary_unit_name?: string | null;
  primary_unit_abbreviation?: string | null;
  cost_standard: string | number | null;
  stage: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMaterialPayload {
  id: string;
  name: string;
  type: MaterialType;
  primary_unit_id: string;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  cost_standard?: number | null;
  stage?: string | null;
}

export type UpdateMaterialPayload = Omit<CreateMaterialPayload, 'id'>;
