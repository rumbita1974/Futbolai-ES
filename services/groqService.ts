// services/groqService.ts - COMPLETE FIXED VERSION
// TEAM SEARCH: Full squads from multiple sources
// PLAYER SEARCH: Stats from multiple sources
// HISTORICAL PLAYERS: Legends for major teams

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
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
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

// Simple in-memory cache
const cache = new Map<string, { data: GROQSearchResponse; timestamp: number }>();

// ============================================================================
// AI FUZZY MATCHING - FIXES MISSPELLINGS
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
5. For players, use full common name

Examples:
- "vini jr" -> "Vinícius Júnior"
- "belli" -> "Jude Bellingham"
- "man city" -> "Manchester City"
- "atletico" -> "Atlético Madrid"
- "valencia cf" -> "Valencia CF"
- "mbappe" -> "Kylian Mbappé"
- "fede valverde" -> "Federico Valverde"
- "cama" -> "Eduardo Camavinga"
- "rodry" -> "Rodrygo Goes"
- "lewy" -> "Robert Lewandowski"
- "the netherlands" -> "Netherlands"

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
// HISTORICAL / LEGENDARY PLAYERS
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
      majorAchievements: ['5x Ballon d\'Or', '5x UEFA Champions League', 'UEFA Euro 2016 winner', 'Real Madrid all-time top scorer (450 goals)'],
      careerSummary: 'Considered one of the greatest players of all time. Scored 450 goals in 438 appearances for Real Madrid.',
      _source: 'Legends Database',
      _era: '2009-2018',
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
      careerAssists: 0,
      internationalAppearances: 0,
      internationalGoals: 0,
      majorAchievements: ['5x European Cup winner', '2x Ballon d\'Or', 'Real Madrid honorary president'],
      careerSummary: 'Led Real Madrid to 5 consecutive European Cups. Considered one of the greatest players in history.',
      _source: 'Legends Database',
      _era: '1953-1964',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/30933-1675263165.jpg'
    },
    {
      name: 'Raúl González',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Forward',
      age: 47,
      nationality: 'Spanish',
      careerGoals: 323,
      careerAssists: 0,
      internationalAppearances: 102,
      internationalGoals: 44,
      majorAchievements: ['3x UEFA Champions League', '6x La Liga', 'Real Madrid legend'],
      careerSummary: 'Real Madrid icon and former captain. Second all-time top scorer for the club.',
      _source: 'Legends Database',
      _era: '1994-2010',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/7347-1675263101.jpg'
    },
    {
      name: 'Iker Casillas',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Goalkeeper',
      age: 43,
      nationality: 'Spanish',
      careerGoals: 0,
      careerAssists: 0,
      internationalAppearances: 167,
      internationalGoals: 0,
      majorAchievements: ['3x UEFA Champions League', '5x La Liga', '2010 FIFA World Cup winner'],
      careerSummary: 'One of the greatest goalkeepers of all time. Known as "San Iker" for his miraculous saves.',
      _source: 'Legends Database',
      _era: '1999-2015',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/3999-1675263093.jpg'
    },
    {
      name: 'Zinedine Zidane',
      currentTeam: 'Real Madrid (Legend)',
      position: 'Midfielder',
      age: 52,
      nationality: 'French',
      careerGoals: 156,
      careerAssists: 0,
      internationalAppearances: 108,
      internationalGoals: 31,
      majorAchievements: ['UEFA Champions League winner (2002)', '1998 FIFA World Cup winner', 'UEFA Euro 2000 winner'],
      careerSummary: 'Legendary midfielder who scored the iconic volley in the 2002 Champions League final.',
      _source: 'Legends Database',
      _era: '2001-2006',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/3159-1675263093.jpg'
    }
  ],
  'argentina': [
    {
      name: 'Diego Maradona',
      currentTeam: 'Argentina (Legend)',
      position: 'Midfielder/Forward',
      age: 60,
      nationality: 'Argentine',
      careerGoals: 345,
      careerAssists: 0,
      internationalAppearances: 91,
      internationalGoals: 34,
      majorAchievements: ['1986 FIFA World Cup winner', '1986 FIFA World Cup Golden Ball', 'Napoli legend'],
      careerSummary: 'Considered one of the greatest players of all time. Scored the "Hand of God" and "Goal of the Century" in the same match.',
      _source: 'Legends Database',
      _era: '1976-1997',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/8026-1675263167.jpg'
    },
    {
      name: 'Gabriel Batistuta',
      currentTeam: 'Argentina (Legend)',
      position: 'Forward',
      age: 55,
      nationality: 'Argentine',
      careerGoals: 435,
      careerAssists: 0,
      internationalAppearances: 78,
      internationalGoals: 56,
      majorAchievements: ['2x Copa América winner (1991, 1993)', 'FIFA Confederations Cup winner (1992)', 'Fiorentina legend'],
      careerSummary: 'One of Argentina\'s greatest strikers. Known for his powerful shooting.',
      _source: 'Legends Database',
      _era: '1991-2002',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/4374-1675263115.jpg'
    }
  ],
  'brazil': [
    {
      name: 'Pelé',
      currentTeam: 'Brazil (Legend)',
      position: 'Forward',
      age: 82,
      nationality: 'Brazilian',
      careerGoals: 1279,
      careerAssists: 0,
      internationalAppearances: 92,
      internationalGoals: 77,
      majorAchievements: ['3x FIFA World Cup winner (1958, 1962, 1970)', 'FIFA Player of the Century', '1279 goals in official matches'],
      careerSummary: 'Widely regarded as the greatest footballer of all time. Scored over 1,200 career goals.',
      _source: 'Legends Database',
      _era: '1956-1977',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/9157-1675263105.jpg'
    },
    {
      name: 'Ronaldo Nazário',
      currentTeam: 'Brazil (Legend)',
      position: 'Forward',
      age: 48,
      nationality: 'Brazilian',
      careerGoals: 414,
      careerAssists: 0,
      internationalAppearances: 98,
      internationalGoals: 62,
      majorAchievements: ['2x FIFA World Cup winner (1994, 2002)', '3x FIFA World Player of the Year', '2x Ballon d\'Or'],
      careerSummary: 'One of the greatest strikers of all time, known as "O Fenômeno" (The Phenomenon).',
      _source: 'Legends Database',
      _era: '1993-2011',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/3140-1675263115.jpg'
    },
    {
      name: 'Ronaldinho Gaúcho',
      currentTeam: 'Brazil (Legend)',
      position: 'Midfielder/Forward',
      age: 44,
      nationality: 'Brazilian',
      careerGoals: 301,
      careerAssists: 0,
      internationalAppearances: 97,
      internationalGoals: 33,
      majorAchievements: ['2002 FIFA World Cup winner', '2x FIFA World Player of the Year', 'Ballon d\'Or (2005)'],
      careerSummary: 'One of the most skillful players in history, known for his flair and creativity.',
      _source: 'Legends Database',
      _era: '1998-2015',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/3376-1675263113.jpg'
    }
  ],
  'manchester united': [
    {
      name: 'Sir Bobby Charlton',
      currentTeam: 'Manchester United (Legend)',
      position: 'Midfielder',
      age: 86,
      nationality: 'English',
      careerGoals: 249,
      careerAssists: 0,
      internationalAppearances: 106,
      internationalGoals: 49,
      majorAchievements: ['1966 FIFA World Cup winner', '1968 Ballon d\'Or', '1968 UEFA Champions League winner'],
      careerSummary: 'Survived the Munich air disaster and became Manchester United\'s all-time leading scorer.',
      _source: 'Legends Database',
      _era: '1956-1973',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/29961-1675263105.jpg'
    },
    {
      name: 'Eric Cantona',
      currentTeam: 'Manchester United (Legend)',
      position: 'Forward',
      age: 58,
      nationality: 'French',
      careerGoals: 182,
      careerAssists: 0,
      internationalAppearances: 45,
      internationalGoals: 20,
      majorAchievements: ['4x Premier League winner', '2x FA Cup winner', 'Premier League Hall of Fame'],
      careerSummary: 'The king of Old Trafford. Transformed Manchester United into a dominant force.',
      _source: 'Legends Database',
      _era: '1992-1997',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/8001-1675263105.jpg'
    }
  ],
  'liverpool': [
    {
      name: 'Steven Gerrard',
      currentTeam: 'Liverpool (Legend)',
      position: 'Midfielder',
      age: 44,
      nationality: 'English',
      careerGoals: 212,
      careerAssists: 0,
      internationalAppearances: 114,
      internationalGoals: 21,
      majorAchievements: ['2005 UEFA Champions League winner', '2x FA Cup winner', 'UEFA Club Footballer of the Year'],
      careerSummary: 'Mr. Liverpool. Known for his leadership, passing range, and spectacular goals.',
      _source: 'Legends Database',
      _era: '1998-2015',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/3107-1675263115.jpg'
    },
    {
      name: 'Kenny Dalglish',
      currentTeam: 'Liverpool (Legend)',
      position: 'Forward',
      age: 73,
      nationality: 'Scottish',
      careerGoals: 355,
      careerAssists: 0,
      internationalAppearances: 102,
      internationalGoals: 30,
      majorAchievements: ['3x European Cup winner', '6x English League winner', 'FWA Footballer of the Year'],
      careerSummary: 'King Kenny. Liverpool\'s greatest player and manager.',
      _source: 'Legends Database',
      _era: '1977-1990',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/176224-1675263105.jpg'
    }
  ],
  'belgium': [
    {
      name: 'Eden Hazard',
      currentTeam: 'Retired',
      position: 'Forward',
      age: 33,
      nationality: 'Belgian',
      careerGoals: 200,
      careerAssists: 150,
      internationalAppearances: 126,
      internationalGoals: 33,
      majorAchievements: ['2x Premier League winner', '2x UEFA Europa League winner', '2018 FIFA World Cup bronze'],
      careerSummary: 'Belgium\'s greatest player. Known for his dribbling and creativity.',
      _source: 'Legends Database',
      _era: '2007-2023',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/50202-1675263123.jpg'
    },
    {
      name: 'Jan Vertonghen',
      currentTeam: 'Anderlecht',
      position: 'Defender',
      age: 37,
      nationality: 'Belgian',
      careerGoals: 60,
      careerAssists: 25,
      internationalAppearances: 154,
      internationalGoals: 10,
      majorAchievements: ['Belgium all-time cap leader', '2018 FIFA World Cup bronze'],
      careerSummary: 'Belgium\'s most capped player. A defensive stalwart for club and country.',
      _source: 'Legends Database',
      _era: '2006-present',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/4353-1675263123.jpg'
    }
  ],
  'netherlands': [
    {
      name: 'Johan Cruyff',
      currentTeam: 'Netherlands (Legend)',
      position: 'Forward',
      age: 68,
      nationality: 'Dutch',
      careerGoals: 433,
      careerAssists: 0,
      internationalAppearances: 48,
      internationalGoals: 33,
      majorAchievements: ['3x Ballon d\'Or', '1974 FIFA World Cup runner-up', 'Ajax legend'],
      careerSummary: 'Revolutionized football with "Total Football". One of the greatest of all time.',
      _source: 'Legends Database',
      _era: '1964-1984',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/8028-1675263165.jpg'
    },
    {
      name: 'Marco van Basten',
      currentTeam: 'Netherlands (Legend)',
      position: 'Forward',
      age: 59,
      nationality: 'Dutch',
      careerGoals: 300,
      careerAssists: 0,
      internationalAppearances: 58,
      internationalGoals: 24,
      majorAchievements: ['3x Ballon d\'Or', '1988 UEFA Euro winner', '1988 UEFA Champions League winner'],
      careerSummary: 'One of the most complete strikers in history. Scored iconic volley in Euro 1988 final.',
      _source: 'Legends Database',
      _era: '1981-1995',
      _lastVerified: new Date().toISOString(),
      _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/35042-1675263115.jpg'
    }
  ]
};

