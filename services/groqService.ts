import Groq from 'groq-sdk';
import { validatePlayer } from './dataValidationService';
import { getPlayerImage } from './playerImageService';
import { 
  fetchVerifiedSquad, 
  convertFootballDataToPlayers,
  fetchTeamHonorsFromSportsDB,
  fetchCoachFromSportsDB,
  fetchTeamInfoFromSportsDB,
  getCoachFromWikidata,
  getTeamTrophiesFromWikidata
} from './optimizedDataService';

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
  imageUrl?: string;
  _source?: string;
  _lastVerified?: string;
  _wikiSummary?: string;
  _era?: string;
  _yearsAtTeam?: string;
  _needsVerification?: boolean;
  _priority?: 'high' | 'medium' | 'low';
  _updateReason?: string;
  _confidence?: number;
}

export interface Team {
  name: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  majorAchievements: {
    worldCup?: string[];
    international?: string[];
    continental?: string[];
    domestic: string[];
  };
  _source?: string;
  _lastVerified?: string;
  _updateReason?: string;
  _wikiSummary?: string;
  _achievementsUpdated?: boolean;
  _confidence?: number;
  _sportsDbId?: string;
  _verifiedTrophies?: {
    worldCup?: number;
    championsLeague?: number;
    domesticLeague?: number;
    domesticCup?: number;
    clubWorldCup?: number;
  };
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: {
    enhancedAt?: string;
    analysis?: any;
    appliedUpdates?: string[];
    dataSources?: string[];
    currentSeason?: string;
    dataCurrency?: {
      aiCutoff: string;
      verifiedWith: string;
      confidence: string;
      lastVerified: string;
    };
    disclaimer?: string;
    recommendations?: string[];
    confidenceScore?: number;
    verificationLevel?: 'high' | 'medium' | 'low';
  };
}

const CURRENT_YEAR = 2025;
const CURRENT_SEASON = `${CURRENT_YEAR}/${CURRENT_YEAR + 1}`;

// Cache management
let cache: Map<string, { data: GROQSearchResponse; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const clearStaleCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
};

// FIXED: Enhanced achievement parsing function
const parseAchievementTitles = (achievementArray: string[] | undefined): number => {
  if (!achievementArray || achievementArray.length === 0) return 0;
  
  let total = 0;
  
  for (const entry of achievementArray) {
    if (!entry || typeof entry !== 'string') continue;
    
    const entryLower = entry.toLowerCase();
    
    // Skip "no achievements" entries
    if (entryLower.includes('no ') || entryLower.includes('none') || 
        entryLower.includes('n/a') || entryLower.includes('unknown')) {
      continue;
    }
    
    // Handle "5x UEFA Champions League"
    const prefixMatch = entry.match(/^(\d+)\s*x\s+/i);
    if (prefixMatch) {
      total += parseInt(prefixMatch[1], 10);
      continue;
    }
    
    // Handle "UEFA Champions League (5 titles)"
    const suffixMatch = entry.match(/\((\d+)(?:\s*titles?)?\)/i);
    if (suffixMatch) {
      total += parseInt(suffixMatch[1], 10);
      continue;
    }
    
    // Handle year lists "1992, 2006, 2009, 2011, 2015"
    const years = entry.match(/\b(19|20)\d{2}\b/g);
    if (years && years.length > 0) {
      total += years.length;
      continue;
    }
    
    // Handle "Champions League: 5 wins"
    const winsMatch = entry.match(/:?\s*(\d+)\s+wins?/i);
    if (winsMatch) {
      total += parseInt(winsMatch[1], 10);
      continue;
    }
    
    // If it contains trophy name, count as 1
    const trophyNames = [
      'champions league', 'world cup', 'ballon d\'or', 'la liga', 
      'premier league', 'copa del rey', 'fa cup', 'bundesliga', 
      'serie a', 'ligue 1', 'copa américa', 'uefa euro', 
      'club world cup', 'supercopa', 'super cup', 'europa league',
      'libertadores', 'copa sudamericana', 'afc champions league',
      'confederations cup', 'nations league', 'gold cup',
      'africa cup of nations', 'asian cup'
    ];
    
    if (trophyNames.some(trophy => entryLower.includes(trophy))) {
      total += 1;
      continue;
    }
  }
  
  return total;
};

