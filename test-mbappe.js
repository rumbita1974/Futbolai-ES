const API_BASE = 'http://localhost:3000';

async function testMbappe() {
  console.log('\n🧪 Testing Kylian Mbappé Lookup...\n');
  
  const response = await fetch(`${API_BASE}/api/ai?action=search&query=Kylian%20Mbappe`);
  const data = await response.json();
  
  if (data.playerInfo) {
    console.log('✓ PLAYER FOUND');
    console.log(`  Name: ${data.playerInfo.name}`);
    console.log(`  Club: ${data.playerInfo.currentClub}`);
    console.log(`  Position: ${data.playerInfo.position}`);
    
    if (data.teamInfo) {
      console.log(`  Team Coach: ${data.teamInfo.currentCoach}`);
    }
    
    // Verify it's current team
    if (data.playerInfo.currentClub === 'Real Madrid CF' || data.playerInfo.currentClub.includes('Real Madrid')) {
      console.log('\n✅ CORRECT - Mbappé now at Real Madrid (2024 transfer)');
    } else if (data.playerInfo.currentClub.includes('PSG')) {
      console.log('\n❌ OUTDATED - Shows PSG (player transferred in 2024)');
    } else {
      console.log(`\n⚠️  UNKNOWN - Shows: ${data.playerInfo.currentClub}`);
    }
  } else {
    console.log('❌ ERROR - Player not found');
    console.log(data);
  }
}

testMbappe().catch(console.error);
