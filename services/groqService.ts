// services/groqService.ts - COMPLETE WORKING VERSION WITH BSD v2
// Supports: Club teams (full squads + images) | National teams (achievements only)

import Groq from 'groq-sdk';

// Types
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
// HELPER FUNCTIONS
// ============================================================================

function calculateAge(dateOfBirth: string): number | undefined {
  if (!dateOfBirth) return undefined;
  try {
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 15 || age > 50) return undefined;
    return age;
  } catch {
    return undefined;
  }
}

// ============================================================================
// NATIONAL TEAM ACHIEVEMENTS (World Cup, Continental Titles)
// ============================================================================

const NATIONAL_TEAM_ACHIEVEMENTS: Record<string, Team['majorAchievements']> = {
  'germany': {
    worldCup: ['1954', '1974', '1990', '2014'],
    international: ['3x UEFA European Championship (1972, 1980, 1996)'],
    continental: [],
    domestic: []
  },
  'france': {
    worldCup: ['1998', '2018'],
    international: ['2x UEFA European Championship (1984, 2000)'],
    continental: [],
    domestic: []
  },
  'italy': {
    worldCup: ['1934', '1938', '1982', '2006'],
    international: ['2x UEFA European Championship (1968, 2020)'],
    continental: [],
    domestic: []
  },
  'spain': {
    worldCup: ['2010'],
    international: ['3x UEFA European Championship (1964, 2008, 2012)'],
    continental: [],
    domestic: []
  },
  'england': {
    worldCup: ['1966'],
    international: ['1x UEFA European Championship (2020)'],
    continental: [],
    domestic: []
  },
  'argentina': {
    worldCup: ['1978', '1986', '2022'],
    international: ['16x Copa América'],
    continental: [],
    domestic: []
  },
  'brazil': {
    worldCup: ['1958', '1962', '1970', '1994', '2002'],
    international: ['9x Copa América'],
    continental: [],
    domestic: []
  },
  'netherlands': {
    worldCup: ['1974', '1978', '2010'],
    international: ['1x UEFA European Championship (1988)'],
    continental: [],
    domestic: []
  },
  'portugal': {
    worldCup: [],
    international: ['1x UEFA European Championship (2016)', '1x UEFA Nations League (2019)'],
    continental: [],
    domestic: []
  },
  'belgium': {
    worldCup: [],
    international: ['2018 FIFA World Cup bronze'],
    continental: [],
    domestic: []
  },
  'uruguay': {
    worldCup: ['1930', '1950'],
    international: ['15x Copa América'],
    continental: [],
    domestic: []
  },
  'croatia': {
    worldCup: ['2018 Runner-up', '2022 3rd Place'],
    international: [],
    continental: [],
    domestic: []
  },
  'poland': {
    worldCup: ['1974 3rd Place', '1982 3rd Place'],
    international: [],
    continental: [],
    domestic: []
  },
  'sweden': {
    worldCup: ['1958 Runner-up', '1994 3rd Place'],
    international: [],
    continental: [],
    domestic: []
  },
  'denmark': {
    worldCup: [],
    international: ['1x UEFA European Championship (1992)'],
    continental: [],
    domestic: []
  },
  'greece': {
    worldCup: [],
    international: ['1x UEFA European Championship (2004)'],
    continental: [],
    domestic: []
  },
  'chile': {
    worldCup: ['1962 3rd Place'],
    international: ['2x Copa América (2015, 2016)'],
    continental: [],
    domestic: []
  },
  'colombia': {
    worldCup: [],
    international: ['1x Copa América (2001)'],
    continental: [],
    domestic: []
  },
  'mexico': {
    worldCup: [],
    international: ['1x Copa América (2015)'],
    continental: [],
    domestic: []
  },
  'japan': {
    worldCup: [],
    international: ['4x AFC Asian Cup'],
    continental: [],
    domestic: []
  },
  'south korea': {
    worldCup: ['2002 4th Place'],
    international: ['2x AFC Asian Cup'],
    continental: [],
    domestic: []
  },
  'australia': {
    worldCup: [],
    international: ['4x OFC Nations Cup', '1x AFC Asian Cup (2015)'],
    continental: [],
    domestic: []
  },
  'morocco': {
    worldCup: ['2022 4th Place'],
    international: ['1x Africa Cup of Nations (1976)'],
    continental: [],
    domestic: []
  },
  'senegal': {
    worldCup: ['2022 Round of 16'],
    international: ['1x Africa Cup of Nations (2021)'],
    continental: [],
    domestic: []
  },
  'egypt': {
    worldCup: [],
    international: ['7x Africa Cup of Nations'],
    continental: [],
    domestic: []
  },
  'nigeria': {
    worldCup: [],
    international: ['3x Africa Cup of Nations'],
    continental: [],
    domestic: []
  },
  'cameroon': {
    worldCup: ['1990 Quarter-final'],
    international: ['5x Africa Cup of Nations'],
    continental: [],
    domestic: []
  },
  'ghana': {
    worldCup: ['2010 Quarter-final'],
    international: ['4x Africa Cup of Nations'],
    continental: [],
    domestic: []
  },
  'ivory coast': {
    worldCup: [],
    international: ['2x Africa Cup of Nations'],
    continental: [],
    domestic: []
  },
  'usa': {
    worldCup: ['1930 Semi-final'],
    international: ['7x CONCACAF Gold Cup'],
    continental: [],
    domestic: []
  },
  'canada': {
    worldCup: ['2022 Group Stage'],
    international: ['2x CONCACAF Gold Cup'],
    continental: [],
    domestic: []
  },
  'iraq': {
    worldCup: [],
    international: ['1x AFC Asian Cup (2007)'],
    continental: [],
    domestic: []
  },
  'saudi arabia': {
    worldCup: [],
    international: ['3x AFC Asian Cup'],
    continental: [],
    domestic: []
  },
  'qatar': {
    worldCup: ['2022 Group Stage'],
    international: ['1x AFC Asian Cup (2019)'],
    continental: [],
    domestic: []
  }
};

