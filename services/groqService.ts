// services/groqService.ts - BSD INTEGRATION (Dynamic, Free, No Rate Limits)

import Groq from 'groq-sdk';

// Types (same as before)
export interface Player {
  name: string;
  currentTeam: string;
  position: string;
  age?: number;
  nationality: string;
  careerGoals?: number;
  careerAssists?: number;
  internationalAppearances?: number;
  internationalGoals?: number;
  majorAchievements: string[];
  careerSummary: string;
  _source?: string;
  _lastVerified?: string;
  _imageUrl?: string;
}

export interface Team {
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  website?: string;
  venue?: string;
  majorAchievements: {
    worldCup?: string[];
    international?: string[];
    continental?: string[];
    domestic?: string[];
  };
  _source?: string;
  _lastVerified?: string;
  _confidence?: number;
  _verified?: boolean;
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: {
    source: string;
    confidence: number;
    season: string;
    verified: boolean;
    hasSquad?: boolean;
    squadCount?: number;
    warning?: string;
    verificationSteps?: string[];
    originalQuery?: string;
    correctedQuery?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CURRENT_SEASON = '2024/2025';
const SEASON_YEAR = '2024';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

// Cache
const cache = new Map<string, { data: GROQSearchResponse; timestamp: number }>();

// ============================================================================
// BSD API - DYNAMIC TEAM & PLAYER DATA (FREE, NO RATE LIMITS)
// ============================================================================

async function searchTeamWithBSD(query: string): Promise<{ team: Team; players: Player[] } | null> {
  try {
    console.log(`📡 [BSD] Searching for team: ${query}`);
    
    // ✅ CORRECT v2 endpoint - uses 'name' parameter, not 'search'
    const searchResponse = await fetch(
      `/api/bsd-proxy?endpoint=/teams/?name=${encodeURIComponent(query)}`
    );
    
    const searchData = await searchResponse.json();
    
    // v2 returns 'results' array, not 'data'
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`[BSD] No team found for: ${query}`);
      return null;
    }
    
    const teamData = searchData.results[0];
    
    console.log(`✅ [BSD] Found team: ${teamData.name} (ID: ${teamData.id})`);
    
    // Get squad using v2 squad endpoint
    const squadResponse = await fetch(
      `/api/bsd-proxy?endpoint=/teams/${teamData.id}/squad/`
    );
    
    const squadData = await squadResponse.json();
    
    const team: Team = {
      name: teamData.name,
      shortName: teamData.short_name || teamData.name,
      crest: `https://sports.bzzoiro.com/img/team/${teamData.id}/`,
      type: 'club',
      country: teamData.country || '',
      stadium: teamData.venue_id ? `Venue ID: ${teamData.venue_id}` : 'Unknown',
      currentCoach: 'Unknown',
      foundedYear: undefined,
      majorAchievements: {},
      _source: 'BSD API v2',
      _verified: true,
      _confidence: 95,
      _lastVerified: new Date().toISOString()
    };
    
    // v2 squad endpoint returns 'players' array
    const players: Player[] = (squadData.players || []).map((player: any) => ({
      name: player.name,
      currentTeam: team.name,
      position: player.position || 'Unknown',
      age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
      nationality: player.nationality || '',
      careerGoals: undefined,
      careerAssists: undefined,
      majorAchievements: [],
      careerSummary: `${player.name} plays for ${team.name}.`,
      _source: 'BSD API v2',
      _imageUrl: `https://sports.bzzoiro.com/img/player/${player.id}/`,
      _lastVerified: new Date().toISOString()
    }));
    
    console.log(`✅ [BSD] Retrieved ${players.length} players for ${team.name}`);
    
    return { team, players };
    
  } catch (error) {
    console.error('[BSD] Error:', error);
    return null;
  }
}

async function searchNationalTeamWithBSD(query: string): Promise<{ team: Team; players: Player[] } | null> {
  try {
    console.log(`📡 [BSD] Searching for national team: ${query}`);
    
    const searchResponse = await fetch(
      `/api/bsd-proxy?endpoint=/teams/search/${encodeURIComponent(query)}`
    );
    
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) return null;
    
    // Filter for national teams
    const nationalTeam = searchData.data.find((team: any) => 
      team.type === 'national' || team.is_national === true
    );
    
    if (!nationalTeam) return null;
    
    const squadResponse = await fetch(
      `/api/bsd-proxy?endpoint=/teams/${nationalTeam.id}/squad`
    );
    
    const squadData = await squadResponse.json();
    
    const team: Team = {
      name: nationalTeam.name,
      shortName: nationalTeam.short_name || nationalTeam.name,
      crest: nationalTeam.logo,
      type: 'national',
      country: nationalTeam.country || '',
      stadium: nationalTeam.stadium,
      currentCoach: nationalTeam.coach || 'Information not available',
      foundedYear: nationalTeam.founded,
      majorAchievements: {},
      _source: 'BSD API',
      _verified: true,
      _confidence: 95,
      _lastVerified: new Date().toISOString()
    };
    
    const players: Player[] = (squadData.data || []).map((player: any) => ({
      name: player.name,
      currentTeam: team.name,
      position: player.position || 'Unknown',
      age: player.age,
      nationality: player.nationality || '',
      careerGoals: player.goals,
      careerAssists: player.assists,
      majorAchievements: [],
      careerSummary: `${player.name} represents ${team.name} national team.`,
      _source: 'BSD API',
      _imageUrl: player.image_path,
      _lastVerified: new Date().toISOString()
    }));
    
    return { team, players };
    
  } catch (error) {
    console.error('[BSD National Team] Error:', error);
    return null;
  }
}

