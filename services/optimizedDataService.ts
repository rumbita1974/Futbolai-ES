// services/optimizedDataService.ts - COMPLETE FIXED VERSION
// Configuration for API endpoints
const API_CONFIG = {
  footballData: {
    baseUrl: 'https://api.football-data.org/v4',
    apiKey: process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY || ''
  },
  sportsDB: {
    baseUrl: 'https://www.thesportsdb.com/api/v1/json/3',
    apiKey: '3'
  },
  wikipedia: {
    baseUrl: 'https://en.wikipedia.org/api/rest_v1'
  },
  wikidata: {
    baseUrl: 'https://www.wikidata.org/w/api.php'
  }
};

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Helper function for cached API calls with better error handling
const cachedFetch = async (cacheKey: string, fetchFn: () => Promise<any>): Promise<any> => {
  const now = Date.now();
  const cached = apiCache.get(cacheKey);
  
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`[CACHE] Using cached: ${cacheKey}`);
    return cached.data;
  }
  
  try {
    const data = await fetchFn();
    apiCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    console.error(`[API] Failed: ${cacheKey}`, error);
    // Don't cache errors
    throw error;
  }
};

// Improved fetch wrapper with CORS handling and timeouts
const safeFetch = async (url: string, options: RequestInit = {}, timeout = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FutbolAI/1.0 (football-analytics-app)',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Don't throw for 404s, return null instead
      if (response.status === 404) {
        console.log(`[API] 404 Not Found: ${url}`);
        return null;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    // Handle CORS errors gracefully
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      console.warn(`[CORS] Could not fetch from ${url}. Using fallback data.`);
      return null; // Return null instead of throwing
    }
    
    throw error;
  }
};

// Football Data API integration with CORS fallback
export const fetchVerifiedSquad = async (teamName: string): Promise<any> => {
  const cacheKey = `footballData_squad_${teamName.toLowerCase().trim()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[FootballData] Searching for team: ${teamName}`);
    
    // Skip if no API key
    if (!API_CONFIG.footballData.apiKey) {
      console.log('[FootballData] No API key configured, skipping');
      return null;
    }
    
    try {
      // First, try to find team ID by name
      const searchUrl = `${API_CONFIG.footballData.baseUrl}/teams`;
      const searchParams = new URLSearchParams({
        name: teamName,
        limit: '5'
      });
      
      const searchResponse = await safeFetch(`${searchUrl}?${searchParams}`, {
        headers: {
          'X-Auth-Token': API_CONFIG.footballData.apiKey,
        }
      });
      
      // If CORS fails or API returns null, use fallback
      if (!searchResponse) {
        console.log('[FootballData] CORS blocked or API unavailable');
        return null;
      }
      
      const searchData = await searchResponse.json();
      const teams = searchData.teams || searchData;
      
      if (!teams || teams.length === 0) {
        console.log(`[FootballData] No team found for: ${teamName}`);
        return null;
      }
      
      // Find best match (prioritize exact name match)
      const team = teams.find((t: any) => 
        t.name.toLowerCase() === teamName.toLowerCase() ||
        t.shortName?.toLowerCase() === teamName.toLowerCase()
      ) || teams[0];
      
      const teamId = team.id;
      
      // Get team details with squad
      const teamUrl = `${API_CONFIG.footballData.baseUrl}/teams/${teamId}`;
      const teamResponse = await safeFetch(teamUrl, {
        headers: {
          'X-Auth-Token': API_CONFIG.footballData.apiKey,
        }
      });
      
      if (!teamResponse) {
        return null;
      }
      
      const teamData = await teamResponse.json();
      
      // Extract squad and coach information
      const squad = teamData.squad || [];
      const coach = squad.find((member: any) => member.role === 'COACH');
      
      return {
        id: teamData.id,
        name: teamData.name,
        shortName: teamData.shortName,
        tla: teamData.tla,
        crest: teamData.crest,
        address: teamData.address,
        website: teamData.website,
        founded: teamData.founded,
        clubColors: teamData.clubColors,
        venue: teamData.venue,
        runningCompetitions: teamData.runningCompetitions,
        coach: coach ? {
          id: coach.id,
          name: coach.name,
          dateOfBirth: coach.dateOfBirth,
          nationality: coach.nationality
        } : null,
        squad: squad.filter((member: any) => member.role === 'PLAYER').map((player: any) => ({
          id: player.id,
          name: player.name,
          position: player.position,
          dateOfBirth: player.dateOfBirth,
          nationality: player.nationality,
          shirtNumber: player.shirtNumber
        })),
        type: teamData.type || 'club',
        country: teamData.area?.name || '',
        stadium: teamData.venue,
        _source: 'Football-Data.org',
        _lastVerified: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('[FootballData] Error:', error.message);
      return null; // Return null instead of throwing to allow fallbacks
    }
  });
};

