import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Activity, AlertCircle, CheckCircle2, Database, ListTodo,
  Sparkles, TrendingUp, AlertTriangle,
  ArrowRight, Undo2, Check, Sliders, Eye, FileText,
  Tag, Plus, X, Settings, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDataset } from '../contexts/DatasetContext';
import { isMissingValue } from '../utils/dataProfiler';

export default function MissingValues() {
  const { 
    originalDataset, 
    workingDataset, 
    datasetProfile, 
    columnMetadata, 
    missingRecommendations, 
    imputationResults,
    profilingOptions,
    updateProfilingOptions,
    runImputation, 
    runBatchImputations, 
    resetToOriginal 
  } = useDataset();

  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [customValueInput, setCustomValueInput] = useState('');
  const [columnMarkerInputs, setColumnMarkerInputs] = useState({});
  const [showGlobalMarkerManager, setShowGlobalMarkerManager] = useState(false);
  const [selectedConfigCol, setSelectedConfigCol] = useState('');
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'history' | 'diff'
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const dataset = workingDataset || originalDataset;

  const showNotification = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleMarkerInputChange = (colName, val) => {
    setColumnMarkerInputs(prev => ({ ...prev, [colName]: val }));
  };

  const handleSaveColumnMarkers = (colName) => {
    const rawVal = columnMarkerInputs[colName] !== undefined 
      ? columnMarkerInputs[colName] 
      : (Array.isArray(profilingOptions?.columnCustomMarkers?.[colName])
          ? profilingOptions.columnCustomMarkers[colName].join(', ')
          : (profilingOptions?.columnCustomMarkers?.[colName] || ''));
    
    const tokens = typeof rawVal === 'string'
      ? rawVal.split(',').map(s => s.trim()).filter(Boolean)
      : Array.isArray(rawVal) ? rawVal : [];

    const updatedMarkers = {
      ...(profilingOptions?.columnCustomMarkers || {}),
      [colName]: tokens
    };

    updateProfilingOptions({ columnCustomMarkers: updatedMarkers });
    showNotification(
      tokens.length > 0 
        ? `Custom missing values set for '${colName}': [${tokens.join(', ')}]` 
        : `Cleared custom missing values for '${colName}'.`, 
      'success'
    );
  };

  const handleClearColumnMarkers = (colName) => {
    const updatedMarkers = { ...(profilingOptions?.columnCustomMarkers || {}) };
    delete updatedMarkers[colName];
    setColumnMarkerInputs(prev => ({ ...prev, [colName]: '' }));
    updateProfilingOptions({ columnCustomMarkers: updatedMarkers });
    showNotification(`Cleared custom missing values for column '${colName}'.`, 'success');
  };

  // Map of original dataset rows keyed by internal stable __row_id (Fix 4: ID-based comparison)
  const originalRowMap = useMemo(() => {
    const map = new Map();
    if (originalDataset && originalDataset.rows) {
      originalDataset.rows.forEach((r, idx) => {
        const id = r.__row_id !== undefined ? r.__row_id : idx + 1;
        map.set(id, r);
      });
    }
    return map;
  }, [originalDataset]);

  if (!dataset || !dataset.rows || dataset.rows.length === 0) {
    return (
      <div className="animate-fade-in max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-500/20">
          <Database className="w-10 h-10 text-blue-500 dark:text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">No Dataset Loaded</h2>
        <p className="text-slate-500 dark:text-[#8ba3c9] max-w-md mb-8">
          Please upload a CSV dataset to perform missing-value detection, statistical profiling, and AI imputation.
        </p>
        <Link
          to="/upload"
          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  // Calculate missing stats from current working_dataset respecting profilingOptions and column-specific markers
  const totalRows = dataset.rows.length;
  const totalCols = dataset.headers.length;
  const totalCells = totalRows * totalCols;
  
  const missingByCol = dataset.headers.map(h => {
    const missingCount = dataset.rows.filter(r => isMissingValue(r[h], profilingOptions, h)).length;
    const missingPercent = totalRows > 0 ? Number(((missingCount / totalRows) * 100).toFixed(2)) : 0;
    const meta = (columnMetadata || []).find(c => c.name === h);
    return {
      name: h,
      count: missingCount,
      missing: missingPercent,
      type: meta?.dataType || 'Categorical',
      stats: meta?.stats
    };
  });

  const totalMissingCells = missingByCol.reduce((acc, c) => acc + c.count, 0);
  const overallMissingPercent = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(2)) : 0;

  const rowsWithMissing = dataset.rows.filter(row =>
    dataset.headers.some(h => isMissingValue(row[h], profilingOptions, h))
  ).length;

  let qualityGrade = 'A+';
  if (overallMissingPercent > 20) qualityGrade = 'D';
  else if (overallMissingPercent > 10) qualityGrade = 'C';
  else if (overallMissingPercent > 3) qualityGrade = 'B';
  else if (overallMissingPercent > 0) qualityGrade = 'A';

  // Columns that still have missing values
  const pendingColumns = missingByCol.filter(c => c.count > 0);

// Helper: Return only logically valid imputation methods based on column data type (Fix Problem 2)
function getAllowedImputationMethods(dataType) {
  if (dataType === 'Integer' || dataType === 'Float') {
    return ['Median', 'Mean', 'Mode', 'Custom Value', 'Drop Rows'];
  }
  if (dataType === 'Boolean') {
    return ['Mode', 'Custom Value', 'Drop Rows'];
  }
  if (dataType === 'Date') {
    return ['Forward Fill (ffill)', 'Backward Fill (bfill)', 'Median Date', 'Mode', 'Custom Value', 'Drop Rows'];
  }
  if (dataType === 'ID / Key') {
    return ['Drop Rows', 'Custom Value'];
  }
  // Categorical (Mean and Median are mathematically undefined for categorical data)
  return ['Mode', 'Custom Value', 'Drop Rows'];
}

// Helper: Calculate the exact replacement value for a chosen imputation method (Fix Problem 1)
function getComputedMethodValuePreview(colMeta, method, datasetRows = []) {
  if (!colMeta) return 'N/A';
  const stats = colMeta.stats || {};
  const dataType = colMeta.dataType || '';

  if (method === 'Median') {
    if (dataType !== 'Integer' && dataType !== 'Float') return 'N/A (Non-numeric)';
    return stats.median !== undefined ? `${stats.median}` : 'N/A';
  }
  if (method === 'Mean') {
    if (dataType !== 'Integer' && dataType !== 'Float') return 'N/A (Non-numeric)';
    return stats.mean !== undefined ? `${stats.mean}` : 'N/A';
  }
  if (method === 'Mode') {
    return stats.mode ? `"${stats.mode}" (${stats.modePercentage || 0}% frequency)` : 'N/A';
  }
  if (method === 'Median Date') {
    if (dataType !== 'Date') return 'N/A';
    const dates = datasetRows
      .map(r => r[colMeta.name])
      .filter(v => v && !isNaN(Date.parse(v)))
      .map(v => new Date(v).getTime())
      .sort((a, b) => a - b);
    if (dates.length === 0) return 'N/A';
    const midTime = dates[Math.floor(dates.length / 2)];
    return new Date(midTime).toISOString().split('T')[0];
  }
  if (method === 'Forward Fill (ffill)' || method === 'Forward Fill' || method === 'ffill') {
    const nonMissing = (datasetRows || []).filter(r => r[colMeta.name] !== undefined && r[colMeta.name] !== null && String(r[colMeta.name]).trim() !== '');
    const firstMissingIdx = (datasetRows || []).findIndex(r => r[colMeta.name] === undefined || r[colMeta.name] === null || String(r[colMeta.name]).trim() === '');
    let samplePrev = null;
    if (firstMissingIdx > 0) {
      for (let i = firstMissingIdx - 1; i >= 0; i--) {
        const val = datasetRows[i]?.[colMeta.name];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          samplePrev = val;
          break;
        }
      }
    }
    const fallback = nonMissing[0]?.[colMeta.name] || 'N/A';
    return samplePrev ? `Previous Row Date: "${samplePrev}"` : `Initial Valid Date: "${fallback}"`;
  }
  if (method === 'Backward Fill (bfill)' || method === 'Backward Fill' || method === 'bfill') {
    const nonMissing = (datasetRows || []).filter(r => r[colMeta.name] !== undefined && r[colMeta.name] !== null && String(r[colMeta.name]).trim() !== '');
    const firstMissingIdx = (datasetRows || []).findIndex(r => r[colMeta.name] === undefined || r[colMeta.name] === null || String(r[colMeta.name]).trim() === '');
    let sampleNext = null;
    if (firstMissingIdx >= 0) {
      for (let i = firstMissingIdx + 1; i < (datasetRows || []).length; i++) {
        const val = datasetRows[i]?.[colMeta.name];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          sampleNext = val;
          break;
        }
      }
    }
    const fallback = nonMissing[nonMissing.length - 1]?.[colMeta.name] || 'N/A';
    return sampleNext ? `Next Row Date: "${sampleNext}"` : `Trailing Valid Date: "${fallback}"`;
  }
  if (method === 'Drop Rows') {
    return `[Will remove rows with missing ${colMeta.name}]`;
  }
  return null;
}

