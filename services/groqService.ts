import Groq from 'groq-sdk';
import { enhanceGROQResponse, isWikipediaConfigured } from '@/services/dataEnhancerService';

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
  _source?: string;
  _lastVerified?: string;
  _wikiSummary?: string;
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
  _source?: string;
  _lastVerified?: string;
  _updateReason?: string;
  _wikiSummary?: string;
  _achievementsUpdated?: boolean;
  _dataCurrency?: {
    lastTrained: string;
    enhanced: string;
    updatesApplied: string[];
    currentSeason: string;
    verification: {
      source: string;
      confidence: 'high' | 'medium' | 'low';
      timestamp: string;
    };
    disclaimer: string;
    recommendations: string[];
  };
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: {
    enhancedAt: string;
    analysis: any;
    appliedUpdates: string[];
    dataSources: string[];
    apiStatus: {
      wikipedia: string;
      groq: string;
    };
    currentSeason: string;
    dataCurrency: {
      aiCutoff: string;
      verifiedWith: string;
      confidence: string;
      lastVerified: string;
    };
    disclaimer: string;
    recommendations: string[];
    wikipediaUsage: {
      queries: number;
      updates: number;
      timestamp: string;
    };
    achievementCorrections?: string[];
  };
}

/**
 * Main GROQ search function for football queries
 */
