export interface Category {
  id: number;
  name: string;
  description?: string;
  target_module: 'Units' | 'Materials';
  type: 'Industrial' | 'Biológico';
  created_at?: string;
  updated_at?: string;
}

export type CategoryFormData = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
