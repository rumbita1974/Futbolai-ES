// services/aiMatchGenerator.ts - NEW FILE
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export const generateAIMatches = async (
  leagueCode: string,
  matchType: 'results' | 'upcoming',
  count: number = 10
) => {
  const leagueMap = {
    'PD': 'La Liga (Spain)',
    'PL': 'Premier League (England)',
    'SA': 'Serie A (Italy)',
    'BL1': 'Bundesliga (Germany)',
    'FL1': 'Ligue 1 (France)',
    'BSA': 'Brasileirão (Brazil)',
    'CLI': 'Liga MX (Mexico)',
    'CL': 'Champions League'
  };

  const prompt = `Generate ${count} ${matchType === 'results' ? 'recent match results' : 'upcoming scheduled matches'} 
  for ${leagueMap[leagueCode] || leagueCode} for the 2025/2026 season. 
  Use REAL teams from the league. For results, include realistic scores. 
  For upcoming matches, include realistic dates within the next 30 days.
  
  Return JSON format: {
    matches: Array<{
      id: string,
      homeTeam: { name: string, goals?: number },
      awayTeam: { name: string, goals?: number },
      score: string,
      date: string,
      venue: string,
      status: 'FINISHED' | 'SCHEDULED'
    }>
  }`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    return generateFallbackMatches(leagueCode, matchType, count);
  }
};