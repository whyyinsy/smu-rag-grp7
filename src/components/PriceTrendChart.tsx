import React, { useState } from 'react';
import { TrendingUp, BarChart3, Calendar, Layers, ArrowUpRight, ShieldCheck, DollarSign } from 'lucide-react';
import { HISTORICAL_PRICE_TRENDS } from '../data/sampleTransactions';
import { formatCurrency, formatNumber } from '../utils/propertyMath';

type TrendViewMode = 'all' | 'hdb' | 'condo' | 'compare';

export const PriceTrendChart: React.FC = () => {
  const [viewMode, setViewMode] = useState<TrendViewMode>('compare');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(HISTORICAL_PRICE_TRENDS.length - 1);

  const data = HISTORICAL_PRICE_TRENDS;
  const activeDataPoint = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];

  // Chart Geometry
  const svgWidth = 800;
  const svgHeight = 320;
  const padding = { top: 30, right: 50, bottom: 40, left: 60 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  // Max and min scales
  const maxPsf = 2600;
  const minPsf = 400;
  const maxVolume = 11000;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * innerWidth;
  const getYPsf = (val: number) => padding.top + innerHeight - ((val - minPsf) / (maxPsf - minPsf)) * innerHeight;
  const getYVol = (val: number) => padding.top + innerHeight - (val / maxVolume) * innerHeight;

  // Generate SVG path for HDB PSF
  const hdbPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYPsf(d.hdbAvgPsf)}`).join(' ');
  // Generate SVG path for Condo PSF
  const condoPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYPsf(d.condoAvgPsf)}`).join(' ');
  // Generate SVG path for Overall PSF
  const overallPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYPsf(d.overallAvgPsf)}`).join(' ');

  // Compute stats
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const totalVolumeInHistory = data.reduce((acc, curr) => acc + curr.volume, 0);
  const hdbPsfChange = (((lastPoint.hdbAvgPsf - firstPoint.hdbAvgPsf) / firstPoint.hdbAvgPsf) * 100).toFixed(1);
  const condoPsfChange = (((lastPoint.condoAvgPsf - firstPoint.condoAvgPsf) / firstPoint.condoAvgPsf) * 100).toFixed(1);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            Singapore Residential Price Trend & Transaction Volume
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical quarterly price evolution ($/psf) and resale volume across HDB and Private Condominium markets.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'compare' ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HDB vs Condo
          </button>
          <button
            onClick={() => setViewMode('hdb')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'hdb' ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HDB Resale
          </button>
          <button
            onClick={() => setViewMode('condo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'condo' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Condominiums
          </button>
        </div>
      </div>

      {/* Snapshot Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Current HDB Avg PSF</div>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            ${lastPoint.hdbAvgPsf}
            <span className="text-xs font-normal text-slate-400">/sqft</span>
          </div>
          <div className="text-[11px] text-emerald-500 font-mono flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+{hdbPsfChange}% since 2024</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Current Condo Avg PSF</div>
          <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">
            ${lastPoint.condoAvgPsf}
            <span className="text-xs font-normal text-slate-400">/sqft</span>
          </div>
          <div className="text-[11px] text-rose-500 font-mono flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+{condoPsfChange}% since 2024</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Quarterly Volume (Active)</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {formatNumber(activeDataPoint.volume)}
            <span className="text-xs font-normal text-slate-400"> units</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            HDB: {formatNumber(activeDataPoint.hdbVolume)} · Condo: {formatNumber(activeDataPoint.condoVolume)}
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Average Unit Price</div>
          <div className="text-xl font-bold font-mono text-sky-400 tabular-nums">
            {formatCurrency(activeDataPoint.averagePrice)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Period: {activeDataPoint.period}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-400 rounded-full" />
              <span>HDB Resale PSF</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-rose-400 rounded-full" />
              <span>Condo / Private PSF</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-700 rounded-sm" />
              <span>Volume (Bars)</span>
            </div>
          </div>
          <div className="text-slate-400 font-mono">
            Hover over chart points to inspect quarterly data
          </div>
        </div>

        {/* SVG Responsive Container */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[650px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Horizontal Grid lines */}
              {[600, 1000, 1400, 1800, 2200].map((psf) => {
                const y = getYPsf(psf);
                return (
                  <g key={psf}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="rgba(51, 65, 85, 0.3)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="JetBrains Mono"
                    >
                      ${psf}
                    </text>
                  </g>
                );
              })}

              {/* Volume Bars */}
              {data.map((d, i) => {
                const x = getX(i);
                const barWidth = 24;
                const barHeight = innerHeight - (getYVol(d.volume) - padding.top);
                const isHovered = hoveredIndex === i;

                return (
                  <rect
                    key={d.period}
                    x={x - barWidth / 2}
                    y={getYVol(d.volume)}
                    width={barWidth}
                    height={Math.max(0, barHeight)}
                    fill={isHovered ? 'rgba(148, 163, 184, 0.35)' : 'rgba(51, 65, 85, 0.3)'}
                    rx="3"
                    className="transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                  />
                );
              })}

              {/* HDB PSF Line */}
              {(viewMode === 'compare' || viewMode === 'hdb') && (
                <path
                  d={hdbPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Condo PSF Line */}
              {(viewMode === 'compare' || viewMode === 'condo') && (
                <path
                  d={condoPath}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Dots & Guide Line */}
              {data.map((d, i) => {
                const x = getX(i);
                const yHdb = getYPsf(d.hdbAvgPsf);
                const yCondo = getYPsf(d.condoAvgPsf);
                const isHovered = hoveredIndex === i;

                return (
                  <g key={d.period} onMouseEnter={() => setHoveredIndex(i)} className="cursor-pointer">
                    {/* Vertical hover guide */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={padding.top + innerHeight}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* HDB Point */}
                    {(viewMode === 'compare' || viewMode === 'hdb') && (
                      <circle
                        cx={x}
                        cy={yHdb}
                        r={isHovered ? 5 : 3.5}
                        fill="#10b981"
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                    )}

                    {/* Condo Point */}
                    {(viewMode === 'compare' || viewMode === 'condo') && (
                      <circle
                        cx={x}
                        cy={yCondo}
                        r={isHovered ? 5 : 3.5}
                        fill="#f43f5e"
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                    )}

                    {/* X-axis labels */}
                    <text
                      x={x}
                      y={svgHeight - 15}
                      fill={isHovered ? '#f8fafc' : '#64748b'}
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      {d.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Hover Detail Strip */}
        {activeDataPoint && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-white font-mono">{activeDataPoint.period}</span>
            </div>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <div>
                <span className="text-slate-400">HDB Avg: </span>
                <span className="font-semibold text-emerald-400">${activeDataPoint.hdbAvgPsf}/psf</span>
              </div>
              <div>
                <span className="text-slate-400">Condo Avg: </span>
                <span className="font-semibold text-rose-400">${activeDataPoint.condoAvgPsf}/psf</span>
              </div>
              <div>
                <span className="text-slate-400">Total Volume: </span>
                <span className="font-semibold text-white">{formatNumber(activeDataPoint.volume)} sales</span>
              </div>
              <div>
                <span className="text-slate-400">Mean Price: </span>
                <span className="font-semibold text-sky-400">{formatCurrency(activeDataPoint.averagePrice)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