// ============================================================================
// AI FUZZY MATCHING (For misspellings)
// ============================================================================

async function correctQueryWithAI(query: string, type: 'team' | 'player'): Promise<{
  corrected: string;
  confidence: number;
  original: string;
}> {
  console.log(`🤖 [AI FUZZY] Correcting ${type}: "${query}"`);
  
  const systemPrompt = `You are a football database expert. Correct misspelled ${type} names to their official name.
  
Return ONLY the corrected name, nothing else. Fix typos and common misspellings.

Examples:
- "real madird" -> "Real Madrid"
- "barca" -> "Barcelona"
- "vini jr" -> "Vinicius Junior"
- "belli" -> "Jude Bellingham"
- "atletico de mardrid" -> "Atletico Madrid"

Return ONLY the corrected name, no punctuation, no explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 50,
    });

    const corrected = completion.choices[0]?.message?.content?.trim() || query;
    const confidence = corrected.toLowerCase() === query.toLowerCase() ? 100 : 85;
    
    console.log(`🤖 [AI FUZZY] "${query}" -> "${corrected}" (${confidence}% confidence)`);
    
    return { corrected, confidence, original: query };
  } catch (error) {
    console.error('[AI FUZZY] Error:', error);
    return { corrected: query, confidence: 100, original: query };
  }
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

async function searchTeam(query: string): Promise<GROQSearchResponse> {
  console.log(`🔍 [TEAM SEARCH] "${query}" - Season: ${CURRENT_SEASON}`);

  const verificationSteps: string[] = [];
  verificationSteps.push(`🔍 Original query: "${query}"`);
  
  // AI fuzzy matching
  const aiCorrected = await correctQueryWithAI(query, 'team');
  const searchQuery = aiCorrected.corrected;
  verificationSteps.push(`🤖 AI corrected to: "${searchQuery}"`);
  
  let result = null;
  
  // Try BSD API for club teams
  verificationSteps.push('📡 Querying BSD API for club team...');
  result = await searchTeamWithBSD(searchQuery);
  
  // If not found as club, try as national team
  if (!result) {
    verificationSteps.push('📡 Querying BSD API for national team...');
    result = await searchNationalTeamWithBSD(searchQuery);
  }
  
  if (result) {
    verificationSteps.push(`✅ Found: ${result.team.name} with ${result.players.length} players`);
    
    return {
      players: result.players,
      teams: [result.team],
      youtubeQuery: `${result.team.name} highlights ${SEASON_YEAR}`,
      _metadata: {
        source: 'BSD API',
        confidence: 95,
        season: CURRENT_SEASON,
        verified: true,
        hasSquad: result.players.length > 0,
        squadCount: result.players.length,
        verificationSteps,
        originalQuery: query,
        correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
      }
    };
  }
  
  verificationSteps.push('❌ Team not found in BSD database');
  
  // Fallback error response
  return {
    players: [],
    teams: [],
    youtubeQuery: `${query} football highlights`,
    error: `Team "${query}" not found. Please check the spelling or try a different team name.`,
    _metadata: {
      source: 'Not Found',
      confidence: 0,
      season: CURRENT_SEASON,
      verified: false,
      hasSquad: false,
      warning: 'Team not found in BSD database',
      verificationSteps,
      originalQuery: query,
      correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
    }
  };
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export const searchWithGROQ = async (
  query: string, 
  language: string = 'en', 
  bustCache: boolean = false, 
  isTeamSearch: boolean = true
): Promise<GROQSearchResponse> => {
  
  console.log(`🔍 [GROQ SERVICE] Search: "${query}" | Team Mode: ${isTeamSearch}`);
  
  const cacheKey = `${query}_${isTeamSearch}_${language}`;
  
  if (!bustCache && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 [CACHE] Using cached result for: ${query}`);
      return cached.data;
    }
  }
  
  try {
    const result = await searchTeam(query);
    
    if (!bustCache && result._metadata?.source !== 'Not Found') {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`💾 [CACHE] Stored result for: ${query}`);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('[GROQ] Search error:', error);
    return {
      players: [],
      teams: [],
      youtubeQuery: `${query} football`,
      error: 'Search failed. Please try again.',
      _metadata: { 
        source: 'Error', 
        confidence: 0, 
        season: CURRENT_SEASON, 
        verified: false, 
        hasSquad: false 
      }
    };
  }
};

export const getHistoricalPlayers = async (
  teamName: string, 
  teamType: 'club' | 'national', 
  language: string = 'en'
): Promise<Player[]> => {
  // Historical players can be fetched from BSD's player search if needed
  console.log(`🔍 [HISTORICAL] Fetching legends for: ${teamName}`);
  return [];
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('🧹 Search cache cleared');
};

export const getCurrentSeason = () => CURRENT_SEASON;