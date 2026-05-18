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
    // Official FIFA 2026 Group Stage with CONFIRMED teams from your fixtures
    const groups: Group[] = [
      {
        id: 'A',
        name: 'Group A',
        teams: ['Mexico', 'Korea Republic', 'South Africa', 'Czechia'],
        matches: [
          { id: 1, date: '2026-06-11', group: 'A', team1: 'Mexico', team2: 'South Africa', venue: 'Mexico City Stadium', city: 'Mexico City', status: 'scheduled' },
          { id: 2, date: '2026-06-12', group: 'A', team1: 'Korea Republic', team2: 'Czechia', venue: 'Guadalajara Stadium', city: 'Guadalajara', status: 'scheduled' },
          { id: 25, date: '2026-06-18', group: 'A', team1: 'Czechia', team2: 'South Africa', venue: 'Atlanta Stadium', city: 'Atlanta', status: 'scheduled' },
          { id: 28, date: '2026-06-19', group: 'A', team1: 'Mexico', team2: 'Korea Republic', venue: 'Guadalajara Stadium', city: 'Guadalajara', status: 'scheduled' },
          { id: 53, date: '2026-06-25', group: 'A', team1: 'Czechia', team2: 'Mexico', venue: 'Mexico City Stadium', city: 'Mexico City', status: 'scheduled' },
          { id: 54, date: '2026-06-25', group: 'A', team1: 'South Africa', team2: 'Korea Republic', venue: 'Monterrey Stadium', city: 'Monterrey', status: 'scheduled' }
        ]
      },
      {
        id: 'B',
        name: 'Group B',
        teams: ['Canada', 'Switzerland', 'Qatar', 'Bosnia and Herzegovina'],
        matches: [
          { id: 3, date: '2026-06-12', group: 'B', team1: 'Canada', team2: 'Bosnia and Herzegovina', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 5, date: '2026-06-13', group: 'B', team1: 'Qatar', team2: 'Switzerland', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco Bay Area', status: 'scheduled' },
          { id: 26, date: '2026-06-18', group: 'B', team1: 'Switzerland', team2: 'Bosnia and Herzegovina', venue: 'Los Angeles Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 27, date: '2026-06-19', group: 'B', team1: 'Canada', team2: 'Qatar', venue: 'BC Place Vancouver', city: 'Vancouver', status: 'scheduled' },
          { id: 49, date: '2026-06-24', group: 'B', team1: 'Switzerland', team2: 'Canada', venue: 'BC Place Vancouver', city: 'Vancouver', status: 'scheduled' },
          { id: 50, date: '2026-06-24', group: 'B', team1: 'Bosnia and Herzegovina', team2: 'Qatar', venue: 'Seattle Stadium', city: 'Seattle', status: 'scheduled' }
        ]
      },
      {
        id: 'C',
        name: 'Group C',
        teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
        matches: [
          { id: 6, date: '2026-06-14', group: 'C', team1: 'Brazil', team2: 'Morocco', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 7, date: '2026-06-14', group: 'C', team1: 'Haiti', team2: 'Scotland', venue: 'Boston Stadium', city: 'Boston', status: 'scheduled' },
          { id: 30, date: '2026-06-20', group: 'C', team1: 'Scotland', team2: 'Morocco', venue: 'Boston Stadium', city: 'Boston', status: 'scheduled' },
          { id: 31, date: '2026-06-20', group: 'C', team1: 'Brazil', team2: 'Haiti', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 51, date: '2026-06-25', group: 'C', team1: 'Scotland', team2: 'Brazil', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 52, date: '2026-06-25', group: 'C', team1: 'Morocco', team2: 'Haiti', venue: 'Atlanta Stadium', city: 'Atlanta', status: 'scheduled' }
        ]
      },
      {
        id: 'D',
        name: 'Group D',
        teams: ['USA', 'Australia', 'Paraguay', 'Türkiye'],
        matches: [
          { id: 4, date: '2026-06-13', group: 'D', team1: 'USA', team2: 'Paraguay', venue: 'Los Angeles Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 8, date: '2026-06-14', group: 'D', team1: 'Australia', team2: 'Türkiye', venue: 'BC Place Vancouver', city: 'Vancouver', status: 'scheduled' },
          { id: 29, date: '2026-06-19', group: 'D', team1: 'USA', team2: 'Australia', venue: 'Seattle Stadium', city: 'Seattle', status: 'scheduled' },
          { id: 32, date: '2026-06-20', group: 'D', team1: 'Türkiye', team2: 'Paraguay', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco Bay Area', status: 'scheduled' },
          { id: 59, date: '2026-06-26', group: 'D', team1: 'Türkiye', team2: 'USA', venue: 'Los Angeles Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 60, date: '2026-06-26', group: 'D', team1: 'Paraguay', team2: 'Australia', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco Bay Area', status: 'scheduled' }
        ]
      },
      {
        id: 'E',
        name: 'Group E',
        teams: ['Germany', 'Côte d\'Ivoire', 'Ecuador', 'Curaçao'],
        matches: [
          { id: 9, date: '2026-06-14', group: 'E', team1: 'Germany', team2: 'Curaçao', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 11, date: '2026-06-15', group: 'E', team1: 'Côte d\'Ivoire', team2: 'Ecuador', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 34, date: '2026-06-20', group: 'E', team1: 'Germany', team2: 'Côte d\'Ivoire', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 35, date: '2026-06-21', group: 'E', team1: 'Ecuador', team2: 'Curaçao', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' },
          { id: 55, date: '2026-06-25', group: 'E', team1: 'Curaçao', team2: 'Côte d\'Ivoire', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 56, date: '2026-06-25', group: 'E', team1: 'Ecuador', team2: 'Germany', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' }
        ]
      },
      {
        id: 'F',
        name: 'Group F',
        teams: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
        matches: [
          { id: 10, date: '2026-06-14', group: 'F', team1: 'Netherlands', team2: 'Japan', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 12, date: '2026-06-15', group: 'F', team1: 'Sweden', team2: 'Tunisia', venue: 'Monterrey Stadium', city: 'Monterrey', status: 'scheduled' },
          { id: 33, date: '2026-06-20', group: 'F', team1: 'Netherlands', team2: 'Sweden', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 36, date: '2026-06-21', group: 'F', team1: 'Tunisia', team2: 'Japan', venue: 'Monterrey Stadium', city: 'Monterrey', status: 'scheduled' },
          { id: 57, date: '2026-06-26', group: 'F', team1: 'Japan', team2: 'Sweden', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 58, date: '2026-06-26', group: 'F', team1: 'Tunisia', team2: 'Netherlands', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' }
        ]
      },
      {
        id: 'G',
        name: 'Group G',
        teams: ['Belgium', 'Egypt', 'IR Iran', 'New Zealand'],
        matches: [
          { id: 14, date: '2026-06-15', group: 'G', team1: 'Belgium', team2: 'Egypt', venue: 'Seattle Stadium', city: 'Seattle', status: 'scheduled' },
          { id: 16, date: '2026-06-16', group: 'G', team1: 'IR Iran', team2: 'New Zealand', venue: 'Los Angeles Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 38, date: '2026-06-21', group: 'G', team1: 'Belgium', team2: 'IR Iran', venue: 'Los Angeles Stadium', city: 'Los Angeles', status: 'scheduled' },
          { id: 40, date: '2026-06-22', group: 'G', team1: 'New Zealand', team2: 'Egypt', venue: 'BC Place Vancouver', city: 'Vancouver', status: 'scheduled' },
          { id: 65, date: '2026-06-27', group: 'G', team1: 'Egypt', team2: 'IR Iran', venue: 'Seattle Stadium', city: 'Seattle', status: 'scheduled' },
          { id: 66, date: '2026-06-27', group: 'G', team1: 'New Zealand', team2: 'Belgium', venue: 'BC Place Vancouver', city: 'Vancouver', status: 'scheduled' }
        ]
      },
      {
        id: 'H',
        name: 'Group H',
        teams: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cabo Verde'],
        matches: [
          { id: 13, date: '2026-06-15', group: 'H', team1: 'Spain', team2: 'Cabo Verde', venue: 'Atlanta Stadium', city: 'Atlanta', status: 'scheduled' },
          { id: 15, date: '2026-06-16', group: 'H', team1: 'Saudi Arabia', team2: 'Uruguay', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 37, date: '2026-06-21', group: 'H', team1: 'Spain', team2: 'Saudi Arabia', venue: 'Atlanta Stadium', city: 'Atlanta', status: 'scheduled' },
          { id: 39, date: '2026-06-22', group: 'H', team1: 'Uruguay', team2: 'Cabo Verde', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 63, date: '2026-06-27', group: 'H', team1: 'Cabo Verde', team2: 'Saudi Arabia', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 64, date: '2026-06-27', group: 'H', team1: 'Uruguay', team2: 'Spain', venue: 'Guadalajara Stadium', city: 'Guadalajara', status: 'scheduled' }
        ]
      },
      {
        id: 'I',
        name: 'Group I',
        teams: ['France', 'Senegal', 'Iraq', 'Norway'],
        matches: [
          { id: 17, date: '2026-06-16', group: 'I', team1: 'France', team2: 'Senegal', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 18, date: '2026-06-17', group: 'I', team1: 'Iraq', team2: 'Norway', venue: 'Boston Stadium', city: 'Boston', status: 'scheduled' },
          { id: 42, date: '2026-06-22', group: 'I', team1: 'France', team2: 'Iraq', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' },
          { id: 43, date: '2026-06-23', group: 'I', team1: 'Norway', team2: 'Senegal', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 61, date: '2026-06-26', group: 'I', team1: 'Norway', team2: 'France', venue: 'Boston Stadium', city: 'Boston', status: 'scheduled' },
          { id: 62, date: '2026-06-26', group: 'I', team1: 'Senegal', team2: 'Iraq', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' }
        ]
      },
      {
        id: 'J',
        name: 'Group J',
        teams: ['Argentina', 'Austria', 'Algeria', 'Jordan'],
        matches: [
          { id: 19, date: '2026-06-17', group: 'J', team1: 'Argentina', team2: 'Algeria', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' },
          { id: 20, date: '2026-06-17', group: 'J', team1: 'Austria', team2: 'Jordan', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco Bay Area', status: 'scheduled' },
          { id: 41, date: '2026-06-22', group: 'J', team1: 'Argentina', team2: 'Austria', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 44, date: '2026-06-23', group: 'J', team1: 'Jordan', team2: 'Algeria', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco Bay Area', status: 'scheduled' },
          { id: 71, date: '2026-06-28', group: 'J', team1: 'Algeria', team2: 'Austria', venue: 'Kansas City Stadium', city: 'Kansas City', status: 'scheduled' },
          { id: 72, date: '2026-06-28', group: 'J', team1: 'Jordan', team2: 'Argentina', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' }
        ]
      },
      {
        id: 'K',
        name: 'Group K',
        teams: ['Portugal', 'Colombia', 'Uzbekistan', 'Congo DR'],
        matches: [
          { id: 21, date: '2026-06-17', group: 'K', team1: 'Portugal', team2: 'Congo DR', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 24, date: '2026-06-18', group: 'K', team1: 'Uzbekistan', team2: 'Colombia', venue: 'Mexico City Stadium', city: 'Mexico City', status: 'scheduled' },
          { id: 45, date: '2026-06-23', group: 'K', team1: 'Portugal', team2: 'Uzbekistan', venue: 'Houston Stadium', city: 'Houston', status: 'scheduled' },
          { id: 48, date: '2026-06-24', group: 'K', team1: 'Colombia', team2: 'Congo DR', venue: 'Guadalajara Stadium', city: 'Guadalajara', status: 'scheduled' },
          { id: 69, date: '2026-06-28', group: 'K', team1: 'Colombia', team2: 'Portugal', venue: 'Miami Stadium', city: 'Miami', status: 'scheduled' },
          { id: 70, date: '2026-06-28', group: 'K', team1: 'Congo DR', team2: 'Uzbekistan', venue: 'Atlanta Stadium', city: 'Atlanta', status: 'scheduled' }
        ]
      },
      {
        id: 'L',
        name: 'Group L',
        teams: ['England', 'Croatia', 'Ghana', 'Panama'],
        matches: [
          { id: 22, date: '2026-06-17', group: 'L', team1: 'England', team2: 'Croatia', venue: 'Dallas Stadium', city: 'Dallas', status: 'scheduled' },
          { id: 23, date: '2026-06-18', group: 'L', team1: 'Ghana', team2: 'Panama', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 46, date: '2026-06-23', group: 'L', team1: 'England', team2: 'Ghana', venue: 'Boston Stadium', city: 'Boston', status: 'scheduled' },
          { id: 47, date: '2026-06-24', group: 'L', team1: 'Panama', team2: 'Croatia', venue: 'Toronto Stadium', city: 'Toronto', status: 'scheduled' },
          { id: 67, date: '2026-06-27', group: 'L', team1: 'Panama', team2: 'England', venue: 'New York/New Jersey Stadium', city: 'New York/New Jersey', status: 'scheduled' },
          { id: 68, date: '2026-06-27', group: 'L', team1: 'Croatia', team2: 'Ghana', venue: 'Philadelphia Stadium', city: 'Philadelphia', status: 'scheduled' }
        ]
      }
    ];

    return NextResponse.json({
      success: true,
      tournamentStart: '2026-06-11',
      groups: groups,
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