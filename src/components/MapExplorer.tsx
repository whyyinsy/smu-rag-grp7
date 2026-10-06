import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Search, SlidersHorizontal, MapPin, Building, Filter, 
  RotateCcw, Compass, ArrowUpDown, ChevronRight, Eye, Navigation, Check
} from 'lucide-react';
import { 
  PropertyTransaction, GeolocationState, FilterState, 
  PropertyType, OneMapRouteResult 
} from '../types/property';
import { SINGAPORE_TOWNS, SINGAPORE_CENTER } from '../data/townCoordinates';
import { formatCurrency, formatNumber } from '../utils/propertyMath';
import { searchOneMap, OneMapSearchResult } from '../services/oneMapService';

interface MapExplorerProps {
  transactions: PropertyTransaction[];
  userLocation: GeolocationState | null;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onSelectTransaction: (transaction: PropertyTransaction) => void;
  activeRoute: OneMapRouteResult | null;
  onTriggerLocate: () => void;
  isLocating: boolean;
}

type TileTheme = 'onemap_default' | 'onemap_night' | 'onemap_grey' | 'carto_dark';

export const MapExplorer: React.FC<MapExplorerProps> = ({
  transactions,
  userLocation,
  filters,
  onFilterChange,
  onSelectTransaction,
  activeRoute,
  onTriggerLocate,
  isLocating
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  const [tileTheme, setTileTheme] = useState<TileTheme>('onemap_night');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<OneMapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [activePropertyView, setActivePropertyView] = useState<'both' | 'map' | 'list'>('both');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [SINGAPORE_CENTER.lat, SINGAPORE_CENTER.lng],
      zoom: SINGAPORE_CENTER.zoom,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    userMarkerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Tile Layer when tileTheme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    let tileUrl = 'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png';
    let attribution = '<a href="https://www.onemap.gov.sg" target="_blank">OneMap</a> &copy; Singapore Land Authority';

    if (tileTheme === 'onemap_default') {
      tileUrl = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
    } else if (tileTheme === 'onemap_grey') {
      tileUrl = 'https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png';
    } else if (tileTheme === 'carto_dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution
    });

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;
  }, [tileTheme]);

  // Update User Location Marker & Accuracy Radius
  useEffect(() => {
    if (!mapRef.current || !userMarkerLayerRef.current) return;
    userMarkerLayerRef.current.clearLayers();

    if (userLocation && userLocation.status === 'located') {
      const { lat, lng, accuracy } = userLocation;

      // Accuracy circle
      if (accuracy && accuracy > 0) {
        L.circle([lat, lng], {
          radius: Math.min(accuracy, 1000),
          color: '#38bdf8',
          fillColor: '#38bdf8',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(userMarkerLayerRef.current);
      }

      // Radius filter circle if active
      if (filters.radiusKm > 0) {
        L.circle([lat, lng], {
          radius: filters.radiusKm * 1000,
          color: '#f43f5e',
          fillColor: '#f43f5e',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '4, 4'
        }).addTo(userMarkerLayerRef.current);
      }

      // Pulsing user beacon
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-sky-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-white shadow-lg"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: userIcon });
      marker.bindPopup(`
        <div class="p-3 text-xs text-slate-100">
          <div class="font-bold text-sky-400 mb-1 flex items-center gap-1">
            <span>Your Detected Geolocation</span>
          </div>
          <div class="text-slate-300 font-mono">
            ${userLocation.address?.formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            Buffer: ${filters.radiusKm > 0 ? `${filters.radiusKm} km radius filter applied` : 'All Singapore'}
          </div>
        </div>
      `);
      marker.addTo(userMarkerLayerRef.current);

      mapRef.current.setView([lat, lng], 13);
    }
  }, [userLocation, filters.radiusKm]);

  // Update Route Polyline
  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (activeRoute && activeRoute.routeGeometry && activeRoute.routeGeometry.length > 0) {
      const polyline = L.polyline(activeRoute.routeGeometry, {
        color: '#f43f5e',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        dashArray: activeRoute.routeType === 'walk' ? '1, 8' : undefined
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      routeLayerRef.current = polyline;
    }
  }, [activeRoute]);

  // Render Transaction Markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    transactions.forEach((tx) => {
      const isCondo = tx.type === 'CONDO';
      const isEc = tx.type === 'EC';
      
      const bgColor = isCondo ? '#f43f5e' : isEc ? '#f59e0b' : '#10b981';
      const badgeText = isCondo ? 'CONDO' : isEc ? 'EC' : 'HDB';
      const priceText = `$${(tx.price / 1000).toFixed(0)}k`;

      const customIcon = L.divIcon({
        className: 'custom-property-pin',
        html: `
          <div class="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
            <div class="px-2 py-1 rounded-md text-[11px] font-bold font-mono tracking-tight text-white shadow-lg flex items-center gap-1 border border-white/20 whitespace-nowrap" style="background-color: ${bgColor}">
              <span class="text-[9px] opacity-80">${badgeText}</span>
              <span>${priceText}</span>
            </div>
            <div class="w-1.5 h-1.5 rotate-45 -mt-1 shadow-sm" style="background-color: ${bgColor}"></div>
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 26]
      });

      const marker = L.marker([tx.coordinates.lat, tx.coordinates.lng], {
        icon: customIcon
      });

      marker.on('click', () => {
        onSelectTransaction(tx);
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [transactions, onSelectTransaction]);

  // Handle Search OneMap
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchVal.trim()) return;

    setIsSearching(true);
    setShowResultsDropdown(true);

    try {
      const results = await searchOneMap(searchVal);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: OneMapSearchResult) => {
    setShowResultsDropdown(false);
    setSearchVal(res.searchVal);

    if (mapRef.current) {
      mapRef.current.setView([res.lat, res.lng], 16);
    }
  };

  // Helper toggle property type
  const togglePropertyType = (type: PropertyType) => {
    const current = [...filters.propertyTypes];
    const index = current.indexOf(type);
    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1);
      }
    } else {
      current.push(type);
    }
    onFilterChange({ ...filters, propertyTypes: current });
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-slate-950">
      {/* Top Floating Search & Quick Filters Bar */}
      <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 z-20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pointer-events-none">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md pointer-events-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search Singapore address, MRT, or condo (e.g. Raffles Place, Tampines St 21)..."
              className="w-full h-10 pl-9 pr-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 shadow-xl focus:outline-none focus:border-rose-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </form>

          {/* Autocomplete Results Dropdown */}
          {showResultsDropdown && searchResults.length > 0 && (
            <div className="absolute top-11 left-0 right-0 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto z-30">
              <div className="p-1.5 space-y-0.5">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition-colors flex items-start gap-2 text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">{res.searchVal}</div>
                      <div className="text-[11px] text-slate-400 truncate">{res.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Type Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl pointer-events-auto">
          <button
            onClick={() => togglePropertyType('HDB')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filters.propertyTypes.includes('HDB')
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>HDB</span>
          </button>
          <button
            onClick={() => togglePropertyType('CONDO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filters.propertyTypes.includes('CONDO')
                ? 'bg-rose-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Condo</span>
          </button>
          <button
            onClick={() => togglePropertyType('EC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filters.propertyTypes.includes('EC')
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>EC</span>
          </button>
        </div>

        {/* Filter Drawer Toggle Button */}
        <button
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`h-10 px-3.5 rounded-xl border text-xs font-medium backdrop-blur-md shadow-xl flex items-center gap-2 pointer-events-auto transition-colors whitespace-nowrap ${
            showFilterDrawer
              ? 'bg-rose-600 border-rose-500 text-white'
              : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        </button>

        {/* Tile Theme Selector */}
        <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl pointer-events-auto">
          <button
            onClick={() => setTileTheme('onemap_night')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tileTheme === 'onemap_night' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OneMap Night
          </button>
          <button
            onClick={() => setTileTheme('onemap_default')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tileTheme === 'onemap_default' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OneMap Day
          </button>
          <button
            onClick={() => setTileTheme('onemap_grey')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tileTheme === 'onemap_grey' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OneMap Grey
          </button>
        </div>
      </div>

      {/* Main Map Viewport & Side List Container */}
      <div className="relative flex-1 w-full h-full flex">
        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

        {/* Floating Side Card / List of Matching Transactions */}
        <div className="absolute bottom-4 left-4 z-10 w-80 sm:w-96 max-h-[46%] sm:max-h-[50%] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Building className="w-3.5 h-3.5 text-rose-400" />
              <span>Matching Transactions ({transactions.length})</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {filters.town === 'ALL' ? 'Islandwide' : filters.town}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {transactions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No transactions match your current filters. Try widening your price range or town selection.
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-rose-500/50 hover:bg-slate-950 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5 truncate mr-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <span className={tx.type === 'CONDO' ? 'text-rose-400' : tx.type === 'EC' ? 'text-amber-400' : 'text-emerald-400'}>
                        {tx.type}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{tx.town}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{tx.transactionDate}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 truncate group-hover:text-rose-400 transition-colors">
                      {tx.title}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>{tx.remainingLeaseDisplay}</span>
                      {tx.distanceFromUserMeters !== undefined && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400 font-mono">{(tx.distanceFromUserMeters / 1000).toFixed(1)}km</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-400 tabular-nums">
                      {formatCurrency(tx.price)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                      ${formatNumber(tx.psf)}/psf
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filter Drawer Overlay */}
        {showFilterDrawer && (
          <div className="absolute top-16 right-4 z-30 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-rose-400" />
                Filter Parameters
              </span>
              <button
                onClick={() => {
                  onFilterChange({
                    propertyTypes: ['HDB', 'CONDO', 'EC'],
                    town: 'ALL',
                    flatTypes: ['ALL'],
                    priceMin: 200000,
                    priceMax: 4000000,
                    sizeSqftMin: 400,
                    sizeSqftMax: 2000,
                    minRemainingLeaseYears: 0,
                    tenureType: 'ALL',
                    radiusKm: 0,
                    sortBy: 'date_desc',
                    searchQuery: ''
                  });
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Town / Planning Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Town / Planning Area</label>
              <select
                value={filters.town}
                onChange={(e) => onFilterChange({ ...filters, town: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Singapore Planning Areas</option>
                {Object.keys(SINGAPORE_TOWNS).sort().map((town) => (
                  <option key={town} value={town}>
                    {town} ({SINGAPORE_TOWNS[town].district})
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300">Price Budget</label>
                <span className="font-mono text-emerald-400 tabular-nums">
                  {formatCurrency(filters.priceMin)} - {formatCurrency(filters.priceMax)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="200000"
                  max="2000000"
                  step="50000"
                  value={filters.priceMin}
                  onChange={(e) => onFilterChange({ ...filters, priceMin: Number(e.target.value) })}
                  className="w-full accent-rose-500"
                />
                <input
                  type="range"
                  min="500000"
                  max="5000000"
                  step="100000"
                  value={filters.priceMax}
                  onChange={(e) => onFilterChange({ ...filters, priceMax: Number(e.target.value) })}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            {/* Radius From My Geolocation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-400" />
                  Near Me Radius Filter
                </label>
                <span className="font-mono text-sky-400 tabular-nums">
                  {filters.radiusKm === 0 ? 'No radius restriction' : `Within ${filters.radiusKm} km`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 5].map((km) => (
                  <button
                    key={km}
                    onClick={() => {
                      if (!userLocation || userLocation.status !== 'located') {
                        onTriggerLocate();
                      }
                      onFilterChange({ ...filters, radiusKm: km });
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      filters.radiusKm === km
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {km === 0 ? 'Off' : `${km}km`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tenure Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Tenure Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ALL', '99-year', 'Freehold'] as const).map((tenure) => (
                  <button
                    key={tenure}
                    onClick={() => onFilterChange({ ...filters, tenureType: tenure })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      filters.tenureType === tenure
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tenure === 'ALL' ? 'All Tenures' : tenure}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Remaining Lease (Years) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300">Min Remaining Lease</label>
                <span className="font-mono text-slate-400 tabular-nums">
                  {filters.minRemainingLeaseYears > 0 ? `${filters.minRemainingLeaseYears} years` : 'Any'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={filters.minRemainingLeaseYears}
                onChange={(e) => onFilterChange({ ...filters, minRemainingLeaseYears: Number(e.target.value) })}
                className="w-full accent-rose-500"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-rose-400" />
                Sort Transactions
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="date_desc">Latest Transaction Date</option>
                <option value="date_asc">Oldest Transaction Date</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="psf_asc">PSF: Low to High</option>
                <option value="psf_desc">PSF: High to Low</option>
                <option value="distance_asc">Distance: Nearest to Me</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                Apply Filters ({transactions.length} properties)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
