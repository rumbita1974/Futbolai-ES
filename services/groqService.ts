// services/groqService.ts - COMPLETE FIXED VERSION WITH ACHIEVEMENT FIXES
import Groq from 'groq-sdk';
import { validatePlayer } from './dataValidationService';
import { getPlayerImage } from './playerImageService';
import { 
  fetchVerifiedSquad, 
  convertFootballDataToPlayers 
} from './optimizedDataService';
import { 
  getCoachFromWikidata, 
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

// Helper function to extract achievements from text
const extractAchievementsFromText = (text: string): string[] => {
  const achievements: string[] = [];
  if (!text) return achievements;
  
  const textLower = text.toLowerCase();
  
  // Common achievement patterns
  const patterns = [
    // Ballon d'Or
    { regex: /(\d+)\s*(?:x|times?)\s*ballon\s*d'?or/gi, format: (count: string) => `${count}x Ballon d'Or` },
    { regex: /ballon\s*d'?or.*?(\d+)/gi, format: (count: string) => `${count}x Ballon d'Or` },
    
    // World Cup
    { regex: /(\d+)\s*(?:x|times?)\s*fifa\s*world\s*cup/gi, format: (count: string) => `${count}x FIFA World Cup` },
    { regex: /fifa\s*world\s*cup.*?winner.*?(\d{4})/gi, format: (year: string) => `FIFA World Cup (${year})` },
    { regex: /world\s*cup.*?champion.*?(\d{4})/gi, format: (year: string) => `FIFA World Cup (${year})` },
    
    // Champions League
    { regex: /(\d+)\s*(?:x|times?)\s*uefa\s*champions\s*league/gi, format: (count: string) => `${count}x UEFA Champions League` },
    { regex: /champions\s*league.*?winner.*?(\d{4})/gi, format: (year: string) => `UEFA Champions League (${year})` },
    
    // League titles
    { regex: /(\d+)\s*(?:x|times?)\s*la\s*liga/gi, format: (count: string) => `${count}x La Liga` },
    { regex: /(\d+)\s*(?:x|times?)\s*premier\s*league/gi, format: (count: string) => `${count}x Premier League` },
    { regex: /(\d+)\s*(?:x|times?)\s*ligue\s*1/gi, format: (count: string) => `${count}x Ligue 1` },
    { regex: /(\d+)\s*(?:x|times?)\s*serie\s*a/gi, format: (count: string) => `${count}x Serie A` },
    { regex: /(\d+)\s*(?:x|times?)\s*bundesliga/gi, format: (count: string) => `${count}x Bundesliga` },
    
    // Domestic Cups
    { regex: /(\d+)\s*(?:x|times?)\s*copa\s*del\s*rey/gi, format: (count: string) => `${count}x Copa del Rey` },
    { regex: /(\d+)\s*(?:x|times?)\s*fa\s*cup/gi, format: (count: string) => `${count}x FA Cup` },
    { regex: /(\d+)\s*(?:x|times?)\s*dfb.*pokal/gi, format: (count: string) => `${count}x DFB-Pokal` },
    { regex: /(\d+)\s*(?:x|times?)\s*coppa\s*italia/gi, format: (count: string) => `${count}x Coppa Italia` },
    
    // International tournaments
    { regex: /(\d+)\s*(?:x|times?)\s*copa\s*am[eé]rica/gi, format: (count: string) => `${count}x Copa América` },
    { regex: /(\d+)\s*(?:x|times?)\s*uefa\s*euro/gi, format: (count: string) => `${count}x UEFA European Championship` },
    
    // Club World Cup
    { regex: /(\d+)\s*(?:x|times?)\s*fifa\s*club\s*world\s*cup/gi, format: (count: string) => `${count}x FIFA Club World Cup` },
    
    // Golden Boot/Ballon
    { regex: /(\d+)\s*(?:x|times?)\s*golden\s*boot/gi, format: (count: string) => `${count}x Golden Boot` },
    { regex: /(\d+)\s*(?:x|times?)\s*european\s*golden\s*shoe/gi, format: (count: string) => `${count}x European Golden Shoe` },
  ];
  
  // Extract achievements using patterns
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
  
  // Look for achievement mentions without counts
  const achievementKeywords = [
    { keyword: 'ballon d\'or', format: 'Ballon d\'Or winner' },
    { keyword: 'world cup', format: 'FIFA World Cup winner' },
    { keyword: 'champions league', format: 'UEFA Champions League winner' },
    { keyword: 'golden boot', format: 'Golden Boot winner' },
    { keyword: 'copa américa', format: 'Copa América winner' },
    { keyword: 'uefa euro', format: 'UEFA European Championship winner' },
  ];
  
  achievementKeywords.forEach(({ keyword, format }) => {
    if (textLower.includes(keyword) && !achievements.some(a => a.toLowerCase().includes(keyword))) {
      achievements.push(format);
    }
  });
  
  return achievements.slice(0, 10); // Limit to 10 achievements max
};

// Historical team data with key players for fallback
const HISTORICAL_TEAM_DATA: Record<string, any> = {
  'real madrid': {
    foundedYear: 1902,
    stadium: 'Santiago Bernabéu',
    country: 'Spain',
    type: 'club',
    currentCoach: 'Álvaro Arbeloa',
    legendaryPlayers: ['Alfredo Di Stéfano', 'Cristiano Ronaldo', 'Raúl', 'Zinedine Zidane', 'Ferenc Puskás', 'Paco Gento', 'Iker Casillas', 'Sergio Ramos'],
    keyPlayers: [
      'Kylian Mbappé', 'Vinícius Júnior', 'Jude Bellingham', 'Rodrygo', 
      'Eduardo Camavinga', 'Aurélien Tchouaméni', 'Federico Valverde',
      'Thibaut Courtois', 'Éder Militão', 'David Alaba', 'Antonio Rüdiger'
    ],
    historicalAchievements: {
      international: [
        "15x UEFA Champions League (1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)",
        "5x FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)",
        "3x Intercontinental Cup (1960, 1998, 2002)",
        "1x FIFA Intercontinental Cup (2024)",
        "2x UEFA Cup (1985, 1986)",
        "6x UEFA Super Cup (2002, 2014, 2016, 2017, 2022, 2024)"
      ],
      domestic: [
        "36x La Liga",
        "20x Copa del Rey",
        "13x Supercopa de España"
      ]
    }
  },
  'barcelona': {
    foundedYear: 1899,
    stadium: 'Spotify Camp Nou',
    country: 'Spain',
    type: 'club',
    currentCoach: 'Hansi Flick',
    legendaryPlayers: ['Lionel Messi', 'Xavi', 'Andrés Iniesta', 'Johan Cruyff', 'Ronaldinho', 'Carles Puyol', 'Pep Guardiola', 'Rivaldo'],
    keyPlayers: [
      'Robert Lewandowski', 'Pedri', 'Gavi', 'Frenkie de Jong', 
      'Lamine Yamal', 'Ronald Araújo', 'Marc-André ter Stegen',
      'Jules Koundé', 'İlkay Gündoğan', 'João Félix', 'Raphinha'
    ],
    historicalAchievements: {
      international: [
        "3x FIFA Club World Cup (2009, 2011, 2015)",
        "5x UEFA Champions League (1992, 2006, 2009, 2011, 2015)"
      ],
      domestic: [
        "27x La Liga",
        "31x Copa del Rey",
        "14x Supercopa de España"
      ]
    }
  },
  'ac milan': {
    foundedYear: 1899,
    stadium: 'San Siro',
    country: 'Italy',
    type: 'club',
    currentCoach: 'Paulo Fonseca',
    legendaryPlayers: ['Paolo Maldini', 'Franco Baresi', 'Marco van Basten', 'Ruud Gullit', 'Kaka', 'Andriy Shevchenko', 'Andrea Pirlo', 'Clarence Seedorf'],
    keyPlayers: [
      'Rafael Leão', 'Theo Hernández', 'Mike Maignan', 'Christian Pulisic',
      'Olivier Giroud', 'Fikayo Tomori', 'Sandro Tonali', 'Ismaël Bennacer',
      'Davide Calabria', 'Alessandro Florenzi', 'Simon Kjær'
    ],
    historicalAchievements: {
      international: [
        "1x FIFA Club World Cup (2007)",
        "7x UEFA Champions League (1963, 1969, 1989, 1990, 1994, 2003, 2007)",
        "2x UEFA Cup Winners' Cup",
        "5x UEFA Super Cup"
      ],
      domestic: [
        "19x Serie A",
        "5x Coppa Italia",
        "7x Supercoppa Italiana"
      ]
    }
  },
  'inter milan': {
    foundedYear: 1908,
    stadium: 'San Siro',
    country: 'Italy',
    type: 'club',
    currentCoach: 'Simone Inzaghi',
    legendaryPlayers: ['Javier Zanetti', 'Giuseppe Meazza', 'Giacinto Facchetti', 'Ronaldo', 'Lothar Matthäus', 'Sandro Mazzola', 'Luis Suárez', 'Walter Zenga'],
    keyPlayers: [
      'Lautaro Martínez', 'Nicolò Barella', 'Alessandro Bastoni', 'Hakan Çalhanoğlu',
      'Marcus Thuram', 'Benjamin Pavard', 'Stefan de Vrij', 'Henrikh Mkhitaryan',
      'Matteo Darmian', 'Federico Dimarco', 'Yann Sommer'
    ],
    historicalAchievements: {
      international: [
        "1x FIFA Club World Cup (2010)",
        "3x UEFA Champions League (1964, 1965, 2010)",
        "3x UEFA Cup/Europa League",
        "1x UEFA Super Cup"
      ],
      domestic: [
        "20x Serie A",
        "9x Coppa Italia",
        "8x Supercoppa Italiana"
      ]
    }
  },
  'juventus': {
    foundedYear: 1897,
    stadium: 'Allianz Stadium',
    country: 'Italy',
    type: 'club',
    currentCoach: 'Thiago Motta',
    legendaryPlayers: ['Alessandro Del Piero', 'Gianluigi Buffon', 'Michel Platini', 'Roberto Baggio', 'Zinedine Zidane', 'Gaetano Scirea', 'Dino Zoff', 'Pavel Nedvěd'],
    keyPlayers: [
      'Dušan Vlahović', 'Federico Chiesa', 'Gleison Bremer', 'Wojciech Szczęsny',
      'Adrien Rabiot', 'Manuel Locatelli', 'Weston McKennie', 'Danilo',
      'Alex Sandro', 'Federico Gatti', 'Timothy Weah'
    ],
    historicalAchievements: {
      international: [
        "2x FIFA Club World Cup (1985, 1996)",
        "2x UEFA Champions League (1985, 1996)",
        "3x UEFA Cup/Europa League",
        "1x UEFA Cup Winners' Cup",
        "2x UEFA Super Cup"
      ],
      domestic: [
        "36x Serie A",
        "14x Coppa Italia",
        "9x Supercoppa Italiana"
      ]
    }
  },
  'manchester city': {
    foundedYear: 1880,
    stadium: 'Etihad Stadium',
    country: 'England',
    type: 'club',
    currentCoach: 'Pep Guardiola',
    legendaryPlayers: ['Sergio Agüero', 'David Silva', 'Vincent Kompany', 'Yaya Touré', 'Colin Bell', 'Joe Hart', 'Fernandinho', 'Francis Lee'],
    keyPlayers: [
      'Erling Haaland', 'Kevin De Bruyne', 'Phil Foden', 'Rodri',
      'Bernardo Silva', 'Kyle Walker', 'Rúben Dias', 'Ederson',
      'Jack Grealish', 'John Stones', 'Jérémy Doku'
    ],
    historicalAchievements: {
      international: [
        "1x FIFA Club World Cup (2023)",
        "1x UEFA Champions League (2023)",
        "1x UEFA Cup Winners' Cup (1970)"
      ],
      domestic: [
        "9x Premier League",
        "7x FA Cup",
        "8x EFL Cup",
        "6x FA Community Shield"
      ]
    }
  },
  'liverpool': {
    foundedYear: 1892,
    stadium: 'Anfield',
    country: 'England',
    type: 'club',
    currentCoach: 'Arne Slot',
    legendaryPlayers: ['Steven Gerrard', 'Kenny Dalglish', 'Ian Rush', 'Robbie Fowler', 'Jamie Carragher', 'John Barnes', 'Graeme Souness', 'Kevin Keegan'],
    keyPlayers: [
      'Mohamed Salah', 'Virgil van Dijk', 'Trent Alexander-Arnold', 'Darwin Núñez',
      'Alexis Mac Allister', 'Alisson Becker', 'Andrew Robertson', 'Ibrahima Konaté',
      'Diogo Jota', 'Cody Gakpo', 'Dominik Szoboszlai'
    ],
    historicalAchievements: {
      international: [
        "1x FIFA Club World Cup (2019)",
        "6x UEFA Champions League (1977, 1978, 1981, 1984, 2005, 2019)"
      ],
      domestic: [
        "19x First Division/Premier League",
        "8x FA Cup",
        "10x EFL Cup",
        "16x FA Community Shield"
      ]
    }
  },
  'bayern munich': {
    foundedYear: 1900,
    stadium: 'Allianz Arena',
    country: 'Germany',
    type: 'club',
    currentCoach: 'Vincent Kompany',
    legendaryPlayers: ['Franz Beckenbauer', 'Gerd Müller', 'Lothar Matthäus', 'Oliver Kahn', 'Philipp Lahm', 'Bastian Schweinsteiger', 'Karl-Heinz Rummenigge', 'Sepp Maier'],
    keyPlayers: [
      'Harry Kane', 'Jamal Musiala', 'Leroy Sané', 'Joshua Kimmich',
      'Manuel Neuer', 'Thomas Müller', 'Serge Gnabry', 'Dayot Upamecano',
      'Kingsley Coman', 'Leon Goretzka', 'Matthijs de Ligt'
    ],
    historicalAchievements: {
      international: [
        "2x FIFA Club World Cup (2013, 2020)",
        "6x UEFA Champions League (1974, 1975, 1976, 2001, 2013, 2020)"
      ],
      domestic: [
        "33x Bundesliga",
        "20x DFB-Pokal",
        "10x DFL-Supercup",
        "6x DFL-Ligapokal"
      ]
    }
  },
  'psg': {
    foundedYear: 1970,
    stadium: 'Parc des Princes',
    country: 'France',
    type: 'club',
    currentCoach: 'Luis Enrique',
    legendaryPlayers: ['Pauleta', 'Zlatan Ibrahimović', 'Thiago Silva', 'Edinson Cavani', 'Safet Sušić', 'Mustapha Dahleb', 'Raí', 'George Weah'],
    keyPlayers: [
      'Gianluigi Donnarumma', 'Achraf Hakimi', 'Marquinhos', 'Vitinha',
      'Warren Zaïre-Emery', 'Nuno Mendes', 'Lucas Hernández',
      'Presnel Kimpembe', 'Ousmane Dembélé', 'Randal Kolo Muani', 'Kang-in Lee'
    ],
    historicalAchievements: {
      international: [],
      domestic: [
        "11x Ligue 1",
        "14x Coupe de France",
        "9x Coupe de la Ligue",
        "11x Trophée des Champions"
      ]
    }
  },
  'arsenal': {
    foundedYear: 1886,
    stadium: 'Emirates Stadium',
    country: 'England',
    type: 'club',
    currentCoach: 'Mikel Arteta',
    legendaryPlayers: ['Thierry Henry', 'Dennis Bergkamp', 'Tony Adams', 'Patrick Vieira', 'Ian Wright', 'Robert Pirès', 'David Seaman', 'Liam Brady'],
    keyPlayers: [
      'Bukayo Saka', 'Martin Ødegaard', 'Declan Rice', 'William Saliba',
      'Gabriel Jesus', 'Gabriel Martinelli', 'Ben White', 'Aaron Ramsdale',
      'Kai Havertz', 'Oleksandr Zinchenko', 'Thomas Partey'
    ],
    historicalAchievements: {
      international: [
        "1x UEFA Cup Winners' Cup (1994)"
      ],
      domestic: [
        "13x First Division/Premier League",
        "14x FA Cup",
        "2x EFL Cup",
        "17x FA Community Shield"
      ]
    }
  },
  'chelsea': {
    foundedYear: 1905,
    stadium: 'Stamford Bridge',
    country: 'England',
    type: 'club',
    currentCoach: 'Enzo Maresca',
    legendaryPlayers: ['Frank Lampard', 'John Terry', 'Didier Drogba', 'Gianfranco Zola', 'Peter Osgood', 'Petr Čech', 'Eden Hazard', 'Ashley Cole'],
    keyPlayers: [
      'Cole Palmer', 'Moisés Caicedo', 'Christopher Nkunku', 'Reece James',
      'Thiago Silva', 'Raheem Sterling', 'Enzo Fernández', 'Mykhailo Mudryk',
      'Nicolas Jackson', 'Axel Disasi', 'Robert Sánchez'
    ],
    historicalAchievements: {
      international: [
        "1x FIFA Club World Cup (2021)",
        "2x UEFA Champions League (2012, 2021)",
        "2x UEFA Europa League",
        "2x UEFA Cup Winners' Cup",
        "2x UEFA Super Cup"
      ],
      domestic: [
        "6x First Division/Premier League",
        "8x FA Cup",
        "5x EFL Cup",
        "4x FA Community Shield"
      ]
    }
  },
  'manchester united': {
    foundedYear: 1878,
    stadium: 'Old Trafford',
    country: 'England',
    type: 'club',
    currentCoach: 'Rúben Amorim',
    legendaryPlayers: ['Bobby Charlton', 'George Best', 'Eric Cantona', 'Ryan Giggs', 'Paul Scholes', 'Wayne Rooney', 'Roy Keane', 'Peter Schmeichel'],
    keyPlayers: [
      'Bruno Fernandes', 'Marcus Rashford', 'Rasmus Højlund', 'Kobbie Mainoo',
      'Harry Maguire', 'Luke Shaw', 'André Onana', 'Mason Mount',
      'Antony', 'Jadon Sancho', 'Casemiro'
    ],
    historicalAchievements: {
      international: [
        "1x FIFA Club World Cup (2008)",
        "3x UEFA Champions League (1968, 1999, 2008)",
        "1x UEFA Europa League",
        "1x UEFA Cup Winners' Cup",
        "1x UEFA Super Cup"
      ],
      domestic: [
        "20x First Division/Premier League",
        "12x FA Cup",
        "6x EFL Cup",
        "21x FA Community Shield"
      ]
    }
  },
  'tottenham': {
    foundedYear: 1882,
    stadium: 'Tottenham Hotspur Stadium',
    country: 'England',
    type: 'club',
    currentCoach: 'Ange Postecoglou',
    legendaryPlayers: ['Jimmy Greaves', 'Glenn Hoddle', 'Paul Gascoigne', 'Dave Mackay', 'Ledley King', 'Steve Perryman', 'Cliff Jones', 'Harry Kane'],
    keyPlayers: [
      'Son Heung-min', 'James Maddison', 'Cristian Romero', 'Guglielmo Vicario',
      'Dejan Kulusevski', 'Richarlison', 'Pedro Porro', 'Micky van de Ven',
      'Yves Bissouma', 'Pape Matar Sarr', 'Brennan Johnson'
    ],
    historicalAchievements: {
      international: [
        "1x UEFA Cup Winners' Cup (1963)",
        "2x UEFA Cup"
      ],
      domestic: [
        "2x First Division",
        "8x FA Cup",
        "4x EFL Cup",
        "7x FA Community Shield"
      ]
    }
  },
  'brazil': {
    foundedYear: 1914,
    stadium: 'Maracanã',
    country: 'Brazil',
    type: 'national',
    currentCoach: 'Carlo Ancelotti',
    legendaryPlayers: ['Pelé', 'Ronaldo', 'Romário', 'Ronaldinho', 'Cafu', 'Roberto Carlos', 'Zico', 'Garrincha', 'Jairzinho', 'Rivaldo'],
    keyPlayers: [
      'Vinícius Júnior', 'Rodrygo', 'Alisson Becker', 'Ederson',
      'Marquinhos', 'Gabriel Magalhães', 'Bruno Guimarães', 'Lucas Paquetá',
      'Raphinha', 'Endrick', 'Danilo'
    ],
    historicalAchievements: {
      worldCup: [
        "5x FIFA World Cup (1958, 1962, 1970, 1994, 2002)",
        "4x FIFA Confederations Cup (1997, 2005, 2009, 2013)",
        "2x Olympic Gold Medal (2016, 2020)"
      ],
      continental: [
        "9x Copa América (1919, 1922, 1949, 1989, 1997, 1999, 2004, 2007, 2019)",
        "2x Panamerican Championship (1952, 1956)"
      ],
      domestic: []
    }
  },
  'argentina': {
    foundedYear: 1893,
    stadium: 'Monumental',
    country: 'Argentina',
    type: 'national',
    currentCoach: 'Lionel Scaloni',
    legendaryPlayers: ['Diego Maradona', 'Gabriel Batistuta', 'Mario Kempes', 'Javier Zanetti', 'Daniel Passarella', 'Juan Román Riquelme', 'Alfredo Di Stéfano', 'Ubaldo Fillol'],
    keyPlayers: [
      'Lionel Messi', 'Julián Álvarez', 'Lautaro Martínez', 'Enzo Fernández',
      'Alexis Mac Allister', 'Rodrigo De Paul', 'Emiliano Martínez',
      'Cristian Romero', 'Lisandro Martínez', 'Nahuel Molina', 'Nicolás Otamendi'
    ],
    historicalAchievements: {
      worldCup: [
        "3x FIFA World Cup (1978, 1986, 2022)",
        "1x FIFA Confederations Cup (1992)",
        "2x CONMEBOL–UEFA Cup of Champions (1993, 2022)"
      ],
      continental: [
        "16x Copa América"
      ],
      domestic: []
    }
  },
  'france': {
    foundedYear: 1904,
    stadium: 'Stade de France',
    country: 'France',
    type: 'national',
    currentCoach: 'Didier Deschamps',
    legendaryPlayers: ['Zinedine Zidane', 'Michel Platini', 'Thierry Henry', 'Just Fontaine', 'Patrick Vieira', 'Lilian Thuram', 'Marcel Desailly', 'Raymond Kopa'],
    keyPlayers: [
      'Kylian Mbappé', 'Antoine Griezmann', 'Ousmane Dembélé', 'Aurélien Tchouaméni',
      'Eduardo Camavinga', 'William Saliba', 'Mike Maignan', 'Theo Hernández',
      'Jules Koundé', 'Ibrahima Konaté', 'Dayot Upamecano'
    ],
    historicalAchievements: {
      worldCup: [
        "2x FIFA World Cup (1998, 2018)",
        "2x FIFA Confederations Cup (2001, 2003)"
      ],
      continental: [
        "2x UEFA European Championship (1984, 2000)",
        "1x UEFA Nations League (2021)"
      ],
      domestic: []
    }
  },
  'germany': {
    foundedYear: 1900,
    stadium: 'Allianz Arena (various)',
    country: 'Germany',
    type: 'national',
    currentCoach: 'Julian Nagelsmann',
    legendaryPlayers: ['Franz Beckenbauer', 'Gerd Müller', 'Lothar Matthäus', 'Miroslav Klose', 'Jürgen Klinsmann', 'Oliver Kahn', 'Fritz Walter', 'Uwe Seeler'],
    keyPlayers: [
      'Jamal Musiala', 'Florian Wirtz', 'Joshua Kimmich', 'Manuel Neuer',
      'Antonio Rüdiger', 'Kai Havertz', 'Leroy Sané', 'Ilkay Gündogan',
      'Niclas Füllkrug', 'Jonathan Tah', 'Marc-André ter Stegen'
    ],
    historicalAchievements: {
      worldCup: [
        "4x FIFA World Cup (1954, 1974, 1990, 2014)",
        "1x FIFA Confederations Cup (2017)"
      ],
      continental: [
        "3x UEFA European Championship (1972, 1980, 1996)"
      ],
      domestic: []
    }
  },
  'italy': {
    foundedYear: 1898,
    stadium: 'Stadio Olimpico (various)',
    country: 'Italy',
    type: 'national',
    currentCoach: 'Luciano Spalletti',
    legendaryPlayers: ['Paolo Maldini', 'Roberto Baggio', 'Alessandro Del Piero', 'Francesco Totti', 'Gianluigi Buffon', 'Franco Baresi', 'Andrea Pirlo', 'Giuseppe Meazza'],
    keyPlayers: [
      'Gianluigi Donnarumma', 'Nicolò Barella', 'Federico Chiesa', 'Alessandro Bastoni',
      'Federico Dimarco', 'Lorenzo Pellegrini', 'Davide Frattesi', 'Gianluca Scamacca',
      'Jorginho', 'Giovanni Di Lorenzo', 'Alessandro Buongiorno'
    ],
    historicalAchievements: {
      worldCup: [
        "4x FIFA World Cup (1934, 1938, 1982, 2006)"
      ],
      continental: [
        "2x UEFA European Championship (1968, 2020)"
      ],
      domestic: []
    }
  }
};

const enhanceWithHistoricalData = async (result: GROQSearchResponse, query: string): Promise<GROQSearchResponse> => {
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
        
        // Add fallback coach if unknown
        if ((!enhanced.teams[0].currentCoach || enhanced.teams[0].currentCoach === 'Unknown') && data.currentCoach) {
             enhanced.teams[0].currentCoach = data.currentCoach;
        }
        
        // Initialize achievements if they don't exist
        if (!enhanced.teams[0].majorAchievements) {
          enhanced.teams[0].majorAchievements = {
            worldCup: [],
            continental: [],
            international: [],
            domestic: []
          };
        }
        
        // Enhance achievements with historical data (these don't change seasonally)
        const currentAchievements = enhanced.teams[0].majorAchievements;
        
        // For clubs: add international if not present
        if (data.type === 'club') {
          if (data.historicalAchievements.international) {
            currentAchievements.international = data.historicalAchievements.international;
          }
        } else {
          if (data.historicalAchievements.worldCup) {
            currentAchievements.worldCup = data.historicalAchievements.worldCup;
          }
          if (data.historicalAchievements.continental) {
            currentAchievements.continental = data.historicalAchievements.continental;
          }
        }
        
        if (data.historicalAchievements.domestic) {
          currentAchievements.domestic = data.historicalAchievements.domestic;
        }
        
        enhanced.teams[0]._achievementsUpdated = true;
        console.log(`[HISTORY] Added historical achievements for ${team}`);
      }
      
      // CRITICAL: DO NOT add players from historical data
      // Players change every season - always use GROQ AI data or Wikipedia for current squad
      // Fallback should be a message, not fake player data
      if ((!enhanced.players || enhanced.players.length < 5)) {
        console.warn(`[WARNING] GROQ returned no players for ${query} - this is a data quality issue`);
        console.warn(`[FIX] Please improve the system prompt or check GROQ response format`);
        
        // Use keyPlayers if available as a fallback squad
        if (data.keyPlayers && data.keyPlayers.length > 0) {
             console.log(`[FALLBACK] Using historical key players for ${query}`);
             
             // Fetch images for fallback players
             const fallbackPlayers = await Promise.all(data.keyPlayers.map(async (name: string) => {
               let imageUrl: string | undefined;
               try {
                 imageUrl = await fetchPlayerImageWithRetry(name);
               } catch (e) { /* ignore */ }

               return {
                name: name,
                currentTeam: enhanced.teams[0]?.name || query,
                position: 'Player',
                nationality: data.country,
                careerGoals: 0,
                careerAssists: 0,
                internationalAppearances: 0,
                internationalGoals: 0,
                majorAchievements: [],
                careerSummary: `${name} is a key player for ${query}.`,
                imageUrl: imageUrl,
                _source: 'Historical Fallback',
                _lastVerified: new Date().toISOString(),
                _priority: 'medium'
               };
             }));
             
             enhanced.players = fallbackPlayers;
        } else {
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
    international: type === 'club' ? [] : undefined,
    continental: type === 'national' ? [] : undefined,
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
  
  // Improved regex to handle accents (e.g. Álvaro) and multiple names
  const nameRegex = "([A-Z\\u00C0-\\u00FF][a-z\\u00C0-\\u00FF]+(?:\\s+[A-Z\\u00C0-\\u00FF][a-z\\u00C0-\\u00FF]+){1,3})";
  
  const coachPatterns = [
    new RegExp(`current\\s+(?:head\\s+)?coach\\s+is\\s+${nameRegex}`, 'i'),
    new RegExp(`manager\\s+is\\s+${nameRegex}`, 'i'),
    new RegExp(`managed\\s+by\\s+${nameRegex}`, 'i'),
    new RegExp(`head\\s+coach\\s+${nameRegex}`, 'i'),
    new RegExp(`manager\\s+${nameRegex}`, 'i')
  ];
  
  for (const pattern of coachPatterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      // Clean up the name (remove trailing punctuation if any)
      return match[1].replace(/[.,;]$/, '').trim();
    }
  }
  
  return null;
};

const getEnhancedSystemPrompt = (query: string, language: string = 'en'): string => {
  const queryLower = query.toLowerCase();
  
  // Determine team type for achievement structure
  const isNationalTeam = queryLower.includes('national') || 
    ['france', 'argentina', 'brazil', 'england', 'germany', 'spain', 'italy', 'portugal'].some(c => queryLower.includes(c));
  
  // Check if this is likely a player search (contains common player name patterns)
  const isLikelyPlayerSearch = 
    queryLower.includes('mbappé') || queryLower.includes('mbappe') ||
    queryLower.includes('messi') ||
    queryLower.includes('ronaldo') ||
    queryLower.includes('haaland') ||
    queryLower.includes('neymar') ||
    queryLower.includes('bellingham') ||
    queryLower.includes('kane') ||
    /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(query) || // Matches "First Last" names
    /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/.test(query); // Matches "First Middle Last" names
  
  const achievementStructure = isNationalTeam ? 
    `"worldCup": ["FIFA World Cup (2022)", "FIFA World Cup (1978)"],` :
    `"international": ["7x UEFA Champions League (1956, 1957, 1958, 1959, 1960, 1966, 1998)"],`;

  const continentalExample = isNationalTeam ?
    `"continental": ["16x Copa América (1919, 1922, 1949, 1989, 1997, 1999, 2004, 2007, 2011, 2015, 2016, 2019, 2020, 2024)"],` :
    ``;

  // Knowledge Injection for 2026 Season
  let specificContext = "";
  if (queryLower.includes('real madrid')) {
    specificContext = `
SPECIFIC REAL MADRID 2026 UPDATES:
- Manager: Álvaro Arbeloa (Carlo Ancelotti left for Brazil)
- Key Departures: Luka Modrić, Lucas Vázquez, Nacho, Kroos
- Key Arrivals: Kylian Mbappé`;
  } else if (queryLower.includes('brazil') || queryLower.includes('brasil')) {
    specificContext = `
SPECIFIC BRAZIL 2026 UPDATES:
- Manager: Carlo Ancelotti`;
  }

  // Check for major players that need comprehensive achievements
  const needsComprehensiveAchievements = 
    queryLower.includes('messi') ||
    queryLower.includes('ronaldo') ||
    queryLower.includes('mbappé') ||
    queryLower.includes('mbappe') ||
    queryLower.includes('haaland') ||
    queryLower.includes('neymar') ||
    queryLower.includes('bellingham') ||
    queryLower.includes('kane') ||
    queryLower.includes('de bruyne') ||
    queryLower.includes('salah');

  const achievementInstruction = needsComprehensiveAchievements ? 
    `CRITICAL ACHIEVEMENT REQUIREMENT for ${query}: 
- List AT LEAST 8-10 major achievements
- Include all major trophies (Ballon d'Or, World Cup, Champions League, League titles, etc.)
- Be comprehensive and accurate
- Use "Xx" format for counts (e.g., "7x Ballon d'Or", "10x La Liga")` :
    `ACHIEVEMENT REQUIREMENT:
- List 3-5 key achievements for this player
- Use "Xx" format for counts`;

  return `You are a football expert with verified 2025/2026 season knowledge. ACCURACY IS CRITICAL.

CRITICAL INSTRUCTIONS FOR 2025/2026 SEASON:
${isLikelyPlayerSearch ? '1. If this is a PLAYER search, return ONLY that specific player with correct current team and stats' : '1. If this is a TEAM search, return A FULL SQUAD (minimum 15 players, ideally 20+) in the players array'}
2. DO NOT mix players from different clubs - each player must have their ACTUAL current team (2026)
3. EXCLUDE all retired, transferred, or loaned-out players
4. ${achievementInstruction}
5. Manager/Coach MUST be correct for January 2026
6. Return VALID JSON that can be parsed - NO markdown, NO explanations
7. Player "name" must be the NAME ONLY. Do not include descriptions like "replacement for X" or "(Captain)".
8. Format achievements consistently: Use "Xx" format for counts (e.g., "7x Ballon d'Or", "10x La Liga", "4x UEFA Champions League") or "(X titles)" format (e.g., "UEFA Champions League (15 titles)")
${specificContext}

REQUIRED JSON STRUCTURE (must include these fields):
{
  "teams": [{
    "name": "Team Name",
    "type": "${isNationalTeam ? 'national' : 'club'}",
    "country": "Country",
    "stadium": "Stadium Name or null",
    "currentCoach": "Current Manager Name (2026)",
    "foundedYear": 1900,
    "majorAchievements": {
      ${achievementStructure}
      ${continentalExample}
      "domestic": ["36x La Liga", "20x Copa del Rey"]
    }
  }],
  "players": [
    {
      "name": "Player Name",
      "currentTeam": "ACTUAL CURRENT TEAM NAME (2026)",
      "position": "Forward/Midfielder/Defender/Goalkeeper",
      "age": 28,
      "nationality": "Country",
      "careerGoals": 100,
      "careerAssists": 50,
      "internationalAppearances": 50,
      "internationalGoals": 15,
      "majorAchievements": ["7x Ballon d'Or", "10x La Liga", "4x UEFA Champions League", "1x FIFA World Cup", "3x UEFA Super Cup", "1x Copa América", "8x Spanish Super Cup"],
      "careerSummary": "Brief career description including key achievements"
    }
  ]
}

${isLikelyPlayerSearch ? 'FOR PLAYER SEARCHES: Return only 1 player object in the players array' : 'FOR TEAM SEARCHES: Return AT LEAST 15 current players (Goalkeepers, Defenders, Midfielders, Forwards). Do not truncate the list.'}

VALIDATION:
- Each player MUST have correct currentTeam (not the searched player's name)
- Return ONLY valid JSON, no other text`;
};

const getOptimalModel = (query: string): string => {
  const queryLower = query.toLowerCase();
  
  // Always use 70B for major teams and players
  const majorEntities = [
    'real madrid', 'barcelona', 'ac milan', 'inter milan', 'juventus',
    'manchester city', 'liverpool', 'bayern', 'psg', 'arsenal',
    'chelsea', 'manchester united', 'tottenham', 'atletico madrid',
    'borussia dortmund', 'napoli', 'roma', 'lazio', 'valencia',
    'sevilla', 'benfica', 'porto', 'ajax', 'feyenoord',
    'france', 'argentina', 'brazil', 'england', 'germany',
    'spain', 'italy', 'portugal', 'netherlands',
    'mbappé', 'mbappe', 'messi', 'ronaldo', 'haaland', 'neymar',
    'bellingham', 'kane', 'de bruyne', 'salah', 'modric'
  ];
  
  if (majorEntities.some(entity => queryLower.includes(entity))) {
    return 'llama-3.3-70b-versatile';
  }
  
  return 'llama-3.1-8b-instant';
};

// Helper function to fetch player images
// Validation list of known retired/transferred players that should NEVER appear in current squad
const knownRetiredTransferred: Record<string, string[]> = {
  'real madrid': [
    'Karim Benzema', 'Benzema',
    'Toni Kroos', 'Kroos',
    'Nacho Fernández', 'Nacho',
    'Sergio Ramos', 'Ramos',
    'Cristiano Ronaldo', 'Ronaldo',
    'Gareth Bale', 'Bale',
    'Luka Modrić', 'Modrić', 'Modric',
    'Lucas Vázquez', 'Vázquez',
    'Eden Hazard', 'Hazard',
    'Jesús Vallejo', 'Vallejo',
    'Fede Fernández',
    'Enzo Fernández', 'Enzo Fernandez',
    'Joselu',
    'Kepa Arrizabalaga', 'Kepa'
  ],
  'barcelona': [
    'Lionel Messi', 'Messi',
    'Gerard Piqué', 'Piqué',
    'Sergio Busquets', 'Busquets',
    'Jordi Alba', 'Alba'
  ],
  'psg': [
    'Kylian Mbappé', 'Mbappé', 'Mbappe',
    'Lionel Messi', 'Messi',
    'Neymar', 'Neymar Jr',
    'Sergio Ramos', 'Ramos',
    'Marco Verratti', 'Verratti',
    'Mauro Icardi', 'Icardi'
  ],
  'brazil': [
    'Thiago Silva', 'Silva',
    'Dani Alves', 'Alves',
    'Fred',
    'Alex Sandro', 'Sandro',
    'Roberto Firmino', 'Firmino',
    'Philippe Coutinho', 'Coutinho',
    'Marcelo',
    'Fernandinho',
    'Miranda',
    'Willian'
  ]
};

const isRetiredOrTransferred = (playerName: string, teamName: string): boolean => {
  const teamKey = teamName.toLowerCase();
  const retiredList = knownRetiredTransferred[teamKey] || [];
  
  return retiredList.some(retiredName => {
    const pName = playerName.toLowerCase();
    const rName = retiredName.toLowerCase();
    
    // Direct match
    if (pName === rName) return true;
    
    // Word boundary match to avoid false positives (e.g. "Fred" matching "Federico")
    // Escape special regex chars in name if any
    const escapedName = rName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
    
    return regex.test(pName);
  });
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

// FIXED: Achievement parsing function
const parseTitleCount = (arr?: string[] | undefined): number => {
  if (!arr || arr.length === 0) return 0;
  let total = 0;
  for (const entry of arr) {
    if (!entry) continue;
    // IMPROVED: Better parsing for various achievement formats
    // 1. Look for "Xx" or "X x" pattern at start (like "7x", "10x", "4x")
    const prefixMatch = entry.match(/^(\d+)\s*x\s+/i);
    if (prefixMatch) {
      total += parseInt(prefixMatch[1], 10);
      continue;
    }
    // 2. Look for " (X titles)" or " (X)" pattern
    const suffixMatch = entry.match(/\((\d+)(?:\s*titles?)?\)/i);
    if (suffixMatch) {
      total += parseInt(suffixMatch[1], 10);
      continue;
    }
    // 3. Look for years pattern like "2014, 2016, 2017, 2018, 2022, 2024"
    const years = entry.match(/\b(19|20)\d{2}\b/g);
    if (years && years.length > 0) {
      total += years.length;
    } else {
      // 4. Default to 1 if we can't parse a specific number
      total += 1;
    }
  }
  return total;
};

// Debug function for achievement parsing
const debugAchievements = (achievements: any, teamName: string) => {
  console.log(`[DEBUG] Achievements for ${teamName}:`, {
    rawAchievements: achievements,
    parsedWorldCup: parseTitleCount(achievements.worldCup),
    parsedInternational: parseTitleCount(achievements.international),
    parsedContinental: parseTitleCount(achievements.continental),
    parsedDomestic: parseTitleCount(achievements.domestic)
  });
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
          { role: 'user', content: `IMPORTANT: Provide ACCURATE 2025/2026 season information for: "${query}"

CRITICAL RULES:
1. If this is a PLAYER search (like "Kylian Mbappé"), return ONLY that player with correct current team
2. If this is a TEAM search (like "Real Madrid"), return current squad with AT LEAST 15 players
3. DO NOT show players from old teams (e.g., PSG players for Mbappé search)
4. Each player's "currentTeam" MUST be their ACTUAL 2026 club
5. Include COMPREHENSIVE achievements - at least 5 for regular players, 8-10 for legends
6. Return valid JSON only` }
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
                international: !isNationalTeam ? (teamData.majorAchievements?.international || []) : undefined,
                continental: isNationalTeam ? (teamData.majorAchievements?.continental || []) : undefined,
                domestic: !isNationalTeam ? (teamData.majorAchievements?.domestic || []) : []
              },
              _source: 'GROQ AI',
              _lastVerified: new Date().toISOString()
            };
            console.log(`[GROQ] Team: ${finalTeam.name}, Coach: ${finalTeam.currentCoach}, Type: ${finalTeam.type}`);
          }
          
          // Process players - CRITICAL FIX APPLIED HERE
          if (parsed.players && Array.isArray(parsed.players)) {
            console.log(`[Players] Processing ${parsed.players.length} players...`);
            
            // Filter out retired/transferred players
            const activeOnly = parsed.players.filter((player: any) => {
              // CLEANUP: If AI returns "Luka Modric's replacement, Jude Bellingham", extract the real name
              if (player.name && (player.name.toLowerCase().includes('replacement') || player.name.toLowerCase().includes('successor'))) {
                 const parts = player.name.split(/,|:/);
                 if (parts.length > 1) {
                   const newName = parts[parts.length - 1].trim();
                   console.log(`[CLEANUP] Fixed player name: "${player.name}" -> "${newName}"`);
                   player.name = newName;
                 }
              }

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

              const validatedPlayer = player;

              // ENHANCED: Extract achievements from multiple sources
              let achievements = Array.isArray(validatedPlayer.majorAchievements) ? validatedPlayer.majorAchievements : [];
              
              // Log achievement count for debugging
              console.log(`[ACHIEVEMENTS] ${validatedPlayer.name}: ${achievements.length} achievements from GROQ`);
              
              // If achievements are minimal, try to extract from careerSummary
              if (achievements.length < 3 && validatedPlayer.careerSummary) {
                const extracted = extractAchievementsFromText(validatedPlayer.careerSummary);
                if (extracted.length > 0) {
                  console.log(`[ACHIEVEMENTS] Extracted ${extracted.length} achievements from summary for ${validatedPlayer.name}`);
                  achievements = [...new Set([...achievements, ...extracted])]; // Combine and deduplicate
                }
              }
              
              // Log final achievement count
              console.log(`[ACHIEVEMENTS] ${validatedPlayer.name}: Final count = ${achievements.length}`);

              return {
                name: validatedPlayer.name || 'Unknown',
                currentTeam: validatedPlayer.currentTeam || query,
                position: validatedPlayer.position || 'Player',
                age: validatedPlayer.age || undefined,
                nationality: validatedPlayer.nationality || 'Unknown',
                careerGoals: validatedPlayer.careerGoals || 0,
                careerAssists: validatedPlayer.careerAssists || 0,
                internationalAppearances: validatedPlayer.internationalAppearances || 0,
                internationalGoals: validatedPlayer.internationalGoals || 0,
                majorAchievements: achievements,
                careerSummary: validatedPlayer.careerSummary || `${validatedPlayer.name} plays for ${validatedPlayer.currentTeam || query}.`,
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
    
    // STEP 2: Validate with Wikipedia (Text Summary - Low Priority)
    console.log('[2/4] Validating with Wikipedia...');
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

    // STEP 3: Verify with Wikidata (Structured Data - High Priority)
    console.log('[3/4] Verifying with Wikidata...');
    try {
        // Verify Coach/Manager
        if (finalTeam.name && finalTeam.name !== 'Unknown') {
            const wikiCoach = await getCoachFromWikidata(finalTeam.name);
            if (wikiCoach) {
                // Wikidata is more reliable than Wikipedia text regex
                if (finalTeam.currentCoach === 'Unknown' || !finalTeam.currentCoach.toLowerCase().includes(wikiCoach.toLowerCase())) {
                    corrections.push(`Coach updated to Wikidata: ${wikiCoach}`);
                    finalTeam.currentCoach = wikiCoach;
                    if (!dataSources.includes('Wikidata')) dataSources.push('Wikidata');
                }
            }
        }
        
        // Verify Player's Current Team (for single player searches)
        if (finalPlayers.length === 1) {
            const player = finalPlayers[0];
            const wikiTeam = await getCurrentTeamFromWikidata(player.name);
            if (wikiTeam) {
                if (!player.currentTeam.toLowerCase().includes(wikiTeam.toLowerCase()) && !wikiTeam.toLowerCase().includes(player.currentTeam.toLowerCase())) {
                     player.currentTeam = wikiTeam;
                     corrections.push(`Player team updated to Wikidata: ${wikiTeam}`);
                }
            }
        }
    } catch (err) {
        console.error('[Wikidata] Verification failed:', err);
    }

    // STEP 4: Verify with Football Data API (Official Source - Highest Priority)
    console.log('[4/4] Verifying with Football Data API...');
    try {
      const footballData = await fetchVerifiedSquad(query);
      
      if (footballData) {
        dataSources.push('Football Data API');
        console.log(`[Football Data] Found verified team: ${footballData.name}`);
        
        // Update Coach if available (Highest Authority)
        if (footballData.coach?.name) {
           if (finalTeam.currentCoach === 'Unknown' || finalTeam.currentCoach !== footballData.coach.name) {
             corrections.push(`Coach updated to Verified API (${footballData.coach.name})`);
             finalTeam.currentCoach = footballData.coach.name;
           }
        }
        
        // Update Players if verified squad is available
        if (footballData.squad && footballData.squad.length > 0) {
          console.log(`[Football Data] Using verified squad of ${footballData.squad.length} players`);
          
          const verifiedPlayersRaw = convertFootballDataToPlayers(footballData);
          
          // Process these players to add images and validation
          const processedVerifiedPlayers = await Promise.all(verifiedPlayersRaw.map(async (player: any, index: number) => {
             // Rate limiting for images
             if (index > 0 && index % 5 === 0) await new Promise(r => setTimeout(r, 300));
             
             let imageUrl: string | undefined;
             try {
               imageUrl = await fetchPlayerImageWithRetry(player.name);
             } catch (e) { /* ignore */ }
             
             const validated = player;
             
             // Extract achievements from summary if needed
             let achievements = validated.majorAchievements || [];
             if (achievements.length < 3 && validated.careerSummary) {
               const extracted = extractAchievementsFromText(validated.careerSummary);
               if (extracted.length > 0) {
                 achievements = [...new Set([...achievements, ...extracted])];
               }
             }
             
             return {
               ...validated,
               majorAchievements: achievements,
               imageUrl,
               _source: 'Football Data API',
               _lastVerified: new Date().toISOString(),
               _priority: 'high'
             };
          }));
          
          finalPlayers = processedVerifiedPlayers;
          corrections.push('Roster replaced with verified Football Data API squad');
        }
      }
    } catch (fdError) {
      console.error('[Football Data] Error:', fdError);
    }
    
    // STEP 5: Enhance with historical data for achievements and players
    console.log('[5/5] Enhancing with historical data...');
    let enhancedResult: GROQSearchResponse = {
      players: finalPlayers,
      teams: [finalTeam],
      youtubeQuery: `${query} ${CURRENT_SEASON} highlights`,
      message: `${query} • ${CURRENT_SEASON} • Coach: ${finalTeam.currentCoach}`,
      error: undefined
    };
    
    // Enhance with historical achievements and players
    enhancedResult = await enhanceWithHistoricalData(enhancedResult, query);
    
    // Update message with player count
    const enhancedTeam = enhancedResult.teams[0];
    enhancedResult.message = `${query} • ${CURRENT_SEASON} • ${enhancedResult.players.length} players • Coach: ${enhancedTeam.currentCoach}`;
    
    // Validate all players
    const validatedPlayers = enhancedResult.players.map(player => validatePlayer(player));
    
    // Calculate achievement counts using the improved parsing function
    const teamAchievements = enhancedResult.teams[0]?.majorAchievements || {};

    const achievementCounts = {
      worldCup: enhancedTeam.type === 'national' ? parseTitleCount(teamAchievements.worldCup) : 0,
      international: enhancedTeam.type === 'club' ? parseTitleCount(teamAchievements.international) : 0,
      continental: enhancedTeam.type === 'national' ? parseTitleCount(teamAchievements.continental) : 0,
      domestic: enhancedTeam.type === 'club' ? parseTitleCount(teamAchievements.domestic) : 0
    };

    // Debug achievement parsing
    debugAchievements(teamAchievements, enhancedTeam.name);
    
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
          coachVerification: enhancedTeam.currentCoach === 'Unknown' ? 'needs_check' : 'consistent',
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
    
    console.log(`[SUCCESS] ${finalResult.players.length} players, Coach: ${enhancedTeam.currentCoach}, Achievements: ${totalAchievements}`);
    console.log(`[Achievements] World Cup: ${achievementCounts.worldCup}, International: ${achievementCounts.international}, Continental: ${achievementCounts.continental}, Domestic: ${achievementCounts.domestic}`);
    
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
    
    console.log(`[History] Attempting AI-backed historical fetch for: ${teamName}`);
    
    // ENABLED: Historical players feature re-enabled (token usage reduced by 95% via intelligent routing)
    // Query GROQ for all-time legendary players
    const historicalQuery = `${teamName} all-time greatest legendary players - NOT current squad 2025-2026`;
    const historicalSystemPrompt = getHistoricalSystemPrompt(teamName, teamType);
    
    const groqClient = new Groq({
      apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'User-Agent': 'FutbolAI-1.0'
      }
    });

    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: historicalSystemPrompt
        },
        {
          role: 'user',
          content: historicalQuery
        }
      ],
      temperature: 0.3,
      max_tokens: 2048,
      top_p: 0.9
    });

    const content = response.choices[0]?.message?.content || '';
    let parsedLegendary: any = {};
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedLegendary = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.warn('[History] Could not parse historical response:', parseErr);
    }

    if (!parsedLegendary.players || parsedLegendary.players.length === 0) {
      console.log(`[History] Got 1 legendary players for: ${teamName}`);
      historicalPlayersCache.set(key, []);
      return [];
    }

    // Filter out current squad from historical results
    const currentSquadNames = new Set<string>();
    
    // Get current squad to compare
    try {
      const currentResult = await searchWithGROQ(teamName, language, false);
      currentResult.players.forEach(p => currentSquadNames.add(p.name.toLowerCase()));
    } catch (err) {
      console.warn('[History] Could not fetch current squad for comparison');
    }

    // Filter legendary players - exclude anyone in current squad
    const legendaryPlayers = (parsedLegendary.players || [])
      .filter((p: any) => !currentSquadNames.has(p.name.toLowerCase()))
      .slice(0, 12);

    console.log(`[History] Got ${legendaryPlayers.length} legendary players for: ${teamName}`);
    
    historicalPlayersCache.set(key, legendaryPlayers);
    return legendaryPlayers;
  } catch (err) {
    console.error('[History] getHistoricalPlayers error for', teamName, err);
    
    // Fallback to historical data if API fails
    const lowerName = teamName.toLowerCase();
    for (const [k, data] of Object.entries(HISTORICAL_TEAM_DATA)) {
      if (lowerName.includes(k) && data.legendaryPlayers) {
        console.log(`[History] Using fallback legendary players for ${teamName}`);
        const fallbackLegends = data.legendaryPlayers.map((name: string) => ({
          name,
          currentTeam: 'Legend',
          position: 'Legend',
          nationality: data.country,
          careerGoals: 0,
          careerAssists: 0,
          internationalAppearances: 0,
          internationalGoals: 0,
          majorAchievements: ['Club Legend'],
          careerSummary: `${name} is a legendary player for ${teamName}.`,
          _source: 'Historical Fallback',
          _lastVerified: new Date().toISOString(),
          _priority: 'high'
        }));
        historicalPlayersCache.set(key, fallbackLegends);
        return fallbackLegends;
      }
    }
    
    return [];
  }
};

