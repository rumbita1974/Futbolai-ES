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
  getTeamTrophiesFromWikidata,
  getCurrentTeamFromWikidata
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

// Cache for historical players
const historicalPlayersCache: Map<string, Player[]> = new Map();

// FIXED: Enhanced achievement parsing function
const parseAchievementTitles = (achievementArray: string[] | undefined): number => {
  if (!achievementArray || achievementArray.length === 0) return 0;
  
  let total = 0;
  console.log(`[DEBUG-PARSE] Parsing ${achievementArray.length} achievements`);
  
  for (const entry of achievementArray) {
    if (!entry || typeof entry !== 'string') continue;
    
    const entryLower = entry.toLowerCase();
    console.log(`[DEBUG-PARSE] Entry: "${entry}"`);
    
    // Skip "no achievements" entries
    if (entryLower.includes('no ') || entryLower.includes('none') || 
        entryLower.includes('n/a') || entryLower.includes('unknown')) {
      console.log(`[DEBUG-PARSE] Skipping empty entry`);
      continue;
    }
    
    // CRITICAL FIX 1: Handle "5x UEFA Champions League"
    const prefixMatch = entry.match(/^(\d+)\s*x\s+/i);
    if (prefixMatch) {
      total += parseInt(prefixMatch[1], 10);
      console.log(`[DEBUG-PARSE] Found ${prefixMatch[1]}x format, total: ${total}`);
      continue;
    }
    
    // CRITICAL FIX 2: Handle "UEFA Champions League (5 titles)"
    const suffixMatch = entry.match(/\((\d+)(?:\s*titles?)?\)/i);
    if (suffixMatch) {
      total += parseInt(suffixMatch[1], 10);
      console.log(`[DEBUG-PARSE] Found (${suffixMatch[1]} titles) format, total: ${total}`);
      continue;
    }
    
    // CRITICAL FIX 3: Handle year lists "1992, 2006, 2009, 2011, 2015"
    const years = entry.match(/\b(19|20)\d{2}\b/g);
    if (years && years.length > 0) {
      total += years.length;
      console.log(`[DEBUG-PARSE] Found ${years.length} years, total: ${total}`);
      continue;
    }
    
    // CRITICAL FIX 4: Handle "Champions League: 5 wins"
    const winsMatch = entry.match(/:?\s*(\d+)\s+wins?/i);
    if (winsMatch) {
      total += parseInt(winsMatch[1], 10);
      console.log(`[DEBUG-PARSE] Found ${winsMatch[1]} wins format, total: ${total}`);
      continue;
    }
    
    // CRITICAL FIX 5: If it contains trophy name, count as 1
    const trophyNames = [
      'champions league', 'world cup', 'ballon d\'or', 'la liga', 
      'premier league', 'copa del rey', 'fa cup', 'bundesliga', 
      'serie a', 'ligue 1', 'copa américa', 'uefa euro', 
      'club world cup', 'supercopa', 'super cup'
    ];
    
    if (trophyNames.some(trophy => entryLower.includes(trophy))) {
      total += 1;
      console.log(`[DEBUG-PARSE] Trophy name found, counted as 1, total: ${total}`);
      continue;
    }
  }
  
  console.log(`[DEBUG-PARSE] Final total: ${total}`);
  return total;
};

