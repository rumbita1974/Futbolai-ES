// Extended interface for comprehensive player data
export interface WikipediaPlayerData {
  name: string;
  position: string;
  age: number;
  dob: string;
  club: string;
  caps: number;
  goals: number;
  photoUrl: string;
  wikipediaUrl: string;
  nationality?: string;
  marketValue?: string;
  preferredFoot?: string;
  height?: string;
  weight?: string;
}

export interface WikipediaTeamData {
  name: string;
  flagUrl: string;
  fifaCode: string;
  group: string;
  players: WikipediaPlayerData[];
  fifaRanking: number;
  venueCity: string[];
  summary?: string;
}

// Extended mock implementation with more teams and players
export async function getNationalTeamData(
  countryName: string,
  language: 'en' | 'es' = 'en'
): Promise<WikipediaTeamData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock data for different teams - extended for 2026 World Cup
  const mockTeams: Record<string, WikipediaTeamData> = {
    'Argentina': {
      name: 'Argentina',
      flagUrl: 'https://flagcdn.com/w320/ar.png',
      fifaCode: 'ARG',
      group: 'A',
      fifaRanking: 1,
      venueCity: ['New York/New Jersey', 'Miami', 'Boston'],
      summary: 'Defending champions, led by Lionel Messi',
      players: [
        {
          name: 'Lionel Messi',
          position: 'Forward',
          age: 39,
          dob: '1987-06-24',
          club: 'Inter Miami CF',
          caps: 180,
          goals: 106,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Lionel_Messi',
          marketValue: 'â‚¬35M',
          preferredFoot: 'Left',
          height: '1.70 m',
          weight: '72 kg'
        },
        {
          name: 'Ãngel Di MarÃ­a',
          position: 'Midfielder',
          age: 36,
          dob: '1988-02-14',
          club: 'Benfica',
          caps: 136,
          goals: 29,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Di_Mar%C3%ADa_2022.jpg/480px-Di_Mar%C3%ADa_2022.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/%C3%81ngel_Di_Mar%C3%ADa',
          marketValue: 'â‚¬8M',
          preferredFoot: 'Left',
          height: '1.78 m',
          weight: '75 kg'
        },
        {
          name: 'Emiliano MartÃ­nez',
          position: 'Goalkeeper',
          age: 32,
          dob: '1992-09-02',
          club: 'Aston Villa',
          caps: 38,
          goals: 0,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Emiliano_Mart%C3%ADnez_2021.jpg/480px-Emiliano_Mart%C3%ADnez_2021.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Emiliano_Mart%C3%ADnez',
          marketValue: 'â‚¬28M',
          preferredFoot: 'Right',
          height: '1.95 m',
          weight: '88 kg'
        },
        {
          name: 'JuliÃ¡n Ãlvarez',
          position: 'Forward',
          age: 24,
          dob: '2000-01-31',
          club: 'Manchester City',
          caps: 29,
          goals: 7,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Juli%C3%A1n_%C3%81lvarez_2022.jpg/480px-Juli%C3%A1n_%C3%81lvarez_2022.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Juli%C3%A1n_%C3%81lvarez',
          marketValue: 'â‚¬80M',
          preferredFoot: 'Right',
          height: '1.70 m',
          weight: '71 kg'
        }
      ]
    },
    'United States': {
      name: 'United States',
      flagUrl: 'https://flagcdn.com/w320/us.png',
      fifaCode: 'USA',
      group: 'A',
      fifaRanking: 11,
      venueCity: ['Los Angeles', 'Seattle', 'Boston', 'Kansas City', 'Atlanta', 'Philadelphia'],
      summary: 'Co-hosts, emerging football nation',
      players: [
        {
          name: 'Christian Pulisic',
          position: 'Forward',
          age: 26,
          dob: '1998-09-18',
          club: 'AC Milan',
          caps: 65,
          goals: 28,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Christian_Pulisic_USMNT_2022.jpg/480px-Christian_Pulisic_USMNT_2022.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Christian_Pulisic',
          marketValue: 'â‚¬40M',
          preferredFoot: 'Right',
          height: '1.78 m',
          weight: '73 kg'
        },
        {
          name: 'Weston McKennie',
          position: 'Midfielder',
          age: 26,
          dob: '1998-08-28',
          club: 'Juventus',
          caps: 51,
          goals: 11,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Weston_McKennie_2021.jpg/480px-Weston_McKennie_2021.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Weston_McKennie',
          marketValue: 'â‚¬25M',
          preferredFoot: 'Right',
          height: '1.85 m',
          weight: '84 kg'
        },
        {
          name: 'Tyler Adams',
          position: 'Midfielder',
          age: 25,
          dob: '1999-02-14',
          club: 'Bournemouth',
          caps: 38,
          goals: 2,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Tyler_Adams_USMNT_2022.jpg/480px-Tyler_Adams_USMNT_2022.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Tyler_Adams',
          marketValue: 'â‚¬20M',
          preferredFoot: 'Right',
          height: '1.75 m',
          weight: '73 kg'
        }
      ]
    },
    'Brazil': {
      name: 'Brazil',
      flagUrl: 'https://flagcdn.com/w320/br.png',
      fifaCode: 'BRA',
      group: 'B',
      fifaRanking: 5,
      venueCity: ['Miami', 'Atlanta', 'Los Angeles'],
      summary: '5-time champions, always favorites',
      players: [
        {
          name: 'Neymar',
          position: 'Forward',
          age: 32,
          dob: '1992-02-05',
          club: 'Al Hilal',
          caps: 128,
          goals: 79,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Neymar_2022.jpg/480px-Neymar_2022.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Neymar',
          marketValue: 'â‚¬45M',
          preferredFoot: 'Right',
          height: '1.75 m',
          weight: '68 kg'
        },
        {
          name: 'VinÃ­cius JÃºnior',
          position: 'Forward',
          age: 23,
          dob: '2000-07-12',
          club: 'Real Madrid',
          caps: 26,
          goals: 3,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Vin%C3%ADcius_J%C3%BAnior_2021.jpg/480px-Vin%C3%ADcius_J%C3%BAnior_2021.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Vin%C3%ADcius_J%C3%BAnior',
          marketValue: 'â‚¬150M',
          preferredFoot: 'Right',
          height: '1.76 m',
          weight: '73 kg'
        },
        {
          name: 'Alisson Becker',
          position: 'Goalkeeper',
          age: 31,
          dob: '1992-10-02',
          club: 'Liverpool',
          caps: 63,
          goals: 0,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Alisson_Becker_2018.jpg/480px-Alisson_Becker_2018.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Alisson_Becker',
          marketValue: 'â‚¬35M',
          preferredFoot: 'Right',
          height: '1.93 m',
          weight: '91 kg'
        }
      ]
    },
    'France': {
      name: 'France',
      flagUrl: 'https://flagcdn.com/w320/fr.png',
      fifaCode: 'FRA',
      group: 'C',
      fifaRanking: 2,
      venueCity: ['Miami', 'Atlanta', 'Houston'],
      summary: '2018 champions, stacked squad. Captain Kylian Mbappé now plays for Real Madrid after his 2024 transfer from PSG.', // ⬅️ MODIFIED
      players: [
        {
          name: 'Kylian MbappÃ©',
          position: 'Forward',
          age: 25,
          dob: '1998-12-20',
          club: 'Real Madrid', // ⬅️ CHANGED FROM PSG TO REAL MADRID
          caps: 77,
          goals: 46,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Kylian_Mbapp%C3%A9_2021.jpg/480px-Kylian_Mbapp%C3%A9_2021.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Kylian_Mbapp%C3%A9',
          marketValue: 'â‚¬180M',
          preferredFoot: 'Right',
          height: '1.78 m',
          weight: '73 kg'
        },
        {
          name: 'Antoine Griezmann',
          position: 'Forward',
          age: 33,
          dob: '1991-03-21',
          club: 'AtlÃ©tico Madrid',
          caps: 127,
          goals: 44,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Antoine_Griezmann_2021.jpg/480px-Antoine_Griezmann_2021.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Antoine_Griezmann',
          marketValue: 'â‚¬25M',
          preferredFoot: 'Left',
          height: '1.76 m',
          weight: '73 kg'
        }
      ]
    },
    'Spain': {
      name: 'Spain',
      flagUrl: 'https://flagcdn.com/w320/es.png',
      fifaCode: 'ESP',
      group: 'C',
      fifaRanking: 8,
      venueCity: ['Boston', 'New York/New Jersey', 'Philadelphia'],
      summary: '2010 champions, technical masters',
      players: [
        {
          name: 'Rodri',
          position: 'Midfielder',
          age: 28,
          dob: '1996-06-22',
          club: 'Manchester City',
          caps: 48,
          goals: 3,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Rodri_2021.jpg/480px-Rodri_2021.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Rodri_%28footballer%29',
          marketValue: 'â‚¬100M',
          preferredFoot: 'Right',
          height: '1.91 m',
          weight: '82 kg'
        }
      ]
    },
    'Germany': {
      name: 'Germany',
      flagUrl: 'https://flagcdn.com/w320/de.png',
      fifaCode: 'GER',
      group: 'B',
      fifaRanking: 16,
      venueCity: ['Philadelphia', 'Toronto', 'New York/New Jersey'],
      summary: '4-time champions, rebuilding phase',
      players: [
        {
          name: 'Joshua Kimmich',
          position: 'Midfielder',
          age: 29,
          dob: '1995-02-08',
          club: 'Bayern Munich',
          caps: 84,
          goals: 6,
          photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Joshua_Kimmich_2020.jpg/480px-Joshua_Kimmich_2020.jpg',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Joshua_Kimmich',
          marketValue: 'â‚¬75M',
          preferredFoot: 'Right',
          height: '1.76 m',
          weight: '73 kg'
        }
      ]
    }
  };

  return mockTeams[countryName] || null;
}

