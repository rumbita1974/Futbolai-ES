// services/matchesservice.ts - SHOW API ERROR WHEN NO KEY
/**
 * REAL DATA MATCHES SERVICE - NO FALLBACK
 */

// TYPES
export interface MatchResult {
  id: string;
  homeTeam: {
    name: string;
    goals: number;
  };
  awayTeam: {
    name: string;
    goals: number;
  };
  date: string;
  status: 'FINISHED' | 'SCHEDULED';
  competition: string;
  venue?: string;
  _source: 'football-data';
  _verified: boolean;
  _confidence: 'high' | 'medium' | 'low';
}

export interface LeagueGroupedMatches {
  [leagueId: string]: {
    leagueName: string;
    country: string;
    matches: MatchResult[];
    totalMatches: number;
  };
}

// CACHING
const CACHE_PREFIX = 'real_matches_';
const CACHE_TTL = 15 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const getCachedData = <T>(key: string): CacheItem<T> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    const cacheItem: CacheItem<T> = JSON.parse(item);
    if (Date.now() - cacheItem.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return cacheItem;
  } catch {
    return null;
  }
};

const setCachedData = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    const cacheItem: CacheItem<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
};

export const clearMatchCache = () => {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Cache clear error:', e);
  }
};

// API FETCHING
const REQUEST_DELAY = 150;
let lastRequestTime = 0;

const delayRequest = async () => {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLast));
  }
  lastRequestTime = Date.now();
};

