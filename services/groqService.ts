import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export interface GROQSearchResponse {
  players?: Array<{
    name: string;
    team: string;
    position: string;
    age?: number;
    stats?: Record<string, any>;
    wikipediaSummary?: string;
  }>;
  teams?: Array<{
    name: string;
    country: string;
    coach: string;
    fifaRanking?: number;
    group?: string;
  }>;
  videoHighlights?: Array<{
    title: string;
    url: string;
    duration: string;
    thumbnail?: string;
  }>;
  teamAnalysis?: {
    teamName: string;
    strengths: string[];
    weaknesses: string[];
    keyPlayers: string[];
    formation: string;
  } | null;
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
      error: 'GROQ API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file.',
      players: [],
      teams: [],
      videoHighlights: [],
      teamAnalysis: null,
    };
  }

  try {
    console.log(`[GROQ] Searching for: "${query}" with model: llama-3.3-70b-versatile`);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are FutbolAI - an expert football analyst assistant. Provide accurate, concise football information.

          IMPORTANT: Respond with VALID JSON only. Use this exact structure:
          {
            "players": [{"name": "string", "team": "string", "position": "string", "wikipediaSummary": "string"}],
            "teams": [{"name": "string", "country": "string", "coach": "string", "fifaRanking": number, "group": "string"}],
            "videoHighlights": [],
            "teamAnalysis": null,
            "message": "string explaining what was found"
          }

          RULES:
          1. For 2026 World Cup teams, include their actual group (A-L) from the official draw
          2. Keep wikipediaSummary brief (1-2 sentences max)
          3. If you don't have accurate information, return empty arrays
          4. Always include a helpful message field
          5. NEVER include markdown, explanations, or text outside the JSON

          Examples:
          - Query: "Lionel Messi"
            Response: {"players": [{"name": "Lionel Messi", "team": "Inter Miami", "position": "Forward", "wikipediaSummary": "Argentine professional footballer..."}], "teams": [], "videoHighlights": [], "teamAnalysis": null, "message": "Found information about Lionel Messi"}

          - Query: "Argentina"
            Response: {"players": [], "teams": [{"name": "Argentina", "country": "Argentina", "coach": "Lionel Scaloni", "fifaRanking": 1, "group": "J"}], "videoHighlights": [], "teamAnalysis": null, "message": "Found information about Argentina national team"}

          - Query: "random unknown term"
            Response: {"players": [], "teams": [], "videoHighlights": [], "teamAnalysis": null, "message": "No football information found for 'random unknown term'"}

          Remember: ONLY JSON response, no other text.`
        },
        {
          role: 'user',
          content: `Football query: "${query}". Provide accurate information in the specified JSON format.`
        }
      ],
      model: 'llama-3.3-70b-versatile', // CHANGED TO YOUR PREFERRED MODEL
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    console.log('[GROQ] Raw response:', response);
    
    if (!response || response.trim() === '') {
      return {
        error: 'Received empty response from AI service',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null,
        message: 'No data found for your query.'
      };
    }

    try {
      const parsed = JSON.parse(response);
      console.log('[GROQ] Parsed response:', parsed);
      
      // Validate and ensure proper structure
      return {
        players: Array.isArray(parsed.players) ? parsed.players.slice(0, 10) : [],
        teams: Array.isArray(parsed.teams) ? parsed.teams.slice(0, 10) : [],
        videoHighlights: Array.isArray(parsed.videoHighlights) ? parsed.videoHighlights.slice(0, 5) : [],
        teamAnalysis: parsed.teamAnalysis || null,
        message: parsed.message || `Found information for "${query}"`,
        error: parsed.error || null
      };
      
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
            videoHighlights: Array.isArray(extracted.videoHighlights) ? extracted.videoHighlights : [],
            teamAnalysis: extracted.teamAnalysis || null,
            message: extracted.message || `Found information for "${query}"`,
            error: null
          };
        }
      } catch (secondError) {
        console.error('[GROQ] Failed to extract JSON:', secondError);
      }
      
      return {
        error: 'Failed to parse AI response. The service returned invalid JSON.',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null,
        message: 'Technical error processing the response.'
      };
    }

  } catch (error: any) {
    console.error('[GROQ] API Error:', error);
    
    // Handle specific error cases
    if (error?.status === 401) {
      return {
        error: 'Invalid API key. Please check your GROQ_API_KEY in .env.local',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }
    
    if (error?.status === 429) {
      return {
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return {
        error: 'Network error. Please check your internet connection.',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }
    
    return {
      error: `Search failed: ${error.message || 'Unknown error'}`,
      players: [],
      teams: [],
      videoHighlights: [],
      teamAnalysis: null
    };
  }
};

// Alias for backward compatibility
export const GROQSearch = searchWithGROQ;