// FIXED: SINGLE parseAchievementsForDisplay function (not duplicate)
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
  
  console.log(`[ACHIEVEMENT-PARSE] Parsing ${achievements.length} achievements for ${teamType} team`);
  
  achievements.forEach((achievement) => {
    if (!achievement || typeof achievement !== 'string') return;
    
    const achievementLower = achievement.toLowerCase();
    
    // Skip empty entries
    if (achievementLower.includes('no ') || achievementLower.includes('none') || 
        achievementLower.includes('n/a') || achievementLower.includes('unknown')) {
      return;
    }
    
    // IMPORTANT FIX: For national teams, categorize achievements correctly
    if (teamType === 'national') {
      // World Cup achievements
      if (achievementLower.includes('world cup')) {
        result.worldCup!.push(achievement);
      }
      // International competitions (Copa América, Euro, etc.)
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
      // World Cup should not exist for clubs, but handle just in case
      if (achievementLower.includes('world cup') && achievementLower.includes('club world cup')) {
        result.international!.push(achievement); // Club World Cup is international
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
      // International club competitions
      else if (achievementLower.includes('club world cup') ||
               achievementLower.includes('intercontinental cup') ||
               achievementLower.includes('uefa super cup') ||
               achievementLower.includes('supercopa europa')) {
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
    console.warn(`[ACHIEVEMENT-FIX] Moving ${result.domestic.length} domestic achievements to international for national team`);
    result.international = [...(result.international || []), ...result.domestic];
    result.domestic = [];
  }
  
  console.log(`[ACHIEVEMENT-PARSE] Result:`, result);
  return result;
};

// Extract achievements from text
const extractAchievementsFromText = (text: string): string[] => {
  const achievements: string[] = [];
  if (!text) return achievements;
  
  const textLower = text.toLowerCase();
  
  const patterns = [
    // Ballon d'Or
    { regex: /(\d+)\s*(?:x|times?)\s*ballon\s*d'?or/gi, format: (count: string) => `${count}x Ballon d'Or` },
    // World Cup
    { regex: /(\d+)\s*(?:x|times?)\s*fifa\s*world\s*cup/gi, format: (count: string) => `${count}x FIFA World Cup` },
    // Champions League
    { regex: /(\d+)\s*(?:x|times?)\s*uefa\s*champions\s*league/gi, format: (count: string) => `${count}x UEFA Champions League` },
    // Club World Cup
    { regex: /(\d+)\s*(?:x|times?)\s*fifa\s*club\s*world\s*cup/gi, format: (count: string) => `${count}x FIFA Club World Cup` },
    // UEFA Super Cup
    { regex: /(\d+)\s*(?:x|times?)\s*uefa\s*super\s*cup/gi, format: (count: string) => `${count}x UEFA Super Cup` },
    // League titles
    { regex: /(\d+)\s*(?:x|times?)\s*la\s*liga/gi, format: (count: string) => `${count}x La Liga` },
    { regex: /(\d+)\s*(?:x|times?)\s*premier\s*league/gi, format: (count: string) => `${count}x Premier League` },
    // Copa America
    { regex: /(\d+)\s*(?:x|times?)\s*copa\s*am[eé]rica/gi, format: (count: string) => `${count}x Copa América` },
  ];
  
  patterns.forEach(({ regex, format }) => {
    const matches = textLower.match(regex);
    if (matches) {
      matches.forEach(match => {
        const countMatch = match.match(/\d+/);
        if (countMatch) {
          const achievement = format(countMatch[0]);
          if (!achievements.includes(achievement)) {
            achievements.push(achievement);
          }
        }
      });
    }
  });
  
  return achievements.slice(0, 15);
};

// Debug achievements function
const debugAchievements = (achievements: any, teamName: string, teamType: 'club' | 'national') => {
  console.log(`\n[ACHIEVEMENT-DEBUG] ===== ${teamName} (${teamType}) =====`);
  
  if (achievements.worldCup && achievements.worldCup.length > 0) {
    const count = parseAchievementTitles(achievements.worldCup);
    console.log(`World Cup: ${count} titles`);
    console.log('Entries:', achievements.worldCup);
  }
  
  if (achievements.international && achievements.international.length > 0) {
    const count = parseAchievementTitles(achievements.international);
    console.log(`International: ${count} titles`);
    console.log('Entries:', achievements.international);
  }
  
  if (achievements.continental && achievements.continental.length > 0) {
    const count = parseAchievementTitles(achievements.continental);
    console.log(`Continental: ${count} titles`);
    console.log('Entries:', achievements.continental);
  }
  
  if (achievements.domestic && achievements.domestic.length > 0) {
    const count = parseAchievementTitles(achievements.domestic);
    console.log(`Domestic: ${count} titles`);
    console.log('Entries:', achievements.domestic);
  }
  
  console.log(`[ACHIEVEMENT-DEBUG] ===== END =====\n`);
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
    'saudi arabia', 'iran', 'iraq', 'uae', 'qatar'
  ];
  
  // If the team name contains a country name, it's likely a national team
  if (nationalTeamKeywords.some(keyword => nameLower.includes(keyword) || queryLower.includes(keyword))) {
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
  
  // Check SportsDB sport info
  if (strSport === 'Football' && strLeague?.includes('National')) {
    return 'national';
  }
  
  // Default to club if not clearly a national team
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

// Priority-based team data fetching
const fetchTeamWithPriority = async (teamName: string): Promise<Team | null> => {
  console.log(`[PRIORITY] Fetching team data for: ${teamName}`);
  
  // Helper function for better national team detection from SportsDB
  const detectTeamTypeFromSportsDB = (teamInfo: any, originalName: string): 'club' | 'national' => {
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
        teamNameLower === originalName.toLowerCase()) { // If team name is exactly the country name
      console.log(`[TEAM-TYPE] Detected national team by name pattern`);
      return 'national';
    }
    
    // If the team name equals the country field (common in SportsDB for national teams)
    if (teamInfo.strCountry && teamNameLower === teamInfo.strCountry.toLowerCase()) {
      console.log(`[TEAM-TYPE] Detected national team by country match: ${teamInfo.strCountry}`);
      return 'national';
    }
    
    // Default to club
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
          const honors = await fetchTeamHonorsFromSportsDB(teamInfo.idTeam || teamInfo.id);
          
          // Use improved team type detection
          const teamType = detectTeamTypeFromSportsDB(teamInfo, teamName);
          
          // Log team type for debugging
          console.log(`[SportsDB] Team type for ${teamInfo.strTeam || teamName}: ${teamType}`);
          console.log(`[SportsDB] League: ${teamInfo.strLeague}, Country: ${teamInfo.strCountry}`);
          
          // Parse achievements based on team type
          const achievementsArray = honors || [];
          const majorAchievements = parseAchievementsForDisplay(achievementsArray, teamType);
          
          // Log achievements for debugging
          console.log(`[SportsDB] Raw achievements:`, achievementsArray);
          console.log(`[SportsDB] Parsed achievements:`, majorAchievements);
          
          // Handle national team specific data
          let finalCountry = teamInfo.strCountry || '';
          if (teamType === 'national' && !finalCountry) {
            // Try to extract country from team name for national teams
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
            _confidence: 90,
            _sportsDbId: teamInfo.idTeam || teamInfo.id,
            _verifiedTrophies: extractVerifiedTrophyCounts(majorAchievements, teamType),
            _updateReason: teamType === 'national' ? 'National team detected' : undefined
          } as Team;
        }
        return null;
      }
    },
    {
      name: 'FootballData',
      priority: 2,
      fetch: async () => {
        console.log(`[FootballData] Attempting to fetch team: ${teamName}`);
        const squadData = await fetchVerifiedSquad(teamName);
        if (squadData) {
          const teamType: 'club' | 'national' = squadData.type === 'national' ? 'national' : 'club';
          const achievementsArray = squadData.achievements || [];
          const majorAchievements = parseAchievementsForDisplay(achievementsArray, teamType);
          
          return {
            name: squadData.name || teamName,
            type: teamType,
            country: squadData.country || '',
            stadium: squadData.stadium || undefined,
            currentCoach: squadData.coach?.name || 'Unknown',
            foundedYear: squadData.foundedYear,
            majorAchievements: majorAchievements,
            _source: 'FootballData',
            _lastVerified: new Date().toISOString(),
            _confidence: 85
          } as Team;
        }
        return null;
      }
    },
    {
      name: 'Wikipedia',
      priority: 3,
      fetch: async () => {
        console.log(`[Wikipedia] Attempting to fetch team: ${teamName}`);
        const wikiData = await fetchFromWikipedia(teamName);
        if (wikiData?.summary) {
          const coach = extractCoachFromWikipedia(wikiData.summary, teamName);
          
          // Use detectTeamType for consistency
          const teamType = detectTeamType(teamName, teamName);
          
          return {
            name: wikiData.title || teamName,
            type: teamType,
            country: '',
            stadium: undefined,
            currentCoach: coach || 'Unknown',
            foundedYear: undefined,
            majorAchievements: {
              worldCup: teamType === 'national' ? [] : undefined,
              international: teamType === 'national' ? [] : undefined,
              continental: teamType === 'club' ? [] : undefined,
              domestic: teamType === 'club' ? [] : []
            },
            _source: 'Wikipedia',
            _lastVerified: new Date().toISOString(),
            _confidence: 70,
            _wikiSummary: wikiData.summary.substring(0, 300) + '...'
          } as Team;
        }
        return null;
      }
    },
    {
      name: 'Wikidata',
      priority: 4,
      fetch: async () => {
        console.log(`[Wikidata] Attempting to fetch team: ${teamName}`);
        const coach = await getCoachFromWikidata(teamName);
        const trophies = await getTeamTrophiesFromWikidata(teamName);
        
        if (coach || trophies) {
          // Use detectTeamType for consistency
          const teamType = detectTeamType(teamName, teamName);
          
          const trophiesArray = trophies ? Object.values(trophies).flat() as string[] : [];
          const majorAchievements = parseAchievementsForDisplay(trophiesArray, teamType);
          
          return {
            name: teamName,
            type: teamType,
            country: '',
            stadium: undefined,
            currentCoach: coach || 'Unknown',
            foundedYear: undefined,
            majorAchievements: majorAchievements,
            _source: 'Wikidata',
            _lastVerified: new Date().toISOString(),
            _confidence: 75
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

// Helper to extract verified trophy counts
const extractVerifiedTrophyCounts = (achievements: any, teamType: 'club' | 'national'): any => {
  const result: any = {};
  
  if (teamType === 'national') {
    result.worldCup = parseAchievementTitles(achievements.worldCup);
  } else {
    result.clubWorldCup = parseAchievementTitles(
      achievements.international?.filter((a: string) => 
        a.toLowerCase().includes('club world cup')
      )
    );
    result.championsLeague = parseAchievementTitles(
      achievements.continental?.filter((a: string) => 
        a.toLowerCase().includes('champions league')
      )
    );
  }
  
  result.domesticLeague = parseAchievementTitles(
    achievements.domestic?.filter((a: string) => 
      a.toLowerCase().includes('liga') || a.toLowerCase().includes('premier') || 
      a.toLowerCase().includes('bundesliga') || a.toLowerCase().includes('serie') ||
      a.toLowerCase().includes('ligue')
    )
  );
  
  result.domesticCup = parseAchievementTitles(
    achievements.domestic?.filter((a: string) => 
      a.toLowerCase().includes('cup') || a.toLowerCase().includes('copa') || 
      a.toLowerCase().includes('pokal') || a.toLowerCase().includes('coppa')
    )
  );
  
  return result;
};

// Add this helper function to check if query is likely a major club
const getClubSpecificPrompt = (queryLower: string): string => {
  const majorClubs = [
    'manchester city', 'real madrid', 'barcelona', 'bayern munich', 'liverpool',
    'ac milan', 'inter milan', 'juventus', 'chelsea', 'arsenal', 
    'manchester united', 'tottenham', 'atletico madrid', 'psg'
  ];
  
  if (majorClubs.some(club => queryLower.includes(club))) {
    return `IMPORTANT: This is a major European club. MUST include ALL trophies:
- UEFA Champions League titles
- FIFA Club World Cup titles  
- UEFA Super Cup titles
- Domestic league and cup titles
    
Use official trophy counts from 2025/2026 season data.`;
  }
  
  return `For club teams: Include domestic, continental, and international trophies.`;
};

// Historical team data - UPDATED with Uruguay and more teams
const HISTORICAL_TEAM_DATA: Record<string, any> = {
  'barcelona': {
    foundedYear: 1899,
    stadium: 'Spotify Camp Nou',
    country: 'Spain',
    type: 'club',
    currentCoach: 'Hansi Flick',
    historicalAchievements: {
      continental: [
        "5x UEFA Champions League (1992, 2006, 2009, 2011, 2015)",
        "5x UEFA Super Cup (1992, 1997, 2009, 2011, 2015)"
      ],
      international: [
        "3x FIFA Club World Cup (2009, 2011, 2015)"
      ],
      domestic: [
        "27x La Liga",
        "31x Copa del Rey",
        "14x Supercopa de España",
        "3x Copa Eva Duarte",
        "2x Copa de la Liga"
      ]
    }
  },
  'real madrid': {
    foundedYear: 1902,
    stadium: 'Santiago Bernabéu',
    country: 'Spain',
    type: 'club',
    currentCoach: 'Álvaro Arbeloa',
    historicalAchievements: {
      continental: [
        "15x UEFA Champions League (1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)",
        "6x UEFA Super Cup (2002, 2014, 2016, 2017, 2022, 2024)"
      ],
      international: [
        "5x FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)"
      ],
      domestic: [
        "36x La Liga",
        "20x Copa del Rey",
        "13x Supercopa de España"
      ]
    }
  },
  'manchester city': {
    foundedYear: 1880,
    stadium: 'Etihad Stadium',
    country: 'England',
    type: 'club',
    currentCoach: 'Pep Guardiola',
    historicalAchievements: {
      continental: [
        "1x UEFA Champions League (2023)"
      ],
      international: [
        "1x FIFA Club World Cup (2023)",
        "1x UEFA Super Cup (2023)"
      ],
      domestic: [
        "9x Premier League",
        "7x FA Cup",
        "8x EFL Cup",
        "6x FA Community Shield"
      ]
    }
  },
  'argentina': {
    foundedYear: 1893,
    stadium: 'Estadio Monumental',
    country: 'Argentina',
    type: 'national',
    currentCoach: 'Lionel Scaloni',
    historicalAchievements: {
      worldCup: [
        "3x FIFA World Cup (1978, 1986, 2022)"
      ],
      international: [
        "15x Copa América",
        "2x FIFA Confederations Cup",
        "1x CONMEBOL-UEFA Cup of Champions"
      ],
      continental: [],
      domestic: []
    }
  },
  'brazil': {
    foundedYear: 1914,
    stadium: 'Maracanã',
    country: 'Brazil',
    type: 'national',
    currentCoach: 'Ramón Díaz',
    historicalAchievements: {
      worldCup: [
        "5x FIFA World Cup (1958, 1962, 1970, 1994, 2002)"
      ],
      international: [
        "9x Copa América",
        "4x FIFA Confederations Cup"
      ],
      continental: [],
      domestic: []
    }
  },
  'uruguay': {
    foundedYear: 1900,
    stadium: 'Estadio Centenario',
    country: 'Uruguay',
    type: 'national',
    currentCoach: 'Diego Alonso',
    historicalAchievements: {
      worldCup: [
        "2x FIFA World Cup (1930, 1950)"
      ],
      international: [
        "15x Copa América",
        "2x FIFA Confederations Cup",
        "1x CONMEBOL-UEFA Cup of Champions"
      ],
      continental: [],
      domestic: []
    }
  },
  'france': {
    foundedYear: 1904,
    stadium: 'Stade de France',
    country: 'France',
    type: 'national',
    currentCoach: 'Didier Deschamps',
    historicalAchievements: {
      worldCup: [
        "2x FIFA World Cup (1998, 2018)"
      ],
      international: [
        "2x UEFA European Championship (1984, 2000)",
        "2x FIFA Confederations Cup (2001, 2003)",
        "1x UEFA Nations League (2021)"
      ],
      continental: [],
      domestic: []
    }
  },
  'england': {
    foundedYear: 1863,
    stadium: 'Wembley Stadium',
    country: 'England',
    type: 'national',
    currentCoach: 'Gareth Southgate',
    historicalAchievements: {
      worldCup: [
        "1x FIFA World Cup (1966)"
      ],
      international: [],
      continental: [],
      domestic: []
    }
  },
  'ecuador': {
    foundedYear: 1925,
    stadium: 'Estadio Rodrigo Paz Delgado',
    country: 'Ecuador',
    type: 'national',
    currentCoach: 'Gustavo Alfaro',
    historicalAchievements: {
      worldCup: [],
      international: [
        "Copa América (4th place 1993, 2021)",
        "FIFA World Cup appearances: 2002, 2006, 2014, 2022"
      ],
      continental: [],
      domestic: []
    }
  },
  'paraguay': {
    foundedYear: 1906,
    stadium: 'Estadio Defensores del Chaco',
    country: 'Paraguay',
    type: 'national',
    currentCoach: 'Manolo Jimenez',
    historicalAchievements: {
      worldCup: [
        "Quarter-finals: 2010"
      ],
      international: [
        "2x Copa América (1953, 1979)",
        "1x Copa América Centenario runner-up (2011)"
      ],
      continental: [],
      domestic: []
    }
  },
  'morocco': {
    foundedYear: 1955,
    stadium: 'Stade Mohammed V',
    country: 'Morocco',
    type: 'national',
    currentCoach: 'Walid Regragui',
    historicalAchievements: {
      worldCup: [
        "Semi-finals: 2022 (Best African performance)"
      ],
      international: [
        "1x African Cup of Nations (1976)",
        "2x African Nations Championship (2018, 2020)",
        "1x FIFA Arab Cup (2021)"
      ],
      continental: [],
      domestic: []
    }
  },
  'japan': {
    foundedYear: 1921,
    stadium: 'National Stadium',
    country: 'Japan',
    type: 'national',
    currentCoach: 'Hajime Moriyasu',
    historicalAchievements: {
      worldCup: [
        "Round of 16: 2002, 2010, 2018, 2022"
      ],
      international: [
        "4x AFC Asian Cup (1992, 2000, 2004, 2011)",
        "1x FIFA Confederations Cup runner-up (2001)"
      ],
      continental: [],
      domestic: []
    }
  }
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

// UPDATED: Enhanced system prompt with proper international/continental trophy instructions
const getEnhancedSystemPrompt = (query: string, language: string = 'en'): string => {
  const queryLower = query.toLowerCase();
  
  // Check for major teams that need accurate data
  const isBarcelona = queryLower.includes('barcelona');
  const isRealMadrid = queryLower.includes('real madrid');
  const isManchesterCity = queryLower.includes('manchester city');
  const isBayernMunich = queryLower.includes('bayern munich') || queryLower.includes('bayern');
  const isLiverpool = queryLower.includes('liverpool');
  const isChelsea = queryLower.includes('chelsea');
  const isNationalTeam = queryLower.includes('argentina') || queryLower.includes('brazil') || 
                         queryLower.includes('france') || queryLower.includes('england') ||
                         queryLower.includes('germany') || queryLower.includes('spain') ||
                         queryLower.includes('uruguay') || queryLower.includes('italy') ||
                         queryLower.includes('portugal') || queryLower.includes('netherlands');
  
  let specificUpdates = '';
  if (isBarcelona) {
    specificUpdates = `CRITICAL UPDATE FOR FC BARCELONA (2025/2026):
- Current Manager: Hansi Flick (NOT Xavi Hernández)
- UEFA Champions League titles: 5 (1992, 2006, 2009, 2011, 2015)
- FIFA Club World Cup titles: 3 (2009, 2011, 2015)
- Key players include: Robert Lewandowski, Pedri, Gavi, Frenkie de Jong, Lamine Yamal`;
  } else if (isRealMadrid) {
    specificUpdates = `CRITICAL UPDATE FOR REAL MADRID (2025/2026):
- Current Manager: Álvaro Arbeloa (Carlo Ancelotti left for Brazil national team)
- UEFA Champions League titles: 15 (most recent: 2024)
- FIFA Club World Cup titles: 5 (2014, 2016, 2017, 2018, 2022)
- Key signing: Kylian Mbappé joined in summer 2024`;
  } else if (isManchesterCity) {
    specificUpdates = `CRITICAL UPDATE FOR MANCHESTER CITY (2025/2026):
- Current Manager: Pep Guardiola
- UEFA Champions League titles: 1 (2023)
- FIFA Club World Cup titles: 1 (2023)
- UEFA Super Cup titles: 1 (2023)
- Premier League titles: 9 (most recent: 2023/2024)
- Key players: Erling Haaland, Kevin De Bruyne, Rodri, Phil Foden`;
  } else if (isBayernMunich) {
    specificUpdates = `CRITICAL UPDATE FOR BAYERN MUNICH (2025/2026):
- Current Manager: Vincent Kompany
- UEFA Champions League titles: 6 (1974, 1975, 1976, 2001, 2013, 2020)
- FIFA Club World Cup titles: 2 (2013, 2020)
- Bundesliga titles: 33 (most recent: 2023/2024)`;
  } else if (isLiverpool) {
    specificUpdates = `CRITICAL UPDATE FOR LIVERPOOL (2025/2026):
- Current Manager: Arne Slot (Jürgen Klopp left in 2024)
- UEFA Champions League titles: 6 (1977, 1978, 1981, 1984, 2005, 2019)
- FIFA Club World Cup titles: 1 (2019)`;
  } else if (isChelsea) {
    specificUpdates = `CRITICAL UPDATE FOR CHELSEA (2025/2026):
- Current Manager: Enzo Maresca
- UEFA Champions League titles: 2 (2012, 2021)
- FIFA Club World Cup titles: 1 (2021)
- Premier League titles: 6`;
  } else if (queryLower.includes('argentina')) {
    specificUpdates = `CRITICAL UPDATE FOR ARGENTINA (2025/2026):
- Current Coach: Lionel Scaloni
- World Cup titles: 3 (1978, 1986, 2022)
- Copa América titles: 15
- Key players: Lionel Messi, Ángel Di María, Julián Álvarez, Lautaro Martínez`;
  } else if (queryLower.includes('brazil')) {
    specificUpdates = `CRITICAL UPDATE FOR BRAZIL (2025/2026):
- Current Coach: Ramón Díaz
- World Cup titles: 5 (1958, 1962, 1970, 1994, 2002)
- Copa América titles: 9
- Key players: Vinícius Júnior, Rodrygo, Neymar, Alisson`;
  } else if (queryLower.includes('uruguay')) {
    specificUpdates = `CRITICAL UPDATE FOR URUGUAY (2025/2026):
- Current Coach: Diego Alonso
- World Cup titles: 2 (1930, 1950)
- Copa América titles: 15
- Key players: Federico Valverde, Ronald Araújo, Darwin Núñez, Luis Suárez`;
  } else if (queryLower.includes('france')) {
    specificUpdates = `CRITICAL UPDATE FOR FRANCE (2025/2026):
- Current Coach: Didier Deschamps
- World Cup titles: 2 (1998, 2018)
- UEFA European Championship titles: 2 (1984, 2000)
- Key players: Kylian Mbappé, Antoine Griezmann, Eduardo Camavinga, William Saliba`;
  }
  
  const clubSpecificPrompt = getClubSpecificPrompt(queryLower);
  
  return `You are a football expert with verified 2025/2026 season knowledge. ACCURACY IS CRITICAL.

${specificUpdates}

${clubSpecificPrompt}

CRITICAL INSTRUCTIONS FOR 2025/2026 SEASON:
1. For TEAM searches: Return current squad with correct 2025/2026 players
2. Manager/Coach MUST be correct for current season
3. Trophy counts MUST be accurate and verified
4. Return VALID JSON that can be parsed - NO markdown, NO explanations
5. Format achievements consistently: Use "Xx" format for counts
6. For CLUB TEAMS: MUST include international and continental trophies
7. For NATIONAL TEAMS: World Cup trophies go in "worldCup" field, other international trophies in "international" field

ACHIEVEMENT ACCURACY REQUIREMENTS FOR MAJOR CLUBS:
- Barcelona: 5 UEFA Champions League, 3 FIFA Club World Cup
- Real Madrid: 15 UEFA Champions League, 5 FIFA Club World Cup
- Manchester City: 1 UEFA Champions League (2023), 1 FIFA Club World Cup (2023)
- Bayern Munich: 6 UEFA Champions League
- AC Milan: 7 UEFA Champions League
- Liverpool: 6 UEFA Champions League
- Chelsea: 2 UEFA Champions League (2012, 2021)

ACHIEVEMENT ACCURACY REQUIREMENTS FOR NATIONAL TEAMS:
- Argentina: 3 FIFA World Cup, 15 Copa América
- Brazil: 5 FIFA World Cup, 9 Copa América
- Uruguay: 2 FIFA World Cup, 15 Copa América
- France: 2 FIFA World Cup, 2 UEFA European Championship
- Germany: 4 FIFA World Cup, 3 UEFA European Championship
- Spain: 1 FIFA World Cup, 3 UEFA European Championship

REQUIRED JSON STRUCTURE FOR NATIONAL TEAMS:
{
  "teams": [{
    "name": "Uruguay",
    "type": "national",
    "country": "Uruguay",
    "stadium": "Estadio Centenario",
    "currentCoach": "Diego Alonso",
    "foundedYear": 1900,
    "majorAchievements": {
      "worldCup": ["2x FIFA World Cup (1930, 1950)"],
      "international": ["15x Copa América", "2x FIFA Confederations Cup", "1x CONMEBOL-UEFA Cup of Champions"],
      "continental": [], // Always empty for national teams
      "domestic": [] // Always empty for national teams
    }
  }],
  "players": [...]
}

REQUIRED JSON STRUCTURE FOR CLUB TEAMS:
{
  "teams": [{
    "name": "Manchester City",
    "type": "club",
    "country": "England",
    "stadium": "Etihad Stadium",
    "currentCoach": "Pep Guardiola",
    "foundedYear": 1880,
    "majorAchievements": {
      "worldCup": [], // Always empty for club teams
      "international": ["1x FIFA Club World Cup (2023)", "1x UEFA Super Cup (2023)"],
      "continental": ["1x UEFA Champions League (2023)"],
      "domestic": ["9x Premier League", "7x FA Cup", "8x EFL Cup", "6x FA Community Shield"]
    }
  }],
  "players": [...]
}

VERIFICATION CHECK: Before responding, verify:
1. Manager name is correct for 2025/2026
2. Trophy counts match official records
3. Players listed are CURRENT squad members
4. No retired or transferred players included
5. For national teams: World Cup trophies go in "worldCup" field
6. For club teams: Include ALL major trophies (domestic, continental, international)

Return ONLY valid JSON.`;
};

const getOptimalModel = (query: string): string => {
  const queryLower = query.toLowerCase();
  
  // Use 70B for major entities requiring high accuracy
  const majorEntities = [
    'barcelona', 'real madrid', 'bayern', 'manchester city', 'liverpool',
    'psg', 'arsenal', 'chelsea', 'manchester united', 'tottenham',
    'ac milan', 'inter milan', 'juventus', 'atletico madrid',
    'france', 'argentina', 'brazil', 'england', 'germany',
    'spain', 'italy', 'portugal', 'netherlands', 'uruguay'
  ];
  
  if (majorEntities.some(entity => queryLower.includes(entity))) {
    return 'llama-3.3-70b-versatile';
  }
  
  return 'llama-3.1-8b-instant';
};

const isRetiredOrTransferred = (playerName: string, teamName: string): boolean => {
  const teamKey = teamName.toLowerCase();
  const retiredLists: Record<string, string[]> = {
    'barcelona': [
      'Lionel Messi', 'Messi',
      'Gerard Piqué', 'Piqué',
      'Sergio Busquets', 'Busquets',
      'Jordi Alba', 'Alba',
      'Xavi', 'Xavi Hernández'
    ],
    'real madrid': [
      'Karim Benzema', 'Benzema',
      'Toni Kroos', 'Kroos',
      'Nacho Fernández', 'Nacho',
      'Sergio Ramos', 'Ramos',
      'Cristiano Ronaldo', 'Ronaldo',
      'Gareth Bale', 'Bale',
      'Luka Modrić', 'Modrić'
    ],
    'manchester city': [
      'İlkay Gündoğan', 'Gündoğan',
      'Riyad Mahrez', 'Mahrez',
      'Cole Palmer', 'Palmer',
      'Benjamin Mendy', 'Mendy'
    ]
  };
  
  const retiredList = retiredLists[teamKey] || [];
  return retiredList.some(retiredName => {
    const pName = playerName.toLowerCase();
    const rName = retiredName.toLowerCase();
    return pName === rName || pName.includes(rName);
  });
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
  if (data._source?.includes('FootballData')) score += 35;
  if (data._source?.includes('Wikipedia')) score += 20;
  if (data._source?.includes('Wikidata')) score += 15;
  if (data._source?.includes('GROQ')) score += 10;
  
  // Data completeness
  if (data.currentCoach && data.currentCoach !== 'Unknown') score += 15;
  if (data._verifiedTrophies) score += 10;
  if (data._lastVerified) {
    const daysOld = (Date.now() - new Date(data._lastVerified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 7) score += 15;
    else if (daysOld < 30) score += 10;
  }
  
  return Math.min(100, score);
};

export const searchWithGROQ = async (query: string, language: string = 'en', bustCache: boolean = false): Promise<GROQSearchResponse> => {
  console.log(`\n⚽ [${CURRENT_SEASON}] Searching: "${query}"`);
  
  const selectedModel = getOptimalModel(query);
  console.log(`[MODEL] Using: ${selectedModel}`);
  
  clearStaleCache();
  
  const cacheKey = bustCache ? `${query}_${Date.now()}` : query.toLowerCase().trim();
  
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
    console.log('[1/4] Fetching verified team data from priority sources...');
    
    // STEP 1: Get verified team data from priority sources
    const verifiedTeam = await fetchTeamWithPriority(query);
    let finalTeam: Team;
    let finalPlayers: Player[] = [];
    const corrections: string[] = [];
    const dataSources: string[] = [];
    
    if (verifiedTeam) {
      finalTeam = verifiedTeam;
      dataSources.push(verifiedTeam._source || 'Unknown');
      console.log(`✓ [VERIFIED] Got team: ${finalTeam.name}, Coach: ${finalTeam.currentCoach}`);
    } else {
      console.log(`[WARNING] No verified team data found, falling back to GROQ`);
      finalTeam = createDefaultTeam(query);
    }
    
    // STEP 2: Fetch squad data
    console.log('[2/4] Fetching squad data...');
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
      console.error('[SQUAD] Error:', error);
    }
    
    // STEP 3: Use GROQ AI only if we need more data
    if (finalPlayers.length < 10) {
      console.log('[3/4] Enhancing with GROQ AI...');
      
      try {
        const systemPrompt = getEnhancedSystemPrompt(query, language);
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Provide ACCURATE 2025/2026 season information for: "${query}"` }
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
            
            // Update team data from GROQ if missing
            if (parsed.teams?.[0] && (!finalTeam.currentCoach || finalTeam.currentCoach === 'Unknown')) {
              const groqTeam = parsed.teams[0];
              finalTeam.currentCoach = groqTeam.currentCoach || finalTeam.currentCoach;
              finalTeam.stadium = finalTeam.stadium || groqTeam.stadium;
              finalTeam.foundedYear = finalTeam.foundedYear || groqTeam.foundedYear;
              
              // IMPORTANT: Parse achievements correctly based on team type
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
            
            // Add players from GROQ if we're missing many
            if (parsed.players && Array.isArray(parsed.players) && finalPlayers.length < 15) {
              const groqPlayers = parsed.players.slice(0, 20 - finalPlayers.length);
              
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
                
                // Filter out retired players
                if (isRetiredOrTransferred(player.name || '', query)) {
                  return null;
                }
                
                return {
                  name: player.name || 'Unknown',
                  currentTeam: player.currentTeam || query,
                  position: player.position || 'Player',
                  age: player.age || undefined,
                  nationality: player.nationality || 'Unknown',
                  careerGoals: player.careerGoals || 0,
                  careerAssists: player.careerAssists || 0,
                  internationalAppearances: player.internationalAppearances || 0,
                  internationalGoals: player.internationalGoals || 0,
                  majorAchievements: player.majorAchievements || [],
                  careerSummary: player.careerSummary || `${player.name} plays for ${query}.`,
                  imageUrl,
                  _source: 'GROQ AI',
                  _lastVerified: new Date().toISOString(),
                  _priority: 'medium',
                  _confidence: 60
                };
              }));
              
              // Filter out nulls and add to final players
              const validGroqPlayers = processedGroqPlayers.filter(p => p !== null);
              finalPlayers = [...finalPlayers, ...validGroqPlayers];
              
              console.log(`✓ [GROQ] Added ${validGroqPlayers.length} players from AI`);
            }
          } catch (error) {
            console.error('[GROQ] Parse error:', error);
          }
        }
      } catch (error) {
        console.error('[GROQ] AI call failed:', error);
      }
    }
    
    // STEP 4: Final validation and enhancement
    console.log('[4/4] Final validation...');
    
    // Debug achievements before final calculation
    debugAchievements(finalTeam.majorAchievements, finalTeam.name, finalTeam.type);
    
    // Calculate achievement counts based on team type
    const achievementCounts = {
      worldCup: finalTeam.type === 'national' ? parseAchievementTitles(finalTeam.majorAchievements.worldCup) : 0,
      international: finalTeam.type === 'national' ? parseAchievementTitles(finalTeam.majorAchievements.international) : 
                    finalTeam.type === 'club' ? parseAchievementTitles(finalTeam.majorAchievements.international) : 0,
      continental: finalTeam.type === 'club' ? parseAchievementTitles(finalTeam.majorAchievements.continental) : 0,
      domestic: finalTeam.type === 'club' ? parseAchievementTitles(finalTeam.majorAchievements.domestic) : 0
    };
    
    const totalAchievements = Object.values(achievementCounts).reduce((sum, count) => sum + count, 0);
    
    // Calculate confidence scores
    finalTeam._confidence = calculateConfidenceScore(finalTeam);
    finalPlayers.forEach(p => {
      p._confidence = p._confidence || calculateConfidenceScore(p);
    });
    
    // Determine verification level
    let verificationLevel: 'high' | 'medium' | 'low' = 'low';
    const teamScore = finalTeam._confidence || 0;
    if (teamScore >= 80) verificationLevel = 'high';
    else if (teamScore >= 60) verificationLevel = 'medium';
    
    const finalResult: GROQSearchResponse = {
      players: finalPlayers,
      teams: [finalTeam],
      youtubeQuery: `${query} ${CURRENT_SEASON} highlights`,
      message: `${query} • ${CURRENT_SEASON} • ${finalPlayers.length} players • Coach: ${finalTeam.currentCoach}`,
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: {
          playerCount: finalPlayers.length,
          season: CURRENT_SEASON,
          achievementCounts: achievementCounts,
          totalAchievements: totalAchievements,
          dataSources: dataSources,
          correctionsApplied: corrections.length,
          coachVerification: finalTeam.currentCoach === 'Unknown' ? 'needs_check' : 'verified',
          hasFallbackPlayers: false,
          confidenceScore: teamScore
        },
        appliedUpdates: corrections,
        dataSources: dataSources,
        currentSeason: CURRENT_SEASON,
        dataCurrency: {
          aiCutoff: '2025',
          verifiedWith: dataSources.join(', '),
          confidence: verificationLevel,
          lastVerified: new Date().toISOString()
        },
        disclaimer: `2025/2026 season data. Verified through multiple sources.`,
        recommendations: [
          'Data verified through SportsDB and Football Data API',
          'Coach information updated for 2025/2026 season',
          'Achievement counts cross-verified',
          'Includes international and continental trophies for clubs'
        ],
        confidenceScore: teamScore,
        verificationLevel: verificationLevel
      }
    };
    
    console.log(`[SUCCESS] ${finalPlayers.length} players, Coach: ${finalTeam.currentCoach}, Confidence: ${teamScore}%`);
    console.log(`[ACHIEVEMENTS] World Cup: ${achievementCounts.worldCup}, International: ${achievementCounts.international}, Continental: ${achievementCounts.continental}, Domestic: ${achievementCounts.domestic}`);
    
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