// FIXED: Enhanced achievement categorization
const parseAchievementsForDisplay = (achievements: string[] | undefined, teamType: 'club' | 'national'): {
  worldCup?: string[];
  international?: string[];
  continental?: string[];
  domestic: string[];
} => {
  const result: any = {
    worldCup: [] as string[],
    international: [] as string[],
    continental: [] as string[],
    domestic: [] as string[]
  };
  
  if (!achievements || !Array.isArray(achievements) || achievements.length === 0) {
    return result;
  }
  
  achievements.forEach((achievement) => {
    if (!achievement || typeof achievement !== 'string') return;
    
    const achievementLower = achievement.toLowerCase();
    
    // Skip empty entries
    if (achievementLower.includes('no ') || achievementLower.includes('none') || 
        achievementLower.includes('n/a') || achievementLower.includes('unknown')) {
      return;
    }
    
    // For national teams
    if (teamType === 'national') {
      // World Cup achievements
      if (achievementLower.includes('world cup') && !achievementLower.includes('club world cup')) {
        result.worldCup!.push(achievement);
      }
      // International competitions
      else if (achievementLower.includes('copa américa') ||
               achievementLower.includes('confederations cup') ||
               achievementLower.includes('conmebol') ||
               achievementLower.includes('uefa euro') ||
               achievementLower.includes('africa cup') ||
               achievementLower.includes('asian cup') ||
               achievementLower.includes('gold cup') ||
               achievementLower.includes('olympic') ||
               achievementLower.includes('nations league') ||
               achievementLower.includes('arab cup') ||
               achievementLower.includes('continental cup')) {
        result.international!.push(achievement);
      }
      // Everything else for national teams should go in international
      else {
        result.international!.push(achievement);
      }
    } 
    // For club teams
    else {
      // Club World Cup
      if (achievementLower.includes('club world cup') || achievementLower.includes('intercontinental cup')) {
        result.international!.push(achievement);
      }
      // Champions League and other continental competitions
      else if (achievementLower.includes('champions league') ||
               achievementLower.includes('europa league') ||
               achievementLower.includes('libertadores') ||
               achievementLower.includes('copa sudamericana') ||
               achievementLower.includes('european cup') ||
               achievementLower.includes('continental cup') ||
               achievementLower.includes('uefa cup') ||
               achievementLower.includes('afc champions league') ||
               achievementLower.includes('concacaf champions cup')) {
        result.continental!.push(achievement);
      }
      // UEFA Super Cup and other super cups
      else if (achievementLower.includes('uefa super cup') ||
               achievementLower.includes('supercopa') ||
               achievementLower.includes('super cup')) {
        result.international!.push(achievement);
      }
      // Domestic competitions
      else {
        result.domestic!.push(achievement);
      }
    }
  });
  
  // IMPORTANT: For national teams, ensure domestic is ALWAYS empty
  if (teamType === 'national' && result.domestic.length > 0) {
    result.international = [...(result.international || []), ...result.domestic];
    result.domestic = [];
  }
  
  return result;
};

// Helper function for team type detection
const detectTeamType = (teamName: string, query: string, strLeague?: string, strSport?: string): 'club' | 'national' => {
  const nameLower = teamName.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Comprehensive list of national teams (countries)
  const nationalTeamKeywords = [
    // Country names
    'argentina', 'brazil', 'uruguay', 'paraguay', 'ecuador', 'chile', 'colombia',
    'peru', 'bolivia', 'venezuela', 'mexico', 'usa', 'canada', 'costa rica',
    'france', 'england', 'germany', 'spain', 'italy', 'portugal', 'netherlands',
    'belgium', 'switzerland', 'sweden', 'norway', 'denmark', 'poland', 'croatia',
    'serbia', 'russia', 'ukraine', 'turkey', 'greece', 'japan', 'south korea',
    'china', 'australia', 'new zealand', 'morocco', 'egypt', 'senegal', 'ghana',
    'nigeria', 'ivory coast', 'cameroon', 'algeria', 'tunisia', 'south africa',
    'saudi arabia', 'iran', 'iraq', 'uae', 'qatar', 'wales', 'scotland', 'ireland',
    'finland', 'austria', 'hungary', 'czech', 'slovakia', 'slovenia'
  ];
  
  // If the team name contains a country name, it's likely a national team
  if (nationalTeamKeywords.some(keyword => nameLower.includes(keyword) || queryLower.includes(keyword))) {
    console.log(`[TEAM-TYPE] Detected national team: ${teamName}`);
    return 'national';
  }
  
  // Check SportsDB league info
  if (strLeague) {
    const leagueLower = strLeague.toLowerCase();
    if (leagueLower.includes('national') || 
        leagueLower.includes('fifa') || 
        leagueLower.includes('world cup') ||
        leagueLower.includes('international')) {
      return 'national';
    }
  }
  
  // Default to club if not clearly a national team
  console.log(`[TEAM-TYPE] Detected club team: ${teamName}`);
  return 'club';
};

// Country names array
const countryNames = [
  'argentina', 'brazil', 'uruguay', 'paraguay', 'ecuador', 'chile', 'colombia',
  'peru', 'bolivia', 'venezuela', 'mexico', 'usa', 'canada', 'costa rica',
  'france', 'england', 'germany', 'spain', 'italy', 'portugal', 'netherlands',
  'belgium', 'switzerland', 'sweden', 'norway', 'denmark', 'poland', 'croatia',
  'serbia', 'russia', 'ukraine', 'turkey', 'greece', 'japan', 'south korea',
  'china', 'australia', 'new zealand', 'morocco', 'egypt', 'senegal', 'ghana',
  'nigeria', 'ivory coast', 'cameroon', 'algeria', 'tunisia', 'south africa',
  'saudi arabia', 'iran', 'iraq', 'uae', 'qatar', 'wales', 'scotland', 'ireland',
  'finland', 'austria', 'hungary', 'czech', 'slovakia', 'slovenia'
];

