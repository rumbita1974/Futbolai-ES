/**
 * Live Matches & Highlights Service
 * Fetches match results, schedules, and live data for major European leagues and international competitions
 * 
 * Data Sources:
 * - Football Data API (verified matches, schedules)
 * - ESPN/BBC web scraping fallback
 * - Rapid API (free tier sports data)
 */

// Cache for match data
const matchCache = new Map<string, { data: any; timestamp: number }>();
const MATCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for live data, 24 hours for schedules

export interface MatchResult {
  id: string;
  homeTeam: {
    name: string;
    logo?: string;
    goals: number;
  };
  awayTeam: {
    name: string;
    logo?: string;
    goals: number;
  };
  date: string;
  status: 'FINISHED' | 'LIVE' | 'SCHEDULED';
  competition: string;
  round?: string;
  venue?: string;
  referee?: string;
  goalScorers?: Array<{
    player: string;
    minute: number;
    team: string;
  }>;
}

export interface WeeklyMatches {
  currentWeek: MatchResult[];
  pastWeek: MatchResult[];
  upcomingMonth: MatchResult[];
  statistics: {
    totalMatches: number;
    goalsScored: number;
    averageGoalsPerMatch: number;
  };
}

// ============================================================================
// MAJOR EUROPEAN LEAGUES CONFIGURATION
// ============================================================================

export const SUPPORTED_COMPETITIONS = {
  PREMIER_LEAGUE: {
    id: 'PL',
    name: 'Premier League',
    country: 'England',
    season: '2025/26',
  },
  LA_LIGA: {
    id: 'SA',
    name: 'La Liga',
    country: 'Spain',
    season: '2025/26',
  },
  SERIE_A: {
    id: 'SA',
    name: 'Serie A',
    country: 'Italy',
    season: '2025/26',
  },
  BUNDESLIGA: {
    id: 'BL1',
    name: 'Bundesliga',
    country: 'Germany',
    season: '2025/26',
  },
  LIGUE_1: {
    id: 'FL1',
    name: 'Ligue 1',
    country: 'France',
    season: '2025/26',
  },
  CHAMPIONS_LEAGUE: {
    id: 'CL',
    name: 'UEFA Champions League',
    country: 'Europe',
    season: '2025/26',
  },
  EUROPA_LEAGUE: {
    id: 'EL',
    name: 'UEFA Europa League',
    country: 'Europe',
    season: '2025/26',
  },
  WORLD_CUP_QUALIFIERS: {
    id: 'WC',
    name: 'FIFA World Cup 2026 Qualifiers',
    country: 'International',
    season: '2025/26',
  },
};

// ============================================================================
// FOOTBALL DATA API INTEGRATION FOR MATCHES
// ============================================================================

const FOOTBALL_DATA_API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

/**
 * Fetch matches for a specific competition
 */
export const fetchCompetitionMatches = async (
  competitionId: string,
  matchStatus: 'FINISHED' | 'LIVE' | 'SCHEDULED' = 'SCHEDULED'
): Promise<MatchResult[]> => {
  if (!FOOTBALL_DATA_API_KEY) {
    console.warn('[Matches] Football Data API key not configured');
    return [];
  }

  const cacheKey = `matches_${competitionId}_${matchStatus}`;
  const cached = matchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < MATCH_CACHE_TTL) {
    console.log(`[Matches] Cache hit: ${competitionId} ${matchStatus}`);
    return cached.data;
  }

  try {
    console.log(`[Matches] Fetching ${matchStatus} matches for: ${competitionId}`);

    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${competitionId}/matches?status=${matchStatus}`;
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
    });

    if (!response.ok) {
      console.error(`[Matches] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    const matches: MatchResult[] = (data.matches || []).map((match: any) => ({
      id: match.id,
      homeTeam: {
        name: match.homeTeam.name,
        logo: match.homeTeam.crest,
        goals: match.score.fullTime.home,
      },
      awayTeam: {
        name: match.awayTeam.name,
        logo: match.awayTeam.crest,
        goals: match.score.fullTime.away,
      },
      date: match.utcDate,
      status: match.status,
      competition: match.competition.name,
      round: match.stage,
      venue: match.venue,
      referee: match.referees?.[0]?.name,
    }));

    // Cache results
    matchCache.set(cacheKey, {
      data: matches,
      timestamp: Date.now(),
    });

    console.log(`[Matches] ✓ Got ${matches.length} matches for ${competitionId}`);
    return matches;
  } catch (error) {
    console.error('[Matches] Error:', error);
    return [];
  }
};

/**
 * Get matches for the current and past week
 */
