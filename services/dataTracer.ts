// /app/services/dataTracer.ts

export interface DataSourceTrace {
  source: string;
  timestamp: string;
  data: any;
  query: string;
}

export interface PlayerTrace {
  name: string;
  sources: string[]; // Which APIs provided this player
  fromGROQ: boolean;
  fromFootballData: boolean;
  fromSportsDB: boolean;
  fromWikipedia: boolean;
}

export interface TeamTrace {
  name: string;
  coach: string;
  coachSources: string[];
  stadium?: string;
  stadiumSources: string[];
}

/**
 * Main tracer to track where data comes from
 */
export class DataTracer {
  private traces: DataSourceTrace[] = [];
  private query: string = '';

  constructor(query: string) {
    this.query = query;
    console.log(`🔍 [DATA TRACER] Tracking data sources for: "${query}"`);
  }

  addTrace(source: string, data: any) {
    const trace: DataSourceTrace = {
      source,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
      query: this.query
    };
    
    this.traces.push(trace);
    
    console.log(`📥 [TRACE] ${source}:`, this.getTraceSummary(trace));
  }

  private sanitizeData(data: any): any {
    if (!data) return null;
    
    // Remove sensitive data
    const sanitized = { ...data };
    
    if (sanitized.players && Array.isArray(sanitized.players)) {
      sanitized.players = sanitized.players.slice(0, 5).map((p: any) => ({
        name: p.name,
        position: p.position,
        nationality: p.nationality,
        currentTeam: p.currentTeam
      }));
      sanitized.playerCount = sanitized.players.length;
      sanitized.totalPlayers = data.players?.length;
    }
    
    return sanitized;
  }

  private getTraceSummary(trace: DataSourceTrace): string {
    const data = trace.data;
    
    if (!data) return 'No data';
    
    if (trace.source === 'GROQ AI') {
      return `Players: ${data.players?.length || 0}, Coach: ${data.teams?.[0]?.currentCoach || 'Unknown'}`;
    } else if (trace.source === 'Football Data API') {
      return `Team: ${data.name || 'Unknown'}, Coach: ${data.coach?.name || data.coachName || 'Unknown'}, Players: ${data.squad?.length || 0}`;
    } else if (trace.source === 'TheSportsDB API') {
      return `Team: ${data.name || data.strTeam || 'Unknown'}, Coach: ${data.coach || data.strManager || 'Unknown'}, Players: ${data.players?.length || 0}`;
    } else if (trace.source === 'Wikipedia') {
      return `Title: ${data.title}, Summary length: ${data.summary?.length || 0}`;
    }
    
    return 'Data received';
  }

