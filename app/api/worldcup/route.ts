// app/api/worldcup/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 300;

export async function GET() {
  const worldcupData = {
    success: true,
    tournamentName: "FIFA World Cup 2026",
    tournamentStart: "2026-06-11",
    tournamentEnd: "2026-07-19",
    hostCountries: ["USA", "Canada", "Mexico"],
    totalMatches: 72,
    lastUpdated: new Date().toISOString(),
    groups: [
      // ==================== GROUP A ====================
      {
        id: "A",
        name: "Group A",
        teams: ["Mexico", "South Africa", "Korea Republic", "Czechia"],
        matches: [
          { id: 1, date: "2026-06-11", time: "21:00", group: "A", team1: "Mexico", team2: "South Africa", venue: "Estadio Azteca", city: "Mexico City", status: "scheduled" },
          { id: 2, date: "2026-06-12", time: "04:00", group: "A", team1: "Korea Republic", team2: "Czechia", venue: "Estadio Akron", city: "Guadalajara", status: "scheduled" },
          { id: 3, date: "2026-06-18", time: "18:00", group: "A", team1: "Czechia", team2: "South Africa", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "scheduled" },
          { id: 4, date: "2026-06-19", time: "03:00", group: "A", team1: "Mexico", team2: "Korea Republic", venue: "Estadio Akron", city: "Guadalajara", status: "scheduled" },
          { id: 5, date: "2026-06-25", time: "03:00", group: "A", team1: "Czechia", team2: "Mexico", venue: "Estadio Azteca", city: "Mexico City", status: "scheduled" },
          { id: 6, date: "2026-06-25", time: "03:00", group: "A", team1: "South Africa", team2: "Korea Republic", venue: "Estadio BBVA", city: "Monterrey", status: "scheduled" }
        ]
      },
      // ==================== GROUP B ====================
      {
        id: "B",
        name: "Group B",
        teams: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
        matches: [
          { id: 7, date: "2026-06-12", time: "21:00", group: "B", team1: "Canada", team2: "Bosnia and Herzegovina", venue: "BMO Field", city: "Toronto", status: "scheduled" },
          { id: 8, date: "2026-06-13", time: "21:00", group: "B", team1: "Qatar", team2: "Switzerland", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
          { id: 9, date: "2026-06-18", time: "21:00", group: "B", team1: "Switzerland", team2: "Bosnia and Herzegovina", venue: "SoFi Stadium", city: "Los Angeles", status: "scheduled" },
          { id: 10, date: "2026-06-19", time: "00:00", group: "B", team1: "Canada", team2: "Qatar", venue: "BC Place", city: "Vancouver", status: "scheduled" },
          { id: 11, date: "2026-06-24", time: "21:00", group: "B", team1: "Bosnia and Herzegovina", team2: "Qatar", venue: "Lumen Field", city: "Seattle", status: "scheduled" },
          { id: 12, date: "2026-06-24", time: "21:00", group: "B", team1: "Switzerland", team2: "Canada", venue: "BC Place", city: "Vancouver", status: "scheduled" }
        ]
      },
      // ==================== GROUP C ====================
      {
        id: "C",
        name: "Group C",
        teams: ["Brazil", "Morocco", "Haiti", "Scotland"],
        matches: [
          { id: 13, date: "2026-06-14", time: "00:00", group: "C", team1: "Brazil", team2: "Morocco", venue: "MetLife Stadium", city: "New York/New Jersey", status: "scheduled" },
          { id: 14, date: "2026-06-14", time: "03:00", group: "C", team1: "Haiti", team2: "Scotland", venue: "Gillette Stadium", city: "Boston", status: "scheduled" },
          { id: 15, date: "2026-06-20", time: "00:00", group: "C", team1: "Scotland", team2: "Morocco", venue: "Gillette Stadium", city: "Boston", status: "scheduled" },
          { id: 16, date: "2026-06-20", time: "02:30", group: "C", team1: "Brazil", team2: "Haiti", venue: "Lincoln Financial Field", city: "Philadelphia", status: "scheduled" },
          { id: 17, date: "2026-06-25", time: "00:00", group: "C", team1: "Scotland", team2: "Brazil", venue: "Hard Rock Stadium", city: "Miami", status: "scheduled" },
          { id: 18, date: "2026-06-25", time: "03:00", group: "C", team1: "Morocco", team2: "Haiti", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "scheduled" }
        ]
      },
      // ==================== GROUP D ====================
      {
        id: "D",
        name: "Group D",
        teams: ["USA", "Paraguay", "Australia", "Turkey"],
        matches: [
          { id: 19, date: "2026-06-13", time: "03:00", group: "D", team1: "USA", team2: "Paraguay", venue: "SoFi Stadium", city: "Los Angeles", status: "scheduled" },
          { id: 20, date: "2026-06-14", time: "06:00", group: "D", team1: "Australia", team2: "Turkey", venue: "BC Place", city: "Vancouver", status: "scheduled" },
          { id: 21, date: "2026-06-19", time: "21:00", group: "D", team1: "USA", team2: "Australia", venue: "Lumen Field", city: "Seattle", status: "scheduled" },
          { id: 22, date: "2026-06-20", time: "05:00", group: "D", team1: "Turkey", team2: "Paraguay", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
          { id: 23, date: "2026-06-26", time: "04:00", group: "D", team1: "Paraguay", team2: "Australia", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
          { id: 24, date: "2026-06-26", time: "04:00", group: "D", team1: "Turkey", team2: "USA", venue: "SoFi Stadium", city: "Los Angeles", status: "scheduled" }
        ]
      },
      // ==================== GROUP E ====================
      {
        id: "E",
        name: "Group E",
        teams: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
        matches: [
          { id: 25, date: "2026-06-14", time: "19:00", group: "E", team1: "Germany", team2: "Curaçao", venue: "NRG Stadium", city: "Houston", status: "scheduled" },
          { id: 26, date: "2026-06-15", time: "01:00", group: "E", team1: "Ivory Coast", team2: "Ecuador", venue: "Lincoln Financial Field", city: "Philadelphia", status: "scheduled" },
          { id: 27, date: "2026-06-20", time: "22:00", group: "E", team1: "Germany", team2: "Ivory Coast", venue: "BMO Field", city: "Toronto", status: "scheduled" },
          { id: 28, date: "2026-06-21", time: "02:00", group: "E", team1: "Ecuador", team2: "Curaçao", venue: "Arrowhead Stadium", city: "Kansas City", status: "scheduled" },
          { id: 29, date: "2026-06-25", time: "22:00", group: "E", team1: "Curaçao", team2: "Ivory Coast", venue: "Lincoln Financial Field", city: "Philadelphia", status: "scheduled" },
          { id: 30, date: "2026-06-25", time: "22:00", group: "E", team1: "Ecuador", team2: "Germany", venue: "MetLife Stadium", city: "New York/New Jersey", status: "scheduled" }
        ]
      },
      // ==================== GROUP F ====================
      {
        id: "F",
        name: "Group F",
        teams: ["Netherlands", "Japan", "Sweden", "Tunisia"],
        matches: [
          { id: 31, date: "2026-06-14", time: "22:00", group: "F", team1: "Netherlands", team2: "Japan", venue: "AT&T Stadium", city: "Dallas", status: "scheduled" },
          { id: 32, date: "2026-06-15", time: "04:00", group: "F", team1: "Sweden", team2: "Tunisia", venue: "Estadio BBVA", city: "Monterrey", status: "scheduled" },
          { id: 33, date: "2026-06-20", time: "19:00", group: "F", team1: "Netherlands", team2: "Sweden", venue: "NRG Stadium", city: "Houston", status: "scheduled" },
          { id: 34, date: "2026-06-21", time: "06:00", group: "F", team1: "Tunisia", team2: "Japan", venue: "Estadio BBVA", city: "Monterrey", status: "scheduled" },
          { id: 35, date: "2026-06-26", time: "01:00", group: "F", team1: "Japan", team2: "Sweden", venue: "AT&T Stadium", city: "Dallas", status: "scheduled" },
          { id: 36, date: "2026-06-26", time: "01:00", group: "F", team1: "Tunisia", team2: "Netherlands", venue: "Arrowhead Stadium", city: "Kansas City", status: "scheduled" }
        ]
      },
      // ==================== GROUP G ====================
      {
        id: "G",
        name: "Group G",
        teams: ["Belgium", "Egypt", "Iran", "New Zealand"],
        matches: [
          { id: 37, date: "2026-06-15", time: "21:00", group: "G", team1: "Belgium", team2: "Egypt", venue: "Lumen Field", city: "Seattle", status: "scheduled" },
          { id: 38, date: "2026-06-16", time: "03:00", group: "G", team1: "Iran", team2: "New Zealand", venue: "SoFi Stadium", city: "Los Angeles", status: "scheduled" },
          { id: 39, date: "2026-06-21", time: "21:00", group: "G", team1: "Belgium", team2: "Iran", venue: "SoFi Stadium", city: "Los Angeles", status: "scheduled" },
          { id: 40, date: "2026-06-22", time: "03:00", group: "G", team1: "New Zealand", team2: "Egypt", venue: "BC Place", city: "Vancouver", status: "scheduled" },
          { id: 41, date: "2026-06-27", time: "05:00", group: "G", team1: "Egypt", team2: "Iran", venue: "Lumen Field", city: "Seattle", status: "scheduled" },
          { id: 42, date: "2026-06-27", time: "05:00", group: "G", team1: "New Zealand", team2: "Belgium", venue: "BC Place", city: "Vancouver", status: "scheduled" }
        ]
      },
      // ==================== GROUP H ====================
      {
        id: "H",
        name: "Group H",
        teams: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"],
        matches: [
          { id: 43, date: "2026-06-15", time: "18:00", group: "H", team1: "Spain", team2: "Cabo Verde", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "scheduled" },
          { id: 44, date: "2026-06-16", time: "00:00", group: "H", team1: "Saudi Arabia", team2: "Uruguay", venue: "Hard Rock Stadium", city: "Miami", status: "scheduled" },
          { id: 45, date: "2026-06-21", time: "18:00", group: "H", team1: "Spain", team2: "Saudi Arabia", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "scheduled" },
          { id: 46, date: "2026-06-22", time: "00:00", group: "H", team1: "Uruguay", team2: "Cabo Verde", venue: "Hard Rock Stadium", city: "Miami", status: "scheduled" },
          { id: 47, date: "2026-06-27", time: "02:00", group: "H", team1: "Uruguay", team2: "Spain", venue: "Estadio Akron", city: "Guadalajara", status: "scheduled" },
          { id: 48, date: "2026-06-27", time: "02:00", group: "H", team1: "Cabo Verde", team2: "Saudi Arabia", venue: "NRG Stadium", city: "Houston", status: "scheduled" }
        ]
      },
      // ==================== GROUP I ====================
      {
        id: "I",
        name: "Group I",
        teams: ["France", "Senegal", "Iraq", "Norway"],
        matches: [
          { id: 49, date: "2026-06-16", time: "21:00", group: "I", team1: "France", team2: "Senegal", venue: "MetLife Stadium", city: "New York/New Jersey", status: "scheduled" },
          { id: 50, date: "2026-06-17", time: "00:00", group: "I", team1: "Iraq", team2: "Norway", venue: "Gillette Stadium", city: "Boston", status: "scheduled" },
          { id: 51, date: "2026-06-22", time: "23:00", group: "I", team1: "France", team2: "Iraq", venue: "Lincoln Financial Field", city: "Philadelphia", status: "scheduled" },
          { id: 52, date: "2026-06-23", time: "02:00", group: "I", team1: "Norway", team2: "Senegal", venue: "MetLife Stadium", city: "New York/New Jersey", status: "scheduled" },
          { id: 53, date: "2026-06-26", time: "21:00", group: "I", team1: "Senegal", team2: "Iraq", venue: "BMO Field", city: "Toronto", status: "scheduled" },
          { id: 54, date: "2026-06-26", time: "21:00", group: "I", team1: "Norway", team2: "France", venue: "Gillette Stadium", city: "Boston", status: "scheduled" }
        ]
      },
      // ==================== GROUP J ====================
      {
        id: "J",
        name: "Group J",
        teams: ["Argentina", "Algeria", "Austria", "Jordan"],
        matches: [
          { id: 55, date: "2026-06-17", time: "03:00", group: "J", team1: "Argentina", team2: "Algeria", venue: "Arrowhead Stadium", city: "Kansas City", status: "scheduled" },
          { id: 56, date: "2026-06-17", time: "06:00", group: "J", team1: "Austria", team2: "Jordan", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
          { id: 57, date: "2026-06-22", time: "19:00", group: "J", team1: "Argentina", team2: "Austria", venue: "AT&T Stadium", city: "Dallas", status: "scheduled" },
          { id: 58, date: "2026-06-23", time: "05:00", group: "J", team1: "Jordan", team2: "Algeria", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
          { id: 59, date: "2026-06-28", time: "04:00", group: "J", team1: "Jordan", team2: "Argentina", venue: "AT&T Stadium", city: "Dallas", status: "scheduled" },
          { id: 60, date: "2026-06-28", time: "04:00", group: "J", team1: "Algeria", team2: "Austria", venue: "Arrowhead Stadium", city: "Kansas City", status: "scheduled" }
        ]
      },
      // ==================== GROUP K ====================
      {
        id: "K",
        name: "Group K",
        teams: ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
        matches: [
          { id: 61, date: "2026-06-17", time: "19:00", group: "K", team1: "Portugal", team2: "Congo DR", venue: "NRG Stadium", city: "Houston", status: "scheduled" },
          { id: 62, date: "2026-06-18", time: "04:00", group: "K", team1: "Uzbekistan", team2: "Colombia", venue: "Estadio Azteca", city: "Mexico City", status: "scheduled" },
          { id: 63, date: "2026-06-23", time: "19:00", group: "K", team1: "Portugal", team2: "Uzbekistan", venue: "NRG Stadium", city: "Houston", status: "scheduled" },
          { id: 64, date: "2026-06-24", time: "04:00", group: "K", team1: "Colombia", team2: "Congo DR", venue: "Estadio Akron", city: "Guadalajara", status: "scheduled" },
          { id: 65, date: "2026-06-28", time: "01:30", group: "K", team1: "Colombia", team2: "Portugal", venue: "Hard Rock Stadium", city: "Miami", status: "scheduled" },
          { id: 66, date: "2026-06-28", time: "01:30", group: "K", team1: "Congo DR", team2: "Uzbekistan", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "scheduled" }
        ]
      },
      // ==================== GROUP L ====================
      {
        id: "L",
        name: "Group L",
        teams: ["England", "Croatia", "Ghana", "Panama"],
        matches: [
          { id: 67, date: "2026-06-17", time: "22:00", group: "L", team1: "England", team2: "Croatia", venue: "AT&T Stadium", city: "Dallas", status: "scheduled" },
          { id: 68, date: "2026-06-18", time: "01:00", group: "L", team1: "Ghana", team2: "Panama", venue: "BMO Field", city: "Toronto", status: "scheduled" },
          { id: 69, date: "2026-06-23", time: "22:00", group: "L", team1: "England", team2: "Ghana", venue: "Gillette Stadium", city: "Boston", status: "scheduled" },
          { id: 70, date: "2026-06-24", time: "01:00", group: "L", team1: "Panama", team2: "Croatia", venue: "BMO Field", city: "Toronto", status: "scheduled" },
          { id: 71, date: "2026-06-27", time: "23:00", group: "L", team1: "Croatia", team2: "Ghana", venue: "Lincoln Financial Field", city: "Philadelphia", status: "scheduled" },
          { id: 72, date: "2026-06-27", time: "23:00", group: "L", team1: "Panama", team2: "England", venue: "MetLife Stadium", city: "New York/New Jersey", status: "scheduled" }
        ]
      }
    ]
  };

  return NextResponse.json(worldcupData, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
    }
  });
}