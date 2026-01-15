/**
 * Debug test - Check if Mbappé is in Real Madrid's squad via Football Data API
 */

const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
const BASE_URL = 'https://api.football-data.org/v4';

async function checkRealMadridSquad() {
  console.log('Fetching Real Madrid squad from Football Data API...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/teams/86`, {
      headers: { 'X-Auth-Token': API_KEY },
    });
    
    const data = await response.json();
    
    console.log('Team:', data.name);
    console.log('Coach:', data.coach?.name);
    console.log('Total players:', data.squad?.length);
    console.log('\nSearching for Mbappé...');
    
    const mbappe = data.squad.find(p => 
      p.name.toLowerCase().includes('mbappe') || 
      p.name.toLowerCase().includes('mbappé')
    );
    
    if (mbappe) {
      console.log('✅ FOUND:', mbappe.name);
      console.log('   Position:', mbappe.position);
      console.log('   Nationality:', mbappe.nationality);
    } else {
      console.log('❌ NOT FOUND in squad');
      console.log('\nFirst 10 players:');
      data.squad.slice(0, 10).forEach((p, i) => {
        console.log(`  ${i+1}. ${p.name} (${p.position})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRealMadridSquad();
