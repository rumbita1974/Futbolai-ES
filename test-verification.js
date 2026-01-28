// test-verification.js (run with: node test-verification.js)
const testVerification = async () => {
  console.log('🧪 Testing SportsDB Verification for FC Barcelona...\n');
  
  try {
    // Test direct SportsDB API
    const searchResponse = await fetch(
      'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=Barcelona'
    );
    
    const searchData = await searchResponse.json();
    console.log('✅ Team found:', searchData.teams[0].strTeam);
    console.log('👨‍🏫 Current manager:', searchData.teams[0].strManager);
    console.log('🏟️ Stadium:', searchData.teams[0].strStadium);
    
    // Get honors
    const teamId = searchData.teams[0].idTeam;
    const honorsResponse = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/lookuphonors.php?id=${teamId}`
    );
    
    const honorsData = await honorsResponse.json();
    const honors = honorsData.honours || [];
    
    console.log(`\n🏆 Found ${honors.length} honor records`);
    
    // Count Champions League titles
    const uclTitles = honors.filter(h => 
      h.strHonour?.toLowerCase().includes('champions league') || 
      h.strHonour?.toLowerCase().includes('european cup')
    );
    
    console.log(`✅ UEFA Champions League titles: ${uclTitles.length}`);
    
    // Show actual Champions League records
    console.log('\n📋 Champions League records:');
    uclTitles.forEach((h, i) => {
      console.log(`${i + 1}. ${h.strHonour} (${h.strSeason || 'N/A'})`);
    });
    
    // Count Club World Cup
    const cwcTitles = honors.filter(h => 
      h.strHonour?.toLowerCase().includes('club world cup') || 
      h.strHonour?.toLowerCase().includes('intercontinental')
    );
    console.log(`\n✅ FIFA Club World Cup titles: ${cwcTitles.length}`);
    
    // Count La Liga titles
    const laLigaTitles = honors.filter(h => 
      h.strHonour?.toLowerCase().includes('la liga')
    );
    console.log(`✅ La Liga titles: ${laLigaTitles.length}`);
    
    // Count Copa del Rey titles
    const copaTitles = honors.filter(h => 
      h.strHonour?.toLowerCase().includes('copa del rey')
    );
    console.log(`✅ Copa del Rey titles: ${copaTitles.length}`);
    
    console.log('\n🎯 RESULT: Barcelona should show:');
    console.log('- 5x UEFA Champions League');
    console.log('- 3x FIFA Club World Cup'); 
    console.log('- 27x La Liga');
    console.log('- 31x Copa del Rey');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testVerification();