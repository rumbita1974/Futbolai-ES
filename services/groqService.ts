import Groq from 'groq-sdk';
import { isWikipediaConfigured, fetchFromWikipedia, enhanceGROQResponse } from '@/services/dataEnhancerService';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

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
  _wikiSummary?: string;
  _era?: string;
  _yearsAtTeam?: string;
  _needsVerification?: boolean;
  _priority?: 'high' | 'medium' | 'low';
  _updateReason?: string;
}

export interface Team {
  name: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  majorAchievements: {
    worldCup: string[];
    continental: string[];
    domestic: string[];
  };
  _source?: string;
  _lastVerified?: string;
  _updateReason?: string;
  _wikiSummary?: string;
  _achievementsUpdated?: boolean;
  _dataCurrency?: {
    lastTrained: string;
    enhanced: string;
    updatesApplied: string[];
    currentSeason: string;
    verification: {
      source: string;
      confidence: 'high' | 'medium' | 'low';
      timestamp: string;
    };
    disclaimer: string;
    recommendations: string[];
  };
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: {
    enhancedAt: string;
    analysis: any;
    appliedUpdates: string[];
    dataSources: string[];
    apiStatus: {
      wikipedia: string;
      groq: string;
    };
    currentSeason: string;
    dataCurrency: {
      aiCutoff: string;
      verifiedWith: string;
      confidence: string;
      lastVerified: string;
    };
    disclaimer: string;
    recommendations: string[];
    wikipediaUsage: {
      queries: number;
      updates: number;
      timestamp: string;
    };
    achievementCorrections?: string[];
  };
}

// Model configuration - Use only 8B for everything
const MODEL_CONFIG = {
  primary: 'llama-3.1-8b-instant' as const,
  fallback: 'llama-3.1-8b-instant' as const,
  historical: 'llama-3.1-8b-instant' as const,
};

// Cache for Wikipedia responses
const wikipediaCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// REMOVE ALL CRITICAL UPDATES - They're causing more harm than good
const CRITICAL_PLAYER_UPDATES_2024: Record<string, Partial<Player>> = {};
const CRITICAL_TEAM_UPDATES_2024: Record<string, Partial<Team>> = {};

// Always use 8B model for cost efficiency
const shouldUseFallbackModel = (query: string): boolean => {
  console.log(`[GROQ] Using 8B instant model for: "${query}"`);
  return false;
};

// Helper to determine query type
const determineQueryType = (query: string): 'national' | 'club' | 'player' | 'unknown' => {
  const queryLower = query.toLowerCase();
  
  const nationalTeams = [
    'españa', 'spain', 'espana', 'selección española',
    'argentina', 'brasil', 'brazil', 
    'france', 'francia', 'germany', 'alemania', 'deutschland',
    'italy', 'italia', 'portugal',
    'england', 'inglaterra', 'netherlands', 'holanda', 'nederland',
    'belgium', 'bélgica', 'croatia', 'croacia', 'hrvatska',
    'uruguay', 'chile', 'colombia', 'mexico', 'méxico',
    'usa', 'united states', 'estados unidos',
    'canada', 'canadá', 'japan', 'japón',
    'south korea', 'corea del sur', 'australia'
  ];
  
  const clubs = [
    'real madrid', 'barcelona', 'manchester',
    'bayern', 'psg', 'chelsea', 'liverpool',
    'arsenal', 'juventus', 'milan', 'inter',
    'dortmund', 'atlético', 'atletico', 'sevilla',
    'valencia', 'betis', 'villarreal'
  ];
  
  if (nationalTeams.some(team => queryLower.includes(team))) {
    return 'national';
  }
  
  if (clubs.some(club => queryLower.includes(club))) {
    return 'club';
  }
  
  return 'unknown';
};

