// app/api/worldcup/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 60;

// Group definitions
const GROUP_TEAMS: Record<string, string[]> = {
  'A': ['Mexico', 'South Africa', 'Korea Republic', 'Czechia'],
  'B': ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  'C': ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  'D': ['USA', 'Paraguay', 'Australia', 'Turkey'],
  'E': ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  'F': ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  'G': ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  'H': ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  'I': ['France', 'Senegal', 'Iraq', 'Norway'],
  'J': ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  'K': ['Portugal', 'Congo DR', 'Uzbekistan', 'Colombia'],
  'L': ['England', 'Croatia', 'Ghana', 'Panama']
};

// ============================================================
// COMPLETE KNOCKOUT RESULTS - FINAL UPDATED
// ============================================================
const KNOCKOUT_RESULTS = [
  // Round of 32
  { id: 73, stage: 'Round of 32', team1: 'South Africa', team2: 'Canada', date: '2026-06-28', time: '19:00', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'completed', score1: 0, score2: 1 },
  { id: 74, stage: 'Round of 32', team1: 'Brazil', team2: 'Japan', date: '2026-06-29', time: '17:00', venue: 'NRG Stadium', city: 'Houston', status: 'completed', score1: 2, score2: 1 },
  { id: 75, stage: 'Round of 32', team1: 'Germany', team2: 'Paraguay', date: '2026-06-29', time: '20:30', venue: 'Gillette Stadium', city: 'Boston', status: 'completed', score1: 1, score2: 1 },
  { id: 76, stage: 'Round of 32', team1: 'Netherlands', team2: 'Morocco', date: '2026-06-30', time: '01:00', venue: 'Estadio BBVA', city: 'Monterrey', status: 'completed', score1: 1, score2: 1 },
  { id: 77, stage: 'Round of 32', team1: 'Côte d\'Ivoire', team2: 'Norway', date: '2026-06-30', time: '17:00', venue: 'AT&T Stadium', city: 'Dallas', status: 'completed', score1: 1, score2: 2 },
  { id: 78, stage: 'Round of 32', team1: 'France', team2: 'Sweden', date: '2026-06-30', time: '21:00', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'completed', score1: 3, score2: 0 },
  { id: 79, stage: 'Round of 32', team1: 'Mexico', team2: 'Ecuador', date: '2026-07-01', time: '02:00', venue: 'Estadio Azteca', city: 'Mexico City', status: 'completed', score1: 2, score2: 0 },
  { id: 80, stage: 'Round of 32', team1: 'England', team2: 'Congo DR', date: '2026-07-01', time: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'completed', score1: 2, score2: 1 },
  { id: 81, stage: 'Round of 32', team1: 'Belgium', team2: 'Senegal', date: '2026-07-01', time: '20:00', venue: 'Lumen Field', city: 'Seattle', status: 'completed', score1: 3, score2: 2 },
  { id: 82, stage: 'Round of 32', team1: 'USA', team2: 'Bosnia & Herzegovina', date: '2026-07-02', time: '00:00', venue: "Levi's Stadium", city: 'San Francisco', status: 'completed', score1: 2, score2: 0 },
  { id: 83, stage: 'Round of 32', team1: 'Spain', team2: 'Austria', date: '2026-07-02', time: '19:00', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'completed', score1: 3, score2: 0 },
  { id: 84, stage: 'Round of 32', team1: 'Portugal', team2: 'Croatia', date: '2026-07-02', time: '23:00', venue: 'BMO Field', city: 'Toronto', status: 'completed', score1: 2, score2: 1 },
  { id: 85, stage: 'Round of 32', team1: 'Switzerland', team2: 'Algeria', date: '2026-07-03', time: '03:00', venue: 'BC Place', city: 'Vancouver', status: 'completed', score1: 2, score2: 0 },
  { id: 86, stage: 'Round of 32', team1: 'Australia', team2: 'Egypt', date: '2026-07-03', time: '18:00', venue: 'AT&T Stadium', city: 'Dallas', status: 'completed', score1: 1, score2: 1 },
  { id: 87, stage: 'Round of 32', team1: 'Argentina', team2: 'Cabo Verde', date: '2026-07-03', time: '22:00', venue: 'Hard Rock Stadium', city: 'Miami', status: 'completed', score1: 3, score2: 2 },
  { id: 88, stage: 'Round of 32', team1: 'Colombia', team2: 'Ghana', date: '2026-07-04', time: '01:30', venue: 'Arrowhead Stadium', city: 'Kansas City', status: 'completed', score1: 1, score2: 0 },

  // Round of 16
  { id: 89, stage: 'Round of 16', team1: 'Canada', team2: 'Morocco', date: '2026-07-04', time: '17:00', venue: 'NRG Stadium', city: 'Houston', status: 'completed', score1: 0, score2: 3 },
  { id: 90, stage: 'Round of 16', team1: 'Paraguay', team2: 'France', date: '2026-07-04', time: '21:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', status: 'completed', score1: 0, score2: 1 },
  { id: 91, stage: 'Round of 16', team1: 'Brazil', team2: 'Norway', date: '2026-07-05', time: '20:00', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'completed', score1: 1, score2: 2 },
  { id: 92, stage: 'Round of 16', team1: 'Mexico', team2: 'England', date: '2026-07-05', time: '22:00', venue: 'Estadio Azteca', city: 'Mexico City', status: 'completed', score1: 2, score2: 3 },
  { id: 93, stage: 'Round of 16', team1: 'Portugal', team2: 'Spain', date: '2026-07-06', time: '20:00', venue: 'AT&T Stadium', city: 'Dallas', status: 'completed', score1: 0, score2: 1 },
  { id: 94, stage: 'Round of 16', team1: 'USA', team2: 'Belgium', date: '2026-07-06', time: '23:00', venue: 'Lumen Field', city: 'Seattle', status: 'completed', score1: 1, score2: 4 },
  { id: 95, stage: 'Round of 16', team1: 'Argentina', team2: 'Egypt', date: '2026-07-07', time: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'completed', score1: 3, score2: 2 },
  { id: 96, stage: 'Round of 16', team1: 'Switzerland', team2: 'Colombia', date: '2026-07-07', time: '20:00', venue: 'BC Place', city: 'Vancouver', status: 'completed', score1: 0, score2: 0 },

  // Quarter-finals
  { id: 97, stage: 'Quarter-final', team1: 'France', team2: 'Morocco', date: '2026-07-09', time: '20:00', venue: 'Gillette Stadium', city: 'Boston', status: 'completed', score1: 2, score2: 0 },
  { id: 98, stage: 'Quarter-final', team1: 'Spain', team2: 'Belgium', date: '2026-07-10', time: '21:00', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'completed', score1: 2, score2: 1 },
  { id: 99, stage: 'Quarter-final', team1: 'Norway', team2: 'England', date: '2026-07-11', time: '01:00', venue: 'Hard Rock Stadium', city: 'Miami', status: 'completed', score1: 1, score2: 2 },
  { id: 100, stage: 'Quarter-final', team1: 'Argentina', team2: 'Switzerland', date: '2026-07-11', time: '23:00', venue: 'Arrowhead Stadium', city: 'Kansas City', status: 'completed', score1: 3, score2: 1 },

  // Semi-finals
  { id: 101, stage: 'Semi-final', team1: 'France', team2: 'Spain', date: '2026-07-14', time: '21:00', venue: 'AT&T Stadium', city: 'Dallas', status: 'completed', score1: 0, score2: 2 },
  { id: 102, stage: 'Semi-final', team1: 'England', team2: 'Argentina', date: '2026-07-15', time: '21:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'completed', score1: 1, score2: 2 },

  // Third-place match - FINAL RESULT
  { id: 103, stage: 'Third-place', team1: 'France', team2: 'England', date: '2026-07-18', time: '23:00', venue: 'Hard Rock Stadium', city: 'Miami', status: 'completed', score1: 4, score2: 6 },

  // FINAL - SPAIN WINS 1-0
  { id: 104, stage: 'Final', team1: 'Spain', team2: 'Argentina', date: '2026-07-19', time: '21:00', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'completed', score1: 1, score2: 0 }
];

const BSD_API_KEY = process.env.NEXT_PUBLIC_BSD_API_KEY;

async function fetchLiveWorldCupMatches() {
  if (!BSD_API_KEY) {
    console.warn('BSD_API_KEY not configured, using fallback static data');
    return null;
  }

  try {
    const response = await fetch(
      `https://sports.bzzoiro.com/api/v2/events/?league_id=27&season_id=188&limit=250`,
      {
        headers: {
          'Authorization': `Token ${BSD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      console.warn(`BSD API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching live World Cup data:', error);
    return null;
  }
}

function mapBSDStatus(status: string): 'scheduled' | 'live' | 'completed' {
  if (status === 'inprogress' || status === 'live') return 'live';
  if (status === 'finished') return 'completed';
  return 'scheduled';
}

function extractGroupLetter(groupName: string | null): string {
  if (!groupName) return 'A';
  const match = groupName.match(/Group ([A-L])/);
  return match ? match[1] : 'A';
}

const VALID_TEAMS = [
  'Mexico', 'South Africa', 'Korea Republic', 'Czechia',
  'Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland',
  'Brazil', 'Morocco', 'Haiti', 'Scotland',
  'USA', 'Paraguay', 'Australia', 'Turkey',
  'Germany', 'Curaçao', 'Ivory Coast', 'Ecuador',
  'Netherlands', 'Japan', 'Sweden', 'Tunisia',
  'Belgium', 'Egypt', 'Iran', 'New Zealand',
  'Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay',
  'France', 'Senegal', 'Iraq', 'Norway',
  'Argentina', 'Algeria', 'Austria', 'Jordan',
  'Portugal', 'Congo DR', 'Uzbekistan', 'Colombia',
  'England', 'Croatia', 'Ghana', 'Panama'
];

function isValidMatch(homeTeam: string, awayTeam: string): boolean {
  return VALID_TEAMS.includes(homeTeam) && VALID_TEAMS.includes(awayTeam);
}

export async function GET() {
  let liveMatches = await fetchLiveWorldCupMatches();
  
  let groupMatches: any[] = [];
  let knockoutMatches: any[] = [];

  if (liveMatches) {
    // Process group stage matches
    const groupStageMatches = liveMatches.filter((match: any) => 
      isValidMatch(match.home_team, match.away_team) &&
      match.group_name && 
      match.group_name !== ''
    );
    
    groupMatches = groupStageMatches.map((match: any) => ({
      id: match.id,
      date: match.event_date ? new Date(match.event_date).toISOString().split('T')[0] : '2026-06-11',
      time: match.event_date ? new Date(match.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '00:00',
      group: extractGroupLetter(match.group_name),
      team1: match.home_team,
      team2: match.away_team,
      venue: match.venue?.name || 'TBD',
      city: match.venue?.city || 'TBD',
      status: mapBSDStatus(match.status),
      score1: match.home_score ?? undefined,
      score2: match.away_score ?? undefined
    }));
    
    knockoutMatches = KNOCKOUT_RESULTS;
  }
  
  if (!liveMatches) {
    return getStaticData();
  }

  const groups = Object.keys(GROUP_TEAMS).map(groupId => {
    const groupMatchesList = groupMatches
      .filter((match: any) => match.group === groupId)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      id: groupId,
      name: `Group ${groupId}`,
      teams: GROUP_TEAMS[groupId],
      matches: groupMatchesList
    };
  });

  const worldcupData = {
    success: true,
    tournamentName: "FIFA World Cup 2026",
    tournamentStart: "2026-06-11",
    tournamentEnd: "2026-07-19",
    hostCountries: ["USA", "Canada", "Mexico"],
    totalMatches: groupMatches.length + knockoutMatches.length,
    lastUpdated: new Date().toISOString(),
    groups: groups,
    knockout: knockoutMatches
  };

  return NextResponse.json(worldcupData, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
    }
  });
}

function getStaticData() {
  // ... existing static data ...
  const worldcupData = {
    success: true,
    tournamentName: "FIFA World Cup 2026",
    tournamentStart: "2026-06-11",
    tournamentEnd: "2026-07-19",
    hostCountries: ["USA", "Canada", "Mexico"],
    totalMatches: 104,
    lastUpdated: new Date().toISOString(),
    groups: [],
    knockout: KNOCKOUT_RESULTS
  };

  return NextResponse.json(worldcupData, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
    }
  });
}