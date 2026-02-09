// services/matchesService.ts - COMPLETE FIXED VERSION
'use client';

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

export interface FootballFunFact {
  title: string;
  description: string;
  category: string;
  _source: string;
}

// CACHING
const CACHE_PREFIX = 'real_matches_';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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
    'PD': 'La Liga',
    'PL': 'Premier League',
    'SA': 'Serie A',
    'BL1': 'Bundesliga',
    'FL1': 'Ligue 1',
    'CDR': 'Copa del Rey',
    'FAC': 'FA Cup',
    'ELC': 'Carabao Cup',
    'CI': 'Coppa Italia',
    'DFB': 'DFB-Pokal',
    'FRC': 'Coupe de France'
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
    'FL1': 'France',
    'CDR': 'Spain',
    'FAC': 'England',
    'ELC': 'England',
    'CI': 'Italy',
    'DFB': 'Germany',
    'FRC': 'France'
  };
  return countries[leagueId] || 'International';
};

const getLeagueIdFromCompetition = (competitionName: string): string => {
  const compName = competitionName.toLowerCase();
  
  if (compName.includes('champions league') || compName.includes('uefa champions')) {
    return 'CL';
  } else if (compName.includes('copa del rey')) {
    return 'CDR';
  } else if (compName.includes('la liga') || compName.includes('primera')) {
    return 'PD';
  } else if (compName.includes('premier')) {
    return 'PL';
  } else if (compName.includes('fa cup')) {
    return 'FAC';
  } else if (compName.includes('carabao') || compName.includes('league cup') || compName.includes('efl cup')) {
    return 'ELC';
  } else if (compName.includes('serie a')) {
    return 'SA';
  } else if (compName.includes('coppa italia')) {
    return 'CI';
  } else if (compName.includes('bundesliga')) {
    return 'BL1';
  } else if (compName.includes('dfb-pokal')) {
    return 'DFB';
  } else if (compName.includes('ligue 1')) {
    return 'FL1';
  } else if (compName.includes('coupe de france')) {
    return 'FRC';
  } else {
    return 'other';
  }
};

// DATE UTILITY FUNCTIONS
const getCurrentWeekDates = () => {
  const now = new Date();
  
  // For Recent Results: last 14 days (more lenient)
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);
  
  // For Upcoming Matches: next 7 days
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);
  
  return {
    recentFrom: twoWeeksAgo,
    recentTo: now,
    upcomingFrom: now,
    upcomingTo: nextWeek
  };
};

// Filter matches for RECENT RESULTS (last 14 days)
const filterMatchesForRecentResults = (matches: MatchResult[]): MatchResult[] => {
  const { recentFrom, recentTo } = getCurrentWeekDates();
  
  return matches.filter(match => {
    try {
      const matchDate = new Date(match.date);
      return matchDate >= recentFrom && matchDate <= recentTo;
    } catch {
      return false;
    }
  });
};

// Filter matches for UPCOMING MATCHES (next 7 days)
const filterMatchesForUpcomingMatches = (matches: MatchResult[]): MatchResult[] => {
  const { upcomingFrom, upcomingTo } = getCurrentWeekDates();
  
  return matches.filter(match => {
    try {
      const matchDate = new Date(match.date);
      return matchDate >= upcomingFrom && matchDate <= upcomingTo;
    } catch {
      return false;
    }
  });
};

// Get all competitions to fetch
const getAllCompetitions = (): string[] => {
  return [
    // Major European competitions
    'CL',   // Champions League
    
    // Spanish competitions
    'PD',   // La Liga
    'CDR',  // Copa del Rey
    
    // English competitions
    'PL',   // Premier League
    'FAC',  // FA Cup
    'ELC',  // Carabao Cup (League Cup)
    
    // Italian competitions
    'SA',   // Serie A
    'CI',   // Coppa Italia
    
    // German competitions
    'BL1',  // Bundesliga
    'DFB',  // DFB-Pokal
    
    // French competitions
    'FL1',  // Ligue 1
    'FRC'   // Coupe de France
  ];
};

// MAIN FUNCTIONS

