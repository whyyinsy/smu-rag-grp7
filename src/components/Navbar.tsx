import React from 'react';
import { Compass, Key, Navigation, Loader2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'trends' | 'planner';
  setActiveTab: (tab: 'map' | 'trends' | 'planner') => void;
  onDetectLocation: () => void;
  isLocating: boolean;
  hasLocation: boolean;
  hasOneMapToken: boolean;
  onOpenTokenModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onDetectLocation,
  isLocating,
  hasLocation,
  hasOneMapToken,
  onOpenTokenModal
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
          <Compass className="w-4 h-4" />
        </div>
        <button
          onClick={() => setActiveTab('map')}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-rose-400 transition-colors whitespace-nowrap"
        >
          SG Property Navigator
        </button>
      </div>

      {/* Zone 2: clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('map')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'map' ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Map Explorer
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'trends' ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Market Trends
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'planner' ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Financial Planner
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* OneMap Token Button */}
        <button
          onClick={onOpenTokenModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
            hasOneMapToken
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
          title="Configure official OneMap token for reverse geocode & routing"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">OneMap Token</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasOneMapToken ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Locate Me Button */}
        <button
          onClick={onDetectLocation}
          disabled={isLocating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            hasLocation
              ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-900/40'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>{isLocating ? 'Detecting...' : hasLocation ? 'GPS Located' : 'Detect Location'}</span>
        </button>
      </div>
    </header>
  );
};
