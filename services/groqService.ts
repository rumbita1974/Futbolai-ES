// services/groqService.ts - COMPLETE HYBRID APPROACH
// Primary: Football Data API (team search, squad data)
// Secondary: TheSportsDB (player images only)
// Fallback: Knowledge Base

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
  _metadata?: {
    isPrimary?: boolean;
    relevanceScore?: number;
    ambiguityNote?: string;
  };
  _era?: string;
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
    imagesFound?: number;
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

// Simple in-memory cache
const cache = new Map<string, { data: GROQSearchResponse; timestamp: number }>();

// Cache for player TheSportsDB IDs (to avoid repeated searches)
const playerIdCache = new Map<string, string>();

// Cache for competition teams (to avoid repeated API calls)
const competitionTeamsCache = new Map<string, any[]>();

// ============================================================================
// COMPETITION IDS FOR FOOTBALL DATA API
// ============================================================================

const COMPETITION_IDS: Record<string, number> = {
  // UEFA (Europe) - Top Divisions
  'premier league': 2021,        // England
  'la liga': 2014,               // Spain
  'bundesliga': 2002,            // Germany
  'serie a': 2019,               // Italy
  'ligue 1': 2015,               // France
  'eredivisie': 2003,            // Netherlands
  'primeira liga': 2017,         // Portugal
  'ligapro': 2013,               // Argentina
  
  // CONMEBOL (South America)
  'brasileirao': 2012,           // Brazil
  'primera a': 2011,             // Colombia
  'primera division': 2016,      // Chile
  'primera division uruguay': 2024, // Uruguay
  'primera division venezuela': 2025, // Venezuela
  
  // CONCACAF (North America)
  'liga mx': 2018,               // Mexico
  
  // AFC (Asia)
  'j1 league': 2006,             // Japan
  'k league': 2007,              // South Korea
  'a league': 2008,              // Australia
  'saudi pro league': 2009,      // Saudi Arabia
  
  // CAF (Africa)
  'egypt premier league': 2010,  // Egypt
  'moroccan league': 2020,       // Morocco
  'senegal premier league': 2021, // Senegal
  'ghana premier league': 2022,  // Ghana
  'nigerian league': 2023,       // Nigeria
  
  // OFC (Oceania)
  'new zealand league': 2026,    // New Zealand
  
  // International Competitions
  'uefa champions league': 2001,
  'copa libertadores': 2004,
  'world cup': 2000
};

// List of countries for national team detection
const COUNTRIES_LIST = [
  'argentina', 'brazil', 'france', 'germany', 'italy', 'spain', 
  'england', 'portugal', 'netherlands', 'belgium', 'uruguay',
  'croatia', 'switzerland', 'denmark', 'sweden', 'norway',
  'chile', 'colombia', 'mexico', 'usa', 'canada', 'japan',
  'south korea', 'australia', 'morocco', 'senegal', 'egypt',
  'ghana', 'nigeria', 'cameroon', 'ivory coast', 'tunisia',
  'poland', 'wales', 'scotland', 'austria', 'czech republic',
  'hungary', 'serbia', 'turkey', 'ukraine', 'russia',
  'paraguay', 'peru', 'ecuador', 'bolivia', 'venezuela'
];

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

function detectTeamType(query: string): 'club' | 'national' {
  const queryLower = query.toLowerCase();
  if (COUNTRIES_LIST.includes(queryLower)) {
    return 'national';
  }
  return 'club';
}

// ============================================================================
// FOOTBALL DATA API - FETCH TEAMS FROM COMPETITION
// ============================================================================

