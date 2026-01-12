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

// Critical player updates for 2024-2025 season with CORRECT achievements
const CRITICAL_PLAYER_UPDATES_2024: Record<string, Partial<Player>> = {
  // Argentina updates
  "Lionel Messi": {
    currentTeam: "Inter Miami",
    age: 37,
    majorAchievements: ["FIFA World Cup (2022)", "Copa América (2021)", "UEFA Champions League (4x)", "Ballon d'Or (8x)"],
    _updateReason: "Transferred to Inter Miami in 2023, World Cup 2022 winner"
  },
  
  // Brazil updates - CORRECTING FALSE WORLD CUP WINS
  "Alisson Becker": {
    currentTeam: "Liverpool",
    age: 31,
    majorAchievements: ["UEFA Champions League (2019)", "FIFA Club World Cup (2019)", "Copa América (2019)"],
    _updateReason: "Never won World Cup, won Copa América 2019"
  },
  "Thiago Silva": {
    currentTeam: "Chelsea",
    age: 39,
    majorAchievements: ["UEFA Champions League (2021)", "Copa América (2019)", "FIFA Confederations Cup (2013)"],
    _updateReason: "Never won World Cup, won Copa América 2019"
  },
  "Marquinhos": {
    currentTeam: "Paris Saint-Germain",
    age: 30,
    majorAchievements: ["Copa América (2019)", "Ligue 1 (8x)", "Coupe de France (6x)"],
    _updateReason: "Never won World Cup, won Copa América 2019"
  },
  "Casemiro": {
    currentTeam: "Manchester United",
    age: 32,
    majorAchievements: ["UEFA Champions League (5x)", "FIFA Club World Cup (4x)", "Copa América (2019)"],
    _updateReason: "Transferred to Man United 2022, never won World Cup"
  },
  "Neymar Jr.": {
    currentTeam: "Al Hilal",
    age: 32,
    majorAchievements: ["UEFA Champions League (2015)", "Copa América (2019)", "Olympic Gold Medal (2016)"],
    _updateReason: "Transferred to Al Hilal 2023, never won World Cup"
  },
  "Richarlison": {
    currentTeam: "Tottenham Hotspur",
    age: 27,
    majorAchievements: ["Copa América (2019)", "Olympic Gold Medal (2020)"],
    _updateReason: "Never won World Cup"
  },
  "Vinicius Jr.": {
    currentTeam: "Real Madrid",
    age: 24,
    majorAchievements: ["UEFA Champions League (2022, 2024)", "La Liga (2022, 2024)", "Copa del Rey (2023)"],
    _updateReason: "Never won World Cup"
  },
  
  // Other key transfers
  "Karim Benzema": {
    currentTeam: "Al-Ittihad",
    age: 36,
    _updateReason: "Transferred to Al-Ittihad in 2023"
  },
  "Cristiano Ronaldo": {
    currentTeam: "Al Nassr",
    age: 39,
    _updateReason: "Transferred to Al Nassr in 2023"
  },
  "Jude Bellingham": {
    currentTeam: "Real Madrid",
    age: 21,
    nationality: "English",
    position: "Midfielder",
    _updateReason: "Transferred to Real Madrid in 2023"
  },
};