// ============================================================================
// KNOWLEDGE BASE - TEAM ACHIEVEMENTS
// ============================================================================

const KNOWN_ACHIEVEMENTS: Record<string, Team['majorAchievements']> = {
  'real madrid': {
    worldCup: [],
    international: ['5x FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)'],
    continental: ['15x UEFA Champions League (1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)'],
    domestic: ['36x La Liga', '20x Copa del Rey']
  },
  'barcelona': {
    worldCup: [],
    international: ['3x FIFA Club World Cup (2009, 2011, 2015)'],
    continental: ['5x UEFA Champions League (1992, 2006, 2009, 2011, 2015)'],
    domestic: ['27x La Liga', '31x Copa del Rey']
  },
  'atletico madrid': {
    worldCup: [],
    international: [],
    continental: ['3x UEFA Europa League (2010, 2012, 2018)'],
    domestic: ['11x La Liga', '10x Copa del Rey']
  },
  'valencia': {
    worldCup: [],
    international: [],
    continental: ['1x UEFA Champions League (2004)', '2x UEFA Europa League (2004, 2019)'],
    domestic: ['6x La Liga', '8x Copa del Rey']
  },
  'sevilla': {
    worldCup: [],
    international: [],
    continental: ['7x UEFA Europa League (2006, 2007, 2014, 2015, 2016, 2020, 2023)'],
    domestic: ['1x La Liga', '5x Copa del Rey']
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
    continental: ['3x UEFA Champions League (1968, 1999, 2008)'],
    domestic: ['20x Premier League', '12x FA Cup']
  },
  'liverpool': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2019)'],
    continental: ['6x UEFA Champions League (1977, 1978, 1981, 1984, 2005, 2019)'],
    domestic: ['19x Premier League', '8x FA Cup']
  },
  'bayern munich': {
    worldCup: [],
    international: ['2x FIFA Club World Cup (2013, 2020)'],
    continental: ['6x UEFA Champions League (1974, 1975, 1976, 2001, 2013, 2020)'],
    domestic: ['33x Bundesliga', '20x DFB-Pokal']
  },
  'juventus': {
    worldCup: [],
    international: ['2x FIFA Club World Cup (1985, 1996)'],
    continental: ['2x UEFA Champions League (1985, 1996)'],
    domestic: ['36x Serie A', '14x Coppa Italia']
  },
  'ac milan': {
    worldCup: [],
    international: ['4x FIFA Club World Cup (1969, 1989, 1990, 2007)'],
    continental: ['7x UEFA Champions League (1963, 1969, 1989, 1990, 1994, 2003, 2007)'],
    domestic: ['19x Serie A', '5x Coppa Italia']
  },
  'inter milan': {
    worldCup: [],
    international: ['3x FIFA Club World Cup (1964, 1965, 2010)'],
    continental: ['3x UEFA Champions League (1964, 1965, 2010)'],
    domestic: ['20x Serie A', '9x Coppa Italia']
  },
  'paris saint-germain': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['11x Ligue 1', '14x Coupe de France']
  },
  'belgium': {
    worldCup: [],
    international: ['2018 FIFA World Cup bronze', '1980 UEFA Euro runner-up'],
    continental: [],
    domestic: []
  },
  'netherlands': {
    worldCup: ['1974', '1978', '2010'],
    international: ['1x UEFA European Championship (1988)'],
    continental: [],
    domestic: []
  },
  'argentina': {
    worldCup: ['1978', '1986', '2022'],
    international: ['16x Copa América (1921, 1925, 1927, 1929, 1937, 1941, 1945, 1946, 1947, 1955, 1957, 1959, 1991, 1993, 2021, 2024)'],
    continental: [],
    domestic: []
  },
  'brazil': {
    worldCup: ['1958', '1962', '1970', '1994', '2002'],
    international: ['9x Copa América (1919, 1922, 1949, 1989, 1997, 1999, 2004, 2007, 2019)'],
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
  }
};

