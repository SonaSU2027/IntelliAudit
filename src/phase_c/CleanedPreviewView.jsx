/**
 * Phase C — Cleaned Dataset Preview & Before vs After Comparison
 * Module: Sudhanshu
 * 
 * Objective:
 * Side-by-side and diff visualizer comparing the original preserved dataset
 * with the final cleaned dataset, displaying affected cells, resolution metrics,
 * and quick CSV download controls.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePhaseC } from './PhaseCContext';
import { useDataset } from '../contexts/DatasetContext';
import { isMissingValue } from '../utils/dataProfiler';
import { 
  CheckCircle2, 
  Download, 
  FileText, 
  ArrowRight, 
  Search, 
  Eye, 
  SplitSquareVertical, 
  TrendingUp, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function CleanedPreviewView() {
  const { originalDataset, metadata } = useDataset();
  const {
    finalCleanedDataset,
    qualityComparison,
    handleDownloadCSV
  } = usePhaseC();

  const [viewMode, setViewMode] = useState('cleaned'); // 'cleaned' | 'diff' | 'original'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Build a lookup map of original rows by internal stable __row_id
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

  const cleanHeaders = useMemo(() => {
    if (!finalCleanedDataset || !finalCleanedDataset.headers) return [];
    return finalCleanedDataset.headers.filter(h => h !== '__row_id');
  }, [finalCleanedDataset]);

  const displayedRows = useMemo(() => {
    const sourceRows = viewMode === 'original'
      ? (originalDataset?.rows || [])
      : (finalCleanedDataset?.rows || []);

    if (!searchQuery.trim()) return sourceRows;

    const q = searchQuery.toLowerCase();
    return sourceRows.filter(row => {
      return cleanHeaders.some(h => String(row[h] ?? '').toLowerCase().includes(q));
    });
  }, [viewMode, originalDataset, finalCleanedDataset, cleanHeaders, searchQuery]);

  const totalPages = Math.ceil((displayedRows.length || 1) / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, currentPage, pageSize]);

  if (!originalDataset || !originalDataset.rows) {
    return (
      <div className="animate-fade-in max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[500px] text-center p-8">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-500/20">
          <ShieldCheck className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">No Dataset Loaded</h2>
        <p className="text-slate-500 dark:text-[#8ba3c9] max-w-md mb-8">
          Upload a dataset and approve cleaning operations to preview the cleaned results.
        </p>
        <Link
          to="/upload"
          className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg font-medium transition-all"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const beforeMetrics = qualityComparison?.before || {};
  const afterMetrics = qualityComparison?.after || {};
  const delta = qualityComparison?.delta || {};

  return (
    <div className="animate-fade-in max-w-7xl mx-auto text-slate-800 dark:text-white transition-colors duration-500 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 rounded-full text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cleaned Dataset Review
            </span>
            <span className="text-xs text-slate-400 dark:text-[#8ba3c9]">Step 7 of 8</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cleaned Dataset & Before vs After Comparison
          </h2>
          <p className="text-slate-500 dark:text-[#8ba3c9] mt-1 font-light text-sm">
            Live validation and side-by-side comparison for <span className="font-semibold text-slate-800 dark:text-white">{metadata?.filename}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCSV}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Download Cleaned CSV
          </button>

          <Link
            to="/report"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            View Audit Report
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Before vs After Comparison KPI Cards (C.6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Quality Score Delta */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-sm p-5 rounded-2xl border border-indigo-500/30 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Quality Score</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
              +{delta.overallScore ?? 0}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{afterMetrics.overallScore ?? 0}%</span>
            <span className="text-xs text-slate-400 line-through">from {beforeMetrics.overallScore ?? 0}%</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {delta.relativeImprovement > 0 ? `+${delta.relativeImprovement}% relative improvement` : 'Optimal quality'}
          </div>
        </div>

        {/* Records Count Delta */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Records</span>
            {delta.rowsDiff !== 0 && (
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded text-[10px] font-bold">
                {delta.rowsDiff} rows
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {afterMetrics.counts?.totalRows?.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-slate-400">was {beforeMetrics.counts?.totalRows?.toLocaleString() ?? 0}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {delta.duplicatesRemoved || 0} duplicate/outlier rows pruned
          </p>
        </div>

        {/* Missing Cells Delta */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Missing Cells</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
              {afterMetrics.counts?.missingCells === 0 ? 'All Fixed' : `${afterMetrics.counts?.missingCells} Left`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-500">
              {afterMetrics.counts?.missingCells ?? 0}
            </span>
            <span className="text-xs text-slate-400 line-through">was {beforeMetrics.counts?.missingCells ?? 0}</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-500 font-medium">
            {delta.missingResolved || 0} empty cells imputed
          </p>
        </div>

        {/* Duplicates Delta */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Duplicates</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
              {afterMetrics.counts?.duplicateRows === 0 ? '0 Left' : `${afterMetrics.counts?.duplicateRows} Remaining`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-500">
              {afterMetrics.counts?.duplicateRows ?? 0}
            </span>
            <span className="text-xs text-slate-400 line-through">was {beforeMetrics.counts?.duplicateRows ?? 0}</span>
          </div>
          <p className="mt-2 text-[11px] text-indigo-400 font-medium">
            {delta.duplicatesRemoved || 0} duplicates resolved
          </p>
        </div>

        {/* Rules & Anomalies Delta */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Violations & Outliers</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
              Cleaned
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-500">
              {(afterMetrics.counts?.ruleViolations || 0) + (afterMetrics.counts?.anomalies || 0)}
            </span>
            <span className="text-xs text-slate-400 line-through">
              was {(beforeMetrics.counts?.ruleViolations || 0) + (beforeMetrics.counts?.anomalies || 0)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-purple-400 font-medium">
            {(delta.ruleViolationsFixed || 0) + (delta.anomaliesHandled || 0)} issues corrected
          </p>
        </div>
      </div>

      {/* Table Toolbar & View Switcher */}
      <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0a1e45] p-1 rounded-xl border border-slate-200 dark:border-[#1a325a]">
            <button
              onClick={() => {
                setViewMode('cleaned');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'cleaned'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-[#8ba3c9] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Cleaned Dataset ({finalCleanedDataset?.rows?.length || 0} rows)
            </button>

            <button
              onClick={() => {
                setViewMode('diff');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'diff'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-[#8ba3c9] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-4 h-4 text-indigo-300" />
              Side-by-Side Diff View
            </button>

            <button
              onClick={() => {
                setViewMode('original');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'original'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-[#8ba3c9] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-300" />
              Original Preserved ({originalDataset?.rows?.length || 0} rows)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search in table..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0a1e45] border border-slate-200 dark:border-[#1a325a] text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Interactive Table Container */}
      <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-[#8ba3c9]">
            <thead className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase bg-slate-100 dark:bg-[#0a1e45] border-b border-slate-200 dark:border-[#1a325a]">
              <tr>
                <th className="px-4 py-3.5 w-16"># Row ID</th>
                {cleanHeaders.map((header, idx) => (
                  <th key={idx} className="px-4 py-3.5 whitespace-nowrap font-bold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a325a]/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={cleanHeaders.length + 1} className="px-4 py-12 text-center text-slate-400">
                    No rows match the search query.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rIdx) => {
                  const rowId = row.__row_id !== undefined ? row.__row_id : (currentPage - 1) * pageSize + rIdx + 1;
                  const origRow = originalRowMap.get(rowId);

                  return (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#0a1e45]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        #{rowId}
                      </td>

                      {cleanHeaders.map((header, cIdx) => {
                        const currentVal = row[header];
                        const origVal = origRow ? origRow[header] : undefined;
                        const isModified = origVal !== undefined && String(currentVal) !== String(origVal);
                        const wasMissing = origVal !== undefined && isMissingValue(origVal);

                        if (viewMode === 'diff' && isModified) {
                          return (
                            <td key={cIdx} className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-rose-500 line-through bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded font-mono">
                                  {wasMissing ? '<empty>' : String(origVal)}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono">
                                  {String(currentVal)}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={cIdx} className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-mono ${
                              isModified 
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded' 
                                : isMissingValue(currentVal)
                                ? 'text-amber-500 italic bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {isMissingValue(currentVal) ? '<null>' : String(currentVal)}
                            </span>
                            {isModified && viewMode === 'cleaned' && (
                              <span className="ml-1.5 px-1 py-0.2 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 rounded text-[9px] font-sans font-bold">
                                Cleaned
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 dark:bg-[#0a1e45]/50 border-t border-slate-100 dark:border-[#1a325a] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#8ba3c9]">
          <div>
            Showing <span className="font-semibold text-slate-800 dark:text-white">
              {displayedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span> to <span className="font-semibold text-slate-800 dark:text-white">
              {Math.min(currentPage * pageSize, displayedRows.length)}
            </span> of <span className="font-semibold text-slate-800 dark:text-white">{displayedRows.length}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white dark:bg-[#05142e] border border-slate-200 dark:border-[#1a325a] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-white dark:bg-[#05142e] border border-slate-200 dark:border-[#1a325a] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
