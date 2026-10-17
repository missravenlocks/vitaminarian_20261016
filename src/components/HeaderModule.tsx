import React from 'react';
import spinachLeafLogo from '../assets/images/spinach_leaf_logo_1792201169237.jpg';

export const HeaderModule: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden border border-emerald-100 bg-emerald-50/50 shadow-xs flex items-center justify-center">
            <img
              src={spinachLeafLogo}
              alt="Vitaminarian spinach leaf logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-1.5"
              onError={(e) => {
                // Elegant SVG leaf fallback in case image load is obstructed
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-emerald-600', 'text-white');
              }}
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              Vitaminarian
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              Customizable nutrition tracking
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
