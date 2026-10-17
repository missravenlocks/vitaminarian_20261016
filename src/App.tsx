import React from 'react';
import { HeaderModule } from './components/HeaderModule';
import { UploadDownloadModule } from './components/UploadDownloadModule';
import { FoodLogEntryModule } from './components/FoodLogEntryModule';
import { NutrientBreakdownModule } from './components/NutrientBreakdownModule';
import { FooterModule } from './components/FooterModule';
import { NutritionProvider } from './context/NutritionContext';

export default function App() {
  return (
    <NutritionProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased">
        {/* 1. Header Module */}
        <HeaderModule />

        {/* 2. Upload and Download Module */}
        <UploadDownloadModule />

        <main className="flex-1">
          {/* 3. Food Log Entry Module */}
          <FoodLogEntryModule />

          {/* 4. Nutrient Breakdown Module */}
          <NutrientBreakdownModule />
        </main>

        {/* 5. Footer Module */}
        <FooterModule />
      </div>
    </NutritionProvider>
  );
}
