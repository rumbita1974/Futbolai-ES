// app/api/football-data/route.ts
import { NextResponse } from 'next/server';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

// Cache for rate limiting
const requestCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Competition mapping to ensure correct IDs
const COMPETITION_MAP: Record<string, { id: string; name: string; fallbackId?: string }> = {
  'PD': { id: 'PD', name: 'La Liga' },
  'PL': { id: 'PL', name: 'Premier League' },
  'SA': { id: 'SA', name: 'Serie A' },
  'BL1': { id: 'BL1', name: 'Bundesliga' },
  'FL1': { id: 'FL1', name: 'Ligue 1' },
  'BSA': { id: 'BSA', name: 'Brasileirão Série A' },
  'ARG': { id: 'AR1', name: 'Liga Profesional', fallbackId: 'ARG' },
  'MEX': { id: 'MEX', name: 'Liga MX' },
  'COL': { id: 'COL', name: 'Primera A', fallbackId: 'CO1' },
  'VEN': { id: 'VEN', name: 'Primera División', fallbackId: 'VE1' },
  'CHI': { id: 'CHI', name: 'Primera División', fallbackId: 'CL1' },
  'PER': { id: 'PER', name: 'Liga 1', fallbackId: 'PE1' },
  'CL': { id: 'CL', name: 'UEFA Champions League' },
  'CLI': { id: 'CLI', name: 'Copa Libertadores' }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '';
  
  // Extract competition ID from endpoint
  const match = endpoint.match(/\/competitions\/([A-Z0-9]+)\//);
  const competitionCode = match ? match[1] : null;
  
  if (!competitionCode) {
    return NextResponse.json(
      { error: 'Invalid endpoint format' },
      { status: 400 }
    );
  }

  // Check cache first
  const cacheKey = `${competitionCode}_${endpoint}`;
  const cached = requestCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[API] Cache hit for ${competitionCode}`);
    return NextResponse.json(cached.data);
  }

  // Check if API key is available
  if (!FOOTBALL_DATA_API_KEY) {
    console.warn(`[API] No Football Data API key configured for ${competitionCode}`);
    
    // Return fallback response indicating no API key
    return NextResponse.json({
      error: 'API key not configured',
      fallback: true,
      competition: COMPETITION_MAP[competitionCode]?.name || competitionCode,
      matches: [],
      message: 'Please configure FOOTBALL_DATA_API_KEY in .env.local'
    }, { status: 200 }); // Return 200 so client can handle gracefully
  }

  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const url = `${FOOTBALL_DATA_BASE_URL}${endpoint}`;
    console.log(`[API] Fetching: ${competitionCode} from ${FOOTBALL_DATA_BASE_URL}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_API_KEY,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 } // 5 minutes cache
    });

    if (!response.ok) {
      console.warn(`[API] Football Data API error ${response.status} for ${competitionCode}`);
      
      // If 404 or 403, try fallback competition ID for Latin American leagues
      if ((response.status === 404 || response.status === 403) && COMPETITION_MAP[competitionCode]?.fallbackId) {
        const fallbackId = COMPETITION_MAP[competitionCode].fallbackId;
        const fallbackEndpoint = endpoint.replace(competitionCode, fallbackId);
        const fallbackUrl = `${FOOTBALL_DATA_BASE_URL}${fallbackEndpoint}`;
        
        console.log(`[API] Trying fallback ID ${fallbackId} for ${competitionCode}`);
        
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'X-Auth-Token': FOOTBALL_DATA_API_KEY,
            'Content-Type': 'application/json',
          }
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          requestCache.set(cacheKey, { data, timestamp: Date.now() });
          return NextResponse.json(data);
        }
      }
      
      // Return structured error for client to handle
      return NextResponse.json({
        error: `API returned ${response.status}`,
        fallback: true,
        competition: COMPETITION_MAP[competitionCode]?.name || competitionCode,
        matches: []
      }, { status: 200 });
    }

    const data = await response.json();
    
    // Cache successful response
    requestCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error(`[API] Network error for ${competitionCode}:`, error);
    
    return NextResponse.json({
      error: 'Network error',
      fallback: true,
      competition: COMPETITION_MAP[competitionCode]?.name || competitionCode,
      matches: [],
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}