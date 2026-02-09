// services/groqService.ts - COMPLETE FIXED VERSION
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

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
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: any;
}

// Cache
const cache = new Map<string, { data: GROQSearchResponse; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Current 2025/2026 season database
const CURRENT_SEASON = '2025/2026';

// Team database
const TEAM_DATABASE: Record<string, Team> = {
  // National Teams
  'argentina': {
    name: 'Argentina',
    type: 'national',
    country: 'Argentina',
    stadium: 'Estadio Monumental',
    currentCoach: 'Lionel Scaloni',
    foundedYear: 1893,
    majorAchievements: {
      worldCup: ['1978', '1986', '2022'],
      international: ['15x Copa América (latest: 2021)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'brazil': {
    name: 'Brazil',
    type: 'national',
    country: 'Brazil',
    stadium: 'Estádio do Maracanã',
    currentCoach: 'Dorival Júnior',
    foundedYear: 1914,
    majorAchievements: {
      worldCup: ['1958', '1962', '1970', '1994', '2002'],
      international: ['9x Copa América (latest: 2019)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'france': {
    name: 'France',
    type: 'national',
    country: 'France',
    stadium: 'Stade de France',
    currentCoach: 'Didier Deschamps',
    foundedYear: 1904,
    majorAchievements: {
      worldCup: ['1998', '2018'],
      international: ['2x UEFA European Championship (1984, 2000)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'spain': {
    name: 'Spain',
    type: 'national',
    country: 'Spain',
    stadium: 'Estadio Metropolitano',
    currentCoach: 'Luis de la Fuente',
    foundedYear: 1909,
    majorAchievements: {
      worldCup: ['2010'],
      international: ['3x UEFA European Championship (1964, 2008, 2012)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'england': {
    name: 'England',
    type: 'national',
    country: 'England',
    stadium: 'Wembley Stadium',
    currentCoach: 'Gareth Southgate',
    foundedYear: 1863,
    majorAchievements: {
      worldCup: ['1966'],
      international: [],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'portugal': {
    name: 'Portugal',
    type: 'national',
    country: 'Portugal',
    stadium: 'Estádio da Luz',
    currentCoach: 'Roberto Martínez',
    foundedYear: 1914,
    majorAchievements: {
      worldCup: [],
      international: ['1x UEFA European Championship (2016)', '1x UEFA Nations League (2019)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'germany': {
    name: 'Germany',
    type: 'national',
    country: 'Germany',
    stadium: 'Allianz Arena',
    currentCoach: 'Julian Nagelsmann',
    foundedYear: 1900,
    majorAchievements: {
      worldCup: ['1954', '1974', '1990', '2014'],
      international: ['3x UEFA European Championship (1972, 1980, 1996)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'italy': {
    name: 'Italy',
    type: 'national',
    country: 'Italy',
    stadium: 'Stadio Olimpico',
    currentCoach: 'Luciano Spalletti',
    foundedYear: 1898,
    majorAchievements: {
      worldCup: ['1934', '1938', '1982', '2006'],
      international: ['2x UEFA European Championship (1968, 2020)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'netherlands': {
    name: 'Netherlands',
    type: 'national',
    country: 'Netherlands',
    stadium: 'Johan Cruyff Arena',
    currentCoach: 'Ronald Koeman',
    foundedYear: 1889,
    majorAchievements: {
      worldCup: [],
      international: ['1x UEFA European Championship (1988)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'uruguay': {
    name: 'Uruguay',
    type: 'national',
    country: 'Uruguay',
    stadium: 'Estadio Centenario',
    currentCoach: 'Marcelo Bielsa',
    foundedYear: 1900,
    majorAchievements: {
      worldCup: ['1930', '1950'],
      international: ['15x Copa América (latest: 2011)'],
      continental: [],
      domestic: []
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  
  // Major Clubs
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
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'barcelona': {
    name: 'Barcelona',
    type: 'club',
    country: 'Spain',
    stadium: 'Spotify Camp Nou',
    currentCoach: 'Xavi',
    foundedYear: 1899,
    majorAchievements: {
      worldCup: [],
      international: ['3x FIFA Club World Cup'],
      continental: ['5x UEFA Champions League'],
      domestic: ['27x La Liga', '31x Copa del Rey']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
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
      domestic: ['9x Premier League', '7x FA Cup']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'manchester united': {
    name: 'Manchester United',
    type: 'club',
    country: 'England',
    stadium: 'Old Trafford',
    currentCoach: 'Erik ten Hag',
    foundedYear: 1878,
    majorAchievements: {
      worldCup: [],
      international: ['1x FIFA Club World Cup'],
      continental: ['3x UEFA Champions League'],
      domestic: ['20x Premier League', '12x FA Cup']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'liverpool': {
    name: 'Liverpool',
    type: 'club',
    country: 'England',
    stadium: 'Anfield',
    currentCoach: 'Arne Slot',
    foundedYear: 1892,
    majorAchievements: {
      worldCup: [],
      international: ['1x FIFA Club World Cup'],
      continental: ['6x UEFA Champions League'],
      domestic: ['19x Premier League', '8x FA Cup']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'bayern munich': {
    name: 'Bayern Munich',
    type: 'club',
    country: 'Germany',
    stadium: 'Allianz Arena',
    currentCoach: 'Vincent Kompany',
    foundedYear: 1900,
    majorAchievements: {
      worldCup: [],
      international: ['2x FIFA Club World Cup'],
      continental: ['6x UEFA Champions League'],
      domestic: ['33x Bundesliga', '20x DFB-Pokal']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'paris saint-germain': {
    name: 'Paris Saint-Germain',
    type: 'club',
    country: 'France',
    stadium: 'Parc des Princes',
    currentCoach: 'Luis Enrique',
    foundedYear: 1970,
    majorAchievements: {
      worldCup: [],
      international: [],
      continental: [],
      domestic: ['11x Ligue 1', '14x Coupe de France']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  },
  'juventus': {
    name: 'Juventus',
    type: 'club',
    country: 'Italy',
    stadium: 'Allianz Stadium',
    currentCoach: 'Thiago Motta',
    foundedYear: 1897,
    majorAchievements: {
      worldCup: [],
      international: ['2x FIFA Club World Cup'],
      continental: ['2x UEFA Champions League'],
      domestic: ['36x Serie A', '14x Coppa Italia']
    },
    _source: 'Database',
    _lastVerified: '2025-01-01'
  }
};

// Player database
const PLAYER_DATABASE: Record<string, Player> = {
  'vinicius junior': {
    name: 'Vinícius Júnior',
    currentTeam: 'Real Madrid',
    position: 'Left Winger',
    age: 24,
    nationality: 'Brazilian',
    majorAchievements: [
      '2x UEFA Champions League winner (2022, 2024)',
      '3x La Liga winner (2020, 2022, 2024)',
      '2022 FIFA Club World Cup winner'
    ],
    careerSummary: 'Vinícius Júnior is a Brazilian professional footballer who plays as a left winger for Real Madrid. One of the best players in the world, known for his pace, dribbling, and goal-scoring.',
    _source: 'Database'
  },
  'rodrygo goes': {
    name: 'Rodrygo Goes',
    currentTeam: 'Real Madrid',
    position: 'Right Winger',
    age: 23,
    nationality: 'Brazilian',
    majorAchievements: [
      '2x UEFA Champions League winner (2022, 2024)',
      '3x La Liga winner (2020, 2022, 2024)',
      '2022 FIFA Club World Cup winner'
    ],
    careerSummary: 'Rodrygo Goes is a Brazilian professional footballer who plays as a right winger for Real Madrid. Known for his technical skills and important goals in big matches.',
    _source: 'Database'
  },
  'lamine yamal': {
    name: 'Lamine Yamal',
    currentTeam: 'Barcelona',
    position: 'Right Winger',
    age: 17,
    nationality: 'Spanish',
    majorAchievements: [
      '2022-23 La Liga winner',
      'Youngest player to score for Spain national team',
      'Barcelona\'s youngest ever La Liga goalscorer'
    ],
    careerSummary: 'Lamine Yamal is a Spanish professional footballer who plays as a right winger for Barcelona. One of the most promising young talents in world football.',
    _source: 'Database'
  },
  'lionel messi': {
    name: 'Lionel Messi',
    currentTeam: 'Inter Miami',
    position: 'Forward',
    age: 37,
    nationality: 'Argentine',
    majorAchievements: [
      '8x Ballon d\'Or winner',
      '2022 FIFA World Cup winner',
      '4x UEFA Champions League winner',
      '10x La Liga winner'
    ],
    careerSummary: 'Lionel Messi is an Argentine professional footballer who plays for Inter Miami. Considered one of the greatest players of all time.',
    _source: 'Database'
  },
  'cristiano ronaldo': {
    name: 'Cristiano Ronaldo',
    currentTeam: 'Al Nassr',
    position: 'Forward',
    age: 39,
    nationality: 'Portuguese',
    majorAchievements: [
      '5x Ballon d\'Or winner',
      '5x UEFA Champions League winner',
      '2016 UEFA European Championship winner'
    ],
    careerSummary: 'Cristiano Ronaldo is a Portuguese professional footballer who plays for Al Nassr. One of the greatest players of all time.',
    _source: 'Database'
  },
  'kylian mbappé': {
    name: 'Kylian Mbappé',
    currentTeam: 'Real Madrid',
    position: 'Forward',
    age: 25,
    nationality: 'French',
    majorAchievements: [
      '2018 FIFA World Cup winner',
      '2022 FIFA World Cup runner-up',
      '5x Ligue 1 winner'
    ],
    careerSummary: 'Kylian Mbappé is a French professional footballer who plays as a forward for Real Madrid. One of the best players in the world.',
    _source: 'Database'
  },
  'erling haaland': {
    name: 'Erling Haaland',
    currentTeam: 'Manchester City',
    position: 'Striker',
    age: 24,
    nationality: 'Norwegian',
    majorAchievements: [
      '2023 UEFA Champions League winner',
      '2023 Premier League winner',
      '2023 FIFA Club World Cup winner'
    ],
    careerSummary: 'Erling Haaland is a Norwegian professional footballer who plays as a striker for Manchester City. One of the most prolific goalscorers in the world.',
    _source: 'Database'
  },
  'jude bellingham': {
    name: 'Jude Bellingham',
    currentTeam: 'Real Madrid',
    position: 'Midfielder',
    age: 21,
    nationality: 'English',
    majorAchievements: [
      '2024 UEFA Champions League winner',
      '2024 La Liga winner',
      '2023 Golden Boy award winner'
    ],
    careerSummary: 'Jude Bellingham is an English professional footballer who plays as a midfielder for Real Madrid. One of the best midfielders in the world.',
    _source: 'Database'
  },
  'karim benzema': {
    name: 'Karim Benzema',
    currentTeam: 'Al-Ittihad',
    position: 'Striker',
    age: 36,
    nationality: 'French',
    majorAchievements: [
      '5x UEFA Champions League winner',
      '4x La Liga winner',
      '2022 Ballon d\'Or winner'
    ],
    careerSummary: 'Karim Benzema is a French professional footballer who plays as a striker for Al-Ittihad. Former Real Madrid legend.',
    _source: 'Database'
  },
  'harry kane': {
    name: 'Harry Kane',
    currentTeam: 'Bayern Munich',
    position: 'Striker',
    age: 31,
    nationality: 'English',
    majorAchievements: [
      '3x Premier League Golden Boot',
      'England\'s all-time top scorer',
      '2023-24 Bundesliga top scorer'
    ],
    careerSummary: 'Harry Kane is an English professional footballer who plays as a striker for Bayern Munich. One of the best strikers in the world.',
    _source: 'Database'
  },
  'kevin de bruyne': {
    name: 'Kevin De Bruyne',
    currentTeam: 'Manchester City',
    position: 'Midfielder',
    age: 33,
    nationality: 'Belgian',
    majorAchievements: [
      '2023 UEFA Champions League winner',
      '6x Premier League winner',
      '2x PFA Players\' Player of the Year'
    ],
    careerSummary: 'Kevin De Bruyne is a Belgian professional footballer who plays as a midfielder for Manchester City. One of the best midfielders in the world.',
    _source: 'Database'
  },
  'dani carvajal': {
    name: 'Dani Carvajal',
    currentTeam: 'Real Madrid',
    position: 'Right-back',
    age: 32,
    nationality: 'Spanish',
    majorAchievements: [
      '5x UEFA Champions League winner',
      '4x La Liga winner',
      '2x Copa del Rey winner'
    ],
    careerSummary: 'Dani Carvajal is a Spanish professional footballer who plays as a right-back for Real Madrid. Key player for Real Madrid\'s success.',
    _source: 'Database'
  },
  'federico valverde': {
    name: 'Federico Valverde',
    currentTeam: 'Real Madrid',
    position: 'Midfielder',
    age: 26,
    nationality: 'Uruguayan',
    majorAchievements: [
      '2x UEFA Champions League winner',
      '3x La Liga winner',
      '2022 FIFA Club World Cup winner'
    ],
    careerSummary: 'Federico Valverde is a Uruguayan professional footballer who plays as a midfielder for Real Madrid. Known for his versatility and work rate.',
    _source: 'Database'
  },
  'eduardo camavinga': {
    name: 'Eduardo Camavinga',
    currentTeam: 'Real Madrid',
    position: 'Midfielder',
    age: 21,
    nationality: 'French',
    majorAchievements: [
      '2x UEFA Champions League winner',
      '2x La Liga winner',
      '2022 FIFA Club World Cup winner'
    ],
    careerSummary: 'Eduardo Camavinga is a French professional footballer who plays as a midfielder for Real Madrid. Known for his technical ability and versatility.',
    _source: 'Database'
  }
};

// Name variations mapping
const NAME_VARIATIONS: Record<string, string[]> = {
  'vinicius': ['vinicius junior'],
  'vini': ['vinicius junior'],
  'vinícius': ['vinicius junior'],
  'rodrygo': ['rodrygo goes'],
  'lamine': ['lamine yamal'],
  'yamal': ['lamine yamala'],
  'benzema': ['karim benzema'],
  'bellingham': ['jude bellingham'],
  'jude': ['jude bellingham'],
  'haaland': ['erling haaland'],
  'erling': ['erling haaland'],
  'mbappé': ['kylian mbappé'],
  'mbappe': ['kylian mbappé'],
  'kylian': ['kylian mbappé'],
  'messi': ['lionel messi'],
  'lionel': ['lionel messi'],
  'ronaldo': ['cristiano ronaldo'],
  'cristiano': ['cristiano ronaldo'],
  'cr7': ['cristiano ronaldo'],
  'kane': ['harry kane'],
  'harry': ['harry kane'],
  'de bruyne': ['kevin de bruyne'],
  'kevin': ['kevin de bruyne'],
  'kdb': ['kevin de bruyne'],
  'carvajal': ['dani carvajal'],
  'dani': ['dani carvajal'],
  'valverde': ['federico valverde'],
  'fede': ['federico valverde'],
  'camavinga': ['eduardo camavinga'],
  'tchouaméni': ['aurélien tchouaméni'],
  'tchouameni': ['aurélien tchouaméni'],
  'nacho': ['nacho fernández'],
  'militão': ['éder militão'],
  'rudiger': ['antonio rüdiger'],
  'alaba': ['david alaba'],
  'courtois': ['thibaut courtois'],
  'lunin': ['andriy lunin'],
  'guler': ['arda güler']
};

// Helper function to get team players
const getTeamPlayers = async (teamName: string): Promise<Player[]> => {
  try {
    const systemPrompt = `You are a football expert. Provide the current ${CURRENT_SEASON} season squad for team: "${teamName}".

Return 10-15 key players from the current squad including:
- Starting lineup players
- Key substitutes
- Important young talents

Return ONLY valid JSON with this structure:
{
  "players": [{
    "name": "Full Name",
    "currentTeam": "${teamName}",
    "position": "Position",
    "age": 25,
    "nationality": "Nationality",
    "careerSummary": "Brief summary as player for ${teamName}...",
    "majorAchievements": ["Key achievement with ${teamName} or previous clubs"]
  }]
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Provide current squad players for ${teamName}` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) return [];
    
    const result = JSON.parse(response);
    
    if (!result.players || !Array.isArray(result.players)) {
      return [];
    }
    
    return result.players.map((player: Player) => ({
      ...player,
      _source: 'AI Squad Data'
    }));
    
  } catch (error) {
    console.error(`[TEAM-PLAYERS] Error getting players for ${teamName}:`, error);
    return [];
  }
};

// Fallback historical players for known teams
const getFallbackHistoricalPlayers = (teamName: string, teamType: 'club' | 'national'): Player[] => {
  const teamLower = teamName.toLowerCase();
  
  const fallbackPlayers: Record<string, Player[]> = {
    'argentina': [
      {
        name: 'Diego Maradona',
        currentTeam: 'Retired',
        position: 'Attacking Midfielder',
        age: 60,
        nationality: 'Argentine',
        majorAchievements: ['1986 World Cup Winner', 'Ballon d\'Or 1990'],
        careerSummary: 'One of the greatest footballers of all time, led Argentina to 1986 World Cup victory.',
        _era: '1980s',
        _source: 'System Fallback'
      },
      {
        name: 'Lionel Messi',
        currentTeam: 'Inter Miami',
        position: 'Forward',
        age: 37,
        nationality: 'Argentine',
        majorAchievements: ['2022 World Cup Winner', '8x Ballon d\'Or', '4x Champions League'],
        careerSummary: 'Considered one of the greatest players of all time, Argentina\'s all-time top scorer.',
        _era: '2000s-2020s',
        _source: 'System Fallback'
      },
      {
        name: 'Alfredo Di Stéfano',
        currentTeam: 'Retired',
        position: 'Forward',
        age: 88,
        nationality: 'Argentine',
        majorAchievements: ['5x European Cup', '2x Ballon d\'Or'],
        careerSummary: 'Legendary forward, one of the best players in Real Madrid history.',
        _era: '1950s',
        _source: 'System Fallback'
      }
    ],
    'brazil': [
      {
        name: 'Pelé',
        currentTeam: 'Retired',
        position: 'Forward',
        age: 82,
        nationality: 'Brazilian',
        majorAchievements: ['3x World Cup Winner', 'FIFA Player of the Century'],
        careerSummary: 'The only player to win three World Cups, considered one of the greatest ever.',
        _era: '1950s-1970s',
        _source: 'System Fallback'
      },
      {
        name: 'Ronaldo Nazário',
        currentTeam: 'Retired',
        position: 'Striker',
        age: 47,
        nationality: 'Brazilian',
        majorAchievements: ['2x World Cup Winner', '3x FIFA World Player of the Year'],
        careerSummary: 'One of the greatest strikers of all time, known for his incredible skill and goals.',
        _era: '1990s-2000s',
        _source: 'System Fallback'
      },
      {
        name: 'Ronaldinho',
        currentTeam: 'Retired',
        position: 'Attacking Midfielder',
        age: 44,
        nationality: 'Brazilian',
        majorAchievements: ['2002 World Cup Winner', 'Ballon d\'Or 2005'],
        careerSummary: 'Known for his incredible skill, creativity, and smile, one of the most entertaining players ever.',
        _era: '2000s',
        _source: 'System Fallback'
      }
    ],
    'real madrid': [
      {
        name: 'Cristiano Ronaldo',
        currentTeam: 'Al Nassr',
        position: 'Forward',
        age: 39,
        nationality: 'Portuguese',
        majorAchievements: ['4x Champions League with Real Madrid', '4x Ballon d\'Or'],
        careerSummary: 'Real Madrid\'s all-time top scorer, won 4 Champions League titles with the club.',
        _era: '2009-2018',
        _source: 'System Fallback'
      },
      {
        name: 'Alfredo Di Stéfano',
        currentTeam: 'Retired',
        position: 'Forward',
        age: 88,
        nationality: 'Argentine',
        majorAchievements: ['5x European Cup', '2x Ballon d\'Or'],
        careerSummary: 'Legendary forward, led Real Madrid to 5 consecutive European Cups.',
        _era: '1950s',
        _source: 'System Fallback'
      },
      {
        name: 'Zinedine Zidane',
        currentTeam: 'Retired',
        position: 'Midfielder',
        age: 51,
        nationality: 'French',
        majorAchievements: ['2002 Champions League winner', 'Ballon d\'Or 1998'],
        careerSummary: 'One of the greatest midfielders, scored legendary goal in 2002 Champions League final.',
        _era: '2001-2006',
        _source: 'System Fallback'
      }
    ],
    'barcelona': [
      {
        name: 'Lionel Messi',
        currentTeam: 'Inter Miami',
        position: 'Forward',
        age: 37,
        nationality: 'Argentine',
        majorAchievements: ['4x Champions League with Barcelona', '10x La Liga', '6x Ballon d\'Or at Barcelona'],
        careerSummary: 'Barcelona\'s all-time top scorer and greatest player, spent most of his career at the club.',
        _era: '2004-2021',
        _source: 'System Fallback'
      },
      {
        name: 'Johan Cruyff',
        currentTeam: 'Retired',
        position: 'Forward',
        age: 76,
        nationality: 'Dutch',
        majorAchievements: ['3x Ballon d\'Or', 'La Liga winner with Barcelona'],
        careerSummary: 'Revolutionized football with "Total Football", key figure in Barcelona history.',
        _era: '1973-1978',
        _source: 'System Fallback'
      },
      {
        name: 'Xavi Hernández',
        currentTeam: 'Retired',
        position: 'Midfielder',
        age: 44,
        nationality: 'Spanish',
        majorAchievements: ['4x Champions League', '8x La Liga', '2010 World Cup winner'],
        careerSummary: 'One of the greatest midfielders, epitome of Barcelona\'s tiki-taka style.',
        _era: '1998-2015',
        _source: 'System Fallback'
      }
    ]
  };

  return fallbackPlayers[teamLower] || [];
};

// Helper functions
const createFallbackPlayer = (name: string): Player => ({
  name,
  currentTeam: 'Unknown',
  position: 'Player',
  nationality: 'Unknown',
  majorAchievements: [],
  careerSummary: `Information about ${name} is currently unavailable.`,
  _source: 'System'
});

const createFallbackTeam = (name: string): Team => {
  const isNational = [
    'argentina', 'brazil', 'uruguay', 'france', 'england', 'germany', 'spain', 
    'italy', 'portugal', 'netherlands', 'japan', 'morocco', 'mexico', 'usa'
  ].some(country => name.toLowerCase().includes(country));
  
  return {
    name,
    type: isNational ? 'national' : 'club',
    country: isNational ? name : '',
    currentCoach: 'Unknown',
    majorAchievements: {
      worldCup: [],
      international: [],
      continental: [],
      domestic: []
    },
    _source: 'System'
  };
};

// TEAM SEARCH - UPDATED VERSION
const searchTeam = async (query: string): Promise<GROQSearchResponse> => {
  const queryLower = query.toLowerCase().trim();
  
  // 1. Check database
  for (const [teamKey, teamData] of Object.entries(TEAM_DATABASE)) {
    if (queryLower.includes(teamKey) || teamKey.includes(queryLower)) {
      console.log(`[TEAM] Found in database: ${teamData.name}`);
      
      // Try to get players for this team
      const teamPlayers = await getTeamPlayers(teamData.name);
      
      return {
        players: teamPlayers,
        teams: [teamData],
        youtubeQuery: `${teamData.name} highlights ${CURRENT_SEASON.split('/')[0]}`,
        _metadata: {
          source: 'Database',
          confidence: 95,
          hasSquad: teamPlayers.length > 0
        }
      };
    }
  }
  
  // 2. Use AI for team info
  console.log(`[TEAM] Using AI: ${query}`);
  
  const systemPrompt = `You are a football expert. Provide current ${CURRENT_SEASON} season information for team: "${query}".

IMPORTANT: Return team information including current squad players.

Return ONLY valid JSON with this structure:
{
  "teams": [{
    "name": "Team Name",
    "type": "club" or "national",
    "country": "Country",
    "stadium": "Stadium",
    "currentCoach": "Current Coach",
    "foundedYear": 1900,
    "majorAchievements": {
      "worldCup": [],
      "international": [],
      "continental": [],
      "domestic": []
    }
  }],
  "players": [{
    "name": "Player Name",
    "currentTeam": "Current Team",
    "position": "Position",
    "age": 25,
    "nationality": "Nationality",
    "majorAchievements": ["Achievement 1"],
    "careerSummary": "Brief summary..."
  }]
}`;
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Provide team information and current squad for: ${query}` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) throw new Error('No AI response');
    
    const result = JSON.parse(response);
    
    // Ensure proper structure
    if (!result.teams || !Array.isArray(result.teams)) {
      result.teams = [];
    }
    if (!result.players || !Array.isArray(result.players)) {
      result.players = [];
    }
    
    // Clean up team achievements
    result.teams = result.teams.map((team: Team) => ({
      ...team,
      majorAchievements: team.majorAchievements || {
        worldCup: [],
        international: [],
        continental: [],
        domestic: []
      },
      _source: 'AI Generated'
    }));
    
    // Add source to players
    result.players = result.players.map((player: Player) => ({
      ...player,
      _source: 'AI Generated (Team Squad)'
    }));
    
    return {
      players: result.players,
      teams: result.teams,
      youtubeQuery: `${query} team highlights ${CURRENT_SEASON.split('/')[0]}`,
      _metadata: {
        source: 'AI',
        confidence: 75,
        hasSquad: result.players.length > 0
      }
    };
    
  } catch (error) {
    console.error('[TEAM-AI] Error:', error);
    // Return team info only if we can't get squad
    return {
      players: [],
      teams: [createFallbackTeam(query)],
      youtubeQuery: `${query} highlights ${CURRENT_SEASON.split('/')[0]}`,
      _metadata: {
        source: 'AI (Team Only)',
        confidence: 70,
        hasSquad: false,
        error: 'Could not fetch squad data'
      }
    };
  }
};

// PLAYER SEARCH
const searchPlayer = async (query: string): Promise<GROQSearchResponse> => {
  const queryLower = query.toLowerCase().trim();
  
  // 1. Check name variations
  let playerKey = '';
  for (const [variation, names] of Object.entries(NAME_VARIATIONS)) {
    if (queryLower.includes(variation) || variation.includes(queryLower)) {
      playerKey = names[0];
      break;
    }
  }
  
  // 2. Check player database
  if (!playerKey) {
    for (const key of Object.keys(PLAYER_DATABASE)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        playerKey = key;
        break;
      }
    }
  }
  
  // 3. If found in database
  if (playerKey && PLAYER_DATABASE[playerKey]) {
    const playerData = PLAYER_DATABASE[playerKey];
    console.log(`[PLAYER] Found in database: ${playerData.name}`);
    return {
      players: [playerData],
      teams: [],
      youtubeQuery: `${playerData.name} highlights ${CURRENT_SEASON.split('/')[0]}`,
      _metadata: {
        source: 'Database',
        confidence: 95
      }
    };
  }
  
  // 4. Use AI
  console.log(`[PLAYER] Using AI: ${query}`);
  
  const systemPrompt = `You are a football expert. Provide current ${CURRENT_SEASON} season information for football player: "${query}".

IMPORTANT: Return ONLY player information, NOT team information.

Include:
- Full name
- Current team (2025 season)
- Position
- Age (for 2025 season)
- Nationality
- Major achievements (updated through 2024/2025)
- Career summary mentioning 2025 status

Return ONLY valid JSON with this structure:
{
  "players": [{
    "name": "Full Name",
    "currentTeam": "Current Team",
    "position": "Position",
    "age": 25,
    "nationality": "Nationality",
    "majorAchievements": ["Achievement 1", "Achievement 2"],
    "careerSummary": "Brief summary..."
  }]
}`;
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Provide player information for: ${query}` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) throw new Error('No AI response');
    
    const result = JSON.parse(response);
    
    // Ensure proper structure
    if (!result.players || !Array.isArray(result.players)) {
      result.players = [];
    }
    
    // Add source info
    result.players = result.players.map((player: Player) => ({
      ...player,
      _source: 'AI Generated'
    }));
    
    return {
      players: result.players,
      teams: [],
      youtubeQuery: `${query} highlights ${CURRENT_SEASON.split('/')[0]}`,
      _metadata: {
        source: 'AI',
        confidence: 75
      }
    };
    
  } catch (error) {
    console.error('[PLAYER-AI] Error:', error);
    throw error;
  }
};

// MAIN FUNCTION
export const searchWithGROQ = async (
  query: string, 
  language: string = 'en', 
  bustCache: boolean = false, 
  isTeamSearch: boolean = false
): Promise<GROQSearchResponse> => {
  console.log(`🔍 [${CURRENT_SEASON}] Searching: "${query}" as ${isTeamSearch ? 'TEAM' : 'PLAYER'}`);
  
  // Check cache
  const cacheKey = `${query}_${isTeamSearch}_${language}`;
  if (!bustCache && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE] Using cached result`);
      return cached.data;
    }
  }
  
  try {
    let result: GROQSearchResponse;
    
    if (isTeamSearch) {
      result = await searchTeam(query);
    } else {
      result = await searchPlayer(query);
    }
    
    // Add metadata
    result._metadata = {
      timestamp: new Date().toISOString(),
      searchType: isTeamSearch ? 'team' : 'player',
      source: result._metadata?.source || 'AI Generated',
      confidence: result._metadata?.confidence || 80,
      season: CURRENT_SEASON,
      hasSquad: result._metadata?.hasSquad || false
    };
    
    // Add YouTube query
    if (!result.youtubeQuery) {
      result.youtubeQuery = `${query} ${isTeamSearch ? 'team' : 'player'} highlights ${CURRENT_SEASON.split('/')[0]}`;
    }
    
    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
    
  } catch (error: any) {
    console.error('Search error:', error);
    
    // Final fallback
    const fallback: GROQSearchResponse = {
      players: isTeamSearch ? [] : [createFallbackPlayer(query)],
      teams: isTeamSearch ? [createFallbackTeam(query)] : [],
      youtubeQuery: `${query} football`,
      error: 'Search failed. Please try again.',
      _metadata: {
        timestamp: new Date().toISOString(),
        searchType: isTeamSearch ? 'team' : 'player',
        source: 'Error Fallback',
        confidence: 10,
        error: error.message,
        hasSquad: false
      }
    };
    
    return fallback;
  }
};

// Historical players function - FIXED VERSION
export const getHistoricalPlayers = async (
  teamName: string, 
  teamType: 'club' | 'national', 
  language: string = 'en'
): Promise<Player[]> => {
  console.log(`[HISTORICAL] Fetching historical players for ${teamName} (${teamType})`);
  
  try {
    const systemPrompt = `You are a football historian. Provide information about legendary/historical players for ${teamType} team: "${teamName}".

IMPORTANT: Return a valid JSON array with exactly this structure - no extra text:
[
  {
    "name": "Full Name",
    "currentTeam": "Retired or Historical Team",
    "position": "Position",
    "age": 0,
    "nationality": "Nationality",
    "majorAchievements": ["Achievement 1", "Achievement 2"],
    "careerSummary": "Brief summary of their career with this team...",
    "_era": "Era/Decade they played"
  }
]

Provide 5-7 players. Ensure all fields are properly filled.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: systemPrompt 
        },
        { 
          role: 'user', 
          content: `Provide legendary/historical players for ${teamName}. Return ONLY JSON array.` 
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) return [];
    
    const result = JSON.parse(response);
    
    // Handle different possible response structures
    let playersArray: any[] = [];
    
    if (Array.isArray(result)) {
      playersArray = result;
    } else if (result.players && Array.isArray(result.players)) {
      playersArray = result.players;
    } else if (Array.isArray(result.data)) {
      playersArray = result.data;
    }
    
    // Ensure proper structure
    if (playersArray.length === 0) {
      return getFallbackHistoricalPlayers(teamName, teamType);
    }
    
    return playersArray.map((player: any) => ({
      name: player.name || 'Unknown Player',
      currentTeam: player.currentTeam || 'Retired',
      position: player.position || 'Player',
      age: player.age || 0,
      nationality: player.nationality || 'Unknown',
      majorAchievements: Array.isArray(player.majorAchievements) ? player.majorAchievements : [],
      careerSummary: player.careerSummary || `Legendary player for ${teamName}`,
      _era: player._era || 'Historical',
      _source: 'AI Historical',
      _metadata: {
        source: 'AI Generated Historical Data',
        confidence: 70,
        team: teamName,
        type: teamType
      }
    }));
    
  } catch (error) {
    console.error('[HISTORICAL] Error fetching historical players:', error);
    
    // Provide fallback historical players
    return getFallbackHistoricalPlayers(teamName, teamType);
  }
};

// Export for compatibility
export const GROQSearch = (query: string, bustCache: boolean = false) => 
  searchWithGROQ(query, 'en', bustCache, false);

export const searchFresh = async (query: string, isTeamSearch: boolean = false) => {
  return await searchWithGROQ(query, 'en', true, isTeamSearch);
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('Search cache cleared');
};

export const needsDataVerification = () => false;

export const getDataSourceInfo = (result: any) => ({
  source: result?._metadata?.source || 'Unknown',
  color: result?._metadata?.source?.includes('Database') ? 'green' : 'blue',
  icon: result?._metadata?.source?.includes('Database') ? '✅' : '🤖',
  confidence: result?._metadata?.confidence || 50
});

// Export current season
export const getCurrentSeason = () => CURRENT_SEASON;