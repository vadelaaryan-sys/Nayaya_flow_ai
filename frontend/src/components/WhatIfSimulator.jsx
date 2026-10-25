import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Play, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Info,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { runWhatIfSimulation } from '../services/api';

const PRESETS = [
  {
    name: 'Default Baseline',
    desc: 'Balanced operational configuration',
    weights: { age: 30, stage: 35, deadline: 20, quality: 15 },
  },
  {
    name: 'Stage Bottleneck Focus',
    desc: 'Heavily penalizes cases stalled at current stage',
    weights: { age: 10, stage: 60, deadline: 20, quality: 10 },
  },
  {
    name: 'Statutory Deadline Urgency',
    desc: 'Prioritizes cases with documented target dates',
    weights: { age: 15, stage: 20, deadline: 55, quality: 10 },
  },
  {
    name: 'Data Integrity Audit',
    desc: 'Elevates cases with missing procedural filings',
    weights: { age: 15, stage: 20, deadline: 15, quality: 50 },
  },
  {
    name: 'Legacy Pendency Focus',
    desc: 'Maximizes total elapsed calendar age',
    weights: { age: 60, stage: 20, deadline: 10, quality: 10 },
  },
];

export default function WhatIfSimulator({ onSelectCase }) {
  const [ageWeight, setAgeWeight] = useState(30);
  const [stageWeight, setStageWeight] = useState(35);
  const [deadlineWeight, setDeadlineWeight] = useState(20);
  const [qualityWeight, setQualityWeight] = useState(15);
  const [limit, setLimit] = useState(20);

  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalWeight = ageWeight + stageWeight + deadlineWeight + qualityWeight;

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runWhatIfSimulation({
        age_weight: Number(ageWeight),
        stage_weight: Number(stageWeight),
        deadline_weight: Number(deadlineWeight),
        data_quality_weight: Number(qualityWeight),
        limit: Number(limit),
      });
      setSimulationResult(res);
    } catch (err) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, []);

  const applyPreset = (p) => {
    setAgeWeight(p.weights.age);
    setStageWeight(p.weights.stage);
    setDeadlineWeight(p.weights.deadline);
    setQualityWeight(p.weights.quality);
  };

  const resetToDefault = () => {
    applyPreset(PRESETS[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header and Explanation */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Procedural Policy What-If Simulator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Test administrative prioritization models by modifying rule weights in memory. Stored database records remain unaltered.
            </p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg self-start">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Non-Destructive In-Memory</span>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-600 flex items-start space-x-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <span>
            {simulationResult?.disclaimer ||
              'WHAT-IF SIMULATION: Recalculates review priority scores in memory to explore queue sensitivity. Stored baseline database scores are NOT modified.'}
          </span>
        </div>
      </div>

      {/* Interactive Controls & Sliders */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Configure Illustrative Scoring Weights
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Total Sum:</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              totalWeight === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {totalWeight}%
            </span>
          </div>
        </div>

        {/* Presets Row */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Quick Policy Presets:
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition"
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={resetToDefault}
              className="flex items-center space-x-1 text-xs border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>

        {/* 4 Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {/* Age Weight Slider */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-800">1. Case Age Weight</span>
              <span className="font-mono font-bold text-teal-700">{ageWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={ageWeight}
              onChange={(e) => setAgeWeight(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Days since filing date</p>
          </div>

          {/* Stage Delay Weight Slider */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-800">2. Stage Delay Weight</span>
              <span className="font-mono font-bold text-teal-700">{stageWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={stageWeight}
              onChange={(e) => setStageWeight(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Exceeding stage benchmarks</p>
          </div>

          {/* Deadline Weight Slider */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-800">3. Deadline Weight</span>
              <span className="font-mono font-bold text-teal-700">{deadlineWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={deadlineWeight}
              onChange={(e) => setDeadlineWeight(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Proximity to target compliance</p>
          </div>

          {/* Quality Weight Slider */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-800">4. Data Quality Weight</span>
              <span className="font-mono font-bold text-teal-700">{qualityWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={qualityWeight}
              onChange={(e) => setQualityWeight(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Missing documents / records</p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={runSimulation}
            disabled={loading}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Simulated Review Queue &amp; Rank Delta
            </h2>
            <p className="text-xs text-slate-500">
              Comparing simulated queue against saved baseline priority ranking.
            </p>
          </div>
          {simulationResult?.summary_notes && (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Top {simulationResult.cases?.length || 0} simulated items
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Running in-memory queue recalculation...
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Sim Rank</th>
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Baseline Rank</th>
                  <th className="py-3 px-4">Rank Shift</th>
                  <th className="py-3 px-4">Baseline Score</th>
                  <th className="py-3 px-4">Simulated Score</th>
                  <th className="py-3 px-4">Score Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(simulationResult?.cases || []).map((item) => {
                  const rankShift = item.rank_delta;
                  const isUp = rankShift > 0;
                  const isDown = rankShift < 0;

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectCase(item.id)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{item.simulated_rank}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                        {item.case_number}
                        <span className="block font-sans font-normal text-[11px] text-slate-500">{item.category}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div>{item.current_stage}</div>
                        <span className="text-[11px] text-slate-400">{item.days_at_stage} days</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        #{item.baseline_rank}
                      </td>

                      {/* Rank Shift Indicator */}
                      <td className="py-3.5 px-4">
                        {isUp ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+{rankShift} positions</span>
                          </span>
                        ) : isDown ? (
                          <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs font-bold">
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                            <span>{rankShift} positions</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            <Minus className="w-3 h-3 text-slate-400" />
                            <span>No change</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.baseline_score.toFixed(1)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                        {item.simulated_score.toFixed(1)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={item.score_delta > 0 ? 'text-emerald-600' : item.score_delta < 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {item.score_delta > 0 ? `+${item.score_delta.toFixed(1)}` : item.score_delta.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