async function getNationalTeamAchievements(teamName: string): Promise<Team['majorAchievements']> {
  const teamLower = teamName.toLowerCase();
  
  for (const [key, achievements] of Object.entries(NATIONAL_TEAM_ACHIEVEMENTS)) {
    if (teamLower.includes(key) || key.includes(teamLower)) {
      console.log(`📖 [Achievements] Found for ${teamName}`);
      return achievements;
    }
  }
  
  // Default empty achievements
  return { worldCup: [], international: [], continental: [], domestic: [] };
}

// ============================================================================
// CLUB TEAM ACHIEVEMENTS
// ============================================================================

const CLUB_ACHIEVEMENTS: Record<string, Team['majorAchievements']> = {
  'real madrid': {
    worldCup: [],
    international: ['5x FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)'],
    continental: ['15x UEFA Champions League'],
    domestic: ['36x La Liga', '20x Copa del Rey']
  },
  'barcelona': {
    worldCup: [],
    international: ['3x FIFA Club World Cup (2009, 2011, 2015)'],
    continental: ['5x UEFA Champions League'],
    domestic: ['27x La Liga', '31x Copa del Rey']
  },
  'atletico madrid': {
    worldCup: [],
    international: [],
    continental: ['3x UEFA Europa League'],
    domestic: ['11x La Liga', '10x Copa del Rey']
  },
  'manchester city': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2023)'],
    continental: ['1x UEFA Champions League (2023)'],
    domestic: ['10x Premier League', '7x FA Cup']
  },
  'manchester united': {
    worldCup: [],
    international: ['2x FIFA Club World Cup'],
    continental: ['3x UEFA Champions League'],
    domestic: ['20x Premier League', '12x FA Cup']
  },
  'liverpool': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2019)'],
    continental: ['6x UEFA Champions League'],
    domestic: ['19x Premier League', '8x FA Cup']
  },
  'arsenal': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['13x Premier League', '14x FA Cup']
  },
  'chelsea': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2021)'],
    continental: ['2x UEFA Champions League'],
    domestic: ['6x Premier League', '8x FA Cup']
  },
  'tottenham': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['2x Premier League', '8x FA Cup']
  },
  'bayern munich': {
    worldCup: [],
    international: ['2x FIFA Club World Cup'],
    continental: ['6x UEFA Champions League'],
    domestic: ['33x Bundesliga', '20x DFB-Pokal']
  },
  'borussia dortmund': {
    worldCup: [],
    international: [],
    continental: ['1x UEFA Champions League'],
    domestic: ['8x Bundesliga', '5x DFB-Pokal']
  },
  'juventus': {
    worldCup: [],
    international: [],
    continental: ['2x UEFA Champions League'],
    domestic: ['36x Serie A', '14x Coppa Italia']
  },
  'inter milan': {
    worldCup: [],
    international: ['1x FIFA Club World Cup'],
    continental: ['3x UEFA Champions League'],
    domestic: ['20x Serie A', '9x Coppa Italia']
  },
  'ac milan': {
    worldCup: [],
    international: ['1x FIFA Club World Cup'],
    continental: ['7x UEFA Champions League'],
    domestic: ['19x Serie A', '5x Coppa Italia']
  },
  'napoli': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['3x Serie A']
  },
  'psg': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['11x Ligue 1', '14x Coupe de France']
  },
  'ajax': {
    worldCup: [],
    international: [],
    continental: ['4x UEFA Champions League'],
    domestic: ['36x Eredivisie', '20x KNVB Cup']
  },
  'porto': {
    worldCup: [],
    international: [],
    continental: ['2x UEFA Champions League'],
    domestic: ['30x Primeira Liga', '19x Taça de Portugal']
  },
  'benfica': {
    worldCup: [],
    international: [],
    continental: ['2x UEFA Champions League'],
    domestic: ['38x Primeira Liga', '26x Taça de Portugal']
  },
  'sporting cp': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['19x Primeira Liga', '17x Taça de Portugal']
  }
};

