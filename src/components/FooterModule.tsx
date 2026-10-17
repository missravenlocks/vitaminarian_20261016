import React, { useEffect, useState } from 'react';
import { BookOpen, ShieldAlert, X, ExternalLink } from 'lucide-react';
import { DISCLAIMER_CONTENT, TUTORIAL_CONTENT } from '../data/docs';

export const FooterModule: React.FC = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // "Furthermore, when the user initially loads the page, show a popup with this disclaimer
  // so that the user is guaranteed to see it."
  useEffect(() => {
    // Show disclaimer popup on page load
    setShowDisclaimer(true);
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center space-y-4">
        {/* Tutorial Link and Disclaimer stacked on top of one another */}
        <div>
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-4 cursor-pointer transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            User Guide & Tutorial
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowDisclaimer(true)}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer max-w-2xl mx-auto block leading-relaxed"
          >
            Health & Legal Disclaimer: Vitaminarian is not intended to provide professional dietary or medical advice.
          </button>
        </div>

        <div className="pt-2 text-[11px] text-slate-400">
          © {new Date().getFullYear()} Vitaminarian. All nutritional calculations are illustrative and user-configured.
        </div>
      </div>

      {/* Tutorial Popup Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Application Tutorial</h3>
              </div>
              <button
                onClick={() => setShowTutorial(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 pr-2 text-slate-700 text-xs sm:text-sm leading-relaxed space-y-4">
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-950 font-medium text-xs leading-relaxed">
                <strong>Important Notice Regarding Sample Data:</strong> The sample Foods, Meals, and
                Daily Values files contain limited, illustrative, and likely irrelevant data for you.
                You are highly encouraged to customize these files using the <strong>Upload Data</strong> and{' '}
                <strong>Download Data</strong> buttons to adapt the application to your unique needs.
              </div>

              <div className="space-y-3 divide-y divide-slate-100">
                <section className="pt-2">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    1. Upload and Download Data
                  </h4>
                  <p className="text-xs text-slate-600 mb-1.5">
                    Seamlessly manage the 4 CSV databases powering the application:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                    <li>
                      <strong>Foods.csv:</strong> Defines each food, its log unit (g or servings), serving size in grams, calories, and nutrient breakdown per serving.
                    </li>
                    <li>
                      <strong>Meals.csv:</strong> Combines multiple foods and sub-meals into single convenient meal entities.
                    </li>
                    <li>
                      <strong>Daily Values.csv:</strong> Sets your individual daily caloric, macronutrient, and micronutrient targets or upper limits.
                    </li>
                    <li>
                      <strong>Food Log.csv:</strong> Stores your daily intake records by date.
                    </li>
                  </ul>
                  <p className="text-xs text-slate-600 mt-2">
                    When uploading, you can choose to <em>Merge with existing</em> or <em>Replace existing</em> for each file. Strict validations ensure referential integrity.
                  </p>
                </section>

                <section className="pt-3">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    2. Food Log Entry Module
                  </h4>
                  <p className="text-xs text-slate-600">
                    Select a date using the date picker (any date from Jan 1, 2000 into the future). Search for any food or meal. When a food with unit `g` is chosen, the quantity automatically sets to its serving size in grams and unit to `g`. For other items, it defaults to 1 serving. Clicking <strong>Add</strong> records the item into your daily log.
                  </p>
                </section>

                <section className="pt-3">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    3. Nutrient Breakdown Module
                  </h4>
                  <p className="text-xs text-slate-600">
                    Switch between viewing nutritional metrics for an entire day's <strong>Food Log</strong> or any <strong>Specific Item</strong>. Explore:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 mt-1">
                    <li>
                      <strong>Food Breakdown Tree:</strong> Recursively unfolds multi-ingredient meals down to individual grams of food, showing exact calorie contributions for every open branch on the right.
                    </li>
                    <li>
                      <strong>Calorie Progress Bar:</strong> Monitors progress toward your daily caloric allowance.
                    </li>
                    <li>
                      <strong>Macronutrient Dashboard:</strong> Pie chart showing percentage of calories from Carbs (4 kcal/g), Protein (4 kcal/g), and Fat (9 kcal/g), paired with indented progress bars.
                    </li>
                    <li>
                      <strong>Micronutrient Dashboard:</strong> Tracks all vitamins, minerals, and trace elements, highlighting nutrients to limit like Sodium.
                    </li>
                  </ul>
                </section>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal (Shown on Initial Load and when clicked) */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Health & Legal Disclaimer</h3>
                <div className="mt-2.5 text-xs text-slate-600 space-y-2.5 leading-relaxed">
                  <p>
                    <strong>Not Professional Dietary Advice:</strong> Vitaminarian is designed solely for informational and educational tracking purposes. The application does not provide medical, dietary, or healthcare advice.
                  </p>
                  <p>
                    <strong>Accuracy of Information:</strong> Nutritional values, food compositions, and reference daily values may vary widely across sources and preparation methods. Information provided or imported may not be accurate.
                  </p>
                  <p>
                    Always consult a physician, registered dietitian, or certified medical provider before beginning any dietary regimen or modifying your nutritional intake.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDisclaimer(false)}
                className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                I Understand & Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
