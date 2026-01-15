const API_BASE = 'http://localhost:3000';

async function testQuery(query) {
  const response = await fetch(`${API_BASE}/api/ai?action=search&query=${encodeURIComponent(query)}`);
  const data = await response.json();
  
  console.log(`\n✓ ${query}`);
  if (data.teamInfo) {
    console.log(`  Team: ${data.teamInfo.name}`);
    console.log(`  Coach: ${data.teamInfo.currentCoach}`);
  } else if (data.playerInfo) {
    console.log(`  Player: ${data.playerInfo.name}`);
    console.log(`  Club: ${data.playerInfo.currentClub}`);
  }
}

(async () => {
  console.log('Phase 2 Quick Test - Key Queries');
  console.log('═'.repeat(40));
  
  await testQuery('Real Madrid');
  await testQuery('Barcelona squad');
  await testQuery('Manchester City');
  await testQuery('Kylian Mbappé');
  await testQuery('Liverpool');
  
  console.log('\n' + '═'.repeat(40));
  console.log('✅ Tests Complete - Verify teams are correct');
})();

