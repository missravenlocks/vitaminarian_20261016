export const TUTORIAL_CONTENT = `# Welcome to Vitaminarian

**Vitaminarian** is an advanced, fully customizable nutrition tracking application engineered to provide transparent, granular visibility into your daily dietary intake.

### Important Notice Regarding Sample Data
*Please Note:* The sample **Foods**, **Meals**, and **Daily Values** files provided initially contain limited, illustrative, and likely irrelevant data for your unique lifestyle and biological requirements. You are highly encouraged to customize these files using the **Upload Data** and **Download Data** buttons to adapt the application to your unique dietary and nutritional needs.

---

### Application Architecture & Core Modules

#### 1. Upload & Download Data Module
* **Download Data:** Export your current databases anytime in standard CSV format (Foods.csv, Meals.csv, Daily Values.csv, Food Log.csv).
* **Upload Data:** Upload one or more CSV files. Each file undergoes rigorous Initial Validations (schema checking, positive serving sizes, allowed character sets, correct units).
* **Merge or Replace:** For each successfully uploaded file, choose between:
  - *Merge with existing:* Intelligently combines existing, new, and updated rows/columns.
  - *Replace existing:* Completely replaces the current dataset with your uploaded file.
* **Accept Changes:** Runs Final Validations cross-referencing all files to ensure complete referential integrity across foods, meals, nutrient columns, and daily values.

#### 2. Food Log Entry Module
* **Date Selector:** Easily choose any date to log foods for (from January 1, 2000 into the future). Defaults to today's date.
* **Searchable Item Selector:** Quickly find any Food or composite Meal defined in your database.
* **Auto-Populating Units & Quantities:**
  - Selecting a food with "Unit Used in Log" of *g* automatically sets the quantity to its standard serving size in grams and unit to *g*.
  - Selecting foods logged by servings or any meal automatically sets the quantity to *1* and unit to *serving*.
  - Intelligently displays singular *serving* or plural *servings* based on the quantity value.
* **Add Button:** Instantly records the entry to your Food Log.

#### 3. Nutrient Breakdown Module
* **Multi-Scope Breakdown:** Examine complete nutritional data for:
  - An entire day's **Food Log** on any selected date.
  - A **Specific Item** (any single food or multi-ingredient meal) for any custom quantity and unit.
* **Hierarchical Food Breakdown Tree:**
  - Recursively decomposes complex meals down to individual food ingredients measured strictly in grams (g).
  - Single-click expandable and collapsible tree nodes.
  - Shows real-time calculated calorie content aligned to the right for every visible parent and leaf node!
* **Calorie Progress Bar:**
  - Tracks total calories consumed against your customized Daily Value calorie target.
* **Macronutrient Dashboard:**
  - *Pie Chart:* Displays visual proportions of total calories derived from Carbohydrates (4 kcal/g), Proteins (4 kcal/g), and Fats (9 kcal/g).
  - *Hierarchical Progress Bars:* Visualizes intake and percentages against daily targets and limits. Accurately indents:
    - Saturated Fat and Trans Fat under Fat
    - Dietary Fiber and Sugars under Carbohydrates
    - Added Sugars under Sugars
* **Micronutrient Dashboard:**
  - Dynamically renders progress bars for all vitamins, minerals, and trace elements present in your Foods file against your target Daily Values.
  - Highlights nutrients with recommended upper limits such as Sodium.
`;

export const DISCLAIMER_CONTENT = `# Health & Legal Disclaimer

### Not Professional Dietary or Medical Advice
The information provided within **Vitaminarian**, including calculated caloric totals, macronutrient breakdowns, micronutrient evaluations, and reference daily values, is intended solely for general informational and educational purposes. **Vitaminarian is not intended to provide professional dietary, nutritional, medical, or healthcare advice.**

### Accuracy of Information
Nutritional information, food compositions, serving sizes, and daily reference targets may vary widely across agricultural sources, manufacturing batches, regional standards, and preparation techniques. Consequently, the data contained in this application or uploaded by users may not be accurate, complete, or current.

Always consult a qualified physician, registered dietitian, or certified medical professional before embarking on any diet, nutritional regimen, fasting protocol, or significant lifestyle modification, especially if you have pre-existing medical conditions, allergies, or metabolic disorders.
`;
