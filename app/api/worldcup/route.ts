import { NextResponse } from 'next/server';

interface Match {
  id: number;
  date: string;
  group: string;
  team1: string;
  team2: string;
  venue: string;
  city: string;
  status: 'scheduled' | 'live' | 'completed';
  score1?: number;
  score2?: number;
}

interface Group {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
}

export async function GET() {
  try {
    // Official FIFA 2026 Group Stage Draw with exact fixtures
    const groups: Group[] = [
      {
        id: 'A',
        name: 'Group A',
        teams: ['Mexico', 'South Korea', 'South Africa', 'UEFA Play-off D'],
        matches: [
          { id: 1, date: '2026-06-11', group: 'A', team1: 'Mexico', team2: 'South Africa', venue: 'Estadio Azteca', city: 'Mexico City', status: 'scheduled' },
          { id: 2, date: '2026-06-11', group: 'A', team1: 'South Korea', team2: 'UEFA Play-off D', venue: 'Estadio Guadalajara', city: 'Guadalajara', status: 'scheduled' },
          { id: 18, date: '2026-06-18', group: 'A', team1: 'UEFA Play-off D', team2: 'South Africa', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'scheduled' },
          { id: 19, date: '2026-06-18', group: 'A', team1: 'Mexico', team2: 'South Korea', venue: 'Estadio Guadalajara', city: 'Guadalajara', status: 'scheduled' },
          { id: 41, date: '2026-06-24', group: 'A', team1: 'UEFA Play-off D', team2: 'Mexico', venue: 'Estadio Azteca', city: 'Mexico City', status: 'scheduled' },
          { id: 42, date: '2026-06-24', group: 'A', team1: 'South Africa', team2: 'South Korea', venue: 'Estadio BBVA', city: 'Monterrey', status: 'scheduled' }
        ]
      },
      {
        id: 'B',
        name: 'Group B',
        teams: ['Canada', 'Switzerland', 'Qatar', 'UEFA Play-off A'],
        matches: [
          { id: 3, date: '2026-06-12', group: 'B', team1: 'Canada', team2: 'UEFA Play-off A', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 5, date: '2026-06-13', group: 'B', team1: 'Qatar', team2: 'Switzerland', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco', status: 'scheduled' },
          { id: 20, date: '2026-06-18', group: 'B', team1: 'Switzerland', team2: 'UEFA Play-off A', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 21, date: '2026-06-18', group: 'B', team1: 'Canada', team2: 'Qatar', venue: 'BC Place', city: 'Vancouver', status: 'scheduled' },
          { id: 43, date: '2026-06-24', group: 'B', team1: 'Switzerland', team2: 'Canada', venue: 'BC Place', city: 'Vancouver', status: 'scheduled' },
          { id: 44, date: '2026-06-24', group: 'B', team1: 'UEFA Play-off A', team2: 'Qatar', venue: 'Lumen Field', city: 'Seattle', status: 'scheduled' }
        ]
      },
      {
        id: 'C',
        name: 'Group C',
        teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
        matches: [
          { id: 6, date: '2026-06-13', group: 'C', team1: 'Brazil', team2: 'Morocco', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 7, date: '2026-06-13', group: 'C', team1: 'Haiti', team2: 'Scotland', venue: 'Gillette Stadium', city: 'Boston', status: 'scheduled' },
          { id: 22, date: '2026-06-19', group: 'C', team1: 'Scotland', team2: 'Morocco', venue: 'Gillette Stadium', city: 'Boston', status: 'scheduled' },
          { id: 23, date: '2026-06-19', group: 'C', team1: 'Brazil', team2: 'Haiti', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 45, date: '2026-06-24', group: 'C', team1: 'Brazil', team2: 'Scotland', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 46, date: '2026-06-24', group: 'C', team1: 'Morocco', team2: 'Haiti', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'scheduled' }
        ]
      },
      {
        id: 'D',
        name: 'Group D',
        teams: ['USA', 'Australia', 'Paraguay', 'UEFA Play-off C'],
        matches: [
          { id: 4, date: '2026-06-12', group: 'D', team1: 'USA', team2: 'Paraguay', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 8, date: '2026-06-13', group: 'D', team1: 'Australia', team2: 'UEFA Play-off C', venue: 'BC Place', city: 'Vancouver', status: 'scheduled' },
          { id: 24, date: '2026-06-19', group: 'D', team1: 'USA', team2: 'Australia', venue: 'Lumen Field', city: 'Seattle', status: 'scheduled' },
          { id: 25, date: '2026-06-19', group: 'D', team1: 'UEFA Play-off C', team2: 'Paraguay', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco', status: 'scheduled' },
          { id: 47, date: '2026-06-25', group: 'D', team1: 'USA', team2: 'UEFA Play-off C', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 48, date: '2026-06-25', group: 'D', team1: 'Paraguay', team2: 'Australia', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco', status: 'scheduled' }
        ]
      },
      {
        id: 'E',
        name: 'Group E',
        teams: ['Germany', 'Côte d\'Ivoire', 'Ecuador', 'Curaçao'],
        matches: [
          { id: 9, date: '2026-06-14', group: 'E', team1: 'Germany', team2: 'Curaçao', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 10, date: '2026-06-14', group: 'E', team1: 'Côte d\'Ivoire', team2: 'Ecuador', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 26, date: '2026-06-20', group: 'E', team1: 'Germany', team2: 'Côte d\'Ivoire', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 27, date: '2026-06-20', group: 'E', team1: 'Ecuador', team2: 'Curaçao', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' },
          { id: 49, date: '2026-06-25', group: 'E', team1: 'Curaçao', team2: 'Côte d\'Ivoire', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 50, date: '2026-06-25', group: 'E', team1: 'Ecuador', team2: 'Germany', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' }
        ]
      },
      {
        id: 'F',
        name: 'Group F',
        teams: ['Netherlands', 'Japan', 'Tunisia', 'UEFA Play-off B'],
        matches: [
          { id: 11, date: '2026-06-14', group: 'F', team1: 'Netherlands', team2: 'Japan', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 12, date: '2026-06-14', group: 'F', team1: 'UEFA Play-off B', team2: 'Tunisia', venue: 'Monterrey Stadium', city: 'Monterrey', status: 'scheduled' },
          { id: 28, date: '2026-06-20', group: 'F', team1: 'Netherlands', team2: 'UEFA Play-off B', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 29, date: '2026-06-20', group: 'F', team1: 'Japan', team2: 'Tunisia', venue: 'Monterrey Stadium', city: 'Monterrey', status: 'scheduled' },
          { id: 51, date: '2026-06-25', group: 'F', team1: 'Japan', team2: 'UEFA Play-off B', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 52, date: '2026-06-25', group: 'F', team1: 'Tunisia', team2: 'Netherlands', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' }
        ]
      },
      {
        id: 'G',
        name: 'Group G',
        teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
        matches: [
          { id: 15, date: '2026-06-15', group: 'G', team1: 'Belgium', team2: 'Egypt', venue: 'Lumen Field', city: 'Seattle', status: 'scheduled' },
          { id: 16, date: '2026-06-15', group: 'G', team1: 'Iran', team2: 'New Zealand', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 32, date: '2026-06-21', group: 'G', team1: 'Belgium', team2: 'Iran', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 33, date: '2026-06-21', group: 'G', team1: 'New Zealand', team2: 'Egypt', venue: 'BC Place', city: 'Vancouver', status: 'scheduled' },
          { id: 56, date: '2026-06-26', group: 'G', team1: 'Egypt', team2: 'Iran', venue: 'Lumen Field', city: 'Seattle', status: 'scheduled' },
          { id: 57, date: '2026-06-26', group: 'G', team1: 'New Zealand', team2: 'Belgium', venue: 'BC Place', city: 'Vancouver', status: 'scheduled' }
        ]
      },
      {
        id: 'H',
        name: 'Group H',
        teams: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'],
        matches: [
          { id: 13, date: '2026-06-15', group: 'H', team1: 'Spain', team2: 'Cape Verde', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'scheduled' },
          { id: 14, date: '2026-06-15', group: 'H', team1: 'Saudi Arabia', team2: 'Uruguay', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 30, date: '2026-06-21', group: 'H', team1: 'Spain', team2: 'Saudi Arabia', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'scheduled' },
          { id: 31, date: '2026-06-21', group: 'H', team1: 'Uruguay', team2: 'Cape Verde', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 54, date: '2026-06-26', group: 'H', team1: 'Cape Verde', team2: 'Saudi Arabia', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 55, date: '2026-06-26', group: 'H', team1: 'Uruguay', team2: 'Spain', venue: 'Estadio Guadalajara', city: 'Guadalajara', status: 'scheduled' }
        ]
      }
    ];

    // Add Groups I-L from your calendar (these are the extended groups for 48 teams)
    const extendedGroups: Group[] = [
      {
        id: 'I',
        name: 'Group I',
        teams: ['France', 'Senegal', 'Norway', 'Play-off 2'],
        matches: [
          { id: 17, date: '2026-06-16', group: 'I', team1: 'France', team2: 'Senegal', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 18, date: '2026-06-16', group: 'I', team1: 'Play-off 2', team2: 'Norway', venue: 'Gillette Stadium', city: 'Boston', status: 'scheduled' },
          { id: 34, date: '2026-06-22', group: 'I', team1: 'Norway', team2: 'Senegal', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 35, date: '2026-06-22', group: 'I', team1: 'France', team2: 'Play-off 2', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 58, date: '2026-06-26', group: 'I', team1: 'Norway', team2: 'France', venue: 'Gillette Stadium', city: 'Boston', status: 'scheduled' },
          { id: 59, date: '2026-06-26', group: 'I', team1: 'Senegal', team2: 'Play-off 2', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' }
        ]
      },
      {
        id: 'J',
        name: 'Group J',
        teams: ['Argentina', 'Austria', 'Algeria', 'Jordan'],
        matches: [
          { id: 19, date: '2026-06-16', group: 'J', team1: 'Argentina', team2: 'Algeria', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' },
          { id: 20, date: '2026-06-16', group: 'J', team1: 'Austria', team2: 'Jordan', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco', status: 'scheduled' },
          { id: 36, date: '2026-06-22', group: 'J', team1: 'Argentina', team2: 'Jordan', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 37, date: '2026-06-22', group: 'J', team1: 'Austria', team2: 'Algeria', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco', status: 'scheduled' },
          { id: 60, date: '2026-06-27', group: 'J', team1: 'Algeria', team2: 'Austria', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' },
          { id: 61, date: '2026-06-27', group: 'J', team1: 'Jordan', team2: 'Argentina', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' }
        ]
      },
      {
        id: 'K',
        name: 'Group K',
        teams: ['Portugal', 'Colombia', 'Uzbekistan', 'Play-off 1'],
        matches: [
          { id: 21, date: '2026-06-17', group: 'K', team1: 'Portugal', team2: 'Play-off 1', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 22, date: '2026-06-17', group: 'K', team1: 'Uzbekistan', team2: 'Colombia', venue: 'Estadio Azteca', city: 'Mexico City', status: 'scheduled' },
          { id: 38, date: '2026-06-23', group: 'K', team1: 'Portugal', team2: 'Uzbekistan', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 39, date: '2026-06-23', group: 'K', team1: 'Colombia', team2: 'Play-off 1', venue: 'Estadio Guadalajara', city: 'Guadalajara', status: 'scheduled' },
          { id: 62, date: '2026-06-27', group: 'K', team1: 'Colombia', team2: 'Portugal', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 63, date: '2026-06-27', group: 'K', team1: 'Play-off 1', team2: 'Uzbekistan', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'scheduled' }
        ]
      },
      {
        id: 'L',
        name: 'Group L',
        teams: ['England', 'Croatia', 'Ghana', 'Panama'],
        matches: [
          { id: 23, date: '2026-06-17', group: 'L', team1: 'England', team2: 'Croatia', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 24, date: '2026-06-17', group: 'L', team1: 'Ghana', team2: 'Panama', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 40, date: '2026-06-23', group: 'L', team1: 'Panama', team2: 'Croatia', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 41, date: '2026-06-23', group: 'L', team1: 'England', team2: 'Ghana', venue: 'Gillette Stadium', city: 'Boston', status: 'scheduled' },
          { id: 64, date: '2026-06-27', group: 'L', team1: 'Panama', team2: 'England', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 65, date: '2026-06-27', group: 'L', team1: 'Croatia', team2: 'Ghana', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' }
        ]
      }
    ];

    // Combine all groups
    const allGroups = [...groups, ...extendedGroups];

    return NextResponse.json({
      success: true,
      tournamentStart: '2026-06-11',
      groups: allGroups,
      totalMatches: 72,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in worldcup API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch World Cup data' },
      { status: 500 }
    );
  }
}