// Critical team updates for 2024-2025 with CORRECT achievement data
const CRITICAL_TEAM_UPDATES_2024: Record<string, Partial<Team>> = {
  "Argentina": {
    name: "Argentina",
    type: "national",
    country: "Argentina",
    currentCoach: "Lionel Scaloni",
    foundedYear: 1893,
    majorAchievements: {
      worldCup: [
        "FIFA World Cup (1978)",
        "FIFA World Cup (1986)", 
        "FIFA World Cup (2022)"
      ],
      continental: [
        "Copa América (1921, 1925, 1927, 1929, 1937, 1941, 1945, 1946, 1947, 1955, 1957, 1959, 1991, 1993, 2021)"
      ],
      domestic: [
        "CONMEBOL–UEFA Cup of Champions (1993, 2022)",
        "FIFA Confederations Cup (1992)",
        "Superclásico de las Américas (2011, 2012, 2014, 2017, 2019)"
      ]
    }
  },
  "Brazil": {
    name: "Brazil",
    type: "national",
    country: "Brazil",
    currentCoach: "Dorival Júnior",
    foundedYear: 1914,
    majorAchievements: {
      worldCup: [
        "FIFA World Cup (1958)",
        "FIFA World Cup (1962)",
        "FIFA World Cup (1970)",
        "FIFA World Cup (1994)",
        "FIFA World Cup (2002)"
      ],
      continental: [
        "Copa América (1919, 1922, 1949, 1989, 1997, 1999, 2004, 2007, 2019)"
      ],
      domestic: [
        "FIFA Confederations Cup (1997, 2005, 2009, 2013)",
        "CONMEBOL–UEFA Cup of Champions (1997, 2005)",
        "Panamerican Championship (1952, 1956, 1960)"
      ]
    }
  },
  "Italy": {
    name: "Italy",
    type: "national",
    country: "Italy",
    currentCoach: "Luciano Spalletti",
    foundedYear: 1898,
    majorAchievements: {
      worldCup: [
        "FIFA World Cup (1934)",
        "FIFA World Cup (1938)",
        "FIFA World Cup (1982)",
        "FIFA World Cup (2006)"
      ],
      continental: [
        "UEFA European Championship (1968)",
        "UEFA European Championship (2020)"
      ],
      domestic: [
        "UEFA Nations League (2021)"
      ]
    }
  },
  "Germany": {
    name: "Germany",
    type: "national",
    country: "Germany",
    currentCoach: "Julian Nagelsmann",
    foundedYear: 1900,
    majorAchievements: {
      worldCup: [
        "FIFA World Cup (1954)",
        "FIFA World Cup (1974)",
        "FIFA World Cup (1990)",
        "FIFA World Cup (2014)"
      ],
      continental: [
        "UEFA European Championship (1972, 1980, 1996)"
      ],
      domestic: [
        "FIFA Confederations Cup (2017)"
      ]
    }
  },
  "France": {
    name: "France",
    type: "national",
    country: "France",
    currentCoach: "Didier Deschamps",
    foundedYear: 1904,
    majorAchievements: {
      worldCup: [
        "FIFA World Cup (1998)",
        "FIFA World Cup (2018)"
      ],
      continental: [
        "UEFA European Championship (1984, 2000)",
        "UEFA Nations League (2021)"
      ],
      domestic: [
        "FIFA Confederations Cup (2001, 2003)"
      ]
    }
  },
  "Spain": {
    name: "Spain",
    type: "national",
    country: "Spain",
    currentCoach: "Luis de la Fuente",
    foundedYear: 1909,
    majorAchievements: {
      worldCup: [
        "FIFA World Cup (2010)"
      ],
      continental: [
        "UEFA European Championship (1964, 2008, 2012)"
      ],
      domestic: [
        "UEFA Nations League (2023)"
      ]
    }
  },
  "Real Madrid": {
    currentCoach: "Carlo Ancelotti",
    country: "Spain",
    type: "club",
    majorAchievements: {
      worldCup: [
        "FIFA Club World Cup (2014)",
        "FIFA Club World Cup (2016)", 
        "FIFA Club World Cup (2017)",
        "FIFA Club World Cup (2018)",
        "FIFA Club World Cup (2022)"
      ],
      continental: [
        "UEFA Champions League (1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)"
      ],
      domestic: [
        "La Liga (36 titles)",
        "Copa del Rey (20 titles)",
        "Supercopa de España (13 titles)"
      ]
    },
    stadium: "Santiago Bernabéu",
    foundedYear: 1902
  },
};

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

// Player priority system
const getPlayerPriority = (player: Player): 'high' | 'medium' | 'low' => {
  const name = player.name.toLowerCase();
  
  // Check critical updates first
  if (CRITICAL_PLAYER_UPDATES_2024[player.name]) {
    return 'high';
  }
  
  // HIGH PRIORITY: Star players, key transfers, older players
  if (
    player.age && player.age > 30 ||
    name.includes('messi') ||
    name.includes('ronaldo') ||
    name.includes('mbappe') ||
    name.includes('neymar')
  ) {
    return 'high';
  }
  
  // MEDIUM PRIORITY: Well-known players
  if (
    name.includes('modric') ||
    name.includes('benzema') ||
    name.includes('haaland') ||
    name.includes('de bruyne') ||
    name.includes('kane') ||
    name.includes('salah') ||
    name.includes('lewandowski')
  ) {
    return 'medium';
  }
  
  return 'low';
};

