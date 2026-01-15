const regex = /^[A-Z][a-z]+ [A-Z][a-z]+$/;

const testQueries = [
  'Kylian Mbappe',
  'kylian mbappe',
  'Kylian Mbappé',
  'Real Madrid',
  'Mbappé',
];

testQueries.forEach(q => {
  const matches = regex.test(q);
  console.log(`"${q}".match(regex): ${matches}`);
});