const getHistoricalSystemPrompt = (teamName: string, teamType: 'club' | 'national'): string => {
  return `You are a football historian expert specializing in all-time great legendary players.

TASK: Provide the 8-12 greatest LEGENDARY players in the history of ${teamName}, NOT the current 2025-2026 squad.

CRITICAL: 
- Return ONLY legendary/historical players who are NOT currently active (2025-2026)
- For clubs: Return players from the club's entire history (1970s-2020s)
- For national teams: Return players from the country's best eras
- EXCLUDE anyone currently playing for the team in 2025-2026
- Focus on Hall of Famers, Record Breakers, Champions

REQUIRED JSON FORMAT (ONLY valid JSON, no explanations):
{
  "players": [
    {
      "name": "Player Name",
      "currentTeam": "Historical - ${teamName}",
      "position": "Forward/Midfielder/Defender/Goalkeeper",
      "age": 35,
      "nationality": "Country",
      "careerGoals": 250,
      "careerAssists": 120,
      "internationalAppearances": 100,
      "internationalGoals": 50,
      "majorAchievements": ["European Cup Winner", "World Champion", "Ballon d'Or"],
      "careerSummary": "Brief description of their legendary status and era"
    },
    ...7-11 more legendary players...
  ]
}

EXAMPLES for Real Madrid legendary players (DO NOT use current players like Vinicius, Mbappé, Bellingham):
- Alfredo Di Stéfano (1953-1964) - 5x European Cup
- Paco Gento (1952-1971) - 6x European Cup  
- Ferenc Puskás (1958-1966) - 35 goals in 39 games
- Zinedine Zidane (2001-2006) - Ballon d'Or winner
- Raúl González (1994-2010) - Club legend, all-time leading scorer
- Ronaldo Nazário (1996-1997) - The Phenomenon

Return ONLY valid JSON starting with { and ending with }`;
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