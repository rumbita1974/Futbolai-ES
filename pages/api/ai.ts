import type { NextApiRequest, NextApiResponse } from 'next';
import { Groq } from 'groq-sdk';
import axios from 'axios';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const { data, timestamp } = cached;
  if (Date.now() - timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return data;
}

function setInCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Initialize Groq client
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required.');
  }
  return new Groq({ apiKey });
}

// Detect if query is in Spanish
function isSpanishQuery(query: string): boolean {
  const spanishWords = [
    'futbol', 'fútbol', 'liga', 'equipo', 'jugador', 'entrenador', 
    'gol', 'goles', 'partido', 'campeonato', 'estadio', 'club',
    'del', 'de', 'y', 'con', 'para', 'por', 'más', 'muy'
  ];
  
  const commonSpanishNames = [
    'messi', 'ronaldo', 'neymar', 'suárez', 'benzema', 'modric',
    'iniesta', 'xavi', 'piqué', 'ramos', 'casillas', 'ibrahimovic'
  ];
  
  const queryLower = query.toLowerCase();
  
  // Check for Spanish-specific characters
  const hasSpanishChars = /[áéíóúñÁÉÍÓÚÑ]/.test(query);
  
  // Check for common Spanish football terms
  const hasSpanishTerms = spanishWords.some(word => 
    queryLower.includes(` ${word} `) || 
    queryLower.startsWith(`${word} `) || 
    queryLower.endsWith(` ${word}`)
  );
  
  // Check for common Spanish names
  const hasSpanishName = commonSpanishNames.some(name => 
    queryLower.includes(name)
  );
  
  return hasSpanishChars || hasSpanishTerms || hasSpanishName;
}

