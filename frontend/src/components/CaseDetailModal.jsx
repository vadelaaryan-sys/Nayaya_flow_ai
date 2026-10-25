import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  History,
  CheckSquare,
  Plus,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { fetchCaseDetail, fetchCaseExplanation, createAction, updateActionStatus } from '../services/api';

export default function CaseDetailModal({ caseId, onClose, onActionUpdated, onConsultAI }) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Explanation state
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // New action form state
  const [newActionText, setNewActionText] = useState('');
  const [creatingAction, setCreatingAction] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await fetchCaseDetail(caseId);
      setCaseData(data);
    } catch (err) {
      setError(err.message || 'Failed to load case detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      loadDetail();
      loadExplanation();
    }
  }, [caseId]);

  const loadExplanation = async () => {
    setLoadingExplanation(true);
    try {
      const exp = await fetchCaseExplanation(caseId);
      setExplanation(exp);
    } catch (err) {
      console.error('Explanation fetch failed', err);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleStatusChange = async (actionId, newStatus) => {
    try {
      await updateActionStatus(actionId, newStatus);
      await loadDetail();
      if (onActionUpdated) onActionUpdated();
    } catch (err) {
      alert(`Failed to update action status: ${err.message}`);
    }
  };

  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    setCreatingAction(true);
    try {
      await createAction({
        case_id: caseId,
        action_description: newActionText.trim(),
        status: 'Open',
      });
      setNewActionText('');
      await loadDetail();
      if (onActionUpdated) onActionUpdated();
    } catch (err) {
      alert(`Failed to create action: ${err.message}`);
    } finally {
      setCreatingAction(false);
    }
  };

  if (!caseId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-bold text-lg text-teal-400">
              {caseData ? caseData.case_number : 'Case Details'}
            </span>
            {caseData && (
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full border border-slate-700">
                {caseData.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading case metadata and procedural history...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
              {error}
            </div>
          ) : caseData ? (
            <>
              {/* Mandatory Legal & Prototype Disclaimer Callout */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Administrative Review Disclaimer:</strong>{' '}
                  {caseData.disclaimer}
                </div>
              </div>

              {/* Case Metadata Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Filing Date</span>
                  <div className="font-semibold text-slate-900 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{caseData.filing_date}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Current Procedural Stage</span>
                  <div className="font-semibold text-slate-900 truncate" title={caseData.current_stage}>
                    {caseData.current_stage}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Duration at Stage</span>
                  <div className="font-semibold text-slate-900 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{caseData.days_at_stage} days</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Documented Deadline</span>
                  <div className="font-semibold text-slate-900">
                    {caseData.documented_deadline_date ? (
                      <span className="text-purple-700 font-bold">{caseData.documented_deadline_date}</span>
                    ) : (
                      <span className="text-slate-400">None Documented</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Quality Flag Alert */}
              {caseData.missing_information && caseData.missing_information !== 'None' && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs flex items-center justify-between text-rose-900">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong className="font-semibold">Data Quality Warning:</strong> Registry flagged record{' '}
                      <span className="underline font-bold">"{caseData.missing_information}"</span>. Verification required by registry staff.
                    </span>
                  </div>
                  <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    Flagged Anomaly
                  </span>
                </div>
              )}

              {/* Score & Factor Breakdown Grid */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Administrative Review Priority Score
                    </h2>
                    <p className="text-xs text-slate-500">
                      Rule Version: <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">{caseData.priority_score?.rule_version || 'v1.2'}</code>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl font-extrabold text-teal-700">
                      {caseData.priority_score ? caseData.priority_score.score.toFixed(1) : '0.0'}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">/ 100</span>
                  </div>
                </div>

                {/* 4 Factor Breakdown Cards */}
                {caseData.factor_breakdown && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Age Factor */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-800">1. Case Age Metric</span>
                        <span className="font-bold text-teal-700">
                          {caseData.factor_breakdown.age_factor.points} / {caseData.factor_breakdown.age_factor.weight} pts
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{caseData.factor_breakdown.age_factor.detail}</p>
                    </div>

                    {/* Stage Delay Factor */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-800">2. Stage Delay vs Benchmark</span>
                        <span className="font-bold text-teal-700">
                          {caseData.factor_breakdown.stage_delay_factor.points} / {caseData.factor_breakdown.stage_delay_factor.weight} pts
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{caseData.factor_breakdown.stage_delay_factor.detail}</p>
                    </div>

                    {/* Deadline Factor */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-800">3. Documented Deadline</span>
                        <span className="font-bold text-teal-700">
                          {caseData.factor_breakdown.deadline_factor.points} / {caseData.factor_breakdown.deadline_factor.weight} pts
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{caseData.factor_breakdown.deadline_factor.detail}</p>
                    </div>

                    {/* Data Quality Factor */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-800">4. Registry Completeness</span>
                        <span className="font-bold text-teal-700">
                          {caseData.factor_breakdown.data_quality_factor.points} / {caseData.factor_breakdown.data_quality_factor.weight} pts
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{caseData.factor_breakdown.data_quality_factor.detail}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Explainability Section: AI or Deterministic Template */}
              <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <h3 className="font-bold text-sm text-white">Procedural Score Explanation</h3>
                  </div>
                  {explanation && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      explanation.is_ai_generated 
                        ? 'bg-purple-900/60 text-purple-300 border-purple-500/40' 
                        : 'bg-teal-900/60 text-teal-300 border-teal-500/40'
                    }`}>
                      {explanation.explanation_source}
                    </span>
                  )}
                </div>

                {loadingExplanation ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Generating plain-language procedural breakdown...
                  </div>
                ) : explanation ? (
                  <div className="space-y-3 text-xs text-slate-300">
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {explanation.summary}
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      {explanation.procedural_context}
                    </p>

                    {/* Delay factors list */}
                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                        Factor Explanations:
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {explanation.delay_factors_explanation.map((factor, idx) => (
                          <li key={idx} className="leading-relaxed">{factor}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Suggested administrative checklist */}
                    {explanation.suggested_administrative_checklist?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                          Recommended Administrative Follow-ups:
                        </h4>
                        <div className="space-y-1">
                          {explanation.suggested_administrative_checklist.map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-slate-200 bg-slate-800/60 p-2 rounded border border-slate-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {onConsultAI && (
                      <div className="pt-3 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => {
                            onClose();
                            onConsultAI(caseData.id);
                          }}
                          className="flex items-center space-x-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ask AI Copilot to Diagnose Case &amp; Draft Notice</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Procedural Events Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <History className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-sm text-slate-900">Procedural History Timeline</h3>
                </div>

                {caseData.events && caseData.events.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {caseData.events.map((ev, idx) => (
                      <div key={ev.id || idx} className="relative">
                        <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                          <span className="font-bold text-slate-800">{ev.new_stage}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{ev.event_date}</span>
                        </div>
                        {ev.previous_stage && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Transitioned from: {ev.previous_stage}
                          </span>
                        )}
                        <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                          {ev.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No previous procedural events recorded.</p>
                )}
              </div>

              {/* Administrative Actions Queue for this case */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-sm text-slate-900">Administrative Follow-Up Actions</h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {caseData.administrative_actions?.length || 0} tasks
                  </span>
                </div>

                {/* Existing Actions List */}
                <div className="space-y-2 text-xs">
                  {caseData.administrative_actions && caseData.administrative_actions.length > 0 ? (
                    caseData.administrative_actions.map((act) => (
                      <div 
                        key={act.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 gap-2"
                      >
                        <div className="flex items-start space-x-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            act.status === 'Completed' ? 'bg-emerald-500' : act.status === 'In Progress' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <span className={`text-slate-800 ${act.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                            {act.action_description}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                          <select
                            value={act.status}
                            onChange={(e) => handleStatusChange(act.id, e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs italic">No administrative tasks pending for this case.</p>
                  )}
                </div>

                {/* Add new action form */}
                <form onSubmit={handleAddAction} className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="Add an administrative follow-up (e.g., 'Verify summons acknowledgment receipt')..."
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={creatingAction || !newActionText.trim()}
                    className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
