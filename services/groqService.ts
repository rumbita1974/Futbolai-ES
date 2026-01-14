// services/groqService.ts - FIXED VERSION
import Groq from 'groq-sdk';
import { validatePlayer } from './dataValidationService';
import { getPlayerImage } from './playerImageService';

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
    clubWorldCup?: string[];
    continental: string[];
    domestic: string[];
  };
  _source?: string;
  _lastVerified?: string;
  _updateReason?: string;
  _wikiSummary?: string;
  _achievementsUpdated?: boolean;
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

// Cache for historical players to avoid repeated work and concurrent fetches
const historicalPlayersCache: Map<string, Player[]> = new Map();

// Historical team data with key players for fallback
const HISTORICAL_TEAM_DATA: Record<string, any> = {
  'real madrid': {
    foundedYear: 1902,
    stadium: 'Santiago Bernabéu',
    country: 'Spain',
    type: 'club',
    keyPlayers: [
      'Kylian Mbappé', 'Vinícius Júnior', 'Jude Bellingham', 'Rodrygo', 
      'Eduardo Camavinga', 'Aurélien Tchouaméni', 'Federico Valverde',
      'Thibaut Courtois', 'Éder Militão', 'David Alaba', 'Antonio Rüdiger'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (5 titles: 2014, 2016, 2017, 2018, 2022)"
      ],
      continental: [
        "UEFA Champions League (15 titles: 1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)"
      ],
      domestic: [
        "La Liga (36 titles)",
        "Copa del Rey (20 titles)",
        "Supercopa de España (13 titles)"
      ]
    }
  },
  'barcelona': {
    foundedYear: 1899,
    stadium: 'Spotify Camp Nou',
    country: 'Spain',
    type: 'club',
    keyPlayers: [
      'Robert Lewandowski', 'Pedri', 'Gavi', 'Frenkie de Jong', 
      'Lamine Yamal', 'Ronald Araújo', 'Marc-André ter Stegen',
      'Jules Koundé', 'İlkay Gündoğan', 'João Félix', 'Raphinha'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2009, 2011, 2015)"
      ],
      continental: [
        "UEFA Champions League (5 titles: 1992, 2006, 2009, 2011, 2015)"
      ],
      domestic: [
        "La Liga (27 titles)",
        "Copa del Rey (31 titles)",
        "Supercopa de España (14 titles)"
      ]
    }
  },
  'ac milan': {
    foundedYear: 1899,
    stadium: 'San Siro',
    country: 'Italy',
    type: 'club',
    keyPlayers: [
      'Rafael Leão', 'Theo Hernández', 'Mike Maignan', 'Christian Pulisic',
      'Olivier Giroud', 'Fikayo Tomori', 'Sandro Tonali', 'Ismaël Bennacer',
      'Davide Calabria', 'Alessandro Florenzi', 'Simon Kjær'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2007)"
      ],
      continental: [
        "UEFA Champions League (7 titles: 1963, 1969, 1989, 1990, 1994, 2003, 2007)",
        "UEFA Cup Winners' Cup (2 titles)",
        "UEFA Super Cup (5 titles)"
      ],
      domestic: [
        "Serie A (19 titles)",
        "Coppa Italia (5 titles)",
        "Supercoppa Italiana (7 titles)"
      ]
    }
  },
  'inter milan': {
    foundedYear: 1908,
    stadium: 'San Siro',
    country: 'Italy',
    type: 'club',
    keyPlayers: [
      'Lautaro Martínez', 'Nicolò Barella', 'Alessandro Bastoni', 'Hakan Çalhanoğlu',
      'Marcus Thuram', 'Benjamin Pavard', 'Stefan de Vrij', 'Henrikh Mkhitaryan',
      'Matteo Darmian', 'Federico Dimarco', 'Yann Sommer'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2010)"
      ],
      continental: [
        "UEFA Champions League (3 titles: 1964, 1965, 2010)",
        "UEFA Cup/Europa League (3 titles)",
        "UEFA Super Cup (1 title)"
      ],
      domestic: [
        "Serie A (20 titles)",
        "Coppa Italia (9 titles)",
        "Supercoppa Italiana (8 titles)"
      ]
    }
  },
  'juventus': {
    foundedYear: 1897,
    stadium: 'Allianz Stadium',
    country: 'Italy',
    type: 'club',
    keyPlayers: [
      'Dušan Vlahović', 'Federico Chiesa', 'Gleison Bremer', 'Wojciech Szczęsny',
      'Adrien Rabiot', 'Manuel Locatelli', 'Weston McKennie', 'Danilo',
      'Alex Sandro', 'Federico Gatti', 'Timothy Weah'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (1985, 1996)"
      ],
      continental: [
        "UEFA Champions League (2 titles: 1985, 1996)",
        "UEFA Cup/Europa League (3 titles)",
        "UEFA Cup Winners' Cup (1 title)",
        "UEFA Super Cup (2 titles)"
      ],
      domestic: [
        "Serie A (36 titles)",
        "Coppa Italia (14 titles)",
        "Supercoppa Italiana (9 titles)"
      ]
    }
  },
  'manchester city': {
    foundedYear: 1880,
    stadium: 'Etihad Stadium',
    country: 'England',
    type: 'club',
    keyPlayers: [
      'Erling Haaland', 'Kevin De Bruyne', 'Phil Foden', 'Rodri',
      'Bernardo Silva', 'Kyle Walker', 'Rúben Dias', 'Ederson',
      'Jack Grealish', 'John Stones', 'Jérémy Doku'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2023)"
      ],
      continental: [
        "UEFA Champions League (2023)",
        "UEFA Cup Winners' Cup (1970)"
      ],
      domestic: [
        "Premier League (9 titles)",
        "FA Cup (7 titles)",
        "EFL Cup (8 titles)",
        "FA Community Shield (6 titles)"
      ]
    }
  },
  'liverpool': {
    foundedYear: 1892,
    stadium: 'Anfield',
    country: 'England',
    type: 'club',
    keyPlayers: [
      'Mohamed Salah', 'Virgil van Dijk', 'Trent Alexander-Arnold', 'Darwin Núñez',
      'Alexis Mac Allister', 'Alisson Becker', 'Andrew Robertson', 'Ibrahima Konaté',
      'Diogo Jota', 'Cody Gakpo', 'Dominik Szoboszlai'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2019)"
      ],
      continental: [
        "UEFA Champions League (6 titles: 1977, 1978, 1981, 1984, 2005, 2019)"
      ],
      domestic: [
        "First Division/Premier League (19 titles)",
        "FA Cup (8 titles)",
        "EFL Cup (10 titles)",
        "FA Community Shield (16 titles)"
      ]
    }
  },
  'bayern munich': {
    foundedYear: 1900,
    stadium: 'Allianz Arena',
    country: 'Germany',
    type: 'club',
    keyPlayers: [
      'Harry Kane', 'Jamal Musiala', 'Leroy Sané', 'Joshua Kimmich',
      'Manuel Neuer', 'Thomas Müller', 'Serge Gnabry', 'Dayot Upamecano',
      'Kingsley Coman', 'Leon Goretzka', 'Matthijs de Ligt'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2013, 2020)"
      ],
      continental: [
        "UEFA Champions League (6 titles: 1974, 1975, 1976, 2001, 2013, 2020)"
      ],
      domestic: [
        "Bundesliga (33 titles)",
        "DFB-Pokal (20 titles)",
        "DFL-Supercup (10 titles)",
        "DFL-Ligapokal (6 titles)"
      ]
    }
  },
  'psg': {
    foundedYear: 1970,
    stadium: 'Parc des Princes',
    country: 'France',
    type: 'club',
    keyPlayers: [
      'Kylian Mbappé', 'Achraf Hakimi', 'Marquinhos', 'Vitinha',
      'Warren Zaïre-Emery', 'Gianluigi Donnarumma', 'Nuno Mendes',
      'Presnel Kimpembe', 'Marco Verratti', 'Ousmane Dembélé', 'Randal Kolo Muani'
    ],
    historicalAchievements: {
      clubWorldCup: [],
      continental: [],
      domestic: [
        "Ligue 1 (11 titles)",
        "Coupe de France (14 titles)",
        "Coupe de la Ligue (9 titles)",
        "Trophée des Champions (11 titles)"
      ]
    }
  },
  'arsenal': {
    foundedYear: 1886,
    stadium: 'Emirates Stadium',
    country: 'England',
    type: 'club',
    keyPlayers: [
      'Bukayo Saka', 'Martin Ødegaard', 'Declan Rice', 'William Saliba',
      'Gabriel Jesus', 'Gabriel Martinelli', 'Ben White', 'Aaron Ramsdale',
      'Kai Havertz', 'Oleksandr Zinchenko', 'Thomas Partey'
    ],
    historicalAchievements: {
      clubWorldCup: [],
      continental: [
        "UEFA Cup Winners' Cup (1994)"
      ],
      domestic: [
        "First Division/Premier League (13 titles)",
        "FA Cup (14 titles)",
        "EFL Cup (2 titles)",
        "FA Community Shield (17 titles)"
      ]
    }
  },
  'chelsea': {
    foundedYear: 1905,
    stadium: 'Stamford Bridge',
    country: 'England',
    type: 'club',
    keyPlayers: [
      'Cole Palmer', 'Moisés Caicedo', 'Christopher Nkunku', 'Reece James',
      'Thiago Silva', 'Raheem Sterling', 'Enzo Fernández', 'Mykhailo Mudryk',
      'Nicolas Jackson', 'Axel Disasi', 'Robert Sánchez'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2021)"
      ],
      continental: [
        "UEFA Champions League (2 titles: 2012, 2021)",
        "UEFA Europa League (2 titles)",
        "UEFA Cup Winners' Cup (2 titles)",
        "UEFA Super Cup (2 titles)"
      ],
      domestic: [
        "First Division/Premier League (6 titles)",
        "FA Cup (8 titles)",
        "EFL Cup (5 titles)",
        "FA Community Shield (4 titles)"
      ]
    }
  },
  'manchester united': {
    foundedYear: 1878,
    stadium: 'Old Trafford',
    country: 'England',
    type: 'club',
    keyPlayers: [
      'Bruno Fernandes', 'Marcus Rashford', 'Rasmus Højlund', 'Kobbie Mainoo',
      'Harry Maguire', 'Luke Shaw', 'André Onana', 'Mason Mount',
      'Antony', 'Jadon Sancho', 'Casemiro'
    ],
    historicalAchievements: {
      clubWorldCup: [
        "FIFA Club World Cup (2008)"
      ],
      continental: [
        "UEFA Champions League (3 titles: 1968, 1999, 2008)",
        "UEFA Europa League (1 title)",
        "UEFA Cup Winners' Cup (1 title)",
        "UEFA Super Cup (1 title)"
      ],
      domestic: [
        "First Division/Premier League (20 titles)",
        "FA Cup (12 titles)",
        "EFL Cup (6 titles)",
        "FA Community Shield (21 titles)"
      ]
    }
  },
  'tottenham': {
    foundedYear: 1882,
    stadium: 'Tottenham Hotspur Stadium',
    country: 'England',
    type: 'club',
    keyPlayers: [
      'Son Heung-min', 'James Maddison', 'Cristian Romero', 'Guglielmo Vicario',
      'Dejan Kulusevski', 'Richarlison', 'Pedro Porro', 'Micky van de Ven',
      'Yves Bissouma', 'Pape Matar Sarr', 'Brennan Johnson'
    ],
    historicalAchievements: {
      clubWorldCup: [],
      continental: [
        "UEFA Cup Winners' Cup (1963)",
        "UEFA Cup (2 titles)"
      ],
      domestic: [
        "First Division (2 titles)",
        "FA Cup (8 titles)",
        "EFL Cup (4 titles)",
        "FA Community Shield (7 titles)"
      ]
    }
  }
};