async function fetchTeamsFromCompetition(competitionCode: string): Promise<any[]> {
  const cacheKey = competitionCode;
  
  if (competitionTeamsCache.has(cacheKey)) {
    console.log(`📦 [Cache] Using cached teams for ${competitionCode}`);
    return competitionTeamsCache.get(cacheKey)!;
  }
  
  try {
    const competitionId = COMPETITION_IDS[competitionCode];
    if (!competitionId) {
      console.warn(`No competition ID for: ${competitionCode}`);
      return [];
    }
    
    console.log(`📡 [Football Data API] Fetching teams from competition: ${competitionCode}`);
    
    const response = await fetch(
      `/api/football-proxy?endpoint=/competitions/${competitionId}/teams`
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch teams from ${competitionCode}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const teams = data.teams || [];
    
    // Cache the results
    competitionTeamsCache.set(cacheKey, teams);
    console.log(`✅ Cached ${teams.length} teams from ${competitionCode}`);
    
    return teams;
    
  } catch (error) {
    console.error(`Error fetching teams from ${competitionCode}:`, error);
    return [];
  }
}

// ============================================================================
// FOOTBALL DATA API - SEARCH CLUB TEAMS
// ============================================================================

async function fetchTeamDetails(teamId: number): Promise<{ team: Team; players: Player[] } | null> {
  try {
    const response = await fetch(`/api/football-proxy?endpoint=/teams/${teamId}`);
    
    if (!response.ok) return null;
    
    const teamDetails = await response.json();
    
    const team: Team = {
      name: teamDetails.name,
      shortName: teamDetails.shortName,
      tla: teamDetails.tla,
      crest: teamDetails.crest,
      type: teamDetails.type === 'NATIONAL' ? 'national' : 'club',
      country: teamDetails.area?.name || '',
      stadium: teamDetails.venue,
      currentCoach: teamDetails.coach?.name || 'Not specified',
      foundedYear: teamDetails.founded,
      website: teamDetails.website,
      venue: teamDetails.venue,
      majorAchievements: {},
      _source: 'Football Data API',
      _verified: true,
      _confidence: 95,
      _lastVerified: new Date().toISOString()
    };
    
    const players: Player[] = (teamDetails.squad || []).map((player: any) => ({
      name: player.name,
      currentTeam: team.name,
      position: player.position || 'Unknown',
      age: player.dateOfBirth ? calculateAge(player.dateOfBirth) : undefined,
      nationality: player.nationality || '',
      careerGoals: undefined,
      careerAssists: undefined,
      internationalAppearances: undefined,
      internationalGoals: undefined,
      majorAchievements: [],
      careerSummary: `${player.name} plays for ${team.name} as a ${player.position || 'player'}.`,
      _source: 'Football Data API',
      _lastVerified: new Date().toISOString()
    }));
    
    return { team, players };
    
  } catch (error) {
    console.error('[Fetch Team Details] Error:', error);
    return null;
  }
}

async function searchFootballDataAPI(query: string): Promise<{ team: Team; players: Player[] } | null> {
  const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
  
  if (!FOOTBALL_DATA_API_KEY) {
    console.warn('[Football Data API] No API key configured');
    return null;
  }

  try {
    console.log(`📡 [Football Data API] Searching for club: ${query}`);
    const queryLower = query.toLowerCase();
    
    // Search through all major competitions
    const competitionCodes = Object.keys(COMPETITION_IDS).filter(key => 
      !['world cup', 'uefa champions league', 'copa libertadores'].includes(key)
    );
    
    let matchedTeam = null;
    let foundInCompetition = '';
    
    for (const competitionCode of competitionCodes) {
      const teams = await fetchTeamsFromCompetition(competitionCode);
      
      matchedTeam = teams.find((team: any) => {
        const nameMatch = team.name?.toLowerCase().includes(queryLower);
        const shortNameMatch = team.shortName?.toLowerCase().includes(queryLower);
        const tlaMatch = team.tla?.toLowerCase() === queryLower;
        return nameMatch || shortNameMatch || tlaMatch;
      });
      
      if (matchedTeam) {
        foundInCompetition = competitionCode;
        console.log(`✅ Found "${matchedTeam.name}" in ${competitionCode}`);
        break;
      }
    }
    
    if (!matchedTeam) {
      console.log(`[Football Data API] No club match found for: ${query}`);
      return null;
    }
    
    // Fetch complete team details including squad
    return await fetchTeamDetails(matchedTeam.id);
    
  } catch (error) {
    console.error('[Football Data API] Error:', error);
    return null;
  }
}

// ============================================================================
// FOOTBALL DATA API - SEARCH NATIONAL TEAMS
// ============================================================================

async function searchNationalTeam(query: string): Promise<{ team: Team; players: Player[] } | null> {
  try {
    console.log(`📡 [Football Data API] Searching for national team: ${query}`);
    const queryLower = query.toLowerCase();
    
    // First try to find via World Cup competition
    const worldCupId = COMPETITION_IDS['world cup'];
    if (worldCupId) {
      const response = await fetch(`/api/football-proxy?endpoint=/competitions/${worldCupId}/teams`);
      
      if (response.ok) {
        const data = await response.json();
        const nationalTeam = data.teams?.find((team: any) => 
          team.name?.toLowerCase().includes(queryLower) ||
          team.tla?.toLowerCase() === queryLower
        );
        
        if (nationalTeam) {
          console.log(`✅ Found national team: ${nationalTeam.name} in World Cup competition`);
          return await fetchTeamDetails(nationalTeam.id);
        }
      }
    }
    
    // Fallback: Try to search by area/country
    const areasResponse = await fetch(`/api/football-proxy?endpoint=/areas`);
    if (areasResponse.ok) {
      const areas = await areasResponse.json();
      const matchedArea = areas.areas?.find((area: any) => 
        area.name?.toLowerCase().includes(queryLower)
      );
      
      if (matchedArea) {
        const teamResponse = await fetch(`/api/football-proxy?endpoint=/areas/${matchedArea.id}/teams`);
        if (teamResponse.ok) {
          const data = await teamResponse.json();
          const nationalTeam = data.teams?.find((team: any) => 
            team.type === 'NATIONAL'
          );
          
          if (nationalTeam) {
            console.log(`✅ Found national team: ${nationalTeam.name} via area ${matchedArea.name}`);
            return await fetchTeamDetails(nationalTeam.id);
          }
        }
      }
    }
    
    console.log(`[Football Data API] No national team match found for: ${query}`);
    return null;
    
  } catch (error) {
    console.error('[National Team Search] Error:', error);
    return null;
  }
}

// ============================================================================
// THESPORTSDB - PLAYER IMAGES ONLY
// ============================================================================

async function getTheSportsDBPlayerId(playerName: string): Promise<string | null> {
  const cacheKey = playerName.toLowerCase();
  if (playerIdCache.has(cacheKey)) {
    return playerIdCache.get(cacheKey)!;
  }
  
  const SPORTSDB_API_KEY = process.env.NEXT_PUBLIC_SPORTSDB_KEY || '3';
  
  try {
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchplayers.php?p=${encodeURIComponent(playerName)}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.player || !Array.isArray(data.player) || data.player.length === 0) {
      return null;
    }
    
    let matchedPlayer = data.player.find((p: any) => 
      p.strPlayer?.toLowerCase() === playerName.toLowerCase()
    );
    
    if (!matchedPlayer && data.player.length > 0) {
      matchedPlayer = data.player[0];
    }
    
    if (matchedPlayer && matchedPlayer.idPlayer) {
      const playerId = matchedPlayer.idPlayer;
      playerIdCache.set(cacheKey, playerId);
      console.log(`✅ [TheSportsDB] Found ID for ${playerName}: ${playerId}`);
      return playerId;
    }
    
    return null;
    
  } catch (error) {
    console.error(`[TheSportsDB] Error finding player ${playerName}:`, error);
    return null;
  }
}

