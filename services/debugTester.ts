// /app/services/debugTester.ts

export async function debugFootballDataAPI() {
  console.log('🔍 DEBUGGING FOOTBALL DATA API ISSUES');
  console.log('='.repeat(80));
  
  const apiKey = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No Football Data API key found in environment variables');
    console.log('Make sure NEXT_PUBLIC_FOOTBALL_DATA_API_KEY is in .env.local');
    return;
  }
  
  console.log('✅ API Key is configured');
  
  // TEST 1: Why does search return German clubs?
  console.log('\n📊 TEST 1: Analyzing search behavior');
  
  const testSearches = [
    'France',
    'French',
    'France national',
    'FRA',
    'Barcelona',
    'Real Madrid'
  ];
  
  for (const search of testSearches) {
    console.log(`\nSearching for: "${search}"`);
    
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.football-data.org/v4/teams?name=${encodeURIComponent(search)}`)}`;
      
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Auth-Token': apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  Found ${data.teams?.length || 0} teams`);
        
        // Show first 3 results
        if (data.teams && data.teams.length > 0) {
          data.teams.slice(0, 3).forEach((team: any, i: number) => {
            const isNational = team.type === 'NATIONAL_TEAM';
            const isRelevant = team.name.toLowerCase().includes(search.toLowerCase());
            const marker = isNational ? '🌍' : (isRelevant ? '✅' : '❓');
            console.log(`  ${marker} ${i+1}. ${team.name} (ID: ${team.id}, Type: ${team.type || 'undefined'})`);
          });
          
          // Check if any are national teams
          const nationalTeams = data.teams.filter((t: any) => t.type === 'NATIONAL_TEAM');
          console.log(`  National teams in results: ${nationalTeams.length}`);
        }
      } else {
        console.log(`  ❌ API Error: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ Fetch Error: ${error}`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // TEST 2: Try competitions endpoint
  console.log('\n📊 TEST 2: Checking competitions for national teams');
  
  try {
    const compsUrl = `https://corsproxy.io/?${encodeURIComponent('https://api.football-data.org/v4/competitions')}`;
    const response = await fetch(compsUrl, {
      headers: {
        'X-Auth-Token': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  Found ${data.competitions?.length || 0} competitions`);
      
      // Find national team competitions
      const nationalComps = data.competitions?.filter((c: any) => 
        c.type === 'NATIONAL_TEAMS' || c.name.includes('World Cup') || c.name.includes('European')
      );
      
      console.log(`  National team competitions: ${nationalComps?.length || 0}`);
      nationalComps?.slice(0, 5).forEach((comp: any) => {
        console.log(`  - ${comp.name} (${comp.code}, ${comp.type})`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Competitions Error: ${error}`);
  }
  
  // TEST 3: Try alternative API
  console.log('\n📊 TEST 3: Testing TheSportsDB API');
  
  try {
    const sportsDbUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=France`;
    const response = await fetch(sportsDbUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  Found ${data.teams?.length || 0} teams`);
      
      if (data.teams && data.teams.length > 0) {
        data.teams.forEach((team: any, i: number) => {
          console.log(`  ${i+1}. ${team.strTeam} (${team.strCountry}, ${team.strSport})`);
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ TheSportsDB Error: ${error}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 RECOMMENDATIONS:');
  console.log('1. Football Data API search is BROKEN for national teams');
  console.log('2. Use TheSportsDB API for national team data');
  console.log('3. Or use Wikipedia/alternative sources for national teams');
  console.log('4. Consider disabling Football Data API for national team searches');
}