async function getClubAchievements(teamName: string): Promise<Team['majorAchievements']> {
  const teamLower = teamName.toLowerCase();
  
  for (const [key, achievements] of Object.entries(CLUB_ACHIEVEMENTS)) {
    if (teamLower.includes(key) || key.includes(teamLower)) {
      console.log(`📖 [Achievements] Found for ${teamName}`);
      return achievements;
    }
  }
  
  return { worldCup: [], international: [], continental: [], domestic: [] };
}

// ============================================================================
// BSD API v2 - CORRECT ENDPOINTS
// ============================================================================

async function searchTeamWithBSD(query: string): Promise<{ team: Team; players: Player[] } | null> {
  try {
    console.log(`📡 [BSD] Searching for team: ${query}`);
    
    // Use the correct v2 endpoint with 'name' parameter
    const searchResponse = await fetch(
      `/api/bsd-proxy?endpoint=/teams/?name=${encodeURIComponent(query)}`
    );
    
    const searchData = await searchResponse.json();
    
    // Check for API errors
    if (searchData.error) {
      console.error(`[BSD] API Error: ${searchData.detail}`);
      return null;
    }
    
    // v2 returns 'results' array
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`[BSD] No team found for: ${query}`);
      return null;
    }
    
    const teamData = searchData.results[0];
    
    console.log(`✅ [BSD] Found team: ${teamData.name} (ID: ${teamData.id})`);
    
    // Determine if this is a national team
    const isNational = teamData.type === 'national' || 
                       teamData.country === teamData.name ||
                       query.toLowerCase() === teamData.country?.toLowerCase();
    
    let players: Player[] = [];
    
    // Only fetch squad for club teams (national teams don't have squad data in BSD)
    if (!isNational) {
      // Try the documented squad endpoint first
      let squadResponse = await fetch(
        `/api/bsd-proxy?endpoint=/teams/${teamData.id}/squad/`
      );
      
      let squadResult = await squadResponse.json();
      
      if (squadResult.players && squadResult.players.length > 0) {
        players = squadResult.players.map((player: any) => ({
          name: player.name || 'Unknown',
          currentTeam: teamData.name,
          position: player.position || player.specific_position || 'Unknown',
          age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
          nationality: player.nationality || '',
          careerGoals: undefined,
          careerAssists: undefined,
          majorAchievements: [],
          careerSummary: `${player.name || 'Player'} plays for ${teamData.name}.`,
          _source: 'BSD API v2',
          _imageUrl: player.id ? `https://sports.bzzoiro.com/img/player/${player.id}/` : undefined,
          _lastVerified: new Date().toISOString()
        }));
      } else {
        // Try alternative endpoint for players
        const playersResponse = await fetch(
          `/api/bsd-proxy?endpoint=/players/?team_id=${teamData.id}&limit=50`
        );
        const playersResult = await playersResponse.json();
        if (playersResult.results && playersResult.results.length > 0) {
          players = playersResult.results.map((player: any) => ({
            name: player.name || 'Unknown',
            currentTeam: teamData.name,
            position: player.position || player.specific_position || 'Unknown',
            age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
            nationality: player.nationality || '',
            careerGoals: undefined,
            careerAssists: undefined,
            majorAchievements: [],
            careerSummary: `${player.name || 'Player'} plays for ${teamData.name}.`,
            _source: 'BSD API v2',
            _imageUrl: player.id ? `https://sports.bzzoiro.com/img/player/${player.id}/` : undefined,
            _lastVerified: new Date().toISOString()
          }));
        }
      }
    } else {
      console.log(`📡 [BSD] National team detected - using achievements database`);
    }
    
    // Get achievements based on team type
    const achievements = isNational 
      ? await getNationalTeamAchievements(teamData.name)
      : await getClubAchievements(teamData.name);
    
    const team: Team = {
      name: teamData.name,
      shortName: teamData.short_name || teamData.name,
      crest: `https://sports.bzzoiro.com/img/team/${teamData.id}/`,
      type: isNational ? 'national' : 'club',
      country: teamData.country || '',
      stadium: teamData.venue_id ? `Venue ID: ${teamData.venue_id}` : 'Not specified',
      currentCoach: 'Information not available',
      foundedYear: undefined,
      majorAchievements: achievements,
      _source: 'BSD API v2',
      _verified: true,
      _confidence: 95,
      _lastVerified: new Date().toISOString()
    };
    
    console.log(`✅ [BSD] Retrieved ${players.length} players for ${team.name}`);
    
    return { team, players };
    
  } catch (error) {
    console.error('[BSD] Error:', error);
    return null;
  }
}