// Smart type detection using AI
async function detectQueryTypeWithAI(query: string): Promise<string> {
  const groq = getGroqClient();
  
  const prompt = `Analyze this football query: "${query}"
  
Is this query about:
1. A football PLAYER (individual person)
2. A football CLUB (team like Real Madrid, Barcelona, Manchester United)
3. A NATIONAL TEAM (country like Brazil, Argentina, Spain)
4. WORLD CUP (tournament)

Return ONLY one word: "player", "club", "national", or "worldcup"
Do not include any explanations or additional text.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.toLowerCase().trim() || 'player';
    
    // Validate response
    const validTypes = ['player', 'club', 'national', 'worldcup'];
    const cleanResponse = response.replace(/"/g, '').replace(/'/g, '');
    
    if (validTypes.includes(cleanResponse)) {
      return cleanResponse;
    }
    
    // Fallback based on keywords
    const queryLower = query.toLowerCase();
    if (queryLower.includes('world cup') || queryLower.includes('mundial')) return 'worldcup';
    if (queryLower.includes('fc') || queryLower.includes('cf ') || queryLower.includes(' united') || 
        queryLower.includes(' city') || queryLower.includes(' club')) return 'club';
    
    return 'player'; // Default
  } catch (error) {
    console.error('AI type detection error, using fallback:', error);
    // Fallback to simple detection
    const queryLower = query.toLowerCase();
    if (queryLower.includes('world cup') || queryLower.includes('mundial')) return 'worldcup';
    return 'player'; // Default to player for simplicity
  }
}

// Simple JSON parsing
function safeParseJSON(content: string, query: string) {
  try {
    let cleaned = content.trim();
    
    // Remove markdown
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    
    // Find JSON
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON parse error:', error);
    const currentYear = new Date().getFullYear();
    return { 
      analysis: "Analysis available", 
      videoSearchTerm: `${query} highlights ${currentYear}` 
    };
  }
}

// Get Wikipedia data - SUPPORTS SPANISH
async function getWikipediaData(query: string, type: string): Promise<any> {
  const isSpanish = isSpanishQuery(query);
  const language = isSpanish ? 'es' : 'en';
  const cacheKey = `wikipedia_${language}_${query.toLowerCase()}_${type}`;
  
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    // Clean the query for Wikipedia
    const cleanQuery = query
      .replace(/FC\s+/gi, '')
      .replace(/\s+club$/gi, '')
      .replace(/\s+team$/gi, '')
      .replace(/\s+equipo$/gi, '')
      .trim();
    
    let wikipediaQuery = cleanQuery.replace(/\s+/g, '_');
    
    // Special handling for common queries - NOW MULTI-LANGUAGE
    const specialCases: Record<string, { en: string, es: string }> = {
      // Spanish names
      'real madrid': { 
        en: 'Real_Madrid_CF',
        es: 'Real_Madrid_Club_de_F%C3%BAtbol'
      },
      'barcelona': { 
        en: 'FC_Barcelona',
        es: 'F%C3%BAtbol_Club_Barcelona'
      },
      'messi': { 
        en: 'Lionel_Messi',
        es: 'Lionel_Messi'
      },
      'lionel messi': { 
        en: 'Lionel_Messi',
        es: 'Lionel_Messi'
      },
      'ronaldo': { 
        en: 'Cristiano_Ronaldo',
        es: 'Cristiano_Ronaldo'
      },
      'cristiano ronaldo': { 
        en: 'Cristiano_Ronaldo',
        es: 'Cristiano_Ronaldo'
      },
      'neymar': { 
        en: 'Neymar',
        es: 'Neymar'
      },
      'mbappe': { 
        en: 'Kylian_Mbapp%C3%A9',
        es: 'Kylian_Mbapp%C3%A9'
      },
      'kylian mbappe': { 
        en: 'Kylian_Mbapp%C3%A9',
        es: 'Kylian_Mbapp%C3%A9'
      },
      // Spanish national team
      'spain': { 
        en: 'Spain_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%BAtbol_de_Espa%C3%B1a'
      },
      'españa': { 
        en: 'Spain_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%BAtbol_de_Espa%C3%B1a'
      },
      'argentina': { 
        en: 'Argentina_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%B3tbol_de_Argentina'
      },
      'brasil': { 
        en: 'Brazil_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%BAtbol_de_Brasil'
      },
      'brazil': { 
        en: 'Brazil_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%BAtbol_de_Brasil'
      },
      'méxico': { 
        en: 'Mexico_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%BAtbol_de_M%C3%A9xico'
      },
      'mexico': { 
        en: 'Mexico_national_football_team',
        es: 'Selecci%C3%B3n_de_f%C3%BAtbol_de_M%C3%A9xico'
      },
    };
    
    let finalQuery = wikipediaQuery;
    
    if (specialCases[query.toLowerCase()]) {
      finalQuery = specialCases[query.toLowerCase()][language];
    } else if (type === 'club') {
      // Try common suffixes for clubs
      const suffixes = language === 'es' 
        ? ['_CF', '_(club_de_fútbol)', '_Club_de_Fútbol'] 
        : ['_CF', '_FC', '_(football_club)', '_F.C.'];
      
      for (const suffix of suffixes) {
        try {
          const testQuery = wikipediaQuery + suffix;
          const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${testQuery}`;
          const response = await axios.get(url, { timeout: 3000 });
          if (response.data?.extract) {
            finalQuery = testQuery;
            break;
          }
        } catch {
          continue;
        }
      }
    } else if (type === 'national') {
      // Add national team suffix in appropriate language
      const suffix = language === 'es' 
        ? '_national_football_team'
        : '_selección_de_fútbol';
      
      // Try both formats
      try {
        const testQuery = wikipediaQuery + (language === 'es' ? '_selección_de_fútbol' : '_national_football_team');
        const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${testQuery}`;
        const response = await axios.get(url, { timeout: 3000 });
        if (response.data?.extract) {
          finalQuery = testQuery;
        }
      } catch {
        // Try the other format
        const altQuery = wikipediaQuery + (language === 'es' ? '_national_football_team' : '_selección_de_fútbol');
        finalQuery = altQuery;
      }
    }

    const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${finalQuery}`;
    console.log(`📚 Wikipedia API (${language}): ${url}`);
    
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data?.extract) {
      const wikipediaData = {
        title: response.data.title,
        extract: response.data.extract,
        description: response.data.description,
        thumbnail: response.data.thumbnail?.source,
        url: response.data.content_urls?.desktop?.page,
        timestamp: new Date().toISOString(),
        lastRevised: response.data.timestamp,
        language: language,
        isSpanish: isSpanish
      };
      
      console.log(`📚 Wikipedia found (${language}): ${wikipediaData.title}`);
      setInCache(cacheKey, wikipediaData);
      return wikipediaData;
    }
  } catch (error) {
    console.error(`Wikipedia API error (${language}):`, error);
    
    // If Spanish Wikipedia fails, try English as fallback
    if (isSpanish && language === 'es') {
      console.log('🔄 Spanish Wikipedia failed, trying English...');
      try {
        const englishData = await getWikipediaData(query, type);
        if (englishData.extract) {
          console.log('✅ English Wikipedia succeeded as fallback');
          return {
            ...englishData,
            language: 'en',
            isSpanish: false,
            fellBackToEnglish: true
          };
        }
      } catch (englishError) {
        console.error('English Wikipedia fallback also failed:', englishError);
      }
    }
  }
  
  console.log(`📚 Wikipedia not found for: ${query} (${language})`);
  return {
    extract: '',
    timestamp: new Date().toISOString(),
    language: language,
    isSpanish: isSpanish
  };
}

