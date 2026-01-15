const http = require('http');

function testPlayerHttp(playerName) {
  return new Promise((resolve) => {
    const url = `http://localhost:3000/api/ai?query=${encodeURIComponent(playerName)}`;
    console.log(`\nTesting: "${playerName}"...\n`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✓ Type: ${json.type}`);
          console.log(`✓ Query: "${json.query}"`);
          if (json.playerInfo?.currentClub) {
            console.log(`✓ Player: ${json.playerInfo.name}`);
            console.log(`✓ Club: ${json.playerInfo.currentClub}`);
            console.log(`✓ Position: ${json.playerInfo.position}`);
          }
          if (json.teamInfo?.currentCoach) {
            console.log(`✓ Team Coach: ${json.teamInfo.currentCoach}`);
          }
          if (json._optimization) {
            console.log(`✓ Source: ${json._optimization.primarySource}`);
            console.log(`✓ Groq Avoided: ${json._optimization.groqCallsAvoided}`);
          }
        } catch (e) {
          console.error('Parse error:', e.message);
        }
        resolve();
      });
    }).on('error', err => {
      console.error('Request failed:', err.message);
      resolve();
    });
  });
}

(async () => {
  await testPlayerHttp('Raphaël Varane');
  await testPlayerHttp('Kylian Mbappé');
  await testPlayerHttp('Rodri');
})();
