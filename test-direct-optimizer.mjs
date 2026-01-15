// Direct test of groqOptimizer
import { optimizedSearch } from './services/groqOptimizer.js';

async function test() {
  console.log('Testing optimizedSearch directly...\n');
  
  const result = await optimizedSearch('Kylian Mbappé', 'en');
  
  console.log('Result type:', result.players?.[0]?.currentTeam);
  console.log('Player name:', result.players?.[0]?.name);
  console.log('Full player:', JSON.stringify(result.players?.[0], null, 2));
}

test().catch(console.error);
