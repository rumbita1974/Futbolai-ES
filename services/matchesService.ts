// services/matchesservice.ts - FINAL FIXED VERSION
/**
 * REAL DATA MATCHES SERVICE
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
    const response = await fetch(
      `/api/football-data?endpoint=/competitions/${competitionId}/matches?status=${matchStatus}&limit=${limit}`,
      { signal: AbortSignal.timeout(8000) }
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (data.fallback || !data.matches) {
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
    return matches;
    
  } catch (error) {
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

// 1. Recent results functions (unchanged)
export const getLatestResults = async (limit: number = 100): Promise<MatchResult[]> => {
  const cacheKey = `latest_${limit}`;
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data.slice(0, limit);
  
  const allMatches: MatchResult[] = [];
  const competitions = ['PD', 'PL', 'SA', 'BL1', 'FL1', 'CL'];
  
  for (const compId of competitions) {
    const matches = await fetchFromFootballData(compId, 'FINISHED', 20);
    if (matches.length > 0) {
      allMatches.push(...matches);
    }
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
  
  const allMatches = await getLatestResults(150);
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

// 2. Upcoming matches functions
export const getUpcomingMatches = async (days: number = 30): Promise<MatchResult[]> => {
  const cacheKey = `upcoming_flat_${days}`;
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  const allMatches: MatchResult[] = [];
  const competitions = ['PD', 'PL', 'SA', 'BL1', 'FL1', 'CL'];
  
  for (const compId of competitions) {
    const matches = await fetchFromFootballData(compId, 'SCHEDULED', 15);
    if (matches.length > 0) {
      allMatches.push(...matches);
    }
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

// 3. NEW FUNCTION: Get upcoming matches GROUPED by competition (ONE BIG TITLE PER COMPETITION)
export const getUpcomingMatchesGrouped = async (days: number = 7): Promise<LeagueGroupedMatches> => {
  const cacheKey = `upcoming_grouped_${days}`;
  const cached = getCachedData<LeagueGroupedMatches>(cacheKey);
  if (cached) return cached.data;
  
  const upcomingMatches = await getUpcomingMatches(days);
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
  
  // Sort matches within each group
  Object.values(grouped).forEach(group => {
    group.matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
  
  setCachedData(cacheKey, grouped);
  return grouped;
};

// 4. Keep old function for compatibility
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
    description: 'Interesting football trivia.',
    category: 'trivia',
    _source: 'static'
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
  getUpcomingMatchesGrouped, // NEW: This gives ONE BIG TITLE PER COMPETITION
  getUpcomingMatchesByWeek,
  getDailyFootballFact,
  fetchTransferNews,
  fetchLeagueTopScorers,
  getGlobalLeagueInsights,
  getInternationalNews,
  clearMatchCache
};