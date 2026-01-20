// services/theSportsDbService.ts
/**
 * TheSportsDB Fallback Service
 * Free API with reliable football data
 * https://www.thesportsdb.com/api.php
 */

const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = '3'; // Public API key (free tier)

interface TheSportsDBMatch {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string;
  intAwayScore: string;
  dateEvent: string;
  strTime: string;
  strStatus: string;
  strLeague: string;
  strVenue: string;
  strCountry: string;
}

interface TheSportsDBResponse {
  events: TheSportsDBMatch[];
}

// League mapping for TheSportsDB
const LEAGUE_MAP: Record<string, { id: string; name: string; season: string }> = {
  'PD': { id: '4335', name: 'La Liga', season: '2024-2025' },
  'PL': { id: '4328', name: 'Premier League', season: '2024-2025' },
  'SA': { id: '4332', name: 'Serie A', season: '2024-2025' },
  'BL1': { id: '4331', name: 'Bundesliga', season: '2024-2025' },
  'FL1': { id: '4334', name: 'Ligue 1', season: '2024-2025' },
  'BSA': { id: '4371', name: 'Brasileirão', season: '2025' },
  'ARG': { id: '4443', name: 'Liga Profesional', season: '2025' },
  'MEX': { id: '4422', name: 'Liga MX', season: '2024-2025' },
  'COL': { id: '4451', name: 'Primera A', season: '2025' },
  'VEN': { id: '4453', name: 'Venezuelan Primera División', season: '2025' },
  'CHI': { id: '4438', name: 'Chilean Primera División', season: '2025' },
  'PER': { id: '4449', name: 'Peruvian Primera División', season: '2025' },
  'CL': { id: '4346', name: 'UEFA Champions League', season: '2024-2025' },
  'CLI': { id: '4472', name: 'Copa Libertadores', season: '2025' }
};

const fetchCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchMatchesFromTheSportsDB(
  competitionId: string,
  matchStatus: 'results' | 'upcoming' | 'live'
): Promise<any[]> {
  const cacheKey = `thesportsdb_${competitionId}_${matchStatus}`;
  const cached = fetchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[TheSportsDB] Cache hit for ${competitionId}`);
    return cached.data;
  }

  const league = LEAGUE_MAP[competitionId];
  if (!league) {
    console.warn(`[TheSportsDB] No league mapping for ${competitionId}`);
    return [];
  }

  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let url = '';
    
    if (matchStatus === 'results') {
      // Get past events (last 15 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      url = `${THESPORTSDB_BASE_URL}/${API_KEY}/eventsseason.php?id=${league.id}&s=${league.season}`;
    } else {
      // Get upcoming events (next 30 days)
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      url = `${THESPORTSDB_BASE_URL}/${API_KEY}/eventsseason.php?id=${league.id}&s=${league.season}`;
    }
    
    console.log(`[TheSportsDB] Fetching ${matchStatus} for ${league.name} (${league.id})`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FutbolAI/1.0'
      },
      next: { revalidate: 600 } // 10 minutes
    });

    if (!response.ok) {
      console.warn(`[TheSportsDB] API error ${response.status} for ${competitionId}`);
      return [];
    }

    const data: TheSportsDBResponse = await response.json();
    
    if (!data.events || !Array.isArray(data.events)) {
      console.log(`[TheSportsDB] No events for ${competitionId}`);
      return [];
    }
    
    // Filter based on status
    const now = new Date();
    const filteredEvents = data.events.filter(event => {
      const eventDate = new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}`);
      
      if (matchStatus === 'results') {
        return event.strStatus === 'Match Finished' || eventDate < now;
      } else {
        return event.strStatus !== 'Match Finished' && eventDate > now && eventDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    }).slice(0, 10); // Limit to 10 matches
    
    console.log(`[TheSportsDB] Found ${filteredEvents.length} ${matchStatus} matches for ${league.name}`);
    
    // Transform to our format
    const transformedMatches = filteredEvents.map(event => ({
      id: event.idEvent,
      homeTeam: {
        name: event.strHomeTeam,
        goals: parseInt(event.intHomeScore) || 0
      },
      awayTeam: {
        name: event.strAwayTeam,
        goals: parseInt(event.intAwayScore) || 0
      },
      date: `${event.dateEvent}T${event.strTime || '00:00:00'}`,
      status: event.strStatus === 'Match Finished' ? 'FINISHED' : 'SCHEDULED',
      competition: event.strLeague || league.name,
      venue: event.strVenue || 'TBA',
      _source: 'thesportsdb',
      _verified: true,
      _confidence: 'medium'
    }));
    
    fetchCache.set(cacheKey, { data: transformedMatches, timestamp: Date.now() });
    
    return transformedMatches;
    
  } catch (error) {
    console.error(`[TheSportsDB] Error for ${competitionId}:`, error);
    return [];
  }
}

// Get league table/standings (for top scorers fallback)
export async function fetchLeagueTableFromTheSportsDB(competitionId: string): Promise<any[]> {
  const league = LEAGUE_MAP[competitionId];
  if (!league) return [];
  
  try {
    const url = `${THESPORTSDB_BASE_URL}/${API_KEY}/lookuptable.php?l=${league.id}&s=${league.season}`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 } // 1 hour
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.table || [];
    }
  } catch (error) {
    console.warn(`[TheSportsDB] Table error for ${competitionId}:`, error);
  }
  
  return [];
}