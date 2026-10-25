import React from 'react';
import { 
  Scale, 
  LayoutDashboard, 
  FolderSearch, 
  GitPullRequest, 
  CheckSquare, 
  Sliders, 
  Database,
  Sparkles
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenResetModal, backendConnected }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'explorer', label: 'Case Explorer', icon: FolderSearch },
    { id: 'bottlenecks', label: 'Bottleneck Analytics', icon: GitPullRequest },
    { id: 'actions', label: 'Action Queue', icon: CheckSquare },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'ai-copilot', label: 'AI Copilot', icon: Sparkles },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="bg-teal-500 p-2 rounded-lg text-slate-950 flex items-center justify-center shadow-inner">
              <Scale className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">NyayaFlow AI</span>
                <span className="bg-teal-900/70 border border-teal-500/30 text-teal-300 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded">
                  Prototype
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Explainable Court Backlog &amp; Procedural Bottleneck Assistant
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs border border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="text-slate-300 text-[11px]">
                {backendConnected ? 'SQLite Live' : 'Connecting...'}
              </span>
            </div>

            <button
              onClick={onOpenResetModal}
              title="Manage Data / Reset to Seed / View Audit Logs"
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Data Admin</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
