import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DisclaimerBanner from './components/DisclaimerBanner';
import Dashboard from './components/Dashboard';
import CaseExplorer from './components/CaseExplorer';
import BottleneckAnalytics from './components/BottleneckAnalytics';
import ActionQueue from './components/ActionQueue';
import WhatIfSimulator from './components/WhatIfSimulator';
import AICopilotView from './components/AICopilotView';
import CaseDetailModal from './components/CaseDetailModal';
import ExportResetModal from './components/ExportResetModal';
import { fetchDashboardMetrics, API_BASE } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Backend connection check failed:', err);
      setBackendConnected(false);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // Poll status periodically
    const timer = setInterval(() => {
      fetch(`${API_BASE}/analytics/dashboard`)
        .then((r) => {
          if (r.ok) setBackendConnected(true);
          else setBackendConnected(false);
        })
        .catch(() => setBackendConnected(false));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleCaseSelect = (caseId) => {
    setSelectedCaseId(caseId);
  };

  const handleDatabaseReset = () => {
    loadMetrics();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        backendConnected={backendConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            metrics={metrics}
            loading={loadingMetrics}
            onSelectCase={handleCaseSelect}
            onNavigateToExplorer={() => setActiveTab('explorer')}
            onNavigateToBottlenecks={() => setActiveTab('bottlenecks')}
          />
        )}

        {activeTab === 'explorer' && (
          <CaseExplorer onSelectCase={handleCaseSelect} />
        )}

        {activeTab === 'bottlenecks' && (
          <BottleneckAnalytics onSelectStageFilter={() => setActiveTab('explorer')} />
        )}

        {activeTab === 'actions' && (
          <ActionQueue onSelectCase={handleCaseSelect} />
        )}

        {activeTab === 'simulator' && (
          <WhatIfSimulator onSelectCase={handleCaseSelect} />
        )}

        {activeTab === 'ai-copilot' && (
          <AICopilotView
            selectedCaseId={selectedCaseId}
            onSelectCase={handleCaseSelect}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            NyayaFlow AI &bull; Explainable Court Backlog and Procedural Bottleneck Assistant &bull; Local SQLite Architecture
          </span>
          <span className="text-slate-400">
            Fictional Prototype &bull; Not for Official Legal Decisions
          </span>
        </div>
      </footer>

      {/* Case Details Drawer / Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionUpdated={loadMetrics}
          onConsultAI={(cId) => {
            setSelectedCaseId(cId);
            setActiveTab('ai-copilot');
          }}
        />
      )}

      {/* Data Management & Reset Modal */}
      <ExportResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onDatabaseReset={handleDatabaseReset}
      />
    </div>
  );
}
