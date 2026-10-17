import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { StagedUpload, useNutrition } from '../context/NutritionContext';
import { MergeOption, UploadFileType, ValidationResult } from '../types/nutrition';
import {
  validateInitialDailyValues,
  validateInitialFoodLog,
  validateInitialFoods,
  validateInitialMeals,
} from '../utils/csv';

const FILE_TYPES: UploadFileType[] = ['Foods', 'Meals', 'Daily Values', 'Food Log'];

export const UploadDownloadModule: React.FC = () => {
  const {
    foodsCSV,
    mealsCSV,
    dailyValuesCSV,
    foodLogCSV,
    applyUploadedFiles,
    resetToSampleData,
  } = useNutrition();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Staged files for upload
  const [stagedFiles, setStagedFiles] = useState<Map<UploadFileType, StagedUpload>>(new Map());

  // Dialog states
  const [errorDialog, setErrorDialog] = useState<{ title: string; errors: string[] } | null>(null);
  const [successDialog, setSuccessDialog] = useState<string | null>(null);
  const [warningsDialog, setWarningsDialog] = useState<string[] | null>(null);

  // Hidden file inputs
  const fileInputRefs = {
    Foods: useRef<HTMLInputElement>(null),
    Meals: useRef<HTMLInputElement>(null),
    'Daily Values': useRef<HTMLInputElement>(null),
    'Food Log': useRef<HTMLInputElement>(null),
  };

  const handleOpenFilePicker = (fileType: UploadFileType) => {
    const input = fileInputRefs[fileType].current;
    if (input) {
      input.value = '';
      input.click();
    }
  };

  const handleFileSelected = async (fileType: UploadFileType, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileName = file.name;

    // Check extension
    if (!fileName.toLowerCase().endsWith('.csv')) {
      setErrorDialog({
        title: 'File not uploaded',
        errors: [`The selected file "${fileName}" is not a CSV file. Only .csv files are supported.`],
      });
      return;
    }

    try {
      const text = await file.text();
      let validation: ValidationResult = { valid: true, errors: [] };

      if (fileType === 'Foods') {
        validation = validateInitialFoods(text);
      } else if (fileType === 'Meals') {
        validation = validateInitialMeals(text);
      } else if (fileType === 'Daily Values') {
        validation = validateInitialDailyValues(text);
      } else if (fileType === 'Food Log') {
        validation = validateInitialFoodLog(text);
      }

      if (!validation.valid) {
        setErrorDialog({
          title: 'File not uploaded',
          errors: validation.errors,
        });
        return;
      }

      // Initial validation succeeded!
      setStagedFiles((prev) => {
        const next = new Map(prev);
        next.set(fileType, {
          fileType,
          fileName,
          content: text,
          mergeOption: 'merge', // Default "Merge with existing"
        });
        return next;
      });
    } catch {
      setErrorDialog({
        title: 'File not uploaded',
        errors: ['An error occurred while reading the file. Please try again.'],
      });
    }
  };

  const handleMergeOptionChange = (fileType: UploadFileType, option: MergeOption) => {
    setStagedFiles((prev) => {
      const next = new Map(prev);
      const existing = next.get(fileType);
      if (existing) {
        next.set(fileType, { ...existing, mergeOption: option });
      }
      return next;
    });
  };

  const handleAcceptChanges = () => {
    if (stagedFiles.size === 0) {
      setErrorDialog({
        title: 'Changes not accepted',
        errors: ['No files have been selected for upload. Please select at least one file or click Cancel.'],
      });
      return;
    }

    const stagedList = Array.from(stagedFiles.values());
    const result = applyUploadedFiles(stagedList);

    if (!result.success) {
      setErrorDialog({
        title: 'Changes not accepted',
        errors: result.errors,
      });
      return;
    }

    // Success!
    setStagedFiles(new Map());
    setShowUploadModal(false);

    if (result.warnings && result.warnings.length > 0) {
      setWarningsDialog(result.warnings);
    }
    setSuccessDialog('Your changes have been saved.');
  };

  const handleCancelUpload = () => {
    setStagedFiles(new Map());
    setShowUploadModal(false);
  };

  // Download handling
  const handleDownloadFile = (fileType: UploadFileType) => {
    let content = '';
    let defaultName = '';

    if (fileType === 'Foods') {
      content = foodsCSV;
      defaultName = 'Foods.csv';
    } else if (fileType === 'Meals') {
      content = mealsCSV;
      defaultName = 'Meals.csv';
    } else if (fileType === 'Daily Values') {
      content = dailyValuesCSV;
      defaultName = 'Daily Values.csv';
    } else if (fileType === 'Food Log') {
      content = foodLogCSV;
      defaultName = 'Food Log.csv';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', defaultName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              Upload Data
            </button>

            <button
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Download Data
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>4 data files in system</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => {
                if (window.confirm('Reset all databases (Foods, Meals, Daily Values, Food Log) to default sample data?')) {
                  resetToSampleData();
                }
              }}
              className="text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              title="Reset databases to sample data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to sample data
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      {FILE_TYPES.map((type) => (
        <input
          key={type}
          ref={fileInputRefs[type]}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFileSelected(type, e)}
        />
      ))}

      {/* Upload Data Menu Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Upload Data</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Upload one or more files and click Accept Changes.
                </p>
              </div>
              <button
                onClick={handleCancelUpload}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 my-4 space-y-3">
              {FILE_TYPES.map((type) => {
                const isStaged = stagedFiles.has(type);
                const stagedInfo = stagedFiles.get(type);

                return (
                  <div
                    key={type}
                    className={`pt-3 pb-3 px-3.5 rounded-lg transition-colors ${
                      isStaged
                        ? 'bg-emerald-50/70 border border-emerald-300'
                        : 'hover:bg-slate-50/60 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenFilePicker(type)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer shadow-2xs ${
                            isStaged
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                        </button>
                        <span className="text-sm font-semibold text-slate-900">{type}</span>
                        {isStaged && stagedInfo && (
                          <span className="text-xs font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            {stagedInfo.fileName}
                          </span>
                        )}
                      </div>

                      {isStaged && stagedInfo && (
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-700 ml-auto sm:ml-0">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`merge-${type}`}
                              value="merge"
                              checked={stagedInfo.mergeOption === 'merge'}
                              onChange={() => handleMergeOptionChange(type, 'merge')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Merge with existing</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`merge-${type}`}
                              value="replace"
                              checked={stagedInfo.mergeOption === 'replace'}
                              onChange={() => handleMergeOptionChange(type, 'replace')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Replace existing</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptChanges}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                Accept Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Data Menu Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Download Data</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Click the Download button next to a file to download it.
                </p>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 my-4">
              {FILE_TYPES.map((type) => (
                <div key={type} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(type)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-md transition-colors cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      Download
                    </button>
                    <span className="text-sm font-semibold text-slate-900">{type}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">.csv format</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Dialog Box */}
      {errorDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-red-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">{errorDialog.title}</h3>
                <div className="mt-2.5 max-h-60 overflow-y-auto space-y-2 pr-1">
                  {errorDialog.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-700 bg-red-50/80 p-2.5 rounded-md border border-red-100">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setErrorDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog Box */}
      {successDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-emerald-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Success</h3>
            <p className="text-sm text-slate-600 mt-1">{successDialog}</p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSuccessDialog(null)}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warnings Dialog Box */}
      {warningsDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-amber-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Merge Notice</h3>
                <div className="mt-2.5 max-h-60 overflow-y-auto space-y-2 pr-1">
                  {warningsDialog.map((warn, i) => (
                    <div
                      key={i}
                      className="text-xs text-amber-800 bg-amber-50/80 p-2.5 rounded-md border border-amber-200/60"
                    >
                      {warn}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWarningsDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