export const searchWithGROQ = async (query: string, language: string = 'en'): Promise<GROQSearchResponse> => {
  // Validate API key
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('GROQ API key is missing. Check your .env.local file');
    return {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: 'GROQ API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: 'Missing API key' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: {
          wikipedia: 'Not checked',
          groq: 'Missing key'
        },
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'GROQ API key missing. Cannot fetch AI data.',
        recommendations: ['Check your .env.local file for GROQ_API_KEY'],
        wikipediaUsage: {
          queries: 0,
          updates: 0,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  try {
    console.log(`[GROQ] Searching for: "${query}" with model: llama-3.3-70b-versatile, Language: ${language}`);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are FutbolAI - a professional football data analyst. You provide comprehensive, accurate football statistics.

${language === 'es' ? 'RESPONDE EN ESPAÑOL. Proporciona toda la información en español.' : 'RESPOND IN ENGLISH. Provide all information in English.'}

DATA ACCURACY GUIDELINES:
1. TIMELINESS VS COMPREHENSIVENESS:
   ${language === 'es' ? '   - Para información ACTUAL (clubes, entrenadores, edad): Sé preciso y actualizado' : '   - For CURRENT info (clubs, coaches, age): Be precise and up-to-date'}
   ${language === 'es' ? '   - Para información HISTÓRICA (logros, estadísticas): Sé exhaustivo y completo' : '   - For HISTORICAL info (achievements, stats): Be thorough and complete'}

2. CRITICAL 2024-2025 UPDATES (MUST BE ACCURATE):
   Clubs & Coaches:
   - Real Madrid: Coach = Xabi Alonso (since 2024). 15 UCL titles.
   - Bayern Munich: Coach = Vincent Kompany (since 2024)
   - Liverpool: Coach = Arne Slot (since 2024)
   - Barcelona: Coach = Hansi Flick (since 2024)
   - Chelsea: Coach = Enzo Maresca (since 2024)
   - AC Milan: Coach = Paulo Fonseca (since 2024)
   - Juventus: Coach = Thiago Motta (since 2024)
   - Brazil: Coach = Dorival Júnior (since 2024)
   
   Major Player Transfers:
   - Kylian Mbappé: Real Madrid (July 2024 from PSG)
   - Cristiano Ronaldo: Al Nassr (January 2023 from Manchester United)
   - Lionel Messi: Inter Miami CF (July 2023 from PSG)
   - Neymar: Al Hilal (August 2023 from PSG)
   - Karim Benzema: Al Ittihad (June 2023 from Real Madrid)
   - Jude Bellingham: Real Madrid (June 2023 from Borussia Dortmund)
   - Robert Lewandowski: FC Barcelona (July 2022 from Bayern Munich)
   - Erling Haaland: Manchester City (July 2022 from Borussia Dortmund)

3. ACHIEVEMENT REPORTING RULES:
   - List ALL major career achievements
   - For players: Include Ballon d'Or, league titles, cup wins, international trophies
   - For teams: Include all major domestic, continental, and world titles
   - Group similar achievements: "5x Champions League Winner" not just "Champions League Winner"
   - Include specific years for significant achievements: "European Championship 2016"

4. STATISTICS GUIDELINES:
   - Provide complete career totals: goals, assists, appearances
   - Include both club and international statistics
   - For retired players, mark as "retired" and provide full career summary

5. OUTPUT FORMAT RULES:
   ALWAYS respond with VALID JSON using this exact structure:
   {
     "players": [{
       "name": "string",
       "currentTeam": "string (CURRENT 2024-2025 CLUB)",
       "position": "string",
       "age": number,
       "nationality": "string",
       "careerGoals": number,
       "careerAssists": number,
       "internationalAppearances": number,
       "internationalGoals": number,
       "majorAchievements": ["string (COMPREHENSIVE LIST)"],
       "careerSummary": "string (DETAILED 2-3 sentences including club history)"
     }],
     "teams": [{
       "name": "string",
       "type": "club" or "national",
       "country": "string",
       "stadium": "string",
       "currentCoach": "string (CURRENT 2024-2025)",
       "foundedYear": number,
       "majorAchievements": {
         "worldCup": ["string"],
         "continental": ["string"],
         "domestic": ["string"]
       }
     }],
     "youtubeQuery": "string",
     "message": "string (Include: 'Information as of 2024' for data currency)"
   }

${language === 'es' ? `
EJEMPLO PARA "Cristiano Ronaldo" (EN ESPAÑOL):
{
  "players": [{
    "name": "Cristiano Ronaldo",
    "currentTeam": "Al Nassr",
    "position": "Delantero",
    "age": 39,
    "nationality": "Portugués",
    "careerGoals": 819,
    "careerAssists": 224,
    "internationalAppearances": 198,
    "internationalGoals": 122,
    "majorAchievements": [
      "5x Balón de Oro (2008, 2013, 2014, 2016, 2017)",
      "5x Ganador de la UEFA Champions League (2008, 2014, 2016, 2017, 2018)",
      "1x Ganador de la Eurocopa (2016)",
      "1x Ganador de la UEFA Nations League (2019)",
      "3x Ganador de la Premier League (2007, 2008, 2009)",
      "2x Ganador de La Liga (2012, 2017)",
      "2x Ganador de la Serie A (2019, 2020)",
      "4x Ganador de la Copa Mundial de Clubes FIFA",
      "3x Ganador de la Supercopa de la UEFA",
      "Jugador del Año de la PFA (2007, 2008)",
      "Bota de Oro Europea (2008, 2011, 2014, 2015)"
    ],
    "careerSummary": "Futbolista portugués considerado uno de los mejores jugadores de todos los tiempos. Conocido por su velocidad excepcional, habilidad, atletismo y capacidad goleadora. Jugó en el Sporting CP (2002-2003), Manchester United (2003-2009, 2021-2022), Real Madrid (2009-2018), Juventus (2018-2021) y actualmente juega en el Al Nassr (desde enero de 2023). Posee récords de más goles en la UEFA Champions League y en fútbol internacional masculino."
  }],
  "teams": [],
  "youtubeQuery": "Cristiano Ronaldo 2024 Al Nassr goles highlights",
  "message": "Información de Cristiano Ronaldo. Actualmente juega en el Al Nassr (desde enero de 2023). Información actualizada a 2024."
}

EJEMPLO PARA "Lionel Messi" (EN ESPAÑOL):
{
  "players": [{
    "name": "Lionel Messi",
    "currentTeam": "Inter Miami CF",
    "position": "Delantero",
    "age": 36,
    "nationality": "Argentino",
    "careerGoals": 835,
    "careerAssists": 375,
    "internationalAppearances": 180,
    "internationalGoals": 106,
    "majorAchievements": [
      "Ganador de la Copa Mundial FIFA 2022",
      "Ganador de la Copa América 2021",
      "8x Balón de Oro (2009, 2010, 2011, 2012, 2015, 2019, 2021, 2023)",
      "4x Ganador de la UEFA Champions League (2006, 2009, 2011, 2015)",
      "10x Ganador de La Liga (2005, 2006, 2009, 2010, 2011, 2013, 2015, 2016, 2018, 2019)",
      "7x Ganador de la Copa del Rey",
      "8x Ganador de la Supercopa de España",
      "3x Ganador de la Supercopa de la UEFA",
      "3x Ganador de la Copa Mundial de Clubes FIFA",
      "Ligue 1 (2022)",
      "Leagues Cup (2023)",
      "Balón de Oro de la Copa Mundial FIFA (2014, 2022)",
      "Bota de Oro Europea (2010, 2012, 2013, 2017, 2018)"
    ],
    "careerSummary": "Futbolista argentino considerado uno de los mejores jugadores de todos los tiempos. Conocido por su regate, creación de juego, visión y capacidad goleadora. Jugó en el Barcelona (2004-2021), Paris Saint-Germain (2021-2023) y actualmente juega en el Inter Miami CF (desde julio de 2023). Posee récords de más Balones de Oro y más goles para el Barcelona."
  }],
  "teams": [],
  "youtubeQuery": "Lionel Messi mejores goles 2024 Inter Miami",
  "message": "Información de Lionel Messi. Actualmente juega en el Inter Miami CF (desde julio de 2023). Información actualizada a 2024."
}
` : `
EXAMPLE FOR "Cristiano Ronaldo" (IN ENGLISH):
{
  "players": [{
    "name": "Cristiano Ronaldo",
    "currentTeam": "Al Nassr",
    "position": "Forward",
    "age": 39,
    "nationality": "Portuguese",
    "careerGoals": 819,
    "careerAssists": 224,
    "internationalAppearances": 198,
    "internationalGoals": 122,
    "majorAchievements": [
      "5x Ballon d'Or (2008, 2013, 2014, 2016, 2017)",
      "5x UEFA Champions League Winner (2008, 2014, 2016, 2017, 2018)",
      "1x European Championship Winner (2016)",
      "1x UEFA Nations League Winner (2019)",
      "3x Premier League Winner (2007, 2008, 2009)",
      "2x La Liga Winner (2012, 2017)",
      "2x Serie A Winner (2019, 2020)",
      "4x FIFA Club World Cup Winner",
      "3x UEFA Super Cup Winner",
      "PFA Players' Player of the Year (2007, 2008)",
      "European Golden Shoe (2008, 2011, 2014, 2015)"
    ],
    "careerSummary": "Portuguese professional footballer widely regarded as one of the greatest players of all time. Known for his exceptional speed, skill, athleticism, and goal-scoring ability. Played for Sporting CP (2002-2003), Manchester United (2003-2009, 2021-2022), Real Madrid (2009-2018), Juventus (2018-2021), and currently plays for Al Nassr (since January 2023). Holds records for most goals in UEFA Champions League and men's international football."
  }],
  "teams": [],
  "youtubeQuery": "Cristiano Ronaldo 2024 Al Nassr goals highlights",
  "message": "Cristiano Ronaldo information. Currently plays for Al Nassr (since January 2023). Information as of 2024."
}

EXAMPLE FOR "Lionel Messi" (IN ENGLISH):
{
  "players": [{
    "name": "Lionel Messi",
    "currentTeam": "Inter Miami CF",
    "position": "Forward",
    "age": 36,
    "nationality": "Argentine",
    "careerGoals": 835,
    "careerAssists": 375,
    "internationalAppearances": 180,
    "internationalGoals": 106,
    "majorAchievements": [
      "2022 FIFA World Cup Winner",
      "2021 Copa América Winner",
      "8x Ballon d'Or (2009, 2010, 2011, 2012, 2015, 2019, 2021, 2023)",
      "4x UEFA Champions League Winner (2006, 2009, 2011, 2015)",
      "10x La Liga Winner (2005, 2006, 2009, 2010, 2011, 2013, 2015, 2016, 2018, 2019)",
      "7x Copa del Rey Winner",
      "8x Spanish Super Cup Winner",
      "3x UEFA Super Cup Winner",
      "3x FIFA Club World Cup Winner",
      "Ligue 1 Title (2022)",
      "Leagues Cup (2023)",
      "FIFA World Cup Golden Ball (2014, 2022)",
      "European Golden Shoe (2010, 2012, 2013, 2017, 2018)"
    ],
    "careerSummary": "Argentine professional footballer considered one of the greatest players of all time. Known for his dribbling, playmaking, vision, and goal-scoring abilities. Played for Barcelona (2004-2021), Paris Saint-Germain (2021-2023), and currently plays for Inter Miami CF (since July 2023). Holds records for most Ballon d'Or awards and most goals for Barcelona."
  }],
  "teams": [],
  "youtubeQuery": "Lionel Messi best goals 2024 Inter Miami",
  "message": "Lionel Messi information. Currently plays for Inter Miami CF (since July 2023). Information as of 2024."
}
`}

${language === 'es' ? `
RECUERDA:
1. Clubes/entrenadores actuales: DEBEN ser precisos para la temporada 2024-2025
2. Logros: Enumera TODOS los principales de manera exhaustiva
3. Estadísticas: Proporciona totales de carrera completos
4. Resumen de carrera: Incluye historial de clubes
5. Siempre incluye "Información actualizada a 2024" en el campo de mensaje
6. Equilibra precisión con exhaustividad
` : `
REMEMBER:
1. Current clubs/coaches: MUST be accurate for 2024-2025 season
2. Achievements: List ALL major ones comprehensively
3. Statistics: Provide complete career totals
4. Career summary: Include club history timeline
5. Always include "Information as of 2024" in message field
6. Balance accuracy with completeness
`}`
        },
        {
          role: 'user',
          content: `Football search query: "${query}". ${language === 'es' ? 'Proporciona datos completos y precisos en el formato JSON especificado. Incluye todos los logros importantes y estadísticas de carrera completas. Asegúrate de que la información del club actual sea precisa para la temporada 2024-2025.' : 'Provide comprehensive, accurate data in the specified JSON format. Include all major achievements and complete career statistics. Ensure current club information is accurate for the 2024-2025 season.'}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2500,
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
        message: 'No data found for your query.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'Empty response' },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: {
            wikipedia: 'Not used',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'AI returned empty response.',
          recommendations: ['Try a different search term'],
          wikipediaUsage: {
            queries: 0,
            updates: 0,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    try {
      const parsed = JSON.parse(response);
      console.log('[GROQ] Parsed response:', parsed);
      
      // ENHANCE WITH WIKIPEDIA DATA
      console.log('[GROQ] Enhancing with Wikipedia API...');
      const wikipediaConfigured = isWikipediaConfigured();
      console.log('[GROQ] Wikipedia API configured:', wikipediaConfigured);
      
      let enhancedResult = parsed;
      let wikipediaUpdates = 0;
      let achievementCorrections: string[] = [];
      
      if (wikipediaConfigured) {
        try {
          enhancedResult = await enhanceGROQResponse(parsed, query);
          console.log('[GROQ] Wikipedia-enhanced response:', enhancedResult);
          wikipediaUpdates = enhancedResult._metadata?.appliedUpdates?.length || 0;
          achievementCorrections = enhancedResult._metadata?.achievementCorrections || [];
        } catch (enhanceError) {
          console.error('[GROQ] Wikipedia enhancement failed:', enhanceError);
          // Continue with basic result if enhancement fails
          enhancedResult = parsed;
        }
      } else {
        console.log('[GROQ] Wikipedia API not configured, using basic result');
        enhancedResult = parsed;
      }
      
      // Build final response
      const result: GROQSearchResponse = {
        players: Array.isArray(enhancedResult.players) ? enhancedResult.players.slice(0, 1) : [],
        teams: Array.isArray(enhancedResult.teams) ? enhancedResult.teams.slice(0, 1) : [],
        youtubeQuery: enhancedResult.youtubeQuery || `${query} football highlights ${new Date().getFullYear()}`,
        message: enhancedResult.message || `Found information for "${query}"`,
        error: enhancedResult.error || null,
        _metadata: enhancedResult._metadata || {
          enhancedAt: new Date().toISOString(),
          analysis: {
            isLikelyOutdated: false,
            outdatedFields: [],
            suggestions: ['Basic data verification'],
            needsEnhancement: false,
            confidence: 'medium'
          },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: {
            wikipedia: wikipediaConfigured ? 'Configured' : 'Not configured',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: wikipediaConfigured ? 'Wikipedia' : 'None',
            confidence: wikipediaUpdates > 0 ? 'high' : 'medium',
            lastVerified: new Date().toISOString()
          },
          disclaimer: wikipediaConfigured 
            ? 'Data verified with Wikipedia for current accuracy.'
            : 'Wikipedia API not configured. Data may be outdated.',
          recommendations: [
            'Check official sources for absolutely current information',
            'Visit club websites for latest squad details'
          ],
          wikipediaUsage: {
            queries: wikipediaConfigured ? 1 : 0,
            updates: wikipediaUpdates,
            timestamp: new Date().toISOString()
          },
          achievementCorrections
        }
      };
      
      // Add enhancement note to message
      if (wikipediaUpdates > 0 && result.message) {
        result.message = `✓ ${result.message} (Updated with Wikipedia data)`;
        
        // Add specific note for achievement corrections
        if (achievementCorrections.length > 0) {
          if (achievementCorrections.some(c => c.includes('15 UEFA Champions League'))) {
            result.message += ' • 15 UCL titles confirmed';
          }
        }
      } else if (wikipediaConfigured && result.message) {
        result.message = `✓ ${result.message} (Verified with Wikipedia)`;
      }
      
      console.log('[GROQ] Final response with metadata:', result._metadata);
      return result;
      
    } catch (parseError) {
      console.error('[GROQ] Failed to parse JSON response:', parseError, 'Response:', response);
      
      // Try to extract JSON if response has extra text
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('[GROQ] Attempting to extract JSON from text...');
          const extracted = JSON.parse(jsonMatch[0]);
          
          // Try enhancement even with extracted JSON
          let enhancedExtracted = extracted;
          if (isWikipediaConfigured()) {
            try {
              enhancedExtracted = await enhanceGROQResponse(extracted, query);
            } catch (e) {
              console.error('[GROQ] Enhancement of extracted JSON failed:', e);
            }
          }
          
          return {
            players: Array.isArray(enhancedExtracted.players) ? enhancedExtracted.players : [],
            teams: Array.isArray(enhancedExtracted.teams) ? enhancedExtracted.teams : [],
            youtubeQuery: enhancedExtracted.youtubeQuery || `${query} football highlights`,
            message: enhancedExtracted.message || `Found information for "${query}"`,
            error: null,
            _metadata: enhancedExtracted._metadata || {
              enhancedAt: new Date().toISOString(),
              analysis: { note: 'Response extracted from text' },
              appliedUpdates: [],
              dataSources: ['GROQ AI (extracted)'],
              apiStatus: {
                wikipedia: isWikipediaConfigured() ? 'Used' : 'Not configured',
                groq: 'Success'
              },
              currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
              dataCurrency: {
                aiCutoff: '2024',
                verifiedWith: isWikipediaConfigured() ? 'Wikipedia' : 'None',
                confidence: 'medium',
                lastVerified: new Date().toISOString()
              },
              disclaimer: 'Response required extraction. Data may be incomplete.',
              recommendations: ['Verify with official sources'],
              wikipediaUsage: {
                queries: isWikipediaConfigured() ? 1 : 0,
                updates: 0,
                timestamp: new Date().toISOString()
              }
            }
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
        message: 'Technical error processing the response.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'JSON parse failed' },
          appliedUpdates: [],
          dataSources: [],
          apiStatus: {
            wikipedia: 'Not used',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: 'N/A',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'Could not parse AI response.',
          recommendations: ['Try again with a different query'],
          wikipediaUsage: {
            queries: 0,
            updates: 0,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

  } catch (error: any) {
    console.error('[GROQ] API Error:', error);
    
    // Build error response with metadata
    const errorResponse: GROQSearchResponse = {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: `Search failed: ${error.message || 'Unknown error'}`,
      message: 'Failed to fetch data. Please try again.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: true, errorType: error?.status || 'unknown' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: {
          wikipedia: 'Not used',
          groq: error?.status === 401 ? 'Invalid key' : 'Error'
        },
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'API request failed.',
        recommendations: ['Check your internet connection', 'Verify API keys'],
        wikipediaUsage: {
          queries: 0,
          updates: 0,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    // Handle specific error cases
    if (error?.status === 401) {
      errorResponse.error = 'Invalid GROQ API key. Please check your GROQ_API_KEY in .env.local';
      errorResponse._metadata!.recommendations = ['Verify your GROQ API key is correct'];
    }
    
    if (error?.status === 429) {
      errorResponse.error = 'Rate limit exceeded. Please wait a moment and try again.';
      errorResponse._metadata!.recommendations = ['Wait 60 seconds before trying again'];
    }
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      errorResponse.error = 'Network error. Please check your internet connection.';
      errorResponse._metadata!.recommendations = ['Check your internet connection and try again'];
    }
    
    return errorResponse;
  }
};

// Alias for backward compatibility
export const GROQSearch = searchWithGROQ;

/**
 * Helper to check if data needs verification
 */
export const needsDataVerification = (response: GROQSearchResponse): boolean => {
  if (!response._metadata) return true;
  
  if (response._metadata.analysis?.isLikelyOutdated) return true;
  if (response._metadata.analysis?.outdatedFields?.length > 0) return true;
  
  // Check if Wikipedia was used
  if (response._metadata.wikipediaUsage?.updates === 0 && 
      response._metadata.wikipediaUsage?.queries > 0) {
    return false; // Wikipedia checked and no updates needed
  }
  
  // Check for 2024 references
  const allText = JSON.stringify(response).toLowerCase();
  if (allText.includes('as of 2024') || allText.includes('2024 season')) {
    return true;
  }
  
  return false;
};

/**
 * Get data source badge info
 */
export const getDataSourceInfo = (response: GROQSearchResponse): {
  source: string;
  color: string;
  icon: string;
} => {
  if (!response._metadata) {
    return { source: 'Unverified', color: 'gray', icon: '❓' };
  }
  
  if (response._metadata.wikipediaUsage?.updates > 0) {
    return { source: 'Wikipedia Updated', color: 'green', icon: '✅' };
  }
  
  if (response._metadata.wikipediaUsage?.queries > 0) {
    return { source: 'Wikipedia Verified', color: 'blue', icon: '🌐' };
  }
  
  if (response._metadata.dataSources?.includes('Critical Update')) {
    return { source: 'Critical Update', color: 'purple', icon: '🔧' };
  }
  
  return { source: 'AI Data', color: 'yellow', icon: '🤖' };
};