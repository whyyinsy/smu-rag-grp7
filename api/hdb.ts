import { Router, Request, Response } from 'express';

const router = Router();

const DATA_GOV_RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const DATA_GOV_BASE_URL = 'https://data.gov.sg/api/action/datastore_search';

const SINGAPORE_TOWNS: Record<string, { lat: number; lng: number; district: string }> = {
  'TAMPINES': { lat: 1.3533, lng: 103.9442, district: 'D18' },
  'BEDOK': { lat: 1.3236, lng: 103.9273, district: 'D16' },
  'BISHAN': { lat: 1.3526, lng: 103.8352, district: 'D20' },
  'ANG MO KIO': { lat: 1.3691, lng: 103.8454, district: 'D20' },
  'QUEENSTOWN': { lat: 1.2942, lng: 103.8060, district: 'D03' },
  'BUKIT MERAH': { lat: 1.2819, lng: 103.8239, district: 'D03' },
  'TOA PAYOH': { lat: 1.3343, lng: 103.8563, district: 'D12' },
  'KALLANG/WHAMPOA': { lat: 1.3100, lng: 103.8651, district: 'D12' },
  'GEYLANG': { lat: 1.3201, lng: 103.8918, district: 'D14' },
  'MARINE PARADE': { lat: 1.3020, lng: 103.9073, district: 'D15' },
  'CENTRAL AREA': { lat: 1.2834, lng: 103.8507, district: 'D01' },
  'BUKIT TIMAH': { lat: 1.3294, lng: 103.8021, district: 'D10' },
  'CLEMENTI': { lat: 1.3162, lng: 103.7649, district: 'D05' },
  'JURONG EAST': { lat: 1.3329, lng: 103.7436, district: 'D22' },
  'JURONG WEST': { lat: 1.3404, lng: 103.7090, district: 'D22' },
  'BUKIT BATOK': { lat: 1.3590, lng: 103.7637, district: 'D23' },
  'BUKIT PANJANG': { lat: 1.3774, lng: 103.7719, district: 'D23' },
  'CHOA CHU KANG': { lat: 1.3840, lng: 103.7470, district: 'D23' },
  'WOODLANDS': { lat: 1.4382, lng: 103.7890, district: 'D25' },
  'SEMBAWANG': { lat: 1.4491, lng: 103.8185, district: 'D27' },
  'YISHUN': { lat: 1.4304, lng: 103.8354, district: 'D27' },
  'SENGKANG': { lat: 1.3917, lng: 103.8955, district: 'D19' },
  'PUNGGOL': { lat: 1.4052, lng: 103.9023, district: 'D19' },
  'HOUGANG': { lat: 1.3712, lng: 103.8915, district: 'D19' },
  'SERANGOON': { lat: 1.3554, lng: 103.8679, district: 'D19' },
  'PASIR RIS': { lat: 1.3721, lng: 103.9474, district: 'D18' }
};

function getBlockOffset(block: string, street: string) {
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

// GET /api/hdb/transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { town, flat_type, limit = '30', sort = 'month desc', q } = req.query;

    const url = new URL(DATA_GOV_BASE_URL);
    url.searchParams.set('resource_id', DATA_GOV_RESOURCE_ID);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sort', String(sort));

    const filters: Record<string, string> = {};
    if (town && typeof town === 'string' && town !== 'ALL') {
      filters.town = town.toUpperCase();
    }
    if (flat_type && typeof flat_type === 'string' && flat_type !== 'ALL') {
      filters.flat_type = flat_type.toUpperCase();
    }

    if (Object.keys(filters).length > 0) {
      url.searchParams.set('filters', JSON.stringify(filters));
    }

    if (q && typeof q === 'string' && q.trim()) {
      url.searchParams.set('q', q.trim());
    }

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Data.gov.sg API returned HTTP ${response.status}`
      });
    }

    const data = await response.json();
    if (!data.success || !data.result) {
      return res.status(502).json({ success: false, error: 'Data.gov.sg datastore error' });
    }

    const transactions = data.result.records.map((rec: any) => {
      const townUpper = (rec.town || '').toUpperCase();
      const townMeta = SINGAPORE_TOWNS[townUpper] || {
        lat: 1.3521,
        lng: 103.8198,
        district: 'D00'
      };

      const offset = getBlockOffset(rec.block || '', rec.street_name || '');
      const lat = Number((townMeta.lat + offset.dLat).toFixed(5));
      const lng = Number((townMeta.lng + offset.dLng).toFixed(5));

      const price = Number(rec.resale_price) || 0;
      const sqm = Number(rec.floor_area_sqm) || 0;
      const sqft = Math.round(sqm * 10.7639);
      const psf = sqft > 0 ? Math.round(price / sqft) : 0;

      let remainingYears: number | undefined;
      let remainingMonths: number | undefined;
      const leaseMatch = (rec.remaining_lease || '').match(/(\d+)\s*years?(?:\s*(\d+)\s*months?)?/i);
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

    return res.json({
      success: true,
      total: data.result.total,
      limit: data.result.limit,
      transactions
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