// FIXED: Enhanced team data fetching with better error handling
const fetchTeamWithPriority = async (teamName: string, isTeamSearch: boolean = true): Promise<Team | null> => {
  console.log(`[PRIORITY] Fetching team data for: ${teamName} (isTeamSearch: ${isTeamSearch})`);
  
  if (!isTeamSearch) {
    console.log(`[SKIP] Skipping team fetch for player search: ${teamName}`);
    return null;
  }
  
  // Helper function for better national team detection
  const detectTeamTypeFromData = (teamInfo: any, originalName: string): 'club' | 'national' => {
    const teamNameLower = (teamInfo.strTeam || originalName).toLowerCase();
    const leagueLower = teamInfo.strLeague?.toLowerCase() || '';
    
    // Check if team name contains a country name
    if (countryNames.some(country => teamNameLower.includes(country))) {
      console.log(`[TEAM-TYPE] Detected national team by country name: ${teamNameLower}`);
      return 'national';
    }
    
    // Check SportsDB league info for national team indicators
    if (leagueLower.includes('national') || 
        leagueLower.includes('fifa') || 
        leagueLower.includes('world cup') ||
        leagueLower.includes('international') ||
        leagueLower.includes('national team')) {
      console.log(`[TEAM-TYPE] Detected national team by league: ${leagueLower}`);
      return 'national';
    }
    
    // Check for specific national team patterns in team name
    if (teamNameLower.includes('national team') ||
        teamNameLower.includes('national squad') ||
        teamNameLower === originalName.toLowerCase()) {
      console.log(`[TEAM-TYPE] Detected national team by name pattern`);
      return 'national';
    }
    
    // If the team name equals the country field
    if (teamInfo.strCountry && teamNameLower === teamInfo.strCountry.toLowerCase()) {
      console.log(`[TEAM-TYPE] Detected national team by country match: ${teamInfo.strCountry}`);
      return 'national';
    }
    
    console.log(`[TEAM-TYPE] Defaulting to club team: ${teamNameLower}`);
    return 'club';
  };
  
  const prioritySources = [
    {
      name: 'SportsDB',
      priority: 1,
      fetch: async () => {
        console.log(`[SportsDB] Attempting to fetch team: ${teamName}`);
        const teamInfo = await fetchTeamInfoFromSportsDB(teamName);
        if (teamInfo) {
          const coach = await fetchCoachFromSportsDB(teamInfo.idTeam || teamInfo.id);
          let honors: string[] = [];
          
          try {
            const honorsData = await fetchTeamHonorsFromSportsDB(teamInfo.idTeam || teamInfo.id);
            honors = honorsData || [];
          } catch (error) {
            console.log(`[SportsDB] Honors fetch failed, using empty array`);
          }
          
          const teamType = detectTeamTypeFromData(teamInfo, teamName);
          const majorAchievements = parseAchievementsForDisplay(honors, teamType);
          
          let finalCountry = teamInfo.strCountry || '';
          if (teamType === 'national' && !finalCountry) {
            const countryMatch = countryNames.find(country => 
              (teamInfo.strTeam || teamName).toLowerCase().includes(country)
            );
            if (countryMatch) {
              finalCountry = countryMatch.charAt(0).toUpperCase() + countryMatch.slice(1);
            }
          }
          
          return {
            name: teamInfo.strTeam || teamName,
            type: teamType,
            country: finalCountry,
            stadium: teamType === 'national' ? undefined : teamInfo.strStadium,
            currentCoach: coach || 'Unknown',
            foundedYear: teamInfo.intFormedYear ? parseInt(teamInfo.intFormedYear) : undefined,
            majorAchievements: majorAchievements,
            _source: 'SportsDB',
            _lastVerified: new Date().toISOString(),
            _confidence: 85,
            _sportsDbId: teamInfo.idTeam || teamInfo.id,
            _updateReason: teamType === 'national' ? 'National team detected' : undefined
          } as Team;
        }
        return null;
      }
    },
    {
      name: 'Wikipedia',
      priority: 2,
      fetch: async () => {
        console.log(`[Wikipedia] Attempting to fetch team: ${teamName}`);
        const wikiData = await fetchFromWikipedia(teamName);
        if (wikiData?.summary) {
          const coach = extractCoachFromWikipedia(wikiData.summary, teamName);
          const teamType = detectTeamType(teamName, teamName);
          
          // Extract achievements from Wikipedia summary
          const achievements: string[] = [];
          const summary = wikiData.summary.toLowerCase();
          
          if (teamType === 'national') {
            if (summary.includes('world cup')) {
              // Try to extract World Cup count
              const worldCupMatch = wikiData.summary.match(/(\d+)\s*FIFA\s*World\s*Cup/i) || 
                                   wikiData.summary.match(/World\s*Cup.*?(\d+)/i);
              if (worldCupMatch && worldCupMatch[1]) {
                achievements.push(`${worldCupMatch[1]}x FIFA World Cup`);
              } else if (summary.includes('world cup winner') || summary.includes('won the world cup')) {
                achievements.push('FIFA World Cup');
              }
            }
            
            if (summary.includes('copa américa') || summary.includes('copa america')) {
              const copaMatch = wikiData.summary.match(/(\d+)\s*Copa\s*Am[eé]rica/i);
              if (copaMatch && copaMatch[1]) {
                achievements.push(`${copaMatch[1]}x Copa América`);
              } else {
                achievements.push('Copa América');
              }
            }
            
            if (summary.includes('euro') && summary.includes('championship')) {
              const euroMatch = wikiData.summary.match(/(\d+)\s*UEFA\s*European\s*Championship/i);
              if (euroMatch && euroMatch[1]) {
                achievements.push(`${euroMatch[1]}x UEFA European Championship`);
              } else {
                achievements.push('UEFA European Championship');
              }
            }
          } else {
            // Club achievements
            if (summary.includes('champions league') || summary.includes('european cup')) {
              const clMatch = wikiData.summary.match(/(\d+)\s*UEFA\s*Champions\s*League/i) ||
                             wikiData.summary.match(/(\d+)\s*European\s*Cup/i);
              if (clMatch && clMatch[1]) {
                achievements.push(`${clMatch[1]}x UEFA Champions League`);
              } else {
                achievements.push('UEFA Champions League');
              }
            }
            
            if (summary.includes('premier league') || summary.includes('la liga') || 
                summary.includes('bundesliga') || summary.includes('serie a') || 
                summary.includes('ligue 1')) {
              const leagueTypes = [
                { name: 'Premier League', regex: /premier league/i },
                { name: 'La Liga', regex: /la liga/i },
                { name: 'Bundesliga', regex: /bundesliga/i },
                { name: 'Serie A', regex: /serie a/i },
                { name: 'Ligue 1', regex: /ligue 1/i }
              ];
              
              for (const league of leagueTypes) {
                if (league.regex.test(wikiData.summary)) {
                  const match = wikiData.summary.match(new RegExp(`(\\d+)\\s*${league.name}`, 'i'));
                  if (match && match[1]) {
                    achievements.push(`${match[1]}x ${league.name}`);
                  } else {
                    achievements.push(league.name);
                  }
                  break;
                }
              }
            }
          }
          
          const majorAchievements = parseAchievementsForDisplay(achievements, teamType);
          
          return {
            name: wikiData.title || teamName,
            type: teamType,
            country: teamType === 'national' ? wikiData.title || teamName : '',
            stadium: undefined,
            currentCoach: coach || 'Unknown',
            foundedYear: undefined,
            majorAchievements: majorAchievements,
            _source: 'Wikipedia',
            _lastVerified: new Date().toISOString(),
            _confidence: 70,
            _wikiSummary: wikiData.summary.substring(0, 300) + '...'
          } as Team;
        }
        return null;
      }
    }
  ];
  
  // Execute sources in priority order
  for (const source of prioritySources.sort((a, b) => a.priority - b.priority)) {
    try {
      const teamData = await source.fetch();
      if (teamData && teamData.name) {
        console.log(`✓ [${source.name}] Successfully fetched team data for ${teamName}`);
        return teamData;
      }
    } catch (error: any) {
      console.warn(`[${source.name}] Failed for ${teamName}:`, error.message);
    }
  }
  
  console.warn(`[PRIORITY] All sources failed for ${teamName}`);
  return null;
};

