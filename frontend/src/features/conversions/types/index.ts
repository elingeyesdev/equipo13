export interface UnitConversion {
  id: string;
  source_unit_id: string;
  target_unit_id: string;
  factor: number;
  type: 'Industrial' | 'Biológico' | null;
  note: string | null;
  
  // Relations returned by the backend GET endpoints
  source_unit_name?: string;
  source_unit_abbrev?: string;
  target_unit_name?: string;
  target_unit_abbrev?: string;
}

export interface CreateConversionDTO {
  source_unit_id: string;
  target_unit_id: string;
  factor: number;
  type?: 'Industrial' | 'Biológico' | null;
  note?: string;
}

export interface UpdateConversionDTO {
  source_unit_id: string;
  target_unit_id: string;
  factor: number;
  type?: 'Industrial' | 'Biológico' | null;
  note?: string;
}