// Helper: Validate custom user input for custom imputation
function validateCustomImputationInput(val, dataType, colName = '') {
  const trimmed = String(val ?? '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Custom value cannot be empty. Please enter a value before applying.' };
  }

  const colLower = colName.toLowerCase();

  if (dataType === 'Integer' || colLower.includes('age') || colLower.includes('qty') || colLower.includes('experience')) {
    const sanitized = trimmed.replace(/[$,]/g, '');
    const num = Number(sanitized);
    if (isNaN(num) || !isFinite(num)) {
      return { isValid: false, error: `Invalid number: "${trimmed}" is not a valid integer.` };
    }
    if (!Number.isInteger(num)) {
      return { isValid: false, error: `Whole integer required: "${trimmed}" contains decimals.` };
    }
    if (colLower === 'age' || colLower.endsWith('_age')) {
      if (num < 0 || num > 120) return { isValid: false, error: `Age must be between 0 and 120 (got ${num}).` };
    }
    if (num < 0 && (colLower.includes('qty') || colLower.includes('experience'))) {
      return { isValid: false, error: `${colName} cannot be negative.` };
    }
    return { isValid: true, sanitizedValue: num };
  }

  if (dataType === 'Float' || colLower.includes('salary') || colLower.includes('price') || colLower.includes('score')) {
    const sanitized = trimmed.replace(/[$,]/g, '');
    const num = Number(sanitized);
    if (isNaN(num) || !isFinite(num)) {
      return { isValid: false, error: `Invalid numeric value: "${trimmed}".` };
    }
    if (num < 0 && (colLower.includes('salary') || colLower.includes('price'))) {
      return { isValid: false, error: `${colName} cannot be negative.` };
    }
    if ((colLower.includes('score') || colLower.includes('percentage')) && (num < 0 || num > 100)) {
      return { isValid: false, error: `Score must be between 0 and 100.` };
    }
    return { isValid: true, sanitizedValue: num };
  }

  if (dataType === 'Boolean') {
    const lower = trimmed.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lower)) return { isValid: true, sanitizedValue: 'true' };
    if (['false', '0', 'no', 'n'].includes(lower)) return { isValid: true, sanitizedValue: 'false' };
    return { isValid: false, error: 'Boolean value must be true, false, yes, no, 1, or 0.' };
  }

  if (dataType === 'Date' || colLower.includes('date') || colLower.includes('dob')) {
    const parsed = Date.parse(trimmed);
    if (isNaN(parsed)) {
      return { isValid: false, error: 'Invalid Date format. Use YYYY-MM-DD (e.g. 2024-01-15).' };
    }
    return { isValid: true, sanitizedValue: trimmed };
  }

  return { isValid: true, sanitizedValue: trimmed };
}

  // Handle single approval
  const handleApproveRecommendation = (rec) => {
    const result = runImputation(rec.column, rec.recommendedMethod, rec.suggestedValue, rec.reason, rec.confidence);
    if (result && result.success !== false) {
      showNotification(`Successfully applied ${rec.recommendedMethod} imputation to '${rec.column}' (${result.affectedRowCount} cells updated).`, 'success');
    } else if (result && result.error) {
      showNotification(result.error, 'error');
    }
  };

  // Handle custom imputation submit with strict validation (Fix 1 & 2)
  const handleApplyCustomImputation = (colName, rec) => {
    if (!selectedMethod) {
      showNotification('Please select an imputation method.', 'error');
      return;
    }

    const meta = columnMetadata.find(c => c.name === colName) || {};
    let valueToApply = null;

    if (selectedMethod === 'Custom Value') {
      const validation = validateCustomImputationInput(customValueInput, rec?.dataType || meta.dataType, colName);
      if (!validation.isValid) {
        showNotification(validation.error, 'error');
        return;
      }
      valueToApply = validation.sanitizedValue;
    } else if (selectedMethod === 'Mean') {
      valueToApply = meta.stats?.mean;
    } else if (selectedMethod === 'Median') {
      valueToApply = meta.stats?.median;
    } else if (selectedMethod === 'Mode') {
      valueToApply = meta.stats?.mode;
    }

    const result = runImputation(
      colName, 
      selectedMethod, 
      valueToApply, 
      `Manual custom ${selectedMethod} imputation by user.`
    );
    
    if (result && result.success === false) {
      showNotification(result.error || 'Invalid value for this imputation method.', 'error');
      return;
    }

    if (result && result.success !== false) {
      showNotification(`Applied ${selectedMethod} imputation to '${colName}' (${result.affectedRowCount} cells updated).`, 'success');
      setSelectedColumn(null);
      setSelectedMethod('');
      setCustomValueInput('');
    }
  };

  // Handle batch approval
  const handleBatchApprove = () => {
    if (missingRecommendations.length === 0) return;
    runBatchImputations(missingRecommendations);
    showNotification(`Batch applied intelligent imputation to ${missingRecommendations.length} columns.`, 'success');
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto text-slate-800 dark:text-white transition-colors duration-500 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 p-4 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-3 animate-bounce ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 rounded-full text-xs font-semibold tracking-wider uppercase">
              Missing Values
            </span>
            <span className="text-xs text-slate-400 dark:text-[#8ba3c9]">Step 4 of 8</span>
          </div>
          <h2 className="text-3xl font-bold tracking-wide text-slate-900 dark:text-white transition-colors">
            Missing-Value Detection &amp; Explainable Imputation
          </h2>
          <p className="text-slate-500 dark:text-[#8ba3c9] mt-2 font-light transition-colors">
            Rule &amp; statistical heuristic recommendations with human-in-the-loop approval. Operates on <code className="text-xs font-mono bg-slate-100 dark:bg-[#0a1f44] px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">working_dataset</code> while preserving <code className="text-xs font-mono bg-slate-100 dark:bg-[#0a1f44] px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">original_dataset</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {imputationResults.length > 0 && (
            <button
              onClick={resetToOriginal}
              className="px-4 py-2 bg-slate-100 dark:bg-[#0a1f44] hover:bg-slate-200 dark:hover:bg-[#112a58] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#1a325a] flex items-center gap-2 transition-all shadow-sm"
            >
              <Undo2 className="w-4 h-4 text-amber-500" />
              Reset to Original Dataset
            </button>
          )}

          {pendingColumns.length > 0 && (
            <button
              onClick={handleBatchApprove}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Approve All Recommendations
            </button>
          )}
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#05142e]/80 p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Missing Values</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {totalMissingCells.toLocaleString()} <span className="text-xs font-normal text-slate-400">({overallMissingPercent}%)</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-[#8ba3c9]">Total empty / null cells</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-500">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Affected Rows</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {rowsWithMissing.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {totalRows.toLocaleString()}</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-[#8ba3c9]">Rows with &ge;1 missing value</span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-500">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Quality Grade</p>
            <h3 className={`text-2xl font-bold mt-1 ${qualityGrade === 'A+' || qualityGrade === 'A' ? 'text-emerald-500' : qualityGrade === 'B' ? 'text-blue-500' : 'text-rose-500'}`}>
              Grade {qualityGrade}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-[#8ba3c9]">Completeness index</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Imputations Done</p>
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {imputationResults.length} <span className="text-xs font-normal text-slate-400">actions</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-[#8ba3c9]">Applied to working copy</span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Analysis Chart & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Missing Values Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Missing Values by Column (Detection Distribution)
            </h3>
            <span className="text-xs text-slate-400">Current working copy</span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingByCol} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#1e293b',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name, item) => [`${value}% (${item.payload.count} cells)`, 'Missing']}
                />
                <Bar dataKey="missing" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {missingByCol.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.missing > 15 ? '#ef4444' : entry.missing > 0 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Missing Value Detection Table Summary & Custom Markers Settings */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                Detection Breakdown
              </h3>
              
              <div className="flex items-center gap-3">
                {/* Optional Configurable Ambiguous Markers Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500 dark:text-[#8ba3c9] hover:text-slate-800 dark:hover:text-white transition-colors" title="Toggle whether '-' and '?' should be treated as missing values">
                  <input
                    type="checkbox"
                    checked={Boolean(profilingOptions?.includeAmbiguousMarkers)}
                    onChange={(e) => updateProfilingOptions({ includeAmbiguousMarkers: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Include '-' &amp; '?'</span>
                </label>

                {/* Toggle Column Custom Missing Markers Drawer */}
                <button
                  type="button"
                  onClick={() => setShowGlobalMarkerManager(!showGlobalMarkerManager)}
                  className={`text-[11px] px-2 py-1 rounded-md font-medium border flex items-center gap-1 transition-all ${
                    showGlobalMarkerManager || Object.keys(profilingOptions?.columnCustomMarkers || {}).length > 0
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
                      : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-[#0a1f44] dark:text-slate-300 dark:border-[#1a325a] hover:bg-slate-100'
                  }`}
                  title="Configure custom specific values in each column to be considered missing"
                >
                  <Tag className="w-3 h-3 text-indigo-500" />
                  <span>Custom Values</span>
                  {Object.keys(profilingOptions?.columnCustomMarkers || {}).length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {missingByCol.map((col, idx) => {
                const colMarkers = profilingOptions?.columnCustomMarkers?.[col.name];
                const markerCount = Array.isArray(colMarkers) ? colMarkers.length : (colMarkers ? 1 : 0);

                return (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-[#0a1f44]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-white">{col.name}</span>
                        {markerCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 rounded font-medium" title="Custom missing value markers active for this column">
                            {markerCount} custom
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{col.type}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${col.count > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {col.count} cells
                      </span>
                      <span className="text-[10px] text-slate-400 block">{col.missing}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1a325a] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Standard missing:</span>
            <span className="font-mono text-slate-500 dark:text-[#8ba3c9]">NaN, NULL, N/A, &quot;&quot;, None</span>
          </div>
        </div>
      </div>

      {/* Global Column Custom Missing Markers Collapsible Manager */}
      {showGlobalMarkerManager && (
        <div className="mb-8 p-5 bg-white dark:bg-[#05142e]/90 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                Optional: Treat Specific Column Values as Missing
              </h4>
            </div>
            <button
              onClick={() => setShowGlobalMarkerManager(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8ba3c9] mb-4">
            Specify custom values (e.g. <code className="bg-slate-100 dark:bg-[#0a1f44] px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">INVALID_DATE</code>, <code className="bg-slate-100 dark:bg-[#0a1f44] px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">-999</code>, <code className="bg-slate-100 dark:bg-[#0a1f44] px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">unknown</code>, <code className="bg-slate-100 dark:bg-[#0a1f44] px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">?</code>) for any column. Any cell containing these values will automatically be treated as missing and cleaned with your chosen imputation method.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataset.headers.map((colName) => {
              const currentMarkers = profilingOptions?.columnCustomMarkers?.[colName];
              const markerArr = Array.isArray(currentMarkers)
                ? currentMarkers
                : (typeof currentMarkers === 'string' && currentMarkers ? [currentMarkers] : []);
              const inputValue = columnMarkerInputs[colName] !== undefined
                ? columnMarkerInputs[colName]
                : markerArr.join(', ');

              return (
                <div key={colName} className="p-3 bg-slate-50 dark:bg-[#0a1f44] rounded-xl border border-slate-200 dark:border-[#1a325a] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-slate-800 dark:text-white truncate max-w-[140px]" title={colName}>
                      {colName}
                    </span>
                    {markerArr.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearColumnMarkers(colName)}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. INVALID_DATE, -999"
                      value={inputValue}
                      onChange={(e) => handleMarkerInputChange(colName, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveColumnMarkers(colName); }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#1a325a] bg-white dark:bg-[#05142e] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveColumnMarkers(colName)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0"
                    >
                      Save
                    </button>
                  </div>

                  {markerArr.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {markerArr.map((tok, ti) => (
                        <span key={ti} className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-mono">
                          "{tok}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#1a325a] mb-6">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`pb-3 px-6 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'recommendations'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-[#8ba3c9] hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Explainable Recommendations ({pendingColumns.length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-6 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-[#8ba3c9] hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Imputation Audit Trail ({imputationResults.length})
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`pb-3 px-6 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'diff'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-[#8ba3c9] hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          Live Before vs After Comparison
        </button>
      </div>

      {/* TAB 1: Explainable AI Recommendations */}
      {activeTab === 'recommendations' && (
        <div>
          {pendingColumns.length === 0 ? (
            <div className="bg-white dark:bg-[#05142e]/80 p-12 rounded-2xl border border-slate-200 dark:border-[#1a325a] text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Missing Values in Working Dataset</h3>
              <p className="text-xs text-slate-500 dark:text-[#8ba3c9] max-w-md mx-auto mb-6">
                All missing entries have been cleanly imputed or your dataset arrived with 100% completeness.
              </p>
              <div className="flex justify-center gap-4">
                {imputationResults.length > 0 && (
                  <button
                    onClick={resetToOriginal}
                    className="px-6 py-2.5 bg-slate-100 dark:bg-[#0a1f44] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-[#112a58] transition-colors border border-slate-200 dark:border-[#1a325a]"
                  >
                    Reset to Original Dataset
                  </button>
                )}
                <Link
                  to="/duplicates"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-2"
                >
                  Proceed to Duplicate Detection
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missingRecommendations.map((rec) => {
                const currentMissing = dataset.rows.filter(r => isMissingValue(r[rec.column], profilingOptions, rec.column)).length;
                if (currentMissing === 0) return null;

                const isCustomOpen = selectedColumn === rec.column;
                const rawCustomMarkers = profilingOptions?.columnCustomMarkers?.[rec.column];
                const configuredMarkers = Array.isArray(rawCustomMarkers) 
                  ? rawCustomMarkers 
                  : (typeof rawCustomMarkers === 'string' && rawCustomMarkers ? [rawCustomMarkers] : []);
                const currentMarkerInput = columnMarkerInputs[rec.column] !== undefined 
                  ? columnMarkerInputs[rec.column] 
                  : configuredMarkers.join(', ');

                return (
                  <div
                    key={rec.column}
                    className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Top badge line */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900 dark:text-white">{rec.column}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0a1f44] text-slate-600 dark:text-slate-300 font-mono">
                            {rec.dataType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-rose-500">
                            {currentMissing} missing ({((currentMissing / totalRows) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Optional: Per-column custom missing tokens input */}
                      <div className="mb-4 p-3 bg-slate-50 dark:bg-[#0a1f44]/60 rounded-xl border border-slate-200 dark:border-[#1a325a]/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-500" />
                            Treat Specific Values as Missing (Optional):
                          </span>
                          {configuredMarkers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearColumnMarkers(rec.column)}
                              className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. INVALID_DATE, -999 (comma-separated)..."
                            value={currentMarkerInput}
                            onChange={(e) => handleMarkerInputChange(rec.column, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveColumnMarkers(rec.column); }}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#1a325a] bg-white dark:bg-[#05142e] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveColumnMarkers(rec.column)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                          >
                            Set
                          </button>
                        </div>
                        {configuredMarkers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            <span className="text-[10px] text-slate-400">Active custom tokens:</span>
                            {configuredMarkers.map((tok, ti) => (
                              <span key={ti} className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-mono font-medium">
                                "{tok}"
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recommendation Box */}
                      <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-[#081a3d]/80 border border-blue-100 dark:border-blue-500/20 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            Recommended: {rec.recommendedMethod}
                          </div>
                          <span className="px-2 py-0.5 bg-blue-600 text-white dark:bg-blue-500 text-[10px] font-bold rounded-full shadow-sm">
                            {rec.confidence}% Confidence
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-[#8ba3c9] leading-relaxed mb-3">
                          {rec.reason}
                        </p>

                        {rec.suggestedValue !== null && (
                          <div className="text-xs font-mono text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-[#05142e]/60 px-3 py-1.5 rounded-lg border border-blue-100/50 dark:border-blue-500/10 flex items-center justify-between">
                            <span className="text-slate-400">Calculated Imputation Value:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-300">{String(rec.suggestedValue)}</span>
                          </div>
                        )}
                      </div>

                      {/* Custom Method Toggle (Human-in-the-loop with Type Safety & Dynamic Value Preview) */}
                      {isCustomOpen && (() => {
                        const allowedMethods = getAllowedImputationMethods(rec.dataType);
                        const activeMethod = selectedMethod || rec.recommendedMethod;
                        const colMeta = columnMetadata.find(c => c.name === rec.column) || {};
                        const previewValue = getComputedMethodValuePreview(colMeta, activeMethod, dataset?.rows || []);
                        const customValidation = selectedMethod === 'Custom Value' 
                          ? validateCustomImputationInput(customValueInput, rec.dataType, rec.column)
                          : { isValid: true };
                        const isApplyDisabled = !selectedMethod || (selectedMethod === 'Custom Value' && !customValidation.isValid);

                        return (
                          <div className="p-4 mb-4 rounded-xl bg-slate-50 dark:bg-[#0a1f44] border border-slate-200 dark:border-[#1a325a] animate-fade-in shadow-inner">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Alternative Imputation Strategy:</p>
                              <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                                {rec.dataType} Field
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                              {allowedMethods.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setSelectedMethod(m)}
                                  className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left flex flex-col justify-center ${
                                    selectedMethod === m
                                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20 ring-2 ring-blue-400 dark:ring-blue-500'
                                      : 'bg-white dark:bg-[#05142e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1a325a] hover:border-blue-300 dark:hover:border-blue-600'
                                  }`}
                                >
                                  <span>{m}</span>
                                </button>
                              ))}
                            </div>

                            {/* Dynamic Replacement Value Preview Box */}
                            <div className="p-3 bg-blue-50/70 dark:bg-[#081a3d]/80 rounded-xl border border-blue-200/70 dark:border-blue-500/30 text-xs mb-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-[#8ba3c9] font-medium">Selected Strategy:</span>
                                <span className="font-bold text-blue-700 dark:text-blue-300">{selectedMethod || 'None Selected'}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t border-blue-100 dark:border-blue-900/50">
                                <span className="text-slate-500 dark:text-[#8ba3c9] font-medium">Calculated Replacement Value:</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300 text-xs bg-white dark:bg-[#05142e] px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/50">
                                  {selectedMethod === 'Custom Value'
                                    ? (customValueInput.trim() ? customValueInput.trim() : '(Waiting for custom input...)')
                                    : (previewValue ?? 'Select a method above')}
                                </span>
                              </div>
                            </div>

                            {/* Custom Value Input and Live Inline Validation */}
                            {selectedMethod === 'Custom Value' && (
                              <div className="mb-3">
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                  Custom Replacement Value <span className="text-rose-500">*</span>:
                                </label>
                                <input
                                  type="text"
                                  placeholder={
                                    rec.dataType === 'Integer' 
                                      ? 'Enter whole integer (e.g. 25)...' 
                                      : rec.dataType === 'Float' 
                                      ? 'Enter decimal number (e.g. 25.5)...'
                                      : rec.dataType === 'Boolean'
                                      ? 'Enter true / false...'
                                      : rec.dataType === 'Date'
                                      ? 'Enter YYYY-MM-DD (e.g. 2024-01-15)...'
                                      : 'Enter text value...'
                                  }
                                  value={customValueInput}
                                  onChange={(e) => setCustomValueInput(e.target.value)}
                                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#05142e] text-slate-800 dark:text-white transition-all focus:outline-none focus:ring-2 ${
                                    customValueInput && !customValidation.isValid
                                      ? 'border-rose-400 dark:border-rose-500/60 focus:ring-rose-400'
                                      : 'border-slate-300 dark:border-[#1a325a] focus:ring-blue-500'
                                  }`}
                                />
                                {!customValueInput.trim() ? (
                                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                                    <span>⚠</span> Custom value is required before approving.
                                  </p>
                                ) : !customValidation.isValid ? (
                                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                                    <span>✖</span> {customValidation.error}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                                    <span>✓</span> Valid {rec.dataType} value.
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                onClick={() => { setSelectedColumn(null); setSelectedMethod(''); setCustomValueInput(''); }}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={isApplyDisabled}
                                onClick={() => handleApplyCustomImputation(rec.column, rec)}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                              >
                                Apply {selectedMethod || 'Custom'} Method
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-[#1a325a]">
                      <button
                        onClick={() => handleApproveRecommendation(rec)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve &amp; Apply {rec.recommendedMethod}
                      </button>

                      <button
                        onClick={() => {
                          if (isCustomOpen) {
                            setSelectedColumn(null);
                          } else {
                            setSelectedColumn(rec.column);
                            setSelectedMethod(rec.recommendedMethod);
                          }
                        }}
                        className="px-3 py-2.5 bg-slate-100 dark:bg-[#0a1f44] hover:bg-slate-200 dark:hover:bg-[#112a58] text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#1a325a] transition-colors"
                        title="Customize Cleaning Action"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Imputation Audit Trail (Fix 3: Comprehensive Audit Fields) */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm rounded-2xl shadow-md border border-slate-200 dark:border-[#1a325a] overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#1a325a] flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-blue-500" />
              Imputation Execution Log (Audit Records)
            </h3>
            <span className="text-xs text-slate-400">{imputationResults.length} operations executed</span>
          </div>

          {imputationResults.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No imputations applied yet. Approve recommendations to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0a1f44] border-b border-slate-200 dark:border-[#1a325a] text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Operation ID</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Column</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Decision</th>
                    <th className="px-3 py-3">Confidence</th>
                    <th className="px-4 py-3">Imputed Value</th>
                    <th className="px-4 py-3">Cells Replaced</th>
                    <th className="px-5 py-3">Reason / Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a325a]">
                  {imputationResults.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#0a2352]/30">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400 truncate max-w-[100px]">{item.operationId || item.id}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{item.timestamp}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{item.column}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 rounded font-semibold text-[10px]">
                          {item.method}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 rounded font-semibold text-[10px]">
                          {item.decision || 'Approved'}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-blue-600 dark:text-blue-400">
                        {item.confidence ? `${item.confidence}%` : '85%'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {String(item.replacementValue)}
                      </td>
                      <td className="px-4 py-3 text-emerald-500 font-semibold">{item.affectedRowCount} cells</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-[#8ba3c9] max-w-xs truncate" title={item.reason}>
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Before vs After Comparison (Fix 4: Stable ID-based matching) */}
      {activeTab === 'diff' && (
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm rounded-2xl shadow-md border border-slate-200 dark:border-[#1a325a] overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#1a325a] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" />
                Original Dataset vs Working Dataset Comparison
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Highlighting cells updated via approved imputation algorithms matched by stable row IDs.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0a1f44] border-b border-slate-200 dark:border-[#1a325a] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-12 font-mono">Row</th>
                  {dataset.headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a325a]">
                {workingDataset.rows.slice(0, 15).map((row, rowIdx) => {
                  // Match original row strictly using stable __row_id (Fix 4)
                  const rowId = row.__row_id !== undefined ? row.__row_id : rowIdx + 1;
                  const origRow = originalRowMap.get(rowId) || originalDataset?.rows[rowIdx] || {};

                  return (
                    <tr key={rowId || rowIdx} className="hover:bg-slate-50 dark:hover:bg-[#0a2352]/30">
                      <td className="px-4 py-3 text-slate-400 text-center font-mono bg-slate-50/40 dark:bg-[#0a1f44]/30">
                        {rowIdx + 1}
                      </td>
                      {dataset.headers.map((h, colIdx) => {
                        const origVal = origRow[h];
                        const workVal = row[h];
                        const isOriginallyMissing = isMissingValue(origVal, profilingOptions, h);
                        const isNowFilled = isOriginallyMissing && !isMissingValue(workVal, profilingOptions, h);

                        return (
                          <td key={colIdx} className="px-4 py-3">
                            {isNowFilled ? (
                              <div className="flex items-center gap-1.5">
                                <span className="line-through text-rose-400 opacity-60 text-[10px]">NULL</span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                  {String(workVal)}
                                </span>
                              </div>
                            ) : isOriginallyMissing ? (
                              <span className="text-rose-500 font-semibold text-[10px] bg-rose-50 dark:bg-rose-500/20 px-1.5 py-0.5 rounded">
                                NULL
                              </span>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300">{String(workVal)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
