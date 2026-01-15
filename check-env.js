/**
 * Test if dev server has access to Football Data API key
 */

async function checkEnv() {
  const response = await fetch('http://localhost:3000/api/ai?action=check-env');
  const data = await response.json();
  console.log('Env check result:', data);
}

checkEnv().catch(console.error);
