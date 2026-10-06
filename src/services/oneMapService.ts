import { OneMapRouteResult } from '../types/property';
import { calculateDistanceMeters } from '../utils/propertyMath';

const ONEMAP_STORAGE_KEY = 'onemap_api_token';

export function getStoredOneMapToken(): string {
  try {
    return localStorage.getItem(ONEMAP_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredOneMapToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(ONEMAP_STORAGE_KEY, token.trim());
    } else {
      localStorage.removeItem(ONEMAP_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Could not save OneMap token in localStorage:', err);
  }
}

export interface OneMapSearchResult {
  searchVal: string;
  blockNo: string;
  roadName: string;
  building: string;
  address: string;
  postal: string;
  lat: number;
  lng: number;
}

export async function searchOneMap(
  query: string,
  token?: string
): Promise<OneMapSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
    query.trim()
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  const headers: HeadersInit = {
    'Accept': 'application/json'
  };

  const activeToken = token || getStoredOneMapToken();
  if (activeToken) {
    headers['Authorization'] = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`OneMap search returned ${res.status}`);
    }
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: Record<string, string>) => ({
      searchVal: item.SEARCHVAL || item.BUILDING || item.ROAD_NAME,
      blockNo: item.BLK_NO || '',
      roadName: item.ROAD_NAME || '',
      building: item.BUILDING || '',
      address: item.ADDRESS || '',
      postal: item.POSTAL || '',
      lat: parseFloat(item.LATITUDE),
      lng: parseFloat(item.LONGITUDE)
    })).filter((item: OneMapSearchResult) => !isNaN(item.lat) && !isNaN(item.lng));
  } catch (err) {
    console.error('OneMap search error:', err);
    return [];
  }
}

export interface ReverseGeocodeResult {
  formatted: string;
  building?: string;
  block?: string;
  road?: string;
  postal?: string;
  subzone?: string;
  provider: 'OneMap' | 'Nominatim_Fallback';
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  token?: string
): Promise<ReverseGeocodeResult> {
  const activeToken = token || getStoredOneMapToken();

  // Try OneMap official reverse geocode if token provided
  if (activeToken) {
    try {
      const url = `https://www.onemap.gov.sg/api/public/revgeocode?location=${lat},${lng}&buffer=50&addressType=All`;
      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.GeocodeInfo && data.GeocodeInfo.length > 0) {
          const first = data.GeocodeInfo[0];
          const block = first.BLOCK || first.BLK_NO || '';
          const road = first.ROAD || first.ROAD_NAME || '';
          const building = first.BUILDING || first.BUILDING_NAME || '';
          const postal = first.POSTALCODE || first.POSTAL || '';

          const parts = [
            building !== 'NIL' ? building : '',
            block && block !== 'NIL' ? `Blk ${block}` : '',
            road !== 'NIL' ? road : '',
            postal && postal !== 'NIL' ? `Singapore ${postal}` : ''
          ].filter(Boolean);

          return {
            formatted: parts.join(', ') || `Singapore (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            building: building !== 'NIL' ? building : undefined,
            block: block !== 'NIL' ? block : undefined,
            road: road !== 'NIL' ? road : undefined,
            postal: postal !== 'NIL' ? postal : undefined,
            provider: 'OneMap'
          };
        }
      }
    } catch (err) {
      console.warn('OneMap revgeocode failed, falling back to OSM Nominatim:', err);
    }
  }

  // Graceful fallback geocoder using OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.residential || addr.neighbourhood || '';
      const suburb = addr.suburb || addr.city_district || addr.quarter || '';
      const postal = addr.postcode || '';

      const parts = [
        addr.building || addr.amenity,
        road,
        suburb,
        postal ? `Singapore ${postal}` : 'Singapore'
      ].filter(Boolean);

      return {
        formatted: parts.join(', ') || `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        road,
        postal,
        subzone: suburb,
        provider: 'Nominatim_Fallback'
      };
    }
  } catch (err) {
    console.warn('Nominatim fallback also failed:', err);
  }

  return {
    formatted: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    provider: 'Nominatim_Fallback'
  };
}

// Decode polyline encoded string often returned by routing APIs
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export async function fetchOneMapRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  routeType: 'walk' | 'drive' | 'cycle' | 'pt' = 'walk',
  token?: string
): Promise<OneMapRouteResult> {
  const activeToken = token || getStoredOneMapToken();
  const directDistanceMeters = calculateDistanceMeters(startLat, startLng, endLat, endLng);

  if (activeToken) {
    try {
      const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=${routeType}`;
      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        let geom: [number, number][] = [];

        if (data.route_geometry) {
          geom = decodePolyline(data.route_geometry);
        } else if (data.route_points && Array.isArray(data.route_points)) {
          geom = data.route_points.map((p: { lat: number; lng: number } | [number, number]) =>
            Array.isArray(p) ? p : [p.lat, p.lng]
          );
        }

        const totalDist = data.route_summary?.total_distance || directDistanceMeters;
        const totalTime = data.route_summary?.total_time || Math.round(totalDist / (routeType === 'walk' ? 1.4 : 8.3));

        return {
          routeGeometry: geom.length > 0 ? geom : [[startLat, startLng], [endLat, endLng]],
          totalDistanceMeters: totalDist,
          totalTimeSeconds: totalTime,
          routeType,
          directions: data.route_instructions?.map((inst: { instruction: string }) => inst.instruction) || [],
          status: 'success'
        };
      }
    } catch (err) {
      console.warn('OneMap routing API call failed, providing direct fallback path:', err);
    }
  }

  // Graceful synthetic path when token not provided or unavailable
  // Walking speed ~ 4.8 km/h = 1.33 m/s, Driving ~ 30 km/h = 8.33 m/s
  const speed = routeType === 'walk' ? 1.33 : routeType === 'cycle' ? 4.0 : 8.33;
  const estimatedSeconds = Math.round(directDistanceMeters / speed);

  return {
    routeGeometry: [
      [startLat, startLng],
      // slight midpoint bend to simulate road grid
      [(startLat + endLat) / 2 + 0.0005, (startLng + endLng) / 2 - 0.0005],
      [endLat, endLng]
    ],
    totalDistanceMeters: directDistanceMeters,
    totalTimeSeconds: estimatedSeconds,
    routeType,
    status: 'success'
  };
}

export async function verifyOneMapToken(token: string): Promise<{ valid: boolean; message: string }> {
  if (!token || !token.trim()) {
    return { valid: false, message: 'Token cannot be empty' };
  }

  const clean = token.trim();
  const authHeader = clean.startsWith('Bearer ') ? clean : `Bearer ${clean}`;

  try {
    const testUrl = 'https://www.onemap.gov.sg/api/public/revgeocode?location=1.3000,103.8500&buffer=40&addressType=All';
    const res = await fetch(testUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (res.status === 200) {
      return { valid: true, message: 'OneMap token verified successfully!' };
    } else if (res.status === 401 || res.status === 403) {
      return { valid: false, message: 'Invalid or expired OneMap API Token (HTTP 401/403).' };
    } else {
      return { valid: false, message: `OneMap API responded with status ${res.status}.` };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { valid: false, message: `Connection test error: ${errorMsg}` };
  }
}
