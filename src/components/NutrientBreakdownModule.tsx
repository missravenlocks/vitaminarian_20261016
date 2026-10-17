import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Calendar,
  Layers,
  Search,
  PieChart as PieIcon,
  Activity,
  AlertOctagon,
} from 'lucide-react';
import { useNutrition } from '../context/NutritionContext';
import { TreeNode } from '../types/nutrition';
import {
  calculateDailyLogNutrients,
  calculateItemNutrients,
  formatDateToDisplay,
  generateFoodBreakdownTree,
  isoDateToMDY,
  mdyToISODate,
  normalizeDateString,
  parseNutrientHeader,
} from '../utils/csv';

export const NutrientBreakdownModule: React.FC = () => {
  const {
    foods,
    meals,
    foodNames,
    mealNames,
    allItemNames,
    dailyValues,
    foodLog,
    breakdown,
    setBreakdown,
  } = useNutrition();

  // Dropdown states for Nutrient Breakdown Selector Row
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSpecificItemSubmenuOpen, setIsSpecificItemSubmenuOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setIsSpecificItemSubmenuOpen(false);
      }
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered foods and meals for submenu search
  const filteredSubmenuItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return allItemNames;
    return allItemNames.filter((name) =>
      name.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  }, [allItemNames, itemSearchQuery]);

  // Handle selecting "Food Log"
  const handleSelectFoodLog = () => {
    setBreakdown((prev) => ({
      ...prev,
      type: 'food_log',
    }));
    setIsDropdownOpen(false);
    setIsSpecificItemSubmenuOpen(false);
  };

  // Handle selecting a specific item
  const handleSelectSpecificItem = (itemName: string) => {
    setBreakdown((prev) => ({
      ...prev,
      type: 'specific_item',
      itemName,
      quantity: 1,
      unit: 'serving' as const, // auto-populated with "1" and "serving" per spec
    }));
    setIsDropdownOpen(false);
    setIsSpecificItemSubmenuOpen(false);
    setItemSearchQuery('');
  };

  const isSelectedFood = foods.has(breakdown.itemName);
  const isSelectedMeal = meals.has(breakdown.itemName);
  const isQtyOne = breakdown.quantity === 1;
  const currentUnitLabel =
    breakdown.unit === 'g' ? 'g' : isQtyOne ? 'serving' : 'servings';

  // Compute nutrients for current breakdown selection
  const calculatedNutrients = useMemo(() => {
    if (breakdown.type === 'food_log') {
      const normDate = normalizeDateString(breakdown.date);
      const day = foodLog.get(normDate);
      return calculateDailyLogNutrients(day, foods, meals);
    } else {
      const qty = breakdown.quantity > 0 ? breakdown.quantity : 1;
      const effectiveUnit: 'g' | 'servings' = breakdown.unit === 'g' ? 'g' : 'servings';
      return calculateItemNutrients(breakdown.itemName, qty, effectiveUnit, foods, meals);
    }
  }, [breakdown, foodLog, foods, meals]);

  // Generate Tree Data
  const treeData = useMemo(() => {
    if (breakdown.type === 'food_log') {
      const normDate = normalizeDateString(breakdown.date);
      const day = foodLog.get(normDate);
      return generateFoodBreakdownTree(
        `Food Breakdown for ${formatDateToDisplay(breakdown.date)}`,
        null,
        0,
        'servings',
        breakdown.date,
        day,
        foods,
        meals
      );
    } else {
      const effectiveUnit: 'g' | 'servings' = breakdown.unit === 'g' ? 'g' : 'servings';
      return generateFoodBreakdownTree(
        `Food Breakdown for ${breakdown.quantity} ${currentUnitLabel} ${breakdown.itemName}`,
        breakdown.itemName,
        breakdown.quantity,
        effectiveUnit,
        null,
        undefined,
        foods,
        meals
      );
    }
  }, [breakdown, currentUnitLabel, foodLog, foods, meals]);

  // Calorie Progress
  const totalCalories = Math.round(calculatedNutrients.calories * 10) / 10;
  const calorieGoal = dailyValues.calories;
  const caloriePercent = calorieGoal && calorieGoal > 0 ? Math.round((totalCalories / calorieGoal) * 100) : null;

  // Macro calculations
  // Carbs: 4 kcal/g, Protein: 4 kcal/g, Fat: 9 kcal/g
  const totalFatG = calculatedNutrients.nutrients['Fat (g)'] || 0;
  const totalCarbsG = calculatedNutrients.nutrients['Carbohydrates (g)'] || 0;
  const totalProteinG = calculatedNutrients.nutrients['Protein (g)'] || 0;

  const fatKcal = totalFatG * 9;
  const carbsKcal = totalCarbsG * 4;
  const proteinKcal = totalProteinG * 4;
  const totalMacroKcal = fatKcal + carbsKcal + proteinKcal;

  const carbPercent = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const proteinPercent = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const fatPercent = totalMacroKcal > 0 ? Math.max(0, 100 - carbPercent - proteinPercent) : 0;

  return (
    <section className="bg-slate-50/60 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Module Title / Header */}
        <div className="border-b border-slate-200/80 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Nutrient Breakdown
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Detailed breakdown, calorie tracking, and macronutrient & micronutrient profiles
          </p>
        </div>

        {/* 1. Nutrient Breakdown Selector Row */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-sm">
            <span className="font-semibold text-slate-800 shrink-0">
              Show nutrient breakdown for
            </span>

            {/* Dropdown with "Food Log" and "Specific Item" */}
            <div className="relative inline-block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
              >
                <span>
                  {breakdown.type === 'food_log'
                    ? 'Food Log'
                    : breakdown.itemName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                  {/* Food Log option */}
                  <button
                    type="button"
                    onClick={handleSelectFoodLog}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 ${
                      breakdown.type === 'food_log'
                        ? 'font-bold text-emerald-900 bg-emerald-50/70'
                        : 'text-slate-800'
                    }`}
                  >
                    <span>Food Log</span>
                  </button>

                  {/* Specific Item option (expands into submenu on hover / click) */}
                  <div
                    className="relative"
                    onMouseEnter={() => setIsSpecificItemSubmenuOpen(true)}
                  >
                    <button
                      type="button"
                      onClick={() => setIsSpecificItemSubmenuOpen((prev) => !prev)}
                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 ${
                        breakdown.type === 'specific_item'
                          ? 'font-bold text-emerald-900 bg-emerald-50/70'
                          : 'text-slate-800'
                      }`}
                    >
                      <span>Specific Item</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {/* Submenu for specific items */}
                    {isSpecificItemSubmenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 flex flex-col max-h-72">
                        <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search item…"
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            className="w-full text-xs py-0.5 px-1 focus:outline-none text-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                          {filteredSubmenuItems.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">
                              No items found
                            </div>
                          ) : (
                            filteredSubmenuItems.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => handleSelectSpecificItem(name)}
                                className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 ${
                                  breakdown.type === 'specific_item' && breakdown.itemName === name
                                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                    : 'text-slate-800'
                                }`}
                              >
                                <span className="truncate">{name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-mono ml-2 shrink-0">
                                  {foods.has(name) ? 'Food' : 'Meal'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* If Food Log selected: "on" label + Date Picker */}
            {breakdown.type === 'food_log' && (
              <div className="inline-flex items-center gap-2">
                <span className="font-semibold text-slate-800">on</span>
                <input
                  type="date"
                  min="2000-01-01"
                  value={mdyToISODate(breakdown.date)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setBreakdown((prev) => ({
                        ...prev,
                        date: isoDateToMDY(e.target.value),
                      }));
                    }
                  }}
                  className="px-3 py-1 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500 hidden md:inline">
                  ({formatDateToDisplay(breakdown.date)})
                </span>
              </div>
            )}

            {/* If Specific Item selected: Quantity and Unit field */}
            {breakdown.type === 'specific_item' && (
              <div className="inline-flex items-center gap-2">
                {/* Quantity Field */}
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={breakdown.quantity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBreakdown((prev) => ({
                      ...prev,
                      quantity: isNaN(val) ? 0 : val,
                    }));
                  }}
                  className="w-20 px-2.5 py-1 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />

                {/* Unit Field */}
                {isSelectedMeal ? (
                  <span className="px-2.5 py-1 text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-lg font-medium">
                    {currentUnitLabel}
                  </span>
                ) : (
                  <div className="relative" ref={unitDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-left bg-white border border-slate-300 rounded-lg shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                    >
                      <span>{currentUnitLabel}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {isUnitDropdownOpen && (
                      <div className="absolute z-50 left-0 mt-1 w-28 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBreakdown((prev) => ({ ...prev, unit: 'g' }));
                            setIsUnitDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left ${
                            breakdown.unit === 'g'
                              ? 'bg-emerald-50 text-emerald-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          g
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBreakdown((prev) => ({ ...prev, unit: 'servings' }));
                            setIsUnitDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left ${
                            breakdown.unit === 'servings'
                              ? 'bg-emerald-50 text-emerald-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          {isQtyOne ? 'serving' : 'servings'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Food Breakdown Tree */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Food Breakdown Tree
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Measured in grams (g)
            </span>
          </div>

          <FoodBreakdownTreeComponent rootNode={treeData} />
        </div>

        {/* 3. Calorie Progress Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <span className="text-sm font-bold text-slate-900">Calories</span>
              <span className="text-xs text-slate-500 ml-2">Daily Progress</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                {totalCalories} kcal
              </span>
              {calorieGoal !== null && (
                <span className="text-xs text-slate-500 font-mono tabular-nums ml-1">
                  / {calorieGoal} kcal ({caloriePercent}%)
                </span>
              )}
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                calorieGoal && totalCalories > calorieGoal
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{
                width: calorieGoal ? `${Math.min(100, (totalCalories / calorieGoal) * 100)}%` : '100%',
              }}
            />
          </div>
        </div>

        {/* 4. Macronutrient Dashboard */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                Macronutrient Dashboard
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Caloric distribution and daily macronutrient targets
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              Total Macro Calories: {Math.round(totalMacroKcal)} kcal
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Macronutrient Pie Chart */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">
                Caloric Distribution
              </h4>
              <MacronutrientPieChart
                carbKcal={carbsKcal}
                proteinKcal={proteinKcal}
                fatKcal={fatKcal}
                carbPercent={carbPercent}
                proteinPercent={proteinPercent}
                fatPercent={fatPercent}
              />

              <div className="mt-5 grid grid-cols-3 gap-2 w-full text-center">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mx-auto mb-1" />
                  <div className="text-[11px] text-slate-500">Carbs</div>
                  <div className="text-xs font-bold font-mono tabular-nums text-slate-900">
                    {carbPercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {Math.round(carbsKcal)} kcal
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mx-auto mb-1" />
                  <div className="text-[11px] text-slate-500">Protein</div>
                  <div className="text-xs font-bold font-mono tabular-nums text-slate-900">
                    {proteinPercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {Math.round(proteinKcal)} kcal
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mx-auto mb-1" />
                  <div className="text-[11px] text-slate-500">Fat</div>
                  <div className="text-xs font-bold font-mono tabular-nums text-slate-900">
                    {fatPercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {Math.round(fatKcal)} kcal
                  </div>
                </div>
              </div>
            </div>

            {/* Macronutrient Progress Bars */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Macronutrient Intake & Daily Goals
              </h4>
              <MacronutrientProgressBars
                calculatedNutrients={calculatedNutrients.nutrients}
                dailyValues={dailyValues.nutrients}
                foodsHeaderOrder={Array.from(foods.values())[0]?.nutrients || {}}
              />
            </div>
          </div>
        </div>

        {/* 5. Micronutrient Dashboard */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Micronutrient Dashboard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily intake goals and limits for all vitamins, minerals, and trace elements
            </p>
          </div>

          <MicronutrientProgressBars
            calculatedNutrients={calculatedNutrients.nutrients}
            dailyValues={dailyValues.nutrients}
            foodsSample={Array.from(foods.values())[0]}
          />
        </div>
      </div>
    </section>
  );
};

// --- SUBCOMPONENT: Food Breakdown Tree ---
interface FoodBreakdownTreeProps {
  rootNode: TreeNode;
}

const FoodBreakdownTreeComponent: React.FC<FoodBreakdownTreeProps> = ({ rootNode }) => {
  // State for expanded node IDs
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const isRootExpanded = expandedNodes.has(rootNode.id);

  // Render tree node recursively
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.isExpandable && node.children && node.children.length > 0;

    return (
      <div key={node.id} className="w-full">
        <div
          className={`flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50/80 transition-colors text-xs ${
            depth === 0 ? 'font-semibold text-slate-900' : 'text-slate-800'
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          <div className="flex items-center gap-1.5 truncate pr-4">
            {node.isExpandable ? (
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                className="p-0.5 hover:bg-slate-200/60 rounded text-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2 font-medium">
                  {node.label}
                </span>
              </button>
            ) : (
              <span className="text-slate-700">{node.label}</span>
            )}
          </div>

          {/* Show calorie content aligned to the right if root is expanded */}
          {isRootExpanded && (
            <div className="shrink-0 font-mono tabular-nums text-xs text-slate-600">
              {node.calories} kcal
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="space-y-0.5">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="font-sans text-xs divide-y divide-slate-100">
      {renderNode(rootNode, 0)}
    </div>
  );
};

// --- SUBCOMPONENT: Macronutrient Pie Chart ---
interface MacronutrientPieChartProps {
  carbKcal: number;
  proteinKcal: number;
  fatKcal: number;
  carbPercent: number;
  proteinPercent: number;
  fatPercent: number;
}

const MacronutrientPieChart: React.FC<MacronutrientPieChartProps> = ({
  carbPercent,
  proteinPercent,
  fatPercent,
}) => {
  // SVG Donut calculation
  const total = carbPercent + proteinPercent + fatPercent;
  if (total === 0) {
    return (
      <div className="w-40 h-40 rounded-full border-4 border-slate-200 flex items-center justify-center text-xs text-slate-400">
        No data
      </div>
    );
  }

  const radius = 60;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Offsets
  const carbStroke = (carbPercent / 100) * circumference;
  const proteinStroke = (proteinPercent / 100) * circumference;
  const fatStroke = (fatPercent / 100) * circumference;

  const carbOffset = 0;
  const proteinOffset = -carbStroke;
  const fatOffset = -(carbStroke + proteinStroke);

  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Carbs: Amber */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="transparent"
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeDasharray={`${carbStroke} ${circumference}`}
          strokeDashoffset={carbOffset}
          className="transition-all duration-300"
        />
        {/* Protein: Blue */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${proteinStroke} ${circumference}`}
          strokeDashoffset={proteinOffset}
          className="transition-all duration-300"
        />
        {/* Fat: Rose */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="transparent"
          stroke="#f43f5e"
          strokeWidth={strokeWidth}
          strokeDasharray={`${fatStroke} ${circumference}`}
          strokeDashoffset={fatOffset}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-[11px] text-slate-400 uppercase font-medium">Macros</span>
        <span className="text-sm font-bold font-mono text-slate-800">100%</span>
      </div>
    </div>
  );
};

// --- SUBCOMPONENT: Macronutrient Progress Bars ---
interface MacronutrientProgressBarsProps {
  calculatedNutrients: Record<string, number>;
  dailyValues: Record<string, number | null>;
  foodsHeaderOrder: Record<string, number>;
}

const MACRO_HIERARCHY: {
  key: string;
  parentKey?: string;
  isLimit?: boolean;
  indent: number;
}[] = [
  { key: 'Fat (g)', indent: 0 },
  { key: 'Saturated Fat (g)', parentKey: 'Fat (g)', isLimit: true, indent: 1 },
  { key: 'Trans Fat (g)', parentKey: 'Fat (g)', isLimit: true, indent: 1 },
  { key: 'Carbohydrates (g)', indent: 0 },
  { key: 'Dietary Fiber (g)', parentKey: 'Carbohydrates (g)', indent: 1 },
  { key: 'Sugars (g)', parentKey: 'Carbohydrates (g)', indent: 1 },
  { key: 'Added Sugars (g)', parentKey: 'Sugars (g)', isLimit: true, indent: 2 },
  { key: 'Protein (g)', indent: 0 },
];

const MacronutrientProgressBars: React.FC<MacronutrientProgressBarsProps> = ({
  calculatedNutrients,
  dailyValues,
}) => {
  return (
    <div className="space-y-2.5">
      {MACRO_HIERARCHY.map((macro) => {
        // Only display if this nutrient exists in the dailyValues or calculatedNutrients
        const rawVal = calculatedNutrients[macro.key] || 0;
        const goal = dailyValues[macro.key];
        const hasGoal = goal !== undefined && goal !== null && goal > 0;
        const percent = hasGoal ? Math.round((rawVal / goal!) * 100) : null;

        const parsed = parseNutrientHeader(macro.key);
        const name = parsed ? parsed.name : macro.key;
        const unit = parsed ? parsed.unit : 'g';

        const isExceededLimit = macro.isLimit && hasGoal && rawVal > goal!;

        return (
          <div
            key={macro.key}
            className={`p-2 rounded-lg bg-slate-50/50 border border-slate-100 ${
              macro.indent === 1 ? 'ml-4' : macro.indent === 2 ? 'ml-8' : ''
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800">{name}</span>
                {macro.isLimit && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Limit
                  </span>
                )}
              </div>
              <div className="text-right font-mono tabular-nums text-xs">
                <span className="font-bold text-slate-900">
                  {Math.round(rawVal * 10) / 10} {unit}
                </span>
                {hasGoal && (
                  <span className="text-slate-500 ml-1">
                    / {goal} {unit} ({percent}%)
                  </span>
                )}
              </div>
            </div>

            {hasGoal && (
              <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isExceededLimit
                      ? 'bg-rose-500'
                      : macro.isLimit
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, (rawVal / goal!) * 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- SUBCOMPONENT: Micronutrient Progress Bars ---
interface MicronutrientProgressBarsProps {
  calculatedNutrients: Record<string, number>;
  dailyValues: Record<string, number | null>;
  foodsSample: any;
}

const MACRO_HEADER_NAMES = new Set([
  'Fat',
  'Saturated Fat',
  'Trans Fat',
  'Carbohydrates',
  'Dietary Fiber',
  'Sugars',
  'Added Sugars',
  'Protein',
]);

const MicronutrientProgressBars: React.FC<MicronutrientProgressBarsProps> = ({
  calculatedNutrients,
  dailyValues,
  foodsSample,
}) => {
  // Collect all nutrient headers other than macronutrients
  const allHeaders = foodsSample ? Object.keys(foodsSample.nutrients) : Object.keys(dailyValues);
  const microHeaders = allHeaders.filter((h) => {
    const meta = parseNutrientHeader(h);
    if (!meta) return false;
    return !MACRO_HEADER_NAMES.has(meta.name);
  });

  if (microHeaders.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-2">
        No micronutrients found in the Foods dataset.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {microHeaders.map((header) => {
        const rawVal = calculatedNutrients[header] || 0;
        const goal = dailyValues[header];
        const hasGoal = goal !== undefined && goal !== null && goal > 0;
        const percent = hasGoal ? Math.round((rawVal / goal!) * 100) : null;

        const meta = parseNutrientHeader(header);
        const name = meta ? meta.name : header;
        const unit = meta ? meta.unit : '';

        // Sodium is assumed to be the only micronutrient to limit
        const isSodiumLimit = name.toLowerCase() === 'sodium';
        const isExceededLimit = isSodiumLimit && hasGoal && rawVal > goal!;

        return (
          <div
            key={header}
            className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span className="font-semibold text-slate-800 truncate" title={name}>
                    {name}
                  </span>
                  {isSodiumLimit && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                      Limit
                    </span>
                  )}
                </div>
                <span className="font-bold font-mono tabular-nums text-slate-900 shrink-0 text-xs">
                  {Math.round(rawVal * 10) / 10} {unit}
                </span>
              </div>

              {hasGoal && (
                <div className="text-[11px] text-slate-500 font-mono tabular-nums mb-1.5 text-right">
                  Goal: {goal} {unit} ({percent}%)
                </div>
              )}
            </div>

            {hasGoal ? (
              <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isExceededLimit
                      ? 'bg-rose-500'
                      : isSodiumLimit
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, (rawVal / goal!) * 100)}%` }}
                />
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic">No daily goal set</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