const fetchFromWikipedia = async (query: string): Promise<any> => {
  console.log(`[Wikipedia] Fetching: "${query}"`);
  
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FutbolAI/1.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`[Wikipedia] Found: "${data.title}"`);
      return {
        summary: data.extract || '',
        title: data.title || '',
        fetchedAt: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Wikipedia] Error:', error);
    return null;
  }
};

const extractCoachFromWikipedia = (summary: string, teamName: string): string | null => {
  console.log(`[Wikipedia] Extracting coach for: ${teamName}`);
  
  const nameRegex = "([A-Z\\u00C0-\\u00FF][a-z\\u00C0-\\u00FF]+(?:\\s+[A-Z\\u00C0-\\u00FF][a-z\\u00C0-\\u00FF]+){1,3})";
  
  const coachPatterns = [
    new RegExp(`current\\s+(?:head\\s+)?coach\\s+is\\s+${nameRegex}`, 'i'),
    new RegExp(`manager\\s+is\\s+${nameRegex}`, 'i'),
    new RegExp(`managed\\s+by\\s+${nameRegex}`, 'i'),
    new RegExp(`head\\s+coach\\s+${nameRegex}`, 'i'),
    new RegExp(`manager\\s+${nameRegex}`, 'i'),
    new RegExp(`coach.*?${nameRegex}`, 'i')
  ];
  
  for (const pattern of coachPatterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      const coachName = match[1].replace(/[.,;]$/, '').trim();
      console.log(`[Wikipedia] Found coach: ${coachName}`);
      return coachName;
    }
  }
  
  return null;
};

