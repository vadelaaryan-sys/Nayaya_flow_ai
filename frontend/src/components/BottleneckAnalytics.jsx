import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Layers,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchBottleneckAnalytics } from '../services/api';

export default function BottleneckAnalytics({ onSelectStageFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetchBottleneckAnalytics();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load bottleneck analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm">Evaluating procedural bottlenecks and accumulation ratios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        {error}
      </div>
    );
  }

  const chartData = (data?.stages || []).map((s) => ({
    stage: s.stage_name.length > 18 ? s.stage_name.substring(0, 16) + '...' : s.stage_name,
    fullName: s.stage_name,
    actualDays: s.avg_days_at_stage,
    benchmarkDays: s.benchmark_days,
    caseCount: s.case_count,
    delayRatio: s.delay_ratio,
  }));

  return (
    <div className="space-y-6">
      {/* Header and Disclaimer */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Procedural Bottleneck &amp; Stage Flow Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Evaluating where cases linger beyond standard procedural benchmarks across {data.total_analyzed} active cases.
            </p>
          </div>
          <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold px-3 py-1.5 rounded-lg self-start">
            Synthetic Flow Analysis
          </span>
        </div>

        {/* Analytic Disclaimer Note */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-600 flex items-start space-x-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <span>{data.disclaimer}</span>
        </div>
      </div>

      {/* Comparison Chart: Actual Avg Days vs Benchmark Days */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Average Stage Duration vs Procedural Benchmark (Days)
            </h2>
            <p className="text-xs text-slate-500">
              Stages where the teal bar towers over the slate bar indicate substantial procedural queuing friction.
            </p>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="stage" 
                angle={-25} 
                textAnchor="end" 
                tick={{ fontSize: 11, fill: '#475569' }} 
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-lg space-y-1">
                        <p className="font-bold text-teal-300">{d.fullName}</p>
                        <p className="text-slate-200">Actual Average: <strong className="text-white">{d.actualDays} days</strong></p>
                        <p className="text-slate-300">Standard Benchmark: <strong>{d.benchmarkDays} days</strong></p>
                        <p className="text-slate-300">Delay Multiplier: <strong className="text-amber-400">{d.delayRatio}x</strong></p>
                        <p className="text-slate-400">Active Cases: {d.caseCount}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconSize={10} 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar name="Actual Avg Days" dataKey="actualDays" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar name="Benchmark Standard (Days)" dataKey="benchmarkDays" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Procedural Stage Pipeline Visual */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Procedural Pipeline Flow &amp; Delay Heatmap
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {(data?.stages || []).map((s, idx) => {
            const isCritical = s.bottleneck_severity === 'Critical Delay';
            const isElevated = s.bottleneck_severity === 'Elevated Delay';
            return (
              <div 
                key={idx}
                className={`p-3 rounded-xl border flex flex-col justify-between transition hover:shadow-md ${
                  isCritical 
                    ? 'border-rose-300 bg-rose-50/50' 
                    : isElevated 
                    ? 'border-amber-300 bg-amber-50/40' 
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">Step {idx + 1}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      isCritical ? 'bg-rose-500 animate-pulse' : isElevated ? 'bg-amber-500' : 'bg-teal-500'
                    }`} />
                  </div>
                  <h3 className="font-semibold text-xs text-slate-800 leading-tight mb-2 h-9 line-clamp-2" title={s.stage_name}>
                    {s.stage_name}
                  </h3>
                </div>
                
                <div className="text-[11px] space-y-1 pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between text-slate-500">
                    <span>Cases:</span>
                    <strong className="text-slate-800">{s.case_count}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Avg Stay:</span>
                    <strong className={isCritical ? 'text-rose-700' : 'text-slate-700'}>{s.avg_days_at_stage}d</strong>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Bench:</span>
                    <span>{s.benchmark_days}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Bottleneck Metrics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">
            Stage-by-Stage Friction Metrics
          </h2>
          <span className="text-xs text-slate-500">
            {data?.stages?.length || 0} stages evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Procedural Stage</th>
                <th className="py-3 px-4">Active Cases</th>
                <th className="py-3 px-4">Standard Benchmark</th>
                <th className="py-3 px-4">Average Stay</th>
                <th className="py-3 px-4">Median Stay</th>
                <th className="py-3 px-4">Delay Multiplier</th>
                <th className="py-3 px-4">Severity Indicator</th>
                <th className="py-3 px-4">Open Action Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(data?.stages || []).map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {s.stage_name}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {s.case_count} cases
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {s.benchmark_days} days
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {s.avg_days_at_stage} days
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {s.median_days_at_stage} days
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={s.delay_ratio >= 2.0 ? 'text-rose-600' : s.delay_ratio >= 1.3 ? 'text-amber-600' : 'text-teal-700'}>
                      {s.delay_ratio}x
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      s.bottleneck_severity === 'Critical Delay'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : s.bottleneck_severity === 'Elevated Delay'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : s.bottleneck_severity === 'Moderate Attention'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {s.bottleneck_severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      {s.flagged_actions_count} follow-ups
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
