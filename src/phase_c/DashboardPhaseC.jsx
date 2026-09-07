/**
 * Phase C — Executive Data Quality & Cleaning Dashboard
 * Module: Sudhanshu
 * 
 * Objective:
 * Visually attractive, modern analytics dashboard displaying live dataset metrics,
 * dynamic quality scores (5 dimensions), Recharts radar & confidence charts,
 * before-vs-after resolution tracking, and quick navigation controls.
 */

import { Link } from 'react-router-dom';
import { usePhaseC } from './PhaseCContext';
import { useDataset } from '../contexts/DatasetContext';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  CheckCircle2, 
  SlidersHorizontal, 
  Download, 
  Zap, 
  Database 
} from 'lucide-react';

export default function DashboardPhaseC() {
  const { originalDataset, metadata } = useDataset();
  const {
    recommendations,
    approvedRecommendations,
    qualityComparison,
    handleDownloadCSV
  } = usePhaseC();

  if (!originalDataset || !originalDataset.rows || originalDataset.rows.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-slate-800 dark:text-white text-center p-8">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-500/20">
          <ShieldCheck className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">Data Quality Dashboard</h2>
        <p className="text-slate-500 dark:text-[#8ba3c9] max-w-md mb-8">
          Upload a CSV dataset to initiate automated profiling, anomaly scanning, and dynamic quality analysis.
        </p>
        <Link
          to="/upload"
          className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg transition-all"
        >
          Upload Dataset
        </Link>
      </div>
    );
  }

  const beforeMetrics = qualityComparison?.before || {};
  const afterMetrics = qualityComparison?.after || {};
  const delta = qualityComparison?.delta || {};

  const beforeScore = beforeMetrics.overallScore ?? 0;
  const afterScore = afterMetrics.overallScore ?? beforeScore;
  const gradeObj = afterMetrics.grade || { grade: 'B', label: 'Good Quality', color: '#3b82f6' };

  // 1. Radar Chart Data: 5 Dimensions (Before vs After)
  const radarData = [
    {
      subject: 'Completeness',
      Before: beforeMetrics.dimensions?.completeness ?? 0,
      After: afterMetrics.dimensions?.completeness ?? 0,
      fullMark: 100
    },
    {
      subject: 'Uniqueness',
      Before: beforeMetrics.dimensions?.uniqueness ?? 0,
      After: afterMetrics.dimensions?.uniqueness ?? 0,
      fullMark: 100
    },
    {
      subject: 'Validity',
      Before: beforeMetrics.dimensions?.validity ?? 0,
      After: afterMetrics.dimensions?.validity ?? 0,
      fullMark: 100
    },
    {
      subject: 'Consistency',
      Before: beforeMetrics.dimensions?.consistency ?? 0,
      After: afterMetrics.dimensions?.consistency ?? 0,
      fullMark: 100
    },
    {
      subject: 'Anomaly Health',
      Before: beforeMetrics.dimensions?.anomalyHealth ?? 0,
      After: afterMetrics.dimensions?.anomalyHealth ?? 0,
      fullMark: 100
    }
  ];

  // 2. Issue Distribution Chart Data
  const issueData = [
    { name: 'Duplicates', count: (beforeMetrics.counts?.duplicateRows || 0), fill: '#f59e0b' },
    { name: 'Missing', count: (beforeMetrics.counts?.missingCells || 0), fill: '#3b82f6' },
    { name: 'Anomalies', count: (beforeMetrics.counts?.anomalies || 0), fill: '#ec4899' },
    { name: 'Rule Violations', count: (beforeMetrics.counts?.ruleViolations || 0), fill: '#ef4444' },
    { name: 'Inconsistencies', count: (beforeMetrics.counts?.inconsistencies || 0), fill: '#8b5cf6' }
  ];

  // 3. Confidence Tier Distribution Chart Data
  const highCount = recommendations.filter(r => r.confidenceLevel === 'High').length;
  const medCount = recommendations.filter(r => r.confidenceLevel === 'Medium').length;
  const lowCount = recommendations.filter(r => r.confidenceLevel === 'Low').length;

  const confidencePieData = [
    { name: 'High (≥90%)', value: highCount, color: '#10b981' },
    { name: 'Medium (70-89%)', value: medCount, color: '#f59e0b' },
    { name: 'Low (<70%)', value: lowCount, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  return (
    <div className="animate-fade-in text-slate-800 dark:text-white transition-colors duration-500 pb-16 space-y-8">
      {/* Top Banner & Quick Links */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 rounded-full text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              IntelliAudit Live Quality Center
            </span>
<<<<<<< HEAD
            <span className="text-xs text-slate-400 dark:text-[#8ba3c9]">Step 3 of 8</span>
=======
            <span className="text-xs text-slate-400 dark:text-[#8ba3c9]">Phase C Analytics</span>
>>>>>>> upstream/main
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Data Quality & Cleaning Dashboard
          </h2>
          <p className="text-slate-500 dark:text-[#8ba3c9] mt-1 font-light text-sm">
            Auditing file <span className="font-semibold text-slate-800 dark:text-white">{metadata?.filename}</span> ({originalDataset.rows.length.toLocaleString()} rows, {originalDataset.headers.filter(h => h !== '__row_id').length} columns)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/cleaning-actions"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Review Recommendations ({recommendations.length})
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 bg-slate-100 dark:bg-[#0a1e45] text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#1a325a] flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Main Dynamic Score & Health Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Quality Score Circle Card (C.7) */}
        <div className="bg-gradient-to-br from-[#0c234b] to-[#05142e] p-7 rounded-3xl border border-[#1a3f7a] shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Dynamic Quality Score
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-extrabold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +{delta.overallScore ?? 0}% Improvement
            </span>
          </div>

          <div className="flex items-center justify-center my-6">
            <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-blue-500/20 bg-blue-950/40 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
              {/* Glowing Inner Circle */}
              <div className="text-center">
                <span className="text-4xl font-black tracking-tight text-white block">
                  {afterScore}%
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mt-1 block">
                  Grade: {gradeObj.grade}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-blue-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Baseline (Before)</span>
              <span className="font-bold text-white text-sm">{beforeScore}%</span>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400" />
            <div className="text-right">
              <span className="text-slate-400 block">Post-Clean (After)</span>
              <span className="font-bold text-emerald-400 text-sm">{afterScore}%</span>
            </div>
          </div>
        </div>

        {/* 5 Core Quality Dimensions Progress Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-7 rounded-3xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
              5-Dimensional Quality Assessment
            </h3>
            <span className="text-xs text-slate-400">Dynamic Real-time Evaluation</span>
          </div>

          <div className="space-y-4">
            {/* Completeness */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Completeness
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                  {afterMetrics.dimensions?.completeness ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0a1e45] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-700" 
                  style={{ width: `${afterMetrics.dimensions?.completeness ?? 0}%` }}
                />
              </div>
            </div>

            {/* Uniqueness */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Uniqueness
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                  {afterMetrics.dimensions?.uniqueness ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0a1e45] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-700" 
                  style={{ width: `${afterMetrics.dimensions?.uniqueness ?? 0}%` }}
                />
              </div>
            </div>

            {/* Validity */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Validity (Rules & Constraints)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {afterMetrics.dimensions?.validity ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0a1e45] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                  style={{ width: `${afterMetrics.dimensions?.validity ?? 0}%` }}
                />
              </div>
            </div>

            {/* Consistency */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Consistency (Categories & Cross-Columns)
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">
                  {afterMetrics.dimensions?.consistency ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0a1e45] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-700" 
                  style={{ width: `${afterMetrics.dimensions?.consistency ?? 0}%` }}
                />
              </div>
            </div>

            {/* Anomaly Health */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Anomaly Health (Statistical & ML)
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                  {afterMetrics.dimensions?.anomalyHealth ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0a1e45] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full transition-all duration-700" 
                  style={{ width: `${afterMetrics.dimensions?.anomalyHealth ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
            {recommendations.length}
          </h4>
          <span className="text-[11px] text-slate-400 mt-1 block">Detected across entire dataset</span>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Approved Actions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {approvedRecommendations.length}
          </h4>
          <span className="text-[11px] text-emerald-500 mt-1 block font-medium">Ready for cleaning</span>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">High Confidence</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <h4 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {highCount}
          </h4>
          <span className="text-[11px] text-slate-400 mt-1 block">≥90% confidence level</span>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 dark:border-[#1a325a] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Clean Records</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {qualityComparison?.after?.counts?.totalRows ?? originalDataset.rows.length}
          </h4>
          <span className="text-[11px] text-slate-400 mt-1 block">Final valid row count</span>
        </div>
      </div>

      {/* Visualizations Grid (Radar + Category Bars + Confidence Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart: Before vs After Quality Polygon */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 self-start flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Quality Profile Radar (Before vs After)
          </h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" opacity={0.2} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar name="Before" dataKey="Before" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} />
                <Radar name="After" dataKey="After" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Breakdown Bar Chart */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Detected Issue Categories
          </h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-25} textAnchor="end" height={40} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {issueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Tier Donut Chart */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 dark:border-[#1a325a] shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 self-start flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Recommendation Confidence Tiers
          </h3>
          <div className="w-full h-72 flex items-center justify-center">
            {confidencePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={confidencePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {confidencePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                No recommendations active.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
