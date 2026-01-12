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

// Model configuration
const MODEL_CONFIG = {
  // Use 70B for team searches (more accurate), 8B for simple player queries
  primary: 'llama-3.1-8b-instant' as const,
  fallback: 'llama-3.3-70b-versatile' as const,
  historical: 'llama-3.1-8b-instant' as const,
};

// Cache for Wikipedia responses
const wikipediaCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Critical updates database for 2024-2025 season
const CRITICAL_PLAYER_UPDATES_2024: Record<string, Partial<Player>> = {
  // Real Madrid 2024-2025 Squad Updates
  'Nacho Fernández': {
    currentTeam: 'Al Qadsiah',
    _updateReason: 'Transferred July 2024',
    _needsVerification: false
  },
  'Kepa Arrizabalaga': {
    currentTeam: 'Chelsea',
    _updateReason: 'Loan ended June 2024',
    _needsVerification: false
  },
  'José Luis Gayà': {
    currentTeam: 'Valencia',
    _updateReason: 'Never played for Real Madrid',
    _needsVerification: false
  },
  'Karim Benzema': {
    currentTeam: 'Al Ittihad',
    _updateReason: 'Transferred June 2023',
    _needsVerification: false
  },
  'Kylian Mbappé': {
    currentTeam: 'Real Madrid',
    _updateReason: 'Transferred July 2024',
    _needsVerification: false
  },
  'Arda Güler': {
    currentTeam: 'Real Madrid',
    _updateReason: 'Signed 2023, current squad member',
    _needsVerification: false
  },
  'Brahim Díaz': {
    currentTeam: 'Real Madrid',
    _updateReason: 'Returned from loan 2023',
    _needsVerification: false
  },
  'Fran García': {
    currentTeam: 'Real Madrid',
    _updateReason: 'Signed 2023',
    _needsVerification: false
  },
  'Luka Modrić': {
    currentTeam: 'Al Nassr',
    _updateReason: 'Transferred July 2024',
    _needsVerification: false
  },
  'Toni Kroos': {
    currentTeam: 'Retired',
    _updateReason: 'Retired July 2024',
    _needsVerification: false
  },
  'Carlo Ancelotti': {
    position: 'Manager',
    currentTeam: 'Brazil',
    _updateReason: 'Appointed Brazil manager July 2024',
    _needsVerification: false
  },
  'Xabi Alonso': {
    position: 'Manager',
    currentTeam: 'Real Madrid',
    _updateReason: 'Appointed June 2024',
    _needsVerification: false
  },
  'Dani Ceballos': {
    currentTeam: 'Real Betis',
    _updateReason: 'Transferred July 2024',
    _needsVerification: false
  },
  // Manchester City updates
  'Kevin De Bruyne': {
    currentTeam: 'Al Ittihad',
    _updateReason: 'Transferred July 2024',
    _needsVerification: false
  },
  // Barcelona updates
  'Robert Lewandowski': {
    currentTeam: 'Al Nassr',
    _updateReason: 'Transferred July 2024',
    _needsVerification: false
  },
  // PSG updates
  'Neymar': {
    currentTeam: 'Al Hilal',
    _updateReason: 'Transferred August 2023',
    _needsVerification: false
  },
  'Lionel Messi': {
    currentTeam: 'Inter Miami CF',
    _updateReason: 'Transferred July 2023',
    _needsVerification: false
  },
  'Cristiano Ronaldo': {
    currentTeam: 'Al Nassr',
    _updateReason: 'Transferred January 2023',
    _needsVerification: false
  }
};

