import {
  DailyValues,
  Food,
  FoodLogDay,
  Meal,
  MealComponent,
  MergeOption,
  NutrientMetadata,
  TreeNode,
  ValidationResult,
} from '../types/nutrition';

// Parse CSV text into 2D array of strings
export function parseCSV(text: string): string[][] {
  if (!text || text.trim() === '') return [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
      currentRow.push(currentCell.trim());
      // Only push non-empty rows or if it's not a trailing blank line
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Convert 2D array back to CSV string
export function toCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
}

// Extract nutrient name and unit from header e.g. "Fat (g)" or "Vitamin A (µg)"
export function parseNutrientHeader(header: string): NutrientMetadata | null {
  // Regex strictly: <Nutrient Name> (<Unit>)
  // Nutrient name: English letters, digits, and spaces.
  // Unit: English letters and the μ symbol (or µ).
  const match = header.match(/^([a-zA-Z0-9 ]+)\s*\(([a-zA-Z\u00B5\u03BC]+)\)$/);
  if (!match) return null;
  return {
    header: header.trim(),
    name: match[1].trim(),
    unit: match[2].trim(),
  };
}

// Allowed name characters: English letters, digits, spaces, and punctuation: "'-,()/"
export function isValidName(name: string): boolean {
  if (!name || name.trim() === '') return false;
  const allowedPattern = /^[a-zA-Z0-9 '\-,()\/]+$/;
  return allowedPattern.test(name);
}

// --- INITIAL VALIDATIONS ---

export function validateInitialFoods(csvText: string): ValidationResult {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { valid: true, errors: [] }; // Empty files are considered valid
  }

  const errors: string[] = [];
  const headers = rows[0];

  // 1. First 4 headers must be "Food Name", "Unit Used in Log", "Serving Size (g)", "Calories (kcal)" in that order
  if (
    headers.length < 4 ||
    headers[0] !== 'Food Name' ||
    headers[1] !== 'Unit Used in Log' ||
    headers[2] !== 'Serving Size (g)' ||
    headers[3] !== 'Calories (kcal)'
  ) {
    errors.push(
      'The first 4 column headers must be "Food Name", "Unit Used in Log", "Serving Size (g)", and "Calories (kcal)", in that order.'
    );
  }

  // 2. All column headers to the right of Calories must strictly follow "<Nutrient Name> (<Unit>)"
  const nutrientHeaders = headers.slice(4);
  for (const nh of nutrientHeaders) {
    const meta = parseNutrientHeader(nh);
    if (!meta) {
      errors.push(
        `Column header "${nh}" does not follow the format "<Nutrient Name> (<Unit>)" with valid characters and unit.`
      );
    }
  }

  // 3. Nutrient columns "Fat", "Carbohydrates", and "Protein" must exist (in any order) and their units must be g.
  const parsedNutrients = nutrientHeaders.map((nh) => parseNutrientHeader(nh)).filter(Boolean) as NutrientMetadata[];
  const fatCol = parsedNutrients.find((n) => n.name === 'Fat');
  const carbCol = parsedNutrients.find((n) => n.name === 'Carbohydrates');
  const proteinCol = parsedNutrients.find((n) => n.name === 'Protein');

  if (!fatCol || fatCol.unit !== 'g') {
    errors.push('Nutrient column "Fat" must exist and its unit must be "g" (e.g. "Fat (g)").');
  }
  if (!carbCol || carbCol.unit !== 'g') {
    errors.push('Nutrient column "Carbohydrates" must exist and its unit must be "g" (e.g. "Carbohydrates (g)").');
  }
  if (!proteinCol || proteinCol.unit !== 'g') {
    errors.push('Nutrient column "Protein" must exist and its unit must be "g" (e.g. "Protein (g)").');
  }

  // 4-8. Row-level checks
  const foodNames = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const foodName = row[0] ?? '';
    const unitInLog = row[1] ?? '';
    const servingSizeStr = row[2] ?? '';

    // 4. Food names must be nonempty and allowed characters
    if (!isValidName(foodName)) {
      errors.push(`Row ${r + 1}: Food Name "${foodName}" contains invalid characters or is empty.`);
    }

    // 8. No duplicate food names
    if (foodNames.has(foodName)) {
      errors.push(`Row ${r + 1}: Duplicate food name "${foodName}".`);
    } else if (foodName) {
      foodNames.add(foodName);
    }

    // 5. Unit Used in Log must be "g" or "servings"
    if (unitInLog !== 'g' && unitInLog !== 'servings') {
      errors.push(`Row ${r + 1} (${foodName}): Unit Used in Log must be "g" or "servings", got "${unitInLog}".`);
    }

    // 6. Serving size must be nonempty, numeric, and positive
    const servingSize = parseFloat(servingSizeStr);
    if (isNaN(servingSize) || servingSize <= 0) {
      errors.push(`Row ${r + 1} (${foodName}): Serving Size must be a positive number, got "${servingSizeStr}".`);
    }

    // 7. All quantity values other than serving size must either be empty or numeric and nonnegative
    for (let c = 3; c < headers.length; c++) {
      const valStr = row[c] ?? '';
      if (valStr !== '') {
        const val = parseFloat(valStr);
        if (isNaN(val) || val < 0) {
          errors.push(
            `Row ${r + 1} (${foodName}), Column "${headers[c]}": Value must be numeric and non-negative, got "${valStr}".`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateInitialMeals(csvText: string): ValidationResult {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { valid: true, errors: [] }; // Empty files are considered valid
  }

  const errors: string[] = [];
  const headers = rows[0];

  // 1. Column headers must be Meal Name, Component, Quantity, Unit in that order, no additional columns
  if (
    headers.length !== 4 ||
    headers[0] !== 'Meal Name' ||
    headers[1] !== 'Component' ||
    headers[2] !== 'Quantity' ||
    headers[3] !== 'Unit'
  ) {
    errors.push('Column headers must be "Meal Name", "Component", "Quantity", and "Unit", with no additional columns.');
  }

  // Track contiguous meals and components within each meal
  const mealComponents = new Map<string, Set<string>>();
  let lastMealName = '';
  const seenMealOrder: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const mealName = row[0] ?? '';
    const component = row[1] ?? '';
    const quantityStr = row[2] ?? '';
    const unit = row[3] ?? '';

    // 2. All meal names must be nonempty and allowed characters
    if (!isValidName(mealName)) {
      errors.push(`Row ${r + 1}: Meal Name "${mealName}" contains invalid characters or is empty.`);
    }

    // 3. No fragmented / duplicate meal blocks
    if (mealName !== lastMealName) {
      if (mealComponents.has(mealName)) {
        errors.push(
          `Row ${r + 1}: Meal "${mealName}" appears again after another meal has started. All rows for a meal must be contiguous.`
        );
      } else {
        mealComponents.set(mealName, new Set());
        seenMealOrder.push(mealName);
      }
      lastMealName = mealName;
    }

    // 4. A meal may not list the same component more than once
    const comps = mealComponents.get(mealName);
    if (comps) {
      if (comps.has(component)) {
        errors.push(`Row ${r + 1}: Meal "${mealName}" lists component "${component}" more than once.`);
      } else {
        comps.add(component);
      }
    }

    // 5. All quantity values must be nonempty, numeric, and positive
    const qty = parseFloat(quantityStr);
    if (isNaN(qty) || qty <= 0) {
      errors.push(`Row ${r + 1} (${mealName}): Quantity must be a positive number, got "${quantityStr}".`);
    }

    // 6 & 7. Unit must be "g" or "servings"
    if (unit !== 'g' && unit !== 'servings') {
      errors.push(`Row ${r + 1} (${mealName}): Unit must be "g" or "servings", got "${unit}".`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateInitialDailyValues(csvText: string): ValidationResult {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { valid: true, errors: [] }; // Empty files are considered valid
  }

  const errors: string[] = [];
  const headers = rows[0];

  // Daily values is a single-row file (or at most row 1 for values)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < headers.length; c++) {
      const valStr = row[c] ?? '';
      if (valStr !== '') {
        const val = parseFloat(valStr);
        if (isNaN(val) || val < 0) {
          errors.push(
            `Row ${r + 1}, Column "${headers[c]}": Daily value must either be empty or numeric and non-negative, got "${valStr}".`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateInitialFoodLog(csvText: string): ValidationResult {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { valid: true, errors: [] }; // Empty files are considered valid
  }

  const errors: string[] = [];
  const headers = rows[0];

  // 1. First column header must be "Date"
  if (headers.length === 0 || headers[0] !== 'Date') {
    errors.push('The first column header must be "Date".');
  }

  // 2. All values in Date column must follow MM/DD/YYYY, leading zeroes optional
  // 3. All quantity values must either be empty or numeric and non-negative
  const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(19\d\d|20\d\d|21\d\d)$/;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const dateStr = row[0] ?? '';

    if (!dateRegex.test(dateStr)) {
      errors.push(`Row ${r + 1}: Date "${dateStr}" is invalid. It must follow format MM/DD/YYYY.`);
    }

    for (let c = 1; c < headers.length; c++) {
      const qtyStr = row[c] ?? '';
      if (qtyStr !== '') {
        const qty = parseFloat(qtyStr);
        if (isNaN(qty) || qty < 0) {
          errors.push(
            `Row ${r + 1}, Column "${headers[c]}": Quantity must be empty or numeric and non-negative, got "${qtyStr}".`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- FINAL VALIDATIONS ---

export function validateFinalIntegrity(
  foodsCSV: string,
  mealsCSV: string,
  dailyValuesCSV: string,
  foodLogCSV: string,
  mergeFoodsWarningData?: { hasWarning: boolean; newFoodsMissingMeta: string[]; newNutrientsMissingFoods: string[] }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const foodRows = parseCSV(foodsCSV);
  const mealRows = parseCSV(mealsCSV);
  const dvRows = parseCSV(dailyValuesCSV);
  const logRows = parseCSV(foodLogCSV);

  // Extract food names and metadata
  const foodNames = new Set<string>();
  const foodHeaders = foodRows.length > 0 ? foodRows[0] : [];
  for (let r = 1; r < foodRows.length; r++) {
    const fName = foodRows[r][0];
    if (fName) foodNames.add(fName);
  }

  // Group meals
  const mealNames = new Set<string>();
  const mealOrder: string[] = [];
  const mealComps = new Map<string, MealComponent[]>();

  for (let r = 1; r < mealRows.length; r++) {
    const row = mealRows[r];
    const mName = row[0];
    const comp = row[1];
    const qty = parseFloat(row[2]);
    const unit = row[3] as 'g' | 'servings';

    if (!mealNames.has(mName)) {
      mealNames.add(mName);
      mealOrder.push(mName);
      mealComps.set(mName, []);
    }
    mealComps.get(mName)!.push({
      mealName: mName,
      component: comp,
      quantity: qty,
      unit,
    });
  }

  // 1. No name may be shared between a Food in the Foods file and a Meal in the Meals file.
  for (const fName of foodNames) {
    if (mealNames.has(fName)) {
      errors.push(`Name conflict: "${fName}" cannot be both a Food and a Meal.`);
    }
  }

  // 3. For all rows in Meals file, each component must match a food listed in Foods or a meal listed in a previous row of Meals file
  // (after grouping all rows by meal without otherwise changing the order).
  const definedMealsSoFar = new Set<string>();

  for (const mName of mealOrder) {
    const comps = mealComps.get(mName) || [];
    for (const compItem of comps) {
      const cName = compItem.component;
      const isFood = foodNames.has(cName);
      const isPriorMeal = definedMealsSoFar.has(cName);

      if (!isFood && !isPriorMeal) {
        errors.push(
          `Meal "${mName}": Component "${cName}" must be a defined food or an earlier defined meal. It cannot reference future meals or itself.`
        );
      }

      // Unit check: If component is meal, unit must be "servings"
      if (isPriorMeal && compItem.unit !== 'servings') {
        errors.push(
          `Meal "${mName}": Component "${cName}" is a meal and must have unit "servings", got "${compItem.unit}".`
        );
      }
    }
    definedMealsSoFar.add(mName);
  }

  // 4. In Food Log file, each column header after "Date" must either be a food or a meal
  if (logRows.length > 0) {
    const logHeaders = logRows[0];
    for (let c = 1; c < logHeaders.length; c++) {
      const headerName = logHeaders[c];
      if (!foodNames.has(headerName) && !mealNames.has(headerName)) {
        errors.push(
          `Food Log header "${headerName}" is neither a defined Food in Foods file nor a Meal in Meals file.`
        );
      }
    }
  }

  // 5. Column headers in Daily Values must exactly match list of column headers in Foods after "Serving Size (g)" and in same order.
  if (dvRows.length > 0 && foodRows.length > 0) {
    const dvHeaders = dvRows[0];
    const foodHeadersAfterServing = foodHeaders.slice(3); // after index 2 ("Serving Size (g)") -> starting with Calories (kcal)
    if (dvHeaders.length !== foodHeadersAfterServing.length) {
      errors.push(
        `Daily Values headers count (${dvHeaders.length}) does not match Foods headers after Serving Size (${foodHeadersAfterServing.length}).`
      );
    } else {
      for (let i = 0; i < dvHeaders.length; i++) {
        if (dvHeaders[i] !== foodHeadersAfterServing[i]) {
          errors.push(
            `Daily Values header mismatch at position ${i + 1}: expected "${foodHeadersAfterServing[i]}", got "${dvHeaders[i]}".`
          );
        }
      }
    }
  }

  if (mergeFoodsWarningData?.hasWarning) {
    if (mergeFoodsWarningData.newFoodsMissingMeta.length > 0) {
      warnings.push(
        `The following new foods will be assumed to have a value of zero for missing metadata columns: ${mergeFoodsWarningData.newFoodsMissingMeta.join(', ')}`
      );
    }
    if (mergeFoodsWarningData.newNutrientsMissingFoods.length > 0) {
      warnings.push(
        `All non-included foods will be assumed to have a value of zero for newly added nutrient(s): ${mergeFoodsWarningData.newNutrientsMissingFoods.join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// --- MERGE LOGIC ---

export function mergeMealsCSV(currentCSV: string, uploadedCSV: string): string {
  const currentRows = parseCSV(currentCSV);
  const uploadedRows = parseCSV(uploadedCSV);

  if (uploadedRows.length === 0) return currentCSV;
  if (currentRows.length === 0) return uploadedCSV;

  const header = ['Meal Name', 'Component', 'Quantity', 'Unit'];

  // Parse current meals
  const currentMealOrder: string[] = [];
  const currentMealRows = new Map<string, string[][]>();

  for (let r = 1; r < currentRows.length; r++) {
    const row = currentRows[r];
    const mName = row[0];
    if (!currentMealRows.has(mName)) {
      currentMealRows.set(mName, []);
      currentMealOrder.push(mName);
    }
    currentMealRows.get(mName)!.push(row);
  }

  // Parse uploaded meals
  const uploadedMealOrder: string[] = [];
  const uploadedMealRows = new Map<string, string[][]>();

  for (let r = 1; r < uploadedRows.length; r++) {
    const row = uploadedRows[r];
    const mName = row[0];
    if (!uploadedMealRows.has(mName)) {
      uploadedMealRows.set(mName, []);
      uploadedMealOrder.push(mName);
    }
    uploadedMealRows.get(mName)!.push(row);
  }

  // Existing meals: Replace entire composition with uploaded
  // Missing meals: Do nothing
  // New meals: Append in uploaded order
  const resultRows: string[][] = [header];

  // First process current meals (replacing if uploaded exists, or keeping if missing)
  for (const mName of currentMealOrder) {
    if (uploadedMealRows.has(mName)) {
      const upRows = uploadedMealRows.get(mName)!;
      for (const ur of upRows) resultRows.push(ur);
    } else {
      const curRows = currentMealRows.get(mName)!;
      for (const cr of curRows) resultRows.push(cr);
    }
  }

  // Now append brand new meals from uploaded file
  for (const mName of uploadedMealOrder) {
    if (!currentMealRows.has(mName)) {
      const upRows = uploadedMealRows.get(mName)!;
      for (const ur of upRows) resultRows.push(ur);
    }
  }

  return toCSV(resultRows);
}

export function mergeCellBasedCSV(
  currentCSV: string,
  uploadedCSV: string,
  keyColumnIndex: number = 0
): {
  mergedCSV: string;
  newRowsList: string[];
  newColsList: string[];
} {
  const currentRows = parseCSV(currentCSV);
  const uploadedRows = parseCSV(uploadedCSV);

  if (uploadedRows.length === 0) return { mergedCSV: currentCSV, newRowsList: [], newColsList: [] };
  if (currentRows.length === 0) return { mergedCSV: uploadedCSV, newRowsList: [], newColsList: [] };

  const currentHeaders = [...currentRows[0]];
  const uploadedHeaders = [...uploadedRows[0]];

  // Determine merged columns
  const finalHeaders = [...currentHeaders];
  const newColsList: string[] = [];

  for (const uh of uploadedHeaders) {
    if (!finalHeaders.includes(uh)) {
      finalHeaders.push(uh);
      newColsList.push(uh);
    }
  }

  // Build key-indexed row map for current
  // Key: row[keyColumnIndex]
  const currentMap = new Map<string, Map<string, string>>();
  const currentRowOrder: string[] = [];

  for (let r = 1; r < currentRows.length; r++) {
    const row = currentRows[r];
    const key = row[keyColumnIndex] ?? '';
    currentRowOrder.push(key);
    const cellMap = new Map<string, string>();
    for (let c = 0; c < currentHeaders.length; c++) {
      cellMap.set(currentHeaders[c], row[c] ?? '');
    }
    currentMap.set(key, cellMap);
  }

  // Parse uploaded rows
  const newRowsList: string[] = [];
  const uploadedRowOrder: string[] = [];
  const uploadedMap = new Map<string, Map<string, string>>();

  for (let r = 1; r < uploadedRows.length; r++) {
    const row = uploadedRows[r];
    const key = row[keyColumnIndex] ?? '';
    uploadedRowOrder.push(key);
    const cellMap = new Map<string, string>();
    for (let c = 0; c < uploadedHeaders.length; c++) {
      cellMap.set(uploadedHeaders[c], row[c] ?? '');
    }
    uploadedMap.set(key, cellMap);
    if (!currentMap.has(key)) {
      newRowsList.push(key);
    }
  }

  // Construct merged rows
  // All rows in current order
  const finalRowOrder = [...currentRowOrder];
  for (const key of uploadedRowOrder) {
    if (!finalRowOrder.includes(key)) {
      finalRowOrder.push(key);
    }
  }

  const resultRows: string[][] = [finalHeaders];

  for (const key of finalRowOrder) {
    const rowCells: string[] = [];
    const curCellMap = currentMap.get(key);
    const upCellMap = uploadedMap.get(key);

    for (const h of finalHeaders) {
      if (upCellMap && upCellMap.has(h)) {
        // Existing cells or new cell from uploaded
        rowCells.push(upCellMap.get(h) ?? '');
      } else if (curCellMap && curCellMap.has(h)) {
        // Missing cell from uploaded: keep current value
        rowCells.push(curCellMap.get(h) ?? '');
      } else {
        // Default empty (e.g. new column for old row)
        rowCells.push('0');
      }
    }
    resultRows.push(rowCells);
  }

  return {
    mergedCSV: toCSV(resultRows),
    newRowsList,
    newColsList,
  };
}

// Special check for Foods file merge metadata unit consistency
export function checkFoodsMetadataUnitMatch(currentCSV: string, uploadedCSV: string): ValidationResult {
  const currentRows = parseCSV(currentCSV);
  const uploadedRows = parseCSV(uploadedCSV);

  if (currentRows.length === 0 || uploadedRows.length === 0) {
    return { valid: true, errors: [] };
  }

  const currentHeaders = currentRows[0].slice(4);
  const uploadedHeaders = uploadedRows[0].slice(4);

  const curMap = new Map<string, string>(); // nutrientName -> unit
  for (const h of currentHeaders) {
    const meta = parseNutrientHeader(h);
    if (meta) curMap.set(meta.name, meta.unit);
  }

  const errors: string[] = [];
  for (const h of uploadedHeaders) {
    const meta = parseNutrientHeader(h);
    if (meta && curMap.has(meta.name)) {
      const existingUnit = curMap.get(meta.name);
      if (existingUnit !== meta.unit) {
        errors.push(
          `Unit mismatch for nutrient "${meta.name}": existing unit is "${existingUnit}", uploaded unit is "${meta.unit}".`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- PARSE DOMAIN OBJECTS ---

export function parseFoodsFromCSV(csvText: string): Food[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const foods: Food[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = row[0];
    if (!name) continue;
    const unitUsedInLog = (row[1] as 'g' | 'servings') || 'servings';
    const servingSizeG = parseFloat(row[2]) || 1;
    const calories = parseFloat(row[3]) || 0;

    const nutrients: Record<string, number> = {};
    for (let c = 4; c < headers.length; c++) {
      const h = headers[c];
      nutrients[h] = parseFloat(row[c]) || 0;
    }

    foods.push({
      name,
      unitUsedInLog,
      servingSizeG,
      calories,
      nutrients,
    });
  }

  return foods;
}

export function parseMealsFromCSV(csvText: string): Meal[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const mealMap = new Map<string, MealComponent[]>();
  const mealOrder: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const mealName = row[0];
    const component = row[1];
    const quantity = parseFloat(row[2]) || 0;
    const unit = (row[3] as 'g' | 'servings') || 'servings';

    if (!mealName) continue;

    if (!mealMap.has(mealName)) {
      mealMap.set(mealName, []);
      mealOrder.push(mealName);
    }

    mealMap.get(mealName)!.push({
      mealName,
      component,
      quantity,
      unit,
    });
  }

  return mealOrder.map((name) => ({
    name,
    components: mealMap.get(name) || [],
  }));
}

export function parseDailyValuesFromCSV(csvText: string): DailyValues {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { calories: null, nutrients: {} };
  }

  const headers = rows[0];
  const values = rows[1];

  let calories: number | null = null;
  const nutrients: Record<string, number | null> = {};

  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    const valStr = values[c];
    const num = valStr !== undefined && valStr !== '' ? parseFloat(valStr) : null;

    if (h.startsWith('Calories')) {
      calories = num;
    } else {
      nutrients[h] = num;
    }
  }

  return { calories, nutrients };
}

export function parseFoodLogFromCSV(csvText: string): Map<string, FoodLogDay> {
  const rows = parseCSV(csvText);
  const logMap = new Map<string, FoodLogDay>();
  if (rows.length < 2) return logMap;

  const headers = rows[0];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawDate = row[0];
    if (!rawDate) continue;

    // Normalize date to M/D/YYYY for consistent keying
    const normalizedDate = normalizeDateString(rawDate);
    const entries: Record<string, number> = {};

    for (let c = 1; c < headers.length; c++) {
      const item = headers[c];
      const val = parseFloat(row[c]) || 0;
      if (val > 0) {
        entries[item] = val;
      }
    }

    logMap.set(normalizedDate, {
      date: normalizedDate,
      entries,
    });
  }

  return logMap;
}

export function foodLogToCSV(logMap: Map<string, FoodLogDay>, allItems: string[]): string {
  const sortedDates = Array.from(logMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const headers = ['Date', ...allItems];
  const rows: string[][] = [headers];

  for (const d of sortedDates) {
    const day = logMap.get(d)!;
    const row = [d];
    for (const item of allItems) {
      const qty = day.entries[item];
      row.push(qty !== undefined && qty > 0 ? String(qty) : '');
    }
    rows.push(row);
  }

  return toCSV(rows);
}

export function normalizeDateString(dateStr: string): string {
  // Normalize date format M/D/YYYY to MM/DD/YYYY or vice versa
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
      return `${m}/${d}/${y}`;
    }
  }
  return dateStr;
}

export function formatDateToDisplay(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[0], 10) - 1;
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

// Convert YYYY-MM-DD (from input type="date") to M/D/YYYY
export function isoDateToMDY(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

// Convert M/D/YYYY to YYYY-MM-DD (for input type="date")
export function mdyToISODate(mdy: string): string {
  const parts = mdy.split('/');
  if (parts.length === 3) {
    const m = parts[0].padStart(2, '0');
    const d = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return '';
}

// --- TREE DECOMPOSITION & NUTRIENT AGGREGATION ---

export interface CalculatedNutrients {
  calories: number;
  nutrients: Record<string, number>;
}

export function calculateItemNutrients(
  itemName: string,
  quantity: number,
  unit: 'g' | 'servings',
  foods: Map<string, Food>,
  meals: Map<string, Meal>
): CalculatedNutrients {
  let calories = 0;
  const nutrients: Record<string, number> = {};

  const addNutrients = (subCal: number, subNutrients: Record<string, number>) => {
    calories += subCal;
    for (const [k, v] of Object.entries(subNutrients)) {
      nutrients[k] = (nutrients[k] || 0) + v;
    }
  };

  if (foods.has(itemName)) {
    const food = foods.get(itemName)!;
    const scale = unit === 'g' ? quantity / food.servingSizeG : quantity;
    const cal = scale * food.calories;
    const nut: Record<string, number> = {};
    for (const [k, v] of Object.entries(food.nutrients)) {
      nut[k] = v * scale;
    }
    addNutrients(cal, nut);
  } else if (meals.has(itemName)) {
    const meal = meals.get(itemName)!;
    // Meal quantity is always in servings
    for (const comp of meal.components) {
      const compQty = comp.quantity * quantity;
      const sub = calculateItemNutrients(comp.component, compQty, comp.unit, foods, meals);
      addNutrients(sub.calories, sub.nutrients);
    }
  }

  return { calories, nutrients };
}

export function calculateDailyLogNutrients(
  day: FoodLogDay | undefined,
  foods: Map<string, Food>,
  meals: Map<string, Meal>
): CalculatedNutrients {
  let calories = 0;
  const nutrients: Record<string, number> = {};

  if (!day) return { calories, nutrients };

  for (const [itemName, loggedQty] of Object.entries(day.entries)) {
    if (loggedQty <= 0) continue;
    let unit: 'g' | 'servings' = 'servings';
    if (foods.has(itemName)) {
      unit = foods.get(itemName)!.unitUsedInLog;
    }
    const itemResult = calculateItemNutrients(itemName, loggedQty, unit, foods, meals);
    calories += itemResult.calories;
    for (const [k, v] of Object.entries(itemResult.nutrients)) {
      nutrients[k] = (nutrients[k] || 0) + v;
    }
  }

  return { calories, nutrients };
}

// Generate the complete hierarchical Food Breakdown Tree
export function generateFoodBreakdownTree(
  breakdownForText: string,
  itemName: string | null,
  quantity: number,
  unit: 'g' | 'servings',
  dateStr: string | null,
  dayLog: FoodLogDay | undefined,
  foods: Map<string, Food>,
  meals: Map<string, Meal>
): TreeNode {
  if (dateStr) {
    // Breakdown for Food Log on date
    const displayDate = formatDateToDisplay(dateStr);
    const rootLabel = `Food Breakdown for ${displayDate}`;
    let totalCalories = 0;
    const children: TreeNode[] = [];

    if (dayLog) {
      for (const [item, qty] of Object.entries(dayLog.entries)) {
        if (qty <= 0) continue;
        const itemUnit: 'g' | 'servings' = foods.has(item) ? foods.get(item)!.unitUsedInLog : 'servings';
        const node = createItemNode(item, qty, itemUnit, foods, meals, `day-${item}`);
        totalCalories += node.calories;
        children.push(node);
      }
    }

    return {
      id: 'root',
      label: rootLabel,
      calories: Math.round(totalCalories * 10) / 10,
      isExpandable: true,
      children,
    };
  }

  // Specific item breakdown
  if (itemName) {
    const isFood = foods.has(itemName);
    const unitLabel = unit === 'servings' ? (quantity === 1 ? 'serving' : 'servings') : 'g';
    const rootLabel = `Food Breakdown for ${quantity} ${unitLabel} ${itemName}`;

    const innerNode = createItemNode(itemName, quantity, unit, foods, meals, 'root-item');

    return {
      id: 'root',
      label: rootLabel,
      calories: Math.round(innerNode.calories * 10) / 10,
      isExpandable: true,
      children: innerNode.isExpandable ? innerNode.children : [innerNode],
    };
  }

  return {
    id: 'root',
    label: breakdownForText,
    calories: 0,
    isExpandable: false,
  };
}

function createItemNode(
  itemName: string,
  quantity: number,
  unit: 'g' | 'servings',
  foods: Map<string, Food>,
  meals: Map<string, Meal>,
  path: string
): TreeNode {
  if (foods.has(itemName)) {
    const food = foods.get(itemName)!;
    if (unit === 'g') {
      // Terminal text node: already in grams! e.g. "148g Blueberries" or "150g Apple"
      const cal = (quantity / food.servingSizeG) * food.calories;
      return {
        id: path,
        label: `${quantity}g ${itemName}`,
        calories: Math.round(cal * 10) / 10,
        isExpandable: false,
      };
    } else {
      // Specified in servings: expandable node that expands into "<X>g <FoodName>"
      const grams = Math.round(quantity * food.servingSizeG * 100) / 100;
      const cal = quantity * food.calories;
      const unitLabel = quantity === 1 ? 'serving' : 'servings';
      return {
        id: path,
        label: `${quantity} ${unitLabel} ${itemName}`,
        calories: Math.round(cal * 10) / 10,
        isExpandable: true,
        children: [
          {
            id: `${path}-g`,
            label: `${grams}g ${itemName}`,
            calories: Math.round(cal * 10) / 10,
            isExpandable: false,
          },
        ],
      };
    }
  } else if (meals.has(itemName)) {
    const meal = meals.get(itemName)!;
    let mealCal = 0;
    const children: TreeNode[] = [];

    for (let i = 0; i < meal.components.length; i++) {
      const comp = meal.components[i];
      const compQty = comp.quantity * quantity;
      const childNode = createItemNode(comp.component, compQty, comp.unit, foods, meals, `${path}-c${i}`);
      mealCal += childNode.calories;
      children.push(childNode);
    }

    const unitLabel = quantity === 1 ? 'serving' : 'servings';
    return {
      id: path,
      label: `${quantity} ${unitLabel} ${itemName}`,
      calories: Math.round(mealCal * 10) / 10,
      isExpandable: true,
      children,
    };
  }

  return {
    id: path,
    label: `${quantity} ${unit} ${itemName}`,
    calories: 0,
    isExpandable: false,
  };
}
