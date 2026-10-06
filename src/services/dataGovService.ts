import { PropertyTransaction } from '../types/property';
import { SINGAPORE_TOWNS } from '../data/townCoordinates';
import { sqmToSqft } from '../utils/propertyMath';

const DATA_GOV_RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const DATA_GOV_ENDPOINT = 'https://data.gov.sg/api/action/datastore_search';

export interface DataGovQueryOptions {
  town?: string;
  flatType?: string;
  limit?: number;
  sort?: string;
  q?: string;
}

export interface DataGovResponse {
  success: boolean;
  result?: {
    resource_id: string;
    total: number;
    limit: number;
    records: Array<{
      _id: number;
      month: string;
      town: string;
      flat_type: string;
      block: string;
      street_name: string;
      storey_range: string;
      floor_area_sqm: string;
      flat_model: string;
      lease_commence_date: string;
      remaining_lease: string;
      resale_price: string;
    }>;
  };
  error?: string;
}

// Pseudo-hash string to deterministic pseudo-random offset within estate (~400m)
function getBlockOffset(block: string, street: string): { dLat: number; dLng: number } {
  let hash = 0;
  const str = block + street;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const norm1 = ((Math.abs(hash) % 1000) / 1000) - 0.5;
  const norm2 = (((Math.abs(hash >> 3)) % 1000) / 1000) - 0.5;
  return {
    dLat: norm1 * 0.009,
    dLng: norm2 * 0.009
  };
}

export async function fetchHdbTransactions(options: DataGovQueryOptions = {}): Promise<{
  transactions: PropertyTransaction[];
  totalRecords: number;
  rawResponse?: DataGovResponse;
}> {
  const { town, flatType, limit = 25, sort = 'month desc', q } = options;

  // 1. Try our backend serverless route first
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('sort', sort);
    if (town && town !== 'ALL') params.set('town', town);
    if (flatType && flatType !== 'ALL') params.set('flat_type', flatType);
    if (q && q.trim()) params.set('q', q.trim());

    const backendRes = await fetch(`/api/hdb/transactions?${params.toString()}`);
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.success && Array.isArray(data.transactions)) {
        return {
          transactions: data.transactions,
          totalRecords: data.total || data.transactions.length
        };
      }
    }
  } catch {
    // If backend route is unreachable in static preview, fallback to direct fetch below
  }

  // 2. Direct data.gov.sg datastore fetch fallback
  const url = new URL(DATA_GOV_ENDPOINT);
  url.searchParams.set('resource_id', DATA_GOV_RESOURCE_ID);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sort', sort);

  const filtersObj: Record<string, string> = {};
  if (town && town !== 'ALL') {
    filtersObj.town = town.toUpperCase();
  }
  if (flatType && flatType !== 'ALL') {
    filtersObj.flat_type = flatType.toUpperCase();
  }

  if (Object.keys(filtersObj).length > 0) {
    url.searchParams.set('filters', JSON.stringify(filtersObj));
  }

  if (q && q.trim()) {
    url.searchParams.set('q', q.trim());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`Data.gov.sg API returned status ${res.status}: ${res.statusText}`);
  }

  const data: DataGovResponse = await res.json();
  if (!data.success || !data.result) {
    throw new Error('Failed to retrieve records from data.gov.sg datastore');
  }

  const transactions: PropertyTransaction[] = data.result.records.map((rec) => {
    const townUpper = rec.town.toUpperCase();
    const townMeta = SINGAPORE_TOWNS[townUpper] || {
      name: rec.town,
      region: 'OCR',
      district: 'D00',
      lat: 1.3521,
      lng: 103.8198
    };

    const offset = getBlockOffset(rec.block, rec.street_name);
    const lat = Number((townMeta.lat + offset.dLat).toFixed(5));
    const lng = Number((townMeta.lng + offset.dLng).toFixed(5));

    const price = Number(rec.resale_price) || 0;
    const sqm = Number(rec.floor_area_sqm) || 0;
    const sqft = sqmToSqft(sqm);
    const psf = sqft > 0 ? Math.round(price / sqft) : 0;

    let remainingYears: number | undefined;
    let remainingMonths: number | undefined;
    const leaseMatch = rec.remaining_lease.match(/(\d+)\s*years?(?:\s*(\d+)\s*months?)?/i);
    if (leaseMatch) {
      remainingYears = parseInt(leaseMatch[1], 10);
      remainingMonths = leaseMatch[2] ? parseInt(leaseMatch[2], 10) : 0;
    }

    return {
      id: `gov-hdb-${rec._id}`,
      type: 'HDB',
      title: `Blk ${rec.block} ${rec.street_name}`,
      projectOrModel: `${rec.flat_model} (${rec.flat_type})`,
      town: rec.town,
      district: townMeta.district,
      street: rec.street_name,
      block: rec.block,
      unitRange: rec.storey_range,
      price,
      floorAreaSqm: sqm,
      floorAreaSqft: sqft,
      psf,
      transactionDate: rec.month,
      tenureType: '99-year',
      tenureStartYear: Number(rec.lease_commence_date) || undefined,
      remainingLeaseYears: remainingYears,
      remainingLeaseMonths: remainingMonths,
      remainingLeaseDisplay: rec.remaining_lease || `${rec.lease_commence_date} (99-yr)`,
      flatTypeOrBeds: rec.flat_type,
      coordinates: { lat, lng },
      source: 'data.gov.sg'
    };
  });

  return {
    transactions,
    totalRecords: data.result.total,
    rawResponse: data
  };
}