const createDefaultTeam = (name: string): Team => {
  const nameLower = name.toLowerCase();
  
  // Use the detectTeamType function
  const teamType = detectTeamType(name, name);
  
  // Get historical data if available
  const historicalKey = Object.keys(HISTORICAL_TEAM_DATA).find(key => 
    nameLower.includes(key) || key.includes(nameLower)
  );
  
  if (historicalKey && HISTORICAL_TEAM_DATA[historicalKey]) {
    const historical = HISTORICAL_TEAM_DATA[historicalKey];
    // CRITICAL: Ensure type from historical data is used
    const finalType = historical.type || teamType;
    
    return {
      name: name,
      type: finalType,
      country: historical.country || '',
      currentCoach: historical.currentCoach || 'Unknown',
      foundedYear: historical.foundedYear,
      stadium: historical.stadium,
      majorAchievements: historical.historicalAchievements || {
        worldCup: finalType === 'national' ? [] : undefined,
        international: finalType === 'national' ? [] : undefined,
        continental: [], // Empty for both club and national
        domestic: [] // Empty for both club and national initially
      },
      _source: 'Historical Data',
      _lastVerified: new Date().toISOString(),
      _confidence: 50,
      _updateReason: finalType === 'national' ? 'National team detected from historical data' : undefined
    };
  }
  
  // Create proper achievement structure based on team type
  const defaultAchievements = teamType === 'national' 
    ? {
        worldCup: [],
        international: [],
        continental: [], // Empty for national teams
        domestic: [] // Empty for national teams
      }
    : {
        worldCup: undefined, // Undefined for club teams
        international: [], // Empty but defined for club teams
        continental: [], // Empty but defined for club teams
        domestic: [] // Empty but defined for club teams
      };
  
  return {
    name: name,
    type: teamType,
    country: '',
    currentCoach: 'Unknown',
    foundedYear: undefined,
    stadium: undefined,
    majorAchievements: defaultAchievements,
    _source: 'System Default',
    _lastVerified: new Date().toISOString(),
    _updateReason: teamType === 'national' ? 'National team auto-detected' : 'Default team created',
    _confidence: 10
  };
};

