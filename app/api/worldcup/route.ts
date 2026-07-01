// app/api/worldcup/route.ts - Updated to use static venues for knockout

import { NextResponse } from 'next/server';

export const revalidate = 60;

// World Cup IDs from BSD API
const WORLD_CUP_LEAGUE_ID = 27;
const WORLD_CUP_SEASON_ID = 188;

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

// Static knockout match data with correct venues
const KNOCKOUT_STATIC = [
  // Round of 32 (June 28 - July 4, 2026)
  { id: 73, stage: 'Round of 32', team1: '1A', team2: '3C/3E/3F/3H/3I', date: '2026-06-28', time: '16:00', venue: 'Estadio Azteca', city: 'Mexico City' },
  { id: 74, stage: 'Round of 32', team1: '1D', team2: '3B/3E/3F/3I/3J', date: '2026-06-28', time: '19:00', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  { id: 75, stage: 'Round of 32', team1: '1E', team2: '3A/3B/3C/3D/3F', date: '2026-06-29', time: '16:00', venue: 'SoFi Stadium', city: 'Los Angeles' },
  { id: 76, stage: 'Round of 32', team1: '1I', team2: '3C/3D/3F/3G/3H', date: '2026-06-29', time: '19:00', venue: 'AT&T Stadium', city: 'Dallas' },
  { id: 77, stage: 'Round of 32', team1: '1G', team2: '3A/3E/3H/3I/3J', date: '2026-06-30', time: '16:00', venue: 'BC Place', city: 'Vancouver' },
  { id: 78, stage: 'Round of 32', team1: '1L', team2: '3E/3H/3I/3J/3K', date: '2026-06-30', time: '19:00', venue: 'NRG Stadium', city: 'Houston' },
  { id: 79, stage: 'Round of 32', team1: '1F', team2: '2C', date: '2026-06-30', time: '21:00', venue: 'Hard Rock Stadium', city: 'Miami' },
  { id: 80, stage: 'Round of 32', team1: '1J', team2: 'H2', date: '2026-07-01', time: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { id: 81, stage: 'Round of 32', team1: '1K', team2: '3D/3E/3I/3J/3L', date: '2026-07-01', time: '19:00', venue: "Levi's Stadium", city: 'San Francisco' },
  { id: 82, stage: 'Round of 32', team1: '1B', team2: '3E/3F/3G/3I/3J', date: '2026-07-01', time: '21:00', venue: 'Lumen Field', city: 'Seattle' },
  { id: 83, stage: 'Round of 32', team1: '1C', team2: '2F', date: '2026-07-02', time: '16:00', venue: 'Arrowhead Stadium', city: 'Kansas City' },
  { id: 84, stage: 'Round of 32', team1: '1H', team2: '3C/3D/3F/3G/3H', date: '2026-07-02', time: '19:00', venue: 'Estadio Akron', city: 'Guadalajara' },
  { id: 85, stage: 'Round of 32', team1: '2K', team2: '2L', date: '2026-07-03', time: '16:00', venue: 'Gillette Stadium', city: 'Boston' },
  { id: 86, stage: 'Round of 32', team1: '2A', team2: '2B', date: '2026-07-03', time: '19:00', venue: 'BMO Field', city: 'Toronto' },
  { id: 87, stage: 'Round of 32', team1: '2D', team2: 'G2', date: '2026-07-04', time: '16:00', venue: 'FedExField', city: 'Washington DC' },
  { id: 88, stage: 'Round of 32', team1: '2E', team2: '2I', date: '2026-07-04', time: '19:00', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
  
  // Round of 16 (July 5-8)
  { id: 89, stage: 'Round of 16', team1: 'Winner 73', team2: 'Winner 74', date: '2026-07-05', time: '16:00', venue: 'Estadio Azteca', city: 'Mexico City' },
  { id: 90, stage: 'Round of 16', team1: 'Winner 75', team2: 'Winner 76', date: '2026-07-05', time: '20:00', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  { id: 91, stage: 'Round of 16', team1: 'Winner 77', team2: 'Winner 78', date: '2026-07-06', time: '16:00', venue: 'SoFi Stadium', city: 'Los Angeles' },
  { id: 92, stage: 'Round of 16', team1: 'Winner 79', team2: 'Winner 80', date: '2026-07-06', time: '20:00', venue: 'AT&T Stadium', city: 'Dallas' },
  { id: 93, stage: 'Round of 16', team1: 'Winner 81', team2: 'Winner 82', date: '2026-07-07', time: '16:00', venue: 'BC Place', city: 'Vancouver' },
  { id: 94, stage: 'Round of 16', team1: 'Winner 83', team2: 'Winner 84', date: '2026-07-07', time: '20:00', venue: 'NRG Stadium', city: 'Houston' },
  { id: 95, stage: 'Round of 16', team1: 'Winner 85', team2: 'Winner 86', date: '2026-07-08', time: '16:00', venue: 'Hard Rock Stadium', city: 'Miami' },
  { id: 96, stage: 'Round of 16', team1: 'Winner 87', team2: 'Winner 88', date: '2026-07-08', time: '20:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  
  // Quarter-finals (July 10-11)
  { id: 97, stage: 'Quarter-final', team1: 'Winner 89', team2: 'Winner 90', date: '2026-07-10', time: '16:00', venue: 'Estadio Azteca', city: 'Mexico City' },
  { id: 98, stage: 'Quarter-final', team1: 'Winner 91', team2: 'Winner 92', date: '2026-07-10', time: '20:00', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  { id: 99, stage: 'Quarter-final', team1: 'Winner 93', team2: 'Winner 94', date: '2026-07-11', time: '16:00', venue: 'SoFi Stadium', city: 'Los Angeles' },
  { id: 100, stage: 'Quarter-final', team1: 'Winner 95', team2: 'Winner 96', date: '2026-07-11', time: '20:00', venue: 'AT&T Stadium', city: 'Dallas' },
  
  // Semi-finals (July 14-15)
  { id: 101, stage: 'Semi-final', team1: 'Winner 97', team2: 'Winner 98', date: '2026-07-14', time: '20:00', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  { id: 102, stage: 'Semi-final', team1: 'Winner 99', team2: 'Winner 100', date: '2026-07-15', time: '20:00', venue: 'SoFi Stadium', city: 'Los Angeles' },
  
  // Third-place match (July 18)
  { id: 103, stage: 'Third-place', team1: 'Loser 101', team2: 'Loser 102', date: '2026-07-18', time: '18:00', venue: 'Hard Rock Stadium', city: 'Miami' },
  
  // Final (July 19)
  { id: 104, stage: 'Final', team1: 'Winner 101', team2: 'Winner 102', date: '2026-07-19', time: '20:00', venue: 'MetLife Stadium', city: 'New York/New Jersey' }
];

// Create a lookup map for static knockout venues
const KNOCKOUT_VENUE_MAP: Record<number, { venue: string; city: string }> = {};
KNOCKOUT_STATIC.forEach(match => {
  KNOCKOUT_VENUE_MAP[match.id] = { venue: match.venue, city: match.city };
});

const BSD_API_KEY = process.env.NEXT_PUBLIC_BSD_API_KEY;

async function fetchLiveWorldCupMatches() {
  if (!BSD_API_KEY) {
    console.warn('BSD_API_KEY not configured, using fallback static data');
    return null;
  }

  try {
    const response = await fetch(
      `https://sports.bzzoiro.com/api/v2/events/?league_id=${WORLD_CUP_LEAGUE_ID}&season_id=${WORLD_CUP_SEASON_ID}&limit=250`,
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
  
  // Build group stage matches
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
    
    // Process knockout matches from API, but use static venues
    const knockoutFromAPI = liveMatches.filter((match: any) => 
      !isValidMatch(match.home_team, match.away_team) || 
      !match.group_name || 
      match.group_name === ''
    );
    
    knockoutMatches = knockoutFromAPI.length > 0 
      ? knockoutFromAPI.map((match: any) => {
          // Get static venue if available, otherwise use what API returns
          const staticVenue = KNOCKOUT_VENUE_MAP[match.id];
          return {
            id: match.id,
            stage: match.round_name || 'Knockout',
            team1: match.home_team,
            team2: match.away_team,
            date: match.event_date ? new Date(match.event_date).toISOString().split('T')[0] : '2026-06-28',
            time: match.event_date ? new Date(match.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '00:00',
            venue: staticVenue?.venue || match.venue?.name || 'TBD',
            city: staticVenue?.city || match.venue?.city || 'TBD',
            status: mapBSDStatus(match.status),
            score1: match.home_score ?? undefined,
            score2: match.away_score ?? undefined
          };
        })
      : KNOCKOUT_STATIC.map(match => ({ ...match, status: 'scheduled' }));
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
  // Keep your existing group data here
  const worldcupData = {
    success: true,
    tournamentName: "FIFA World Cup 2026",
    tournamentStart: "2026-06-11",
    tournamentEnd: "2026-07-19",
    hostCountries: ["USA", "Canada", "Mexico"],
    totalMatches: 104,
    lastUpdated: new Date().toISOString(),
    groups: [
      // ... your existing group data here ...
      // (Keep all your existing group matches)
    ],
    knockout: KNOCKOUT_STATIC.map(match => ({ ...match, status: 'scheduled' }))
  };

  return NextResponse.json(worldcupData, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
    }
  });
}