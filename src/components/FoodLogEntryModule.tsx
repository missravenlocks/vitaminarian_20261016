import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Calendar, ChevronDown, Check, Trash2, Utensils } from 'lucide-react';
import { useNutrition } from '../context/NutritionContext';
import {
  formatDateToDisplay,
  isoDateToMDY,
  mdyToISODate,
  normalizeDateString,
} from '../utils/csv';

export const FoodLogEntryModule: React.FC = () => {
  const {
    foods,
    meals,
    foodNames,
    mealNames,
    allItemNames,
    loggingDate,
    setLoggingDate,
    logItem,
    foodLog,
    deleteLogItem,
  } = useNutrition();

  // Selected item in dropdown
  const [selectedItem, setSelectedItem] = useState<string>(allItemNames[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Quantity and Unit
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<'g' | 'servings'>('servings');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

  // Success flash
  const [justLogged, setJustLogged] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default item when items load
  useEffect(() => {
    if (!selectedItem && allItemNames.length > 0) {
      applyItemSelection(allItemNames[0]);
    }
  }, [allItemNames]);

  // Handle item selection with auto-population rules:
  // "If the user selects a food with a Unit Used in Log of g in the Item Dropdown,
  // the quantity and unit fields are automatically populated with serving size of the food in grams
  // and 'g', respectively. Otherwise, the quantity and unit fields are automatically populated with
  // '1' and 'serving', respectively."
  const applyItemSelection = (itemName: string) => {
    setSelectedItem(itemName);
    setIsDropdownOpen(false);
    setSearchQuery('');

    if (foods.has(itemName)) {
      const food = foods.get(itemName)!;
      if (food.unitUsedInLog === 'g') {
        setQuantity(String(food.servingSizeG));
        setUnit('g');
      } else {
        setQuantity('1');
        setUnit('servings');
      }
    } else {
      // Meal
      setQuantity('1');
      setUnit('servings');
    }
  };

  const isSelectedFood = foods.has(selectedItem);
  const isSelectedMeal = meals.has(selectedItem);

  // Filtered items for search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItemNames;
    return allItemNames.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allItemNames, searchQuery]);

  // Unit display logic:
  // "If 1 is entered in the quantity field, change 'servings' to the singular form 'serving'."
  const isNumericOne = parseFloat(quantity) === 1;
  const displayUnitLabel = unit === 'g' ? 'g' : isNumericOne ? 'serving' : 'servings';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(quantity);
    if (isNaN(num) || num <= 0) return;
    if (!selectedItem) return;

    logItem(selectedItem, num, unit);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1500);
  };

  // Currently logged items for this date
  const normDate = normalizeDateString(loggingDate);
  const currentDayLog = foodLog.get(normDate);
  const loggedEntries = currentDayLog ? Object.entries(currentDayLog.entries) : [];

  return (
    <section className="bg-white border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Food Log Entry Selector Row */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-semibold text-slate-800 shrink-0">
              Log foods for
            </span>

            <div className="relative inline-flex items-center">
              <label htmlFor="food-log-date-picker" className="sr-only">
                Log foods date
              </label>
              <input
                id="food-log-date-picker"
                type="date"
                min="2000-01-01"
                value={mdyToISODate(loggingDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setLoggingDate(isoDateToMDY(e.target.value));
                  }
                }}
                className="w-auto px-3.5 py-1.5 text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <span className="ml-2.5 text-xs text-slate-500 hidden sm:inline">
                ({formatDateToDisplay(loggingDate)})
              </span>
            </div>
          </div>

          {/* Food Log Entry Row: Item Dropdown, Quantity Field, Unit Field, Add Button */}
          <form
            onSubmit={handleAdd}
            className="flex flex-wrap items-end gap-3.5 p-4 rounded-xl bg-slate-50/80 border border-slate-200 shadow-2xs"
          >
            {/* 1. Item Dropdown (searchable) */}
            <div className="flex-1 min-w-[220px] relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Item
              </label>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-left bg-white border border-slate-300 rounded-lg shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <span className="truncate font-medium text-slate-900">
                  {selectedItem || 'Search for an item…'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search for an item…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs py-1 px-1 focus:outline-none text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                    {filteredItems.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No matching foods or meals
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        const isFood = foods.has(item);
                        const isSelected = item === selectedItem;

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => applyItemSelection(item)}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{item}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono ml-2 shrink-0">
                              {isFood ? 'Food' : 'Meal'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Quantity Field */}
            <div className="w-28">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* 3. Unit Field */}
            <div className="w-36 relative" ref={unitDropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unit
              </label>
              {isSelectedMeal ? (
                // Meals: only option is servings and read only
                <input
                  type="text"
                  readOnly
                  value={displayUnitLabel}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-not-allowed select-none font-medium"
                />
              ) : (
                // Food: dropdown with "g" and "servings" (or "serving" if qty=1)
                <div>
                  <button
                    type="button"
                    onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-white border border-slate-300 rounded-lg shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  >
                    <span>{displayUnitLabel}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  {isUnitDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUnit('g');
                          setIsUnitDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                          unit === 'g'
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        g
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUnit('servings');
                          setIsUnitDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                          unit === 'servings'
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {isNumericOne ? 'serving' : 'servings'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Add Button */}
            <div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                {justLogged ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Logged items list for selected date */}
          {loggedEntries.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Logged on {formatDateToDisplay(loggingDate)} ({loggedEntries.length}{' '}
                  {loggedEntries.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                {loggedEntries.map(([itemName, loggedQty]) => {
                  const isFood = foods.has(itemName);
                  const logUnit = isFood ? foods.get(itemName)!.unitUsedInLog : 'servings';
                  const unitText =
                    logUnit === 'g'
                      ? 'g'
                      : loggedQty === 1
                      ? 'serving'
                      : 'servings';

                  return (
                    <div
                      key={itemName}
                      className="px-3.5 py-2 flex items-center justify-between text-xs text-slate-800 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{itemName}</span>
                        <span className="text-slate-500 font-mono tabular-nums">
                          {Math.round(loggedQty * 100) / 100} {unitText}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteLogItem(loggingDate, itemName)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Remove logged item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