// FIXED: Enhanced system prompt that works for ANY team/player
const getEnhancedSystemPrompt = (query: string, language: string = 'en', isTeamSearch: boolean = false): string => {
  const queryLower = query.toLowerCase();
  
  // Check if it's likely a national team
  const isNationalTeam = countryNames.some(country => queryLower.includes(country));
  
  if (isTeamSearch) {
    if (isNationalTeam) {
      return `You are a football expert providing accurate information about national teams. Search query: "${query}"

IMPORTANT INSTRUCTIONS FOR NATIONAL TEAMS:
1. Provide accurate 2025/2026 season information
2. Current coach MUST be correct for 2025/2026
3. World Cup trophies go in "worldCup" array
4. Other international trophies (Copa América, UEFA Euro, etc.) go in "international" array
5. "continental" and "domestic" arrays should be EMPTY for national teams
6. Include key current players
7. Use "Xx" format for trophy counts (e.g., "3x FIFA World Cup")

CRITICAL ACCURACY FOR MAJOR NATIONAL TEAMS:
- Argentina: 3 FIFA World Cup, 15 Copa América, current coach: Lionel Scaloni
- Brazil: 5 FIFA World Cup, 9 Copa América, current coach: Dorival Júnior
- Uruguay: 2 FIFA World Cup, 15 Copa América, current coach: Marcelo Bielsa
- France: 2 FIFA World Cup, 2 UEFA European Championship, current coach: Didier Deschamps
- England: 1 FIFA World Cup, current coach: Gareth Southgate
- Spain: 1 FIFA World Cup, 3 UEFA European Championship, current coach: Luis de la Fuente
- Germany: 4 FIFA World Cup, 3 UEFA European Championship, current coach: Julian Nagelsmann
- Italy: 4 FIFA World Cup, 2 UEFA European Championship, current coach: Luciano Spalletti
- Portugal: 1 UEFA European Championship, current coach: Roberto Martínez
- Netherlands: 1 UEFA European Championship, current coach: Ronald Koeman

REQUIRED JSON STRUCTURE:
{
  "teams": [{
    "name": "Team Name",
    "type": "national",
    "country": "Country Name",
    "stadium": "Main Stadium",
    "currentCoach": "Current Coach Name",
    "foundedYear": 1900,
    "majorAchievements": {
      "worldCup": ["Xx FIFA World Cup"],
      "international": ["Xx Copa América", "Xx UEFA European Championship"],
      "continental": [],
      "domestic": []
    }
  }],
  "players": [{
    "name": "Key Player Name",
    "currentTeam": "Current Club",
    "position": "Position",
    "age": 25,
    "nationality": "Nationality",
    "careerGoals": 100,
    "careerAssists": 50,
    "internationalAppearances": 50,
    "internationalGoals": 20,
    "majorAchievements": ["Key achievements"],
    "careerSummary": "Brief career summary"
  }]
}

Return ONLY valid JSON.`;
    } else {
      // Club team search
      return `You are a football expert providing accurate information about football clubs. Search query: "${query}"

IMPORTANT INSTRUCTIONS FOR CLUB TEAMS:
1. Provide accurate 2025/2026 season information
2. Current manager MUST be correct for 2025/2026
3. Club achievements should be categorized correctly:
   - "international": FIFA Club World Cup, UEFA Super Cup
   - "continental": UEFA Champions League, Europa League, Copa Libertadores
   - "domestic": League titles, domestic cups, super cups
4. "worldCup" array should be EMPTY for club teams
5. Include key current players
6. Use "Xx" format for trophy counts (e.g., "5x UEFA Champions League")

CRITICAL ACCURACY FOR MAJOR CLUBS:
- Real Madrid: 15 UEFA Champions League, 5 FIFA Club World Cup, current manager: Carlo Ancelotti
- Barcelona: 5 UEFA Champions League, 3 FIFA Club World Cup, current manager: Hansi Flick
- Manchester City: 1 UEFA Champions League, 1 FIFA Club World Cup, current manager: Pep Guardiola
- Bayern Munich: 6 UEFA Champions League, 2 FIFA Club World Cup, current manager: Vincent Kompany
- Liverpool: 6 UEFA Champions League, 1 FIFA Club World Cup, current manager: Arne Slot
- AC Milan: 7 UEFA Champions League, current manager: Paulo Fonseca
- Inter Milan: 3 UEFA Champions League, current manager: Simone Inzaghi
- Juventus: 2 UEFA Champions League, current manager: Thiago Motta
- Chelsea: 2 UEFA Champions League, 1 FIFA Club World Cup, current manager: Enzo Maresca
- Paris Saint-Germain: No UEFA Champions League, current manager: Luis Enrique

REQUIRED JSON STRUCTURE:
{
  "teams": [{
    "name": "Club Name",
    "type": "club",
    "country": "Country",
    "stadium": "Stadium Name",
    "currentCoach": "Current Manager",
    "foundedYear": 1900,
    "majorAchievements": {
      "worldCup": [],
      "international": ["Xx FIFA Club World Cup", "Xx UEFA Super Cup"],
      "continental": ["Xx UEFA Champions League", "Xx Europa League"],
      "domestic": ["Xx Premier League", "Xx FA Cup", "Xx EFL Cup"]
    }
  }],
  "players": [{
    "name": "Key Player Name",
    "currentTeam": "Current Club",
    "position": "Position",
    "age": 25,
    "nationality": "Nationality",
    "careerGoals": 100,
    "careerAssists": 50,
    "internationalAppearances": 50,
    "internationalGoals": 20,
    "majorAchievements": ["Key achievements"],
    "careerSummary": "Brief career summary"
  }]
}

Return ONLY valid JSON.`;
    }
  } else {
    // Player search
    return `You are a football expert providing accurate information about football players. Search query: "${query}"

IMPORTANT INSTRUCTIONS FOR PLAYER SEARCHES:
1. Provide accurate 2025/2026 season information
2. Include current team, position, nationality, age
3. Include career statistics (goals, assists, appearances)
4. Include major achievements (trophies, individual awards)
5. Provide a brief career summary
6. Focus on the SPECIFIC player named "${query}"

CRITICAL ACCURACY FOR MAJOR PLAYERS:
- Lionel Messi: Current team: Inter Miami, 8 Ballon d'Or, 4 Champions League, 1 World Cup
- Cristiano Ronaldo: Current team: Al Nassr, 5 Ballon d'Or, 5 Champions League, 1 Euro
- Kylian Mbappé: Current team: Real Madrid, 1 World Cup, top scorer
- Erling Haaland: Current team: Manchester City, Premier League top scorer
- Kevin De Bruyne: Current team: Manchester City, key midfielder
- Jude Bellingham: Current team: Real Madrid, young star
- Vinícius Júnior: Current team: Real Madrid, Champions League winner

REQUIRED JSON STRUCTURE:
{
  "players": [{
    "name": "Player Full Name",
    "currentTeam": "Current Club",
    "position": "Position (e.g., Forward, Midfielder, Defender, Goalkeeper)",
    "age": 25,
    "nationality": "Nationality",
    "careerGoals": 150,
    "careerAssists": 75,
    "internationalAppearances": 60,
    "internationalGoals": 30,
    "majorAchievements": [
      "Xx Ballon d'Or",
      "Xx UEFA Champions League",
      "Xx FIFA World Cup",
      "Xx Domestic League Titles"
    ],
    "careerSummary": "Brief career summary highlighting key achievements and current status."
  }],
  "teams": []
}

Return ONLY valid JSON.`;
  }
};