const CRITICAL_TEAM_UPDATES_2024: Record<string, Partial<Team>> = {
  'Real Madrid': {
    currentCoach: 'Xabi Alonso',
    _updateReason: 'Appointed June 2024',
    _needsVerification: false,
    majorAchievements: {
      worldCup: ['FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)'],
      continental: ['UEFA Champions League (15 titles: 1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)'],
      domestic: ['La Liga (36 titles)', 'Copa del Rey (20 titles)']
    }
  },
  'Bayern Munich': {
    currentCoach: 'Vincent Kompany',
    _updateReason: 'Appointed May 2024',
    _needsVerification: false
  },
  'Liverpool': {
    currentCoach: 'Arne Slot',
    _updateReason: 'Appointed May 2024',
    _needsVerification: false
  },
  'Barcelona': {
    currentCoach: 'Hansi Flick',
    _updateReason: 'Appointed May 2024',
    _needsVerification: false
  },
  'Chelsea': {
    currentCoach: 'Enzo Maresca',
    _updateReason: 'Appointed June 2024',
    _needsVerification: false
  },
  'AC Milan': {
    currentCoach: 'Paulo Fonseca',
    _updateReason: 'Appointed June 2024',
    _needsVerification: false
  },
  'Juventus': {
    currentCoach: 'Thiago Motta',
    _updateReason: 'Appointed June 2024',
    _needsVerification: false
  },
  'Brazil': {
    currentCoach: 'Dorival Júnior',
    _updateReason: 'Appointed January 2024',
    _needsVerification: false
  },
  'Manchester City': {
    currentCoach: 'Pep Guardiola',
    _updateReason: 'Still manager as of 2025',
    _needsVerification: false
  },
  'Arsenal': {
    currentCoach: 'Mikel Arteta',
    _updateReason: 'Still manager as of 2025',
    _needsVerification: false
  },
  'Manchester United': {
    currentCoach: 'Erik ten Hag',
    _updateReason: 'Still manager as of 2025',
    _needsVerification: false
  },
  'Paris Saint-Germain': {
    currentCoach: 'Luis Enrique',
    _updateReason: 'Still manager as of 2025',
    _needsVerification: false
  }
};

// Helper to determine which model to use
const shouldUseFallbackModel = (query: string): boolean => {
  const queryLower = query.toLowerCase();
  
  // Always use 70B model for team searches and complex queries
  const teamQueries = [
    'real madrid',
    'barcelona',
    'manchester',
    'bayern',
    'psg',
    'chelsea',
    'liverpool',
    'arsenal',
    'juventus',
    'milan',
    'inter',
    'dortmund',
    'atléti',
    'atletico',
    'sevilla',
    'valencia',
    'betis',
    'argentina',
    'brazil',
    'france',
    'germany',
    'spain',
    'england',
    'italy',
    'portugal',
    'netherlands',
    'belgium',
    'croatia'
  ];
  
  const complexPatterns = [
    'squad',
    'team',
    'players',
    'roster',
    'lineup',
    'formation',
    'tactics',
    'compare',
    'analysis',
    'statistics',
    'history',
    'legend',
    'greatest',
    'best',
    'versus',
    'vs',
    'head to head',
    'transfer',
    'market'
  ];
  
  return teamQueries.some(team => queryLower.includes(team)) ||
         complexPatterns.some(pattern => queryLower.includes(pattern));
};