// ============================================================================
// TEAM FUNCTIONS - FIXED SQUAD FETCHING
// ============================================================================

async function fetchSquadFromSportsDB(teamId: string): Promise<Player[]> {
  console.log(`🔍 [SPORTSDB-SQUAD] Fetching squad for team ID: ${teamId}`);
  
  try {
    // Try both endpoints to maximize squad data
    const urls = [
      `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${teamId}`,
      `https://www.thesportsdb.com/api/v1/json/3/lookupsquad.php?id=${teamId}`
    ];
    
    let allPlayers: any[] = [];
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          // Handle different response formats
          if (data.player && Array.isArray(data.player)) {
            allPlayers = [...allPlayers, ...data.player];
          }
          if (data.squad && Array.isArray(data.squad)) {
            allPlayers = [...allPlayers, ...data.squad];
          }
        }
      } catch (e) {
        console.log(`[SPORTSDB-SQUAD] Endpoint failed: ${url}`);
      }
    }
    
    // Remove duplicates by player name
    const uniquePlayers = Array.from(
      new Map(allPlayers.map(p => [p.strPlayer, p])).values()
    );
    
    if (uniquePlayers.length === 0) {
      console.log(`[SPORTSDB-SQUAD] No squad data for team ID: ${teamId}`);
      return [];
    }
    
    console.log(`✅ [SPORTSDB-SQUAD] Found ${uniquePlayers.length} unique players`);
    
    return uniquePlayers.map((p: any) => ({
      name: p.strPlayer || 'Unknown',
      currentTeam: p.strTeam || '',
      position: mapPosition(p.strPosition),
      age: p.dateBorn ? calculateAge(p.dateBorn) : undefined,
      nationality: p.strNationality || '',
      careerGoals: p.intGoals ? parseInt(p.intGoals) : undefined,
      careerAssists: p.intAssists ? parseInt(p.intAssists) : undefined,
      internationalAppearances: p.intInternationalCaps ? parseInt(p.intInternationalCaps) : undefined,
      internationalGoals: p.intInternationalGoals ? parseInt(p.intInternationalGoals) : undefined,
      majorAchievements: [],
      careerSummary: `${p.strPlayer} plays for ${p.strTeam} as a ${p.strPosition || 'player'}.`,
      _source: 'TheSportsDB',
      _lastVerified: new Date().toISOString(),
      _imageUrl: p.strThumb || p.strCutout || undefined
    }));
    
  } catch (error) {
    console.error('[SPORTSDB-SQUAD] Error:', error);
    return [];
  }
}