// SportsDB API integration with better error handling
export const fetchTeamInfoFromSportsDB = async (teamName: string): Promise<any> => {
  const cacheKey = `sportsdb_team_${teamName.toLowerCase().trim()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[SportsDB] Searching for team: ${teamName}`);
    
    try {
      const searchUrl = `${API_CONFIG.sportsDB.baseUrl}/searchteams.php`;
      const params = new URLSearchParams({ t: teamName });
      
      const response = await safeFetch(`${searchUrl}?${params}`);
      
      if (!response) {
        console.log('[SportsDB] Could not fetch team info');
        return null;
      }
      
      const data = await response.json();
      
      if (!data.teams || data.teams.length === 0) {
        // Try alternative search method
        const altResponse = await safeFetch(
          `${API_CONFIG.sportsDB.baseUrl}/searchallteams.php?l=${encodeURIComponent(teamName)}`
        );
        
        if (!altResponse) {
          return null;
        }
        
        const altData = await altResponse.json();
        if (altData.teams && altData.teams.length > 0) {
          const team = altData.teams[0];
          return {
            ...team,
            _source: 'SportsDB (alternative search)',
            _lastVerified: new Date().toISOString()
          };
        }
        
        return null;
      }
      
      const team = data.teams[0];
      return {
        ...team,
        _source: 'SportsDB',
        _lastVerified: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('[SportsDB] Error:', error.message);
      return null;
    }
  });
};

export const fetchCoachFromSportsDB = async (teamId: string): Promise<string | null> => {
  const cacheKey = `sportsdb_coach_${teamId}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[SportsDB] Fetching coach for team ID: ${teamId}`);
    
    try {
      const teamUrl = `${API_CONFIG.sportsDB.baseUrl}/lookupteam.php`;
      const params = new URLSearchParams({ id: teamId });
      
      const response = await safeFetch(`${teamUrl}?${params}`);
      
      if (!response) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.teams && data.teams.length > 0) {
        return data.teams[0].strManager || null;
      }
      
      return null;
      
    } catch (error: any) {
      console.error('[SportsDB Coach] Error:', error.message);
      return null;
    }
  });
};

export const fetchTeamHonorsFromSportsDB = async (teamId: string): Promise<any[]> => {
  const cacheKey = `sportsdb_honors_${teamId}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[SportsDB] Fetching honors for team ID: ${teamId}`);
    
    try {
      const honorsUrl = `${API_CONFIG.sportsDB.baseUrl}/lookuphonors.php`;
      const params = new URLSearchParams({ id: teamId });
      
      const response = await safeFetch(`${honorsUrl}?${params}`);
      
      // Return empty array for 404 instead of throwing
      if (!response) {
        console.log(`[SportsDB] Honors endpoint not available for team ${teamId}`);
        return [];
      }
      
      const data = await response.json();
      
      return data.honours || [];
      
    } catch (error: any) {
      console.error('[SportsDB Honors] Error:', error.message);
      return []; // Return empty array instead of throwing
    }
  });
};