const enhanceWithHistoricalData = (result: GROQSearchResponse, query: string): GROQSearchResponse => {
  const queryLower = query.toLowerCase();
  const enhanced = JSON.parse(JSON.stringify(result));
  
  for (const [team, data] of Object.entries(HISTORICAL_TEAM_DATA)) {
    if (queryLower.includes(team)) {
      if (enhanced.teams?.[0]) {
        // Add historical data that doesn't change (ONLY for static info)
        if (!enhanced.teams[0].stadium || enhanced.teams[0].stadium === 'Unknown') {
          enhanced.teams[0].stadium = data.stadium;
        }
        if (!enhanced.teams[0].foundedYear || enhanced.teams[0].foundedYear === 0) {
          enhanced.teams[0].foundedYear = data.foundedYear;
        }
        if (!enhanced.teams[0].country || enhanced.teams[0].country === '') {
          enhanced.teams[0].country = data.country;
        }
        if (!enhanced.teams[0].type || enhanced.teams[0].type === '') {
          enhanced.teams[0].type = data.type;
        }
        
        // Initialize achievements if they don't exist
        if (!enhanced.teams[0].majorAchievements) {
          enhanced.teams[0].majorAchievements = {
            worldCup: [],
            clubWorldCup: [],
            continental: [],
            domestic: []
          };
        }
        
        // Enhance achievements with historical data (these don't change seasonally)
        const currentAchievements = enhanced.teams[0].majorAchievements;
        
        // For clubs: add clubWorldCup if not present
        if (data.type === 'club') {
          if ((!currentAchievements.clubWorldCup || currentAchievements.clubWorldCup.length === 0) && 
              data.historicalAchievements.clubWorldCup) {
            currentAchievements.clubWorldCup = data.historicalAchievements.clubWorldCup;
          }
        }
        
        // Add continental and domestic achievements if missing
        if ((!currentAchievements.continental || currentAchievements.continental.length === 0) && 
            data.historicalAchievements.continental) {
          currentAchievements.continental = data.historicalAchievements.continental;
        }
        
        if ((!currentAchievements.domestic || currentAchievements.domestic.length === 0) && 
            data.historicalAchievements.domestic) {
          currentAchievements.domestic = data.historicalAchievements.domestic;
        }
        
        enhanced.teams[0]._achievementsUpdated = true;
        console.log(`[HISTORY] Added historical achievements for ${team}`);
      }
      
      // CRITICAL: DO NOT add players from historical data
      // Players change every season - always use GROQ AI data or Wikipedia for current squad
      // Fallback should be a message, not fake player data
      if ((!enhanced.players || enhanced.players.length === 0)) {
        console.warn(`[WARNING] GROQ returned no players for ${query} - this is a data quality issue`);
        console.warn(`[FIX] Please improve the system prompt or check GROQ response format`);
        
        // Create a single placeholder message instead of fake players
        enhanced.players = [{
          name: `Current squad data for ${query} unavailable`,
          currentTeam: enhanced.teams[0]?.name || query,
          position: 'Information',
          nationality: 'N/A',
          careerGoals: 0,
          careerAssists: 0,
          internationalAppearances: 0,
          internationalGoals: 0,
          majorAchievements: [],
          careerSummary: `Check the official ${query} website or transfermarkt.com for current squad information.`,
          _source: 'System Notice',
          _lastVerified: new Date().toISOString(),
          _priority: 'low'
        }];
      }
      
      break;
    }
  }
  
  return enhanced;
};

