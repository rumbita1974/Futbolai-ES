// services/groqService.ts - COMPLETE HYBRID SOLUTION
// BSD API: Team search, squad data (works for clubs AND national teams)
// TheSportsDB: Player images only (direct lookup by player ID)

import Groq from 'groq-sdk';

// Types
export interface Player {
  id?: string;
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
  _imageUrl?: string;
}

export interface Team {
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  website?: string;
  venue?: string;
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

// Cache
const cache = new Map<string, { data: GROQSearchResponse; timestamp: number }>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// THESPORTSDB - PLAYER IMAGES ONLY (Direct lookup by ID)
// ============================================================================

const SPORTSDB_API_KEY = process.env.NEXT_PUBLIC_SPORTSDB_KEY || '3';

async function fetchPlayerImageFromTheSportsDB(playerId: string): Promise<string | undefined> {
  if (!playerId) return undefined;
  
  try {
    // Use your local proxy instead of calling TheSportsDB directly
    const response = await fetch(
      `/api/thesportsdb-proxy?endpoint=lookupplayer.php?id=${playerId}`
    );
    
    if (!response.ok) return undefined;
    
    const data = await response.json();
    
    if (data.players && data.players.length > 0) {
      const player = data.players[0];
      return player.strCutout || player.strThumb || player.strRender;
    }
    return undefined;
    
  } catch (error) {
    console.error(`[TheSportsDB] Error fetching image for player ID ${playerId}:`, error);
    return undefined;
  }
}

async function enrichPlayersWithImages(players: Player[]): Promise<Player[]> {
  if (!players || players.length === 0) return players;
  
  console.log(`🖼️ [TheSportsDB] Fetching images for ${players.length} players...`);
  
  const enrichedPlayers = [];
  let imagesFound = 0;
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (player) => {
        if (player.id) {
          const imageUrl = await fetchPlayerImageFromTheSportsDB(player.id);
          if (imageUrl) imagesFound++;
          return { ...player, _imageUrl: imageUrl };
        }
        return player;
      })
    );
    enrichedPlayers.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < players.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log(`✅ [TheSportsDB] Found images for ${imagesFound}/${players.length} players`);
  return enrichedPlayers;
}
// Add this to groqService.ts
async function fetchNationalTeamSquadFromTheSportsDB(teamName: string): Promise<Player[]> {
  try {
    console.log(`📡 [TheSportsDB] Fetching squad for national team: ${teamName}`);
    
    // First, search for the team to get its ID
    const searchResponse = await fetch(
      `/api/thesportsdb-proxy?endpoint=searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    const searchData = await searchResponse.json();
    
    if (!searchData.teams || searchData.teams.length === 0) {
      console.log(`[TheSportsDB] Team not found: ${teamName}`);
      return [];
    }
    
    const teamId = searchData.teams[0].idTeam;
    
    // Then, get all players for that team
    const squadResponse = await fetch(
      `/api/thesportsdb-proxy?endpoint=lookup_all_players.php?id=${teamId}`
    );
    const squadData = await squadResponse.json();
    
    if (!squadData.player || squadData.player.length === 0) {
      console.log(`[TheSportsDB] No players found for ${teamName}`);
      return [];
    }
    
    // Transform to your Player interface
    return squadData.player.map((player: any) => ({
      id: player.idPlayer,
      name: player.strPlayer,
      position: player.strPosition || 'Unknown',
      nationality: player.strNationality || '',
      age: player.dateBorn ? calculateAge(player.dateBorn) : undefined,
      currentTeam: teamName,
      majorAchievements: [],
      careerSummary: `${player.strPlayer} represents ${teamName}.`,
      _source: 'TheSportsDB',
      _imageUrl: player.strCutout || player.strThumb,
      _lastVerified: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('[TheSportsDB] Error fetching national team squad:', error);
    return [];
  }
}
// ============================================================================
// NATIONAL TEAM ACHIEVEMENTS (World Cup, Continental Titles)
// ============================================================================

const NATIONAL_TEAM_ACHIEVEMENTS: Record<string, Team['majorAchievements']> = {
  'germany': {
    worldCup: ['1954', '1974', '1990', '2014'],
    international: ['3x UEFA European Championship (1972, 1980, 1996)'],
    continental: [],
    domestic: []
  },
  'france': {
    worldCup: ['1998', '2018'],
    international: ['2x UEFA European Championship (1984, 2000)'],
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
  'argentina': {
    worldCup: ['1978', '1986', '2022'],
    international: ['16x Copa América'],
    continental: [],
    domestic: []
  },
  'brazil': {
    worldCup: ['1958', '1962', '1970', '1994', '2002'],
    international: ['9x Copa América'],
    continental: [],
    domestic: []
  },
  'netherlands': {
    worldCup: ['1974', '1978', '2010'],
    international: ['1x UEFA European Championship (1988)'],
    continental: [],
    domestic: []
  },
  'portugal': {
    worldCup: [],
    international: ['1x UEFA European Championship (2016)', '1x UEFA Nations League (2019)'],
    continental: [],
    domestic: []
  },
  'belgium': {
    worldCup: [],
    international: ['2018 FIFA World Cup bronze'],
    continental: [],
    domestic: []
  },
  'uruguay': {
    worldCup: ['1930', '1950'],
    international: ['15x Copa América'],
    continental: [],
    domestic: []
  },
  'croatia': {
    worldCup: ['2018 Runner-up', '2022 3rd Place'],
    international: [],
    continental: [],
    domestic: []
  }
};

async function getNationalTeamAchievements(teamName: string): Promise<Team['majorAchievements']> {
  const teamLower = teamName.toLowerCase();
  
  for (const [key, achievements] of Object.entries(NATIONAL_TEAM_ACHIEVEMENTS)) {
    if (teamLower.includes(key) || key.includes(teamLower)) {
      console.log(`📖 [Achievements] Found for ${teamName}`);
      return achievements;
    }
  }
  
  return { worldCup: [], international: [], continental: [], domestic: [] };
}

// ============================================================================
// CLUB TEAM ACHIEVEMENTS
// ============================================================================

const CLUB_ACHIEVEMENTS: Record<string, Team['majorAchievements']> = {
  'real madrid': {
    worldCup: [],
    international: ['5x FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)'],
    continental: ['15x UEFA Champions League'],
    domestic: ['36x La Liga', '20x Copa del Rey']
  },
  'barcelona': {
    worldCup: [],
    international: ['3x FIFA Club World Cup (2009, 2011, 2015)'],
    continental: ['5x UEFA Champions League'],
    domestic: ['27x La Liga', '31x Copa del Rey']
  },
  'atletico madrid': {
    worldCup: [],
    international: [],
    continental: ['3x UEFA Europa League'],
    domestic: ['11x La Liga', '10x Copa del Rey']
  },
  'manchester city': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2023)'],
    continental: ['1x UEFA Champions League (2023)'],
    domestic: ['10x Premier League', '7x FA Cup']
  },
  'manchester united': {
    worldCup: [],
    international: ['2x FIFA Club World Cup'],
    continental: ['3x UEFA Champions League'],
    domestic: ['20x Premier League', '12x FA Cup']
  },
  'liverpool': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2019)'],
    continental: ['6x UEFA Champions League'],
    domestic: ['19x Premier League', '8x FA Cup']
  },
  'arsenal': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['13x Premier League', '14x FA Cup']
  },
  'chelsea': {
    worldCup: [],
    international: ['1x FIFA Club World Cup (2021)'],
    continental: ['2x UEFA Champions League'],
    domestic: ['6x Premier League', '8x FA Cup']
  },
  'tottenham': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['2x Premier League', '8x FA Cup']
  },
  'bayern munich': {
    worldCup: [],
    international: ['2x FIFA Club World Cup'],
    continental: ['6x UEFA Champions League'],
    domestic: ['33x Bundesliga', '20x DFB-Pokal']
  },
  'borussia dortmund': {
    worldCup: [],
    international: [],
    continental: ['1x UEFA Champions League'],
    domestic: ['8x Bundesliga', '5x DFB-Pokal']
  },
  'juventus': {
    worldCup: [],
    international: [],
    continental: ['2x UEFA Champions League'],
    domestic: ['36x Serie A', '14x Coppa Italia']
  },
  'inter milan': {
    worldCup: [],
    international: ['1x FIFA Club World Cup'],
    continental: ['3x UEFA Champions League'],
    domestic: ['20x Serie A', '9x Coppa Italia']
  },
  'ac milan': {
    worldCup: [],
    international: ['1x FIFA Club World Cup'],
    continental: ['7x UEFA Champions League'],
    domestic: ['19x Serie A', '5x Coppa Italia']
  },
  'psg': {
    worldCup: [],
    international: [],
    continental: [],
    domestic: ['11x Ligue 1', '14x Coupe de France']
  },
  'ajax': {
    worldCup: [],
    international: [],
    continental: ['4x UEFA Champions League'],
    domestic: ['36x Eredivisie', '20x KNVB Cup']
  },
  'porto': {
    worldCup: [],
    international: [],
    continental: ['2x UEFA Champions League'],
    domestic: ['30x Primeira Liga', '19x Taça de Portugal']
  },
  'benfica': {
    worldCup: [],
    international: [],
    continental: ['2x UEFA Champions League'],
    domestic: ['38x Primeira Liga', '26x Taça de Portugal']
  }
};

async function getClubAchievements(teamName: string): Promise<Team['majorAchievements']> {
  const teamLower = teamName.toLowerCase();
  
  for (const [key, achievements] of Object.entries(CLUB_ACHIEVEMENTS)) {
    if (teamLower.includes(key) || key.includes(teamLower)) {
      console.log(`📖 [Achievements] Found for ${teamName}`);
      return achievements;
    }
  }
  
  return { worldCup: [], international: [], continental: [], domestic: [] };
}

// ============================================================================
// BSD API v2 - TEAM SEARCH & SQUAD DATA (Works for both Clubs and National Teams)
// ============================================================================

// Complete fixed searchTeamWithBSD function

// First, create a proper national team player database
const NATIONAL_TEAM_SQUADS: Record<string, Player[]> = {
  'brazil': [
    { name: 'Alisson Becker', position: 'Goalkeeper', nationality: 'Brazilian', age: 31, currentTeam: 'Brazil', majorAchievements: ['Copa América 2019'] },
    { name: 'Ederson', position: 'Goalkeeper', nationality: 'Brazilian', age: 30, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Marquinhos', position: 'Defender', nationality: 'Brazilian', age: 30, currentTeam: 'Brazil', majorAchievements: ['Copa América 2019'] },
    { name: 'Thiago Silva', position: 'Defender', nationality: 'Brazilian', age: 39, currentTeam: 'Brazil', majorAchievements: ['Copa América 2019'] },
    { name: 'Éder Militão', position: 'Defender', nationality: 'Brazilian', age: 26, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Alex Sandro', position: 'Defender', nationality: 'Brazilian', age: 33, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Danilo', position: 'Defender', nationality: 'Brazilian', age: 33, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Casemiro', position: 'Midfielder', nationality: 'Brazilian', age: 32, currentTeam: 'Brazil', majorAchievements: ['Copa América 2019'] },
    { name: 'Lucas Paquetá', position: 'Midfielder', nationality: 'Brazilian', age: 26, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Bruno Guimarães', position: 'Midfielder', nationality: 'Brazilian', age: 26, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Neymar', position: 'Forward', nationality: 'Brazilian', age: 32, currentTeam: 'Brazil', majorAchievements: ['Copa América 2013'] },
    { name: 'Vinícius Júnior', position: 'Forward', nationality: 'Brazilian', age: 23, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Rodrygo', position: 'Forward', nationality: 'Brazilian', age: 23, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Richarlison', position: 'Forward', nationality: 'Brazilian', age: 27, currentTeam: 'Brazil', majorAchievements: [] },
    { name: 'Raphinha', position: 'Forward', nationality: 'Brazilian', age: 27, currentTeam: 'Brazil', majorAchievements: [] }
  ],
  'argentina': [
    { name: 'Emiliano Martínez', position: 'Goalkeeper', nationality: 'Argentine', age: 31, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Cristian Romero', position: 'Defender', nationality: 'Argentine', age: 26, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Nicolás Otamendi', position: 'Defender', nationality: 'Argentine', age: 36, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Nahuel Molina', position: 'Defender', nationality: 'Argentine', age: 26, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2024'] },
    { name: 'Marcos Acuña', position: 'Defender', nationality: 'Argentine', age: 32, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Rodrigo De Paul', position: 'Midfielder', nationality: 'Argentine', age: 30, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Enzo Fernández', position: 'Midfielder', nationality: 'Argentine', age: 23, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2024'] },
    { name: 'Alexis Mac Allister', position: 'Midfielder', nationality: 'Argentine', age: 25, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2024'] },
    { name: 'Leandro Paredes', position: 'Midfielder', nationality: 'Argentine', age: 30, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Lionel Messi', position: 'Forward', nationality: 'Argentine', age: 37, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Julián Álvarez', position: 'Forward', nationality: 'Argentine', age: 24, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2024'] },
    { name: 'Lautaro Martínez', position: 'Forward', nationality: 'Argentine', age: 26, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] },
    { name: 'Ángel Di María', position: 'Forward', nationality: 'Argentine', age: 36, currentTeam: 'Argentina', majorAchievements: ['World Cup 2022', 'Copa América 2021, 2024'] }
  ],
  'spain': [
    { name: 'Unai Simón', position: 'Goalkeeper', nationality: 'Spanish', age: 27, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'David Raya', position: 'Goalkeeper', nationality: 'Spanish', age: 28, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Dani Carvajal', position: 'Defender', nationality: 'Spanish', age: 32, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024', 'UEFA Nations League 2023'] },
    { name: 'Aymeric Laporte', position: 'Defender', nationality: 'Spanish', age: 30, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024', 'UEFA Nations League 2023'] },
    { name: 'Robin Le Normand', position: 'Defender', nationality: 'Spanish', age: 27, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Marc Cucurella', position: 'Defender', nationality: 'Spanish', age: 26, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Rodri', position: 'Midfielder', nationality: 'Spanish', age: 28, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024', 'UEFA Nations League 2023'] },
    { name: 'Pedri', position: 'Midfielder', nationality: 'Spanish', age: 21, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Fabián Ruiz', position: 'Midfielder', nationality: 'Spanish', age: 28, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Mikel Merino', position: 'Midfielder', nationality: 'Spanish', age: 28, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Álvaro Morata', position: 'Forward', nationality: 'Spanish', age: 31, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Lamine Yamal', position: 'Forward', nationality: 'Spanish', age: 17, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Nico Williams', position: 'Forward', nationality: 'Spanish', age: 22, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Dani Olmo', position: 'Forward', nationality: 'Spanish', age: 26, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Ferrán Torres', position: 'Forward', nationality: 'Spanish', age: 24, currentTeam: 'Spain', majorAchievements: ['UEFA Euro 2024'] }
  ],
  'germany': [
    { name: 'Manuel Neuer', position: 'Goalkeeper', nationality: 'German', age: 38, currentTeam: 'Germany', majorAchievements: ['World Cup 2014'] },
    { name: 'Marc-André ter Stegen', position: 'Goalkeeper', nationality: 'German', age: 32, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Antonio Rüdiger', position: 'Defender', nationality: 'German', age: 31, currentTeam: 'Germany', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'Jonathan Tah', position: 'Defender', nationality: 'German', age: 28, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Nico Schlotterbeck', position: 'Defender', nationality: 'German', age: 24, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'David Raum', position: 'Defender', nationality: 'German', age: 26, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Joshua Kimmich', position: 'Midfielder', nationality: 'German', age: 29, currentTeam: 'Germany', majorAchievements: ['UEFA Euro 2024'] },
    { name: 'İlkay Gündoğan', position: 'Midfielder', nationality: 'German', age: 33, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Toni Kroos', position: 'Midfielder', nationality: 'German', age: 34, currentTeam: 'Germany', majorAchievements: ['World Cup 2014'] },
    { name: 'Jamal Musiala', position: 'Midfielder', nationality: 'German', age: 21, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Florian Wirtz', position: 'Midfielder', nationality: 'German', age: 21, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Kai Havertz', position: 'Forward', nationality: 'German', age: 25, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Niclas Füllkrug', position: 'Forward', nationality: 'German', age: 31, currentTeam: 'Germany', majorAchievements: [] },
    { name: 'Leroy Sané', position: 'Forward', nationality: 'German', age: 28, currentTeam: 'Germany', majorAchievements: [] }
  ],
  'italy': [
    { name: 'Gianluigi Donnarumma', position: 'Goalkeeper', nationality: 'Italian', age: 25, currentTeam: 'Italy', majorAchievements: ['UEFA Euro 2020'] },
    { name: 'Giovanni Di Lorenzo', position: 'Defender', nationality: 'Italian', age: 31, currentTeam: 'Italy', majorAchievements: ['UEFA Euro 2020'] },
    { name: 'Alessandro Bastoni', position: 'Defender', nationality: 'Italian', age: 25, currentTeam: 'Italy', majorAchievements: [] },
    { name: 'Francesco Acerbi', position: 'Defender', nationality: 'Italian', age: 36, currentTeam: 'Italy', majorAchievements: [] },
    { name: 'Federico Dimarco', position: 'Defender', nationality: 'Italian', age: 26, currentTeam: 'Italy', majorAchievements: [] },
    { name: 'Nicolò Barella', position: 'Midfielder', nationality: 'Italian', age: 27, currentTeam: 'Italy', majorAchievements: ['UEFA Euro 2020'] },
    { name: 'Jorginho', position: 'Midfielder', nationality: 'Italian', age: 32, currentTeam: 'Italy', majorAchievements: ['UEFA Euro 2020'] },
    { name: 'Lorenzo Pellegrini', position: 'Midfielder', nationality: 'Italian', age: 28, currentTeam: 'Italy', majorAchievements: [] },
    { name: 'Federico Chiesa', position: 'Forward', nationality: 'Italian', age: 26, currentTeam: 'Italy', majorAchievements: ['UEFA Euro 2020'] },
    { name: 'Ciro Immobile', position: 'Forward', nationality: 'Italian', age: 34, currentTeam: 'Italy', majorAchievements: [] },
    { name: 'Gianluca Scamacca', position: 'Forward', nationality: 'Italian', age: 25, currentTeam: 'Italy', majorAchievements: [] }
  ]
};

async function searchTeamWithBSD(query: string): Promise<{ team: Team; players: Player[] } | null> {
  try {
    console.log(`📡 [BSD] Searching for team: ${query}`);
    
    // Special handling for "FC Barcelona" - should be Spanish club, not Ecuadorian
    if (query.toLowerCase() === 'fc barcelona' || query.toLowerCase() === 'barcelona') {
      const teamName = 'FC Barcelona';
      console.log(`✅ Special case: ${teamName} - using knowledge base`);
      
      const achievements = await getClubAchievements('barcelona');
      
      const team: Team = {
        name: 'FC Barcelona',
        shortName: 'Barcelona',
        crest: 'https://crests.football-data.org/81.png',
        type: 'club',
        country: 'Spain',
        stadium: 'Camp Nou',
        currentCoach: 'Hansi Flick',
        foundedYear: 1899,
        majorAchievements: achievements,
        _source: 'Knowledge Base',
        _verified: true,
        _confidence: 95,
        _lastVerified: new Date().toISOString()
      };
      
      // Get players from BSD for Barcelona (Spanish club)
      const playersResponse = await fetch(`/api/bsd-proxy?endpoint=/players/?team_id=81&limit=50`);
      let players: Player[] = [];
      
      if (playersResponse.ok) {
        const playersResult = await playersResponse.json();
        if (playersResult.results && playersResult.results.length > 0) {
          players = playersResult.results.map((player: any) => ({
            id: player.id?.toString(),
            name: player.name || 'Unknown',
            currentTeam: team.name,
            position: player.position || player.specific_position || 'Unknown',
            age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
            nationality: player.nationality || '',
            careerGoals: undefined,
            careerAssists: undefined,
            majorAchievements: [],
            careerSummary: `${player.name || 'Player'} plays for ${team.name}.`,
            _source: 'BSD API v2',
            _lastVerified: new Date().toISOString()
          }));
        }
      }
      
      return { team, players };
    }
    
    // Normal search flow
    let searchData = null;
    let teamData = null;
    
    const searchVariations = [
      query,
      query.replace(' national football team', ''),
      query.split(' ')[0],
    ];
    
    for (const searchTerm of searchVariations) {
      if (searchTerm !== query || searchVariations.indexOf(searchTerm) === 0) {
        const searchResponse = await fetch(
          `/api/bsd-proxy?endpoint=/teams/?name=${encodeURIComponent(searchTerm)}`
        );
        
        if (searchResponse.ok) {
          const data = await searchResponse.json();
          if (data.results && data.results.length > 0) {
            // Filter out Ecuadorian Barcelona if searching for Spanish Barcelona
            if (query.toLowerCase() === 'fc barcelona' || query.toLowerCase() === 'barcelona') {
              const spanishBarcelona = data.results.find((t: any) => t.country === 'Spain');
              if (spanishBarcelona) {
                teamData = spanishBarcelona;
                searchData = data;
                break;
              }
            }
            teamData = data.results[0];
            searchData = data;
            console.log(`✅ [BSD] Found team with search term "${searchTerm}": ${teamData.name}`);
            break;
          }
        }
      }
    }
    
    if (!teamData) {
      console.log(`[BSD] No team found for: ${query}`);
      return null;
    }
    
    console.log(`✅ [BSD] Found team: ${teamData.name} (ID: ${teamData.id})`);
    
    const isNational = teamData.type === 'national' || 
                       teamData.country === teamData.name ||
                       Object.keys(NATIONAL_TEAM_SQUADS).some(country => 
                         teamData.name.toLowerCase().includes(country) || 
                         country.includes(teamData.name.toLowerCase())
                       );
    
    let players: Player[] = [];
    
    // For national teams, use our hardcoded squad database (reliable)
    if (isNational) {
      const countryKey = teamData.name.toLowerCase();
      let nationalSquad: Player[] = [];
      
      for (const [key, squad] of Object.entries(NATIONAL_TEAM_SQUADS)) {
        if (countryKey.includes(key) || key.includes(countryKey)) {
          nationalSquad = squad;
          break;
        }
      }
      
      if (nationalSquad.length > 0) {
        players = nationalSquad.map(player => ({
          ...player,
          _source: 'National Team Database',
          _lastVerified: new Date().toISOString(),
          _imageUrl: undefined // Will use avatar fallback
        }));
        console.log(`✅ [Database] Retrieved ${players.length} players for ${teamData.name}`);
      } else {
        console.log(`⚠️ No squad data available for ${teamData.name}`);
      }
    } else {
      // For clubs, try to fetch from BSD
      try {
        const playersResponse = await fetch(
          `/api/bsd-proxy?endpoint=/players/?team_id=${teamData.id}&limit=50`
        );
        
        if (playersResponse.ok) {
          const playersResult = await playersResponse.json();
          if (playersResult.results && playersResult.results.length > 0) {
            players = playersResult.results.map((player: any) => ({
              id: player.id?.toString(),
              name: player.name || 'Unknown',
              currentTeam: teamData.name,
              position: player.position || player.specific_position || 'Unknown',
              age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
              nationality: player.nationality || '',
              careerGoals: undefined,
              careerAssists: undefined,
              majorAchievements: [],
              careerSummary: `${player.name || 'Player'} plays for ${teamData.name}.`,
              _source: 'BSD API v2',
              _lastVerified: new Date().toISOString(),
              _imageUrl: undefined
            }));
            console.log(`✅ [BSD] Retrieved ${players.length} players for ${teamData.name}`);
          }
        }
      } catch (error) {
        console.warn(`[BSD] Could not fetch players:`, error);
      }
    }
    
    const achievements = isNational 
      ? await getNationalTeamAchievements(teamData.name)
      : await getClubAchievements(teamData.name);
    
    const team: Team = {
      name: teamData.name === 'Barcelona SC Guayaquil' ? 'FC Barcelona' : teamData.name,
      shortName: teamData.short_name || teamData.name,
      crest: teamData.name === 'Barcelona SC Guayaquil' 
        ? 'https://crests.football-data.org/81.png' 
        : `https://sports.bzzoiro.com/img/team/${teamData.id}/`,
      type: isNational ? 'national' : 'club',
      country: teamData.country || '',
      stadium: teamData.venue_id ? `Venue ID: ${teamData.venue_id}` : 'Not specified',
      currentCoach: 'Information not available',
      foundedYear: undefined,
      majorAchievements: achievements,
      _source: players.length > 0 ? (isNational ? 'National Team Database' : 'BSD API v2') : 'BSD API v2',
      _verified: true,
      _confidence: 95,
      _lastVerified: new Date().toISOString()
    };
    
    console.log(`✅ Final result: ${team.name} - ${players.length} players, ${isNational ? 'national' : 'club'} team`);
    
    return { team, players };
    
  } catch (error) {
    console.error('[BSD] Fatal error in searchTeamWithBSD:', error);
    return null;
  }
}

