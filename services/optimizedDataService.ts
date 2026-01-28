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

// Helper function for cached API calls
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
    throw error;
  }
};

// Football Data API integration
export const fetchVerifiedSquad = async (teamName: string): Promise<any> => {
  const cacheKey = `footballData_squad_${teamName.toLowerCase()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[FootballData] Searching for team: ${teamName}`);
    
    // First, try to find team ID by name
    const searchUrl = `${API_CONFIG.footballData.baseUrl}/teams`;
    const searchParams = new URLSearchParams({
      name: teamName,
      limit: '5'
    });
    
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        'X-Auth-Token': API_CONFIG.footballData.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Football Data search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const teams = searchData.teams || searchData;
    
    if (!teams || teams.length === 0) {
      console.log(`[FootballData] No team found for: ${teamName}`);
      return null;
    }
    
    // Find best match
    const team = teams[0];
    const teamId = team.id;
    
    // Get team details with squad
    const teamUrl = `${API_CONFIG.footballData.baseUrl}/teams/${teamId}`;
    const teamResponse = await fetch(teamUrl, {
      headers: {
        'X-Auth-Token': API_CONFIG.footballData.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!teamResponse.ok) {
      throw new Error(`Football Data team fetch failed: ${teamResponse.status}`);
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
      stadium: teamData.venue
    };
  });
};

// SportsDB API integration
export const fetchTeamInfoFromSportsDB = async (teamName: string): Promise<any> => {
  const cacheKey = `sportsdb_team_${teamName.toLowerCase()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[SportsDB] Searching for team: ${teamName}`);
    
    const searchUrl = `${API_CONFIG.sportsDB.baseUrl}/searchteams.php`;
    const params = new URLSearchParams({ t: teamName });
    
    const response = await fetch(`${searchUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`SportsDB search failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.teams || data.teams.length === 0) {
      // Try alternative search
      const altResponse = await fetch(`${API_CONFIG.sportsDB.baseUrl}/searchallteams.php?l=${encodeURIComponent(teamName)}`);
      if (altResponse.ok) {
        const altData = await altResponse.json();
        if (altData.teams && altData.teams.length > 0) {
          return altData.teams[0];
        }
      }
      return null;
    }
    
    return data.teams[0];
  });
};

export const fetchCoachFromSportsDB = async (teamId: string): Promise<string | null> => {
  const cacheKey = `sportsdb_coach_${teamId}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[SportsDB] Fetching coach for team ID: ${teamId}`);
    
    const teamUrl = `${API_CONFIG.sportsDB.baseUrl}/lookupteam.php`;
    const params = new URLSearchParams({ id: teamId });
    
    const response = await fetch(`${teamUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`SportsDB team fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.teams && data.teams.length > 0) {
      return data.teams[0].strManager || null;
    }
    
    return null;
  });
};

export const fetchTeamHonorsFromSportsDB = async (teamId: string): Promise<any[]> => {
  const cacheKey = `sportsdb_honors_${teamId}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[SportsDB] Fetching honors for team ID: ${teamId}`);
    
    const honorsUrl = `${API_CONFIG.sportsDB.baseUrl}/lookuphonors.php`;
    const params = new URLSearchParams({ id: teamId });
    
    const response = await fetch(`${honorsUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`SportsDB honors fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.honours || [];
  });
};

