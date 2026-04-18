export interface ProductionStage {
  id: number;
  name: string;
  description: string | null;
  type: 'Industrial' | 'Biológico';
  sequence_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductionStagePayload {
  name: string;
  description: string | null;
  type: 'Industrial' | 'Biológico';
}

export interface UpdateProductionStagePayload {
  name: string;
  description: string | null;
  type: 'Industrial' | 'Biológico';
}

export interface ReorderPayload {
  id: number;
  sequence_order: number;
}