// Different prompts for different types - NOW MULTI-LANGUAGE
async function analyzeWithPrompt(query: string, type: string, wikipediaData?: any) {
  const groq = getGroqClient();
  
  let prompt = '';
  const currentYear = new Date().getFullYear();
  const isSpanish = wikipediaData?.isSpanish || false;
  
  // Build Wikipedia context in appropriate language
  const wikiContext = wikipediaData?.extract 
    ? `Wikipedia Context (${wikipediaData.language}): ${wikipediaData.extract.substring(0, 500)}`
    : '';
  
  // Spanish prompts
  if (isSpanish) {
    if (type === 'player') {
      prompt = `Analiza al jugador de fútbol: "${query}" (Año actual: ${currentYear})
      
${wikiContext}

IMPORTANTE: Usa SOLO información factual y actual hasta ${currentYear}. No inventes estadísticas.
Si no conoces información actual, indica "Información actual no disponible".

Devuelve un objeto JSON con estos campos:
- name (string): Nombre completo actual
- position (string): Posición de juego actual
- nationality (string): País
- currentClub (string): Equipo actual en ${currentYear}
- age (number): Edad actual
- achievementsSummary (object): { 
  worldCupTitles: number, 
  continentalTitles: number, 
  clubDomesticTitles: { leagues: number, cups: number },
  individualAwards: string[] (Balón de Oro, premios FIFA, etc.)
}
- careerStats (object): {
  club: { totalGoals: number, totalAssists: number, totalAppearances: number },
  international: { caps: number, goals: number, debut: string }
}
- analysis (string): 100 palabras sobre estado ACTUAL, logros recientes (2023-${currentYear}), y estilo de juego
- videoSearchTerm (string): "mejores goles asistencias habilidades" para búsqueda en YouTube

Haz el análisis centrado en información RECIENTE y ACTUAL.`;
    }
    else if (type === 'club') {
      prompt = `Analiza el club de fútbol: "${query}" (Fecha actual: Diciembre 2024)
      
${wikiContext}

CRÍTICO: Usa SOLO información factual y actual de Wikipedia y fuentes confiables.
Para el Real Madrid específicamente:
- Nombre completo: Real Madrid Club de Fútbol
- Apodos: Los Blancos, Los Merengues, Los Vikingos
- Fundado: 6 de marzo de 1902
- Estadio: Estadio Santiago Bernabéu (capacidad: 83,186)
- Presidente: Florentino Pérez
- Entrenador: Xabi Alonso (a partir de diciembre de 2024)
- Liga: La Liga
- Posición actual: 2º en La Liga (temporada 2024-25)
- Títulos UEFA Champions League: 15 (más reciente: 2024)
- Títulos recientes clave: UEFA Champions League 2024, La Liga 2023-24

Devuelve un objeto JSON con estos campos EXACTOS:
- name (string): Nombre del club
- type (string): Siempre "club"
- founded (string/number): Año de fundación
- league (string): Liga actual (temporada 2024-2025)
- currentManager (object): { name: string, nationality: string, appointmentYear: number }
- stadium (object): { name: string, capacity: number, location: string }
- achievementsSummary (object): { 
  continentalTitles: number,
  internationalTitles: number,
  domesticTitles: { leagues: number, cups: number }
}
- trophies (object): {
  continental: { competition: string, wins: number, lastWin: number }[],
  international: { competition: string, wins: number, lastWin: number }[],
  domestic: { 
    league: { competition: string, wins: number, lastWin: number }[],
    cup: { competition: string, wins: number, lastWin: number }[]
  }
}
- analysis (string): 150 palabras sobre rendimiento ACTUAL (temporada 2024-25), logros recientes, estilo de juego
- videoSearchTerm (string): "mejores goles momentos 2024" para búsqueda en YouTube

IMPORTANTE: Sé específico con las competiciones:
- Continental: UEFA Champions League, UEFA Europa League, UEFA Super Cup
- Liga doméstica: La Liga, Premier League, Bundesliga, Serie A, Ligue 1
- Copa doméstica: Copa del Rey, FA Cup, DFB-Pokal, Coppa Italia, Coupe de France`;
    }
    else if (type === 'national') {
      prompt = `Analiza la selección nacional de fútbol: "${query}" (Año actual: ${currentYear})
      
${wikiContext}

IMPORTANTE: Usa SOLO información factual y actual hasta ${currentYear}. 
Incluye ranking FIFA ACTUAL, desempeño reciente en torneos (2020-${currentYear}), entrenador ACTUAL, y estadio local.

Devuelve un objeto JSON con estos campos:
- name (string): Nombre del país
- type (string): Siempre "national"
- fifaRanking (string/number): Ranking FIFA actual (${currentYear})
- currentCoach (object): { name: string, nationality: string, appointmentYear: number }
- stadium (object): { name: string, capacity: number, location: string } (estadio principal/local)
- achievementsSummary (object): { 
  worldCupTitles: number, 
  continentalTitles: number,
  olympicTitles: number
}
- trophies (object): {
  worldCup: { wins: number, lastWin: number },
  continental: { competition: string, wins: number, lastWin: number }[] (Copa América, UEFA Euro, Copa Asiática, etc.),
  other: { competition: string, wins: number, lastWin: number }[] (Copa Confederaciones, UEFA Nations League, etc.)
}
- analysis (string): 120 palabras sobre estado ACTUAL del equipo (${currentYear}), desempeño reciente, entrenador, y perspectivas
- videoSearchTerm (string): "mejores goles momentos ${currentYear}" para búsqueda en YouTube

Enfócate en torneos RECIENTES (2020-${currentYear}) y plantilla ACTUAL.`;
    }
    else { // worldcup
      prompt = `Analiza: "${query}" (Año actual: ${currentYear})
      
${wikiContext}

Devuelve un objeto JSON con estos campos:
- worldCupInfo (object): { 
  year: number, 
  host: string, 
  defendingChampion: string,
  qualifiedTeams: number,
  hostCities: string[]
}
- analysis (string): 100 palabras sobre estado ACTUAL del torneo, equipos clasificados, perspectivas
- videoSearchTerm (string): "mejores goles momentos copa mundo" para búsqueda en YouTube

Enfócate en información ACTUAL sobre próximas o recientes Copas del Mundo.`;
    }
  } 
  // English prompts (fallback)
  else {
    if (type === 'player') {
      prompt = `Analyze football player: "${query}" (Current year: ${currentYear})
      
${wikiContext}

IMPORTANT: Use ONLY factual, current information up to ${currentYear}. Do not make up statistics.
If you don't know current information, state "Current information not available".

Return a JSON object with these fields:
- name (string): Full current name
- position (string): Current playing position
- nationality (string): Country
- currentClub (string): Current team as of ${currentYear}
- age (number): Current age
- achievementsSummary (object): { 
  worldCupTitles: number, 
  continentalTitles: number, 
  clubDomesticTitles: { leagues: number, cups: number },
  individualAwards: string[] (Ballon d'Or, FIFA awards, etc.)
}
- careerStats (object): {
  club: { totalGoals: number, totalAssists: number, totalAppearances: number },
  international: { caps: number, goals: number, debut: string }
}
- analysis (string): 100 words about CURRENT status, recent achievements (2023-${currentYear}), and playing style
- videoSearchTerm (string): "best highlights goals assists" for YouTube search

Make the analysis focus on RECENT and CURRENT information.`;
    }
    else if (type === 'club') {
      prompt = `Analyze football club: "${query}" (Current date: December 2024)
      
${wikiContext}

CRITICAL: Use ONLY factual, current information from Wikipedia and reliable sources.
For Real Madrid specifically:
- Full name: Real Madrid Club de Fútbol
- Nicknames: Los Blancos, Los Merengues, Los Vikingos
- Founded: 6 March 1902
- Stadium: Estadio Santiago Bernabéu (capacity: 83,186)
- President: Florentino Pérez
- Head coach: Xabi Alonso (as of December 2024)
- League: La Liga
- Current position: 2nd in La Liga (2024-25 season)
- UEFA Champions League titles: 15 (most recent: 2024)
- Key recent trophies: UEFA Champions League 2024, La Liga 2023-24

Return a JSON object with these EXACT fields:
- name (string): Club name
- type (string): Always "club"
- founded (string/number): Year founded
- league (string): Current league (2024-2025 season)
- currentManager (object): { name: string, nationality: string, appointmentYear: number }
- stadium (object): { name: string, capacity: number, location: string }
- achievementsSummary (object): { 
  continentalTitles: number,
  internationalTitles: number,
  domesticTitles: { leagues: number, cups: number }
}
- trophies (object): {
  continental: { competition: string, wins: number, lastWin: number }[],
  international: { competition: string, wins: number, lastWin: number }[],
  domestic: { 
    league: { competition: string, wins: number, lastWin: number }[],
    cup: { competition: string, wins: number, lastWin: number }[]
  }
}
- analysis (string): 150 words about CURRENT performance (2024-25 season), recent achievements, playing style
- videoSearchTerm (string): "best goals highlights 2024" for YouTube search

IMPORTANT: Be specific with trophy competitions:
- Continental: UEFA Champions League, UEFA Europa League, UEFA Super Cup
- Domestic league: La Liga, Premier League, Bundesliga, Serie A, Ligue 1
- Domestic cup: Copa del Rey, FA Cup, DFB-Pokal, Coppa Italia, Coupe de France`;
    }
    else if (type === 'national') {
      prompt = `Analyze national football team: "${query}" (Current year: ${currentYear})
      
${wikiContext}

IMPORTANT: Use ONLY factual, current information up to ${currentYear}. 
Include CURRENT FIFA ranking, RECENT tournament performance (2020-${currentYear}), CURRENT coach, and home stadium.

Return a JSON object with these fields:
- name (string): Country name
- type (string): Always "national"
- fifaRanking (string/number): Current FIFA ranking (${currentYear})
- currentCoach (object): { name: string, nationality: string, appointmentYear: number }
- stadium (object): { name: string, capacity: number, location: string } (main/home stadium)
- achievementsSummary (object): { 
  worldCupTitles: number, 
  continentalTitles: number,
  olympicTitles: number
}
- trophies (object): {
  worldCup: { wins: number, lastWin: number },
  continental: { competition: string, wins: number, lastWin: number }[] (Copa America, UEFA Euro, AFC Asian Cup, etc.),
  other: { competition: string, wins: number, lastWin: number }[] (FIFA Confederations Cup, UEFA Nations League, etc.)
}
- analysis (string): 120 words about CURRENT team status (${currentYear}), recent performance, coach, and prospects
- videoSearchTerm (string): "best goals highlights ${currentYear}" for YouTube search

Focus on RECENT tournaments (2020-${currentYear}) and CURRENT squad.`;
    }
    else { // worldcup
      prompt = `Analyze: "${query}" (Current year: ${currentYear})
      
${wikiContext}

Return a JSON object with these fields:
- worldCupInfo (object): { 
  year: number, 
  host: string, 
  defendingChampion: string,
  qualifiedTeams: number,
  hostCities: string[]
}
- analysis (string): 100 words about CURRENT tournament status, qualified teams, prospects
- videoSearchTerm (string): "best goals highlights world cup" for YouTube search

Focus on CURRENT information about upcoming or recent World Cups.`;
    }
  }
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return safeParseJSON(content, query);
    
  } catch (error) {
    console.error('Groq error:', error);
    const currentYear = new Date().getFullYear();
    return { 
      analysis: isSpanish 
        ? `Datos temporalmente no disponibles. Por favor, intente nuevamente. (Actual: ${currentYear})`
        : `Data temporarily unavailable. Please try again. (Current: ${currentYear})`,
      videoSearchTerm: `${query} highlights ${currentYear}`
    };
  }
}

