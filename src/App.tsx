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
  
  const [userLocation, setUserLocation] = useState<GeolocationState | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [activeRoute, setActiveRoute] = useState<OneMapRouteResult | null>(null);

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
    radiusKm: 0,
    sortBy: 'date_desc',
    searchQuery: ''
  });

  // Fetch initial live HDB records from backend API
  useEffect(() => {
    let isCancelled = false;
    async function loadLiveHdb() {
      try {
        const res = await fetchHdbTransactions({
          limit: 25,
          sort: 'month desc'
        });
        if (!isCancelled && res.transactions.length > 0) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newOnes = res.transactions.filter((t) => !existingIds.has(t.id));
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
  }, []);

  // Update distance from user whenever userLocation changes
  useEffect(() => {
    if (!userLocation || userLocation.status !== 'located') return;

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
  }, [userLocation]);

  // Geolocation detector handler
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setUserLocation({
        lat: 1.2834,
        lng: 103.8507,
        status: 'error',
        errorMessage: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    setIsLocating(true);
    setUserLocation((prev) => ({
      lat: prev?.lat || 1.3521,
      lng: prev?.lng || 103.8198,
      status: 'detecting'
    }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Check if detected position is within or near Singapore bounding box (Lat 1.15 to 1.48, Lng 103.6 to 104.1)
        const isNearSingapore =
          latitude >= 1.15 && latitude <= 1.48 && longitude >= 103.6 && longitude <= 104.1;

        // If user is running outside Singapore, center them at a landmark (Raffles Place / Central Area)
        const activeLat = isNearSingapore ? latitude : 1.2834;
        const activeLng = isNearSingapore ? longitude : 103.8507;

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
        console.warn('Geolocation error / permission denied, defaulting to Singapore CBD:', err.message);
        // Fallback to Singapore CBD (Raffles Place)
        const fallbackLat = 1.2834;
        const fallbackLng = 103.8507;
        let addressDetails;
        try {
          addressDetails = await reverseGeocode(fallbackLat, fallbackLng);
        } catch {
          // ignore
        }

        setUserLocation({
          lat: fallbackLat,
          lng: fallbackLng,
          status: 'located',
          address: addressDetails || { formatted: 'Raffles Place, Singapore CBD' }
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);

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

        // Radius filter from user location
        if (filters.radiusKm > 0 && userLocation && userLocation.status === 'located') {
          if (!tx.distanceFromUserMeters || tx.distanceFromUserMeters > filters.radiusKm * 1000) {
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
  }, [transactions, filters, userLocation]);

  // Plan purchase for specific unit
  const handleSelectForPlanner = (property: PropertyTransaction) => {
    setPlannerProperty(property);
    setActiveTab('planner');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