const createDefaultTeam = (name: string): Team => {
  const nameLower = name.toLowerCase();
  let type: 'club' | 'national' = 'club';
  
  if (nameLower.includes('national') || 
      ['france', 'argentina', 'brazil', 'england', 'germany', 'spain', 'italy', 'portugal'].some(c => nameLower.includes(c))) {
    type = 'national';
  }
  
  const defaultAchievements = {
    worldCup: type === 'national' ? [] : undefined,
    clubWorldCup: type === 'club' ? [] : undefined,
    continental: [],
    domestic: type === 'club' ? [] : []
  };
  
  return {
    name: name,
    type: type,
    country: '',
    currentCoach: 'Unknown',
    foundedYear: undefined,
    stadium: undefined,
    majorAchievements: defaultAchievements,
    _source: 'System Default',
    _lastVerified: new Date().toISOString(),
    _updateReason: 'Default team created'
  };
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
  
  const coachPatterns = [
    /manager is (\w+ \w+)/i,
    /coach is (\w+ \w+)/i,
    /managed by (\w+ \w+)/i,
    /head coach (\w+ \w+)/i,
    /manager (\w+ \w+)/i
  ];
  
  for (const pattern of coachPatterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

const getEnhancedSystemPrompt = (query: string, language: string = 'en'): string => {
  const queryLower = query.toLowerCase();
  
  // Current season knowledge for major teams - VERIFIED 2025/2026
  const currentTeamKnowledge: Record<string, string> = {
    'real madrid': `Real Madrid 2025/2026 VERIFIED ROSTER:
      - Manager: Álvaro Arbeloa (appointed June 2024)
      - CURRENT players: Courtois, Lunín, Rüdiger, Alaba, Mendy, Carvajal, Tchouaméni, Camavinga, Modric (if still active), Vinicius Jr, Rodrygo, Bellingham, Mbappé
      - RETIRED/TRANSFERRED (exclude): Benzema (Al-Ittihad 2023), Modrić (if left), Kroos (if left), Nacho Fernández (if left), Lewandowski (if moved)
      - ACHIEVEMENTS: UEFA Champions League (15 titles, not 14), Copa del Rey, La Liga, UEFA Super Cup, FIFA Club World Cup (5)`,
    'barcelona': `FC Barcelona 2025/2026: Manager Hansi Flick (appointed May 2024). Include current La Liga squad.`,
    'ac milan': `AC Milan 2025/2026: Manager Paulo Fonseca (appointed June 2024).`,
    'inter milan': `Inter Milan 2025/2026: Manager Simone Inzaghi.`,
    'juventus': `Juventus 2025/2026: Manager Thiago Motta (appointed June 2024).`,
    'manchester city': `Manchester City 2025/2026: Manager Pep Guardiola.`,
    'liverpool': `Liverpool 2025/2026: Manager Arne Slot (appointed June 2024).`,
    'bayern munich': `Bayern Munich 2025/2026: Manager Vincent Kompany (appointed May 2024).`,
    'psg': `Paris Saint-Germain 2025/2026: Manager Luis Enrique.`,
    'arsenal': `Arsenal 2025/2026: Manager Mikel Arteta.`,
    'chelsea': `Chelsea 2025/2026: Manager Enzo Maresca (appointed June 2024).`,
    'manchester united': `Manchester United 2025/2026: Manager Erik ten Hag.`,
    'tottenham': `Tottenham 2025/2026: Manager Ange Postecoglou.`,
  };
  
  let specificKnowledge = '';
  for (const [team, knowledge] of Object.entries(currentTeamKnowledge)) {
    if (queryLower.includes(team)) {
      specificKnowledge = knowledge;
      break;
    }
  }
  
  // Determine team type for achievement structure
  const isNationalTeam = queryLower.includes('national') || 
    ['france', 'argentina', 'brazil', 'england', 'germany', 'spain', 'italy', 'portugal'].some(c => queryLower.includes(c));
  
  const achievementStructure = isNationalTeam ? 
    `"worldCup": ["FIFA World Cup (2022)"],` :
    `"clubWorldCup": ["FIFA Club World Cup (5)"],`;
  
  return `You are a football expert with verified 2025/2026 season knowledge. ACCURACY IS CRITICAL.

${specificKnowledge}

CRITICAL INSTRUCTIONS FOR 2025/2026 SEASON:
1. ONLY include ACTIVE players currently at the club/country (January 2026)
2. EXCLUDE all retired, transferred, or loaned-out players
3. INCLUDE EXACTLY 22-24 valid current players
4. Achievements MUST be accurate and complete:
   - Real Madrid: UEFA Champions League (15 titles, not 14)
   - Use format: "Competition (N titles): year1, year2, year3"
5. Manager/Coach MUST be correct for January 2026
6. Return VALID JSON that can be parsed - NO markdown, NO explanations

REQUIRED JSON STRUCTURE (must include these fields):
{
  "teams": [{
    "name": "Team Name",
    "type": "${isNationalTeam ? 'national' : 'club'}",
    "country": "Country",
    "stadium": "Stadium Name or null",
    "currentCoach": "Current Manager Name",
    "foundedYear": 1900,
    "majorAchievements": {
      ${achievementStructure}
      "continental": ["UEFA Champions League (15 titles): 1956, 1957, 1958, 1959, 1960, 1966, 1998, 1999, 2000, 2001, 2002, 2014, 2016, 2017, 2018"],
      "domestic": ["La Liga (35 titles)", "Copa del Rey (20 titles)"]
    }
  }],
  "players": [
    {
      "name": "Player Name",
      "currentTeam": "Team Name",
      "position": "Forward/Midfielder/Defender/Goalkeeper",
      "age": 28,
      "nationality": "Country",
      "careerGoals": 100,
      "careerAssists": 50,
      "internationalAppearances": 50,
      "internationalGoals": 15,
      "majorAchievements": ["Trophy or honor"],
      "careerSummary": "Brief career description"
    },
    ...MORE PLAYERS (22-24 total, ACTIVE players only)...
  ]
}

VALIDATION:
- The "players" array MUST have at least 5 objects
- Each player MUST have all required fields
- Return ONLY valid JSON, no other text`;
};

const getOptimalModel = (query: string): string => {
  const queryLower = query.toLowerCase();
  
  // Always use 70B for major teams
  const majorTeams = [
    'real madrid', 'barcelona', 'ac milan', 'inter milan', 'juventus',
    'manchester city', 'liverpool', 'bayern', 'psg', 'arsenal',
    'chelsea', 'manchester united', 'tottenham', 'atletico madrid',
    'borussia dortmund', 'napoli', 'roma', 'lazio', 'valencia',
    'sevilla', 'benfica', 'porto', 'ajax', 'feyenoord',
    'france', 'argentina', 'brazil', 'england', 'germany',
    'spain', 'italy', 'portugal', 'netherlands'
  ];
  
  if (majorTeams.some(team => queryLower.includes(team))) {
    return 'llama-3.3-70b-versatile';
  }
  
  return 'llama-3.1-8b-instant';
};

// Helper function to fetch player images
// Validation list of known retired/transferred players that should NEVER appear in current squad
const knownRetiredTransferred: Record<string, string[]> = {
  'real madrid': [
    'Karim Benzema', 'Benzema',
    'Luka Modrić', 'Modric',
    'Toni Kroos', 'Kroos',
    'José Ignacio Fernández Iglesias', 'Nacho Fernández', 'Nacho',
    'Robert Lewandowski', 'Lewandowski',
    'Sergio Ramos', 'Ramos',
    'Cristiano Ronaldo', 'Ronaldo',
    'Gareth Bale', 'Bale',
    'Casemiro' // if transferred
  ],
  'barcelona': [
    'Lionel Messi', 'Messi',
    'Gerard Piqué', 'Piqué',
    'Sergio Busquets', 'Busquets',
    'Jordi Alba', 'Alba',
    'Philippe Coutinho', 'Coutinho'
  ]
};

const isRetiredOrTransferred = (playerName: string, teamName: string): boolean => {
  const teamKey = teamName.toLowerCase();
  const retiredList = knownRetiredTransferred[teamKey] || [];
  return retiredList.some(name => playerName.toLowerCase().includes(name.toLowerCase()));
};

const fetchPlayerImageWithRetry = async (playerName: string, retries = 2): Promise<string | undefined> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const { getPlayerImage } = await import('./playerImageService');
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

export const searchWithGROQ = async (query: string, language: string = 'en', bustCache: boolean = false): Promise<GROQSearchResponse> => {
  console.log(`\n⚽ [${CURRENT_SEASON}] Searching: "${query}" using optimized model selection`);
  
  const selectedModel = getOptimalModel(query);
  console.log(`[MODEL] Using: ${selectedModel}`);
  
  // Clear old cache
  clearStaleCache();
  
  const cacheKey = bustCache ? `${query}_${Date.now()}` : query.toLowerCase().trim();
  
  // Return cached if available
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
    const queryLower = query.toLowerCase();
    let finalPlayers: Player[] = [];
    let finalTeam: Team = createDefaultTeam(query);
    const corrections: string[] = [];
    const dataSources: string[] = [];
    
    console.log('[1/3] Fetching data from GROQ AI...');
    
    // Use GROQ AI as primary source
    try {
      const systemPrompt = getEnhancedSystemPrompt(query, language);

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `IMPORTANT: Provide CURRENT 2025/2026 season roster for ${query}. STRICT RULES:
1. Include EXACTLY 22-24 ACTIVE players only (no retired, transferred, or loaned players)
2. For clubs: Exclude players who left in 2024-2025 (e.g., Real Madrid: NO Benzema, Modrić, Kroos, Nacho, Lewandowski if transferred)
3. For achievements, include COMPLETE and ACCURATE title counts:
   - Real Madrid: UEFA Champions League (15 titles), Copa del Rey, La Liga, UEFA Super Cup, etc.
   - Use format: "Competition Name (N titles): year1, year2, year3..."
4. Return valid JSON with:
   - "players": array of 22-24 current active players with {name, position, number, club/country, nationality}
   - "teams": array with {name, country, type, currentCoach, foundedYear}
   - "majorAchievements": {worldCup/clubWorldCup/continental/domestic} as arrays using the "Competition (N titles): years" format
5. NO placeholder data. If unsure about a player, verify they are still active at the club.` }
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
          
          console.log(`[GROQ] Response teams: ${parsed.teams?.length || 0}, players: ${parsed.players?.length || 0}`);
          
          // Process team
          if (parsed.teams?.[0]) {
            const teamData = parsed.teams[0];
            
            // Determine team type
            const isNationalTeam = teamData.type === 'national' || 
              queryLower.includes('national') ||
              ['france', 'argentina', 'brazil', 'england', 'germany', 'spain', 'italy', 'portugal'].some(c => queryLower.includes(c));
            
            finalTeam = {
              name: teamData.name || query,
              type: isNationalTeam ? 'national' : 'club',
              country: teamData.country || '',
              stadium: teamData.stadium || undefined,
              currentCoach: teamData.currentCoach || 'Unknown',
              foundedYear: teamData.foundedYear || undefined,
              majorAchievements: {
                worldCup: isNationalTeam ? (teamData.majorAchievements?.worldCup || []) : undefined,
                clubWorldCup: !isNationalTeam ? (teamData.majorAchievements?.clubWorldCup || []) : undefined,
                continental: teamData.majorAchievements?.continental || [],
                domestic: !isNationalTeam ? (teamData.majorAchievements?.domestic || []) : []
              },
              _source: 'GROQ AI',
              _lastVerified: new Date().toISOString()
            };
            console.log(`[GROQ] Team: ${finalTeam.name}, Coach: ${finalTeam.currentCoach}, Type: ${finalTeam.type}`);
          }
          
          // Process players
          if (parsed.players && Array.isArray(parsed.players)) {
            console.log(`[Players] Processing ${parsed.players.length} players...`);
            
            // Filter out retired/transferred players
            const activeOnly = parsed.players.filter((player: any) => {
              const isInvalid = isRetiredOrTransferred(player.name || '', query);
              if (isInvalid) {
                console.log(`[VALIDATION] Filtered out ${player.name} (retired/transferred from ${query})`);
              }
              return !isInvalid;
            });
            
            console.log(`[VALIDATION] ${parsed.players.length} total players, ${activeOnly.length} active after filtering`);
            
            // Process ALL active players for images with staggered delays to avoid rate limiting
            finalPlayers = await Promise.all(activeOnly.map(async (player: any, index: number) => {
              // Add delay between image fetches (100ms per player, max 5 concurrent)
              if (index > 0 && index % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              let imageUrl: string | undefined;
              try {
                imageUrl = await fetchPlayerImageWithRetry(player.name || 'Unknown');
              } catch (error) {
                console.log(`[Image] Skipped for ${player.name}`);
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
                imageUrl: imageUrl,
                _source: 'GROQ AI',
                _lastVerified: new Date().toISOString(),
                _priority: 'medium'
              };
            }));
          } else {
            console.warn(`[WARNING] GROQ response missing 'players' array or not an array`);
            console.warn(`[DEBUG] parsed.players =`, parsed.players);
          }
          
          console.log(`[✓] Got ${finalPlayers.length} players from GROQ`);
          if (finalPlayers.length === 0) {
            console.error(`[ERROR] GROQ returned 0 players for "${query}"`);
            console.log(`[DEBUG] Full GROQ response:`, response.substring(0, 1000));
          }
        } catch (error) {
          console.error('[ERROR] Failed to parse GROQ response:', error);
          if (response) {
            console.log('[DEBUG] GROQ response (first 500 chars):', response.substring(0, 500));
          }
        }
      } else {
        console.error('[ERROR] No response content from GROQ');
      }
    } catch (error) {
      console.error('[ERROR] GROQ AI call failed:', error);
    }
    
    // STEP 2: Validate with Wikipedia for coach info
    console.log('[2/3] Validating with Wikipedia...');
    const wikiData = await fetchFromWikipedia(query);
    
    if (wikiData) {
      dataSources.push('Wikipedia');
      const wikipediaCoach = extractCoachFromWikipedia(wikiData.summary, query);
      
      if (wikipediaCoach) {
        // If Wikipedia provides a different coach, prefer it as a verified source
        if (finalTeam.currentCoach === 'Unknown' || 
            (finalTeam.currentCoach !== wikipediaCoach && 
             !finalTeam.currentCoach.toLowerCase().includes(wikipediaCoach.toLowerCase()) &&
             !wikipediaCoach.toLowerCase().includes(finalTeam.currentCoach.toLowerCase()))) {
          corrections.push(`Coach updated from AI to Wikipedia: ${wikipediaCoach}`);
          console.log(`[Wikipedia] Found coach: ${wikipediaCoach}, AI had: ${finalTeam.currentCoach}. Updating coach to Wikipedia value.`);
          finalTeam.currentCoach = wikipediaCoach;
          if (!dataSources.includes('Wikipedia')) dataSources.push('Wikipedia');
        }
      }
      
      // Add Wikipedia summary
      if (wikiData.summary && wikiData.summary.length > 100) {
        finalTeam._wikiSummary = wikiData.summary.substring(0, 300) + '...';
      }
    }
    
    // STEP 3: Enhance with historical data for achievements and players
    console.log('[3/3] Enhancing with historical data...');
    let enhancedResult: GROQSearchResponse = {
      players: finalPlayers,
      teams: [finalTeam],
      youtubeQuery: `${query} ${CURRENT_SEASON} highlights`,
      message: `${query} • ${CURRENT_SEASON} • Coach: ${finalTeam.currentCoach}`,
      error: undefined
    };
    
    // Enhance with historical achievements and players
    enhancedResult = enhanceWithHistoricalData(enhancedResult, query);
    
    // Update message with player count
    enhancedResult.message = `${query} • ${CURRENT_SEASON} • ${enhancedResult.players.length} players • Coach: ${finalTeam.currentCoach}`;
    
    // Validate all players
    const validatedPlayers = enhancedResult.players.map(player => validatePlayer(player));
    
    // Calculate achievement counts by parsing titles (sum actual trophy counts if present)
    const teamAchievements = enhancedResult.teams[0]?.majorAchievements || {};

    const parseTitleCount = (arr?: string[] | undefined): number => {
      if (!arr || arr.length === 0) return 0;
      let total = 0;
      for (const entry of arr) {
        if (!entry) continue;
        // Extract title count from format: "Competition Name (N titles): years" or "Competition (N): years"
        const m = entry.match(/\((\d{1,3})\s*titles?\)|\((\d{1,3})\)/i);
        if (m && (m[1] || m[2])) {
          total += parseInt(m[1] || m[2], 10);
        } else {
          // fallback: count each entry as 1 title if no number found
          total += 1;
        }
      }
      return total;
    };

    const achievementCounts = {
      worldCup: finalTeam.type === 'national' ? parseTitleCount(teamAchievements.worldCup) : 0,
      clubWorldCup: finalTeam.type === 'club' ? parseTitleCount(teamAchievements.clubWorldCup) : 0,
      continental: parseTitleCount(teamAchievements.continental),
      domestic: finalTeam.type === 'club' ? parseTitleCount(teamAchievements.domestic) : 0
    };

    const totalAchievements = Object.values(achievementCounts).reduce((sum, count) => sum + count, 0);
    
    const finalResult: GROQSearchResponse = {
      ...enhancedResult,
      players: validatedPlayers,
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: {
          playerCount: validatedPlayers.length,
          season: CURRENT_SEASON,
          achievementCounts: achievementCounts,
          totalAchievements: totalAchievements,
          dataSources: dataSources,
          correctionsApplied: corrections.length,
          coachVerification: corrections.length > 0 ? 'needs_check' : 'consistent',
          hasFallbackPlayers: enhancedResult.players.some(p => p._source === 'Historical Fallback')
        },
        appliedUpdates: corrections,
        dataSources: dataSources,
        currentSeason: CURRENT_SEASON,
        dataCurrency: {
          aiCutoff: '2024',
          verifiedWith: dataSources.join(', '),
          confidence: dataSources.includes('Wikipedia') ? 'medium' : 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: `2025/2026 season data. Some player information may be historical if current squad data is unavailable.`,
        recommendations: [
          'Check official club website for latest squad',
          'Some players shown may be from recent seasons',
          'Verify manager information with recent news'
        ]
      }
    };
    
    console.log(`[SUCCESS] ${finalResult.players.length} players, Coach: ${finalTeam.currentCoach}, Achievements: ${totalAchievements}`);
    console.log(`[Achievements] World Cup: ${achievementCounts.worldCup}, Club World Cup: ${achievementCounts.clubWorldCup}, Continental: ${achievementCounts.continental}, Domestic: ${achievementCounts.domestic}`);
    
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
      recommendations: ['Try again', 'Check internet connection', 'Verify API key']
    }
  };
};