  analyzeSources(): {
    players: PlayerTrace[];
    team: TeamTrace;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Collect all player data
    const allPlayers = new Map<string, PlayerTrace>();
    
    // Collect team data
    const teamData: TeamTrace = {
      name: this.query,
      coach: 'Unknown',
      coachSources: [],
      stadium: undefined,
      stadiumSources: []
    };

    // Analyze each trace
    for (const trace of this.traces) {
      const data = trace.data;
      
      switch (trace.source) {
        case 'GROQ AI':
          // Extract players from GROQ
          if (data.players) {
            data.players.forEach((player: any) => {
              if (player.name && player.name !== 'Unknown') {
                const key = player.name.toLowerCase().trim();
                if (!allPlayers.has(key)) {
                  allPlayers.set(key, {
                    name: player.name,
                    sources: ['GROQ AI'],
                    fromGROQ: true,
                    fromFootballData: false,
                    fromSportsDB: false,
                    fromWikipedia: false
                  });
                } else {
                  const existing = allPlayers.get(key)!;
                  if (!existing.sources.includes('GROQ AI')) {
                    existing.sources.push('GROQ AI');
                    existing.fromGROQ = true;
                  }
                }
              }
            });
          }
          
          // Extract coach from GROQ
          if (data.teams?.[0]?.currentCoach && data.teams[0].currentCoach !== 'Unknown') {
            if (!teamData.coachSources.includes('GROQ AI')) {
              teamData.coachSources.push('GROQ AI');
            }
            if (teamData.coach === 'Unknown') {
              teamData.coach = data.teams[0].currentCoach;
            }
          }
          break;

        case 'Football Data API':
          // Extract players from Football Data
          if (data.squad) {
            data.squad.forEach((player: any) => {
              if (player.name) {
                const key = player.name.toLowerCase().trim();
                if (!allPlayers.has(key)) {
                  allPlayers.set(key, {
                    name: player.name,
                    sources: ['Football Data API'],
                    fromGROQ: false,
                    fromFootballData: true,
                    fromSportsDB: false,
                    fromWikipedia: false
                  });
                } else {
                  const existing = allPlayers.get(key)!;
                  if (!existing.sources.includes('Football Data API')) {
                    existing.sources.push('Football Data API');
                    existing.fromFootballData = true;
                  }
                }
              }
            });
          }
          
          // Extract coach from Football Data
          const fdCoach = data.coach?.name || data.coachName;
          if (fdCoach && fdCoach !== 'Unknown') {
            if (!teamData.coachSources.includes('Football Data API')) {
              teamData.coachSources.push('Football Data API');
            }
            teamData.coach = fdCoach;
          }
          break;

        case 'TheSportsDB API':
          // Extract players from TheSportsDB
          if (data.players) {
            console.log(`[TRACER DEBUG] TheSportsDB players:`, data.players.slice(0, 3));
            
            data.players.forEach((player: any) => {
              if (player.name || player.strPlayer) {
                const playerName = player.name || player.strPlayer;
                const key = playerName.toLowerCase().trim();
                
                if (!allPlayers.has(key)) {
                  allPlayers.set(key, {
                    name: playerName,
                    sources: ['TheSportsDB API'],
                    fromGROQ: false,
                    fromFootballData: false,
                    fromSportsDB: true,
                    fromWikipedia: false
                  });
                } else {
                  const existing = allPlayers.get(key)!;
                  if (!existing.sources.includes('TheSportsDB API')) {
                    existing.sources.push('TheSportsDB API');
                    existing.fromSportsDB = true;
                  }
                }
              }
            });
          }
          
          // Extract coach from TheSportsDB
          const tsdbCoach = data.coach || data.strManager;
          if (tsdbCoach && tsdbCoach !== 'Unknown') {
            if (!teamData.coachSources.includes('TheSportsDB API')) {
              teamData.coachSources.push('TheSportsDB API');
            }
            if (teamData.coach === 'Unknown' || teamData.coachSources.length === 1) {
              teamData.coach = tsdbCoach;
            }
          }
          break;
      }
    }

    // Analyze for issues
    const playerList = Array.from(allPlayers.values());
    
    // Check for wrong players (e.g., Arsenal players for Argentina)
    const wrongPlayers = playerList.filter(p => {
      // Check if player name doesn't match typical Argentine names
      const suspiciousNames = ['Arteta', 'Raya', 'Trossard', 'Ødegaard', 'Saka', 'Rice'];
      return suspiciousNames.some(name => p.name.includes(name));
    });
    
    if (wrongPlayers.length > 0) {
      issues.push(`Found ${wrongPlayers.length} suspicious players that don't match team: ${wrongPlayers.map(p => p.name).join(', ')}`);
      issues.push(`These appear to be Arsenal/English Premier League players, not Argentine players`);
      recommendations.push('TheSportsDB API is returning wrong data for Argentina');
      recommendations.push('Consider disabling TheSportsDB API for national teams');
    }

    // Check data source distribution
    const groqPlayers = playerList.filter(p => p.fromGROQ).length;
    const fdPlayers = playerList.filter(p => p.fromFootballData).length;
    const tsdbPlayers = playerList.filter(p => p.fromSportsDB).length;
    
    console.log(`[TRACER] Player sources: GROQ=${groqPlayers}, FootballData=${fdPlayers}, TheSportsDB=${tsdbPlayers}`);
    
    if (tsdbPlayers > groqPlayers + fdPlayers) {
      issues.push(`Most players (${tsdbPlayers}) come from TheSportsDB API, which may be unreliable`);
    }

    // Generate report
    console.log('\n📋 [DATA TRACER ANALYSIS]');
    console.log('='.repeat(80));
    console.log(`Query: "${this.query}"`);
    console.log(`Total players collected: ${playerList.length}`);
    console.log(`Coach: ${teamData.coach} (Sources: ${teamData.coachSources.join(', ')})`);
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    // Show sample players and their sources
    console.log('\n👥 SAMPLE PLAYERS (first 10):');
    playerList.slice(0, 10).forEach((player, i) => {
      console.log(`  ${i+1}. ${player.name} [${player.sources.join(', ')}]`);
    });
    
    console.log('='.repeat(80));

    return {
      players: playerList,
      team: teamData,
      issues,
      recommendations
    };
  }

