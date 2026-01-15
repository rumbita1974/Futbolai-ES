const API_BASE = 'http://localhost:3000';

async function getSquad() {
  try {
    const response = await fetch(`${API_BASE}/api/debug-squad`);
    const data = await response.json();
    
    console.log('\n=== REAL MADRID SQUAD DEBUG ===\n');
    console.log('Team:', data.team);
    console.log('Coach:', data.coach);
    console.log('Total Players:', data.totalPlayers);
    console.log('\nMbappé Status:', data.mbappe);
    
    if (data.mbappe !== 'NOT FOUND') {
      console.log('✅ Mbappé FOUND!');
    } else {
      console.log('❌ Mbappé NOT in squad');
      console.log('\nFirst 10 players:');
      data.players.slice(0, 10).forEach((p, i) => {
        console.log(`  ${i+1}. ${p.name} (${p.position})`);
      });
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

getSquad();