// Wikipedia API integration with better search strategies
export const fetchFromWikipedia = async (query: string, language: string = 'en'): Promise<any> => {
  const cacheKey = `wikipedia_${language}_${query.toLowerCase().trim()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikipedia] Fetching: "${query}" in ${language}`);
    
    try {
      // Strategy 1: Direct fetch
      const url = `${API_CONFIG.wikipedia.baseUrl}/page/summary/${encodeURIComponent(query)}`;
      const response = await safeFetch(url);
      
      if (response) {
        const data = await response.json();
        
        // Check if we got a valid page (not disambiguation)
        if (data.type !== 'disambiguation' && data.extract) {
          return {
            ...data,
            _source: 'Wikipedia',
            _searchMethod: 'direct'
          };
        }
      }
      
      // Strategy 2: Try with underscores
      const altQuery = query.replace(/ /g, '_');
      const altUrl = `${API_CONFIG.wikipedia.baseUrl}/page/summary/${encodeURIComponent(altQuery)}`;
      const altResponse = await safeFetch(altUrl);
      
      if (altResponse) {
        const altData = await altResponse.json();
        if (altData.type !== 'disambiguation' && altData.extract) {
          return {
            ...altData,
            _source: 'Wikipedia',
            _searchMethod: 'underscores'
          };
        }
      }
      
      // Strategy 3: Try with (footballer) suffix
      if (!query.toLowerCase().includes('(footballer)') && !query.toLowerCase().includes('footballer')) {
        const footballerQuery = `${query} (footballer)`;
        const footballerUrl = `${API_CONFIG.wikipedia.baseUrl}/page/summary/${encodeURIComponent(footballerQuery)}`;
        const footballerResponse = await safeFetch(footballerUrl);
        
        if (footballerResponse) {
          const footballerData = await footballerResponse.json();
          if (footballerData.type !== 'disambiguation' && footballerData.extract) {
            return {
              ...footballerData,
              _source: 'Wikipedia',
              _searchMethod: 'footballer_suffix'
            };
          }
        }
      }
      
      // Strategy 4: Try first name only for players
      if (query.includes(' ')) {
        const firstName = query.split(' ')[0];
        const firstNameUrl = `${API_CONFIG.wikipedia.baseUrl}/page/summary/${encodeURIComponent(firstName)}`;
        const firstNameResponse = await safeFetch(firstNameUrl);
        
        if (firstNameResponse) {
          const firstNameData = await firstNameResponse.json();
          // Only return if it's about a person
          if (firstNameData.type === 'standard' && firstNameData.ns === 0) {
            return {
              ...firstNameData,
              _source: 'Wikipedia',
              _searchMethod: 'first_name_only',
              _note: 'Using first name only - may not be exact match'
            };
          }
        }
      }
      
      console.log(`[Wikipedia] No suitable page found for: "${query}"`);
      return null;
      
    } catch (error: any) {
      console.error('[Wikipedia] Error:', error.message);
      return null;
    }
  });
};

// Wikidata API integration with SPARQL queries for better data
export const getCoachFromWikidata = async (teamName: string): Promise<string | null> => {
  const cacheKey = `wikidata_coach_${teamName.toLowerCase().trim()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikidata] Searching for coach of: ${teamName}`);
    
    try {
      // First, search for the team entity
      const searchUrl = `${API_CONFIG.wikidata.baseUrl}`;
      const searchParams = new URLSearchParams({
        action: 'wbsearchentities',
        search: teamName,
        language: 'en',
        format: 'json',
        type: 'item'
      });
      
      const searchResponse = await safeFetch(`${searchUrl}?${searchParams}`);
      
      if (!searchResponse) {
        return null;
      }
      
      const searchData = await searchResponse.json();
      
      if (!searchData.search || searchData.search.length === 0) {
        return null;
      }
      
      const teamEntity = searchData.search[0];
      const entityId = teamEntity.id;
      
      // Use SPARQL query for more reliable coach data
      const sparqlQuery = `
        SELECT ?coach ?coachLabel WHERE {
          wd:${entityId} wdt:P286 ?coach.
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
        LIMIT 1
      `;
      
      const sparqlUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;
      const sparqlResponse = await safeFetch(sparqlUrl);
      
      if (!sparqlResponse) {
        return null;
      }
      
      const sparqlData = await sparqlResponse.json();
      
      if (sparqlData.results?.bindings?.length > 0) {
        const coachName = sparqlData.results.bindings[0].coachLabel?.value;
        return coachName || null;
      }
      
      return null;
      
    } catch (error: any) {
      console.error('[Wikidata Coach] Error:', error.message);
      return null;
    }
  });
};