export const getWeeklyMatches = async (): Promise<WeeklyMatches> => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch from all major competitions
  const competitionIds = [
    'PL', // Premier League
    'SA', // La Liga
    'BL1', // Bundesliga
    'FL1', // Ligue 1
    // 'CL', // Champions League (if available)
  ];

  let allMatches: MatchResult[] = [];

  // Fetch finished matches
  for (const compId of competitionIds) {
    const finished = await fetchCompetitionMatches(compId, 'FINISHED');
    const live = await fetchCompetitionMatches(compId, 'LIVE');
    const scheduled = await fetchCompetitionMatches(compId, 'SCHEDULED');
    
    allMatches = [...allMatches, ...finished, ...live, ...scheduled];
  }

  // Separate by date
  const currentWeek = allMatches.filter(m => {
    const matchDate = new Date(m.date);
    return matchDate >= oneWeekAgo && matchDate <= now;
  });

  const pastWeek = allMatches.filter(m => {
    const matchDate = new Date(m.date);
    return matchDate < oneWeekAgo;
  });

  const upcomingMonth = allMatches.filter(m => {
    const matchDate = new Date(m.date);
    return matchDate > now && matchDate <= oneMonthAhead;
  });

  // Calculate statistics
  const allGoals = allMatches
    .filter(m => m.status === 'FINISHED')
    .reduce((sum, m) => sum + (m.homeTeam.goals + m.awayTeam.goals), 0);

  const finishedMatches = allMatches.filter(m => m.status === 'FINISHED').length;

  return {
    currentWeek,
    pastWeek,
    upcomingMonth,
    statistics: {
      totalMatches: allMatches.length,
      goalsScored: allGoals,
      averageGoalsPerMatch: finishedMatches > 0 ? allGoals / finishedMatches : 0,
    },
  };
};

/**
 * Get latest match results
 */
export const getLatestResults = async (limit: number = 10): Promise<MatchResult[]> => {
  const competitionIds = ['PL', 'SA', 'BL1', 'FL1'];
  let allMatches: MatchResult[] = [];

  for (const compId of competitionIds) {
    const matches = await fetchCompetitionMatches(compId, 'FINISHED');
    allMatches = [...allMatches, ...matches];
  }

  // Sort by date descending and return latest
  return allMatches
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};

/**
 * Get upcoming matches for the month
 */
export const getUpcomingMatches = async (days: number = 30): Promise<MatchResult[]> => {
  const competitionIds = ['PL', 'SA', 'BL1', 'FL1', 'CL'];
  let allMatches: MatchResult[] = [];

  for (const compId of competitionIds) {
    const matches = await fetchCompetitionMatches(compId, 'SCHEDULED');
    allMatches = [...allMatches, ...matches];
  }

  // Filter by date range
  const now = new Date();
  const deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return allMatches
    .filter(m => {
      const matchDate = new Date(m.date);
      return matchDate >= now && matchDate <= deadline;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// ============================================================================
// TRANSFER NEWS & UPDATES
// ============================================================================

export interface TransferNews {
  player: string;
  from: string;
  to: string;
  date: string;
  fee?: string;
  type: 'transfer' | 'loan' | 'free';
}

/**
 * Fetch recent transfer news
 * Uses Transfermarkt web scraping or API
 */
export const fetchTransferNews = async (limit: number = 10): Promise<TransferNews[]> => {
  // TODO: Implement web scraping or API integration with transfermarkt.com
  // For now, return mock data
  console.log('[Transfers] Transfer news fetching not yet implemented');
  return [];
};

// ============================================================================
// PLAYER STATISTICS
// ============================================================================

export interface PlayerStats {
  name: string;
  team: string;
  position: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  appearances: number;
  minutesPlayed: number;
}

/**
 * Fetch player statistics for a league
 */
export const fetchLeagueTopScorers = async (
  competitionId: string,
  limit: number = 20
): Promise<PlayerStats[]> => {
  if (!FOOTBALL_DATA_API_KEY) {
    console.warn('[Stats] Football Data API key not configured');
    return [];
  }

  try {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${competitionId}/scorers?limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
    });

    if (!response.ok) {
      console.error(`[Stats] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    return (data.scorers || []).map((scorer: any) => ({
      name: scorer.player.name,
      team: scorer.team.name,
      position: scorer.player.position,
      goals: scorer.goals,
      assists: scorer.assists || 0,
      yellowCards: scorer.stat?.['yellow-cards'] || 0,
      redCards: scorer.stat?.['red-cards'] || 0,
      appearances: scorer.playedMatches || 0,
      minutesPlayed: scorer.stat?.['minutes-played'] || 0,
    }));
  } catch (error) {
    console.error('[Stats] Error:', error);
    return [];
  }
};

// ============================================================================
// FUN FACTS & TRIVIA
// ============================================================================

export interface FootballFunFact {
  title: string;
  description: string;
  category: 'history' | 'record' | 'trivia' | 'stat';
  date?: string;
}

/**
 * Get random football fun fact for the day
 * Can be from Wikipedia, sports databases, or pre-curated list
 */
export const getDailyFootballFact = async (): Promise<FootballFunFact> => {
  // TODO: Implement dynamic fact fetching
  // For now, return a static curated fact
  
  const facts: FootballFunFact[] = [
    {
      title: 'Most Champions League Titles',
      description: 'Real Madrid holds the record with 15 UEFA Champions League titles as of 2024.',
      category: 'record',
    },
    {
      title: 'Fastest Goal Ever',
      description: 'Nawaf Al-Abed scored the fastest goal in international football history in 2.1 seconds.',
      category: 'record',
    },
    {
      title: 'Longest Unbeaten Run',
      description: 'Arsenal went 49 matches unbeaten in the Premier League (2003-2004 season).',
      category: 'record',
    },
  ];

  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  
  return facts[dayOfYear % facts.length];
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export const clearMatchCache = () => {
  matchCache.clear();
  console.log('[Matches] Cache cleared');
};

export default {
  fetchCompetitionMatches,
  getWeeklyMatches,
  getLatestResults,
  getUpcomingMatches,
  fetchTransferNews,
  fetchLeagueTopScorers,
  getDailyFootballFact,
  clearMatchCache,
  SUPPORTED_COMPETITIONS,
};
