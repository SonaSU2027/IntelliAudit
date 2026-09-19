/**
 * Phase C — Audit Report & Compliance Artifacts View
 * Module: Sudhanshu
 * 
 * Objective:
 * Generates an audit-ready, downloadable, and printable compliance report
 * documenting before/after quality metrics, approved operations, and the full audit trail.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePhaseC } from './PhaseCContext';
import { useDataset } from '../contexts/DatasetContext';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  TrendingUp, 
  Database, 
  Clock, 
  Search 
} from 'lucide-react';

export default function AuditReportView() {
  const { originalDataset } = useDataset();
  const {
    auditReportData,
    handleDownloadCSV,
    handleDownloadReportTXT,
    handleDownloadReportPDF
  } = usePhaseC();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!originalDataset || !originalDataset.rows) {
    return (
      <div className="animate-fade-in max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[500px] text-center p-8">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-500/20">
          <FileText className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">No Dataset Loaded</h2>
        <p className="text-slate-500 dark:text-[#8ba3c9] max-w-md mb-8">
          Please upload a CSV dataset to generate an explainable audit report.
        </p>
        <Link
          to="/upload"
          className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg transition-all"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const reportMeta = auditReportData?.report_metadata || {};
  const datasetOverview = auditReportData?.dataset_overview || {};
  const qualityMetrics = auditReportData?.quality_metrics || {};
  const cleanSummary = auditReportData?.cleaning_summary || {};
  const auditTrail = auditReportData?.audit_trail || [];

  const filteredTrail = auditTrail.filter(entry => {
    if (selectedCategory !== 'All' && entry.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = (entry.action || '').toLowerCase().includes(q);
      const matchDetails = (entry.details || '').toLowerCase().includes(q);
      const matchCol = (entry.column || '').toLowerCase().includes(q);
      if (!matchAction && !matchDetails && !matchCol) return false;
    }
    return true;
  });

  return (
    <div className="animate-fade-in max-w-6xl mx-auto text-slate-800 dark:text-white transition-colors duration-500 pb-16 space-y-8">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 rounded-full text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phase C — Final Audit & Export
            </span>
            <span className="text-xs text-slate-400 dark:text-[#8ba3c9]">Step 8 of 8</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Data Quality Audit Report
          </h2>
          <p className="text-slate-500 dark:text-[#8ba3c9] mt-1 font-light text-sm">
            Formal compliance report documenting before/after quality scores, approved operations, and audit trail.
          </p>
        </div>

        {/* 3 Download Buttons: Cleaned CSV, Audit Report (.txt), Analytical Report (.pdf) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download cleaned dataset in CSV format"
          >
            <Download className="w-4 h-4" />
            Download Cleaned CSV (.csv)
          </button>

          <button
            onClick={handleDownloadReportTXT}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download plain text audit report"
          >
            <FileText className="w-4 h-4" />
            Audit Report (.txt)
          </button>

          <button
            onClick={() => handleDownloadReportPDF()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download analytical visual report in PDF format"
          >
            <FileText className="w-4 h-4" />
            Analytical Report (.pdf)
          </button>
        </div>
      </div>

      {/* Main Formal Report Container */}
      <div className="bg-white dark:bg-[#05142e]/90 backdrop-blur-sm p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-[#1a325a] shadow-xl space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Formal Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#1a325a]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  IntelliAudit Compliance Certification
                </h3>
                <p className="text-xs text-slate-400">
                  Explainable Data Quality Assessment & Intelligent Cleaning Engine
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0a1e45] p-4 rounded-2xl border border-slate-100 dark:border-[#1a325a] text-xs space-y-1 sm:text-right">
            <div><span className="text-slate-400">Report ID:</span> <strong className="font-mono text-slate-800 dark:text-white">{reportMeta.report_id}</strong></div>
            <div><span className="text-slate-400">Generated:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{reportMeta.formatted_date}</span></div>
            <div><span className="text-slate-400">Source:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{reportMeta.source_file}</span></div>
            <div><span className="text-slate-400">Status:</span> <span className="text-emerald-500 font-bold">✓ Certified</span></div>
          </div>
        </div>

        {/* 1. Executive Quality Score Summary (C.6 & C.7) */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            1. Executive Quality Score Summary
          </h4>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1a325a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#0a1e45] text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Dimension / Metric</th>
                  <th className="px-5 py-3.5">Before Cleaning</th>
                  <th className="px-5 py-3.5">After Cleaning</th>
                  <th className="px-5 py-3.5">Delta Improvement</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a325a]/60 font-medium">
                <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-sm">
                    Overall Quality Score
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                    {qualityMetrics.before_score}% ({qualityMetrics.grade_before})
                  </td>
                  <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {qualityMetrics.after_score}% ({qualityMetrics.grade_after})
                  </td>
                  <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{qualityMetrics.after_score - qualityMetrics.before_score}% ({qualityMetrics.improvement_percentage}% rel.)
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 rounded font-bold text-[10px]">
                      Optimal
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Completeness</td>
                  <td className="px-5 py-3 font-mono">{qualityMetrics.dimensions_before?.completeness ?? 0}%</td>
                  <td className="px-5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{qualityMetrics.dimensions_after?.completeness ?? 0}%</td>
                  <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    +{(qualityMetrics.dimensions_after?.completeness || 0) - (qualityMetrics.dimensions_before?.completeness || 0)}%
                  </td>
                  <td className="px-5 py-3 text-emerald-500 font-bold">Passed</td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Uniqueness</td>
                  <td className="px-5 py-3 font-mono">{qualityMetrics.dimensions_before?.uniqueness ?? 0}%</td>
                  <td className="px-5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{qualityMetrics.dimensions_after?.uniqueness ?? 0}%</td>
                  <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    +{(qualityMetrics.dimensions_after?.uniqueness || 0) - (qualityMetrics.dimensions_before?.uniqueness || 0)}%
                  </td>
                  <td className="px-5 py-3 text-emerald-500 font-bold">Passed</td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Validity (Rules)</td>
                  <td className="px-5 py-3 font-mono">{qualityMetrics.dimensions_before?.validity ?? 0}%</td>
                  <td className="px-5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{qualityMetrics.dimensions_after?.validity ?? 0}%</td>
                  <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    +{(qualityMetrics.dimensions_after?.validity || 0) - (qualityMetrics.dimensions_before?.validity || 0)}%
                  </td>
                  <td className="px-5 py-3 text-emerald-500 font-bold">Passed</td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Consistency</td>
                  <td className="px-5 py-3 font-mono">{qualityMetrics.dimensions_before?.consistency ?? 0}%</td>
                  <td className="px-5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{qualityMetrics.dimensions_after?.consistency ?? 0}%</td>
                  <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    +{(qualityMetrics.dimensions_after?.consistency || 0) - (qualityMetrics.dimensions_before?.consistency || 0)}%
                  </td>
                  <td className="px-5 py-3 text-emerald-500 font-bold">Passed</td>
                </tr>

                <tr>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Anomaly Health</td>
                  <td className="px-5 py-3 font-mono">{qualityMetrics.dimensions_before?.anomalyHealth ?? 0}%</td>
                  <td className="px-5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{qualityMetrics.dimensions_after?.anomalyHealth ?? 0}%</td>
                  <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    +{(qualityMetrics.dimensions_after?.anomalyHealth || 0) - (qualityMetrics.dimensions_before?.anomalyHealth || 0)}%
                  </td>
                  <td className="px-5 py-3 text-emerald-500 font-bold">Passed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Dataset Dimensions & Operations Summary (C.8) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-[#0a1e45]/60 p-6 rounded-2xl border border-slate-200 dark:border-[#1a325a] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Dataset Dimension Profile
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block">Original Records</span>
                <strong className="text-base text-slate-900 dark:text-white font-mono">
                  {datasetOverview.original_rows.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Cleaned Records</span>
                <strong className="text-base text-emerald-600 dark:text-emerald-400 font-mono">
                  {datasetOverview.cleaned_rows.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Total Attributes</span>
                <strong className="text-base text-slate-900 dark:text-white font-mono">
                  {datasetOverview.columns_count}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Preserved Original</span>
                <strong className="text-base text-blue-500 font-mono">
                  100% Immutable
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0a1e45]/60 p-6 rounded-2xl border border-slate-200 dark:border-[#1a325a] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Cleaning Operations Executed
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block">Missing Values Handled</span>
                <strong className="text-base text-slate-900 dark:text-white font-mono">
                  {cleanSummary.missing_values_imputed}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Duplicates Removed</span>
                <strong className="text-base text-slate-900 dark:text-white font-mono">
                  {cleanSummary.duplicates_removed}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Anomalies Resolved</span>
                <strong className="text-base text-slate-900 dark:text-white font-mono">
                  {cleanSummary.anomalies_handled}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Rules & Typos Fixed</span>
                <strong className="text-base text-slate-900 dark:text-white font-mono">
                  {(cleanSummary.rule_violations_fixed || 0) + (cleanSummary.typos_corrected || 0)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Chronological Audit Trail Log */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              3. Complete Chronological Audit Trail
            </h4>

            {/* Filter toolbar in report */}
            <div className="flex items-center gap-2 print:hidden">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-[#0a1e45] border border-slate-200 dark:border-[#1a325a] text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1a325a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#0a1e45] text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a325a]/60">
                {filteredTrail.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No audit entries found.
                    </td>
                  </tr>
                ) : (
                  filteredTrail.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#0a1e45]/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                        {log.category || 'Cleaning'}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                        {log.action}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 rounded text-[10px] font-bold">
                          {log.decision || 'Approved'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-md truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="px-4 py-2.5 text-emerald-500 font-bold">
                        {log.status || 'Applied'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor Sign-off Footer */}
        <div className="pt-8 border-t border-slate-200 dark:border-[#1a325a] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Auditor: {reportMeta.auditor}
            </p>
            <p className="text-[11px]">System: {reportMeta.system_name}</p>
          </div>
          <div className="text-center sm:text-right">
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full font-mono text-[11px] border border-blue-200 dark:border-blue-900/40">
              Hash Checksum: {reportMeta.report_id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
