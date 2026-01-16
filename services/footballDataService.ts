// /services/footballDataService.ts

const FOOTBALL_DATA_API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

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
}

interface FootballDataPlayer {
  id: number;
  name: string;
  position: string;
  dateOfBirth: string;
  nationality: string;
  shirtNumber?: number;
}

interface FootballDataTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  founded: number;
  clubColors: string;
  venue: string;
  coach: {
    id: number;
    name: string;
    nationality: string;
  };
  squad: FootballDataPlayer[];
}

// Helper to fetch data (Server vs Client handling)
const fetchFromApi = async (endpoint: string) => {
  // If server-side, fetch directly
  if (typeof window === 'undefined') {
    return fetch(`${FOOTBALL_DATA_BASE_URL}${endpoint}`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY || '' },
    });
  } 
  // If client-side, use proxy to avoid CORS
  else {
    return fetch(`/api/football-data?endpoint=${encodeURIComponent(endpoint)}`);
  }
};

export const fetchTeamFromFootballData = async (teamName: string): Promise<FootballDataTeam | null> => {
  if (!FOOTBALL_DATA_API_KEY) {
    console.error('[Football Data] API key not configured');
    return null;
  }

  try {
    // First search for team ID
    const searchResponse = await fetchFromApi(`/teams?name=${encodeURIComponent(teamName)}`);

    if (!searchResponse.ok) {
      console.error('[Football Data] Search failed:', searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (searchData.teams.length === 0) {
      console.error('[Football Data] No team found for:', teamName);
      return null;
    }

    // Get the first matching team
    const teamId = searchData.teams[0].id;
    
    // Fetch detailed team data with squad
    const teamResponse = await fetchFromApi(`/teams/${teamId}`);

    if (!teamResponse.ok) {
      console.error('[Football Data] Team fetch failed:', teamResponse.status);
      return null;
    }

    return await teamResponse.json();
  } catch (error) {
    console.error('[Football Data] Error:', error);
    return null;
  }
};

// Map Football Data positions to your format
const mapPosition = (position: string): string => {
  const positionMap: Record<string, string> = {
    'Goalkeeper': 'Goalkeeper',
    'Defence': 'Defender',
    'Midfield': 'Midfielder',
    'Offence': 'Forward',
    'ATTACKING_MIDFIELD': 'Midfielder',
    'CENTRAL_MIDFIELD': 'Midfielder',
    'DEFENSIVE_MIDFIELD': 'Midfielder',
    'LEFT_BACK': 'Defender',
    'RIGHT_BACK': 'Defender',
    'CENTRE_BACK': 'Defender',
    'LEFT_WINGER': 'Forward',
    'RIGHT_WINGER': 'Forward',
    'CENTRE_FORWARD': 'Forward',
  };
  
  return positionMap[position] || position;
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const convertFootballDataToPlayers = (teamData: FootballDataTeam): Player[] => {
  return teamData.squad.map(player => ({
    name: player.name,
    currentTeam: teamData.name,
    position: mapPosition(player.position),
    age: calculateAge(player.dateOfBirth),
    nationality: player.nationality,
    careerGoals: undefined, // We don't have this data
    careerAssists: undefined,
    internationalAppearances: undefined,
    internationalGoals: undefined,
    majorAchievements: [], // Will be populated from Wikipedia
    careerSummary: `${player.name} plays for ${teamData.name} as a ${mapPosition(player.position)}.`,
    _source: 'Football-Data.org',
    _lastVerified: new Date().toISOString(),
  }));
};