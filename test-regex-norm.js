// Test regex with proper normalization
const testCases = [
  "Kylian Mbappe",
  "Kylian Mbappé",
  "kylian mbappe",
  "kylian mbappé",
  "Raphaël Varane",
  "raphaël varane",
  "Luis Núñez",
  "luis núñez",
  "Diego Sánchez",
  "diego sánchez",
  "Some Team Name",
  "FC Barcelona",
];

console.log("Testing regex with normalization:\n");
testCases.forEach(test => {
  const normalized = test
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  const result = normalized.match(/^[a-z][a-z\s]*\s[a-z][a-z\s]*$/);
  console.log(`"${test}" → normalized: "${normalized}" → Match: ${result ? 'TRUE ✅' : 'FALSE ❌'}`);
});