export async function getPlayerData(playerName: string): Promise<WikipediaPlayerData | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Extended mock player data
  const mockPlayers: Record<string, WikipediaPlayerData> = {
    'Lionel Messi': {
      name: 'Lionel Messi',
      position: 'Forward',
      age: 39,
      dob: '1987-06-24',
      club: 'Inter Miami CF',
      caps: 180,
      goals: 106,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg',
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Lionel_Messi',
      marketValue: 'â‚¬35M',
      preferredFoot: 'Left',
      height: '1.70 m',
      weight: '72 kg'
    },
    'Kylian MbappÃ©': {
      name: 'Kylian MbappÃ©',
      position: 'Forward',
      age: 25,
      dob: '1998-12-20',
      club: 'Real Madrid', // ⬅️ CHANGED FROM PSG TO REAL MADRID
      caps: 77,
      goals: 46,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Kylian_Mbapp%C3%A9_2021.jpg/480px-Kylian_Mbapp%C3%A9_2021.jpg',
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Kylian_Mbapp%C3%A9',
      marketValue: 'â‚¬180M',
      preferredFoot: 'Right',
      height: '1.78 m',
      weight: '73 kg'
    }
  };

  return mockPlayers[playerName] || null;
}

// Helper function to parse Wikipedia table data
export function parseWikipediaSquadTable(html: string): WikipediaPlayerData[] {
  // This function would parse the actual Wikipedia HTML
  // and extract player information from squad tables

  // For now, return empty array
  return [];
}