export const getCurrentTeamFromWikidata = async (playerName: string): Promise<string | null> => {
  const cacheKey = `wikidata_team_${playerName.toLowerCase().trim()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikidata] Searching for current team of: ${playerName}`);
    
    try {
      // Use SPARQL query for player's current team
      const sparqlQuery = `
        SELECT ?player ?playerLabel ?team ?teamLabel WHERE {
          ?player wdt:P106 wd:Q937857;  # occupation: association football player
                 ?label "${playerName}"@en.
          OPTIONAL {
            ?player wdt:P54 ?team.  # current team
            SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
          }
        }
        LIMIT 5
      `;
      
      const sparqlUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;
      const sparqlResponse = await safeFetch(sparqlUrl);
      
      if (!sparqlResponse) {
        return null;
      }
      
      const sparqlData = await sparqlResponse.json();
      
      if (sparqlData.results?.bindings?.length > 0) {
        for (const result of sparqlData.results.bindings) {
          if (result.teamLabel?.value) {
            return result.teamLabel.value;
          }
        }
      }
      
      return null;
      
    } catch (error: any) {
      console.error('[Wikidata Team] Error:', error.message);
      return null;
    }
  });
};

export const getTeamTrophiesFromWikidata = async (teamName: string): Promise<any> => {
  const cacheKey = `wikidata_trophies_${teamName.toLowerCase().trim()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikidata] Searching for trophies of: ${teamName}`);
    
    const emptyAchievements = {
      worldCup: [] as string[],
      international: [] as string[],
      continental: [] as string[],
      domestic: [] as string[]
    };
    
    try {
      // Complex SPARQL query for team achievements
      const sparqlQuery = `
        SELECT ?achievement ?achievementLabel WHERE {
          # Find the team
          ?team ?label "${teamName}"@en;
                wdt:P106 wd:Q476028;  # is a sports team
                
                # Get achievements via various properties
                (wdt:P1344|wdt:P166|wdt:P1411) ?achievement.  # winner of, award received, league level
        
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
        LIMIT 20
      `;
      
      const sparqlUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;
      const sparqlResponse = await safeFetch(sparqlUrl);
      
      if (!sparqlResponse) {
        return emptyAchievements;
      }
      
      const sparqlData = await sparqlResponse.json();
      const achievements: string[] = [];
      
      if (sparqlData.results?.bindings?.length > 0) {
        sparqlData.results.bindings.forEach((result: any) => {
          if (result.achievementLabel?.value) {
            achievements.push(result.achievementLabel.value);
          }
        });
      }
      
      // Categorize achievements (simplified - would need more complex logic)
      return {
        worldCup: achievements.filter(a => a.toLowerCase().includes('world cup') && !a.toLowerCase().includes('club')),
        international: achievements.filter(a => 
          a.toLowerCase().includes('champions league') || 
          a.toLowerCase().includes('club world cup') ||
          a.toLowerCase().includes('intercontinental cup')
        ),
        continental: achievements.filter(a => 
          a.toLowerCase().includes('uefa') || 
          a.toLowerCase().includes('europa league') ||
          a.toLowerCase().includes('libertadores') ||
          a.toLowerCase().includes('copa sudamericana') ||
          a.toLowerCase().includes('concacaf')
        ),
        domestic: achievements.filter(a => 
          !a.toLowerCase().includes('world cup') &&
          !a.toLowerCase().includes('champions league') &&
          !a.toLowerCase().includes('uefa') &&
          !a.toLowerCase().includes('libertadores') &&
          !a.toLowerCase().includes('copa sudamericana') &&
          !a.toLowerCase().includes('concacaf')
        )
      };
      
    } catch (error: any) {
      console.error('[Wikidata Trophies] Error:', error.message);
      return emptyAchievements;
    }
  });
};