async function fetchPlayerImageFromTheSportsDB(playerName: string): Promise<string | undefined> {
  try {
    const playerId = await getTheSportsDBPlayerId(playerName);
    if (!playerId) return undefined;
    
    const SPORTSDB_API_KEY = process.env.NEXT_PUBLIC_SPORTSDB_KEY || '3';
    
    const detailUrl = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/lookupplayer.php?id=${playerId}`;
    const response = await fetch(detailUrl);
    
    if (!response.ok) return undefined;
    
    const data = await response.json();
    if (data.players && data.players.length > 0) {
      const player = data.players[0];
      return player.strCutout || player.strThumb || player.strRender;
    }
    
    return undefined;
    
  } catch (error) {
    console.error(`[TheSportsDB] Error fetching image for ${playerName}:`, error);
    return undefined;
  }
}

async function enrichPlayersWithImages(players: Player[]): Promise<Player[]> {
  console.log(`🖼️ [TheSportsDB] Fetching images for ${players.length} players...`);
  
  const enrichedPlayers = [];
  let imagesFound = 0;
  
  const batchSize = 5;
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (player) => {
        const imageUrl = await fetchPlayerImageFromTheSportsDB(player.name);
        if (imageUrl) imagesFound++;
        return { ...player, _imageUrl: imageUrl };
      })
    );
    enrichedPlayers.push(...batchResults);
    
    if (i + batchSize < players.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ [TheSportsDB] Found images for ${imagesFound}/${players.length} players`);
  return enrichedPlayers;
}

// ============================================================================
// KNOWLEDGE BASE - TEAM ACHIEVEMENTS
// ============================================================================