// Get recent results (last 14 days)
export const getLatestResults = async (): Promise<MatchResult[]> => {
  const cacheKey = 'latest_results_last_14_days';
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Fetching recent results (last 14 days)...');
  
  const allMatches: MatchResult[] = [];
  const competitions = getAllCompetitions();
  
  for (const compId of competitions) {
    try {
      const matches = await fetchFromFootballData(compId, 'FINISHED', 50);
      if (matches.length > 0) {
        allMatches.push(...matches);
        console.log(`[Matches] Raw ${compId} matches: ${matches.length}`);
      }
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`[Matches] Failed to fetch ${compId}:`, error);
    }
  }
  
  // Filter for recent results (last 14 days)
  const recentMatches = filterMatchesForRecentResults(allMatches);
  
  // Sort by date (newest first)
  const sorted = recentMatches.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  console.log(`[Matches] Recent results (last 14 days): ${sorted.length} matches`);
  
  setCachedData(cacheKey, sorted);
  return sorted;
};

export const getLatestResultsByLeague = async (): Promise<LeagueGroupedMatches> => {
  const cacheKey = 'latest_by_league';
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
  
  // Sort by priority
  const sortedGroups: LeagueGroupedMatches = {};
  const priorityOrder = getAllCompetitions();
  
  priorityOrder.forEach(leagueId => {
    if (grouped[leagueId]) {
      sortedGroups[leagueId] = grouped[leagueId];
      // Sort matches by date within each league (newest first)
      sortedGroups[leagueId].matches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  });
  
  // Add any remaining leagues not in priority order
  Object.keys(grouped).forEach(leagueId => {
    if (!sortedGroups[leagueId]) {
      sortedGroups[leagueId] = grouped[leagueId];
      sortedGroups[leagueId].matches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  });
  
  console.log(`[Matches] Grouped into ${Object.keys(sortedGroups).length} competitions`);
  
  setCachedData(cacheKey, sortedGroups);
  return sortedGroups;
};

// UPCOMING MATCHES FUNCTIONS
export const getUpcomingMatches = async (): Promise<MatchResult[]> => {
  const cacheKey = 'upcoming_next_7_days';
  const cached = getCachedData<MatchResult[]>(cacheKey);
  if (cached) return cached.data;
  
  console.log('[Matches] Fetching upcoming matches (next 7 days)...');
  
  const allMatches: MatchResult[] = [];
  const competitions = getAllCompetitions();
  
  for (const compId of competitions) {
    try {
      const matches = await fetchFromFootballData(compId, 'SCHEDULED', 50);
      if (matches.length > 0) {
        allMatches.push(...matches);
        console.log(`[Matches] Raw upcoming ${compId} matches: ${matches.length}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`[Matches] Failed to fetch upcoming ${compId}:`, error);
    }
  }
  
  // Filter for upcoming matches (next 7 days)
  const upcomingMatches = filterMatchesForUpcomingMatches(allMatches);
  
  // Sort by date (soonest first)
  const sorted = upcomingMatches.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  console.log(`[Matches] Upcoming matches (next 7 days): ${sorted.length} matches`);
  
  setCachedData(cacheKey, sorted);
  return sorted;
};

export const getUpcomingMatchesGrouped = async (): Promise<LeagueGroupedMatches> => {
  const cacheKey = 'upcoming_grouped';
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
  
  // Sort by priority
  const sortedGroups: LeagueGroupedMatches = {};
  const priorityOrder = getAllCompetitions();
  
  priorityOrder.forEach(leagueId => {
    if (grouped[leagueId]) {
      sortedGroups[leagueId] = grouped[leagueId];
      // Sort matches by date within each league (soonest first)
      sortedGroups[leagueId].matches.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  });
  
  // Add any remaining leagues not in priority order
  Object.keys(grouped).forEach(leagueId => {
    if (!sortedGroups[leagueId]) {
      sortedGroups[leagueId] = grouped[leagueId];
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

// Groq import and fun fact function
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export const getDailyFootballFact = async (): Promise<FootballFunFact> => {
  const cacheKey = 'daily_football_fact';
  const cached = getCachedData<FootballFunFact>(cacheKey);
  if (cached) return cached.data;
  
  try {
    // If no API key or if we want to use static facts to avoid API issues
    if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      const staticFacts = [
        'The fastest hat-trick in Premier League history was scored by Sadio Mané in 2 minutes 56 seconds for Southampton against Aston Villa in 2015.',
        'Brazil has won the FIFA World Cup a record 5 times (1958, 1962, 1970, 1994, 2002).',
        'The first ever football World Cup was held in 1930 in Uruguay, and was won by the host nation.',
        'Lionel Messi holds the record for most Ballon d\'Or awards with 8 wins.',
        'Real Madrid has won the UEFA Champions League a record 14 times.',
        'The highest scoring game in football history was 149-0 in a Madagascar league match in 2002.',
        'The first football club in the world was Sheffield F.C., founded in 1857 in England.',
        'The fastest goal in World Cup history was scored by Hakan Şükür of Turkey in 10.89 seconds in 2002.',
        'The oldest football competition in the world is the FA Cup, first held in 1871-72.',
        'Pelé is the only player to have won three World Cups (1958, 1962, 1970).',
        'The shortest footballer in professional history was Marcin Garuch at 4 feet 4 inches (132 cm).',
        'The longest football match lasted 3 hours 23 minutes between Stockport and Doncaster in 1946.',
        'A football is made of 32 panels - 12 pentagons and 20 hexagons.',
        'The most expensive football transfer ever was Neymar\'s €222 million move from Barcelona to PSG in 2017.',
        'The most goals scored by a player in a single calendar year is 91 by Lionel Messi in 2012.'
      ];
      
      const randomFact = staticFacts[Math.floor(Math.random() * staticFacts.length)];
      
      const fact: FootballFunFact = {
        title: 'Football Fact of the Day',
        description: randomFact,
        category: 'history',
        _source: 'static'
      };
      
      setCachedData(cacheKey, fact);
      return fact;
    }
    
    // Try with a current model
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a football encyclopedia. Provide an interesting, verified football fact. Keep it under 200 characters. Include a category like 'history', 'records', 'players', or 'competitions'."
        },
        {
          role: "user",
          content: "Give me today's football fun fact. Make it interesting and true! Don't include any markdown or formatting, just plain text."
        }
      ],
      model: "llama-3.1-8b-instant", // Current working model
      temperature: 0.7,
      max_tokens: 150,
    });
    
    const factText = completion.choices[0]?.message?.content || "The first football World Cup was held in 1930 in Uruguay.";
    
    // Clean up the text (remove any markdown, extra spaces)
    const cleanFactText = factText
      .replace(/[*#_`]/g, '') // Remove markdown characters
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();
    
    const categories = ['history', 'records', 'players', 'competitions', 'stadia', 'tactics'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    const fact: FootballFunFact = {
      title: 'Football Fact of the Day',
      description: cleanFactText,
      category: randomCategory,
      _source: 'groq-ai'
    };
    
    setCachedData(cacheKey, fact);
    return fact;
    
  } catch (error) {
    console.error('Failed to fetch football fact:', error);
    
    // Fallback facts
    const fallbackFacts = [
      'The fastest hat-trick in Premier League history was scored by Sadio Mané in 2 minutes 56 seconds.',
      'Brazil has won the FIFA World Cup a record 5 times (1958, 1962, 1970, 1994, 2002).',
      'The first ever football World Cup was held in 1930 in Uruguay, and was won by the host nation.',
      'Lionel Messi holds the record for most Ballon d\'Or awards with 8 wins.',
      'Real Madrid has won the UEFA Champions League a record 14 times.',
      'The fastest goal in Premier League history was scored by Shane Long in 7.69 seconds in 2019.'
    ];
    
    const randomFallback = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
    
    const fact: FootballFunFact = {
      title: 'Football Fact',
      description: randomFallback,
      category: 'records',
      _source: 'fallback'
    };
    
    setCachedData(cacheKey, fact);
    return fact;
  }
};

// Other exports (kept for compatibility)
export const fetchTransferNews = async (): Promise<any[]> => [];
export const fetchLeagueTopScorers = async (): Promise<any[]> => [];
export const getGlobalLeagueInsights = async (): Promise<any[]> => [];
export const getInternationalNews = async (): Promise<any[]> => [];

// Export everything
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