// Player interface (moved here to avoid circular dependency)
interface LocalPlayer {
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
  _priority?: 'high' | 'medium' | 'low';
}

// Player conversion utilities
export const convertFootballDataToPlayers = (teamData: any): LocalPlayer[] => {
  if (!teamData || !teamData.squad || !Array.isArray(teamData.squad)) {
    return [];
  }
  
  return teamData.squad.map((player: any) => ({
    name: player.name,
    currentTeam: teamData.name,
    position: mapPosition(player.position),
    age: calculateAge(player.dateOfBirth),
    nationality: player.nationality,
    careerGoals: 0, // Would need additional API calls
    careerAssists: 0,
    internationalAppearances: 0,
    internationalGoals: 0,
    majorAchievements: [],
    careerSummary: `${player.name} is a ${player.position} for ${teamData.name}.`,
    _source: teamData._source || 'Football Data API',
    _lastVerified: teamData._lastVerified || new Date().toISOString(),
    _priority: 'high'
  }));
};

// Achievement categorization from SportsDB honors
export const categorizeAchievementsFromHonors = (honors: any[]): any => {
  const achievements = {
    worldCup: [] as string[],
    international: [] as string[],
    continental: [] as string[],
    domestic: [] as string[]
  };
  
  if (!honors || !Array.isArray(honors) || honors.length === 0) {
    return achievements;
  }
  
  // Group honors by type and count
  const honorGroups: Record<string, { count: number; years: string[] }> = {};
  
  honors.forEach((honor: any) => {
    const honorName = honor.strHonour?.toLowerCase() || '';
    const season = honor.strSeason || '';
    
    // Categorize honor
    let category = 'domestic';
    let displayName = honor.strHonour || 'Unknown Honor';
    
    if (honorName.includes('world cup') && !honorName.includes('club')) {
      category = 'worldCup';
    } else if (honorName.includes('champions league') || honorName.includes('european cup')) {
      category = 'continental';
      displayName = 'UEFA Champions League';
    } else if (honorName.includes('club world cup') || honorName.includes('intercontinental')) {
      category = 'international';
      displayName = 'FIFA Club World Cup';
    } else if (honorName.includes('uefa') || honorName.includes('europa league') || 
               honorName.includes('copa libertadores') || honorName.includes('concacaf champions')) {
      category = 'continental';
    } else if (honorName.includes('super cup') || honorName.includes('supercopa')) {
      category = 'domestic'; // Domestic super cups
    } else if (honorName.includes('copa américa') || honorName.includes('euro') || 
               honorName.includes('africa cup') || honorName.includes('asian cup')) {
      category = 'international';
    }
    
    if (!honorGroups[displayName]) {
      honorGroups[displayName] = { count: 0, years: [] };
    }
    
    honorGroups[displayName].count++;
    if (season) {
      const yearMatch = season.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        honorGroups[displayName].years.push(yearMatch[0]);
      }
    }
  });
  
  // Convert to achievement strings
  Object.entries(honorGroups).forEach(([honorName, data]) => {
    let achievementString = '';
    if (data.count > 1) {
      achievementString = `${data.count}x ${honorName}`;
      if (data.years.length > 0) {
        const recentYears = data.years.slice(-3).join(', ');
        achievementString += ` (last: ${recentYears})`;
      }
    } else {
      achievementString = honorName;
      if (data.years.length > 0) {
        achievementString += ` (${data.years[0]})`;
      }
    }
    
    // Determine category for this honor
    const honorLower = honorName.toLowerCase();
    if (honorLower.includes('world cup') && !honorLower.includes('club')) {
      achievements.worldCup.push(achievementString);
    } else if (honorLower.includes('champions league') || honorLower.includes('club world cup') || 
               honorLower.includes('intercontinental')) {
      achievements.international.push(achievementString);
    } else if (honorLower.includes('uefa') || honorLower.includes('europa') || 
               honorLower.includes('libertadores') || honorLower.includes('concacaf')) {
      achievements.continental.push(achievementString);
    } else if (honorLower.includes('copa américa') || honorLower.includes('euro') || 
               honorLower.includes('africa cup') || honorLower.includes('asian cup')) {
      achievements.international.push(achievementString);
    } else {
      achievements.domestic.push(achievementString);
    }
  });
  
  return achievements;
};

