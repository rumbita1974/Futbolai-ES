// Test regex with accents
const regex = /^[a-zàáâãäå][a-zàáâãäå\s]*\s[a-zàáâãäå][a-zàáâãäå\s]*$/;

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

console.log("Testing regex with accents:\n");
testCases.forEach(test => {
  const result = test.toLowerCase().match(regex);
  console.log(`"${test}".toLowerCase().match(regex): ${result ? 'TRUE ✅' : 'FALSE ❌'}`);
});