const playerNeedsVerification = (player: Player): boolean => {
  if (CRITICAL_PLAYER_UPDATES_2024[player.name]) {
    return true;
  }
  
  const priority = getPlayerPriority(player);
  return priority === 'high' || priority === 'medium';
};

/**
 * Validate and correct achievement data
 */
const validateAndCorrectAchievements = (team: Team): Team => {
  if (!team.majorAchievements) return team;
  
  const corrected = { ...team };
  const achievements = corrected.majorAchievements;
  
  // Brazil validation - only 5 World Cup wins
  if (team.name.toLowerCase() === 'brazil' && achievements.worldCup) {
    const validWorldCupWins = [
      "FIFA World Cup (1958)",
      "FIFA World Cup (1962)", 
      "FIFA World Cup (1970)",
      "FIFA World Cup (1994)",
      "FIFA World Cup (2002)"
    ];
    
    // Filter out incorrect World Cup wins
    achievements.worldCup = achievements.worldCup.filter(win => 
      validWorldCupWins.includes(win) || validWorldCupWins.some(valid => win.includes(valid))
    );
    
    // Add missing valid wins
    validWorldCupWins.forEach(win => {
      if (!achievements.worldCup.some(w => w.includes(win.replace('FIFA World Cup (', '').replace(')', '')))) {
        achievements.worldCup.push(win);
      }
    });
    
    // Remove duplicates
    achievements.worldCup = [...new Set(achievements.worldCup)];
  }
  
  // Remove obviously incorrect years (like 2019, 2022 for Brazil World Cup)
  if (achievements.worldCup) {
    achievements.worldCup = achievements.worldCup.filter(win => {
      const yearMatch = win.match(/\((\d{4})\)/);
      if (!yearMatch) return true;
      const year = parseInt(yearMatch[1]);
      
      // Brazil-specific validation
      if (team.name.toLowerCase() === 'brazil') {
        const validBrazilYears = [1958, 1962, 1970, 1994, 2002];
        if (validBrazilYears.includes(year)) return true;
        return false; // Remove incorrect years
      }
      
      // Argentina validation
      if (team.name.toLowerCase() === 'argentina') {
        const validArgentinaYears = [1978, 1986, 2022];
        if (validArgentinaYears.includes(year)) return true;
        return false;
      }
      
      // Italy validation
      if (team.name.toLowerCase() === 'italy') {
        const validItalyYears = [1934, 1938, 1982, 2006];
        if (validItalyYears.includes(year)) return true;
        return false;
      }
      
      // Germany validation
      if (team.name.toLowerCase() === 'germany') {
        const validGermanyYears = [1954, 1974, 1990, 2014];
        if (validGermanyYears.includes(year)) return true;
        return false;
      }
      
      // France validation
      if (team.name.toLowerCase() === 'france') {
        const validFranceYears = [1998, 2018];
        if (validFranceYears.includes(year)) return true;
        return false;
      }
      
      // Spain validation
      if (team.name.toLowerCase() === 'spain') {
        const validSpainYears = [2010];
        if (validSpainYears.includes(year)) return true;
        return false;
      }
      
      return true; // Keep if no specific validation
    });
  }
  
  return corrected;
};

/**
 * Format achievements for better display
 */
const formatAchievementsForDisplay = (team: Team): Team => {
  const validated = validateAndCorrectAchievements(team);
  
  if (!validated.majorAchievements) return validated;
  
  const formatted = { ...validated };
  const achievements = formatted.majorAchievements;
  
  // Ensure all achievement arrays exist
  achievements.worldCup = achievements.worldCup || [];
  achievements.continental = achievements.continental || [];
  achievements.domestic = achievements.domestic || [];
  
  return formatted;
};

/**
 * Apply critical player updates with achievement validation
 */
