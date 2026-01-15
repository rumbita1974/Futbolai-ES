// Test accent normalization directly

const query = 'Kylian Mbappe';  // User query (no accent)
const playerName = 'Kylian Mbappé';  // From API (with accent)

const normalize = (str) => 
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const qNorm = normalize(query.trim());
const pNorm = normalize(playerName);

console.log('Original query:', query);
console.log('Normalized query:', qNorm);
console.log('');
console.log('Original player:', playerName);
console.log('Normalized player:', pNorm);
console.log('');
console.log('pNorm.includes(qNorm):', pNorm.includes(qNorm));
console.log('qNorm.includes(pNorm):', qNorm.includes(pNorm));
console.log('');
console.log('Match result:', pNorm.includes(qNorm) || qNorm.includes(pNorm));