// Player priority system - SIMPLIFIED
const getPlayerPriority = (player: Player): 'high' | 'medium' | 'low' => {
  const name = player.name.toLowerCase();
  
  // HIGH PRIORITY: Star players
  if (
    name.includes('messi') ||
    name.includes('ronaldo') ||
    name.includes('mbappe') ||
    name.includes('neymar') ||
    name.includes('benzema') ||
    name.includes('haaland')
  ) {
    return 'high';
  }
  
  // MEDIUM PRIORITY: Other well-known players
  if (
    name.includes('modric') ||
    name.includes('kane') ||
    name.includes('salah') ||
    name.includes('de bruyne') ||
    name.includes('lewandowski')
  ) {
    return 'medium';
  }
  
  return 'low';
};

const playerNeedsVerification = (player: Player): boolean => {
  const priority = getPlayerPriority(player);
  return priority === 'high' || priority === 'medium';
};

/**
 * Ensure achievements are properly formatted
 */
const ensureAchievementFormat = (team: Team): Team => {
  if (!team.majorAchievements) {
    return {
      ...team,
      majorAchievements: {
        worldCup: [],
        continental: [],
        domestic: []
      }
    };
  }
  
  // Ensure all achievement arrays exist
  const achievements = {
    worldCup: Array.isArray(team.majorAchievements.worldCup) ? team.majorAchievements.worldCup : [],
    continental: Array.isArray(team.majorAchievements.continental) ? team.majorAchievements.continental : [],
    domestic: Array.isArray(team.majorAchievements.domestic) ? team.majorAchievements.domestic : []
  };
  
  // Format world cup achievements
  achievements.worldCup = achievements.worldCup.map(ach => {
    if (typeof ach === 'string' && /^\d{4}$/.test(ach)) {
      return `FIFA World Cup (${ach})`; // Convert "1998" → "FIFA World Cup (1998)"
    }
    return ach;
  });
  
  return {
    ...team,
    majorAchievements: achievements
  };
};

/**
 * Apply critical updates - SIMPLIFIED (returns empty)
 */
const applyCriticalUpdates = (players: Player[]): { players: Player[]; updates: number } => {
  return { players, updates: 0 };
};

/**
 * Apply critical team updates - SIMPLIFIED (returns empty)
 */
const applyCriticalTeamUpdates = (teams: Team[]): { teams: Team[]; updates: number } => {
  return { teams, updates: 0 };
};

/**
 * Smart Wikipedia enhancement for players
 */
const smartEnhancePlayers = async (players: Player[]): Promise<{ players: Player[]; queries: number; updates: number }> => {
  if (!players.length) return { players, queries: 0, updates: 0 };
  
  let updates = 0;
  let queries = 0;
  const enhancedPlayers = [...players];
  
  // Limit to 5 players for Wikipedia checks
  const maxPlayersToCheck = Math.min(enhancedPlayers.length, 5);
  
  const prioritizedPlayers = enhancedPlayers
    .map((player, index) => ({
      player,
      index,
      priority: getPlayerPriority(player),
      needsVerification: playerNeedsVerification(player)
    }))
    .sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.priority === 'medium' && b.priority === 'low') return -1;
      return 0;
    })
    .slice(0, maxPlayersToCheck);
  
  // Process Wikipedia checks
  for (const { player, index } of prioritizedPlayers) {
    try {
      const cacheKey = `player_wiki_${player.name.toLowerCase()}`;
      const cached = wikipediaCache.get(cacheKey);
      const now = Date.now();
      
      let wikiData = null;
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        wikiData = cached.data;
      } else {
        queries++;
        wikiData = await fetchFromWikipedia(player.name);
        
        if (wikiData) {
          wikipediaCache.set(cacheKey, { data: wikiData, timestamp: now });
        }
      }
      
      if (wikiData && wikiData.summary) {
        enhancedPlayers[index] = {
          ...enhancedPlayers[index],
          _wikiSummary: wikiData.summary.substring(0, 200) + '...',
          _wikiFetchedAt: wikiData.fetchedAt || new Date().toISOString(),
          _source: enhancedPlayers[index]._source || 'Wikipedia Verified',
          _priority: getPlayerPriority(player),
          _needsVerification: false
        };
        
        updates++;
      }
    } catch (error) {
      console.error(`[Wikipedia] Enhancement failed for ${player.name}:`, error);
    }
  }
  
  // Add priority tags to all players
  enhancedPlayers.forEach(player => {
    if (!player._priority) {
      player._priority = getPlayerPriority(player);
    }
  });
  
  return { players: enhancedPlayers, queries, updates };
};

