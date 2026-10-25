/**
 * API service layer for NyayaFlow AI frontend.
 * Communicates with local FastAPI backend at /api or deployed backend via VITE_API_URL.
 */

const RAW_URL = import.meta.env.VITE_API_URL || '';
export const API_BASE = RAW_URL ? `${RAW_URL.replace(/\/$/, '')}/api` : '/api';

export const fetchDashboardMetrics = async () => {
  const res = await fetch(`${API_BASE}/analytics/dashboard`);
  if (!res.ok) throw new Error(`Failed to load dashboard metrics: ${res.statusText}`);
  return res.json();
};

export const fetchBottleneckAnalytics = async () => {
  const res = await fetch(`${API_BASE}/analytics/bottlenecks`);
  if (!res.ok) throw new Error(`Failed to load bottleneck analytics: ${res.statusText}`);
  return res.json();
};

export const fetchCases = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('page_size', params.pageSize);
  if (params.search) query.append('search', params.search);
  if (params.stage && params.stage !== 'All') query.append('stage', params.stage);
  if (params.category && params.category !== 'All') query.append('category', params.category);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.hasMissingInfo !== undefined && params.hasMissingInfo !== 'All') {
    query.append('has_missing_info', params.hasMissingInfo === 'true');
  }
  if (params.sortBy) query.append('sort_by', params.sortBy);
  if (params.sortOrder) query.append('sort_order', params.sortOrder);

  const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch cases: ${res.statusText}`);
  return res.json();
};

export const fetchCaseDetail = async (caseId) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch case detail: ${res.statusText}`);
  return res.json();
};

export const fetchCaseExplanation = async (caseId) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/explanation`);
  if (!res.ok) throw new Error(`Failed to fetch explanation: ${res.statusText}`);
  return res.json();
};

export const fetchActions = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.caseId) query.append('case_id', params.caseId);

  const res = await fetch(`${API_BASE}/actions?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load actions: ${res.statusText}`);
  return res.json();
};

export const createAction = async (payload) => {
  const res = await fetch(`${API_BASE}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create action: ${res.statusText}`);
  return res.json();
};

export const updateActionStatus = async (actionId, status) => {
  const res = await fetch(`${API_BASE}/actions/${actionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update action status: ${res.statusText}`);
  return res.json();
};

export const runWhatIfSimulation = async (payload) => {
  const res = await fetch(`${API_BASE}/simulator/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
  return res.json();
};

export const resetDatabaseToSeed = async () => {
  const res = await fetch(`${API_BASE}/admin/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`Database reset failed: ${res.statusText}`);
  return res.json();
};

export const fetchAuditLogs = async () => {
  const res = await fetch(`${API_BASE}/admin/audit-logs?limit=40`);
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
  return res.json();
};

export const getExportCsvUrl = (params = {}) => {
  const query = new URLSearchParams();
  if (params.stage && params.stage !== 'All') query.append('stage', params.stage);
  if (params.category && params.category !== 'All') query.append('category', params.category);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.hasMissingInfo !== undefined && params.hasMissingInfo !== 'All') {
    query.append('has_missing_info', params.hasMissingInfo === 'true');
  }
  return `${API_BASE}/cases/export/csv?${query.toString()}`;
};

export const fetchAIStatus = async () => {
  const res = await fetch(`${API_BASE}/ai/status`);
  if (!res.ok) throw new Error(`Failed to check AI status: ${res.statusText}`);
  return res.json();
};

export const sendAIChatMessage = async ({ message, caseId, history = [] }) => {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, case_id: caseId, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `AI Copilot request failed: ${res.statusText}`);
  }
  return res.json();
};

export const configureAIApiKey = async (apiKey) => {
  const res = await fetch(`${API_BASE}/ai/configure-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to verify Gemini API Key: ${res.statusText}`);
  }
  return res.json();
};

export const clearAIApiKey = async () => {
  const res = await fetch(`${API_BASE}/ai/clear-key`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to reset AI settings: ${res.statusText}`);
  return res.json();
};
