import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  FileText,
  Clock,
  Layers,
  Info
} from 'lucide-react';
import { fetchAIStatus, sendAIChatMessage, configureAIApiKey, clearAIApiKey } from '../services/api';

const QUICK_PROMPTS = [
  'Which procedural stages are causing the worst bottlenecks?',
  'Why is case NF-2026-0042 delayed?',
  'Draft an administrative notice for missing proof of service',
  'How does the priority scoring formula work?',
  'What administrative follow-ups should the registry prioritize today?',
];

export default function AICopilotView({ selectedCaseId, onSelectCase }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am **NyayaFlow AI**, your Explainable Procedural Court Backlog Assistant.\n\nI monitor synthetic court case records, detect procedural bottlenecks, draft registry notices, and explain administrative priority scores.\n\nHow can I assist you with court procedural workflow today?",
      engine: 'NyayaFlow AI Engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState(null);
  const [keyError, setKeyError] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadStatus = async () => {
    try {
      const data = await fetchAIStatus();
      setAiStatus(data);
    } catch (e) {
      console.warn('AI status check failed', e);
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      const res = await sendAIChatMessage({
        message: text,
        caseId: selectedCaseId || null,
        history,
      });

      const assistantMsg = {
        role: 'assistant',
        text: res.reply,
        engine: res.engine,
        model: res.model,
        caseContext: res.case_context,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ **AI Service Error:** ${err.message}`,
          engine: 'Error handler',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    setKeyMessage(null);
    setKeyError(null);
    try {
      const res = await configureAIApiKey(apiKeyInput.trim());
      setKeyMessage(res.message);
      setApiKeyInput('');
      await loadStatus();
      setTimeout(() => setShowSettings(false), 1500);
    } catch (err) {
      setKeyError(err.message || 'Verification failed');
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearKey = async () => {
    try {
      await clearAIApiKey();
      await loadStatus();
      setKeyMessage('Switched back to built-in offline NLP engine.');
      setTimeout(() => setShowSettings(false), 1500);
    } catch (err) {
      setKeyError(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* AI Assistant Banner & Engine Status */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-500/20 border border-teal-500/40 p-2.5 rounded-xl text-teal-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white">NyayaFlow AI Procedural Copilot</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                aiStatus?.gemini_configured
                  ? 'bg-purple-900/60 text-purple-300 border-purple-500/40'
                  : 'bg-teal-900/60 text-teal-300 border-teal-500/40'
              }`}>
                {aiStatus?.active_engine || 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Natural language procedural diagnosis, administrative defect notices &amp; delay root-cause analysis
            </p>
          </div>
        </div>

        {/* AI Key Configuration Trigger */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
        >
          <Key className="w-3.5 h-3.5 text-teal-400" />
          <span>{aiStatus?.gemini_configured ? 'Gemini Connected' : 'Connect Gemini API'}</span>
        </button>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[68vh] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-slate-900 text-white' : 'bg-teal-600 text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap font-sans">
                    {m.text}
                  </div>

                  {!isUser && m.engine && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Source: {m.engine}</span>
                      <span className="text-slate-400">&bull; Fictional Records Only</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 rounded-tl-none flex items-center space-x-2 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-medium text-slate-600 pl-1">Analyzing procedural timeline...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 overflow-x-auto flex items-center space-x-2 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Suggestions:
          </span>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-xs bg-white hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-300 text-slate-700 px-3 py-1 rounded-full whitespace-nowrap transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask AI about a case (e.g. 'Why is NF-2026-0012 delayed?') or ask to draft a notice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 text-xs sm:text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* API Key Configuration Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900">AI Engine Configuration</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              NyayaFlow AI functions <strong>100% locally and offline</strong> using its built-in Procedural NLP Engine. 
              Optionally, connect a <strong>Google Gemini API key</strong> to unlock live multimodal LLM explanations.
            </p>

            {keyMessage && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{keyMessage}</span>
              </div>
            )}

            {keyError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{keyError}</span>
              </div>
            )}

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Saved securely in your local environment file (`.env`). Never exposed to public code.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                {aiStatus?.gemini_configured ? (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Disconnect Key
                  </button>
                ) : <span />}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingKey || !apiKeyInput.trim()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
                  >
                    {savingKey ? 'Verifying...' : 'Save & Verify'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