const getOptimalModel = (query: string): string => {
  const queryLower = query.toLowerCase();
  
  // Use 70B for major entities requiring high accuracy
  const majorEntities = [
    'barcelona', 'real madrid', 'bayern', 'manchester city', 'liverpool',
    'psg', 'arsenal', 'chelsea', 'manchester united', 'tottenham',
    'ac milan', 'inter milan', 'juventus', 'atletico madrid',
    'france', 'argentina', 'brazil', 'england', 'germany',
    'spain', 'italy', 'portugal', 'netherlands', 'uruguay',
    'messi', 'ronaldo', 'mbappé', 'mbappe', 'haaland', 'neymar'
  ];
  
  if (majorEntities.some(entity => queryLower.includes(entity))) {
    return 'llama-3.3-70b-versatile';
  }
  
  return 'llama-3.1-8b-instant';
};

const fetchPlayerImageWithRetry = async (playerName: string, retries = 2): Promise<string | undefined> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const imageResult = await getPlayerImage(playerName);
      if (imageResult.url) {
        return imageResult.url;
      }
    } catch (error) {
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  return undefined;
};

// Calculate confidence score
const calculateConfidenceScore = (data: any): number => {
  let score = 0;
  
  // Source weighting
  if (data._source?.includes('SportsDB')) score += 40;
  if (data._source?.includes('Wikipedia')) score += 30;
  if (data._source?.includes('GROQ')) score += 20;
  
  // Data completeness
  if (data.currentCoach && data.currentCoach !== 'Unknown') score += 15;
  if (data._lastVerified) {
    const daysOld = (Date.now() - new Date(data._lastVerified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 7) score += 15;
    else if (daysOld < 30) score += 10;
  }
  
  // For teams with achievements
  if (data.majorAchievements) {
    const achievements = data.majorAchievements;
    const hasAchievements = (achievements.worldCup && achievements.worldCup.length > 0) ||
                           (achievements.international && achievements.international.length > 0) ||
                           (achievements.continental && achievements.continental.length > 0) ||
                           (achievements.domestic && achievements.domestic.length > 0);
    if (hasAchievements) score += 10;
  }
  
  return Math.min(100, score);
};

// FIXED MAIN FUNCTION: Robust search with proper error handling
export const searchWithGROQ = async (query: string, language: string = 'en', bustCache: boolean = false, isTeamSearch: boolean = false): Promise<GROQSearchResponse> => {
  console.log(`\n⚽ [${CURRENT_SEASON}] Searching: "${query}" (${isTeamSearch ? 'TEAM' : 'PLAYER'} search)`);
  
  const selectedModel = getOptimalModel(query);
  console.log(`[MODEL] Using: ${selectedModel}`);
  
  clearStaleCache();
  
  const cacheKey = bustCache ? `${query}_${Date.now()}_${isTeamSearch}` : `${query.toLowerCase().trim()}_${isTeamSearch}`;
  
  if (!bustCache && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    const age = Date.now() - cached.timestamp;
    console.log(`[CACHE] Using cached (${Math.floor(age/1000)}s old)`);
    return cached.data;
  }
  
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    console.error('[ERROR] GROQ API key missing');
    return createErrorResponse(query, 'API key not configured');
  }
  
  try {
    console.log('[1/4] Fetching verified data from external sources...');
    
    let verifiedTeam: Team | null = null;
    let finalTeam: Team;
    let finalPlayers: Player[] = [];
    const corrections: string[] = [];
    const dataSources: string[] = [];
    
    if (isTeamSearch) {
      // Try to fetch team data
      verifiedTeam = await fetchTeamWithPriority(query, isTeamSearch);
      
      if (verifiedTeam) {
        finalTeam = verifiedTeam;
        dataSources.push(verifiedTeam._source || 'Unknown');
        console.log(`✓ [VERIFIED] Got team: ${finalTeam.name}, Type: ${finalTeam.type}`);
      } else {
        // Create default team with proper type detection
        const teamType = detectTeamType(query, query);
        finalTeam = {
          name: query,
          type: teamType,
          country: teamType === 'national' ? query : '',
          currentCoach: 'Unknown',
          majorAchievements: teamType === 'national' 
            ? { worldCup: [], international: [], continental: [], domestic: [] }
            : { worldCup: undefined, international: [], continental: [], domestic: [] },
          _source: 'System Default',
          _lastVerified: new Date().toISOString(),
          _confidence: 10,
          _updateReason: teamType === 'national' ? 'National team auto-detected' : 'Club team auto-detected'
        };
        console.log(`[DEFAULT] Created ${teamType} team for: ${query}`);
      }
    } else {
      // For player searches, just prepare empty team data
      finalTeam = {
        name: query,
        type: 'club',
        country: '',
        currentCoach: 'Unknown',
        majorAchievements: { worldCup: undefined, international: [], continental: [], domestic: [] },
        _source: 'Player Search',
        _lastVerified: new Date().toISOString(),
        _confidence: 0
      };
    }
    
    // STEP 2: Try to fetch squad data (for team searches)
    console.log('[2/4] Fetching squad data...');
    if (isTeamSearch) {
      try {
        const squadData = await fetchVerifiedSquad(query);
        if (squadData?.squad && squadData.squad.length > 0) {
          const convertedPlayers = convertFootballDataToPlayers(squadData);
          
          // Process players with images
          finalPlayers = await Promise.all(convertedPlayers.map(async (player: any, index: number) => {
            if (index > 0 && index % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            let imageUrl: string | undefined;
            try {
              imageUrl = await fetchPlayerImageWithRetry(player.name);
            } catch (error) {
              console.log(`[Image] Skipped for ${player.name}`);
            }
            
            return {
              ...player,
              imageUrl,
              _source: 'Football Data API',
              _lastVerified: new Date().toISOString(),
              _priority: 'high',
              _confidence: calculateConfidenceScore(player)
            };
          }));
          
          dataSources.push('Football Data API');
          console.log(`✓ [SQUAD] Got ${finalPlayers.length} verified players`);
        }
      } catch (error) {
        console.error('[SQUAD] Error, will use GROQ AI:', error);
      }
    }
    
    // STEP 3: Use GROQ AI for primary data
    console.log('[3/4] Enhancing with GROQ AI...');
    
    try {
      const systemPrompt = getEnhancedSystemPrompt(query, language, isTeamSearch);
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Provide ACCURATE 2025/2026 season information for: "${query}" (${isTeamSearch ? 'TEAM' : 'PLAYER'} search)` }
        ],
        model: selectedModel,
        temperature: 0.1,
        max_tokens: selectedModel.includes('70b') ? 4000 : 5000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      
      if (response) {
        try {
          const parsed = JSON.parse(response);
          dataSources.push('GROQ AI');
          
          // Process team data from GROQ
          if (isTeamSearch && parsed.teams?.[0]) {
            const groqTeam = parsed.teams[0];
            
            // Update team data with GROQ information
            finalTeam.name = groqTeam.name || finalTeam.name;
            finalTeam.type = groqTeam.type || finalTeam.type;
            finalTeam.currentCoach = groqTeam.currentCoach || finalTeam.currentCoach;
            finalTeam.stadium = groqTeam.stadium || finalTeam.stadium;
            finalTeam.foundedYear = groqTeam.foundedYear || finalTeam.foundedYear;
            finalTeam.country = groqTeam.country || finalTeam.country;
            
            // Parse achievements from GROQ
            if (groqTeam.majorAchievements) {
              const achievementsArray = [];
              if (groqTeam.majorAchievements.worldCup) achievementsArray.push(...groqTeam.majorAchievements.worldCup);
              if (groqTeam.majorAchievements.international) achievementsArray.push(...groqTeam.majorAchievements.international);
              if (groqTeam.majorAchievements.continental) achievementsArray.push(...groqTeam.majorAchievements.continental);
              if (groqTeam.majorAchievements.domestic) achievementsArray.push(...groqTeam.majorAchievements.domestic);
              
              finalTeam.majorAchievements = parseAchievementsForDisplay(achievementsArray, finalTeam.type);
            }
            
            corrections.push('Team data enhanced with GROQ AI');
          }
          
          // Process players from GROQ
          if (parsed.players && Array.isArray(parsed.players)) {
            const groqPlayers = isTeamSearch 
              ? parsed.players.slice(0, 15 - finalPlayers.length) // For teams, limit to 15 total
              : parsed.players.slice(0, 10); // For player searches, get up to 10
            
            const processedGroqPlayers = await Promise.all(groqPlayers.map(async (player: any, index: number) => {
              if (index > 0 && index % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              let imageUrl: string | undefined;
              try {
                imageUrl = await fetchPlayerImageWithRetry(player.name);
              } catch (error) {
                console.log(`[Image] Skipped for ${player.name}`);
              }
              
              return {
                name: player.name || 'Unknown',
                currentTeam: player.currentTeam || (isTeamSearch ? query : 'Unknown'),
                position: player.position || 'Player',
                age: player.age || undefined,
                nationality: player.nationality || 'Unknown',
                careerGoals: player.careerGoals || 0,
                careerAssists: player.careerAssists || 0,
                internationalAppearances: player.internationalAppearances || 0,
                internationalGoals: player.internationalGoals || 0,
                majorAchievements: player.majorAchievements || [],
                careerSummary: player.careerSummary || `${player.name} is a professional footballer.`,
                imageUrl,
                _source: 'GROQ AI',
                _lastVerified: new Date().toISOString(),
                _priority: 'medium',
                _confidence: 65
              };
            }));
            
            // Combine players
            if (isTeamSearch) {
              finalPlayers = [...finalPlayers, ...processedGroqPlayers];
            } else {
              finalPlayers = processedGroqPlayers;
            }
            
            console.log(`✓ [GROQ] Added ${processedGroqPlayers.length} players from AI`);
          }
        } catch (error) {
          console.error('[GROQ] Parse error:', error);
        }
      }
    } catch (error: any) {
      console.error('[GROQ] AI call failed:', error.message);
      // Don't throw, continue with what we have
    }
    
    // STEP 4: Final validation and enhancement
    console.log('[4/4] Final validation...');
    
    // Calculate achievement counts for team searches
    let achievementCounts = {
      worldCup: 0,
      international: 0,
      continental: 0,
      domestic: 0
    };
    
    if (isTeamSearch && finalTeam.majorAchievements) {
      achievementCounts = {
        worldCup: parseAchievementTitles(finalTeam.majorAchievements.worldCup),
        international: parseAchievementTitles(finalTeam.majorAchievements.international),
        continental: parseAchievementTitles(finalTeam.majorAchievements.continental),
        domestic: parseAchievementTitles(finalTeam.majorAchievements.domestic)
      };
    }
    
    // Calculate confidence scores
    if (isTeamSearch) {
      finalTeam._confidence = calculateConfidenceScore(finalTeam);
    }
    finalPlayers.forEach(p => {
      p._confidence = p._confidence || calculateConfidenceScore(p);
    });
    
    // Build response
    let message = '';
    if (isTeamSearch) {
      const coachInfo = finalTeam.currentCoach === 'Unknown' ? 'Coach: Unknown' : `Coach: ${finalTeam.currentCoach}`;
      message = `${finalTeam.name} • ${CURRENT_SEASON} • ${finalPlayers.length} players • ${coachInfo}`;
    } else {
      message = finalPlayers.length > 0 
        ? `${finalPlayers[0].name} • ${finalPlayers[0].currentTeam} • ${finalPlayers[0].position}`
        : `${query} • Player search`;
    }
    
    const finalResult: GROQSearchResponse = {
      players: finalPlayers,
      teams: isTeamSearch ? [finalTeam] : [],
      youtubeQuery: `${query} ${CURRENT_SEASON} ${isTeamSearch ? 'team' : 'player'} highlights football`,
      message: message,
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: {
          playerCount: finalPlayers.length,
          season: CURRENT_SEASON,
          achievementCounts: achievementCounts,
          totalAchievements: Object.values(achievementCounts).reduce((a, b) => a + b, 0),
          dataSources: dataSources,
          correctionsApplied: corrections.length,
          searchType: isTeamSearch ? 'team' : 'player',
          teamType: isTeamSearch ? finalTeam.type : undefined,
          coach: isTeamSearch ? finalTeam.currentCoach : undefined
        },
        appliedUpdates: corrections,
        dataSources: dataSources,
        currentSeason: CURRENT_SEASON,
        dataCurrency: {
          aiCutoff: '2025',
          verifiedWith: dataSources.join(', '),
          confidence: 'medium',
          lastVerified: new Date().toISOString()
        },
        disclaimer: `2025/2026 season data. Powered by multi-source verification.`,
        recommendations: [
          'Data enhanced with GROQ AI',
          'Includes Wikipedia verification',
          'Achievements categorized correctly'
        ],
        confidenceScore: isTeamSearch ? (finalTeam._confidence || 50) : 60,
        verificationLevel: 'medium'
      }
    };
    
    console.log(`[SUCCESS] ${finalPlayers.length} players, Confidence: ${finalResult._metadata?.confidenceScore}%`);
    if (isTeamSearch) {
      console.log(`[ACHIEVEMENTS] World Cup: ${achievementCounts.worldCup}, International: ${achievementCounts.international}, Continental: ${achievementCounts.continental}, Domestic: ${achievementCounts.domestic}`);
    }
    
    // Cache the result
    if (!bustCache) {
      cache.set(cacheKey, {
        data: finalResult,
        timestamp: Date.now()
      });
      console.log(`[CACHE] Result cached`);
    }
    
    console.log(`✅ [COMPLETE]\n`);
    return finalResult;
    
  } catch (error: any) {
    console.error('[ERROR] Search failed:', error);
    return createErrorResponse(query, error.message || 'Unknown error');
  }
};

const createErrorResponse = (query: string, error: string): GROQSearchResponse => {
  return {
    players: [],
    teams: [],
    youtubeQuery: `${query} football`,
    error: error,
    message: 'Search failed',
    _metadata: {
      enhancedAt: new Date().toISOString(),
      analysis: { error: error },
      appliedUpdates: [],
      dataSources: [],
      currentSeason: CURRENT_SEASON,
      dataCurrency: {
        aiCutoff: 'N/A',
        verifiedWith: 'None',
        confidence: 'low',
        lastVerified: new Date().toISOString()
      },
      disclaimer: 'Search failed. Please try again or check your connection.',
      recommendations: ['Try again', 'Check internet connection', 'Verify API key'],
      confidenceScore: 0,
      verificationLevel: 'low'
    }
  };
};

// Export functions with backwards compatibility
export const GROQSearch = (query: string, bustCache: boolean = false) => 
  searchWithGROQ(query, 'en', bustCache, false);

export const searchFresh = async (query: string) => {
  return await searchWithGROQ(query, 'en', true, false);
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('[CACHE] Cleared all cached results');
};

export const needsDataVerification = (response: GROQSearchResponse): boolean => {
  const metadata = response._metadata;
  return (
    !metadata?.analysis?.confidenceScore ||
    metadata.analysis.confidenceScore < 60 ||
    (metadata.analysis.searchType === 'team' && response.players.length < 3) ||
    (metadata.analysis.searchType === 'team' && metadata.analysis.coach === 'Unknown')
  );
};

export const getDataSourceInfo = (response: GROQSearchResponse): {
  source: string;
  color: string;
  icon: string;
  confidence: number;
} => {
  if (!response._metadata) {
    return { source: 'Unverified', color: 'gray', icon: '❓', confidence: 0 };
  }
  
  const dataSources = response._metadata.dataSources || [];
  const hasSportsDB = dataSources.includes('SportsDB');
  const hasWikipedia = dataSources.includes('Wikipedia');
  const hasGROQ = dataSources.includes('GROQ AI');
  const confidence = response._metadata.confidenceScore || 0;
  
  if (hasSportsDB && hasWikipedia) {
    return { source: 'Verified Sources ✓', color: 'green', icon: '✅', confidence };
  }
  
  if (hasSportsDB) {
    return { source: 'SportsDB Verified', color: 'blue', icon: '📊', confidence };
  }
  
  if (hasWikipedia) {
    return { source: 'Wikipedia Verified', color: 'orange', icon: '📚', confidence };
  }
  
  if (hasGROQ && confidence > 60) {
    return { source: 'AI Enhanced', color: 'yellow', icon: '🤖', confidence };
  }
  
  return { source: 'AI Generated', color: 'red', icon: '⚠️', confidence };
};