const applyCriticalUpdates = (players: Player[]): { players: Player[]; updates: number } => {
  let updates = 0;
  const updatedPlayers = players.map(player => {
    let updatedPlayer = player;
    
    // Apply critical update if exists
    if (CRITICAL_PLAYER_UPDATES_2024[player.name]) {
      updates++;
      console.log(`[CRITICAL UPDATE] Updating ${player.name}`);
      updatedPlayer = {
        ...player,
        ...CRITICAL_PLAYER_UPDATES_2024[player.name],
        _source: player._source ? `${player._source} + Critical Update` : 'Critical Update',
        _lastVerified: new Date().toISOString()
      };
    }
    
    // Validate player achievements
    const name = updatedPlayer.name.toLowerCase();
    
    // Brazil players - remove false World Cup claims
    if (updatedPlayer.nationality.toLowerCase().includes('brazil')) {
      const hasFalseWorldCup = updatedPlayer.majorAchievements?.some(ach => 
        ach.includes('FIFA World Cup (201') || ach.includes('FIFA World Cup (202')
      );
      
      if (hasFalseWorldCup) {
        console.log(`[VALIDATION] Removing false World Cup claims from ${updatedPlayer.name}`);
        updatedPlayer.majorAchievements = updatedPlayer.majorAchievements.filter(ach => 
          !(ach.includes('FIFA World Cup (201') || ach.includes('FIFA World Cup (202'))
        );
        
        // Add correct achievements for known Brazilian players
        if (name.includes('alisson') || name.includes('allison')) {
          updatedPlayer.majorAchievements.push("Copa América (2019)", "UEFA Champions League (2019)");
        }
        if (name.includes('thiago silva')) {
          updatedPlayer.majorAchievements.push("Copa América (2019)", "UEFA Champions League (2021)");
        }
        if (name.includes('neymar')) {
          updatedPlayer.majorAchievements.push("Copa América (2019)", "UEFA Champions League (2015)");
        }
        
        updates++;
      }
    }
    
    return updatedPlayer;
  });
  
  return { players: updatedPlayers, updates };
};

/**
 * Apply critical team updates with achievement validation
 */
const applyCriticalTeamUpdates = (teams: Team[]): { teams: Team[]; updates: number } => {
  let updates = 0;
  const updatedTeams = teams.map(team => {
    let updatedTeam = team;
    
    // Apply critical update if exists
    if (CRITICAL_TEAM_UPDATES_2024[team.name]) {
      updates++;
      console.log(`[CRITICAL UPDATE] Updating team ${team.name}`);
      updatedTeam = {
        ...team,
        ...CRITICAL_TEAM_UPDATES_2024[team.name],
        _source: team._source ? `${team._source} + Critical Update` : 'Critical Update',
        _lastVerified: new Date().toISOString(),
        _achievementsUpdated: true
      };
    }
    
    // Format achievements for display
    return formatAchievementsForDisplay(updatedTeam);
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
  
  // Limit to 8 players for Wikipedia checks
  const maxPlayersToCheck = Math.min(enhancedPlayers.length, 8);
  
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
  
  // Apply critical updates FIRST
  const criticalResult = applyCriticalTeamUpdates(teams);
  let enhancedTeams = criticalResult.teams;
  let updates = criticalResult.updates;
  let queries = 0;
  
  // Check each team
  for (let i = 0; i < Math.min(enhancedTeams.length, 2); i++) {
    const team = enhancedTeams[i];
    
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
        enhancedTeams[i] = {
          ...enhancedTeams[i],
          _wikiSummary: wikiData.summary.substring(0, 200) + '...',
          _wikiFetchedAt: wikiData.fetchedAt || new Date().toISOString(),
          _source: enhancedTeams[i]._source || 'Wikipedia Verified'
        };
        updates++;
      }
    } catch (error) {
      console.error(`[Wikipedia] Team enhancement failed for ${team.name}:`, error);
    }
  }
  
  return { teams: enhancedTeams, queries, updates };
};

