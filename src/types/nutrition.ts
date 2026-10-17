export type UnitType = 'g' | 'servings' | 'serving';

export interface Food {
  name: string;
  unitUsedInLog: 'g' | 'servings';
  servingSizeG: number;
  calories: number;
  nutrients: Record<string, number>; // Header like "Fat (g)", "Vitamin A (µg)"
}

export interface MealComponent {
  mealName: string;
  component: string;
  quantity: number;
  unit: 'g' | 'servings';
}

export interface Meal {
  name: string;
  components: MealComponent[];
}

export interface DailyValues {
  calories: number | null;
  nutrients: Record<string, number | null>; // Header -> target value or null if empty
}

export interface FoodLogDay {
  date: string; // Formatted as MM/DD/YYYY (or M/D/YYYY)
  entries: Record<string, number>; // itemName -> quantity
}

export type BreakdownType = 'food_log' | 'specific_item';

export interface BreakdownSelection {
  type: BreakdownType;
  date: string; // MM/DD/YYYY
  itemName: string;
  quantity: number;
  unit: UnitType;
}

export interface TreeNode {
  id: string;
  label: string;
  calories: number;
  isExpandable: boolean;
  children?: TreeNode[];
}

export type UploadFileType = 'Foods' | 'Meals' | 'Daily Values' | 'Food Log';

export type MergeOption = 'merge' | 'replace';

export interface UploadedFileState {
  file: File;
  content: string;
  fileName: string;
  fileType: UploadFileType;
  mergeOption: MergeOption;
  initialValidationErrors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface NutrientMetadata {
  header: string;
  name: string;
  unit: string;
}
