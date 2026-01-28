// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const team = searchParams.get('team');
  
  if (!team) {
    return NextResponse.json(
      { error: 'Missing team parameter' },
      { status: 400 }
    );
  }
  
  console.log(`[VERIFY-API] Verifying: ${team}`);
  
  try {
    // Get team info from SportsDB
    const searchResponse = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`
    );
    
    if (!searchResponse.ok) {
      return NextResponse.json(
        { verified: false, error: 'Search failed' },
        { status: 200 }
      );
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.teams || searchData.teams.length === 0) {
      return NextResponse.json(
        { verified: false, error: 'Team not found' },
        { status: 200 }
      );
    }
    
    const teamData = searchData.teams[0];
    
    // Get honors
    let honors = [];
    if (teamData.idTeam) {
      const honorsResponse = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/lookuphonors.php?id=${teamData.idTeam}`
      );
      
      if (honorsResponse.ok) {
        const honorsData = await honorsResponse.json();
        honors = honorsData.honours || [];
      }
    }
    
    // Simple trophy counting
    const counts = {
      championsLeague: honors.filter((h: any) => 
        h.strHonour?.toLowerCase().includes('champions league') || 
        h.strHonour?.toLowerCase().includes('european cup')
      ).length,
      clubWorldCup: honors.filter((h: any) => 
        h.strHonour?.toLowerCase().includes('club world cup') || 
        h.strHonour?.toLowerCase().includes('intercontinental')
      ).length,
      domesticLeague: honors.filter((h: any) => {
        const name = h.strHonour?.toLowerCase() || '';
        return name.includes('la liga') || name.includes('premier league') || 
               name.includes('bundesliga') || name.includes('serie a') || 
               name.includes('ligue 1');
      }).length,
      domesticCup: honors.filter((h: any) => {
        const name = h.strHonour?.toLowerCase() || '';
        return name.includes('copa del rey') || name.includes('fa cup') || 
               name.includes('dfb-pokal') || name.includes('coppa italia') ||
               (name.includes('cup') && !name.includes('world cup'));
      }).length
    };
    
    return NextResponse.json({
      verified: true,
      team: {
        name: teamData.strTeam,
        coach: teamData.strManager,
        stadium: teamData.strStadium,
        founded: teamData.intFormedYear,
        league: teamData.strLeague,
        country: teamData.strCountry
      },
      trophies: counts,
      totalHonors: honors.length,
      verificationDate: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[VERIFY-API] Error:', error);
    return NextResponse.json(
      { verified: false, error: 'Verification failed' },
      { status: 200 }
    );
  }
}