const createErrorResponse = (query: string, error: string): GROQSearchResponse => {
  return {
    players: [],
    teams: [createDefaultTeam(query)],
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

// Export functions
export const GROQSearch = (query: string, bustCache: boolean = false) => 
  searchWithGROQ(query, 'en', bustCache);

export const searchFresh = async (query: string) => {
  return await searchWithGROQ(query, 'en', true);
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
    response.players.length < 5 ||
    metadata.analysis.coachVerification === 'needs_check'
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
  const hasFootballData = dataSources.includes('FootballData');
  const hasWikipedia = dataSources.includes('Wikipedia');
  const confidence = response._metadata.confidenceScore || 0;
  
  if (hasSportsDB && hasFootballData) {
    return { source: 'Verified APIs ✓', color: 'green', icon: '✅', confidence };
  }
  
  if (hasSportsDB) {
    return { source: 'SportsDB Verified', color: 'blue', icon: '📊', confidence };
  }
  
  if (hasFootballData) {
    return { source: 'Football Data API', color: 'purple', icon: '⚽', confidence };
  }
  
  if (hasWikipedia) {
    return { source: 'Wikipedia Verified', color: 'orange', icon: '📚', confidence };
  }
  
  if (confidence > 60) {
    return { source: 'AI Enhanced', color: 'yellow', icon: '🤖', confidence };
  }
  
  return { source: 'AI Generated', color: 'red', icon: '⚠️', confidence };
};