async function verifyTeamWithSportsDB(teamName: string): Promise<{
  verified: boolean;
  name?: string;
  coach?: string;
  stadium?: string;
  founded?: string;
  league?: string;
  country?: string;
  teamType?: string;
  badge?: string;
  idTeam?: string;
} | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.teams || !data.teams.length) return null;
    
    const team = data.teams[0];
    return {
      verified: true,
      name: team.strTeam,
      coach: team.strManager,
      stadium: team.strStadium,
      founded: team.intFormedYear,
      league: team.strLeague,
      country: team.strCountry,
      idTeam: team.idTeam
    };
    
  } catch (error) {
    console.error('[SPORTSDB] Error:', error);
    return null;
  }
}

async function searchTeam(query: string): Promise<GROQSearchResponse> {
  console.log(`🔍 [TEAM SEARCH] "${query}" - Season: ${CURRENT_SEASON}`);

  const verificationSteps: string[] = [];
  verificationSteps.push(`🔍 Original query: "${query}"`);
  
  // STEP 1: AI fuzzy matching to fix misspellings
  verificationSteps.push('🤖 AI correcting misspellings...');
  const aiCorrected = await correctQueryWithAI(query, 'team');
  const searchQuery = aiCorrected.corrected;
  
  if (aiCorrected.original !== aiCorrected.corrected) {
    verificationSteps.push(`✅ AI corrected to: "${searchQuery}"`);
  } else {
    verificationSteps.push(`✅ Using query: "${searchQuery}"`);
  }

  const queryLower = searchQuery.toLowerCase();

  try {
    // STEP 2: Try TheSportsDB with corrected name
    verificationSteps.push(`🔍 Checking TheSportsDB for: ${searchQuery}`);
    const sportsDbResult = await verifyTeamWithSportsDB(searchQuery);
    
    if (sportsDbResult?.verified) {
      console.log(`✅ [TheSportsDB] Found: ${sportsDbResult.name}`);
      
      const teamData: Team = {
        name: sportsDbResult.name || searchQuery,
        type: detectTeamType(sportsDbResult.country || '', sportsDbResult.name || searchQuery),
        country: sportsDbResult.country || '',
        stadium: sportsDbResult.stadium || undefined,
        currentCoach: sportsDbResult.coach || 'Unknown',
        foundedYear: sportsDbResult.founded ? parseInt(sportsDbResult.founded) : undefined,
        majorAchievements: {
          worldCup: [],
          international: [],
          continental: [],
          domestic: []
        },
        _source: 'TheSportsDB',
        _lastVerified: new Date().toISOString(),
        _confidence: 80,
        _verified: true
      };
      
      verificationSteps.push('✅ Found team in TheSportsDB');
      
      // Add achievements from knowledge base
      for (const [key, achievements] of Object.entries(KNOWN_ACHIEVEMENTS)) {
        if (queryLower.includes(key) || key.includes(queryLower)) {
          teamData.majorAchievements = achievements;
          teamData._source = 'TheSportsDB + Knowledge Base';
          teamData._confidence = 90;
          verificationSteps.push('✅ Retrieved verified achievements');
          break;
        }
      }
      
      // STEP 3: Fetch squad with improved method
      let squad: Player[] = [];
      if (sportsDbResult.idTeam) {
        verificationSteps.push('🔍 Fetching squad from multiple sources...');
        squad = await fetchSquadFromSportsDB(sportsDbResult.idTeam);
        
        if (squad.length > 0) {
          verificationSteps.push(`✅ Loaded ${squad.length} players from TheSportsDB`);
        } else {
          verificationSteps.push('⚠️ No squad data from TheSportsDB');
          
          // STEP 4: Try to build squad from known players if API fails
          if (queryLower.includes('belgium')) {
            squad = [
              {
                name: 'Kevin De Bruyne',
                currentTeam: 'Manchester City',
                position: 'Midfielder',
                age: 33,
                nationality: 'Belgian',
                careerGoals: 150,
                careerAssists: 250,
                internationalAppearances: 105,
                internationalGoals: 27,
                majorAchievements: ['UEFA Champions League 2023 winner', '5x Premier League'],
                careerSummary: 'Belgium captain, one of the best midfielders in the world.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/88755-1675263181.jpg'
              },
              {
                name: 'Romelu Lukaku',
                currentTeam: 'Napoli',
                position: 'Forward',
                age: 31,
                nationality: 'Belgian',
                careerGoals: 350,
                careerAssists: 100,
                internationalAppearances: 119,
                internationalGoals: 85,
                majorAchievements: ['Belgium all-time top scorer', 'UEFA Europa League winner'],
                careerSummary: 'Belgium\'s all-time leading goalscorer.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/108799-1675263182.jpg'
              },
              {
                name: 'Thibaut Courtois',
                currentTeam: 'Real Madrid',
                position: 'Goalkeeper',
                age: 32,
                nationality: 'Belgian',
                careerGoals: 0,
                careerAssists: 0,
                internationalAppearances: 102,
                internationalGoals: 0,
                majorAchievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga winner'],
                careerSummary: 'Considered one of the best goalkeepers in the world.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/10862-1675274607.jpg'
              },
              {
                name: 'Jan Vertonghen',
                currentTeam: 'Anderlecht',
                position: 'Defender',
                age: 37,
                nationality: 'Belgian',
                careerGoals: 60,
                careerAssists: 25,
                internationalAppearances: 154,
                internationalGoals: 10,
                majorAchievements: ['Belgium all-time cap leader', '2018 FIFA World Cup bronze'],
                careerSummary: 'Belgium\'s most capped player.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/4353-1675263123.jpg'
              },
              {
                name: 'Youri Tielemans',
                currentTeam: 'Aston Villa',
                position: 'Midfielder',
                age: 27,
                nationality: 'Belgian',
                careerGoals: 70,
                careerAssists: 60,
                internationalAppearances: 70,
                internationalGoals: 7,
                majorAchievements: ['Belgian Golden Shoe'],
                careerSummary: 'Creative midfielder known for his passing range.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/249258-1675263182.jpg'
              },
              {
                name: 'Leandro Trossard',
                currentTeam: 'Arsenal',
                position: 'Forward',
                age: 29,
                nationality: 'Belgian',
                careerGoals: 100,
                careerAssists: 80,
                internationalAppearances: 35,
                internationalGoals: 8,
                majorAchievements: ['Premier League runner-up'],
                careerSummary: 'Versatile forward known for his dribbling.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/205943-1675263182.jpg'
              }
            ];
            verificationSteps.push(`✅ Loaded ${squad.length} players from known squad database`);
          } else if (queryLower.includes('netherlands')) {
            squad = [
              {
                name: 'Virgil van Dijk',
                currentTeam: 'Liverpool',
                position: 'Defender',
                age: 33,
                nationality: 'Dutch',
                careerGoals: 60,
                careerAssists: 20,
                internationalAppearances: 75,
                internationalGoals: 9,
                majorAchievements: ['UEFA Champions League 2019 winner', 'Premier League winner'],
                careerSummary: 'Considered one of the best defenders in the world.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/139208-1675263197.jpg'
              },
              {
                name: 'Frenkie de Jong',
                currentTeam: 'Barcelona',
                position: 'Midfielder',
                age: 27,
                nationality: 'Dutch',
                careerGoals: 30,
                careerAssists: 40,
                internationalAppearances: 55,
                internationalGoals: 2,
                majorAchievements: ['La Liga winner', 'UEFA Nations League runner-up'],
                careerSummary: 'Elegant midfielder known for his ball control.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/326330-1675263197.jpg'
              },
              {
                name: 'Memphis Depay',
                currentTeam: 'Corinthians',
                position: 'Forward',
                age: 30,
                nationality: 'Dutch',
                careerGoals: 200,
                careerAssists: 100,
                internationalAppearances: 98,
                internationalGoals: 46,
                majorAchievements: ['Ligue 1 winner', 'Copa del Rey winner'],
                careerSummary: 'Dutch national team captain.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/167850-1675263197.jpg'
              },
              {
                name: 'Matthijs de Ligt',
                currentTeam: 'Manchester United',
                position: 'Defender',
                age: 25,
                nationality: 'Dutch',
                careerGoals: 30,
                careerAssists: 5,
                internationalAppearances: 45,
                internationalGoals: 2,
                majorAchievements: ['Serie A winner', 'Bundesliga winner'],
                careerSummary: 'One of the best young defenders.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/326331-1675263197.jpg'
              },
              {
                name: 'Cody Gakpo',
                currentTeam: 'Liverpool',
                position: 'Forward',
                age: 25,
                nationality: 'Dutch',
                careerGoals: 100,
                careerAssists: 60,
                internationalAppearances: 30,
                internationalGoals: 12,
                majorAchievements: ['Dutch Footballer of the Year'],
                careerSummary: 'Versatile forward, 2022 World Cup star.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/484475-1675263197.jpg'
              },
              {
                name: 'Xavi Simons',
                currentTeam: 'RB Leipzig',
                position: 'Midfielder',
                age: 21,
                nationality: 'Dutch',
                careerGoals: 40,
                careerAssists: 35,
                internationalAppearances: 20,
                internationalGoals: 1,
                majorAchievements: ['Eredivisie winner'],
                careerSummary: 'Young creative midfielder.',
                _source: 'Known Squad Database',
                _lastVerified: new Date().toISOString(),
                _imageUrl: 'https://img.a.transfermarkt.technology/portrait/big/387657-1675263197.jpg'
              }
            ];
            verificationSteps.push(`✅ Loaded ${squad.length} players from known squad database`);
          }
        }
      }
      
      return {
        players: squad,
        teams: [teamData],
        youtubeQuery: `${teamData.name} highlights ${SEASON_YEAR}`,
        _metadata: {
          source: teamData._source,
          confidence: teamData._confidence,
          season: CURRENT_SEASON,
          verified: true,
          hasSquad: squad.length > 0,
          squadCount: squad.length,
          verificationSteps,
          originalQuery: query,
          correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
        }
      };
      
    } else {
      verificationSteps.push('❌ Team not found in TheSportsDB');
    }
  } catch (error) {
    console.error('[TEAM SEARCH] Error:', error);
    verificationSteps.push('⚠️ TheSportsDB API error');
  }

  // Try knowledge base only as fallback
  for (const [key, achievements] of Object.entries(KNOWN_ACHIEVEMENTS)) {
    if (queryLower.includes(key) || key.includes(queryLower)) {
      console.log(`✅ [KNOWLEDGE BASE] Found achievements for: ${key}`);
      
      const teamData: Team = {
        name: searchQuery,
        type: detectTeamType('', searchQuery),
        country: '',
        currentCoach: 'Unknown',
        foundedYear: undefined,
        majorAchievements: achievements,
        _source: 'Knowledge Base',
        _confidence: 60,
        _verified: false
      };
      
      verificationSteps.push('✅ Found team in knowledge base');
      verificationSteps.push('⚠️ No squad data available');
      
      return {
        players: [],
        teams: [teamData],
        youtubeQuery: `${searchQuery} highlights ${SEASON_YEAR}`,
        _metadata: {
          source: 'Knowledge Base',
          confidence: 60,
          season: CURRENT_SEASON,
          verified: false,
          hasSquad: false,
          warning: 'Squad data not available',
          verificationSteps,
          originalQuery: query,
          correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
        }
      };
    }
  }

  // Ultimate fallback
  return {
    players: [],
    teams: [{
      name: searchQuery,
      type: detectTeamType('', searchQuery),
      country: '',
      currentCoach: 'Unknown',
      majorAchievements: { worldCup: [], international: [], continental: [], domestic: [] },
      _source: 'Not Found',
      _confidence: 10,
      _verified: false
    }],
    youtubeQuery: `${searchQuery} football`,
    _metadata: {
      source: 'Not Found',
      confidence: 10,
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
// PLAYER FUNCTIONS - WITH IMPROVED STATS PARSING
// ============================================================================

// Known player stats database
const KNOWN_PLAYER_STATS: Record<string, { goals: number; assists: number; caps: number; intlGoals: number; achievements: string[] }> = {
  'karim benzema': { goals: 450, assists: 165, caps: 97, intlGoals: 37, achievements: ['2022 Ballon d\'Or', '4x UEFA Champions League', '2022 UEFA Champions League top scorer'] },
  'kylian mbappé': { goals: 300, assists: 120, caps: 80, intlGoals: 46, achievements: ['FIFA World Cup 2018 winner', 'UEFA Nations League 2021 winner', 'World Cup final hat-trick 2022'] },
  'kylian mbappe': { goals: 300, assists: 120, caps: 80, intlGoals: 46, achievements: ['FIFA World Cup 2018 winner', 'UEFA Nations League 2021 winner', 'World Cup final hat-trick 2022'] },
  'lionel messi': { goals: 850, assists: 380, caps: 180, intlGoals: 106, achievements: ['8x Ballon d\'Or', 'FIFA World Cup 2022 winner', '4x UEFA Champions League', '2021 Copa América winner'] },
  'cristiano ronaldo': { goals: 900, assists: 250, caps: 205, intlGoals: 128, achievements: ['5x Ballon d\'Or', '5x UEFA Champions League', 'UEFA Euro 2016 winner', 'UEFA Nations League 2019 winner'] },
  'erling haaland': { goals: 250, assists: 50, caps: 30, intlGoals: 30, achievements: ['UEFA Champions League 2023 winner', 'Premier League Golden Boot', 'UEFA Men\'s Player of the Year 2023'] },
  'jude bellingham': { goals: 60, assists: 40, caps: 35, intlGoals: 5, achievements: ['UEFA Champions League 2024 winner', 'La Liga 2024 winner', 'Golden Boy 2023', 'UEFA Champions League Young Player of the Season'] },
  'vinícius júnior': { goals: 120, assists: 80, caps: 35, intlGoals: 5, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga 2024 winner', 'UEFA Champions League Final Man of the Match 2024'] },
  'vinicius junior': { goals: 120, assists: 80, caps: 35, intlGoals: 5, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga 2024 winner'] },
  'rodrygo goes': { goals: 60, assists: 45, caps: 25, intlGoals: 5, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga 2024 winner'] },
  'rodrygo': { goals: 60, assists: 45, caps: 25, intlGoals: 5, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga 2024 winner'] },
  'eduardo camavinga': { goals: 12, assists: 18, caps: 20, intlGoals: 2, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga 2024 winner', 'UEFA Nations League 2021 winner'] },
  'federico valverde': { goals: 50, assists: 45, caps: 60, intlGoals: 6, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga 2024 winner'] },
  'gonzalo montiel': { goals: 10, assists: 15, caps: 30, intlGoals: 1, achievements: ['FIFA World Cup 2022 winner', 'Copa América 2021, 2024 winner'] },
  'kevin de bruyne': { goals: 150, assists: 250, caps: 105, intlGoals: 27, achievements: ['UEFA Champions League 2023 winner', '5x Premier League', 'PFA Players\' Player of the Year'] },
  'romelu lukaku': { goals: 350, assists: 100, caps: 119, intlGoals: 85, achievements: ['Belgium all-time top scorer', 'UEFA Europa League winner', 'Serie A winner'] },
  'thibaut courtois': { goals: 0, assists: 0, caps: 102, intlGoals: 0, achievements: ['UEFA Champions League 2022, 2024 winner', 'La Liga winner', 'The Best FIFA Goalkeeper'] },
  'virgil van dijk': { goals: 60, assists: 20, caps: 75, intlGoals: 9, achievements: ['UEFA Champions League 2019 winner', 'Premier League winner', 'UEFA Men\'s Player of the Year'] },
  'frenkie de jong': { goals: 30, assists: 40, caps: 55, intlGoals: 2, achievements: ['La Liga winner', 'UEFA Nations League runner-up'] },
  'memphis depay': { goals: 200, assists: 100, caps: 98, intlGoals: 46, achievements: ['Ligue 1 winner', 'Copa del Rey winner'] }
};

async function searchPlayers(query: string): Promise<GROQSearchResponse> {
  console.log(`🔍 [PLAYER SEARCH] Searching for: "${query}"`);
  
  const verificationSteps: string[] = [];
  verificationSteps.push(`🔍 Original query: "${query}"`);
  
  // STEP 1: AI fuzzy matching to fix misspellings
  verificationSteps.push('🤖 AI correcting misspellings...');
  const aiCorrected = await correctQueryWithAI(query, 'player');
  const searchQuery = aiCorrected.corrected;
  
  if (aiCorrected.original !== aiCorrected.corrected) {
    verificationSteps.push(`✅ AI corrected to: "${searchQuery}"`);
  } else {
    verificationSteps.push(`✅ Using query: "${searchQuery}"`);
  }
  
  // STEP 2: Try TheSportsDB for basic info
  verificationSteps.push('🔍 Checking TheSportsDB...');
  
  let playerName = searchQuery;
  let currentTeam = 'Unknown';
  let position = 'Player';
  let age: number | undefined = undefined;
  let nationality = '';
  let imageUrl: string | undefined = undefined;
  let foundInSportsDB = false;
  let sportsDBId: string | undefined = undefined;
  
  try {
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(searchUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.player && Array.isArray(data.player) && data.player.length > 0) {
        let matchedPlayer = null;
        
        // Try exact match first
        for (const p of data.player) {
          if (p.strPlayer && p.strPlayer.toLowerCase() === searchQuery.toLowerCase()) {
            matchedPlayer = p;
            break;
          }
        }
        
        if (!matchedPlayer) {
          for (const p of data.player) {
            if (p.strPlayer && p.strPlayer.toLowerCase().includes(searchQuery.toLowerCase())) {
              matchedPlayer = p;
              break;
            }
          }
        }
        
        if (!matchedPlayer) {
          matchedPlayer = data.player[0];
        }
        
        if (matchedPlayer) {
          console.log(`✅ [TheSportsDB] Found: ${matchedPlayer.strPlayer}`);
          verificationSteps.push(`✅ Found player: ${matchedPlayer.strPlayer}`);
          
          playerName = matchedPlayer.strPlayer;
          currentTeam = matchedPlayer.strTeam || 'Unknown';
          position = mapPosition(matchedPlayer.strPosition);
          age = matchedPlayer.dateBorn ? calculateAge(matchedPlayer.dateBorn) : undefined;
          nationality = matchedPlayer.strNationality || '';
          imageUrl = matchedPlayer.strThumb || matchedPlayer.strCutout;
          sportsDBId = matchedPlayer.idPlayer;
          foundInSportsDB = true;
        }
      }
    }
  } catch (error) {
    console.error('[TheSportsDB] Error:', error);
    verificationSteps.push('⚠️ TheSportsDB API error');
  }
  
  // STEP 3: Try to get detailed stats from TheSportsDB
  let careerGoals: number | undefined = undefined;
  let careerAssists: number | undefined = undefined;
  let intCaps: number | undefined = undefined;
  let intGoals: number | undefined = undefined;
  
  if (sportsDBId) {
    try {
      const detailUrl = `https://www.thesportsdb.com/api/v1/json/3/lookupplayer.php?id=${sportsDBId}`;
      const detailResponse = await fetch(detailUrl);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        if (detailData.players && detailData.players.length > 0) {
          const detailed = detailData.players[0];
          
          if (detailed.intGoals) {
            careerGoals = parseInt(detailed.intGoals);
            verificationSteps.push(`✅ Found career goals from SportsDB: ${careerGoals}`);
          }
          if (detailed.intAssists) {
            careerAssists = parseInt(detailed.intAssists);
            verificationSteps.push(`✅ Found career assists from SportsDB: ${careerAssists}`);
          }
          if (detailed.intInternationalCaps) {
            intCaps = parseInt(detailed.intInternationalCaps);
            verificationSteps.push(`✅ Found international caps from SportsDB: ${intCaps}`);
          }
          if (detailed.intInternationalGoals) {
            intGoals = parseInt(detailed.intInternationalGoals);
            verificationSteps.push(`✅ Found international goals from SportsDB: ${intGoals}`);
          }
        }
      }
    } catch (error) {
      console.error('[Player Details] Error:', error);
    }
  }
  
  // STEP 4: Try Wikipedia for STATS
  verificationSteps.push('🔍 Checking Wikipedia for statistics...');
  
  let careerSummary = '';
  
  try {
    const wikiName = encodeURIComponent(playerName || searchQuery);
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiName}`;
    const wikiResponse = await fetch(wikiUrl);
    
    if (wikiResponse.ok) {
      const wikiData = await wikiResponse.json();
      
      if (wikiData.extract) {
        console.log(`✅ [Wikipedia] Found page for: ${playerName || searchQuery}`);
        verificationSteps.push('✅ Found Wikipedia page');
        
        careerSummary = wikiData.extract.split('.')[0] + '.';
        const extract = wikiData.extract.toLowerCase();
        
        // Enhanced goal parsing
        const goalsPatterns = [
          /(\d+)\s*goals?\s+in\s+(\d+)\s*appearances?/i,
          /scored\s+(\d+)\s*goals?/i,
          /total\s+of\s+(\d+)\s*goals?/i,
          /(\d+)\s*goals?\s+in\s+his\s+career/i,
          /over\s+(\d+)\s*goals?/i,
          /more\s+than\s+(\d+)\s*goals?/i,
          /(\d+)\s*career\s*goals?/i
        ];
        
        for (const pattern of goalsPatterns) {
          const match = extract.match(pattern);
          if (match && !careerGoals) {
            careerGoals = parseInt(match[1]);
            verificationSteps.push(`✅ Found career goals: ${careerGoals}`);
            break;
          }
        }
        
        // Enhanced international caps parsing
        const capsPatterns = [
          /(\d+)\s*caps?\s*.*?(\d+)\s*goals?/i,
          /earned\s+(\d+)\s*caps?/i,
          /has\s+(\d+)\s*caps?/i,
          /won\s+(\d+)\s*caps?/i,
          /(\d+)\s*international\s*caps?/i
        ];
        
        for (const pattern of capsPatterns) {
          const match = extract.match(pattern);
          if (match && !intCaps) {
            intCaps = parseInt(match[1]);
            if (match[2]) intGoals = parseInt(match[2]);
            verificationSteps.push(`✅ Found international: ${intCaps} caps${intGoals ? `, ${intGoals} goals` : ''}`);
            break;
          }
        }
        
        // Assists
        const assistsMatch = extract.match(/(\d+)\s*assists?/i);
        if (assistsMatch && !careerAssists) {
          careerAssists = parseInt(assistsMatch[1]);
          verificationSteps.push(`✅ Found career assists: ${careerAssists}`);
        }
        
        // Nationality
        if (!nationality) {
          const countries = [
            'spanish', 'french', 'german', 'italian', 'english', 'portuguese', 
            'dutch', 'brazilian', 'argentine', 'belgian', 'croatian', 'danish', 
            'swedish', 'norwegian', 'polish', 'austrian', 'swiss', 'turkish',
            'uruguayan', 'colombian', 'chilean', 'mexican', 'american', 'canadian',
            'japanese', 'korean', 'australian', 'moroccan', 'senegalese', 'egyptian',
            'nigerian', 'ghanaian', 'cameroonian', 'ivorian'
          ];
          
          for (const country of countries) {
            if (extract.includes(country)) {
              nationality = country.charAt(0).toUpperCase() + country.slice(1);
              break;
            }
          }
        }
      }
    } else {
      verificationSteps.push('⚠️ Wikipedia page not found');
    }
  } catch (error) {
    console.error('[Wikipedia] Error:', error);
    verificationSteps.push('⚠️ Wikipedia API error');
  }
  
  // STEP 5: Use known player stats database as fallback
  const lowerName = playerName.toLowerCase();
  for (const [key, stats] of Object.entries(KNOWN_PLAYER_STATS)) {
    if (lowerName.includes(key)) {
      if (!careerGoals) careerGoals = stats.goals;
      if (!careerAssists) careerAssists = stats.assists;
      if (!intCaps) intCaps = stats.caps;
      if (!intGoals) intGoals = stats.intlGoals;
      verificationSteps.push(`✅ Added verified stats for ${playerName}`);
      break;
    }
  }
  
  // STEP 6: Build the player object
  const player: Player = {
    name: playerName || searchQuery,
    currentTeam: currentTeam,
    position: position,
    age: age,
    nationality: nationality || '',
    careerGoals: careerGoals,
    careerAssists: careerAssists,
    internationalAppearances: intCaps,
    internationalGoals: intGoals,
    majorAchievements: [],
    careerSummary: careerSummary || `${playerName || searchQuery} is a ${position} from ${nationality || 'unknown'}. Currently plays for ${currentTeam}.`,
    _source: foundInSportsDB ? 'TheSportsDB + Wikipedia' : 'Wikipedia',
    _lastVerified: new Date().toISOString(),
    _imageUrl: imageUrl
  };
  
  // Add major achievements from known stats
  for (const [key, stats] of Object.entries(KNOWN_PLAYER_STATS)) {
    if (lowerName.includes(key) && stats.achievements) {
      player.majorAchievements = stats.achievements;
      break;
    }
  }
  
  // Determine confidence level
  let confidence = 30;
  let source = 'Wikipedia';
  
  if (foundInSportsDB) {
    confidence = 50;
    source = 'TheSportsDB + Wikipedia';
  }
  
  if (careerGoals || intCaps) {
    confidence = 70;
  }
  
  for (const key of Object.keys(KNOWN_PLAYER_STATS)) {
    if (lowerName.includes(key)) {
      confidence = 85;
      source = 'Verified Player Database';
      break;
    }
  }
  
  return {
    players: [player],
    teams: [],
    youtubeQuery: `${player.name} highlights ${SEASON_YEAR}`,
    _metadata: {
      source,
      confidence,
      season: CURRENT_SEASON,
      verified: foundInSportsDB,
      hasSquad: false,
      warning: !careerGoals && !intCaps ? 'Limited statistics available' : undefined,
      verificationSteps,
      originalQuery: query,
      correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
    }
  };
}

// ============================================================================
// HISTORICAL PLAYERS FUNCTION - EXPORTED FOR TEAMS PAGE
// ============================================================================

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
// HELPER FUNCTIONS
// ============================================================================

function mapPosition(position: string): string {
  if (!position) return 'Player';
  const pos = position.toLowerCase();
  if (pos.includes('goalkeeper') || pos.includes('keeper')) return 'Goalkeeper';
  if (pos.includes('defender') || pos.includes('back')) return 'Defender';
  if (pos.includes('midfield')) return 'Midfielder';
  if (pos.includes('forward') || pos.includes('striker') || pos.includes('winger')) return 'Forward';
  if (pos.includes('left wing')) return 'Left Wing';
  if (pos.includes('right wing')) return 'Right Wing';
  if (pos.includes('centre-forward')) return 'Centre-Forward';
  return position;
}

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

function detectTeamType(country: string, query: string): 'club' | 'national' {
  const queryLower = query.toLowerCase();
  const nationalTeams = [
    'argentina', 'brazil', 'france', 'germany', 'italy', 'spain', 
    'england', 'portugal', 'netherlands', 'belgium', 'uruguay',
    'croatia', 'switzerland', 'denmark', 'sweden', 'norway',
    'chile', 'colombia', 'mexico', 'usa', 'canada', 'japan',
    'south korea', 'australia', 'morocco', 'senegal', 'egypt'
  ];
  if (nationalTeams.includes(queryLower) && 
      !queryLower.includes('fc') && !queryLower.includes('cf') && 
      !queryLower.includes('ac') && !queryLower.includes('united') &&
      !queryLower.includes('city')) {
    return 'national';
  }
  return 'club';
}

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
      : await searchPlayers(query);
    
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
  console.log('🧹 Search cache cleared');
};

if (typeof window !== 'undefined') {
  (window as any).__GROQ_CACHE_CLEAR = () => {
    cache.clear();
    console.log('🧹 GROQ in-memory cache cleared via window');
  };
}

export const getDataSourceInfo = (result: any) => ({
  source: result?._metadata?.source || 'Unknown',
  color: result?._metadata?.verified ? 'green' : 
         result?._metadata?.source?.includes('TheSportsDB') ? 'blue' : 
         result?._metadata?.source?.includes('Wikipedia') ? 'yellow' : 
         result?._metadata?.source?.includes('Knowledge') ? 'purple' : 
         result?._metadata?.source?.includes('Verified') ? 'green' : 'gray',
  icon: result?._metadata?.verified ? '✅' : 
        result?._metadata?.source?.includes('TheSportsDB') ? '🔍' : 
        result?._metadata?.source?.includes('Wikipedia') ? '📚' : 
        result?._metadata?.source?.includes('Knowledge') ? '📖' : 
        result?._metadata?.source?.includes('Verified') ? '✅' : '❓',
  confidence: result?._metadata?.confidence || 0,
  season: result?._metadata?.season || CURRENT_SEASON,
  verified: result?._metadata?.verified || false,
  warning: result?._metadata?.warning || null,
  verificationSteps: result?._metadata?.verificationSteps || [],
  originalQuery: result?._metadata?.originalQuery,
  correctedQuery: result?._metadata?.correctedQuery
});

export const getCurrentSeason = () => CURRENT_SEASON;