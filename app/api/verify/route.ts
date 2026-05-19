// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

// REMOVED: export const dynamic = 'force-dynamic'; - This conflicts with static export
// Instead, mark this route as static but allow dynamic params
export const dynamic = 'error'; // This will prevent static generation and show clear error
export const runtime = 'nodejs';

// Get TheSportsDB API key from environment variables
const SPORTSDB_API_KEY = process.env.NEXT_PUBLIC_SPORTSDB_KEY || '3';

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
    // Get team info from SportsDB using environment variable API key
    const searchResponse = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(team)}`
    );
    
    if (!searchResponse.ok) {
      console.warn(`[VERIFY-API] Search failed with status ${searchResponse.status}`);
      return NextResponse.json(
        { verified: false, error: 'Search failed', team: team },
        { status: 200 }
      );
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.teams || searchData.teams.length === 0) {
      console.log(`[VERIFY-API] Team not found: ${team}`);
      return NextResponse.json(
        { verified: false, error: 'Team not found', team: team },
        { status: 200 }
      );
    }
    
    const teamData = searchData.teams[0];
    
    // Get honors using environment variable API key
    let honors = [];
    if (teamData.idTeam) {
      try {
        const honorsResponse = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/lookuphonors.php?id=${teamData.idTeam}`
        );
        
        if (honorsResponse.ok) {
          const honorsData = await honorsResponse.json();
          honors = honorsData.honours || [];
          console.log(`[VERIFY-API] Found ${honors.length} honors for ${team}`);
        }
      } catch (honorError) {
        console.warn(`[VERIFY-API] Could not fetch honors for ${team}:`, honorError);
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
               name.includes('ligue 1') || name.includes('eredivisie') ||
               name.includes('primeira liga');
      }).length,
      domesticCup: honors.filter((h: any) => {
        const name = h.strHonour?.toLowerCase() || '';
        return name.includes('copa del rey') || name.includes('fa cup') || 
               name.includes('dfb-pokal') || name.includes('coppa italia') ||
               name.includes('coupe de france') || name.includes('taça de portugal') ||
               (name.includes('cup') && !name.includes('world cup') && !name.includes('champions'));
      }).length
    };
    
    return NextResponse.json({
      verified: true,
      team: {
        name: teamData.strTeam,
        coach: teamData.strManager || 'Unknown',
        stadium: teamData.strStadium || 'Unknown',
        founded: teamData.intFormedYear || null,
        league: teamData.strLeague || 'Unknown',
        country: teamData.strCountry || 'Unknown'
      },
      trophies: counts,
      totalHonors: honors.length,
      verificationDate: new Date().toISOString(),
      apiKeyUsed: SPORTSDB_API_KEY !== '3' ? 'custom' : 'default'
    });
    
  } catch (error) {
    console.error('[VERIFY-API] Error:', error);
    return NextResponse.json(
      { verified: false, error: 'Verification failed', team: team },
      { status: 200 }
    );
  }
}