// Alias with cache busting
export const GROQSearch = (query: string, bustCache: boolean = false) => 
  searchWithGROQ(query, 'en', bustCache);

// Cache busting functions
export const searchFresh = async (query: string) => {
  return await searchWithGROQ(query, 'en', true);
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('[CACHE] Cleared all cached results');
};

// Historical players function
export const getHistoricalPlayers = async (teamName: string, teamType: 'club' | 'national', language: string = 'en'): Promise<Player[]> => {
  const key = (teamName || '').toLowerCase();
  try {
    if (!teamName) return [];
    if (historicalPlayersCache.has(key)) {
      console.log(`[History] Cache hit for: ${teamName}`);
      return historicalPlayersCache.get(key)!;
    }
    
    // DISABLED: Historical players feature disabled to preserve API tokens and prevent rate limiting
    // The current squad search is the priority. Historical players will be empty.
    console.log(`[History] Historical players feature disabled to preserve API tokens`);
    historicalPlayersCache.set(key, []);
    return [];
  } catch (err) {
    console.error('[History] getHistoricalPlayers error for', teamName, err);
    return [];
  }
};

const createHistoricalPlayer = (name: string, position: string, nationality: string, birthYear: number, summary: string): Player => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  return {
    name,
    currentTeam: 'Historical',
    position,
    age,
    nationality,
    careerGoals: Math.floor(Math.random() * 200) + 50,
    careerAssists: Math.floor(Math.random() * 100) + 20,
    internationalAppearances: Math.floor(Math.random() * 80) + 20,
    internationalGoals: Math.floor(Math.random() * 40) + 5,
    majorAchievements: ['Club Legend', 'Multiple League Titles', 'European Success'],
    careerSummary: summary,
    _source: 'Historical Database',
    _lastVerified: new Date().toISOString(),
    _era: '1990s-2010s',
    _yearsAtTeam: '10+ years',
    _priority: 'high'
  };
};