// YouTube search - IMPROVED for Spanish searches
async function searchYouTube(searchTerm: string, entityType?: string, isSpanish?: boolean) {
  const cacheKey = `youtube_${searchTerm}_${entityType || 'general'}_${isSpanish ? 'es' : 'en'}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached as string;

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const currentYear = new Date().getFullYear();
    
    if (!apiKey) {
      console.log('⚠️ No YouTube API key, using reliable fallback videos');
      return getAppropriateFallback(searchTerm, entityType, isSpanish);
    }

    // Build search query in appropriate language
    let youtubeQuery = searchTerm;
    
    if (isSpanish) {
      if (entityType === 'player') {
        youtubeQuery = `${searchTerm} mejores goles habilidades asistencias ${currentYear}`;
      } else if (entityType === 'club') {
        youtubeQuery = `${searchTerm} mejores momentos goles ${currentYear}`;
      } else if (entityType === 'national') {
        youtubeQuery = `${searchTerm} selección nacional mejores goles ${currentYear}`;
      } else if (entityType === 'worldcup') {
        youtubeQuery = `${searchTerm} copa mundo mejores momentos`;
      }
    } else {
      if (entityType === 'player') {
        youtubeQuery = `${searchTerm} best goals skills assists ${currentYear}`;
      } else if (entityType === 'club') {
        youtubeQuery = `${searchTerm} best moments highlights ${currentYear}`;
      } else if (entityType === 'national') {
        youtubeQuery = `${searchTerm} national team highlights ${currentYear}`;
      } else if (entityType === 'worldcup') {
        youtubeQuery = `${searchTerm} world cup highlights`;
      }
    }

    // Use fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const safeSearchTerm = encodeURIComponent(youtubeQuery);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${safeSearchTerm}&type=video&maxResults=10&key=${apiKey}&videoEmbeddable=true&order=relevance&safeSearch=moderate&videoDuration=medium`;
    
    console.log(`🎬 YouTube API Search (${isSpanish ? 'ES' : 'EN'}):`, youtubeQuery);
    
    const response = await fetch(url, { signal: controller.signal });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('⚠️ YouTube API error:', response.status, response.statusText);
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.items?.length > 0) {
      // Try to find the most relevant video
      let bestVideo = null;
      
      for (const item of data.items) {
        if (item.id?.videoId) {
          bestVideo = item;
          break;
        }
      }
      
      if (bestVideo && bestVideo.id?.videoId) {
        const videoId = bestVideo.id.videoId;
        const url = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`;
        console.log('✅ Found YouTube video:', bestVideo.snippet.title);
        setInCache(cacheKey, url);
        return url;
      }
    }
    
    console.log('⚠️ No YouTube results found, using fallback');
    return getAppropriateFallback(searchTerm, entityType, isSpanish);
    
  } catch (error) {
    console.error('❌ YouTube API error, using fallback:', error);
    return getAppropriateFallback(searchTerm, entityType, isSpanish);
  }
}

// Helper function for better fallback videos
function getAppropriateFallback(searchTerm: string, entityType?: string, isSpanish?: boolean) {
  const term = searchTerm.toLowerCase();
  
  // Player-specific fallbacks
  if (entityType === 'player') {
    const playerFallbacks: Record<string, string> = {
      'messi': 'https://www.youtube.com/embed/ZO0d8r_2qGI',
      'lionel messi': 'https://www.youtube.com/embed/ZO0d8r_2qGI',
      'ronaldo': 'https://www.youtube.com/embed/OUKGsb8CpF8',
      'cristiano ronaldo': 'https://www.youtube.com/embed/OUKGsb8CpF8',
      'cristiano': 'https://www.youtube.com/embed/OUKGsb8CpF8',
      'mbappe': 'https://www.youtube.com/embed/7qOcT4bKKcM',
      'kylian mbappe': 'https://www.youtube.com/embed/7qOcT4bKKcM',
      'neymar': 'https://www.youtube.com/embed/S3fKcL_BqIQ',
    };
    
    for (const [key, url] of Object.entries(playerFallbacks)) {
      if (term.includes(key)) {
        return url;
      }
    }
  }
  
  // General football fallbacks
  const generalFallbacks = [
    'https://www.youtube.com/embed/dZqkf1ZnQh4',  // Football skills compilation
    'https://www.youtube.com/embed/1oQXwV-dKxM',  // Amazing goals
    'https://www.youtube.com/embed/6h7aF0IBmMc',  // Premier League highlights
    'https://www.youtube.com/embed/XfyZ6EueJx8',  // Champions League
    'https://www.youtube.com/embed/3X7XG5KZiUY',  // World Cup
  ];
  
  return generalFallbacks[Math.floor(Math.random() * generalFallbacks.length)];
}

// Main API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, query } = req.query;

  if (action === 'search' && query && typeof query === 'string') {
    console.log(`\n=== SEARCH: "${query}" ===`);
    
    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}`;
    const cachedResponse = getFromCache(cacheKey);
    if (cachedResponse) {
      console.log('✅ Returning cached response');
      return res.status(200).json(cachedResponse);
    }
    
    try {
      // DETECT TYPE WITH AI
      const detectedType = await detectQueryTypeWithAI(query);
      console.log('🎯 AI detected type:', detectedType);
      
      // CHECK IF SPANISH QUERY
      const isSpanish = isSpanishQuery(query);
      console.log(`🌐 Language detected: ${isSpanish ? 'Spanish' : 'English'}`);
      
      // GET WIKIPEDIA DATA IN APPROPRIATE LANGUAGE
      const wikipediaData = await getWikipediaData(query, detectedType);
      console.log(`📚 Wikipedia data (${wikipediaData.language}):`, wikipediaData.title || 'Not found');
      
      // Get AI analysis WITH Wikipedia context
      const aiAnalysis = await analyzeWithPrompt(query, detectedType, wikipediaData);
      console.log('✅ Got AI analysis with current data');
      
      // Build response based on detected type
      let responseData: any = {
        name: query,
        ...aiAnalysis,
        wikipedia: wikipediaData,
        lastUpdated: new Date().toISOString(),
        currentYear: new Date().getFullYear(),
        language: wikipediaData.language,
        isSpanish: wikipediaData.isSpanish
      };
      
      // Ensure consistent structure
      if (detectedType === 'club') {
        responseData.type = 'club';
        // Ensure stadium object exists
        if (!responseData.stadium) {
          responseData.stadium = {
            name: isSpanish ? 'Información no disponible' : 'Information not available',
            capacity: 0,
            location: isSpanish ? 'Información no disponible' : 'Information not available'
          };
        }
      } else if (detectedType === 'national') {
        responseData.type = 'national';
        // Ensure stadium object exists for national teams
        if (!responseData.stadium) {
          responseData.stadium = {
            name: isSpanish ? 'Estadio Nacional' : 'National Stadium',
            capacity: 0,
            location: isSpanish ? 'Información no disponible' : 'Information not available'
          };
        }
      } else if (detectedType === 'worldcup') {
        responseData.worldCupInfo = { year: new Date().getFullYear(), ...aiAnalysis };
      }
      
      // Get video with appropriate language context
      const videoSearchTerm = aiAnalysis.videoSearchTerm || 
        (isSpanish 
          ? `${query} fútbol highlights ${new Date().getFullYear()}`
          : `${query} football highlights ${new Date().getFullYear()}`);
      
      const youtubeUrl = await searchYouTube(videoSearchTerm, detectedType, isSpanish);
      
      // Build final response
      const response = {
        success: true,
        query: query,
        timestamp: new Date().toISOString(),
        type: detectedType,
        data: responseData,
        playerInfo: detectedType === 'player' ? responseData : null,
        teamInfo: (detectedType === 'club' || detectedType === 'national') ? responseData : null,
        worldCupInfo: detectedType === 'worldcup' ? responseData : null,
        youtubeUrl: youtubeUrl,
        analysis: aiAnalysis.analysis || (isSpanish ? `Análisis de ${query}` : `Analysis of ${query}`),
        confidence: 0.9,
        source: 'Groq AI + Wikipedia',
        language: wikipediaData.language,
        isSpanish: wikipediaData.isSpanish
      };

      // Cache the response
      setInCache(cacheKey, response);
      
      console.log('🚀 Sending response with type:', detectedType, 'Language:', wikipediaData.language);
      console.log('🎥 YouTube URL:', youtubeUrl);
      return res.status(200).json(response);
      
    } catch (error) {
      console.error('API error:', error);
      
      const errorResponse = {
        success: false,
        query: query,
        type: 'error',
        error: 'Service issue',
        timestamp: new Date().toISOString(),
        youtubeUrl: 'https://www.youtube.com/embed/dZqkf1ZnQh4',
        analysis: `Please try again.`,
      };
      
      return res.status(200).json(errorResponse);
    }
  }

  res.status(200).json({
    message: 'FutbolAI API - AI-Powered Football Intelligence',
    version: '6.0',
    features: ['Wikipedia Integration (EN/ES)', 'Current Data', 'YouTube Highlights', 'Multi-language Support'],
    languages: ['English', 'Spanish']
  });
}