/**
 * Test Football Data API directly to find correct team IDs
 */

const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
const BASE_URL = 'https://api.football-data.org/v4';

async function testTeamID(teamId) {
  const url = `${BASE_URL}/teams/${teamId}`;
  const response = await fetch(url, {
    headers: { 'X-Auth-Token': API_KEY },
  });
  
  const data = await response.json();
  if (data.name) {
    console.log(`ID ${teamId}: ${data.name} (${data.address})`);
  } else {
    console.log(`ID ${teamId}: ERROR - ${data.errorCode}`);
  }
}

(async () => {
  console.log('Testing Football Data API Team IDs:');
  console.log('═'.repeat(50));
  
  // Test Manchester City
  await testTeamID(354);
  await testTeamID(57);  // Try Arsenal ID
  
  // Test Barcelona
  await testTeamID(81);
  
  // Test Real Madrid
  await testTeamID(86);
  
  // Try some numbers around 354
  console.log('\nSearching around 354:');
  await testTeamID(353);
  await testTeamID(355);
  await testTeamID(356);
})();
