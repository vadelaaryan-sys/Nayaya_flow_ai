import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  AlertTriangle, 
  Database, 
  FileSpreadsheet, 
  History,
  CheckCircle2
} from 'lucide-react';
import { resetDatabaseToSeed, fetchAuditLogs, getExportCsvUrl } from '../services/api';

export default function ExportResetModal({ isOpen, onClose, onDatabaseReset }) {
  const [activeSubTab, setActiveSubTab] = useState('reset'); // 'reset' or 'audit'
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null);

  useEffect(() => {
    if (isOpen && activeSubTab === 'audit') {
      loadLogs();
    }
  }, [isOpen, activeSubTab]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleReset = async () => {
    if (confirmText.trim().toUpperCase() !== 'RESET') {
      alert('Please type "RESET" in capital letters to confirm.');
      return;
    }

    setResetting(true);
    try {
      const res = await resetDatabaseToSeed();
      setResetSuccessMessage(res.message || 'Database successfully re-seeded.');
      setConfirmText('');
      if (onDatabaseReset) onDatabaseReset();
    } catch (err) {
      alert(`Database reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-base text-white">Database Administration &amp; Audit Logs</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('reset')}
            className={`pb-2.5 border-b-2 transition ${
              activeSubTab === 'reset'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Reset Database
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`pb-2.5 border-b-2 transition ${
              activeSubTab === 'audit'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            System Audit Log
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeSubTab === 'reset' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Restore Synthetic Seed Data</span>
                </div>
                <p>
                  This action clears custom changes and restores the local SQLite database to exactly 
                  <strong> 125 internally consistent synthetic case records</strong> with full procedural event histories,
                  deterministic priority scores, and initial administrative actions.
                </p>
              </div>

              {resetSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMessage}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-slate-700">
                  Type <span className="font-mono font-bold text-rose-600">RESET</span> to confirm:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="RESET"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="flex-1 text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleReset}
                    disabled={resetting || confirmText.trim().toUpperCase() !== 'RESET'}
                    className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{resetting ? 'Resetting...' : 'Confirm Reset'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Want a local backup copy first?</span>
                <a
                  href={getExportCsvUrl()}
                  download="nyayaflow_cases_all.csv"
                  className="flex items-center space-x-1 text-teal-700 hover:underline font-semibold"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export All Cases CSV</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Recent system administrative operations &amp; audit records</span>
                <button
                  onClick={loadLogs}
                  className="text-teal-700 hover:underline font-semibold"
                >
                  Refresh
                </button>
              </div>

              {loadingLogs ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading audit logs...</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-slate-50 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span className="font-semibold text-slate-700">{log.action_type}</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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
