import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_DAILY_VALUES_CSV,
  INITIAL_FOOD_LOG_CSV,
  INITIAL_FOODS_CSV,
  INITIAL_MEALS_CSV,
} from '../data/initialData';
import {
  BreakdownSelection,
  DailyValues,
  Food,
  FoodLogDay,
  Meal,
  MergeOption,
  UploadFileType,
  ValidationResult,
} from '../types/nutrition';
import {
  checkFoodsMetadataUnitMatch,
  foodLogToCSV,
  isoDateToMDY,
  mdyToISODate,
  mergeCellBasedCSV,
  mergeMealsCSV,
  normalizeDateString,
  parseDailyValuesFromCSV,
  parseFoodLogFromCSV,
  parseFoodsFromCSV,
  parseMealsFromCSV,
  validateFinalIntegrity,
  validateInitialDailyValues,
  validateInitialFoodLog,
  validateInitialFoods,
  validateInitialMeals,
} from '../utils/csv';

export interface StagedUpload {
  fileType: UploadFileType;
  fileName: string;
  content: string;
  mergeOption: MergeOption;
}

interface NutritionContextType {
  // Raw CSVs
  foodsCSV: string;
  mealsCSV: string;
  dailyValuesCSV: string;
  foodLogCSV: string;

  // Parsed data
  foods: Map<string, Food>;
  meals: Map<string, Meal>;
  dailyValues: DailyValues;
  foodLog: Map<string, FoodLogDay>;
  foodNames: string[];
  mealNames: string[];
  allItemNames: string[];

  // Food Log Entry state
  loggingDate: string; // M/D/YYYY
  setLoggingDate: (date: string) => void;
  logItem: (itemName: string, quantity: number, unit: 'g' | 'servings') => void;
  deleteLogItem: (date: string, itemName: string) => void;

  // Nutrient Breakdown state
  breakdown: BreakdownSelection;
  setBreakdown: React.Dispatch<React.SetStateAction<BreakdownSelection>>;