  getTraces(): DataSourceTrace[] {
    return this.traces;
  }
}

/**
 * Quick test function
 */
export async function traceSearchProcess(query: string) {
  const tracer = new DataTracer(query);
  
  // Simulate the search process
  console.log(`\n🧪 Tracing search for: "${query}"`);
  
  // Test 1: GROQ AI
  try {
    const groqResponse = await testGROQ(query);
    tracer.addTrace('GROQ AI', groqResponse);
  } catch (error) {
    console.log('GROQ AI test failed:', error);
  }
  
  // Test 2: TheSportsDB API
  try {
    const sportsDbResponse = await testTheSportsDB(query);
    tracer.addTrace('TheSportsDB API', sportsDbResponse);
  } catch (error) {
    console.log('TheSportsDB API test failed:', error);
  }
  
  // Test 3: Football Data API
  try {
    const footballDataResponse = await testFootballData(query);
    tracer.addTrace('Football Data API', footballDataResponse);
  } catch (error) {
    console.log('Football Data API test failed:', error);
  }
  
  // Analyze results
  return tracer.analyzeSources();
}

async function testGROQ(query: string): Promise<any> {
  // Mock GROQ response based on what we see in logs
  return {
    players: [
      { name: 'Lionel Messi', position: 'Forward', nationality: 'Argentina', currentTeam: 'Argentina' },
      { name: 'Ángel Di María', position: 'Forward', nationality: 'Argentina', currentTeam: 'Argentina' },
      { name: 'Emiliano Martínez', position: 'Goalkeeper', nationality: 'Argentina', currentTeam: 'Aston Villa' }
    ],
    teams: [{
      name: 'Argentina',
      currentCoach: 'Lionel Scaloni',
      type: 'national'
    }]
  };
}

async function testTheSportsDB(query: string): Promise<any> {
  // Test TheSportsDB directly
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.teams && data.teams.length > 0) {
        const team = data.teams[0];
        
        // Get players
        const playersResponse = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=${encodeURIComponent(team.strTeam)}`,
          { headers: { 'Accept': 'application/json' } }
        );
        
        let players = [];
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          players = playersData.player || [];
        }
        
        return {
          name: team.strTeam,
          coach: team.strManager,
          players: players.slice(0, 24).map((p: any) => ({
            name: p.strPlayer,
            position: p.strPosition,
            nationality: p.strNationality
          }))
        };
      }
    }
  } catch (error) {
    console.error('TheSportsDB test error:', error);
  }
  
  return null;
}

async function testFootballData(query: string): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;
  
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.football-data.org/v4/teams?name=${encodeURIComponent(query)}`)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'X-Auth-Token': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.teams && data.teams.length > 0) {
        // Find relevant team (not German clubs)
        const relevantTeam = data.teams.find((team: any) => 
          team.type !== undefined && 
          (team.type === 'NATIONAL_TEAM' || team.name.toLowerCase().includes(query.toLowerCase()))
        );
        
        if (relevantTeam) {
          const teamProxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.football-data.org/v4/teams/${relevantTeam.id}`)}`;
          const teamResponse = await fetch(teamProxyUrl, {
            headers: {
              'X-Auth-Token': apiKey,
              'Accept': 'application/json'
            }
          });
          
          if (teamResponse.ok) {
            return await teamResponse.json();
          }
        }
      }
    }
  } catch (error) {
    console.error('Football Data test error:', error);
  }
  
  return null;
}