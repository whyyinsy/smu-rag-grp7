import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { verifyOneMapToken } from '../services/oneMapService';

interface OneMapTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSaveToken: (token: string) => void;
}

export const OneMapTokenModal: React.FC<OneMapTokenModalProps> = ({
  isOpen,
  onClose,
  token,
  onSaveToken
}) => {
  const [inputVal, setInputVal] = useState(token);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!inputVal.trim()) {
      onSaveToken('');
      setTestResult({ valid: true, message: 'Token cleared. Using standard mapping mode.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await verifyOneMapToken(inputVal);
    setTesting(false);
    setTestResult(res);

    if (res.valid) {
      onSaveToken(inputVal.trim());
    }
  };

  const handleDirectSave = () => {
    onSaveToken(inputVal.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Key className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-semibold">OneMap API Token Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            OneMap is the authoritative Singapore Land Authority (SLA) national mapping platform. 
            A token is required for official SLA reverse geocoding and public transport / walking route calculation.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Your OneMap API Token
            </label>
            <textarea
              rows={3}
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setTestResult(null);
              }}
              placeholder="Paste Bearer token from onemap.gov.sg (e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6...)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 transition-colors resize-none placeholder:text-slate-600"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                testResult.valid
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-2">
            <div className="text-xs font-medium text-slate-300">How to get a free OneMap Token:</div>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Register a free developer account at the OneMap portal.</li>
              <li>Under your account dashboard, generate an API token.</li>
              <li>Paste the token above. It will be securely stored in your browser session.</li>
            </ol>
            <a
              href="https://www.onemap.gov.sg/apidocs/"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium pt-1"
            >
              <span>Visit OneMap SLA Developer Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              setInputVal('');
              onSaveToken('');
              setTestResult(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear Token
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAndSave}
              disabled={testing || !inputVal.trim()}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Test Connection</span>
            </button>
            <button
              onClick={handleDirectSave}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
