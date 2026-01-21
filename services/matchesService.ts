// services/matchesservice.ts - FIXED DATE FILTERING
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
  limit: number = 50
): Promise<MatchResult[]> => {
  await delayRequest();
  
  const cacheKey = `fd_${competitionId}_${matchStatus}_${limit}`;
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  try {
    console.log(`[FootballData] Fetching ${matchStatus} for ${competitionId}`);
    
    const response = await fetch(
      `/api/football-data?endpoint=/competitions/${competitionId}/matches?status=${matchStatus}&limit=${limit}`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) {
      console.warn(`[FootballData] ${competitionId} failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
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
    
  } catch (error) {
    console.error(`[FootballData] Error for ${competitionId}:`, error);
    return [];
  }
};

// HELPER FUNCTIONS
const getLeagueName = (leagueId: string, fallback: string): string => {
  const names: Record<string, string> = {
    'CL': 'UEFA Champions League',
    'PD': 'La Liga Primera División',
    'PL': 'Premier League',
    'SA': 'Serie A',
    'BL1': 'Bundesliga',
    'FL1': 'Ligue 1'
  };
  return names[leagueId] || fallback;
};

const getLeagueCountry = (leagueId: string): string => {
  const countries: Record<string, string> = {
    'CL': 'Europe',
    'PD': 'Spain',
    'PL': 'England',
    'SA': 'Italy',
    'BL1': 'Germany',
    'FL1': 'France'
  };
  return countries[leagueId] || 'International';
};

const getLeagueIdFromCompetition = (competitionName: string): string => {
  const compName = competitionName.toLowerCase();
  
  if (compName.includes('champions league') || compName.includes('uefa champions')) {
    return 'CL';
  } else if (compName.includes('la liga') || compName.includes('primera')) {
    return 'PD';
  } else if (compName.includes('premier')) {
    return 'PL';
  } else if (compName.includes('serie a')) {
    return 'SA';
  } else if (compName.includes('bundesliga')) {
    return 'BL1';
  } else if (compName.includes('ligue 1')) {
    return 'FL1';
  } else {
    return 'other';
  }
};

// Competition priority: Champions League first, then others
const COMPETITION_PRIORITY: Record<string, number> = {
  'CL': 1,  // Champions League FIRST
  'PD': 2,  // La Liga SECOND
  'PL': 3,  // Premier League
  'SA': 4,  // Serie A
  'BL1': 5, // Bundesliga
  'FL1': 6  // Ligue 1
};

// DATE UTILITY FUNCTIONS
const getCurrentWeekDates = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  // Get previous Monday (for Recent Results: Monday to Today)
  const previousMonday = new Date(now);
  previousMonday.setDate(now.getDate() + diffToMonday - 7); // Go back one week
  previousMonday.setHours(0, 0, 0, 0);
  
  // Get next Monday (for Upcoming Matches: Today to next Monday)
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + diffToMonday + 7); // Go forward one week
  nextMonday.setHours(0, 0, 0, 0);
  
  return {
    previousMonday, // For Recent Results: previous Monday to today
    nextMonday      // For Upcoming Matches: today to next Monday
  };
};

// Filter matches for RECENT RESULTS (previous Monday to today)
const filterMatchesForRecentResults = (matches: MatchResult[]): MatchResult[] => {
  const { previousMonday } = getCurrentWeekDates();
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  return matches.filter(match => {
    const matchDate = new Date(match.date);
    return matchDate >= previousMonday && matchDate <= today;
  });
};

// Filter matches for UPCOMING MATCHES (today to next Monday)
const filterMatchesForUpcomingMatches = (matches: MatchResult[]): MatchResult[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const { nextMonday } = getCurrentWeekDates();
  
  return matches.filter(match => {
    const matchDate = new Date(match.date);
    return matchDate >= today && matchDate < nextMonday;
  });
};

// MAIN FUNCTIONS

// Get recent results (previous Monday to today)
export const getLatestResults = async (): Promise<MatchResult[]> => {
  const cacheKey = 'latest_results_current_week';
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Fetching recent results (previous Monday to today)...');
  
  const allMatches: MatchResult[] = [];
  // Champions League first, then other leagues
  const competitions = ['CL', 'PD', 'PL', 'SA', 'BL1', 'FL1'];
  
  for (const compId of competitions) {
    const matches = await fetchFromFootballData(compId, 'FINISHED', 50);
    if (matches.length > 0) {
      allMatches.push(...matches);
      console.log(`[Matches] Raw ${compId} matches: ${matches.length}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Filter for recent results (previous Monday to today)
  const recentMatches = filterMatchesForRecentResults(allMatches);
  
  // Sort by date (newest first)
  const sorted = recentMatches.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  console.log(`[Matches] Recent results (previous Monday to today): ${sorted.length} matches`);
  
  setCachedData(cacheKey, sorted);
  return sorted;
};

export const getLatestResultsByLeague = async (): Promise<LeagueGroupedMatches> => {
  const cacheKey = 'latest_by_league_current_week';
  const cached = getCachedData<LeagueGroupedMatches>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Grouping recent results by league...');
  
  const allMatches = await getLatestResults();
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
  
  // Sort by priority (Champions League first, then La Liga, etc.)
  const sortedGroups: LeagueGroupedMatches = {};
  const priorityOrder = Object.entries(COMPETITION_PRIORITY)
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => id);
  
  priorityOrder.forEach(leagueId => {
    if (grouped[leagueId]) {
      sortedGroups[leagueId] = grouped[leagueId];
      // Sort matches by date within each league (newest first)
      sortedGroups[leagueId].matches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  });
  
  console.log(`[Matches] Grouped into ${Object.keys(sortedGroups).length} leagues`);
  
  setCachedData(cacheKey, sortedGroups);
  return sortedGroups;
};

// UPCOMING MATCHES FUNCTIONS
export const getUpcomingMatches = async (): Promise<MatchResult[]> => {
  const cacheKey = 'upcoming_current_week';
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Fetching upcoming matches (today to next Monday)...');
  
  const allMatches: MatchResult[] = [];
  // Champions League first, then other leagues
  const competitions = ['CL', 'PD', 'PL', 'SA', 'BL1', 'FL1'];
  
  for (const compId of competitions) {
    const matches = await fetchFromFootballData(compId, 'SCHEDULED', 50);
    if (matches.length > 0) {
      allMatches.push(...matches);
      console.log(`[Matches] Raw upcoming ${compId} matches: ${matches.length}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Filter for upcoming matches (today to next Monday)
  const upcomingMatches = filterMatchesForUpcomingMatches(allMatches);
  
  // Sort by date (soonest first)
  const sorted = upcomingMatches.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  console.log(`[Matches] Upcoming matches (today to next Monday): ${sorted.length} matches`);
  
  setCachedData(cacheKey, sorted);
  return sorted;
};

export const getUpcomingMatchesGrouped = async (): Promise<LeagueGroupedMatches> => {
  const cacheKey = 'upcoming_grouped_current_week';
  const cached = getCachedData<LeagueGroupedMatches>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Grouping upcoming matches...');
  
  const upcomingMatches = await getUpcomingMatches();
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
  
  // Sort by priority (Champions League first, then La Liga, etc.)
  const sortedGroups: LeagueGroupedMatches = {};
  const priorityOrder = Object.entries(COMPETITION_PRIORITY)
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => id);
  
  priorityOrder.forEach(leagueId => {
    if (grouped[leagueId]) {
      sortedGroups[leagueId] = grouped[leagueId];
      // Sort matches by date within each league (soonest first)
      sortedGroups[leagueId].matches.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  });
  
  console.log(`[Matches] Upcoming matches grouped into ${Object.keys(sortedGroups).length} competitions`);
  
  setCachedData(cacheKey, sortedGroups);
  return sortedGroups;
};

// Keep old function for compatibility
export const getUpcomingMatchesByWeek = async (): Promise<MatchResult[]> => {
  return getUpcomingMatches();
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
    description: 'UEFA Champions League is the most prestigious club competition in European football.',
    category: 'champions-league',
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
  getUpcomingMatchesGrouped,
  getUpcomingMatchesByWeek,
  getDailyFootballFact,
  fetchTransferNews,
  fetchLeagueTopScorers,
  getGlobalLeagueInsights,
  getInternationalNews,
  clearMatchCache
};