// Clear all caches
export const clearApiCaches = () => {
  apiCache.clear();
  console.log('[API CACHE] Cleared all API caches');
};

// Enhanced helper functions
const mapPosition = (position: string): string => {
  if (!position) return 'Player';
  
  const positionMap: Record<string, string> = {
    'Goalkeeper': 'Goalkeeper',
    'Goalkeeper, Goalkeeper': 'Goalkeeper',
    'Defence': 'Defender',
    'Defender': 'Defender',
    'Centre-Back': 'Defender',
    'Left-Back': 'Defender',
    'Right-Back': 'Defender',
    'Midfield': 'Midfielder',
    'Midfielder': 'Midfielder',
    'Defensive Midfield': 'Midfielder',
    'Central Midfield': 'Midfielder',
    'Attacking Midfield': 'Midfielder',
    'Left Midfield': 'Midfielder',
    'Right Midfield': 'Midfielder',
    'Offence': 'Forward',
    'Forward': 'Forward',
    'Attacker': 'Forward',
    'Striker': 'Forward',
    'Centre-Forward': 'Forward',
    'Left Winger': 'Forward',
    'Right Winger': 'Forward',
    'Second Striker': 'Forward'
  };
  
  return positionMap[position] || position || 'Player';
};

const calculateAge = (dateOfBirth: string): number | undefined => {
  if (!dateOfBirth) return undefined;
  
  try {
    // Handle various date formats
    let birthDate: Date;
    
    if (dateOfBirth.includes('T')) {
      birthDate = new Date(dateOfBirth);
    } else if (dateOfBirth.includes('-')) {
      birthDate = new Date(dateOfBirth);
    } else {
      // Try to parse other formats
      birthDate = new Date(dateOfBirth.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    }
    
    if (isNaN(birthDate.getTime())) {
      return undefined;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Validate reasonable age for football players
    if (age < 16 || age > 50) {
      return undefined;
    }
    
    return age;
  } catch (error) {
    return undefined;
  }
};

// New: Fallback data sources for when APIs fail
export const getFallbackTeamData = (teamName: string): any => {
  const commonTeams: Record<string, any> = {
    'manchester city': {
      name: 'Manchester City',
      type: 'club',
      country: 'England',
      stadium: 'Etihad Stadium',
      currentCoach: 'Pep Guardiola',
      foundedYear: 1880,
      majorAchievements: {
        worldCup: [],
        international: ['1x FIFA Club World Cup (2023)'],
        continental: ['1x UEFA Champions League (2023)'],
        domestic: ['9x Premier League', '7x FA Cup', '8x EFL Cup']
      },
      _source: 'Fallback Database',
      _lastVerified: '2025-01-01'
    },
    'real madrid': {
      name: 'Real Madrid',
      type: 'club',
      country: 'Spain',
      stadium: 'Santiago Bernabéu',
      currentCoach: 'Carlo Ancelotti',
      foundedYear: 1902,
      majorAchievements: {
        worldCup: [],
        international: ['5x FIFA Club World Cup'],
        continental: ['14x UEFA Champions League'],
        domestic: ['35x La Liga', '20x Copa del Rey']
      },
      _source: 'Fallback Database',
      _lastVerified: '2025-01-01'
    },
    // Add more common teams as needed
  };
  
  return commonTeams[teamName.toLowerCase()] || null;
};

// Export everything at the end to ensure all functions are available
export default {
  fetchVerifiedSquad,
  convertFootballDataToPlayers,
  fetchTeamInfoFromSportsDB,
  fetchCoachFromSportsDB,
  fetchTeamHonorsFromSportsDB,
  fetchFromWikipedia,
  getCoachFromWikidata,
  getCurrentTeamFromWikidata,
  getTeamTrophiesFromWikidata,
  categorizeAchievementsFromHonors,
  clearApiCaches,
  getFallbackTeamData
};