/**
 * Smart Wikipedia enhancement for teams
 */
const smartEnhanceTeams = async (teams: Team[]): Promise<{ teams: Team[]; queries: number; updates: number }> => {
  if (!teams.length) return { teams, queries: 0, updates: 0 };
  
  let updates = 0;
  let queries = 0;
  const enhancedTeams = [...teams];
  
  // Check the main team
  try {
    const team = enhancedTeams[0];
    const cacheKey = `team_wiki_${team.name.toLowerCase()}`;
    const cached = wikipediaCache.get(cacheKey);
    const now = Date.now();
    
    let wikiData = null;
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      wikiData = cached.data;
    } else {
      queries++;
      wikiData = await fetchFromWikipedia(team.name);
      
      if (wikiData) {
        wikipediaCache.set(cacheKey, { data: wikiData, timestamp: now });
      }
    }
    
    if (wikiData && wikiData.summary) {
      enhancedTeams[0] = {
        ...enhancedTeams[0],
        _wikiSummary: wikiData.summary.substring(0, 200) + '...',
        _wikiFetchedAt: wikiData.fetchedAt || new Date().toISOString(),
        _source: enhancedTeams[0]._source || 'Wikipedia Verified'
      };
      updates++;
    }
  } catch (error) {
    console.error(`[Wikipedia] Team enhancement failed:`, error);
  }
  
  return { teams: enhancedTeams, queries, updates };
};

/**
 * Main GROQ search function - SIMPLIFIED AND FIXED
 */
