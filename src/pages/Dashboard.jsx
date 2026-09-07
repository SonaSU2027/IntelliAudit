import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataset } from '../contexts/DatasetContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { isMissingValue } from '../utils/dataProfiler';
import { Activity, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, Layers, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const { originalDataset, workingDataset, datasetProfile, metadata, missingRecommendations, imputationResults } = useDataset();

  const dataset = workingDataset || originalDataset;

  const stats = useMemo(() => {
    if (!dataset || !dataset.rows || dataset.rows.length === 0) return null;

    let totalMissing = 0;
    const missingColCounts = {};
    dataset.headers.forEach(h => missingColCounts[h] = 0);

    const rowHashes = new Set();
    let totalDuplicates = 0;

    dataset.rows.forEach(row => {
      // Calculate missing
      dataset.headers.forEach(h => {
        const val = row[h];
        if (isMissingValue(val)) {
          totalMissing++;
          missingColCounts[h]++;
        }
      });

      // Calculate duplicates
      const hash = JSON.stringify(row);
      if (rowHashes.has(hash)) {
        totalDuplicates++;
      } else {
        rowHashes.add(hash);
      }
    });

    // Prepare chart data
    let missingChartData = dataset.headers.map(h => ({
      name: h,
      missing: missingColCounts[h]
    }));
    
    // Sort so highest missing are first
    missingChartData.sort((a, b) => b.missing - a.missing);
    missingChartData = missingChartData.slice(0, 10);

    const duplicateChartData = [
      { name: 'Unique', value: dataset.rows.length - totalDuplicates },
      { name: 'Duplicate', value: totalDuplicates }
    ];

    const totalCells = dataset.rows.length * dataset.headers.length;
    const missingRate = Number(((totalMissing / totalCells) * 100).toFixed(2));

    return {
      totalRows: dataset.rows.length,
      totalMissing,
      missingRate,
      totalDuplicates,
      missingChartData,
      duplicateChartData
    };
  }, [dataset]);

  if (!dataset || !dataset.rows) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-slate-800 dark:text-white transition-colors duration-500">
        <h2 className="text-3xl font-bold tracking-wide text-slate-900 dark:text-white mb-4">Audit Dashboard</h2>
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-12 rounded-2xl shadow-md border border-slate-200 dark:border-[#1a325a] flex flex-col items-center text-slate-400 dark:text-[#4a6b9c]">
          <p className="mb-6 text-lg">No dataset loaded. Please upload a dataset first to view statistics.</p>
          <Link to="/upload" className="px-8 py-3 bg-blue-600 dark:bg-[#113677] text-white font-medium rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-[#1a4080] transition-colors">
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  const datasetLevel = datasetProfile?.datasetLevel || {};

  return (
    <div className="animate-fade-in text-slate-800 dark:text-white transition-colors duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 rounded-full text-xs font-semibold tracking-wider uppercase">
              Data Health
            </span>
            <span className="text-xs text-slate-400 dark:text-[#8ba3c9]">Step 3 of 8</span>
          </div>
          <h2 className="text-3xl font-bold tracking-wide text-slate-900 dark:text-white transition-colors">Audit Dashboard</h2>
          <p className="text-slate-500 dark:text-[#8ba3c9] mt-2 font-light transition-colors">
            Live profile analysis for <span className="font-semibold text-slate-800 dark:text-white">{metadata?.filename}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/missing-values"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg shadow-md hover:from-blue-500 hover:to-indigo-500 flex items-center gap-2 transition-all"
          >
            Clean Missing Values
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#1a325a] flex flex-col relative overflow-hidden group transition-colors duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-2">Total Rows</h3>
          <p className="text-3xl font-bold mt-2 pl-2 text-slate-900 dark:text-white">
            {stats.totalRows.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 pl-2">{dataset.headers.length} attributes</span>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#1a325a] flex flex-col relative overflow-hidden group transition-colors duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-2">Missing Cells</h3>
          <p className="text-3xl font-bold mt-2 pl-2 text-amber-500">
            {stats.totalMissing.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 pl-2">{stats.missingRate}% missingness rate</span>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#1a325a] flex flex-col relative overflow-hidden group transition-colors duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-2">Duplicate Rows</h3>
          <p className="text-3xl font-bold mt-2 pl-2 text-indigo-500">
            {stats.totalDuplicates.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 pl-2">Exact row duplicates</span>
        </div>

        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#1a325a] flex flex-col relative overflow-hidden group transition-colors duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-2">Imputation Actions</h3>
          <p className="text-3xl font-bold mt-2 pl-2 text-emerald-500">
            {imputationResults.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 pl-2">Applied to working copy</span>
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Values Chart */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#1a325a] transition-colors duration-500">
          <h3 className="text-base font-bold mb-4 text-slate-800 dark:text-white">Missing Values by Column (Top 10)</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.missingChartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  angle={-35} 
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                  cursor={{ fill: '#334155', opacity: 0.1 }}
                />
                <Bar dataKey="missing" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Duplicates Chart */}
        <div className="bg-white dark:bg-[#05142e]/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#1a325a] transition-colors duration-500">
          <h3 className="text-base font-bold mb-4 text-slate-800 dark:text-white">Row Duplication Distribution</h3>
          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.duplicateChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Proceed to Next Phase CTA */}
      <div className="mt-6 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#0f2d6e] dark:to-[#1a1e5e] rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-white font-bold text-base">Data Quality Scan Complete</h4>
          <p className="text-blue-100 dark:text-blue-200 text-sm mt-0.5">Your dataset has been profiled. Proceed to detect duplicates, outliers, and rule violations next.</p>
        </div>
        <Link
          to="/missing-values"
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-sm font-bold rounded-xl shadow-md transition-all flex-shrink-0"
        >
          <ArrowRight className="w-4 h-4" /> Proceed to Next Phase
        </Link>
      </div>
    </div>
  );
}

