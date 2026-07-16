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
// CORRECT KNOCKOUT RESULTS - BASED ON ACTUAL 2026 WORLD CUP
// ============================================================
const KNOCKOUT_RESULTS = [
  // Round of 32 (Jun 28 - Jul 4)
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

  // Round of 16 (Jul 4-7)
  { id: 89, stage: 'Round of 16', team1: 'Canada', team2: 'Morocco', date: '2026-07-04', time: '17:00', venue: 'NRG Stadium', city: 'Houston', status: 'completed', score1: 0, score2: 3 },
  { id: 90, stage: 'Round of 16', team1: 'Paraguay', team2: 'France', date: '2026-07-04', time: '21:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', status: 'completed', score1: 0, score2: 1 },
  { id: 91, stage: 'Round of 16', team1: 'Brazil', team2: 'Norway', date: '2026-07-05', time: '20:00', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'completed', score1: 1, score2: 2 },
  { id: 92, stage: 'Round of 16', team1: 'Mexico', team2: 'England', date: '2026-07-05', time: '22:00', venue: 'Estadio Azteca', city: 'Mexico City', status: 'completed', score1: 2, score2: 3 },
  { id: 93, stage: 'Round of 16', team1: 'Portugal', team2: 'Spain', date: '2026-07-06', time: '20:00', venue: 'AT&T Stadium', city: 'Dallas', status: 'completed', score1: 0, score2: 1 },
  { id: 94, stage: 'Round of 16', team1: 'USA', team2: 'Belgium', date: '2026-07-06', time: '23:00', venue: 'Lumen Field', city: 'Seattle', status: 'completed', score1: 1, score2: 4 },
  { id: 95, stage: 'Round of 16', team1: 'Argentina', team2: 'Egypt', date: '2026-07-07', time: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'completed', score1: 3, score2: 2 },
  { id: 96, stage: 'Round of 16', team1: 'Switzerland', team2: 'Colombia', date: '2026-07-07', time: '20:00', venue: 'BC Place', city: 'Vancouver', status: 'completed', score1: 0, score2: 0 },

  // Quarter-finals (Jul 9-11)
  { id: 97, stage: 'Quarter-final', team1: 'France', team2: 'Morocco', date: '2026-07-09', time: '20:00', venue: 'Gillette Stadium', city: 'Boston', status: 'completed', score1: 2, score2: 0 },
  { id: 98, stage: 'Quarter-final', team1: 'Spain', team2: 'Belgium', date: '2026-07-10', time: '21:00', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'completed', score1: 2, score2: 1 },
  { id: 99, stage: 'Quarter-final', team1: 'Norway', team2: 'England', date: '2026-07-11', time: '01:00', venue: 'Hard Rock Stadium', city: 'Miami', status: 'completed', score1: 1, score2: 2 },
  { id: 100, stage: 'Quarter-final', team1: 'Argentina', team2: 'Switzerland', date: '2026-07-11', time: '23:00', venue: 'Arrowhead Stadium', city: 'Kansas City', status: 'completed', score1: 3, score2: 1 },

  // Semi-finals (Jul 14-15)
  { id: 101, stage: 'Semi-final', team1: 'France', team2: 'Spain', date: '2026-07-14', time: '21:00', venue: 'AT&T Stadium', city: 'Dallas', status: 'completed', score1: 0, score2: 2 },
  { id: 102, stage: 'Semi-final', team1: 'England', team2: 'Argentina', date: '2026-07-15', time: '21:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'completed', score1: 1, score2: 2 },

  // Third-place match (Jul 18)
  { id: 103, stage: 'Third-place', team1: 'France', team2: 'England', date: '2026-07-18', time: '23:00', venue: 'Hard Rock Stadium', city: 'Miami', status: 'scheduled' },

  // Final (Jul 19)
  { id: 104, stage: 'Final', team1: 'Spain', team2: 'Argentina', date: '2026-07-19', time: '21:00', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'scheduled' }
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
    
    // Use KNOCKOUT_RESULTS
    knockoutMatches = KNOCKOUT_RESULTS;
  }
  
  // If no live data, use static data
  if (!liveMatches) {
    return getStaticData();
  }

  // Build groups
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

// Fallback static data
function getStaticData() {
  // Group A
  const groupA = {
    id: "A",
    name: "Group A",
    teams: ["Mexico", "South Africa", "Korea Republic", "Czechia"],
    matches: [
      { id: 1, date: "2026-06-11", time: "21:00", group: "A", team1: "Mexico", team2: "South Africa", venue: "Estadio Azteca", city: "Mexico City", status: "completed", score1: 2, score2: 0 },
      { id: 2, date: "2026-06-12", time: "04:00", group: "A", team1: "Korea Republic", team2: "Czechia", venue: "Estadio Akron", city: "Guadalajara", status: "completed", score1: 2, score2: 1 },
      { id: 3, date: "2026-06-18", time: "18:00", group: "A", team1: "Czechia", team2: "South Africa", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "completed", score1: 1, score2: 1 },
      { id: 4, date: "2026-06-19", time: "03:00", group: "A", team1: "Mexico", team2: "Korea Republic", venue: "Estadio Akron", city: "Guadalajara", status: "completed", score1: 1, score2: 0 },
      { id: 5, date: "2026-06-25", time: "03:00", group: "A", team1: "Czechia", team2: "Mexico", venue: "Estadio Azteca", city: "Mexico City", status: "completed", score1: 0, score2: 3 },
      { id: 6, date: "2026-06-25", time: "03:00", group: "A", team1: "South Africa", team2: "Korea Republic", venue: "Estadio BBVA", city: "Monterrey", status: "completed", score1: 1, score2: 0 }
    ]
  };

  // Group B
  const groupB = {
    id: "B",
    name: "Group B",
    teams: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    matches: [
      { id: 7, date: "2026-06-12", time: "21:00", group: "B", team1: "Canada", team2: "Bosnia and Herzegovina", venue: "BMO Field", city: "Toronto", status: "completed", score1: 1, score2: 1 },
      { id: 8, date: "2026-06-13", time: "21:00", group: "B", team1: "Qatar", team2: "Switzerland", venue: "Levi's Stadium", city: "San Francisco", status: "completed", score1: 0, score2: 2 },
      { id: 9, date: "2026-06-18", time: "21:00", group: "B", team1: "Switzerland", team2: "Bosnia and Herzegovina", venue: "SoFi Stadium", city: "Los Angeles", status: "completed", score1: 4, score2: 1 },
      { id: 10, date: "2026-06-19", time: "00:00", group: "B", team1: "Canada", team2: "Qatar", venue: "BC Place", city: "Vancouver", status: "completed", score1: 2, score2: 0 },
      { id: 11, date: "2026-06-24", time: "21:00", group: "B", team1: "Bosnia and Herzegovina", team2: "Qatar", venue: "Lumen Field", city: "Seattle", status: "completed", score1: 3, score2: 1 },
      { id: 12, date: "2026-06-24", time: "21:00", group: "B", team1: "Switzerland", team2: "Canada", venue: "BC Place", city: "Vancouver", status: "completed", score1: 0, score2: 0 }
    ]
  };

  // Group C
  const groupC = {
    id: "C",
    name: "Group C",
    teams: ["Brazil", "Morocco", "Haiti", "Scotland"],
    matches: [
      { id: 13, date: "2026-06-14", time: "00:00", group: "C", team1: "Brazil", team2: "Morocco", venue: "MetLife Stadium", city: "New York/New Jersey", status: "completed", score1: 2, score2: 0 },
      { id: 14, date: "2026-06-14", time: "03:00", group: "C", team1: "Haiti", team2: "Scotland", venue: "Gillette Stadium", city: "Boston", status: "completed", score1: 0, score2: 2 },
      { id: 15, date: "2026-06-20", time: "00:00", group: "C", team1: "Scotland", team2: "Morocco", venue: "Gillette Stadium", city: "Boston", status: "completed", score1: 1, score2: 1 },
      { id: 16, date: "2026-06-20", time: "02:30", group: "C", team1: "Brazil", team2: "Haiti", venue: "Lincoln Financial Field", city: "Philadelphia", status: "completed", score1: 4, score2: 0 },
      { id: 17, date: "2026-06-25", time: "00:00", group: "C", team1: "Scotland", team2: "Brazil", venue: "Hard Rock Stadium", city: "Miami", status: "completed", score1: 0, score2: 3 },
      { id: 18, date: "2026-06-25", time: "03:00", group: "C", team1: "Morocco", team2: "Haiti", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "completed", score1: 2, score2: 0 }
    ]
  };

  // Group D
  const groupD = {
    id: "D",
    name: "Group D",
    teams: ["USA", "Paraguay", "Australia", "Turkey"],
    matches: [
      { id: 19, date: "2026-06-13", time: "03:00", group: "D", team1: "USA", team2: "Paraguay", venue: "SoFi Stadium", city: "Los Angeles", status: "completed", score1: 4, score2: 1 },
      { id: 20, date: "2026-06-14", time: "06:00", group: "D", team1: "Australia", team2: "Turkey", venue: "BC Place", city: "Vancouver", status: "completed", score1: 2, score2: 0 },
      { id: 21, date: "2026-06-19", time: "21:00", group: "D", team1: "USA", team2: "Australia", venue: "Lumen Field", city: "Seattle", status: "completed", score1: 2, score2: 0 },
      { id: 22, date: "2026-06-20", time: "05:00", group: "D", team1: "Turkey", team2: "Paraguay", venue: "Levi's Stadium", city: "San Francisco", status: "completed", score1: 0, score2: 1 },
      { id: 23, date: "2026-06-26", time: "04:00", group: "D", team1: "Paraguay", team2: "Australia", venue: "Levi's Stadium", city: "San Francisco", status: "completed", score1: 0, score2: 1 },
      { id: 24, date: "2026-06-26", time: "04:00", group: "D", team1: "Turkey", team2: "USA", venue: "SoFi Stadium", city: "Los Angeles", status: "completed", score1: 3, score2: 2 }
    ]
  };

  // Group E
  const groupE = {
    id: "E",
    name: "Group E",
    teams: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    matches: [
      { id: 25, date: "2026-06-14", time: "19:00", group: "E", team1: "Germany", team2: "Curaçao", venue: "NRG Stadium", city: "Houston", status: "completed", score1: 3, score2: 0 },
      { id: 26, date: "2026-06-15", time: "01:00", group: "E", team1: "Ivory Coast", team2: "Ecuador", venue: "Lincoln Financial Field", city: "Philadelphia", status: "completed", score1: 1, score2: 0 },
      { id: 27, date: "2026-06-20", time: "22:00", group: "E", team1: "Germany", team2: "Ivory Coast", venue: "BMO Field", city: "Toronto", status: "completed", score1: 2, score2: 1 },
      { id: 28, date: "2026-06-21", time: "02:00", group: "E", team1: "Ecuador", team2: "Curaçao", venue: "Arrowhead Stadium", city: "Kansas City", status: "completed", score1: 1, score2: 0 },
      { id: 29, date: "2026-06-25", time: "22:00", group: "E", team1: "Curaçao", team2: "Ivory Coast", venue: "Lincoln Financial Field", city: "Philadelphia", status: "completed", score1: 0, score2: 2 },
      { id: 30, date: "2026-06-25", time: "22:00", group: "E", team1: "Ecuador", team2: "Germany", venue: "MetLife Stadium", city: "New York/New Jersey", status: "completed", score1: 0, score2: 1 }
    ]
  };

  // Group F
  const groupF = {
    id: "F",
    name: "Group F",
    teams: ["Netherlands", "Japan", "Sweden", "Tunisia"],
    matches: [
      { id: 31, date: "2026-06-14", time: "22:00", group: "F", team1: "Netherlands", team2: "Japan", venue: "AT&T Stadium", city: "Dallas", status: "completed", score1: 2, score2: 0 },
      { id: 32, date: "2026-06-15", time: "04:00", group: "F", team1: "Sweden", team2: "Tunisia", venue: "Estadio BBVA", city: "Monterrey", status: "completed", score1: 1, score2: 1 },
      { id: 33, date: "2026-06-20", time: "19:00", group: "F", team1: "Netherlands", team2: "Sweden", venue: "NRG Stadium", city: "Houston", status: "completed", score1: 2, score2: 1 },
      { id: 34, date: "2026-06-21", time: "06:00", group: "F", team1: "Tunisia", team2: "Japan", venue: "Estadio BBVA", city: "Monterrey", status: "completed", score1: 0, score2: 1 },
      { id: 35, date: "2026-06-26", time: "01:00", group: "F", team1: "Japan", team2: "Sweden", venue: "AT&T Stadium", city: "Dallas", status: "completed", score1: 0, score2: 2 },
      { id: 36, date: "2026-06-26", time: "01:00", group: "F", team1: "Tunisia", team2: "Netherlands", venue: "Arrowhead Stadium", city: "Kansas City", status: "completed", score1: 0, score2: 3 }
    ]
  };

  // Group G
  const groupG = {
    id: "G",
    name: "Group G",
    teams: ["Belgium", "Egypt", "Iran", "New Zealand"],
    matches: [
      { id: 37, date: "2026-06-15", time: "21:00", group: "G", team1: "Belgium", team2: "Egypt", venue: "Lumen Field", city: "Seattle", status: "completed", score1: 2, score2: 0 },
      { id: 38, date: "2026-06-16", time: "03:00", group: "G", team1: "Iran", team2: "New Zealand", venue: "SoFi Stadium", city: "Los Angeles", status: "completed", score1: 1, score2: 1 },
      { id: 39, date: "2026-06-21", time: "21:00", group: "G", team1: "Belgium", team2: "Iran", venue: "SoFi Stadium", city: "Los Angeles", status: "completed", score1: 2, score2: 1 },
      { id: 40, date: "2026-06-22", time: "03:00", group: "G", team1: "New Zealand", team2: "Egypt", venue: "BC Place", city: "Vancouver", status: "completed", score1: 0, score2: 2 },
      { id: 41, date: "2026-06-27", time: "05:00", group: "G", team1: "Egypt", team2: "Iran", venue: "Lumen Field", city: "Seattle", status: "completed", score1: 1, score2: 1 },
      { id: 42, date: "2026-06-27", time: "05:00", group: "G", team1: "New Zealand", team2: "Belgium", venue: "BC Place", city: "Vancouver", status: "completed", score1: 0, score2: 2 }
    ]
  };

  // Group H
  const groupH = {
    id: "H",
    name: "Group H",
    teams: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"],
    matches: [
      { id: 43, date: "2026-06-15", time: "18:00", group: "H", team1: "Spain", team2: "Cabo Verde", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "completed", score1: 3, score2: 0 },
      { id: 44, date: "2026-06-16", time: "00:00", group: "H", team1: "Saudi Arabia", team2: "Uruguay", venue: "Hard Rock Stadium", city: "Miami", status: "completed", score1: 0, score2: 2 },
      { id: 45, date: "2026-06-21", time: "18:00", group: "H", team1: "Spain", team2: "Saudi Arabia", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "completed", score1: 3, score2: 0 },
      { id: 46, date: "2026-06-22", time: "00:00", group: "H", team1: "Uruguay", team2: "Cabo Verde", venue: "Hard Rock Stadium", city: "Miami", status: "completed", score1: 2, score2: 1 },
      { id: 47, date: "2026-06-27", time: "02:00", group: "H", team1: "Uruguay", team2: "Spain", venue: "Estadio Akron", city: "Guadalajara", status: "completed", score1: 1, score2: 2 },
      { id: 48, date: "2026-06-27", time: "02:00", group: "H", team1: "Cabo Verde", team2: "Saudi Arabia", venue: "NRG Stadium", city: "Houston", status: "completed", score1: 0, score2: 1 }
    ]
  };

  // Group I
  const groupI = {
    id: "I",
    name: "Group I",
    teams: ["France", "Senegal", "Iraq", "Norway"],
    matches: [
      { id: 49, date: "2026-06-16", time: "21:00", group: "I", team1: "France", team2: "Senegal", venue: "MetLife Stadium", city: "New York/New Jersey", status: "completed", score1: 2, score2: 0 },
      { id: 50, date: "2026-06-17", time: "00:00", group: "I", team1: "Iraq", team2: "Norway", venue: "Gillette Stadium", city: "Boston", status: "completed", score1: 0, score2: 2 },
      { id: 51, date: "2026-06-22", time: "23:00", group: "I", team1: "France", team2: "Iraq", venue: "Lincoln Financial Field", city: "Philadelphia", status: "completed", score1: 3, score2: 0 },
      { id: 52, date: "2026-06-23", time: "02:00", group: "I", team1: "Norway", team2: "Senegal", venue: "MetLife Stadium", city: "New York/New Jersey", status: "completed", score1: 1, score2: 1 },
      { id: 53, date: "2026-06-26", time: "21:00", group: "I", team1: "Senegal", team2: "Iraq", venue: "BMO Field", city: "Toronto", status: "completed", score1: 2, score2: 0 },
      { id: 54, date: "2026-06-26", time: "21:00", group: "I", team1: "Norway", team2: "France", venue: "Gillette Stadium", city: "Boston", status: "completed", score1: 0, score2: 2 }
    ]
  };

  // Group J
  const groupJ = {
    id: "J",
    name: "Group J",
    teams: ["Argentina", "Algeria", "Austria", "Jordan"],
    matches: [
      { id: 55, date: "2026-06-17", time: "03:00", group: "J", team1: "Argentina", team2: "Algeria", venue: "Arrowhead Stadium", city: "Kansas City", status: "completed", score1: 2, score2: 0 },
      { id: 56, date: "2026-06-17", time: "06:00", group: "J", team1: "Austria", team2: "Jordan", venue: "Levi's Stadium", city: "San Francisco", status: "completed", score1: 1, score2: 0 },
      { id: 57, date: "2026-06-22", time: "19:00", group: "J", team1: "Argentina", team2: "Austria", venue: "AT&T Stadium", city: "Dallas", status: "completed", score1: 2, score2: 0 },
      { id: 58, date: "2026-06-23", time: "05:00", group: "J", team1: "Jordan", team2: "Algeria", venue: "Levi's Stadium", city: "San Francisco", status: "completed", score1: 0, score2: 2 },
      { id: 59, date: "2026-06-28", time: "04:00", group: "J", team1: "Algeria", team2: "Austria", venue: "AT&T Stadium", city: "Dallas", status: "completed", score1: 1, score2: 1 },
      { id: 60, date: "2026-06-28", time: "04:00", group: "J", team1: "Jordan", team2: "Argentina", venue: "Arrowhead Stadium", city: "Kansas City", status: "completed", score1: 0, score2: 3 }
    ]
  };

  // Group K
  const groupK = {
    id: "K",
    name: "Group K",
    teams: ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
    matches: [
      { id: 61, date: "2026-06-17", time: "19:00", group: "K", team1: "Portugal", team2: "Congo DR", venue: "NRG Stadium", city: "Houston", status: "completed", score1: 1, score2: 1 },
      { id: 62, date: "2026-06-18", time: "04:00", group: "K", team1: "Uzbekistan", team2: "Colombia", venue: "Estadio Azteca", city: "Mexico City", status: "completed", score1: 0, score2: 2 },
      { id: 63, date: "2026-06-23", time: "19:00", group: "K", team1: "Portugal", team2: "Uzbekistan", venue: "NRG Stadium", city: "Houston", status: "completed", score1: 2, score2: 0 },
      { id: 64, date: "2026-06-24", time: "04:00", group: "K", team1: "Colombia", team2: "Congo DR", venue: "Estadio Akron", city: "Guadalajara", status: "completed", score1: 1, score2: 0 },
      { id: 65, date: "2026-06-28", time: "01:30", group: "K", team1: "Colombia", team2: "Portugal", venue: "Hard Rock Stadium", city: "Miami", status: "completed", score1: 2, score2: 1 },
      { id: 66, date: "2026-06-28", time: "01:30", group: "K", team1: "Congo DR", team2: "Uzbekistan", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "completed", score1: 3, score2: 1 }
    ]
  };

  // Group L
  const groupL = {
    id: "L",
    name: "Group L",
    teams: ["England", "Croatia", "Ghana", "Panama"],
    matches: [
      { id: 67, date: "2026-06-17", time: "22:00", group: "L", team1: "England", team2: "Croatia", venue: "AT&T Stadium", city: "Dallas", status: "completed", score1: 2, score2: 0 },
      { id: 68, date: "2026-06-18", time: "01:00", group: "L", team1: "Ghana", team2: "Panama", venue: "BMO Field", city: "Toronto", status: "completed", score1: 1, score2: 0 },
      { id: 69, date: "2026-06-23", time: "22:00", group: "L", team1: "England", team2: "Ghana", venue: "Gillette Stadium", city: "Boston", status: "completed", score1: 2, score2: 1 },
      { id: 70, date: "2026-06-24", time: "01:00", group: "L", team1: "Panama", team2: "Croatia", venue: "BMO Field", city: "Toronto", status: "completed", score1: 0, score2: 2 },
      { id: 71, date: "2026-06-27", time: "23:00", group: "L", team1: "Croatia", team2: "Ghana", venue: "Lincoln Financial Field", city: "Philadelphia", status: "completed", score1: 2, score2: 1 },
      { id: 72, date: "2026-06-27", time: "23:00", group: "L", team1: "Panama", team2: "England", venue: "MetLife Stadium", city: "New York/New Jersey", status: "completed", score1: 0, score2: 3 }
    ]
  };

  const worldcupData = {
    success: true,
    tournamentName: "FIFA World Cup 2026",
    tournamentStart: "2026-06-11",
    tournamentEnd: "2026-07-19",
    hostCountries: ["USA", "Canada", "Mexico"],
    totalMatches: 104,
    lastUpdated: new Date().toISOString(),
    groups: [groupA, groupB, groupC, groupD, groupE, groupF, groupG, groupH, groupI, groupJ, groupK, groupL],
    knockout: KNOCKOUT_RESULTS
  };

  return NextResponse.json(worldcupData, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
    }
  });
}