// Wikipedia API integration
export const fetchFromWikipedia = async (query: string, language: string = 'en'): Promise<any> => {
  const cacheKey = `wikipedia_${language}_${query.toLowerCase()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikipedia] Fetching: "${query}" in ${language}`);
    
    const url = `${API_CONFIG.wikipedia.baseUrl}/page/summary/${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FutbolAI/1.0'
      }
    });
    
    if (!response.ok) {
      // Try with underscores for spaces
      const altQuery = query.replace(/ /g, '_');
      const altUrl = `${API_CONFIG.wikipedia.baseUrl}/page/summary/${encodeURIComponent(altQuery)}`;
      const altResponse = await fetch(altUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FutbolAI/1.0'
        }
      });
      
      if (altResponse.ok) {
        return await altResponse.json();
      }
      
      throw new Error(`Wikipedia fetch failed: ${response.status}`);
    }
    
    return await response.json();
  });
};

// Wikidata API integration
export const getCoachFromWikidata = async (teamName: string): Promise<string | null> => {
  const cacheKey = `wikidata_coach_${teamName.toLowerCase()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikidata] Searching for coach of: ${teamName}`);
    
    // First, search for the team entity
    const searchUrl = `${API_CONFIG.wikidata.baseUrl}`;
    const searchParams = new URLSearchParams({
      action: 'wbsearchentities',
      search: teamName,
      language: 'en',
      format: 'json',
      type: 'item'
    });
    
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
    
    if (!searchResponse.ok) {
      return null;
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.search || searchData.search.length === 0) {
      return null;
    }
    
    const teamEntity = searchData.search[0];
    const entityId = teamEntity.id;
    
    // Now query for coach information
    const queryUrl = `${API_CONFIG.wikidata.baseUrl}`;
    const queryParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: entityId,
      props: 'claims',
      format: 'json'
    });
    
    const queryResponse = await fetch(`${queryUrl}?${queryParams}`);
    
    if (!queryResponse.ok) {
      return null;
    }
    
    const entityData = await queryResponse.json();
    const claims = entityData.entities?.[entityId]?.claims;
    
    if (!claims) {
      return null;
    }
    
    // Look for coach property (P286)
    const coachClaims = claims.P286;
    if (coachClaims && coachClaims.length > 0) {
      const coachId = coachClaims[0].mainsnak.datavalue?.value.id;
      
      if (coachId) {
        // Get coach name
        const coachQueryParams = new URLSearchParams({
          action: 'wbgetentities',
          ids: coachId,
          props: 'labels',
          format: 'json',
          languages: 'en'
        });
        
        const coachResponse = await fetch(`${queryUrl}?${coachQueryParams}`);
        if (coachResponse.ok) {
          const coachData = await coachResponse.json();
          return coachData.entities?.[coachId]?.labels?.en?.value || null;
        }
      }
    }
    
    return null;
  });
};

export const getCurrentTeamFromWikidata = async (playerName: string): Promise<string | null> => {
  const cacheKey = `wikidata_team_${playerName.toLowerCase()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikidata] Searching for current team of: ${playerName}`);
    
    // Search for player entity
    const searchUrl = `${API_CONFIG.wikidata.baseUrl}`;
    const searchParams = new URLSearchParams({
      action: 'wbsearchentities',
      search: playerName,
      language: 'en',
      format: 'json',
      type: 'item'
    });
    
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
    
    if (!searchResponse.ok) {
      return null;
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.search || searchData.search.length === 0) {
      return null;
    }
    
    const playerEntity = searchData.search[0];
    const entityId = playerEntity.id;
    
    // Query for team information
    const queryUrl = `${API_CONFIG.wikidata.baseUrl}`;
    const queryParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: entityId,
      props: 'claims',
      format: 'json'
    });
    
    const queryResponse = await fetch(`${queryUrl}?${queryParams}`);
    
    if (!queryResponse.ok) {
      return null;
    }
    
    const entityData = await queryResponse.json();
    const claims = entityData.entities?.[entityId]?.claims;
    
    if (!claims) {
      return null;
    }
    
    // Look for current team property (P54)
    const teamClaims = claims.P54;
    if (teamClaims && teamClaims.length > 0) {
      const teamId = teamClaims[0].mainsnak.datavalue?.value.id;
      
      if (teamId) {
        // Get team name
        const teamQueryParams = new URLSearchParams({
          action: 'wbgetentities',
          ids: teamId,
          props: 'labels',
          format: 'json',
          languages: 'en'
        });
        
        const teamResponse = await fetch(`${queryUrl}?${teamQueryParams}`);
        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          return teamData.entities?.[teamId]?.labels?.en?.value || null;
        }
      }
    }
    
    return null;
  });
};

export const getTeamTrophiesFromWikidata = async (teamName: string): Promise<any> => {
  const cacheKey = `wikidata_trophies_${teamName.toLowerCase()}`;
  
  return cachedFetch(cacheKey, async () => {
    console.log(`[Wikidata] Searching for trophies of: ${teamName}`);
    
    // This is a simplified version - Wikidata trophy data requires complex SPARQL queries
    // For now, return empty structure
    return {
      worldCup: [],
      international: [],
      continental: [],
      domestic: []
    };
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
  if (!teamData.squad || !Array.isArray(teamData.squad)) {
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
    _source: 'Football Data API',
    _lastVerified: new Date().toISOString(),
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
  
  if (!honors || !Array.isArray(honors)) return achievements;
  
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
      category = 'international';
      displayName = 'UEFA Champions League';
    } else if (honorName.includes('club world cup') || honorName.includes('intercontinental')) {
      category = 'international';
      displayName = 'FIFA Club World Cup';
    } else if (honorName.includes('uefa') || honorName.includes('europa league') || 
               honorName.includes('libertadores') || honorName.includes('concacaf champions')) {
      category = 'continental';
    } else if (honorName.includes('super cup') || honorName.includes('supercopa')) {
      category = 'domestic'; // Domestic super cups
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

// Helper functions (private/internal)
const mapPosition = (position: string): string => {
  const positionMap: Record<string, string> = {
    'Goalkeeper': 'Goalkeeper',
    'Defence': 'Defender',
    'Defender': 'Defender',
    'Midfield': 'Midfielder',
    'Midfielder': 'Midfielder',
    'Offence': 'Forward',
    'Forward': 'Forward',
    'Attacker': 'Forward',
    'Striker': 'Forward'
  };
  
  return positionMap[position] || 'Player';
};

const calculateAge = (dateOfBirth: string): number | undefined => {
  if (!dateOfBirth) return undefined;
  
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    return undefined;
  }
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
  clearApiCaches
};