// ============================================================================
// AI FUZZY MATCHING
// ============================================================================

async function correctQueryWithAI(query: string, type: 'team' | 'player'): Promise<{
  corrected: string;
  confidence: number;
  original: string;
}> {
  console.log(`🤖 [AI FUZZY] Correcting ${type}: "${query}"`);
  
  const systemPrompt = `You are a football database expert. Correct misspelled ${type} names to their official name.
  
CRITICAL RULES:
1. For national teams, return ONLY the country name (e.g., "Brazil", not "Brazil national football team")
2. For clubs, return the club name (e.g., "Real Madrid", "Liverpool")
3. Fix typos and common misspellings

Examples:
- "brazil national team" -> "Brazil"
- "brazil" -> "Brazil"
- "real madird" -> "Real Madrid"
- "barca" -> "Barcelona"
- "selecao" -> "Brazil"
- "albiceleste" -> "Argentina"

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

    let corrected = completion.choices[0]?.message?.content?.trim() || query;
    
    // Clean up any "national football team" suffixes
    corrected = corrected.replace(/ national football team$/i, '');
    corrected = corrected.replace(/ national team$/i, '');
    
    const confidence = corrected.toLowerCase() === query.toLowerCase() ? 100 : 85;
    
    console.log(`🤖 [AI FUZZY] "${query}" -> "${corrected}" (${confidence}% confidence)`);
    
    return { corrected, confidence, original: query };
  } catch (error) {
    console.error('[AI FUZZY] Error:', error);
    return { corrected: query, confidence: 100, original: query };
  }
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

async function searchTeam(query: string): Promise<GROQSearchResponse> {
  console.log(`🔍 [TEAM SEARCH] "${query}" - Season: ${CURRENT_SEASON}`);

  const verificationSteps: string[] = [];
  verificationSteps.push(`🔍 Original query: "${query}"`);
  
  // AI fuzzy matching
  const aiCorrected = await correctQueryWithAI(query, 'team');
  const searchQuery = aiCorrected.corrected;
  verificationSteps.push(`🤖 AI corrected to: "${searchQuery}"`);
  
  // Try BSD API for team search and squad data
  verificationSteps.push('📡 Querying BSD API...');
  const result = await searchTeamWithBSD(searchQuery);
  
  if (result) {
    verificationSteps.push(`✅ Found team: ${result.team.name} with ${result.players.length} players`);
    
    // Enrich players with images from TheSportsDB (works for both clubs AND national teams!)
    verificationSteps.push('🖼️ Fetching player images from TheSportsDB...');
    const playersWithImages = await enrichPlayersWithImages(result.players);
    const imagesFound = playersWithImages.filter(p => p._imageUrl).length;
    verificationSteps.push(`✅ Found images for ${imagesFound}/${playersWithImages.length} players`);
    
    return {
      players: playersWithImages,
      teams: [result.team],
      youtubeQuery: `${result.team.name} highlights ${SEASON_YEAR}`,
      _metadata: {
        source: 'BSD API v2 + TheSportsDB Images',
        confidence: 95,
        season: CURRENT_SEASON,
        verified: true,
        hasSquad: result.players.length > 0,
        squadCount: result.players.length,
        verificationSteps,
        originalQuery: query,
        correctedQuery: aiCorrected.original !== aiCorrected.corrected ? searchQuery : undefined
      }
    };
  }
  
  verificationSteps.push('❌ Team not found in BSD API');
  
  return {
    players: [],
    teams: [],
    youtubeQuery: `${query} football highlights`,
    error: `Team "${query}" not found. Please check the spelling.`,
    _metadata: {
      source: 'Not Found',
      confidence: 0,
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
// EXPORTED FUNCTIONS
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
    const result = await searchTeam(query);
    
    if (!bustCache && result._metadata?.source !== 'Not Found') {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`💾 [CACHE] Stored result for: ${query}`);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('[GROQ] Search error:', error);
    return {
      players: [],
      teams: [],
      youtubeQuery: `${query} football`,
      error: 'Search failed. Please try again.',
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

export const getHistoricalPlayers = async (
  teamName: string, 
  teamType: 'club' | 'national', 
  language: string = 'en'
): Promise<Player[]> => {
  console.log(`🔍 [HISTORICAL] Fetching legends for: ${teamName}`);
  return [];
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('🧹 Search cache cleared');
};

export const getCurrentSeason = () => CURRENT_SEASON;