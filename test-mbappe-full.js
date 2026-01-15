const fs = require('fs');
const API_BASE = 'http://localhost:3000';

async function testMbappe() {
  console.log('Testing Mbappé...\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/ai?action=search&query=Kylian%20Mbappe`);
    const data = await response.json();
    
    // Write full response to file for inspection
    fs.writeFileSync('mbappe-response.json', JSON.stringify(data, null, 2));
    console.log('Full response saved to mbappe-response.json');
    
    console.log('\n--- PLAYER INFO ---');
    if (data.playerInfo) {
      console.log('Name:', data.playerInfo.name);
      console.log('Club:', data.playerInfo.currentClub);
      console.log('Position:', data.playerInfo.position);
    } else {
      console.log('No playerInfo');
    }
    
    console.log('\n--- TEAM INFO ---');
    if (data.teamInfo) {
      console.log('Team:', data.teamInfo.name);
      console.log('Coach:', data.teamInfo.currentCoach);
    } else {
      console.log('No teamInfo');
    }
    
    console.log('\n--- METADATA ---');
    if (data._metadata) {
      console.log('Optimization info:', data._optimizationInfo);
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testMbappe();
