import React from 'react';
import { 
  Briefcase, 
  Clock, 
  AlertOctagon, 
  FileWarning, 
  CalendarX2, 
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const AGE_COLORS = ['#14b8a6', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444'];
const STAGE_BAR_COLOR = '#0f766e';

export default function Dashboard({ metrics, loading, onSelectCase, onNavigateToExplorer, onNavigateToBottlenecks }) {
  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm">Aggregating procedural backlog indicators from local SQLite...</p>
      </div>
    );
  }

  // Format age bands for PieChart
  const ageBandData = Object.entries(metrics.age_bands || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Format stage distribution for BarChart
  const stageData = Object.entries(metrics.stage_distribution || {}).map(([stage, count]) => ({
    stage: stage.length > 18 ? stage.substring(0, 16) + '...' : stage,
    fullName: stage,
    count,
  }));

  // Top bottlenecks comparison
  const bottleneckData = (metrics.top_bottlenecks || []).map((b) => ({
    stage: b.stage.length > 18 ? b.stage.substring(0, 16) + '...' : b.stage,
    fullName: b.stage,
    avgDays: b.avg_days,
    benchmark: b.benchmark,
    delayRatio: b.delay_ratio,
  }));

  return (
    <div className="space-y-6">
      {/* Top Welcome & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Court Backlog &amp; Procedural Flow Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tracking {metrics.total_cases} synthetic case records across procedural lifecycles. All metrics calculated from local SQLite database.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateToBottlenecks}
            className="flex items-center space-x-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
          >
            <Activity className="w-4 h-4 text-teal-600" />
            <span>Bottleneck View</span>
          </button>
          <button
            onClick={onNavigateToExplorer}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <span>Explore All Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Cases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Records</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.total_cases}</div>
          <p className="text-[11px] text-slate-500 mt-1">Synthetic repository</p>
        </div>

        {/* Pending Cases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{metrics.pending_cases}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.disposed_cases} disposed ({Math.round((metrics.disposed_cases / metrics.total_cases) * 100)}%)
          </p>
        </div>

        {/* High Priority Review */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-700">High Review Priority</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{metrics.high_priority_review_cases}</div>
          <p className="text-[11px] text-rose-700 mt-1">Score &ge; 75 delay threshold</p>
        </div>

        {/* Data Quality Flags */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-800">Missing Registry Info</span>
            <FileWarning className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{metrics.data_quality_flagged_cases}</div>
          <p className="text-[11px] text-amber-700 mt-1">Missing proof / fee receipts</p>
        </div>

        {/* Overdue Deadlines */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-purple-700">Overdue Deadlines</span>
            <CalendarX2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{metrics.overdue_deadline_cases}</div>
          <p className="text-[11px] text-purple-700 mt-1">Documented target dates</p>
        </div>

        {/* Average Days at Stage */}
        <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/20 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-teal-800">Avg Stage Stay</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700">{metrics.average_days_at_stage}d</div>
          <p className="text-[11px] text-teal-700 mt-1">Across all stages</p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Distribution Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900">Cases by Procedural Stage</h2>
              <span className="text-xs text-slate-500">Active distribution</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Number of pending cases accumulated in each procedural step.
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="stage" 
                  angle={-25} 
                  textAnchor="end" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg">
                          <p className="font-semibold text-teal-300">{data.fullName}</p>
                          <p className="text-slate-200 mt-1">Cases: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill={STAGE_BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Band Donut Chart (1 col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900">Pendency Age Distribution</h2>
              <span className="text-xs text-slate-500">Since filing</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Proportion of active cases grouped by age bands.
            </p>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageBandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {ageBandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2 rounded text-xs shadow-md">
                          <span className="font-semibold">{data.name}:</span> {data.value} cases
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Procedural Bottlenecks vs Benchmark */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Top Procedural Bottlenecks (Actual vs Benchmark)</h2>
            <p className="text-xs text-slate-500">
              Stages where the average duration most severely exceeds illustrative court benchmarks.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full self-start">
            Illustrative Administrative Standards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(metrics.top_bottlenecks || []).map((item, idx) => {
            const isSevere = item.delay_ratio >= 2.0;
            return (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border ${
                  isSevere ? 'border-rose-200 bg-rose-50/30' : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-slate-800 truncate" title={item.stage}>
                    {item.stage}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSevere ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.delay_ratio}x delay
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Average Duration:</span>
                    <strong className="text-slate-900">{item.avg_days} days</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Benchmark Standard:</span>
                    <span>{item.benchmark} days</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Cases Lingering:</span>
                    <span>{item.case_count} cases</span>
                  </div>
                </div>
                {/* Progress ratio indicator */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isSevere ? 'bg-rose-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((item.delay_ratio / 3) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
