import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export interface Player {
  name: string;
  currentTeam: string;
  position: string;
  age?: number;
  nationality: string;
  careerGoals?: number;
  careerAssists?: number;
  internationalAppearances?: number;
  internationalGoals?: number;
  majorAchievements: string[];
  careerSummary: string;
}

export interface Team {
  name: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  majorAchievements: {
    worldCup: string[];
    continental: string[];
    domestic: string[];
  };
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
}

/**
 * Main GROQ search function for football queries
 */
export const searchWithGROQ = async (query: string): Promise<GROQSearchResponse> => {
  // Validate API key
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('GROQ API key is missing. Check your .env.local file');
    return {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: 'GROQ API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file.'
    };
  }

  try {
    console.log(`[GROQ] Searching for: "${query}" with model: llama-3.3-70b-versatile`);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are FutbolAI - a professional football data analyst. You provide comprehensive, accurate football statistics.
          ALWAYS respond with VALID JSON using this exact structure:

          {
            "players": [{
              "name": "string",
              "currentTeam": "string",
              "position": "string",
              "age": number,
              "nationality": "string",
              "careerGoals": number,
              "careerAssists": number,
              "internationalAppearances": number,
              "internationalGoals": number,
              "majorAchievements": ["string"],
              "careerSummary": "string (brief 2-3 sentence summary)"
            }],
            "teams": [{
              "name": "string",
              "type": "club" or "national",
              "country": "string",
              "stadium": "string",
              "currentCoach": "string",
              "foundedYear": number,
              "majorAchievements": {
                "worldCup": ["string"],
                "continental": ["string"],
                "domestic": ["string"]
              }
            }],
            "youtubeQuery": "string (relevant YouTube search query for highlights)"
          }

          CRITICAL RULES:
          1. If searching for a player: fill the "players" array (max 1 item), leave "teams" empty
          2. If searching for a team: fill the "teams" array (max 1 item), leave "players" empty
          3. Include REAL statistics - estimate if exact numbers unknown
          4. For teams: Break down achievements by World Cup, Continental (Champions League, Copa America, etc.), Domestic (league titles)
          5. ALWAYS provide a relevant "youtubeQuery" (e.g., "Lionel Messi 2024 highlights" or "Real Madrid best goals 2024")
          6. If you don't know specific data, use reasonable estimates or empty arrays
          7. NEVER include markdown or text outside the JSON structure

          Example response for "Lionel Messi":
          {
            "players": [{
              "name": "Lionel Messi",
              "currentTeam": "Inter Miami",
              "position": "Forward",
              "age": 36,
              "nationality": "Argentine",
              "careerGoals": 835,
              "careerAssists": 375,
              "internationalAppearances": 180,
              "internationalGoals": 106,
              "majorAchievements": ["2022 FIFA World Cup Winner", "8x Ballon d'Or", "4x Champions League Winner", "10x La Liga Winner"],
              "careerSummary": "Argentine professional footballer considered one of the greatest players of all time. Known for his dribbling, playmaking, and goal-scoring abilities. Currently plays for Inter Miami in MLS after legendary career at Barcelona."
            }],
            "teams": [],
            "youtubeQuery": "Lionel Messi best goals 2024 Inter Miami"
          }

          Example response for "Real Madrid":
          {
            "players": [],
            "teams": [{
              "name": "Real Madrid",
              "type": "club",
              "country": "Spain",
              "stadium": "Santiago Bernabéu",
              "currentCoach": "Carlo Ancelotti",
              "foundedYear": 1902,
              "majorAchievements": {
                "worldCup": ["FIFA Club World Cup (2014, 2016, 2017, 2018, 2022)"],
                "continental": ["UEFA Champions League (14 titles)", "UEFA Super Cup (5 titles)"],
                "domestic": ["La Liga (35 titles)", "Copa del Rey (20 titles)", "Supercopa de España (13 titles)"]
              }
            }],
            "youtubeQuery": "Real Madrid best goals 2024 Champions League"
          }`
        },
        {
          role: 'user',
          content: `Football search query: "${query}". Provide comprehensive data in the specified JSON format.`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    console.log('[GROQ] Raw response:', response);
    
    if (!response || response.trim() === '') {
      return {
        players: [],
        teams: [],
        youtubeQuery: '',
        error: 'Received empty response from AI service',
        message: 'No data found for your query.'
      };
    }

    try {
      const parsed = JSON.parse(response);
      console.log('[GROQ] Parsed response:', parsed);
      
      // Validate and ensure proper structure
      const result: GROQSearchResponse = {
        players: Array.isArray(parsed.players) ? parsed.players.slice(0, 1) : [],
        teams: Array.isArray(parsed.teams) ? parsed.teams.slice(0, 1) : [],
        youtubeQuery: parsed.youtubeQuery || `${query} football highlights`,
        message: parsed.message || `Found information for "${query}"`,
        error: parsed.error || null
      };
      
      return result;
      
    } catch (parseError) {
      console.error('[GROQ] Failed to parse JSON response:', parseError, 'Response:', response);
      
      // Try to extract JSON if response has extra text
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          return {
            players: Array.isArray(extracted.players) ? extracted.players : [],
            teams: Array.isArray(extracted.teams) ? extracted.teams : [],
            youtubeQuery: extracted.youtubeQuery || `${query} football highlights`,
            message: extracted.message || `Found information for "${query}"`,
            error: null
          };
        }
      } catch (secondError) {
        console.error('[GROQ] Failed to extract JSON:', secondError);
      }
      
      return {
        players: [],
        teams: [],
        youtubeQuery: `${query} football highlights`,
        error: 'Failed to parse AI response. The service returned invalid JSON.',
        message: 'Technical error processing the response.'
      };
    }

  } catch (error: any) {
    console.error('[GROQ] API Error:', error);
    
    // Handle specific error cases
    if (error?.status === 401) {
      return {
        players: [],
        teams: [],
        youtubeQuery: '',
        error: 'Invalid API key. Please check your GROQ_API_KEY in .env.local'
      };
    }
    
    if (error?.status === 429) {
      return {
        players: [],
        teams: [],
        youtubeQuery: '',
        error: 'Rate limit exceeded. Please wait a moment and try again.'
      };
    }
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return {
        players: [],
        teams: [],
        youtubeQuery: '',
        error: 'Network error. Please check your internet connection.'
      };
    }
    
    return {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: `Search failed: ${error.message || 'Unknown error'}`
    };
  }
};

// Alias for backward compatibility
export const GROQSearch = searchWithGROQ;