export const searchWithGROQ = async (query: string, language: string = 'en'): Promise<GROQSearchResponse> => {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('GROQ API key is missing. Check your .env.local file');
    return {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: 'GROQ API key not configured.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: 'Missing API key' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: { wikipedia: 'Not checked', groq: 'Missing key' },
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'GROQ API key missing.',
        recommendations: ['Check your .env.local file'],
        wikipediaUsage: { queries: 0, updates: 0, timestamp: new Date().toISOString() }
      }
    };
  }

  try {
    const model = MODEL_CONFIG.primary;
    
    console.log(`[GROQ] Searching for: "${query}" with model: ${model}, Language: ${language}`);
    
    // FIXED SYSTEM PROMPT - Much simpler and more effective
    const systemPrompt = language === 'es' ? `
ERES FutbolAI. Proporciona información de fútbol en formato JSON.

**IMPORTANTE: DEBES incluir SIEMPRE estos 3 campos:**
1. "players": Una lista de jugadores (mínimo 5, ideal 8-12)
2. "teams": Información del equipo
3. "youtubeQuery": Consulta para buscar videos
4. "message": Mensaje descriptivo

**EJEMPLO para "Francia":**
{
  "players": [
    {
      "name": "Kylian Mbappé",
      "currentTeam": "Paris Saint-Germain",
      "position": "Delantero",
      "age": 25,
      "nationality": "Francés",
      "careerGoals": 250,
      "careerAssists": 100,
      "internationalAppearances": 70,
      "internationalGoals": 40,
      "majorAchievements": ["FIFA World Cup (2018)", "Ligue 1 (6x)"],
      "careerSummary": "Delantero francés, campeón del mundo 2018"
    },
    {
      "name": "Antoine Griezmann",
      "currentTeam": "Atlético de Madrid",
      "position": "Delantero",
      "age": 33,
      "nationality": "Francés",
      "careerGoals": 200,
      "careerAssists": 120,
      "internationalAppearances": 120,
      "internationalGoals": 44,
      "majorAchievements": ["FIFA World Cup (2018)", "UEFA Europa League"],
      "careerSummary": "Delantero francés, clave en el Mundial 2018"
    }
    // MÁS JUGADORES...
  ],
  "teams": [{
    "name": "Francia",
    "type": "national",
    "country": "Francia",
    "currentCoach": "Didier Deschamps",
    "foundedYear": 1904,
    "majorAchievements": {
      "worldCup": ["FIFA World Cup (1998)", "FIFA World Cup (2018)"],
      "continental": ["UEFA European Championship (1984, 2000)"],
      "domestic": ["UEFA Nations League (2021)"]
    }
  }],
  "youtubeQuery": "Francia selección nacional goles 2024",
  "message": "Información de la selección francesa"
}

**FORMATO JSON EXACTO (NO OMITAS NINGÚN CAMPO):**
{
  "players": [{
    "name": "string",
    "currentTeam": "string",
    "position": "string",
    "age": number,
    "nationality": "string",
    "careerGoals": number,
    "careerAssists": number,
    "internationalAppearances": number,
    "internationalGoals": number,
    "majorAchievements": ["string"],
    "careerSummary": "string"
  }],
  "teams": [{
    "name": "string",
    "type": "national" o "club",
    "country": "string",
    "stadium": "string",
    "currentCoach": "string",
    "foundedYear": number,
    "majorAchievements": {
      "worldCup": ["string"],
      "continental": ["string"],
      "domestic": ["string"]
    }
  }],
  "youtubeQuery": "string",
  "message": "string"
}

**RECUERDA:** SIEMPRE incluye el array "players" con jugadores.
` : `
YOU ARE FutbolAI. Provide football information in JSON format.

**IMPORTANT: You MUST ALWAYS include these 4 fields:**
1. "players": A list of players (minimum 5, ideally 8-12)
2. "teams": Team information
3. "youtubeQuery": Query for video search
4. "message": Descriptive message

**EXAMPLE for "France":**
{
  "players": [
    {
      "name": "Kylian Mbappé",
      "currentTeam": "Paris Saint-Germain",
      "position": "Forward",
      "age": 25,
      "nationality": "French",
      "careerGoals": 250,
      "careerAssists": 100,
      "internationalAppearances": 70,
      "internationalGoals": 40,
      "majorAchievements": ["FIFA World Cup (2018)", "Ligue 1 (6x)"],
      "careerSummary": "French forward, 2018 World Cup champion"
    },
    {
      "name": "Antoine Griezmann",
      "currentTeam": "Atlético Madrid",
      "position": "Forward",
      "age": 33,
      "nationality": "French",
      "careerGoals": 200,
      "careerAssists": 120,
      "internationalAppearances": 120,
      "internationalGoals": 44,
      "majorAchievements": ["FIFA World Cup (2018)", "UEFA Europa League"],
      "careerSummary": "French forward, key player in 2018 World Cup"
    }
    // MORE PLAYERS...
  ],
  "teams": [{
    "name": "France",
    "type": "national",
    "country": "France",
    "currentCoach": "Didier Deschamps",
    "foundedYear": 1904,
    "majorAchievements": {
      "worldCup": ["FIFA World Cup (1998)", "FIFA World Cup (2018)"],
      "continental": ["UEFA European Championship (1984, 2000)"],
      "domestic": ["UEFA Nations League (2021)"]
    }
  }],
  "youtubeQuery": "France national team goals 2024",
  "message": "France national team information"
}

**EXACT JSON FORMAT (DO NOT OMIT ANY FIELDS):**
{
  "players": [{
    "name": "string",
    "currentTeam": "string",
    "position": "string",
    "age": number,
    "nationality": "string",
    "careerGoals": number,
    "careerAssists": number,
    "internationalAppearances": number,
    "internationalGoals": number,
    "majorAchievements": ["string"],
    "careerSummary": "string"
  }],
  "teams": [{
    "name": "string",
    "type": "national" or "club",
    "country": "string",
    "stadium": "string",
    "currentCoach": "string",
    "foundedYear": number,
    "majorAchievements": {
      "worldCup": ["string"],
      "continental": ["string"],
      "domestic": ["string"]
    }
  }],
  "youtubeQuery": "string",
  "message": "string"
}

**REMEMBER:** ALWAYS include the "players" array with players.
`;

    const userPrompt = language === 'es' 
      ? `Proporciona información sobre: "${query}". Incluye jugadores, equipo, youtubeQuery y mensaje.`
      : `Provide information about: "${query}". Include players, team, youtubeQuery, and message.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      model: model,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    console.log('[GROQ] Raw response:', response);
    
    if (!response || response.trim() === '') {
      return {
        players: [],
        teams: [],
        youtubeQuery: `${query} football highlights`,
        error: 'Received empty response from AI service',
        message: 'No data found for your query.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'Empty response' },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: { wikipedia: 'Not used', groq: 'Success' },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'AI returned empty response.',
          recommendations: ['Try a different search term'],
          wikipediaUsage: { queries: 0, updates: 0, timestamp: new Date().toISOString() }
        }
      };
    }

    try {
      const parsed = JSON.parse(response);
      console.log('[GROQ] Parsed response:', parsed);
      
      // CRITICAL FIX: Ensure players array exists
      if (!parsed.players || !Array.isArray(parsed.players)) {
        console.warn('[GROQ] AI did not return players array, creating empty array');
        parsed.players = [];
      }
      
      const playerCount = parsed.players.length;
      console.log(`[GROQ] Found ${playerCount} players in response`);
      
      // Ensure team achievements are properly formatted
      if (parsed.teams && Array.isArray(parsed.teams)) {
        parsed.teams = parsed.teams.map(ensureAchievementFormat);
      }
      
      // Use ENHANCED GROQ RESPONSE
      console.log('[GROQ] Using enhanced GROQ response from dataEnhancerService...');
      const wikipediaConfigured = isWikipediaConfigured();
      console.log('[GROQ] Wikipedia API configured:', wikipediaConfigured);
      
      let enhancedResult = parsed;
      let wikipediaQueries = 0;
      let wikipediaUpdates = 0;
      let achievementCorrections: string[] = [];
      
      if (wikipediaConfigured) {
        try {
          // Use enhanceGROQResponse for Wikipedia enhancement
          const enhancedResponse = await enhanceGROQResponse(enhancedResult, query);
          enhancedResult = enhancedResponse;
          
          if (enhancedResult._metadata) {
            wikipediaQueries = enhancedResult._metadata.wikipediaUsage?.queries || 0;
            wikipediaUpdates = enhancedResult._metadata.wikipediaUsage?.updates || 0;
            achievementCorrections = enhancedResult._metadata.achievementCorrections || [];
          }
          
          console.log(`[GROQ] Enhancement complete: ${wikipediaQueries} queries, ${wikipediaUpdates} updates`);
          
        } catch (enhanceError) {
          console.error('[GROQ] Enhancement via dataEnhancerService failed:', enhanceError);
          // Fall back to smart enhancement
          try {
            if (enhancedResult.players && enhancedResult.players.length > 0) {
              const enhancedPlayers = await smartEnhancePlayers(enhancedResult.players);
              enhancedResult.players = enhancedPlayers.players;
              wikipediaQueries += enhancedPlayers.queries;
              wikipediaUpdates += enhancedPlayers.updates;
            }
            
            if (enhancedResult.teams && enhancedResult.teams.length > 0) {
              const enhancedTeams = await smartEnhanceTeams(enhancedResult.teams);
              enhancedResult.teams = enhancedTeams.teams;
              wikipediaQueries += enhancedTeams.queries;
              wikipediaUpdates += enhancedTeams.updates;
            }
          } catch (smartError) {
            console.error('[GROQ] Smart enhancement also failed:', smartError);
          }
        }
      } else {
        console.log('[GROQ] Wikipedia API not configured, using basic result');
      }
      
      // Ensure final teams have proper achievement format
      if (enhancedResult.teams && Array.isArray(enhancedResult.teams)) {
        enhancedResult.teams = enhancedResult.teams.map(ensureAchievementFormat);
      }
      
      const queryType = determineQueryType(query);
      const isClub = queryType === 'club';
      const minPlayersRequired = isClub ? 5 : 8;
      const hasEnoughPlayers = playerCount >= minPlayersRequired;
      
      // Calculate achievement counts for metadata
      let worldCupCount = 0;
      let continentalCount = 0;
      let domesticCount = 0;
      
      if (enhancedResult.teams && enhancedResult.teams.length > 0) {
        const team = enhancedResult.teams[0];
        if (team.majorAchievements) {
          worldCupCount = team.majorAchievements.worldCup?.length || 0;
          continentalCount = team.majorAchievements.continental?.length || 0;
          domesticCount = team.majorAchievements.domestic?.length || 0;
        }
      }
      
      const result: GROQSearchResponse = {
        players: Array.isArray(enhancedResult.players) ? enhancedResult.players : [],
        teams: Array.isArray(enhancedResult.teams) ? enhancedResult.teams.slice(0, 1) : [],
        youtubeQuery: enhancedResult.youtubeQuery || `${query} football 2024 highlights`,
        message: enhancedResult.message || `Found information for "${query}"`,
        error: enhancedResult.error || null,
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: {
            playerCount: playerCount,
            isLikelyOutdated: !hasEnoughPlayers,
            outdatedFields: hasEnoughPlayers ? [] : ['player_count'],
            suggestions: hasEnoughPlayers ? 
              ['Data appears current'] : 
              [`Expected ${minPlayersRequired}+ players, got ${playerCount}`],
            needsEnhancement: wikipediaUpdates > 0,
            confidence: wikipediaUpdates > 0 ? 'high' : (hasEnoughPlayers ? 'medium' : 'low'),
            smartEnhancement: true,
            playersChecked: playerCount,
            playersUpdated: wikipediaUpdates,
            modelUsed: model,
            criticalUpdatesApplied: false,
            queryType: queryType,
            achievementCounts: {
              worldCup: worldCupCount,
              continental: continentalCount,
              domestic: domesticCount
            }
          },
          appliedUpdates: [],
          dataSources: ['GROQ AI', ...(wikipediaUpdates > 0 ? ['Wikipedia'] : [])],
          apiStatus: {
            wikipedia: wikipediaConfigured ? 'Enhanced' : 'Not configured',
            groq: 'Success'
          },
          currentSeason: '2024/2025',
          dataCurrency: {
            aiCutoff: 'October 2024',
            verifiedWith: wikipediaConfigured ? 'Wikipedia' : 'None',
            confidence: wikipediaUpdates > 0 ? 'high' : (hasEnoughPlayers ? 'medium' : 'low'),
            lastVerified: new Date().toISOString()
          },
          disclaimer: wikipediaConfigured 
            ? `Wikipedia verification applied. ${wikipediaUpdates} updates.`
            : 'Wikipedia API not configured.',
          recommendations: hasEnoughPlayers ? [
            'Data verified with 2024-2025 updates',
            'Check official club websites for latest transfers'
          ] : [
            `Expected more players (got ${playerCount}, expected ${minPlayersRequired}+)`,
            'Try more specific search terms',
            'The AI might not have complete squad data'
          ],
          wikipediaUsage: {
            queries: wikipediaQueries,
            updates: wikipediaUpdates,
            timestamp: new Date().toISOString()
          },
          achievementCorrections
        }
      };
      
      // Add player count and update info to message
      let playerCountNote = '';
      if (playerCount > 0) {
        playerCountNote = language === 'es' 
          ? ` • ${playerCount} jugadores`
          : ` • ${playerCount} players`;
      }
      
      if (result.message) {
        result.message = `${result.message}${playerCountNote}`;
      }
      
      console.log(`[GROQ] Final response: ${result.players.length} players, ${result.teams.length} teams`);
      console.log('[GROQ] Model used:', model);
      return result;
      
    } catch (parseError) {
      console.error('[GROQ] Failed to parse JSON response:', parseError);
      
      // Try to extract JSON from text
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('[GROQ] Attempting to extract JSON from text...');
          const extracted = JSON.parse(jsonMatch[0]);
          
          // Ensure players array exists
          if (!extracted.players || !Array.isArray(extracted.players)) {
            extracted.players = [];
          }
          
          // Ensure achievement format
          if (extracted.teams && Array.isArray(extracted.teams)) {
            extracted.teams = extracted.teams.map(ensureAchievementFormat);
          }
          
          return {
            players: Array.isArray(extracted.players) ? extracted.players : [],
            teams: Array.isArray(extracted.teams) ? extracted.teams.slice(0, 1) : [],
            youtubeQuery: extracted.youtubeQuery || `${query} football highlights`,
            message: extracted.message || `Found information for "${query}"`,
            error: null,
            _metadata: {
              enhancedAt: new Date().toISOString(),
              analysis: { note: 'Response extracted from text' },
              appliedUpdates: [],
              dataSources: ['GROQ AI (extracted)'],
              apiStatus: { wikipedia: 'Not used', groq: 'Success' },
              currentSeason: '2024/2025',
              dataCurrency: {
                aiCutoff: '2024',
                verifiedWith: 'None',
                confidence: 'medium',
                lastVerified: new Date().toISOString()
              },
              disclaimer: 'Response required extraction.',
              recommendations: ['Verify with official sources'],
              wikipediaUsage: { queries: 0, updates: 0, timestamp: new Date().toISOString() }
            }
          };
        }
      } catch (secondError) {
        console.error('[GROQ] Failed to extract JSON:', secondError);
      }
      
      return {
        players: [],
        teams: [],
        youtubeQuery: `${query} football highlights`,
        error: 'Failed to parse AI response.',
        message: 'Technical error processing the response.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'JSON parse failed' },
          appliedUpdates: [],
          dataSources: [],
          apiStatus: { wikipedia: 'Not used', groq: 'Success' },
          currentSeason: '2024/2025',
          dataCurrency: {
            aiCutoff: 'N/A',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'Could not parse AI response.',
          recommendations: ['Try again with a different query'],
          wikipediaUsage: { queries: 0, updates: 0, timestamp: new Date().toISOString() }
        }
      };
    }

  } catch (error: any) {
    console.error('[GROQ] API Error:', error);
    
    const errorResponse: GROQSearchResponse = {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: `Search failed: ${error.message || 'Unknown error'}`,
      message: 'Failed to fetch data. Please try again.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: true, errorType: error?.status || 'unknown' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: {
          wikipedia: 'Not used',
          groq: error?.status === 401 ? 'Invalid key' : 'Error'
        },
        currentSeason: '2024/2025',
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'API request failed.',
        recommendations: ['Check your internet connection', 'Verify API keys'],
        wikipediaUsage: { queries: 0, updates: 0, timestamp: new Date().toISOString() }
      }
    };
    
    if (error?.status === 401) {
      errorResponse.error = 'Invalid GROQ API key.';
      errorResponse._metadata!.recommendations = ['Verify your GROQ API key is correct'];
    }
    
    if (error?.status === 429) {
      errorResponse.error = 'Rate limit exceeded. Please wait a moment and try again.';
      errorResponse._metadata!.recommendations = ['Wait 60 seconds before trying again'];
    }
    
    return errorResponse;
  }
};

// Alias for backward compatibility
export const GROQSearch = searchWithGROQ;

/**
 * Get historical/legendary players for a team with dynamic era naming
 */
export const getHistoricalPlayers = async (teamName: string, teamType: 'club' | 'national', language: string = 'en'): Promise<Player[]> => {
  try {
    console.log(`[GROQ] Fetching historical players for: "${teamName}"`);
    
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[GROQ] API key missing for historical players');
      return [];
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a football historian. Provide information about legendary/iconic players.

${language === 'es' ? 'RESPONDE EN ESPAÑOL.' : 'RESPOND IN ENGLISH.'}

Return JSON with this exact structure:
{
  "legendaryPlayers": [{
    "name": "string",
    "era": "string (specific era like '1978 World Cup Squad', 'Galácticos Era', etc.)",
    "position": "string",
    "nationality": "string",
    "yearsAtTeam": "string",
    "achievementsWithTeam": ["string"],
    "legacySummary": "string"
  }]
}

${language === 'es' ? 'Proporciona 8-12 jugadores legendarios.' : 'Return 8-12 legendary players.'}`
        },
        {
          role: 'user',
          content: `${language === 'es' ? 
            `Proporciona información sobre jugadores legendarios de ${teamName}.` : 
            `Provide information about legendary players from ${teamName}.`}`
        }
      ],
      model: MODEL_CONFIG.historical,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.log('[GROQ] No response for historical players');
      return [];
    }

    try {
      const parsed = JSON.parse(response);
      if (parsed.legendaryPlayers && Array.isArray(parsed.legendaryPlayers)) {
        console.log(`[GROQ] Found ${parsed.legendaryPlayers.length} historical players`);
        
        return parsed.legendaryPlayers.map((legend: any) => ({
          name: legend.name,
          currentTeam: teamName,
          position: legend.position,
          nationality: legend.nationality,
          age: undefined,
          careerGoals: undefined,
          careerAssists: undefined,
          internationalAppearances: undefined,
          internationalGoals: undefined,
          majorAchievements: legend.achievementsWithTeam || [],
          careerSummary: legend.legacySummary || `${legend.name} is a legendary player for ${teamName}.`,
          _source: 'Historical Legend',
          _era: legend.era,
          _yearsAtTeam: legend.yearsAtTeam,
          _priority: 'low'
        }));
      }
      return [];
    } catch (error) {
      console.error('[GROQ] Failed to parse historical players response:', error);
      return [];
    }
  } catch (error) {
    console.error('[GROQ] Error fetching historical players:', error);
    return [];
  }
};

/**
 * Helper to check if data needs verification
 */
export const needsDataVerification = (response: GROQSearchResponse): boolean => {
  if (!response._metadata) return true;
  
  if (response._metadata.analysis?.isLikelyOutdated) return true;
  if (response._metadata.analysis?.outdatedFields?.length > 0) return true;
  
  const playerCount = response.players.length;
  const queryType = response._metadata.analysis?.queryType;
  const minRequired = queryType === 'club' ? 5 : 8;
  
  if (playerCount < minRequired) {
    return true;
  }
  
  return false;
};

/**
 * Get data source badge info
 */
export const getDataSourceInfo = (response: GROQSearchResponse): {
  source: string;
  color: string;
  icon: string;
} => {
  if (!response._metadata) {
    return { source: 'Unverified', color: 'gray', icon: '❓' };
  }
  
  if (response._metadata.wikipediaUsage?.updates > 0) {
    return { source: 'Wikipedia Enhanced', color: 'green', icon: '✅' };
  }
  
  if (response._metadata.wikipediaUsage?.queries > 0) {
    return { source: 'Wikipedia Verified', color: 'blue', icon: '🌐' };
  }
  
  return { source: 'AI Data', color: 'yellow', icon: '🤖' };
};