const KNOWN_ACHIEVEMENTS: Record<string, Team['majorAchievements']> = {
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
  'manchester city': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2023)'],
    continental: ['1x UEFA Champions League (2023)'],
    domestic: ['10x Premier League', '7x FA Cup']
  },
  'manchester united': {
    worldCup: [],
    international: ['2x FIFA Club World Cup (2008, 2017)'],
    continental: ['3x UEFA Champions League'],
    domestic: ['20x Premier League', '12x FA Cup']
  },
  'liverpool': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2019)'],
    continental: ['6x UEFA Champions League'],
    domestic: ['19x Premier League', '8x FA Cup']
  },
  'bayern munich': {
    worldCup: [],
    international: ['2x FIFA Club World Cup (2013, 2020)'],
    continental: ['6x UEFA Champions League'],
    domestic: ['33x Bundesliga', '20x DFB-Pokal']
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
  'france': {
    worldCup: ['1998', '2018'],
    international: ['2x UEFA European Championship (1984, 2000)'],
    continental: [],
    domestic: []
  },
  'germany': {
    worldCup: ['1954', '1974', '1990', '2014'],
    international: ['3x UEFA European Championship (1972, 1980, 1996)'],
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
  'portugal': {
    worldCup: [],
    international: ['1x UEFA European Championship (2016)', '1x UEFA Nations League (2019)'],
    continental: [],
    domestic: []
  },
  'netherlands': {
    worldCup: ['1974', '1978', '2010'],
    international: ['1x UEFA European Championship (1988)'],
    continental: [],
    domestic: []
  },
  'belgium': {
    worldCup: [],
    international: ['2018 FIFA World Cup bronze', '1980 UEFA Euro runner-up'],
    continental: [],
    domestic: []
  }
};

async function fetchTeamAchievements(teamName: string): Promise<Team['majorAchievements']> {
  const teamLower = teamName.toLowerCase();
  
  for (const [key, achievements] of Object.entries(KNOWN_ACHIEVEMENTS)) {
    if (teamLower.includes(key) || key.includes(teamLower)) {
      console.log(`📖 [Knowledge Base] Found achievements for ${teamName}`);
      return achievements;
    }
  }
  
  return { worldCup: [], international: [], continental: [], domestic: [] };
}

// ============================================================================
// AI FUZZY MATCHING (Fallback for misspellings)
// ============================================================================

async function correctQueryWithAI(query: string, type: 'team' | 'player'): Promise<{
  corrected: string;
  confidence: number;
  original: string;
}> {
  console.log(`🤖 [AI FUZZY] Correcting ${type}: "${query}"`);
  
  const systemPrompt = `You are a football database expert. Correct misspelled ${type} names to their official name.
  
CRITICAL RULES:
1. Return ONLY the corrected name, nothing else
2. If the query is already correct, return it as-is
3. Fix typos, accents, missing letters, common misspellings
4. Use official club/national team names

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
// KNOWLEDGE BASE FALLBACK
// ============================================================================

async function searchKnowledgeBase(query: string): Promise<GROQSearchResponse> {
  const queryLower = query.toLowerCase();
  
  for (const [key, achievements] of Object.entries(KNOWN_ACHIEVEMENTS)) {
    if (queryLower.includes(key) || key.includes(queryLower)) {
      console.log(`✅ [Knowledge Base] Found: ${key}`);
      
      const team: Team = {
        name: key.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        type: detectTeamType(query),
        country: '',
        currentCoach: 'Information not available',
        majorAchievements: achievements,
        _source: 'Knowledge Base',
        _confidence: 60,
        _verified: false
      };
      
      return {
        players: [],
        teams: [team],
        youtubeQuery: `${query} highlights ${SEASON_YEAR}`,
        _metadata: {
          source: 'Knowledge Base',
          confidence: 60,
          season: CURRENT_SEASON,
          verified: false,
          hasSquad: false,
          warning: 'Limited data available from knowledge base'
        }
      };
    }
  }
  
  return {
    players: [],
    teams: [{
      name: query,
      type: detectTeamType(query),
      country: '',
      currentCoach: 'Unknown',
      majorAchievements: { worldCup: [], international: [], continental: [], domestic: [] },
      _source: 'Not Found',
      _confidence: 10,
      _verified: false
    }],
    youtubeQuery: `${query} football highlights`,
    _metadata: {
      source: 'Not Found',
      confidence: 10,
      season: CURRENT_SEASON,
      verified: false,
      hasSquad: false,
      warning: 'Team not found in any data source'
    }
  };
}

// ============================================================================
// MAIN TEAM SEARCH FUNCTION (HYBRID APPROACH)
// ============================================================================

async function searchTeam(query: string): Promise<GROQSearchResponse> {
  console.log(`🔍 [TEAM SEARCH] "${query}" - Season: ${CURRENT_SEASON}`);

  const verificationSteps: string[] = [];
  verificationSteps.push(`🔍 Original query: "${query}"`);
  
  // AI fuzzy matching
  verificationSteps.push('🤖 AI correcting misspellings...');
  const aiCorrected = await correctQueryWithAI(query, 'team');
  const searchQuery = aiCorrected.corrected;
  
  if (aiCorrected.original !== aiCorrected.corrected) {
    verificationSteps.push(`✅ AI corrected to: "${searchQuery}"`);
  } else {
    verificationSteps.push(`✅ Using query: "${searchQuery}"`);
  }
  
  // Check if this might be a national team
  const mightBeNational = COUNTRIES_LIST.some(country => 
    searchQuery.toLowerCase().includes(country)
  );
  
  let result = null;
  
  // Try national team search first for country names
  if (mightBeNational) {
    verificationSteps.push('🌍 Attempting national team search...');
    result = await searchNationalTeam(searchQuery);
    if (result) {
      verificationSteps.push(`✅ Found national team: ${result.team.name}`);
    }
  }
  
  // If not found, try club search
  if (!result) {
    verificationSteps.push('🏟️ Attempting club team search...');
    result = await searchFootballDataAPI(searchQuery);
    if (result) {
      verificationSteps.push(`✅ Found club team: ${result.team.name}`);
    }
  }
  
  if (result) {
    verificationSteps.push('📖 Fetching team achievements...');
    const achievements = await fetchTeamAchievements(result.team.name);
    result.team.majorAchievements = achievements;
    verificationSteps.push('✅ Achievements retrieved');
    
    verificationSteps.push('🖼️ Fetching player images from TheSportsDB...');
    const playersWithImages = await enrichPlayersWithImages(result.players);
    const imagesFound = playersWithImages.filter(p => p._imageUrl).length;
    verificationSteps.push(`✅ Found images for ${imagesFound}/${playersWithImages.length} players`);
    
    return {
      players: playersWithImages,
      teams: [result.team],
      youtubeQuery: `${result.team.name} highlights ${SEASON_YEAR}`,
      _metadata: {
        source: result.team._source || 'Football Data API',
        confidence: 95,
        season: CURRENT_SEASON,
        verified: true,
        hasSquad: true,
        squadCount: playersWithImages.length,
        imagesFound: imagesFound,
        verificationSteps,
        originalQuery: query,
        correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
      }
    };
  }
  
  verificationSteps.push('⚠️ No results from Football Data API, falling back to Knowledge Base...');
  const knowledgeBaseResult = await searchKnowledgeBase(searchQuery);
  
  if (knowledgeBaseResult._metadata?.source !== 'Not Found') {
    verificationSteps.push('✅ Found team in Knowledge Base');
    knowledgeBaseResult._metadata!.verificationSteps = verificationSteps;
    knowledgeBaseResult._metadata!.originalQuery = query;
    knowledgeBaseResult._metadata!.correctedQuery = aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined;
  }
  
  return knowledgeBaseResult;
}

// ============================================================================
// HISTORICAL PLAYERS FUNCTION
// ============================================================================

const LEGENDARY_PLAYERS: Record<string, Player[]> = {
  'real madrid': [
    {
      name: 'Cristiano Ronaldo',
      currentTeam: 'Al-Nassr',
      position: 'Forward',
      age: 39,
      nationality: 'Portuguese',
      careerGoals: 850,
      careerAssists: 250,
      internationalAppearances: 205,
      internationalGoals: 128,
      majorAchievements: ['5x Ballon d\'Or', '5x UEFA Champions League', 'UEFA Euro 2016 winner'],
      careerSummary: 'Real Madrid all-time top scorer with 450 goals in 438 appearances.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/8198-1675263293.jpg'
    },
    {
      name: 'Alfredo Di Stéfano',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Forward',
      age: 88,
      nationality: 'Argentine/Spanish',
      careerGoals: 308,
      majorAchievements: ['5x European Cup winner', '2x Ballon d\'Or'],
      careerSummary: 'Led Real Madrid to 5 consecutive European Cups.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString()
    },
    {
      name: 'Raúl González',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Forward',
      age: 47,
      nationality: 'Spanish',
      careerGoals: 323,
      majorAchievements: ['3x UEFA Champions League', '6x La Liga'],
      careerSummary: 'Real Madrid icon and former captain.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString()
    },
    {
      name: 'Iker Casillas',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Goalkeeper',
      age: 43,
      nationality: 'Spanish',
      majorAchievements: ['3x UEFA Champions League', '5x La Liga', '2010 FIFA World Cup winner'],
      careerSummary: 'One of the greatest goalkeepers of all time.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString()
    },
    {
      name: 'Zinedine Zidane',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Midfielder',
      age: 52,
      nationality: 'French',
      careerGoals: 156,
      majorAchievements: ['UEFA Champions League winner (2002)', '1998 FIFA World Cup winner'],
      careerSummary: 'Scored the iconic volley in the 2002 Champions League final.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString()
    }
  ],
  'bayern munich': [
    {
      name: 'Franz Beckenbauer',
      currentTeam: 'Bayern Munich (Legend)',
      position: 'Defender',
      age: 78,
      nationality: 'German',
      majorAchievements: ['2x Ballon d\'Or', '1974 FIFA World Cup winner', '3x European Cup winner'],
      careerSummary: '"Der Kaiser" - Revolutionized the sweeper position.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString()
    },
    {
      name: 'Gerd Müller',
      currentTeam: 'Bayern Munich (Legend)',
      position: 'Forward',
      age: 75,
      nationality: 'German',
      careerGoals: 525,
      majorAchievements: ['1974 FIFA World Cup winner', 'Ballon d\'Or 1970'],
      careerSummary: 'Der Bomber - One of the greatest goalscorers in history.',
      _source: 'Legends Database',
      _lastVerified: new Date().toISOString()
    }
  ]
};

export const getHistoricalPlayers = async (
  teamName: string, 
  teamType: 'club' | 'national', 
  language: string = 'en'
): Promise<Player[]> => {
  console.log(`🔍 [HISTORICAL] Fetching legends for: ${teamName}`);
  
  const teamLower = teamName.toLowerCase();
  
  for (const [key, legends] of Object.entries(LEGENDARY_PLAYERS)) {
    if (teamLower.includes(key)) {
      console.log(`✅ [HISTORICAL] Found ${legends.length} legends for ${key}`);
      return legends;
    }
  }
  
  return [];
};

// ============================================================================
// MAIN EXPORTED FUNCTION
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
    const result = isTeamSearch 
      ? await searchTeam(query)
      : { players: [], teams: [], youtubeQuery: `${query} highlights`, error: 'Player search not implemented in hybrid mode' };
    
    if (!bustCache) {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`💾 [CACHE] Stored result for: ${query} (${result._metadata?.confidence}% confidence)`);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('[GROQ] Search error:', error);
    return {
      players: [],
      teams: [],
      youtubeQuery: `${query} football`,
      error: 'Search failed',
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const searchFresh = async (query: string, isTeamSearch: boolean = true) => {
  return await searchWithGROQ(query, 'en', true, isTeamSearch);
};

export const clearSearchCache = () => {
  cache.clear();
  playerIdCache.clear();
  competitionTeamsCache.clear();
  console.log('🧹 Search cache cleared');
};

if (typeof window !== 'undefined') {
  (window as any).__GROQ_CACHE_CLEAR = () => {
    cache.clear();
    playerIdCache.clear();
    competitionTeamsCache.clear();
    console.log('🧹 GROQ in-memory cache cleared via window');
  };
}

export const getDataSourceInfo = (result: any) => ({
  source: result?._metadata?.source || 'Unknown',
  color: result?._metadata?.verified ? 'green' : 
         result?._metadata?.source?.includes('Football Data API') ? 'blue' : 
         result?._metadata?.source?.includes('Knowledge') ? 'purple' : 'gray',
  icon: result?._metadata?.verified ? '✅' : 
        result?._metadata?.source?.includes('Football Data API') ? '⚽' : 
        result?._metadata?.source?.includes('Knowledge') ? '📖' : '❓',
  confidence: result?._metadata?.confidence || 0,
  season: result?._metadata?.season || CURRENT_SEASON,
  verified: result?._metadata?.verified || false,
  warning: result?._metadata?.warning || null,
  verificationSteps: result?._metadata?.verificationSteps || [],
  originalQuery: result?._metadata?.originalQuery,
  correctedQuery: result?._metadata?.correctedQuery,
  imagesFound: result?._metadata?.imagesFound
});

export const getCurrentSeason = () => CURRENT_SEASON;