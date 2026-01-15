const http = require('http');

const url = `http://localhost:3000/api/ai?action=search&query=${encodeURIComponent('Kylian Mbappé')}`;

console.log('Requesting:', url);

const req = http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Raw Response Length:', data.length);
    console.log('First 500 chars:', data.substring(0, 500));
    try {
      const json = JSON.parse(data);
      console.log('\nParsed JSON keys:', Object.keys(json));
      console.log('Type:', json.type);
      console.log('Query:', json.query);
      if (json.playerInfo?.currentClub) {
        console.log('Player:', json.playerInfo.name);
        console.log('Club:', json.playerInfo.currentClub);
      }
      if (json._optimization) {
        console.log('Source:', json._optimization.primarySource);
      }
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
    }
  });
}).on('error', err => {
  console.error('Request error details:', {
    code: err.code,
    message: err.message,
    errno: err.errno
  });
});

req.setTimeout(5000, () => {
  console.error('Request timeout');
  req.destroy();
});
