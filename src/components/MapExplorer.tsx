import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Search, SlidersHorizontal, MapPin, Building2, 
  RotateCcw, Compass, ArrowUpDown, ChevronRight, Eye, Navigation, Check,
  Calendar, Layers, Sparkles, BedDouble, Maximize2
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

type TileTheme = 'onemap_default' | 'onemap_grey' | 'osm_standard';

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

  // Default to OneMap Day style (Official SLA Light theme)
  const [tileTheme, setTileTheme] = useState<TileTheme>('onemap_default');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<OneMapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [SINGAPORE_CENTER.lat, SINGAPORE_CENTER.lng],
      zoom: 12,
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

  // Update Tile Layer when tileTheme changes (Light Mode Only)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    let tileUrl = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
    let attribution = '<a href="https://www.onemap.gov.sg" target="_blank">OneMap</a> &copy; Singapore Land Authority';

    if (tileTheme === 'onemap_grey') {
      tileUrl = 'https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png';
    } else if (tileTheme === 'osm_standard') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution
    });

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;
  }, [tileTheme]);

  // Update User Location Marker & 5KM Radius Circle
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

      // Radius filter circle (e.g. 5KM default!)
      if (filters.radiusKm > 0) {
        L.circle([lat, lng], {
          radius: filters.radiusKm * 1000,
          color: '#e11d48',
          fillColor: '#f43f5e',
          fillOpacity: 0.06,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(userMarkerLayerRef.current);
      }

      // Friendly User Marker
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-sky-400 opacity-60"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-sky-600 border-2 border-white shadow-md"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: userIcon });
      marker.bindPopup(`
        <div class="p-3 text-xs text-slate-900 font-sans">
          <div class="font-bold text-sky-600 mb-1 flex items-center gap-1">
            <span>Your Detected Location</span>
          </div>
          <div class="text-slate-700">
            ${userLocation.address?.formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </div>
          <div class="text-[11px] text-slate-500 mt-1 font-medium">
            ${filters.radiusKm > 0 ? `Showing properties within ${filters.radiusKm}km` : 'Showing islandwide'}
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
        color: '#e11d48',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        dashArray: activeRoute.routeType === 'walk' ? '1, 10' : undefined
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      routeLayerRef.current = polyline;
    }
  }, [activeRoute]);

  // Render Friendly Pins
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    transactions.forEach((tx) => {
      const isCondo = tx.type === 'CONDO';
      const isEc = tx.type === 'EC';
      
      const badgeBg = isCondo ? '#e11d48' : isEc ? '#d97706' : '#059669';
      const badgeText = isCondo ? 'CONDO' : isEc ? 'EC' : 'HDB';
      const priceText = `$${(tx.price / 1000).toFixed(0)}k`;

      const customIcon = L.divIcon({
        className: 'custom-property-pin',
        html: `
          <div class="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
            <div class="px-2 py-1 rounded-full text-[11px] font-bold font-mono tracking-tight text-white shadow-md flex items-center gap-1 border-2 border-white whitespace-nowrap" style="background-color: ${badgeBg}">
              <span class="text-[9px] opacity-90 px-1 py-0.2 rounded-full bg-white/20">${badgeText}</span>
              <span>${priceText}</span>
            </div>
            <div class="w-2 h-2 rotate-45 -mt-1 shadow-xs border-r border-b border-white" style="background-color: ${badgeBg}"></div>
          </div>
        `,
        iconSize: [64, 28],
        iconAnchor: [32, 28]
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
      mapRef.current.setView([res.lat, res.lng], 15);
    }
  };

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

  const toggleBedroomFilter = (bed: number) => {
    if (bed === 0) {
      onFilterChange({ ...filters, bedrooms: [0] });
      return;
    }
    let current = filters.bedrooms ? filters.bedrooms.filter((b) => b !== 0) : [];
    if (current.includes(bed)) {
      current = current.filter((b) => b !== bed);
      if (current.length === 0) current = [0];
    } else {
      current.push(bed);
    }
    onFilterChange({ ...filters, bedrooms: current });
  };

  const handleSizePreset = (min: number, max: number) => {
    onFilterChange({
      ...filters,
      sizeSqftMin: min,
      sizeSqftMax: max
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-slate-100">
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
              className="w-full h-10 pl-9 pr-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 shadow-md focus:outline-none focus:border-rose-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 h-7 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-white transition-colors"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </form>

          {/* Autocomplete Results Dropdown */}
          {showResultsDropdown && searchResults.length > 0 && (
            <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto z-30">
              <div className="p-1 space-y-0.5">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-2 text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900">{res.searchVal}</div>
                      <div className="text-[11px] text-slate-500 truncate">{res.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Radius Presets (Default ~5KM) */}
        <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md pointer-events-auto">
          <button
            onClick={() => onFilterChange({ ...filters, radiusKm: 5 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filters.radiusKm === 5
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show properties within 5km radius of your location"
          >
            <Navigation className="w-3 h-3" />
            <span>5km Area (Default)</span>
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, radiusKm: 0 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filters.radiusKm === 0
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show all islandwide properties"
          >
            <span>Islandwide</span>
          </button>
        </div>

        {/* Quick Property Type Toggles */}
        <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md pointer-events-auto">
          <button
            onClick={() => togglePropertyType('HDB')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filters.propertyTypes.includes('HDB')
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HDB
          </button>
          <button
            onClick={() => togglePropertyType('CONDO')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filters.propertyTypes.includes('CONDO')
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Condo
          </button>
          <button
            onClick={() => togglePropertyType('EC')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filters.propertyTypes.includes('EC')
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EC
          </button>
        </div>

        {/* Quick Bedroom Filter */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md pointer-events-auto">
          <div className="px-2 text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <BedDouble className="w-3.5 h-3.5 text-slate-400" />
            <span>Beds:</span>
          </div>
          {[
            { label: 'All', value: 0 },
            { label: '1 Bed', value: 1 },
            { label: '2 Beds', value: 2 },
            { label: '3 Beds', value: 3 },
            { label: '4+ Beds', value: 4 }
          ].map((item) => {
            const isSelected = item.value === 0
              ? !filters.bedrooms || filters.bedrooms.length === 0 || filters.bedrooms.includes(0)
              : filters.bedrooms && filters.bedrooms.includes(item.value);
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.value === 0) {
                    onFilterChange({ ...filters, bedrooms: [0] });
                  } else if (item.value === 4) {
                    onFilterChange({ ...filters, bedrooms: [4, 5] });
                  } else {
                    onFilterChange({ ...filters, bedrooms: [item.value] });
                  }
                }}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  isSelected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* More Filters Toggle */}
        <button
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`h-10 px-3.5 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-md flex items-center gap-2 pointer-events-auto transition-colors whitespace-nowrap ${
            showFilterDrawer
              ? 'bg-rose-600 border-rose-600 text-white'
              : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        </button>

        {/* Tile Theme Selector (Light modes only) */}
        <div className="hidden lg:flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md pointer-events-auto">
          <button
            onClick={() => setTileTheme('onemap_default')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tileTheme === 'onemap_default' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OneMap Day
          </button>
          <button
            onClick={() => setTileTheme('onemap_grey')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tileTheme === 'onemap_grey' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OneMap Grey
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative flex-1 w-full h-full flex">
        <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

        {/* Floating Side Card / List of Matching Transactions */}
        <div className="absolute bottom-4 left-4 z-10 w-80 sm:w-96 max-h-[48%] sm:max-h-[52%] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50/80">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>Transacted Units ({transactions.length})</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {filters.radiusKm > 0 ? `~${filters.radiusKm}km Area` : 'Islandwide'} · Past 12 Mos
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                <p>No transactions found within this radius.</p>
                <button
                  onClick={() => onFilterChange({ ...filters, radiusKm: 0 })}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 transition-colors"
                >
                  Expand to Islandwide
                </button>
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="p-3 rounded-xl bg-white border border-slate-100 hover:border-rose-400 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5 truncate mr-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <span className={`font-bold ${tx.type === 'CONDO' ? 'text-rose-600' : tx.type === 'EC' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {tx.type}
                      </span>
                      <span>·</span>
                      <span className="truncate">{tx.town}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px]">{tx.transactionDate}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate group-hover:text-rose-600 transition-colors">
                      {tx.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span>{tx.remainingLeaseDisplay}</span>
                      {tx.distanceFromUserMeters !== undefined && (
                        <>
                          <span>·</span>
                          <span className="text-sky-600 font-semibold font-mono">
                            {(tx.distanceFromUserMeters / 1000).toFixed(1)}km from you
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-700 tabular-nums">
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
          <div className="absolute top-16 right-4 z-30 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                Filter Parameters
              </span>
              <button
                onClick={() => {
                  onFilterChange({
                    propertyTypes: ['HDB', 'CONDO', 'EC'],
                    town: 'ALL',
                    flatTypes: ['ALL'],
                    bedrooms: [0],
                    priceMin: 200000,
                    priceMax: 4500000,
                    sizeSqftMin: 300,
                    sizeSqftMax: 3500,
                    minRemainingLeaseYears: 0,
                    tenureType: 'ALL',
                    radiusKm: 5,
                    timeRangeMonths: 12,
                    sortBy: 'date_desc',
                    searchQuery: ''
                  });
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset (5km Default)
              </button>
            </div>

            {/* Radius Preset Selection */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-sky-600" />
                  Area Radius from You
                </label>
                <span className="font-semibold text-sky-600 font-mono">
                  {filters.radiusKm === 0 ? 'Islandwide' : `${filters.radiusKm} km`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 3, 5, 10, 0].map((km) => (
                  <button
                    key={km}
                    onClick={() => {
                      if (!userLocation || userLocation.status !== 'located') {
                        onTriggerLocate();
                      }
                      onFilterChange({ ...filters, radiusKm: km });
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      filters.radiusKm === km
                        ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {km === 0 ? 'All' : `${km}km`}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Period Filter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  Transaction Period
                </label>
                <span className="font-semibold text-slate-700">
                  {filters.timeRangeMonths === 12 ? 'Past 12 Months (Default)' : 'All Time'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onFilterChange({ ...filters, timeRangeMonths: 12 })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    filters.timeRangeMonths === 12
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Past 12 Months
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, timeRangeMonths: 0 })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    filters.timeRangeMonths === 0
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Recorded
                </button>
              </div>
            </div>

            {/* Town Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Town / Planning Area</label>
              <select
                value={filters.town}
                onChange={(e) => onFilterChange({ ...filters, town: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Planning Areas</option>
                {Object.keys(SINGAPORE_TOWNS).sort().map((town) => (
                  <option key={town} value={town}>
                    {town} ({SINGAPORE_TOWNS[town].district})
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Bedrooms Filter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-rose-500" />
                  <span>Number of Bedrooms</span>
                </label>
                <span className="font-semibold text-slate-600 font-mono text-[11px]">
                  {!filters.bedrooms || filters.bedrooms.length === 0 || filters.bedrooms.includes(0)
                    ? 'All Bedrooms'
                    : filters.bedrooms.map((b) => (b >= 5 ? '5+ Beds' : `${b} Bed`)).join(', ')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'All Beds', value: 0 },
                  { label: '1 Bed', value: 1 },
                  { label: '2 Beds', value: 2 },
                  { label: '3 Beds', value: 3 },
                  { label: '4 Beds', value: 4 },
                  { label: '5+ Beds', value: 5 }
                ].map((item) => {
                  const isSelected = item.value === 0
                    ? !filters.bedrooms || filters.bedrooms.length === 0 || filters.bedrooms.includes(0)
                    : filters.bedrooms && filters.bedrooms.includes(item.value);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleBedroomFilter(item.value)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Floor Area / Size Filter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Floor Area / Size</span>
                </label>
                <span className="font-mono font-semibold text-slate-700 tabular-nums text-[11px]">
                  {filters.sizeSqftMin.toLocaleString()} – {filters.sizeSqftMax.toLocaleString()} sqft
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Equivalent to ~{Math.round(filters.sizeSqftMin / 10.764)} – {Math.round(filters.sizeSqftMax / 10.764)} m²
              </div>
              {/* Quick Size Presets */}
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                {[
                  { label: 'All Sizes', min: 300, max: 3500 },
                  { label: '< 600 sqft', min: 300, max: 600 },
                  { label: '600–1,000', min: 600, max: 1000 },
                  { label: '1,000–1,500', min: 1000, max: 1500 },
                  { label: '1,500–2,000', min: 1500, max: 2000 },
                  { label: '> 2,000 sqft', min: 2000, max: 3500 }
                ].map((preset) => {
                  const isActive =
                    filters.sizeSqftMin === preset.min && filters.sizeSqftMax === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSizePreset(preset.min, preset.max)}
                      className={`py-1 px-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                        isActive
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              {/* Dual Sliders */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Min: {filters.sizeSqftMin} sqft</div>
                  <input
                    type="range"
                    min="300"
                    max="2000"
                    step="50"
                    value={filters.sizeSqftMin}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        sizeSqftMin: Math.min(Number(e.target.value), filters.sizeSqftMax - 50)
                      })
                    }
                    className="w-full accent-rose-500"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Max: {filters.sizeSqftMax} sqft</div>
                  <input
                    type="range"
                    min="600"
                    max="3500"
                    step="50"
                    value={filters.sizeSqftMax}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        sizeSqftMax: Math.max(Number(e.target.value), filters.sizeSqftMin + 50)
                      })
                    }
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Price Budget Range */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700">Price Range</label>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
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

            {/* Tenure Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tenure Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ALL', '99-year', 'Freehold'] as const).map((tenure) => (
                  <button
                    key={tenure}
                    onClick={() => onFilterChange({ ...filters, tenureType: tenure })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      filters.tenureType === tenure
                        ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tenure === 'ALL' ? 'All' : tenure}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-rose-500" />
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-rose-500"
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
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-md"
              >
                Show {transactions.length} Matching Properties
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
