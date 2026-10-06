/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MapExplorer } from './components/MapExplorer';
import { PriceTrendChart } from './components/PriceTrendChart';
import { PurchasePlanner } from './components/PurchasePlanner';
import { TransactionDetailModal } from './components/TransactionDetailModal';

import { 
  PropertyTransaction, GeolocationState, FilterState, 
  OneMapRouteResult 
} from './types/property';
import { INITIAL_TRANSACTIONS } from './data/sampleTransactions';
import { fetchHdbTransactions } from './services/dataGovService';
import { reverseGeocode } from './services/oneMapService';
import { calculateDistanceMeters } from './utils/propertyMath';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'trends' | 'planner'>('map');
  const [transactions, setTransactions] = useState<PropertyTransaction[]>(INITIAL_TRANSACTIONS);
  const [selectedTransaction, setSelectedTransaction] = useState<PropertyTransaction | null>(null);
  const [plannerProperty, setPlannerProperty] = useState<PropertyTransaction | null>(null);
  
  // Default to Singapore CBD / detected location with located status so 5km filter works out of the box
  const [userLocation, setUserLocation] = useState<GeolocationState>({
    lat: 1.2841,
    lng: 103.8515,
    status: 'located',
    address: { formatted: 'Raffles Place, Singapore CBD' }
  });
  const [isLocating, setIsLocating] = useState(false);
  const [activeRoute, setActiveRoute] = useState<OneMapRouteResult | null>(null);

  // Default view: 5KM radius around user area, past 12 months
  const [filters, setFilters] = useState<FilterState>({
    propertyTypes: ['HDB', 'CONDO', 'EC'],
    town: 'ALL',
    flatTypes: ['ALL'],
    priceMin: 200000,
    priceMax: 4500000,
    sizeSqftMin: 400,
    sizeSqftMax: 2500,
    minRemainingLeaseYears: 0,
    tenureType: 'ALL',
    radiusKm: 5, // Default view ~5KM range
    timeRangeMonths: 12, // Default past 12 months
    sortBy: 'date_desc',
    searchQuery: ''
  });

  // Calculate distance on initial load and update
  useEffect(() => {
    setTransactions((prev) =>
      prev.map((tx) => {
        const dist = calculateDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          tx.coordinates.lat,
          tx.coordinates.lng
        );
        return { ...tx, distanceFromUserMeters: dist };
      })
    );
  }, [userLocation.lat, userLocation.lng]);

  // Fetch initial live HDB records from backend API
  useEffect(() => {
    let isCancelled = false;
    async function loadLiveHdb() {
      try {
        const res = await fetchHdbTransactions({
          limit: 35,
          sort: 'month desc'
        });
        if (!isCancelled && res.transactions.length > 0) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newOnes = res.transactions
              .filter((t) => !existingIds.has(t.id))
              .map((t) => ({
                ...t,
                distanceFromUserMeters: calculateDistanceMeters(
                  userLocation.lat,
                  userLocation.lng,
                  t.coordinates.lat,
                  t.coordinates.lng
                )
              }));
            return [...prev, ...newOnes];
          });
        }
      } catch (err) {
        console.warn('Initial live HDB load note (using curated dataset):', err);
      }
    }
    loadLiveHdb();
    return () => {
      isCancelled = true;
    };
  }, [userLocation.lat, userLocation.lng]);

  // Geolocation detector handler
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Check if detected position is within or near Singapore bounding box (Lat 1.15 to 1.48, Lng 103.6 to 104.1)
        const isNearSingapore =
          latitude >= 1.15 && latitude <= 1.48 && longitude >= 103.6 && longitude <= 104.1;

        const activeLat = isNearSingapore ? latitude : 1.2841;
        const activeLng = isNearSingapore ? longitude : 103.8515;

        let addressDetails;
        try {
          addressDetails = await reverseGeocode(activeLat, activeLng);
        } catch {
          // ignore
        }

        setUserLocation({
          lat: activeLat,
          lng: activeLng,
          accuracy,
          timestamp: pos.timestamp,
          address: addressDetails,
          status: 'located'
        });
        setIsLocating(false);
      },
      async (err) => {
        console.warn('Geolocation permission not granted / error, maintaining Singapore center:', err.message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  }, []);

  // Try browser GPS on initial mount
  useEffect(() => {
    handleDetectLocation();
  }, [handleDetectLocation]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Property type
        if (!filters.propertyTypes.includes(tx.type)) return false;

        // Town
        if (filters.town !== 'ALL' && tx.town.toUpperCase() !== filters.town.toUpperCase()) {
          return false;
        }

        // Time Range (Past 12 Months: from 2025-10 onwards for 2026-10)
        if (filters.timeRangeMonths > 0) {
          const minMonth = '2025-10';
          if (tx.transactionDate < minMonth) return false;
        }

        // Price
        if (tx.price < filters.priceMin || tx.price > filters.priceMax) {
          return false;
        }

        // Size
        if (tx.floorAreaSqft < filters.sizeSqftMin || tx.floorAreaSqft > filters.sizeSqftMax) {
          return false;
        }

        // Tenure
        if (filters.tenureType !== 'ALL' && tx.tenureType !== filters.tenureType) {
          return false;
        }

        // Remaining lease
        if (filters.minRemainingLeaseYears > 0) {
          if (tx.tenureType !== 'Freehold' && (tx.remainingLeaseYears || 0) < filters.minRemainingLeaseYears) {
            return false;
          }
        }

        // Radius filter from user location (Default: 5KM)
        if (filters.radiusKm > 0) {
          if (tx.distanceFromUserMeters === undefined || tx.distanceFromUserMeters > filters.radiusKm * 1000) {
            return false;
          }
        }

        // Search query
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const match =
            tx.title.toLowerCase().includes(q) ||
            tx.street.toLowerCase().includes(q) ||
            tx.town.toLowerCase().includes(q) ||
            tx.projectOrModel.toLowerCase().includes(q) ||
            (tx.district && tx.district.toLowerCase().includes(q));
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'date_desc':
            return b.transactionDate.localeCompare(a.transactionDate);
          case 'date_asc':
            return a.transactionDate.localeCompare(b.transactionDate);
          case 'price_asc':
            return a.price - b.price;
          case 'price_desc':
            return b.price - a.price;
          case 'psf_asc':
            return a.psf - b.psf;
          case 'psf_desc':
            return b.psf - a.psf;
          case 'distance_asc':
            return (a.distanceFromUserMeters || 999999) - (b.distanceFromUserMeters || 999999);
          default:
            return 0;
        }
      });
  }, [transactions, filters]);

  // Plan purchase for specific unit
  const handleSelectForPlanner = (property: PropertyTransaction) => {
    setPlannerProperty(property);
    setActiveTab('planner');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDetectLocation={handleDetectLocation}
        isLocating={isLocating}
        hasLocation={userLocation?.status === 'located'}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative overflow-y-auto">
        {activeTab === 'map' && (
          <MapExplorer
            transactions={filteredTransactions}
            userLocation={userLocation}
            filters={filters}
            onFilterChange={setFilters}
            onSelectTransaction={setSelectedTransaction}
            activeRoute={activeRoute}
            onTriggerLocate={handleDetectLocation}
            isLocating={isLocating}
          />
        )}

        {activeTab === 'trends' && (
          <PriceTrendChart />
        )}

        {activeTab === 'planner' && (
          <PurchasePlanner
            selectedProperty={plannerProperty}
            onClearSelectedProperty={() => setPlannerProperty(null)}
          />
        )}
      </main>

      {/* Property Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        userLocation={userLocation}
        onSelectForPlanner={handleSelectForPlanner}
        onRouteCalculated={(route) => setActiveRoute(route)}
      />
    </div>
  );
}
