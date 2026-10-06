import React, { useState, useMemo } from 'react';
import { 
  X, Building2, Calendar, Clock, Navigation, Calculator, 
  MapPin, Footprints, Car, Train, Bus, ArrowRightLeft, 
  Search, Check, ExternalLink, Compass 
} from 'lucide-react';
import { PropertyTransaction, GeolocationState, OneMapRouteResult } from '../types/property';
import { formatCurrency, formatNumber } from '../utils/propertyMath';
import { fetchOneMapRoute, searchOneMap, OneMapSearchResult } from '../services/oneMapService';
import { getNearbyTransit, SINGAPORE_MRT_LRT } from '../data/transitData';

interface TransactionDetailModalProps {
  transaction: PropertyTransaction | null;
  onClose: () => void;
  userLocation: GeolocationState | null;
  onSelectForPlanner: (property: PropertyTransaction) => void;
  onRouteCalculated?: (route: OneMapRouteResult) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  userLocation,
  onSelectForPlanner,
  onRouteCalculated
}) => {
  const [routeType, setRouteType] = useState<'walk' | 'drive'>('walk');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [activeRoute, setActiveRoute] = useState<OneMapRouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Routing location configuration
  const [originMode, setOriginMode] = useState<'user' | 'custom'>('user');
  const [customOriginName, setCustomOriginName] = useState('Raffles Place MRT');
  const [customOriginCoords, setCustomOriginCoords] = useState<{ lat: number; lng: number }>({ lat: 1.2841, lng: 103.8515 });
  const [swapDirection, setSwapDirection] = useState(false); // false: Origin -> Property, true: Property -> Origin

  // Custom search state
  const [customQuery, setCustomQuery] = useState('');
  const [customSearchResults, setCustomSearchResults] = useState<OneMapSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Compute nearby transit (3 MRTs and 3 Bus Stops)
  const nearbyTransit = useMemo(() => {
    if (!transaction) return { mrtStations: [], busStops: [] };
    return getNearbyTransit(transaction.coordinates.lat, transaction.coordinates.lng);
  }, [transaction]);

  if (!transaction) return null;

  // Handle routing calculation
  const handleCalculateRoute = async (mode: 'walk' | 'drive') => {
    setRouteType(mode);
    setLoadingRoute(true);
    setRouteError(null);

    let startLat = 0;
    let startLng = 0;

    if (originMode === 'user') {
      if (!userLocation || userLocation.status !== 'located') {
        // Use default friendly fallback location if location not yet granted
        startLat = 1.2841; // Raffles Place
        startLng = 103.8515;
      } else {
        startLat = userLocation.lat;
        startLng = userLocation.lng;
      }
    } else {
      startLat = customOriginCoords.lat;
      startLng = customOriginCoords.lng;
    }

    let actualStartLat = swapDirection ? transaction.coordinates.lat : startLat;
    let actualStartLng = swapDirection ? transaction.coordinates.lng : startLng;
    let actualEndLat = swapDirection ? startLat : transaction.coordinates.lat;
    let actualEndLng = swapDirection ? startLng : transaction.coordinates.lng;

    try {
      const res = await fetchOneMapRoute(actualStartLat, actualStartLng, actualEndLat, actualEndLng, mode);
      setActiveRoute(res);
      if (onRouteCalculated) {
        onRouteCalculated(res);
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
      setRouteError('Could not calculate routing for the selected path. Showing straight-line estimate.');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Quick route to specific nearby transit stop
  const handleRouteToStop = async (lat: number, lng: number, name: string) => {
    setSwapDirection(true);
    setOriginMode('custom');
    setCustomOriginName(name);
    setCustomOriginCoords({ lat, lng });

    setLoadingRoute(true);
    setRouteError(null);
    try {
      const res = await fetchOneMapRoute(
        transaction.coordinates.lat,
        transaction.coordinates.lng,
        lat,
        lng,
        'walk'
      );
      setRouteType('walk');
      setActiveRoute(res);
      if (onRouteCalculated) {
        onRouteCalculated(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleSearchCustomLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;

    setIsSearchingLocation(true);
    setShowLocationDropdown(true);
    try {
      const results = await searchOneMap(customQuery);
      setCustomSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectCustomSearchResult = (res: OneMapSearchResult) => {
    setCustomOriginName(res.searchVal);
    setCustomOriginCoords({ lat: res.lat, lng: res.lng });
    setShowLocationDropdown(false);
    setCustomQuery('');
  };

  const maxLease = transaction.tenureType === 'Freehold' ? 999 : 99;
  const remainingYears = transaction.remainingLeaseYears ?? (transaction.tenureType === 'Freehold' ? 999 : 90);
  const leasePercent = Math.min(100, Math.round((remainingYears / maxLease) * 100));

  const imageSrc = transaction.type === 'HDB' 
    ? '/src/assets/images/sg_hdb_skyline_1791250519666.jpg'
    : '/src/assets/images/sg_condo_residence_1791250506095.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with image & friendly overlay */}
        <div className="relative h-44 w-full bg-slate-100 overflow-hidden shrink-0">
          <img
            src={imageSrc}
            alt={transaction.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 shadow-md transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 mb-1">
                <span className="bg-rose-500/80 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                  {transaction.type}
                </span>
                <span>{transaction.town}</span>
                {transaction.district && <span>· {transaction.district}</span>}
                <span>· {transaction.flatTypeOrBeds}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                {transaction.title}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] text-slate-300 font-medium">Last Done Price</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-mono tabular-nums">
                {formatCurrency(transaction.price)}
              </div>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {/* Key metrics grid */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Unit Price (PSF)</div>
              <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                ${formatNumber(transaction.psf)}
                <span className="text-xs font-normal text-slate-500"> /sqft</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Floor Area</div>
              <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                {transaction.floorAreaSqft}
                <span className="text-xs font-normal text-slate-500"> sqft ({transaction.floorAreaSqm} m²)</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Transacted Date</div>
              <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                {transaction.transactionDate}
              </div>
            </div>
          </div>

          {/* Tenure Details & Remaining Lease */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                Tenure & Remaining Lease
              </span>
              <span className="text-slate-600 font-mono font-medium">
                {transaction.tenureType === 'Freehold'
                  ? 'Freehold (Estate in Perpetuity)'
                  : `${remainingYears} yrs remaining`}
              </span>
            </div>

            {transaction.tenureType !== 'Freehold' && (
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    leasePercent > 70 ? 'bg-emerald-500' : leasePercent > 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${leasePercent}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Official Lease Record:</span>
                <span className="font-medium text-slate-800">{transaction.remainingLeaseDisplay}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Storey Floor Level:</span>
                <span className="font-medium text-slate-800">
                  {transaction.unitRange ? `Storey ${transaction.unitRange}` : 'Standard Floor'}
                </span>
              </div>
            </div>
          </div>

          {/* Nearby Transit Section: 3 MRT/LRT and 3 Bus Stops */}
          <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Train className="w-4 h-4 text-sky-600" />
                Nearby Transit & Accessibility (Closest 3 MRT/LRT & 3 Bus Stops)
              </h3>
              <span className="text-[11px] text-slate-500">Estimated Walking Times</span>
            </div>

            {/* 3 Nearest MRT / LRT Stations */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Train className="w-3.5 h-3.5 text-slate-500" />
                <span>Nearest MRT / LRT Stations:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {nearbyTransit.mrtStations.map((mrt) => (
                  <div
                    key={mrt.id}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-sky-400 transition-colors group cursor-pointer"
                    onClick={() => handleRouteToStop(mrt.lat, mrt.lng, `${mrt.name} MRT`)}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-900 truncate">{mrt.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold shrink-0">
                          {mrt.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Footprints className="w-3 h-3" />
                        <span>{mrt.walkMinutes} min walk ({mrt.distanceMeters}m)</span>
                      </div>
                    </div>
                    <button
                      className="mt-2 text-[10px] text-sky-600 group-hover:text-sky-700 font-medium text-left flex items-center gap-1"
                    >
                      <span>Route here</span>
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 Nearest Bus Stops */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Bus className="w-3.5 h-3.5 text-slate-500" />
                <span>Nearest Bus Stops:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {nearbyTransit.busStops.map((bs) => (
                  <div
                    key={bs.id}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-sky-400 transition-colors group cursor-pointer"
                    onClick={() => handleRouteToStop(bs.lat, bs.lng, bs.name)}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-slate-900 truncate" title={bs.name}>
                          {bs.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                          {bs.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{bs.road}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                        <Footprints className="w-3 h-3" />
                        <span>{bs.walkMinutes} min walk ({bs.distanceMeters}m)</span>
                      </div>
                    </div>
                    <button
                      className="mt-2 text-[10px] text-sky-600 group-hover:text-sky-700 font-medium text-left flex items-center gap-1"
                    >
                      <span>Route here</span>
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flexible Routing System */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Navigation className="w-4 h-4 text-rose-500" />
                Route Planner (From / To Any Location)
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSwapDirection(!swapDirection)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 flex items-center gap-1 transition-colors"
                  title="Swap Origin and Destination"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Swap Direction</span>
                </button>
              </div>
            </div>

            {/* Origin & Destination Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">
                  {swapDirection ? 'Starting Point (Property):' : 'Starting Point:'}
                </span>
                {!swapDirection && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOriginMode('user')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        originMode === 'user' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      My Location
                    </button>
                    <button
                      onClick={() => setOriginMode('custom')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        originMode === 'custom' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Other Location
                    </button>
                  </div>
                )}
              </div>

              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">
                  {swapDirection 
                    ? transaction.title
                    : originMode === 'user'
                      ? (userLocation?.address?.formatted || 'My Current GPS Location')
                      : customOriginName}
                </span>
              </div>

              {/* Custom Location Search if active */}
              {originMode === 'custom' && !swapDirection && (
                <div className="relative pt-1">
                  <form onSubmit={handleSearchCustomLocation} className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Search landmark, MRT, or address to route from (e.g. Orchard MRT, Marina Bay)..."
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-16 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <button
                      type="submit"
                      className="absolute right-1 px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-medium hover:bg-slate-700"
                    >
                      {isSearchingLocation ? '...' : 'Find'}
                    </button>
                  </form>

                  {/* Dropdown results */}
                  {showLocationDropdown && customSearchResults.length > 0 && (
                    <div className="absolute top-10 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto p-1 space-y-0.5">
                      {customSearchResults.map((res, i) => (
                        <button
                          key={i}
                          onClick={() => selectCustomSearchResult(res)}
                          className="w-full text-left p-1.5 rounded hover:bg-slate-100 flex items-center gap-2 text-xs"
                        >
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-slate-800">{res.searchVal}</div>
                            <div className="text-[10px] text-slate-500 truncate">{res.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Preset MRT Chips */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {['Raffles Place MRT', 'Orchard MRT', 'Bishan MRT', 'Jurong East MRT', 'Changi Airport'].map((loc) => {
                      const stn = SINGAPORE_MRT_LRT.find((s) => loc.includes(s.name));
                      return (
                        <button
                          key={loc}
                          onClick={() => {
                            if (stn) {
                              setCustomOriginName(loc);
                              setCustomOriginCoords({ lat: stn.lat, lng: stn.lng });
                            }
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                            customOriginName === loc
                              ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Destination */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Destination:</span>
                <span className="font-semibold text-slate-900 truncate">
                  {swapDirection ? customOriginName : transaction.title}
                </span>
              </div>
            </div>

            {/* Travel Mode Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleCalculateRoute('walk')}
                disabled={loadingRoute}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  routeType === 'walk' && activeRoute
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Calculate Walking Route</span>
              </button>
              <button
                onClick={() => handleCalculateRoute('drive')}
                disabled={loadingRoute}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  routeType === 'drive' && activeRoute
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Calculate Driving Route</span>
              </button>
            </div>

            {routeError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                {routeError}
              </div>
            )}

            {activeRoute && (
              <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-600">Estimated Travel Time: </span>
                  <span className="font-bold text-emerald-900 font-mono text-sm">
                    {Math.ceil(activeRoute.totalTimeSeconds / 60)} mins
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Total Route Distance: </span>
                  <span className="font-bold text-emerald-900 font-mono text-sm">
                    {(activeRoute.totalDistanceMeters / 1000).toFixed(2)} km
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
          
          <button
            onClick={() => {
              onSelectForPlanner(transaction);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all hover:shadow-lg"
          >
            <Calculator className="w-4 h-4" />
            <span>Plan Mortgage for this Unit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
