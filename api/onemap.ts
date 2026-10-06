import { Router, Request, Response } from 'express';

const router = Router();

function getOneMapAuthHeader(req: Request): string | undefined {
  // 1. Check server environment variable first (secure, non-hardcoded)
  const envToken = process.env.ONEMAP_API_TOKEN;
  if (envToken && envToken.trim()) {
    const clean = envToken.trim();
    return clean.startsWith('Bearer ') ? clean : `Bearer ${clean}`;
  }

  // 2. Check incoming client authorization header if forwarded
  const incomingAuth = req.headers.authorization;
  if (incomingAuth) {
    return incomingAuth.startsWith('Bearer ') ? incomingAuth : `Bearer ${incomingAuth}`;
  }

  return undefined;
}

// GET /api/onemap/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { searchVal } = req.query;
    if (!searchVal || typeof searchVal !== 'string') {
      return res.status(400).json({ error: 'Missing searchVal query parameter' });
    }

    const authHeader = getOneMapAuthHeader(req);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
      searchVal.trim()
    )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(url, { headers });
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/onemap/revgeocode
router.get('/revgeocode', async (req: Request, res: Response) => {
  try {
    const { location, buffer = '50', addressType = 'All' } = req.query;
    if (!location || typeof location !== 'string') {
      return res.status(400).json({ error: 'Missing location query parameter' });
    }

    const authHeader = getOneMapAuthHeader(req);
    const url = `https://www.onemap.gov.sg/api/public/revgeocode?location=${encodeURIComponent(
      location
    )}&buffer=${buffer}&addressType=${addressType}`;

    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(url, { headers });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/onemap/route
router.get('/route', async (req: Request, res: Response) => {
  try {
    const { start, end, routeType = 'walk' } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Missing start or end coordinates' });
    }

    const authHeader = getOneMapAuthHeader(req);
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${start}&end=${end}&routeType=${routeType}`;

    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(url, { headers });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
