export type TemplateType = 'Industrial' | 'Biológico';

export interface ProductionTemplate {
  id: number;
  name: string;
  description: string | null;
  type: TemplateType;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTemplatePayload {
  name: string;
  description: string | null;
  type: TemplateType;
}

export interface UpdateTemplatePayload extends CreateTemplatePayload {}