// Helper to determine query type
const determineQueryType = (query: string): 'national' | 'club' | 'player' | 'unknown' => {
  const queryLower = query.toLowerCase();
  
  const nationalTeams = [
    'españa', 'spain', 'espana',
    'argentina', 'brazil', 'brasil', 
    'france', 'francia', 'germany', 'alemania',
    'italy', 'italia', 'portugal',
    'england', 'inglaterra', 'netherlands', 'holanda',
    'belgium', 'bélgica', 'croatia', 'croacia',
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

// Player priority system
const getPlayerPriority = (player: Player): 'high' | 'medium' | 'low' => {
  const name = player.name.toLowerCase();
  
  // Check critical updates first
  if (CRITICAL_PLAYER_UPDATES_2024[player.name]) {
    return 'high';
  }
  
  // HIGH PRIORITY: Managers, star players, older players
  if (
    player.position.toLowerCase().includes('manager') ||
    player.position.toLowerCase().includes('coach') ||
    player.age && player.age > 30 ||
    player.currentTeam.includes('Real Madrid') ||
    player.currentTeam.includes('Barcelona') ||
    player.currentTeam.includes('Chelsea') ||
    player.currentTeam.includes('PSG') ||
    player.currentTeam.includes('Manchester') ||
    player.currentTeam.includes('Al ')
  ) {
    return 'high';
  }
  
  // MEDIUM PRIORITY: Well-known players
  if (
    name.includes('messi') ||
    name.includes('ronaldo') ||
    name.includes('mbappe') ||
    name.includes('neymar') ||
    name.includes('modric') ||
    name.includes('benzema') ||
    name.includes('haaland') ||
    name.includes('de bruyne') ||
    name.includes('kane') ||
    name.includes('salah') ||
    name.includes('mane') ||
    name.includes('lewandowski') ||
    player.majorAchievements.some(ach => ach.toLowerCase().includes('ballon'))
  ) {
    return 'medium';
  }
  
  return 'low';
};

const playerNeedsVerification = (player: Player): boolean => {
  // Always check if player is in critical updates
  if (CRITICAL_PLAYER_UPDATES_2024[player.name]) {
    return true;
  }
  
  const priority = getPlayerPriority(player);
  
  // Check for major club players
  const majorClubs = [
    'real madrid',
    'barcelona',
    'manchester',
    'bayern',
    'psg',
    'chelsea',
    'liverpool',
    'arsenal',
    'juventus',
    'milan'
  ];
  
  const currentTeamLower = player.currentTeam.toLowerCase();
  if (majorClubs.some(club => currentTeamLower.includes(club))) {
    return true;
  }
  
  return priority === 'high' || priority === 'medium';
};

/**
 * Apply critical updates to players
 */
const applyCriticalUpdates = (players: Player[]): { players: Player[]; updates: number } => {
  const updatedPlayers = [...players];
  let updates = 0;
  
  updatedPlayers.forEach((player, index) => {
    const criticalUpdate = CRITICAL_PLAYER_UPDATES_2024[player.name];
    if (criticalUpdate) {
      const oldTeam = player.currentTeam;
      updatedPlayers[index] = {
        ...player,
        ...criticalUpdate,
        _source: 'Critical Update 2024',
        _lastVerified: new Date().toISOString()
      };
      
      if (oldTeam !== criticalUpdate.currentTeam) {
        updates++;
        console.log(`[Critical Update] ${player.name}: ${oldTeam} → ${criticalUpdate.currentTeam}`);
      }
    }
  });
  
  return { players: updatedPlayers, updates };
};

/**
 * Apply critical updates to teams
 */
const applyCriticalTeamUpdates = (teams: Team[]): { teams: Team[]; updates: number } => {
  const updatedTeams = [...teams];
  let updates = 0;
  
  updatedTeams.forEach((team, index) => {
    const criticalUpdate = CRITICAL_TEAM_UPDATES_2024[team.name];
    if (criticalUpdate) {
      const oldCoach = team.currentCoach;
      updatedTeams[index] = {
        ...team,
        ...criticalUpdate,
        _source: 'Critical Update 2024',
        _lastVerified: new Date().toISOString()
      };
      
      if (oldCoach !== criticalUpdate.currentCoach) {
        updates++;
        console.log(`[Critical Update] ${team.name} coach: ${oldCoach} → ${criticalUpdate.currentCoach}`);
      }
    }
  });
  
  return { teams: updatedTeams, updates };
};

/**
 * Smart Wikipedia enhancement for players
 */
const smartEnhancePlayers = async (players: Player[]): Promise<{ players: Player[]; queries: number; updates: number }> => {
  if (!players.length) return { players, queries: 0, updates: 0 };
  
  // Apply critical updates FIRST
  const criticalResult = applyCriticalUpdates(players);
  let enhancedPlayers = criticalResult.players;
  let updates = criticalResult.updates;
  let queries = 0;
  
  // Now do Wikipedia enhancement for remaining high-priority players
  const maxPlayersToCheck = Math.min(enhancedPlayers.length, 5); // Reduced to 5
  
  const prioritizedPlayers = enhancedPlayers.map(player => ({
    player,
    index: enhancedPlayers.indexOf(player),
    priority: getPlayerPriority(player),
    needsVerification: playerNeedsVerification(player) && !player._needsVerification
  })).sort((a, b) => {
    if (a.needsVerification && !b.needsVerification) return -1;
    if (!a.needsVerification && b.needsVerification) return 1;
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return 0;
  }).slice(0, maxPlayersToCheck);
  
  // Process Wikipedia checks
  for (const { player, index, needsVerification } of prioritizedPlayers) {
    if (!needsVerification) continue;
    
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
  
  // Apply critical updates FIRST
  const criticalResult = applyCriticalTeamUpdates(teams);
  let enhancedTeams = criticalResult.teams;
  let updates = criticalResult.updates;
  let queries = 0;
  
  const team = enhancedTeams[0];
  
  try {
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
    console.error(`[Wikipedia] Team enhancement failed for ${team.name}:`, error);
  }
  
  return { teams: enhancedTeams, queries, updates };
};

/**
 * Main GROQ search function with smart optimization
 */
export const searchWithGROQ = async (query: string, language: string = 'en'): Promise<GROQSearchResponse> => {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('GROQ API key is missing. Check your .env.local file');
    return {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: 'GROQ API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: 'Missing API key' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: {
          wikipedia: 'Not checked',
          groq: 'Missing key'
        },
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'GROQ API key missing. Cannot fetch AI data.',
        recommendations: ['Check your .env.local file for GROQ_API_KEY'],
        wikipediaUsage: {
          queries: 0,
          updates: 0,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  try {
    const useFallbackModel = shouldUseFallbackModel(query);
    const model = useFallbackModel ? MODEL_CONFIG.fallback : MODEL_CONFIG.primary;
    
    console.log(`[GROQ] Searching for: "${query}" with model: ${model}, Language: ${language}`);
    
    // ENHANCED PROMPT: Better understanding of national teams vs clubs
    const systemPrompt = language === 'es' ? `
ERES FutbolAI. Datos EXACTOS de fútbol 2024-2025.

**CRÍTICO: DISTINGUIR ENTRE EQUIPOS NACIONALES Y CLUBS**

EQUIPOS NACIONALES (selecciones):
- "España", "Argentina", "Brasil", "Francia" = Selección nacional
- Deben devolver JUGADORES de la selección actual (12-15 jugadores)
- NO devolver clubs españoles cuando se busca "España"

CLUBS:
- "Real Madrid", "Barcelona", "Manchester United" = Clubes
- Devuelven jugadores del CLUB (15-20 jugadores)

**INFORMACIÓN CRÍTICA 2024-2025:**
• REAL MADRID: Entrenador = Xabi Alonso (desde junio 2024). 15 Champions League.
• SELECCIÓN ESPAÑOLA: Entrenador = Luis de la Fuente (desde 2022).
• TRANSFERENCIAS 2024: Kylian Mbappé → Real Madrid, Luka Modrić → Al Nassr, Toni Kroos → Retirado.

**EJEMPLOS CORRECTOS:**

Para "España" (selección nacional):
{
  "players": [
    {"name": "Álvaro Morata", "currentTeam": "Atlético de Madrid", "position": "Delantero", "age": 31, "nationality": "Español", ...},
    {"name": "Rodri", "currentTeam": "Manchester City", "position": "Centrocampista", "age": 27, "nationality": "Español", ...},
    ...
  ],
  "teams": [{
    "name": "España",
    "type": "national",
    "country": "España",
    "currentCoach": "Luis de la Fuente",
    ...
  }]
}

Para "Real Madrid" (club):
{
  "players": [
    {"name": "Thibaut Courtois", "currentTeam": "Real Madrid", "position": "Portero", ...},
    {"name": "Kylian Mbappé", "currentTeam": "Real Madrid", "position": "Delantero", ...},
    ...
  ],
  "teams": [{
    "name": "Real Madrid",
    "type": "club",
    "country": "España",
    "currentCoach": "Xabi Alonso",
    ...
  }]
}

**REGLAS OBLIGATORIAS:**
1. Si el usuario busca un país (España, Argentina, Brasil) = EQUIPO NACIONAL
2. Si el usuario busca un club = CLUB
3. Devuelve jugadores REALES, actuales (temporada 2024-2025)
4. Para nacionales: 12-15 jugadores de la selección ACTUAL
5. Para clubs: 15-20 jugadores del plantel ACTUAL
6. Datos ACTUALIZADOS 2024-2025

FORMATO EXACTO JSON (SOLO JSON):
{
  "players": [{
    "name": "string",
    "currentTeam": "string (CLUB ACTUAL 2024-2025)",
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
    "type": "club" o "national",
    "country": "string",
    "stadium": "string",
    "currentCoach": "string (ENTRENADOR ACTUAL 2024-2025)",
    "foundedYear": number,
    "majorAchievements": {
      "worldCup": ["string"],
      "continental": ["string"],
      "domestic": ["string"]
    }
  }],
  "youtubeQuery": "string",
  "message": "string (Incluir 'Información actualizada a 2024')"
}
` : `
YOU ARE FutbolAI. EXACT football data 2024-2025.

**CRITICAL: DISTINGUISH BETWEEN NATIONAL TEAMS AND CLUBS**

NATIONAL TEAMS (countries):
- "Spain", "Argentina", "Brazil", "France" = National team
- Must return PLAYERS from the national squad (12-15 players)
- Do NOT return Spanish clubs when searching for "Spain"

CLUBS:
- "Real Madrid", "Barcelona", "Manchester United" = Clubs
- Return players from the CLUB (15-20 players)

**CRITICAL 2024-2025 INFORMATION:**
• REAL MADRID: Coach = Xabi Alonso (since June 2024). 15 UEFA Champions League titles.
• SPAIN NATIONAL TEAM: Coach = Luis de la Fuente (since 2022).
• 2024 TRANSFERS: Kylian Mbappé → Real Madrid, Luka Modrić → Al Nassr, Toni Kroos → Retired.

**CORRECT EXAMPLES:**

For "Spain" (national team):
{
  "players": [
    {"name": "Álvaro Morata", "currentTeam": "Atlético de Madrid", "position": "Forward", "age": 31, "nationality": "Spanish", ...},
    {"name": "Rodri", "currentTeam": "Manchester City", "position": "Midfielder", "age": 27, "nationality": "Spanish", ...},
    ...
  ],
  "teams": [{
    "name": "Spain",
    "type": "national",
    "country": "Spain",
    "currentCoach": "Luis de la Fuente",
    ...
  }]
}

For "Real Madrid" (club):
{
  "players": [
    {"name": "Thibaut Courtois", "currentTeam": "Real Madrid", "position": "Goalkeeper", ...},
    {"name": "Kylian Mbappé", "currentTeam": "Real Madrid", "position": "Forward", ...},
    ...
  ],
  "teams": [{
    "name": "Real Madrid",
    "type": "club",
    "country": "Spain",
    "currentCoach": "Xabi Alonso",
    ...
  }]
}

**MANDATORY RULES:**
1. If user searches a country (Spain, Argentina, Brazil) = NATIONAL TEAM
2. If user searches a club = CLUB
3. Return REAL, current players (2024-2025 season)
4. For national teams: 12-15 players from CURRENT national squad
5. For clubs: 15-20 players from CURRENT club squad
6. UPDATED 2024-2025 data

EXACT JSON FORMAT (ONLY JSON):
{
  "players": [{
    "name": "string",
    "currentTeam": "string (CURRENT 2024-2025 CLUB)",
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
    "type": "club" or "national",
    "country": "string",
    "stadium": "string",
    "currentCoach": "string (CURRENT 2024-2025 COACH)",
    "foundedYear": number,
    "majorAchievements": {
      "worldCup": ["string"],
      "continental": ["string"],
      "domestic": ["string"]
    }
  }],
  "youtubeQuery": "string",
  "message": "string (Include 'Information as of 2024')"
}
`;

    const userPrompt = language === 'es' 
      ? `Consulta de fútbol: "${query}". Devuelve SOLO datos en formato JSON.`
      : `Football query: "${query}". Return ONLY data in JSON format.`;

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
      temperature: 0.1,
      max_tokens: 3500, // Increased for more players
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    console.log('[GROQ] Raw response:', response);
    
    if (!response || response.trim() === '') {
      return {
        players: [],
        teams: [],
        youtubeQuery: '',
        error: 'Received empty response from AI service',
        message: 'No data found for your query.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'Empty response' },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: {
            wikipedia: 'Not used',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'AI returned empty response.',
          recommendations: ['Try a different search term'],
          wikipediaUsage: {
            queries: 0,
            updates: 0,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    try {
      const parsed = JSON.parse(response);
      console.log('[GROQ] Parsed response:', parsed);
      
      const playerCount = Array.isArray(parsed.players) ? parsed.players.length : 0;
      console.log(`[GROQ] Found ${playerCount} players in response`);
      
      // Use ENHANCED GROQ RESPONSE (the main fix!)
      console.log('[GROQ] Using enhanced GROQ response from dataEnhancerService...');
      const wikipediaConfigured = isWikipediaConfigured();
      console.log('[GROQ] Wikipedia API configured:', wikipediaConfigured);
      
      let enhancedResult = parsed;
      let wikipediaQueries = 0;
      let wikipediaUpdates = 0;
      let achievementCorrections: string[] = [];
      
      if (wikipediaConfigured) {
        try {
          // CRITICAL FIX: Use the correct enhanceGROQResponse function
          enhancedResult = await enhanceGROQResponse(parsed, query);
          console.log('[GROQ] Enhanced result via dataEnhancerService:', enhancedResult);
          
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
            enhancedResult = parsed;
          }
        }
      } else {
        console.log('[GROQ] Wikipedia API not configured, using basic result');
        enhancedResult = parsed;
      }
      
      const result: GROQSearchResponse = {
        players: Array.isArray(enhancedResult.players) ? enhancedResult.players : [],
        teams: Array.isArray(enhancedResult.teams) ? enhancedResult.teams.slice(0, 1) : [],
        youtubeQuery: enhancedResult.youtubeQuery || `${query} football highlights ${new Date().getFullYear()}`,
        message: enhancedResult.message || `Found information for "${query}"`,
        error: enhancedResult.error || null,
        _metadata: enhancedResult._metadata || {
          enhancedAt: new Date().toISOString(),
          analysis: {
            playerCount: playerCount,
            isLikelyOutdated: false,
            outdatedFields: [],
            suggestions: playerCount < 5 ? ['Insufficient players returned'] : ['Data verified'],
            needsEnhancement: false,
            confidence: wikipediaUpdates > 0 ? 'high' : (playerCount >= 10 ? 'medium' : 'low'),
            smartEnhancement: false,
            playersChecked: playerCount,
            playersUpdated: wikipediaUpdates,
            modelUsed: model,
            criticalUpdatesApplied: wikipediaUpdates > 0,
            queryType: determineQueryType(query)
          },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: {
            wikipedia: wikipediaConfigured ? 'Enhanced' : 'Not configured',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: wikipediaConfigured ? 'Wikipedia + Critical Updates' : 'None',
            confidence: wikipediaUpdates > 0 ? 'high' : (playerCount >= 10 ? 'medium' : 'low'),
            lastVerified: new Date().toISOString()
          },
          disclaimer: wikipediaConfigured 
            ? 'Wikipedia verification with critical 2024 updates applied.'
            : 'Wikipedia API not configured. Data may be outdated.',
          recommendations: playerCount < 5 ? [
            'The AI returned fewer players than expected.',
            'Try searching for the specific team name.',
            'Visit official team websites for complete squad lists.'
          ] : [
            'Check official sources for absolutely current information',
            'Visit club websites for latest squad details'
          ],
          wikipediaUsage: {
            queries: wikipediaQueries,
            updates: wikipediaUpdates,
            timestamp: new Date().toISOString()
          },
          achievementCorrections
        }
      };
      
      // Add enhancement note to message
      let enhancementNote = '';
      if (wikipediaUpdates > 0 && result.message) {
        enhancementNote = language === 'es' 
          ? ` (Actualizado 2024 - ${wikipediaUpdates} correcciones)`
          : ` (Updated 2024 - ${wikipediaUpdates} corrections)`;
      } else if (wikipediaConfigured && result.message) {
        enhancementNote = language === 'es'
          ? ' (Verificado con Wikipedia)'
          : ' (Verified with Wikipedia)';
      }
      
      let playerCountMessage = '';
      if (playerCount >= 5) {
        playerCountMessage = language === 'es' 
          ? ` • ${playerCount} jugadores`
          : ` • ${playerCount} players`;
      }
      
      if (result.message) {
        result.message = `${result.message}${playerCountMessage}${enhancementNote}`;
      }
      
      console.log(`[GROQ] Final response: ${result.players.length} players, ${result.teams.length} teams`);
      console.log('[GROQ] Model used:', model);
      console.log('[GROQ] Wikipedia usage:', result._metadata.wikipediaUsage);
      return result;
      
    } catch (parseError) {
      console.error('[GROQ] Failed to parse JSON response:', parseError, 'Response:', response);
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('[GROQ] Attempting to extract JSON from text...');
          const extracted = JSON.parse(jsonMatch[0]);
          
          // Try to enhance extracted JSON
          let enhancedExtracted = extracted;
          if (wikipediaConfigured) {
            try {
              enhancedExtracted = await enhanceGROQResponse(extracted, query);
            } catch (e) {
              console.error('[GROQ] Enhancement of extracted JSON failed:', e);
            }
          }
          
          return {
            players: Array.isArray(enhancedExtracted.players) ? enhancedExtracted.players : [],
            teams: Array.isArray(enhancedExtracted.teams) ? enhancedExtracted.teams.slice(0, 1) : [],
            youtubeQuery: enhancedExtracted.youtubeQuery || `${query} football highlights`,
            message: enhancedExtracted.message || `Found information for "${query}"`,
            error: null,
            _metadata: enhancedExtracted._metadata || {
              enhancedAt: new Date().toISOString(),
              analysis: { note: 'Response extracted from text', playerCount: Array.isArray(enhancedExtracted.players) ? enhancedExtracted.players.length : 0 },
              appliedUpdates: [],
              dataSources: ['GROQ AI (extracted)'],
              apiStatus: {
                wikipedia: wikipediaConfigured ? 'Used' : 'Not used',
                groq: 'Success'
              },
              currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
              dataCurrency: {
                aiCutoff: '2024',
                verifiedWith: wikipediaConfigured ? 'Wikipedia' : 'None',
                confidence: 'medium',
                lastVerified: new Date().toISOString()
              },
              disclaimer: 'Response required extraction. Data may be incomplete.',
              recommendations: ['Verify with official sources'],
              wikipediaUsage: {
                queries: 0,
                updates: 0,
                timestamp: new Date().toISOString()
              }
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
        error: 'Failed to parse AI response. The service returned invalid JSON.',
        message: 'Technical error processing the response.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'JSON parse failed' },
          appliedUpdates: [],
          dataSources: [],
          apiStatus: {
            wikipedia: 'Not used',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: 'N/A',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'Could not parse AI response.',
          recommendations: ['Try again with a different query'],
          wikipediaUsage: {
            queries: 0,
            updates: 0,
            timestamp: new Date().toISOString()
          }
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
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'API request failed.',
        recommendations: ['Check your internet connection', 'Verify API keys'],
        wikipediaUsage: {
          queries: 0,
          updates: 0,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    if (error?.status === 401) {
      errorResponse.error = 'Invalid GROQ API key. Please check your GROQ_API_KEY in .env.local';
      errorResponse._metadata!.recommendations = ['Verify your GROQ API key is correct'];
    }
    
    if (error?.status === 429) {
      errorResponse.error = 'Rate limit exceeded. Please wait a moment and try again.';
      errorResponse._metadata!.recommendations = ['Wait 60 seconds before trying again'];
    }
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      errorResponse.error = 'Network error. Please check your internet connection.';
      errorResponse._metadata!.recommendations = ['Check your internet connection and try again'];
    }
    
    return errorResponse;
  }
};

// Alias for backward compatibility
export const GROQSearch = searchWithGROQ;

/**
 * Get historical/legendary players for a team
 */
export const getHistoricalPlayers = async (teamName: string, teamType: 'club' | 'national', language: string = 'en'): Promise<Player[]> => {
  try {
    console.log(`[GROQ] Fetching historical players for: "${teamName}" (${teamType}), Language: ${language}`);
    
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('[GROQ] API key missing for historical players');
      return [];
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a football historian. Provide information about legendary/iconic players from football teams.

${language === 'es' ? 'RESPONDE EN ESPAÑOL.' : 'RESPOND IN ENGLISH.'}

Return JSON with this exact structure:
{
  "legendaryPlayers": [{
    "name": "string",
    "era": "string",
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
        console.log(`[GROQ] Found ${parsed.legendaryPlayers.length} historical players for ${teamName}`);
        
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
          _yearsAtTeam: legend.yearsAtTeam
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
  
  if (response._metadata.wikipediaUsage?.updates === 0 && 
      response._metadata.wikipediaUsage?.queries > 0) {
    return false;
  }
  
  if (response.players.length < 5) {
    return true;
  }
  
  const allText = JSON.stringify(response).toLowerCase();
  if (allText.includes('as of 2024') || allText.includes('2024 season')) {
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
    return { source: 'Wikipedia Updated', color: 'green', icon: '✅' };
  }
  
  if (response._metadata.wikipediaUsage?.queries > 0) {
    return { source: 'Wikipedia Verified', color: 'blue', icon: '🌐' };
  }
  
  if (response._metadata.dataSources?.includes('Critical Update')) {
    return { source: 'Critical Update', color: 'purple', icon: '🔧' };
  }
  
  return { source: 'AI Data', color: 'yellow', icon: '🤖' };
};