  // Upload & Download workflow
  applyUploadedFiles: (staged: StagedUpload[]) => {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
  resetToSampleData: () => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

function getInitialTodayDate(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const y = now.getFullYear();
  return `${m}/${d}/${y}`;
}

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [foodsCSV, setFoodsCSV] = useState<string>(() => {
    return localStorage.getItem('vitaminarian_foods_csv') || INITIAL_FOODS_CSV;
  });
  const [mealsCSV, setMealsCSV] = useState<string>(() => {
    return localStorage.getItem('vitaminarian_meals_csv') || INITIAL_MEALS_CSV;
  });
  const [dailyValuesCSV, setDailyValuesCSV] = useState<string>(() => {
    return localStorage.getItem('vitaminarian_dv_csv') || INITIAL_DAILY_VALUES_CSV;
  });
  const [foodLogCSV, setFoodLogCSV] = useState<string>(() => {
    return localStorage.getItem('vitaminarian_log_csv') || INITIAL_FOOD_LOG_CSV;
  });

  const todayStr = useMemo(() => getInitialTodayDate(), []);

  // Logging Date (MM/DD/YYYY)
  const [loggingDate, setLoggingDateState] = useState<string>(todayStr);

  // Breakdown Selection
  const [breakdown, setBreakdown] = useState<BreakdownSelection>({
    type: 'food_log',
    date: todayStr,
    itemName: 'Apple',
    quantity: 1,
    unit: 'serving',
  });

  // Keep localStorage updated
  useEffect(() => {
    try {
      localStorage.setItem('vitaminarian_foods_csv', foodsCSV);
      localStorage.setItem('vitaminarian_meals_csv', mealsCSV);
      localStorage.setItem('vitaminarian_dv_csv', dailyValuesCSV);
      localStorage.setItem('vitaminarian_log_csv', foodLogCSV);
    } catch {
      // Ignore storage errors in restricted mode
    }
  }, [foodsCSV, mealsCSV, dailyValuesCSV, foodLogCSV]);

  // Parsed memoized data
  const foods = useMemo(() => {
    const list = parseFoodsFromCSV(foodsCSV);
    const map = new Map<string, Food>();
    for (const f of list) map.set(f.name, f);
    return map;
  }, [foodsCSV]);

  const meals = useMemo(() => {
    const list = parseMealsFromCSV(mealsCSV);
    const map = new Map<string, Meal>();
    for (const m of list) map.set(m.name, m);
    return map;
  }, [mealsCSV]);

  const dailyValues = useMemo(() => {
    return parseDailyValuesFromCSV(dailyValuesCSV);
  }, [dailyValuesCSV]);

  const foodNames = useMemo(() => Array.from(foods.keys()), [foods]);
  const mealNames = useMemo(() => Array.from(meals.keys()), [meals]);
  const allItemNames = useMemo(() => [...foodNames, ...mealNames], [foodNames, mealNames]);

  const foodLog = useMemo(() => {
    return parseFoodLogFromCSV(foodLogCSV);
  }, [foodLogCSV]);

  // Synchronize when logging date changes
  const setLoggingDate = (date: string) => {
    setLoggingDateState(date);
    // "When the user selects a new date for the Food Log Entry Date Picker,
    // "Food Log" is automatically selected for the Nutrient Breakdown Dropdown
    // and the same date is automatically selected for this date picker."
    setBreakdown((prev) => ({
      ...prev,
      type: 'food_log',
      date: date,
    }));
  };

  // Log item to current date
  const logItem = (itemName: string, quantity: number, unit: 'g' | 'servings') => {
    if (quantity <= 0) return;

    // Convert quantity to log unit if needed
    // "The unit for the quantity values in each row is determined by the Unit Used in Log
    // value in the Foods file for foods; the unit is assumed to be servings for meals."
    let loggedQty = quantity;
    if (foods.has(itemName)) {
      const food = foods.get(itemName)!;
      if (unit === 'servings' && food.unitUsedInLog === 'g') {
        loggedQty = quantity * food.servingSizeG;
      } else if (unit === 'g' && food.unitUsedInLog === 'servings') {
        loggedQty = quantity / food.servingSizeG;
      }
    }

    const currentMap = new Map(foodLog);
    const normDate = normalizeDateString(loggingDate);
    const existingDay = currentMap.get(normDate) || { date: normDate, entries: {} };

    const newEntries = { ...existingDay.entries };
    newEntries[itemName] = (newEntries[itemName] || 0) + loggedQty;

    currentMap.set(normDate, {
      date: normDate,
      entries: newEntries,
    });

    const newCSV = foodLogToCSV(currentMap, allItemNames);
    setFoodLogCSV(newCSV);
  };

  // Delete logged item
  const deleteLogItem = (date: string, itemName: string) => {
    const normDate = normalizeDateString(date);
    const currentMap = new Map(foodLog);
    const existingDay = currentMap.get(normDate);
    if (!existingDay) return;

    const newEntries = { ...existingDay.entries };
    delete newEntries[itemName];

    if (Object.keys(newEntries).length === 0) {
      currentMap.delete(normDate);
    } else {
      currentMap.set(normDate, { date: normDate, entries: newEntries });
    }

    const newCSV = foodLogToCSV(currentMap, allItemNames);
    setFoodLogCSV(newCSV);
  };

  // Upload workflow: apply staged uploads
  const applyUploadedFiles = (staged: StagedUpload[]) => {
    let candidateFoods = foodsCSV;
    let candidateMeals = mealsCSV;
    let candidateDV = dailyValuesCSV;
    let candidateLog = foodLogCSV;

    let foodsWarningData = {
      hasWarning: false,
      newFoodsMissingMeta: [] as string[],
      newNutrientsMissingFoods: [] as string[],
    };

    // First check Foods metadata unit consistency if Foods is merged
    const stagedFoods = staged.find((s) => s.fileType === 'Foods');
    if (stagedFoods && stagedFoods.mergeOption === 'merge') {
      const unitCheck = checkFoodsMetadataUnitMatch(foodsCSV, stagedFoods.content);
      if (!unitCheck.valid) {
        return {
          success: false,
          errors: unitCheck.errors,
          warnings: [],
        };
      }
    }

    // Apply merges or replacements in memory to candidate strings
    for (const s of staged) {
      if (s.fileType === 'Foods') {
        if (s.mergeOption === 'replace') {
          candidateFoods = s.content;
        } else {
          const res = mergeCellBasedCSV(candidateFoods, s.content, 0);
          candidateFoods = res.mergedCSV;
          if (res.newRowsList.length > 0 || res.newColsList.length > 0) {
            foodsWarningData.hasWarning = true;
            foodsWarningData.newFoodsMissingMeta = res.newRowsList;
            foodsWarningData.newNutrientsMissingFoods = res.newColsList;
          }
        }
      } else if (s.fileType === 'Meals') {
        if (s.mergeOption === 'replace') {
          candidateMeals = s.content;
        } else {
          candidateMeals = mergeMealsCSV(candidateMeals, s.content);
        }
      } else if (s.fileType === 'Daily Values') {
        if (s.mergeOption === 'replace') {
          candidateDV = s.content;
        } else {
          const res = mergeCellBasedCSV(candidateDV, s.content, 0);
          candidateDV = res.mergedCSV;
        }
      } else if (s.fileType === 'Food Log') {
        if (s.mergeOption === 'replace') {
          candidateLog = s.content;
        } else {
          const res = mergeCellBasedCSV(candidateLog, s.content, 0);
          candidateLog = res.mergedCSV;
        }
      }
    }

    // Run Final Validations across candidate dataset
    const finalValidation = validateFinalIntegrity(
      candidateFoods,
      candidateMeals,
      candidateDV,
      candidateLog,
      foodsWarningData
    );

    if (!finalValidation.valid) {
      return {
        success: false,
        errors: finalValidation.errors,
        warnings: finalValidation.warnings || [],
      };
    }

    // All final validations passed! Commit changes to state
    setFoodsCSV(candidateFoods);
    setMealsCSV(candidateMeals);
    setDailyValuesCSV(candidateDV);
    setFoodLogCSV(candidateLog);

    return {
      success: true,
      errors: [],
      warnings: finalValidation.warnings || [],
    };
  };

  const resetToSampleData = () => {
    setFoodsCSV(INITIAL_FOODS_CSV);
    setMealsCSV(INITIAL_MEALS_CSV);
    setDailyValuesCSV(INITIAL_DAILY_VALUES_CSV);
    setFoodLogCSV(INITIAL_FOOD_LOG_CSV);
  };

  return (
    <NutritionContext.Provider
      value={{
        foodsCSV,
        mealsCSV,
        dailyValuesCSV,
        foodLogCSV,
        foods,
        meals,
        dailyValues,
        foodLog,
        foodNames,
        mealNames,
        allItemNames,
        loggingDate,
        setLoggingDate,
        logItem,
        deleteLogItem,
        breakdown,
        setBreakdown,
        applyUploadedFiles,
        resetToSampleData,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};

export function useNutrition(): NutritionContextType {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
}
