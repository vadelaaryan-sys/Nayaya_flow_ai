import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Eye,
  FileWarning,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { fetchCases, getExportCsvUrl } from '../services/api';

const STAGES = [
  'All',
  'Filing & Scrutiny',
  'Service of Summons',
  'Pleadings & Written Statement',
  'Framing of Issues',
  'Evidence & Witness Examination',
  'Final Arguments',
  'Judgment Reserved',
  'Post-Judgment Compliance',
];

const CATEGORIES = [
  'All',
  'Civil Commercial',
  'Civil Property',
  'Criminal Bail Application',
  'Criminal Summary Trial',
  'Family Custody & Maintenance',
  'Constitutional Writ Petition',
  'Labor & Industrial Dispute',
  'Motor Accident Claims',
];

const STATUSES = ['All', 'Pending', 'Administrative Review Needed', 'Ready for Hearing', 'Disposed'];

export default function CaseExplorer({ onSelectCase }) {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [hasMissingInfo, setHasMissingInfo] = useState('All');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCases({
        page,
        pageSize,
        search,
        stage,
        category,
        status,
        hasMissingInfo,
        sortBy,
        sortOrder,
      });
      setCases(data.cases || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [page, pageSize, stage, category, status, hasMissingInfo, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadCases();
  };

  const getScoreBadge = (score, level) => {
    if (score === null || score === undefined) return <span className="text-slate-400 text-xs">N/A</span>;
    let bg = 'bg-slate-100 text-slate-700 border-slate-300';
    if (score >= 75) {
      bg = 'bg-rose-50 text-rose-700 border-rose-300';
    } else if (score >= 50) {
      bg = 'bg-amber-50 text-amber-700 border-amber-300';
    } else if (score >= 25) {
      bg = 'bg-teal-50 text-teal-700 border-teal-300';
    } else {
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
    return (
      <div className="flex flex-col items-start">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${bg}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] text-slate-500 font-medium">{level || 'Normal'}</span>
      </div>
    );
  };

  const exportUrl = getExportCsvUrl({
    stage,
    category,
    status,
    hasMissingInfo,
    search,
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by case #, category, stage..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-2.5 py-1 rounded font-medium transition"
            >
              Filter
            </button>
          </form>

          {/* Export CSV button */}
          <div className="flex items-center space-x-2">
            <a
              href={exportUrl}
              download="nyayaflow_cases_export.csv"
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Stage Filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Procedural Stage</label>
            <select
              value={stage}
              onChange={(e) => { setStage(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Case Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Data Quality Flag Filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Data Quality Record</label>
            <select
              value={hasMissingInfo}
              onChange={(e) => { setHasMissingInfo(e.target.value); setPage(1); }}
              className="w-full border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All Records</option>
              <option value="true">Flagged / Missing Records Only</option>
              <option value="false">Complete Records Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Sort Attribute</label>
            <div className="flex space-x-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="score">Priority Score</option>
                <option value="days_at_stage">Days at Stage</option>
                <option value="filing_date">Filing Date</option>
                <option value="case_number">Case Number</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
                className="border border-slate-300 px-2 rounded-md hover:bg-slate-50 flex items-center justify-center text-slate-600"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Case Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading filtered cases...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            {error}
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No matching synthetic case records found. Adjust your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Case Number</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stage &amp; Duration</th>
                  <th className="py-3 px-4">Filing Date</th>
                  <th className="py-3 px-4">Admin Score</th>
                  <th className="py-3 px-4">Registry Quality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cases.map((c) => {
                  const hasMissing = c.missing_information && c.missing_information !== 'None';
                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => onSelectCase(c.id)}
                    >
                      {/* Case Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-teal-700">
                        {c.case_number}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium">{c.category}</span>
                      </td>

                      {/* Stage & Duration */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{c.current_stage}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            c.days_at_stage > 60 ? 'bg-rose-500' : 'bg-teal-500'
                          }`} />
                          <span>{c.days_at_stage} days at this stage</span>
                        </div>
                      </td>

                      {/* Filing Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.filing_date}</span>
                        </div>
                      </td>

                      {/* Priority Score */}
                      <td className="py-3.5 px-4">
                        {getScoreBadge(c.priority_score, c.priority_level)}
                      </td>

                      {/* Data Quality Flag */}
                      <td className="py-3.5 px-4">
                        {hasMissing ? (
                          <div className="flex items-center space-x-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium" title={c.missing_information}>
                            <FileWarning className="w-3 h-3 shrink-0 text-amber-600" />
                            <span className="truncate max-w-[130px]">{c.missing_information}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-emerald-700 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Complete</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.status === 'Disposed' 
                            ? 'bg-slate-100 text-slate-600'
                            : c.status === 'Administrative Review Needed'
                            ? 'bg-rose-100 text-rose-800'
                            : c.status === 'Ready for Hearing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-teal-50 text-teal-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.id);
                          }}
                          className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
          <div>
            Showing <span className="font-semibold">{cases.length}</span> of <span className="font-semibold">{total}</span> records
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-slate-300 rounded px-1.5 py-0.5 bg-white"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
