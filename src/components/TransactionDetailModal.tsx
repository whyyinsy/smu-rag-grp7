import React, { useState } from 'react';
import { X, Building2, Calendar, Clock, Navigation, Calculator, MapPin, Footprints, Car, Layers } from 'lucide-react';
import { PropertyTransaction, GeolocationState, OneMapRouteResult } from '../types/property';
import { formatCurrency, formatNumber } from '../utils/propertyMath';
import { fetchOneMapRoute } from '../services/oneMapService';

interface TransactionDetailModalProps {
  transaction: PropertyTransaction | null;
  onClose: () => void;
  userLocation: GeolocationState | null;
  oneMapToken: string;
  onSelectForPlanner: (property: PropertyTransaction) => void;
  onRouteCalculated?: (route: OneMapRouteResult) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  userLocation,
  oneMapToken,
  onSelectForPlanner,
  onRouteCalculated
}) => {
  const [routeType, setRouteType] = useState<'walk' | 'drive'>('walk');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [activeRoute, setActiveRoute] = useState<OneMapRouteResult | null>(null);

  if (!transaction) return null;

  const handleCalculateRoute = async (mode: 'walk' | 'drive') => {
    if (!userLocation || userLocation.status !== 'located') {
      alert('Please click "Detect Location" first to enable routing from your current position.');
      return;
    }

    setRouteType(mode);
    setLoadingRoute(true);
    try {
      const res = await fetchOneMapRoute(
        userLocation.lat,
        userLocation.lng,
        transaction.coordinates.lat,
        transaction.coordinates.lng,
        mode,
        oneMapToken
      );
      setActiveRoute(res);
      if (onRouteCalculated) {
        onRouteCalculated(res);
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
    } finally {
      setLoadingRoute(false);
    }
  };

  // Determine tenure visual bar percentage
  const maxLease = transaction.tenureType === 'Freehold' ? 999 : 99;
  const remainingYears = transaction.remainingLeaseYears ?? (transaction.tenureType === 'Freehold' ? 999 : 90);
  const leasePercent = Math.min(100, Math.round((remainingYears / maxLease) * 100));

  const imageSrc = transaction.type === 'HDB' 
    ? '/src/assets/images/sg_hdb_skyline_1791250519666.jpg'
    : '/src/assets/images/sg_condo_residence_1791250506095.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with image preview */}
        <div className="relative h-44 w-full bg-slate-800 overflow-hidden shrink-0">
          <img
            src={imageSrc}
            alt={transaction.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1">
                <span className="text-rose-400 font-semibold">{transaction.type}</span>
                <span aria-hidden="true">·</span>
                <span>{transaction.town}</span>
                {transaction.district && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{transaction.district}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                {transaction.title}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Last Done Price</div>
              <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
                {formatCurrency(transaction.price)}
              </div>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200">
          {/* Key metrics grid */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div>
              <div className="text-xs text-slate-400">Unit Price (PSF)</div>
              <div className="text-base font-bold text-white font-mono tabular-nums">
                ${formatNumber(transaction.psf)}
                <span className="text-xs font-normal text-slate-400"> /sqft</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Floor Area</div>
              <div className="text-base font-bold text-white font-mono tabular-nums">
                {transaction.floorAreaSqft}
                <span className="text-xs font-normal text-slate-400"> sqft ({transaction.floorAreaSqm} m²)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Transacted Date</div>
              <div className="text-base font-bold text-white font-mono tabular-nums">
                {transaction.transactionDate}
              </div>
            </div>
          </div>

          {/* Tenure & Lease Details Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                Tenure & Remaining Lease
              </span>
              <span className="text-slate-400 font-mono tabular-nums">
                {transaction.tenureType === 'Freehold'
                  ? 'Freehold (Estate in Perpetuity)'
                  : `${remainingYears} yrs remaining`}
              </span>
            </div>
            
            {transaction.tenureType !== 'Freehold' && (
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    leasePercent > 70 ? 'bg-emerald-500' : leasePercent > 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${leasePercent}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Lease Details:</span>
                <span className="font-medium text-slate-200">{transaction.remainingLeaseDisplay}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Storey Range:</span>
                <span className="font-medium text-slate-200">
                  {transaction.unitRange ? `Level ${transaction.unitRange}` : 'Not Specified'}
                </span>
              </div>
            </div>
          </div>

          {/* Property Specifications */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-rose-400" />
              Property Architecture & Model
            </span>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Type / Model:</span>
                <span className="font-medium text-white">{transaction.flatTypeOrBeds} · {transaction.projectOrModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Address:</span>
                <span className="font-medium text-white">{transaction.block ? `Blk ${transaction.block} ` : ''}{transaction.street}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Official Data Source:</span>
                <span className="text-slate-400 font-mono">{transaction.source}</span>
              </div>
            </div>
          </div>

          {/* OneMap Geolocation & Routing Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-rose-400" />
                OneMap Geolocation & Routing
              </span>
              {transaction.distanceFromUserMeters !== undefined && (
                <span className="text-xs text-rose-400 font-mono tabular-nums">
                  {(transaction.distanceFromUserMeters / 1000).toFixed(2)} km from you
                </span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCalculateRoute('walk')}
                  disabled={loadingRoute}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    routeType === 'walk' && activeRoute
                      ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Route Walk</span>
                </button>
                <button
                  onClick={() => handleCalculateRoute('drive')}
                  disabled={loadingRoute}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    routeType === 'drive' && activeRoute
                      ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Route Drive</span>
                </button>
              </div>

              {activeRoute && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Estimated Travel Time: </span>
                    <span className="font-semibold text-white font-mono">
                      {Math.ceil(activeRoute.totalTimeSeconds / 60)} mins
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Distance: </span>
                    <span className="font-semibold text-rose-400 font-mono">
                      {(activeRoute.totalDistanceMeters / 1000).toFixed(2)} km
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>
          
          <button
            onClick={() => {
              onSelectForPlanner(transaction);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Plan Purchase & Mortgage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