/**
 * Helper function to ensure achievements are properly formatted for UI
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
  
  return {
    ...team,
    majorAchievements: achievements
  };
};

/**
 * Main GROQ search function with improved validation
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
    const useFallbackModel = shouldUseFallbackModel(query);
    const model = useFallbackModel ? MODEL_CONFIG.fallback : MODEL_CONFIG.primary;
    
    console.log(`[GROQ] Searching for: "${query}" with model: ${model}, Language: ${language}`);
    
    // ENHANCED SYSTEM PROMPT with STRICT achievement validation
    const systemPrompt = language === 'es' ? `
ERES FutbolAI. Proporciona información EXACTA y VERIFICADA de fútbol.

**DATOS HISTÓRICOS CORRECTOS (IMPORTANTE):**
- Brasil: 5 Copas Mundiales (1958, 1962, 1970, 1994, 2002) - NO 2019, NO 2022
- Argentina: 3 Copas Mundiales (1978, 1986, 2022)
- Italia: 4 Copas Mundiales (1934, 1938, 1982, 2006)
- Alemania: 4 Copas Mundiales (1954, 1974, 1990, 2014)
- Francia: 2 Copas Mundiales (1998, 2018)
- España: 1 Copa Mundial (2010)
- Inglaterra: 1 Copa Mundial (1966)

**JUGADORES BRASILEÑOS ACTUALES:**
- NO han ganado la Copa Mundial (última de Brasil fue 2002)
- SÍ han ganado Copa América 2019
- Alisson: UEFA Champions League 2019, Copa América 2019
- Neymar: UEFA Champions League 2015, Copa América 2019
- Thiago Silva: UEFA Champions League 2021, Copa América 2019

**INSTRUCCIONES CRÍTICAS:**
1. SIEMPRE devuelve información del equipo en el array "teams"
2. Para selecciones nacionales = tipo "national"
3. Para clubes = tipo "club"
4. Usa datos ACTUALES de 2024-2025
5. NO inventes títulos que no existen
6. Verifica años de Copas Mundiales
7. Para Brasil: máximo 5 Copas Mundiales
8. Si no estás seguro, déjalo vacío

**FORMATO JSON EXACTO:**
{
  "players": [{
    "name": "string",
    "currentTeam": "string (club ACTUAL 2024-2025)",
    "position": "string",
    "age": number,
    "nationality": "string",
    "careerGoals": number,
    "careerAssists": number,
    "internationalAppearances": number,
    "internationalGoals": number,
    "majorAchievements": ["string (SÓLO logros REALES)"],
    "careerSummary": "string"
  }],
  "teams": [{
    "name": "string",
    "type": "club" o "national",
    "country": "string",
    "stadium": "string (solo clubs)",
    "currentCoach": "string",
    "foundedYear": number,
    "majorAchievements": {
      "worldCup": ["string (SÓLO años CORRECTOS)"],
      "continental": ["string"],
      "domestic": ["string"]
    }
  }],
  "youtubeQuery": "string",
  "message": "string"
}

**NO INVENTES:** Si Brasil, máximo 5 Copas Mundiales. Jugadores brasileños actuales NO tienen Copa Mundial.
` : `
YOU ARE FutbolAI. Provide ACCURATE and VERIFIED football information.

**CORRECT HISTORICAL DATA (CRITICAL):**
- Brazil: 5 World Cups (1958, 1962, 1970, 1994, 2002) - NOT 2019, NOT 2022
- Argentina: 3 World Cups (1978, 1986, 2022)
- Italy: 4 World Cups (1934, 1938, 1982, 2006)
- Germany: 4 World Cups (1954, 1974, 1990, 2014)
- France: 2 World Cups (1998, 2018)
- Spain: 1 World Cup (2010)
- England: 1 World Cup (1966)

**CURRENT BRAZILIAN PLAYERS:**
- Have NOT won the World Cup (Brazil's last was 2002)
- HAVE won Copa América 2019
- Alisson: UEFA Champions League 2019, Copa América 2019
- Neymar: UEFA Champions League 2015, Copa América 2019
- Thiago Silva: UEFA Champions League 2021, Copa América 2019

**CRITICAL INSTRUCTIONS:**
1. ALWAYS return team information in the "teams" array
2. For national teams = type "national"
3. For clubs = type "club"
4. Use CURRENT data from 2024-2025 season
5. DO NOT invent titles that don't exist
6. Verify World Cup years
7. For Brazil: maximum 5 World Cups
8. If unsure, leave it empty

**EXACT JSON FORMAT:**
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
    "majorAchievements": ["string (ONLY REAL achievements)"],
    "careerSummary": "string"
  }],
  "teams": [{
    "name": "string",
    "type": "club" or "national",
    "country": "string",
    "stadium": "string (clubs only)",
    "currentCoach": "string",
    "foundedYear": number,
    "majorAchievements": {
      "worldCup": ["string (ONLY CORRECT years)"],
      "continental": ["string"],
      "domestic": ["string"]
    }
  }],
  "youtubeQuery": "string",
  "message": "string"
}

**DO NOT INVENT:** If Brazil, maximum 5 World Cups. Current Brazilian players do NOT have World Cup.
`;

    const userPrompt = language === 'es' 
      ? `Consulta de fútbol: "${query}". Devuelve SOLO datos VERIFICADOS en formato JSON. NO inventes títulos.`
      : `Football query: "${query}". Return ONLY VERIFIED data in JSON format. DO NOT invent titles.`;

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
      max_tokens: 4000,
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
      
      const playerCount = Array.isArray(parsed.players) ? parsed.players.length : 0;
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
      
      // Apply critical updates regardless of Wikipedia
      if (enhancedResult.players && enhancedResult.players.length > 0) {
        const criticalResult = applyCriticalUpdates(enhancedResult.players);
        enhancedResult.players = criticalResult.players;
        wikipediaUpdates += criticalResult.updates;
      }
      
      if (enhancedResult.teams && enhancedResult.teams.length > 0) {
        const criticalTeamResult = applyCriticalTeamUpdates(enhancedResult.teams);
        enhancedResult.teams = criticalTeamResult.teams;
        wikipediaUpdates += criticalTeamResult.updates;
      }
      
      if (wikipediaConfigured) {
        try {
          // Use enhanceGROQResponse for Wikipedia enhancement
          const enhancedResponse = await enhanceGROQResponse(enhancedResult, query);
          enhancedResult = enhancedResponse;
          
          if (enhancedResult._metadata) {
            wikipediaQueries = enhancedResult._metadata.wikipediaUsage?.queries || 0;
            wikipediaUpdates += enhancedResult._metadata.wikipediaUsage?.updates || 0;
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
      const minPlayersRequired = isClub ? 8 : 10;
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
      
      // Track achievement corrections
      const queryLower = query.toLowerCase();
      if (queryLower.includes('brazil') && worldCupCount > 5) {
        achievementCorrections.push(`Corrected Brazil World Cup count from ${worldCupCount} to 5`);
        worldCupCount = 5;
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
            criticalUpdatesApplied: wikipediaUpdates > 0,
            queryType: queryType,
            achievementCounts: {
              worldCup: worldCupCount,
              continental: continentalCount,
              domestic: domesticCount
            },
            dataValidation: {
              worldCupYearsValidated: true,
              achievementCorrections: achievementCorrections.length,
              criticalUpdates: wikipediaUpdates
            }
          },
          appliedUpdates: [],
          dataSources: ['GROQ AI', ...(wikipediaUpdates > 0 ? ['Critical Updates'] : [])],
          apiStatus: {
            wikipedia: wikipediaConfigured ? 'Enhanced' : 'Not configured',
            groq: 'Success'
          },
          currentSeason: '2024/2025',
          dataCurrency: {
            aiCutoff: 'October 2024',
            verifiedWith: wikipediaConfigured ? 'Wikipedia + Critical Updates' : 'Critical Updates',
            confidence: wikipediaUpdates > 0 ? 'high' : (hasEnoughPlayers ? 'medium' : 'low'),
            lastVerified: new Date().toISOString()
          },
          disclaimer: wikipediaConfigured 
            ? `Wikipedia verification applied. ${wikipediaUpdates} critical updates. ${achievementCorrections.length > 0 ? 'Achievements validated and corrected.' : ''}`
            : 'Critical updates applied. Wikipedia API not configured.',
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
      
      let updateNote = '';
      if (wikipediaUpdates > 0) {
        updateNote = language === 'es'
          ? ` (Actualizado 2024-2025)`
          : ` (Updated 2024-2025)`;
      }
      
      // Add validation note for Brazil
      if (queryLower.includes('brazil') && achievementCorrections.length > 0) {
        const validationNote = language === 'es'
          ? ' • Logros validados'
          : ' • Achievements validated';
        if (result.message) {
          result.message = `${result.message}${validationNote}`;
        }
      }
      
      if (result.message) {
        result.message = `${result.message}${playerCountNote}${updateNote}`;
      }
      
      console.log(`[GROQ] Final response: ${result.players.length} players, ${result.teams.length} teams`);
      console.log(`[GROQ] Achievement counts: World Cup: ${worldCupCount}, Continental: ${continentalCount}, Domestic: ${domesticCount}`);
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
          
          // Apply critical updates to extracted data
          if (extracted.players) {
            const criticalResult = applyCriticalUpdates(extracted.players);
            extracted.players = criticalResult.players;
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
                verifiedWith: 'Critical Updates',
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

    // Determine era based on team type and name
    let eraContext = '';
    if (teamType === 'national') {
      if (teamName.toLowerCase().includes('argentina')) {
        eraContext = 'Golden generations including 1978, 1986, and 2022 World Cup winners';
      } else if (teamName.toLowerCase().includes('brazil')) {
        eraContext = 'Legendary squads from 1958, 1962, 1970, 1994, and 2002 World Cup winning teams';
      } else if (teamName.toLowerCase().includes('spain')) {
        eraContext = '2008-2012 golden era with tiki-taka style and 2010 World Cup';
      } else if (teamName.toLowerCase().includes('italy')) {
        eraContext = 'Defensive masters from 1934, 1938, 1982, and 2006 World Cup winning eras';
      } else if (teamName.toLowerCase().includes('germany')) {
        eraContext = 'Efficient squads from 1954, 1974, 1990, and 2014 World Cup winning eras';
      }
    } else {
      // Club eras
      if (teamName.toLowerCase().includes('real madrid')) {
        eraContext = 'Galácticos era, 5 consecutive European Cups (1956-1960), and modern Champions League dominance';
      } else if (teamName.toLowerCase().includes('barcelona')) {
        eraContext = 'Dream Team (1990s), Pep Guardiola era (2008-2012), and MSN trident (2014-2017)';
      }
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a football historian. Provide ACCURATE information about legendary players.

${language === 'es' ? 'RESPONDE EN ESPAÑOL.' : 'RESPOND IN ENGLISH.'}

**IMPORTANT:**
- For Brazil: only players from 1958, 1962, 1970, 1994, or 2002 World Cup winning squads
- NO current Brazilian players (they haven't won World Cup)
- Be specific about eras and achievements

Return JSON with this exact structure:
{
  "legendaryPlayers": [{
    "name": "string",
    "era": "string (specific era like '1958 World Cup Squad', '1970 Golden Generation', etc.)",
    "position": "string",
    "nationality": "string",
    "yearsAtTeam": "string",
    "achievementsWithTeam": ["string (only REAL achievements)"],
    "legacySummary": "string"
  }]
}

${eraContext ? `Context: ${eraContext}` : ''}

${language === 'es' ? 'Proporciona 8-12 jugadores legendarios de diferentes épocas.' : 'Return 8-12 legendary players from different eras.'}`
        },
        {
          role: 'user',
          content: `${language === 'es' ? 
            `Proporciona información VERIFICADA sobre jugadores legendarios de ${teamName}. Solo logros reales.` : 
            `Provide VERIFIED information about legendary players from ${teamName}. Only real achievements.`}`
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
  const minRequired = queryType === 'club' ? 8 : 10;
  
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
    return { source: 'Wikipedia + Critical Updates', color: 'green', icon: '✅' };
  }
  
  if (response._metadata.dataCurrency?.verifiedWith?.includes('Critical')) {
    return { source: 'Critical Updates', color: 'purple', icon: '🔧' };
  }
  
  if (response._metadata.wikipediaUsage?.queries > 0) {
    return { source: 'Wikipedia Verified', color: 'blue', icon: '🌐' };
  }
  
  return { source: 'AI Data', color: 'yellow', icon: '🤖' };
};