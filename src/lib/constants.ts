export const DEFAULT_GOAL = {
  kcal: 2000,
  protein_g: 150,
  fat_g: 65,
  carbs_g: 230,
  fiber_g: 40,
} as const;

export interface NutrientSnapshot {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  _name: string;
  _source: 'off' | 'usda' | 'llm_estimate' | 'custom' | 'favorite' | 'recommendation';
}

export const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
};
