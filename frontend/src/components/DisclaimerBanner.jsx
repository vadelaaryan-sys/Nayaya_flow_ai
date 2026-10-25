import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-2 max-w-5xl mx-auto">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong className="font-semibold">Demonstration Prototype Only:</strong> Synthetic court records for procedural workflow analysis.
          Scores represent <em>administrative review indicators</em>, not legal urgency or merits. Never automates judicial decisions or determines guilt.
        </span>
      </div>
      <div className="hidden lg:flex items-center space-x-1 text-slate-500 text-xs shrink-0 pl-4 border-l border-amber-200">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
        <span>100% Local SQLite &bull; No Remote Cloud Host</span>
      </div>
    </div>
  );
}