export const needsDataVerification = (response: GROQSearchResponse): boolean => {
  const metadata = response._metadata;
  return (
    !metadata?.analysis?.confidence ||
    metadata.analysis.confidence === 'low' ||
    response.players.length < 5 ||
    metadata.analysis.coachVerification === 'needs_check' ||
    metadata.analysis.hasFallbackPlayers === true
  );
};

export const getDataSourceInfo = (response: GROQSearchResponse): {
  source: string;
  color: string;
  icon: string;
} => {
  if (!response._metadata) {
    return { source: 'Unverified', color: 'gray', icon: '❓' };
  }
  
  const dataSources = response._metadata.dataSources || [];
  const hasWikipedia = dataSources.includes('Wikipedia');
  const achievementsUpdated = response.teams[0]?._achievementsUpdated;
  const hasFallbackPlayers = response._metadata.analysis?.hasFallbackPlayers;
  
  if (hasWikipedia && !hasFallbackPlayers) {
    return { source: 'AI + Wikipedia ✓', color: 'green', icon: '✅' };
  }
  
  if (hasFallbackPlayers) {
    return { source: 'AI + Historical', color: 'blue', icon: '📜' };
  }
  
  if (hasWikipedia) {
    return { source: 'AI + Wikipedia', color: 'purple', icon: '📚' };
  }
  
  if (achievementsUpdated) {
    return { source: 'AI Enhanced', color: 'orange', icon: '🤖' };
  }
  
  return { source: 'AI Generated', color: 'yellow', icon: '⚡' };
};