import React from 'react';
import { Compass, Navigation, Loader2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'trends' | 'planner';
  setActiveTab: (tab: 'map' | 'trends' | 'planner') => void;
  onDetectLocation: () => void;
  isLocating: boolean;
  hasLocation: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onDetectLocation,
  isLocating,
  hasLocation
}) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none shadow-xs">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <Compass className="w-4 h-4" />
        </div>
        <button
          onClick={() => setActiveTab('map')}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-rose-600 transition-colors whitespace-nowrap"
        >
          SG Property Navigator
        </button>
      </div>

      {/* Zone 2: clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('map')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'map' ? 'text-rose-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Map Explorer
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'trends' ? 'text-rose-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Market Trends
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`transition-colors whitespace-nowrap ${
            activeTab === 'planner' ? 'text-rose-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Financial Planner
        </button>
      </nav>

      {/* Zone 3: primary action */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Locate Me Button */}
        <button
          onClick={onDetectLocation}
          disabled={isLocating}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shadow-xs ${
            hasLocation
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'bg-slate-900 text-white hover:bg-slate-800'
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