// ============================================================================
// AI FUZZY MATCHING
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
- "man city" -> "Manchester City"
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
  
  // Try BSD API
  verificationSteps.push('📡 Querying BSD API...');
  const result = await searchTeamWithBSD(searchQuery);
  
  if (result) {
    if (result.players.length === 0) {
      verificationSteps.push(`⚠️ Team found but no squad data available (national team or API limitation)`);
    } else {
      verificationSteps.push(`✅ Found ${result.players.length} players via BSD API`);
    }
    
    return {
      players: result.players,
      teams: [result.team],
      youtubeQuery: `${result.team.name} highlights ${SEASON_YEAR}`,
      _metadata: {
        source: 'BSD API v2',
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
  
  verificationSteps.push('❌ Team not found in BSD API');
  
  return {
    players: [],
    teams: [],
    youtubeQuery: `${query} football highlights`,
    error: `Team "${query}" not found. Please check the spelling.`,
    _metadata: {
      source: 'Not Found',
      confidence: 0,
      season: CURRENT_SEASON,
      verified: false,
      hasSquad: false,
      warning: 'Team not found',
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
  console.log(`🔍 [HISTORICAL] Fetching legends for: ${teamName}`);
  // Historical players can be added later if needed
  return [];
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('🧹 Search cache cleared');
};

export const getCurrentSeason = () => CURRENT_SEASON;