// Function to get all teams for the 2026 World Cup
export async function get2026WorldCupTeams(): Promise<WikipediaTeamData[]> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const teams = [
    'Argentina',
    'United States',
    'Brazil',
    'France',
    'Spain',
    'Germany',
    'England',
    'Portugal',
    'Italy',
    'Netherlands',
    'Mexico',
    'Canada'
  ];

  const teamPromises = teams.map(team => getNationalTeamData(team));
  const results = await Promise.all(teamPromises);
  return results.filter((team): team is WikipediaTeamData => team !== null);
}

// ============ ADD THIS MISSING FUNCTION ============
export async function fetchWikipediaSummary(teamName: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Return a summary based on the team
  const summaries: Record<string, string> = {
    'Argentina': 'Argentina is the defending FIFA World Cup champion, having won the 2022 tournament in Qatar. They are led by captain Lionel Messi and are considered one of the favorites for the 2026 World Cup.',
    'United States': 'The United States is co-hosting the 2026 World Cup alongside Canada and Mexico. The USMNT is a young, energetic team with players competing in top European leagues.',
    'Brazil': 'Brazil is the most successful national team in World Cup history with five titles. Known for their samba style of play, they are always contenders for the championship.',
    'France': 'France won the 2018 World Cup and has one of the most talented squads in international football. Captain Kylian Mbappé now plays for Real Madrid after his 2024 transfer from PSG.', // ⬅️ MODIFIED
    'Spain': 'Spain won the 2010 World Cup and is known for their tiki-taka possession-based style of play. They are technical masters with excellent midfield control.',
    'Germany': 'Germany is a four-time World Cup champion known for their disciplined approach and efficiency. They are in a rebuilding phase after recent tournament struggles.',
    'England': 'England won the 1966 World Cup and has developed a strong, youthful squad under Gareth Southgate, reaching the semi-finals in 2018.',
    'Portugal': 'Portugal won Euro 2016 and features Cristiano Ronaldo. They are known for their tactical flexibility and technical skill.',
    'Italy': 'Italy is a four-time World Cup champion and won Euro 2020. Known for their defensive solidity and tactical intelligence.',
    'Netherlands': 'The Netherlands is known for "Total Football" and has reached three World Cup finals. They play an attractive, attacking style.',
    'Mexico': 'Mexico is a consistent CONCACAF powerhouse and World Cup regular. Known for their passionate fan base and technical players.',
    'Canada': 'Canada is co-hosting the 2026 World Cup and has emerged as a CONCACAF force, led by stars like Alphonso Davies.'
  };

  return summaries[teamName] || `The ${teamName} national football team is participating in the 2026 FIFA World Cup.`;
}
// ============ END OF ADDED FUNCTION ============