const fetchFromFootballData = async (
  competitionId: string, 
  matchStatus: 'FINISHED' | 'SCHEDULED',
  limit: number = 25
): Promise<MatchResult[]> => {
  await delayRequest();
  
  const cacheKey = `fd_${competitionId}_${matchStatus}_${limit}`;
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  try {
    console.log(`[FootballData] Fetching ${matchStatus} for ${competitionId}`);
    
    const response = await fetch(
      `/api/football-data?endpoint=/competitions/${competitionId}/matches?status=${matchStatus}&limit=${limit}`,
      { 
        signal: AbortSignal.timeout(10000),
        cache: 'no-store' // Don't cache on server
      }
    );
    
    if (!response.ok) {
      console.error(`[FootballData] ${competitionId} failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // Check if API key is missing (based on your API route response)
    if (data.fallback && data.error === 'API key not configured') {
      console.error(`[FootballData] API key not configured for ${competitionId}`);
      throw new Error('API_KEY_MISSING');
    }
    
    if (data.fallback || !data.matches) {
      console.warn(`[FootballData] ${competitionId} returned fallback data`);
      return [];
    }
    
    const matches: MatchResult[] = (data.matches || []).map((match: any) => ({
      id: match.id.toString(),
      homeTeam: {
        name: match.homeTeam?.name || 'TBD',
        goals: match.score?.fullTime?.home ?? 0
      },
      awayTeam: {
        name: match.awayTeam?.name || 'TBD',
        goals: match.score?.fullTime?.away ?? 0
      },
      date: match.utcDate,
      status: match.status === 'FINISHED' ? 'FINISHED' : 'SCHEDULED',
      competition: match.competition?.name || competitionId,
      venue: match.venue,
      _source: 'football-data',
      _verified: true,
      _confidence: 'high'
    }));
    
    setCachedData(cacheKey, matches);
    console.log(`[FootballData] Got ${matches.length} matches for ${competitionId}`);
    
    return matches;
    
  } catch (error: any) {
    if (error.message === 'API_KEY_MISSING') {
      throw error; // Re-throw so parent function can handle it
    }
    console.error(`[FootballData] Error for ${competitionId}:`, error);
    return [];
  }
};

// HELPER FUNCTIONS
const getLeagueName = (leagueId: string, fallback: string): string => {
  const names: Record<string, string> = {
    'PD': 'La Liga',
    'PL': 'Premier League',
    'SA': 'Serie A',
    'BL1': 'Bundesliga',
    'FL1': 'Ligue 1',
    'CL': 'Champions League'
  };
  return names[leagueId] || fallback;
};

const getLeagueCountry = (leagueId: string): string => {
  const countries: Record<string, string> = {
    'PD': 'Spain',
    'PL': 'England',
    'SA': 'Italy',
    'BL1': 'Germany',
    'FL1': 'France',
    'CL': 'Europe'
  };
  return countries[leagueId] || 'International';
};

const getLeagueIdFromCompetition = (competitionName: string): string => {
  const compName = competitionName.toLowerCase();
  
  if (compName.includes('la liga') || compName.includes('primera')) {
    return 'PD';
  } else if (compName.includes('premier')) {
    return 'PL';
  } else if (compName.includes('serie a')) {
    return 'SA';
  } else if (compName.includes('bundesliga')) {
    return 'BL1';
  } else if (compName.includes('ligue 1')) {
    return 'FL1';
  } else if (compName.includes('champions league')) {
    return 'CL';
  } else {
    return 'other';
  }
};

// MAIN FUNCTIONS

export const getLatestResults = async (limit: number = 100): Promise<MatchResult[]> => {
  const cacheKey = `latest_${limit}`;
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data.slice(0, limit);
  
  console.log('[Matches] Fetching latest results...');
  
  const allMatches: MatchResult[] = [];
  const competitions = ['PD', 'PL', 'SA', 'BL1', 'FL1', 'CL'];
  
  for (const compId of competitions) {
    try {
      const matches = await fetchFromFootballData(compId, 'FINISHED', 20);
      if (matches.length > 0) {
        allMatches.push(...matches);
      }
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') {
        throw new Error('API_KEY_MISSING');
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const sorted = allMatches
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
  
  setCachedData(cacheKey, sorted);
  return sorted;
};

export const getLatestResultsByLeague = async (): Promise<LeagueGroupedMatches> => {
  const cacheKey = 'latest_by_league';
  const cached = getCachedData<LeagueGroupedMatches>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Grouping results by league...');
  
  let allMatches: MatchResult[] = [];
  try {
    allMatches = await getLatestResults(150);
  } catch (error: any) {
    if (error.message === 'API_KEY_MISSING') {
      throw error;
    }
  }
  
  const grouped: LeagueGroupedMatches = {};
  
  allMatches.forEach(match => {
    const leagueId = getLeagueIdFromCompetition(match.competition);
    
    if (!grouped[leagueId]) {
      grouped[leagueId] = {
        leagueName: getLeagueName(leagueId, match.competition),
        country: getLeagueCountry(leagueId),
        matches: [],
        totalMatches: 0
      };
    }
    
    grouped[leagueId].matches.push(match);
    grouped[leagueId].totalMatches++;
  });
  
  Object.values(grouped).forEach(group => {
    group.matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  
  setCachedData(cacheKey, grouped);
  return grouped;
};

export const getUpcomingMatches = async (days: number = 30): Promise<MatchResult[]> => {
  const cacheKey = `upcoming_flat_${days}`;
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Fetching upcoming matches...');
  
  const allMatches: MatchResult[] = [];
  const competitions = ['PD', 'PL', 'SA', 'BL1', 'FL1', 'CL'];
  
  for (const compId of competitions) {
    try {
      const matches = await fetchFromFootballData(compId, 'SCHEDULED', 15);
      if (matches.length > 0) {
        allMatches.push(...matches);
      }
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') {
        throw new Error('API_KEY_MISSING');
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const now = new Date();
  const deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  const filtered = allMatches
    .filter(m => {
      const matchDate = new Date(m.date);
      return matchDate > now && matchDate <= deadline;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  setCachedData(cacheKey, filtered);
  return filtered;
};

export const getUpcomingMatchesGrouped = async (days: number = 7): Promise<LeagueGroupedMatches> => {
  const cacheKey = `upcoming_grouped_${days}`;
  const cached = getCachedData<LeagueGroupedMatches>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Grouping upcoming matches...');
  
  let upcomingMatches: MatchResult[] = [];
  try {
    upcomingMatches = await getUpcomingMatches(days);
  } catch (error: any) {
    if (error.message === 'API_KEY_MISSING') {
      throw error;
    }
  }
  
  const grouped: LeagueGroupedMatches = {};
  
  upcomingMatches.forEach(match => {
    const leagueId = getLeagueIdFromCompetition(match.competition);
    
    if (!grouped[leagueId]) {
      grouped[leagueId] = {
        leagueName: getLeagueName(leagueId, match.competition),
        country: getLeagueCountry(leagueId),
        matches: [],
        totalMatches: 0
      };
    }
    
    grouped[leagueId].matches.push(match);
    grouped[leagueId].totalMatches++;
  });
  
  Object.values(grouped).forEach(group => {
    group.matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
  
  setCachedData(cacheKey, grouped);
  return grouped;
};

export const getUpcomingMatchesByWeek = async (): Promise<MatchResult[]> => {
  return getUpcomingMatches(7);
};

// Other exports
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export const getDailyFootballFact = async (): Promise<any> => {
  return {
    title: 'Football Fact',
    description: 'Football Data API key is required to load live matches.',
    category: 'info',
    _source: 'api'
  };
};

export const fetchTransferNews = async (): Promise<any[]> => [];
export const fetchLeagueTopScorers = async (): Promise<any[]> => [];
export const getGlobalLeagueInsights = async (): Promise<any[]> => [];
export const getInternationalNews = async (): Promise<any[]> => [];

export default {
  getLatestResults,
  getLatestResultsByLeague,
  getUpcomingMatches,
  getUpcomingMatchesGrouped,
  getUpcomingMatchesByWeek,
  getDailyFootballFact,
  fetchTransferNews,
  fetchLeagueTopScorers,
  getGlobalLeagueInsights,
  getInternationalNews,
  clearMatchCache
};