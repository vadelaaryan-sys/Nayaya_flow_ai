import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { fetchActions, updateActionStatus, createAction } from '../services/api';

export default function ActionQueue({ onSelectCase }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // New action modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActions({
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });
      setActions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrative actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [statusFilter]);

  const handleStatusUpdate = async (actionId, newStatus) => {
    try {
      await updateActionStatus(actionId, newStatus);
      await loadActions();
    } catch (err) {
      alert(`Error updating action: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newCaseId || !newDescription.trim()) {
      alert('Please provide a Case ID and action description.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createAction({
        case_id: parseInt(newCaseId, 10),
        action_description: newDescription.trim(),
        status: 'Open',
      });
      setIsAddModalOpen(false);
      setNewCaseId('');
      setNewDescription('');
      await loadActions();
    } catch (err) {
      alert(`Failed to create action: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter by local search
  const filteredActions = actions.filter((act) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const caseNum = (act.case_number || '').toLowerCase();
    const desc = (act.action_description || '').toLowerCase();
    return caseNum.includes(term) || desc.includes(term);
  });

  const openCount = actions.filter((a) => a.status === 'Open').length;
  const inProgressCount = actions.filter((a) => a.status === 'In Progress').length;
  const completedCount = actions.filter((a) => a.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Administrative Follow-Up Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Registry checklist of procedural verification items, missing document follow-ups, and delayed summons queries.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition self-start"
          >
            <Plus className="w-4 h-4" />
            <span>New Administrative Task</span>
          </button>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'All', label: 'All Tasks', count: actions.length },
              { id: 'Open', label: 'Open', count: openCount },
              { id: 'In Progress', label: 'In Progress', count: inProgressCount },
              { id: 'Completed', label: 'Completed', count: completedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-slate-800 text-teal-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter actions by keyword or case #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Action Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading administrative action queue...
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
            {error}
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
            No administrative follow-up items match your current filter.
          </div>
        ) : (
          filteredActions.map((act) => {
            const isCompleted = act.status === 'Completed';
            return (
              <div
                key={act.id}
                className={`bg-white p-4 rounded-xl border transition-all ${
                  isCompleted ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-200 hover:border-teal-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onSelectCase(act.case_id)}
                        className="font-mono font-bold text-xs text-teal-700 hover:underline flex items-center space-x-1"
                      >
                        <span>{act.case_number || `Case #${act.case_id}`}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-xs text-slate-500">{act.category}</span>
                    </div>

                    <p className={`text-xs md:text-sm text-slate-800 font-medium ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                      {act.action_description}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                      <span>Created: {new Date(act.created_at).toLocaleDateString()}</span>
                      {act.completed_at && (
                        <span className="text-emerald-600 font-medium">
                          &bull; Completed: {new Date(act.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                    <label className="text-xs text-slate-400 hidden sm:inline">Status:</label>
                    <select
                      value={act.status}
                      onChange={(e) => handleStatusUpdate(act.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                        act.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : act.status === 'In Progress'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Action Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Create Administrative Action</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a procedural verification or document follow-up for court registry staff.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Target Case Database ID (1 to 125)</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Action Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Issue administrative notice to filing counsel regarding missing address verification..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
