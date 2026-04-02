export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  base_unit_id: string | null;
  base_unit_name?: string | null;
  category: 'Industrial' | 'Biológico';
  created_at?: string;
}

export type CreateUnitPayload = Omit<Unit, 'created_at' | 'base_unit_name'>;
export type UpdateUnitPayload = Omit<CreateUnitPayload, 'id'>;
