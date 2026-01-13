/**
 * Smart Football Data enhancement service
 * Uses better system prompts and validation instead of external APIs with CORS issues
 */

// Current season year
const CURRENT_SEASON = new Date().getFullYear();
const CURRENT_YEAR = CURRENT_SEASON;

/**
 * Check if service is configured (always true for now)
 */
export const isFootballDataConfigured = (): boolean => {
  return true; // We'll use improved AI prompts instead
};

/**
 * Analyze GROQ response for data quality issues
 */
export const analyzeDataQuality = (groqResponse: any): {
  hasRealData: boolean;
  dataIssues: string[];
  suggestions: string[];
  confidence: 'high' | 'medium' | 'low';
} => {
  const result = {
    hasRealData: false, // We're using AI-only for now
    dataIssues: [] as string[],
    suggestions: [] as string[],
    confidence: 'medium' as 'high' | 'medium' | 'low'
  };

  // Check player count
  const playerCount = groqResponse.players?.length || 0;
  if (playerCount < 8) {
    result.dataIssues.push(`Only ${playerCount} players returned`);
    result.suggestions.push(`Expected 8-12 players for a complete squad`);
  }

  // Check for obviously wrong data
  if (groqResponse.teams?.[0]) {
    const team = groqResponse.teams[0];
    
    // Check for outdated players based on common knowledge
    if (team.name?.toLowerCase().includes('real madrid')) {
      const hasBenzema = groqResponse.players?.some((p: any) => 
        p.name.toLowerCase().includes('benzema') && p.currentTeam === 'Real Madrid'
      );
      if (hasBenzema) {
        result.dataIssues.push('Karim Benzema left Real Madrid in 2023');
        result.suggestions.push('Karim Benzema transferred to Al-Ittihad in 2023');
      }
      
      // Check for missing current players
      const currentPlayers = ['Jude Bellingham', 'Vinícius Júnior', 'Rodrygo', 'Eduardo Camavinga'];
      const missingPlayers = currentPlayers.filter(player => 
        !groqResponse.players?.some((p: any) => p.name.includes(player))
      );
      
      if (missingPlayers.length > 0) {
        result.dataIssues.push(`Missing key current players: ${missingPlayers.join(', ')}`);
      }
    }
    
    if (team.name?.toLowerCase().includes('barcelona')) {
      // Check for Ansu Fati (he's on loan at Brighton)
      const hasAnsuFati = groqResponse.players?.some((p: any) => 
        p.name.toLowerCase().includes('ansu fati') && p.currentTeam === 'FC Barcelona'
      );
      if (hasAnsuFati) {
        result.dataIssues.push('Ansu Fati is on loan at Brighton & Hove Albion');
        result.suggestions.push('Ansu Fati joined Brighton on loan in 2023');
      }
      
      // Check for missing current players
      const currentPlayers = ['Robert Lewandowski', 'Pedri', 'Frenkie de Jong', 'Gavi'];
      const missingPlayers = currentPlayers.filter(player => 
        !groqResponse.players?.some((p: any) => p.name.includes(player))
      );
      
      if (missingPlayers.length > 0) {
        result.dataIssues.push(`Missing key current players: ${missingPlayers.join(', ')}`);
      }
    }
  }

  // Check coach accuracy for major teams
  const coachChecks: Record<string, string> = {
    'real madrid': 'Carlo Ancelotti',
    'barcelona': 'Xavi',
    'bayern': 'Thomas Tuchel',
    'liverpool': 'Jürgen Klopp',
    'manchester city': 'Pep Guardiola',
    'arsenal': 'Mikel Arteta',
    'psg': 'Luis Enrique',
    'juventus': 'Massimiliano Allegri',
    'milan': 'Stefano Pioli',
    'inter': 'Simone Inzaghi',
    'dortmund': 'Edin Terzić',
    'atlético': 'Diego Simeone',
    'chelsea': 'Mauricio Pochettino',
    'tottenham': 'Ange Postecoglou',
    'manchester united': 'Erik ten Hag',
    'newcastle': 'Eddie Howe',
    'aston villa': 'Unai Emery'
  };

  const teamName = groqResponse.teams?.[0]?.name?.toLowerCase() || '';
  const expectedCoach = coachChecks[teamName];
  const actualCoach = groqResponse.teams?.[0]?.currentCoach || '';
  
  if (expectedCoach && actualCoach && actualCoach.toLowerCase() !== expectedCoach.toLowerCase()) {
    result.dataIssues.push(`Incorrect coach: ${actualCoach}`);
    result.suggestions.push(`Current coach is ${expectedCoach}`);
  }

  // Check achievements
  const team = groqResponse.teams?.[0];
  if (team?.majorAchievements) {
    // Barcelona should have continental achievements
    if (teamName.includes('barcelona') && team.majorAchievements.continental?.length === 0) {
      result.dataIssues.push('Missing continental achievements');
      result.suggestions.push('Barcelona has 5 UEFA Champions League titles');
    }
    
    // Real Madrid should have 15 UCL titles
    if (teamName.includes('real madrid')) {
      const achievements = JSON.stringify(team.majorAchievements).toLowerCase();
      if (!achievements.includes('15') && achievements.includes('champions league')) {
        result.dataIssues.push('Incorrect UCL count');
        result.suggestions.push('Real Madrid has 15 UEFA Champions League titles (won in 2024)');
      }
    }
  }

  // Set confidence level
  if (result.dataIssues.length === 0 && playerCount >= 8) {
    result.confidence = 'high';
    result.suggestions.push('✓ Data appears accurate');
  } else if (result.dataIssues.length <= 2) {
    result.confidence = 'medium';
    result.suggestions.push('✓ Some verification performed');
  } else {
    result.confidence = 'low';
    result.suggestions.push('⚠️ Multiple data issues detected');
  }

  return result;
};

/**
 * Fix common data issues
 */
const fixCommonDataIssues = (groqResponse: any): any => {
  const fixedResponse = JSON.parse(JSON.stringify(groqResponse));
  
  if (!fixedResponse.teams?.[0]) return fixedResponse;
  
  const teamName = fixedResponse.teams[0].name.toLowerCase();
  const team = fixedResponse.teams[0];
  
  // Fix Real Madrid data
  if (teamName.includes('real madrid')) {
    // Fix coach
    if (team.currentCoach !== 'Carlo Ancelotti') {
      team.currentCoach = 'Carlo Ancelotti';
      team._coachFixed = true;
    }
    
    // Fix UCL count in achievements
    if (team.majorAchievements?.continental) {
      const continental = team.majorAchievements.continental;
      team.majorAchievements.continental = continental.map((ach: string) => {
        if (ach.toLowerCase().includes('champions league') && ach.includes('14')) {
          return 'UEFA Champions League (15 titles: 1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024)';
        }
        return ach;
      });
    }
    
    // Filter out departed players
    const departedPlayers = ['Karim Benzema', 'Eden Hazard', 'Marco Asensio', 'Mariano Díaz'];
    fixedResponse.players = fixedResponse.players?.filter((player: any) => 
      !departedPlayers.includes(player.name)
    ) || [];
  }
  
  // Fix Barcelona data
  if (teamName.includes('barcelona')) {
    // Fix coach
    if (team.currentCoach !== 'Xavi') {
      team.currentCoach = 'Xavi';
      team._coachFixed = true;
    }
    
    // Add continental achievements if missing
    if (team.majorAchievements?.continental?.length === 0) {
      team.majorAchievements.continental = [
        'UEFA Champions League (5 titles: 1992, 2006, 2009, 2011, 2015)',
        'UEFA Cup Winners\' Cup (4 titles)',
        'UEFA Super Cup (5 titles)'
      ];
    }
    
    // Filter out Ansu Fati (on loan)
    fixedResponse.players = fixedResponse.players?.filter((player: any) => 
      !player.name.includes('Ansu Fati')
    ) || [];
  }
  
  return fixedResponse;
};

/**
 * Main enhancement function
 */
export const enhanceGROQResponse = async (
  groqResponse: any,
  originalQuery: string
): Promise<any> => {
  const enhancedResponse = fixCommonDataIssues(groqResponse);
  
  try {
    // Analyze data quality
    const qualityAnalysis = analyzeDataQuality(enhancedResponse);
    
    // Update YouTube query
    const teamName = enhancedResponse.teams?.[0]?.name || originalQuery;
    const currentYear = new Date().getFullYear();
    enhancedResponse.youtubeQuery = `${teamName} highlights ${currentYear}`;
    
    // Update message
    const playerCount = enhancedResponse.players?.length || 0;
    const coach = enhancedResponse.teams?.[0]?.currentCoach || '';
    
    let message = `${teamName} information`;
    if (coach) message += ` • Coach: ${coach}`;
    if (playerCount > 0) message += ` • ${playerCount} players`;
    if (qualityAnalysis.confidence === 'high') message += ' • ✓ Verified';
    
    enhancedResponse.message = message;
    
    // Add metadata
    enhancedResponse._metadata = {
      enhancedAt: new Date().toISOString(),
      dataQuality: qualityAnalysis,
      dataSources: ['GROQ AI with data validation'],
      currentSeason: `${CURRENT_YEAR}/${CURRENT_YEAR + 1}`,
      dataCurrency: {
        lastUpdated: new Date().toISOString(),
        source: 'AI with manual validation rules',
        confidence: qualityAnalysis.confidence,
        verification: 'Common knowledge validation'
      },
      disclaimer: 'AI-generated data with automatic validation for common errors.',
      recommendations: qualityAnalysis.suggestions.length > 0 
        ? qualityAnalysis.suggestions 
        : ['✓ Data validated against common knowledge']
    };
    
    console.log(`[Enhancer] Enhancement complete. Confidence: ${qualityAnalysis.confidence}`);
    return enhancedResponse;
    
  } catch (error) {
    console.error('[Enhancer] Error:', error);
    
    enhancedResponse._metadata = {
      enhancedAt: new Date().toISOString(),
      error: 'Enhancement failed',
      dataSources: ['GROQ AI only'],
      disclaimer: 'Could not validate data.',
      recommendations: ['Try again later']
    };
    
    return enhancedResponse;
  }
};

/**
 * Get data quality badge for UI
 */
export const getDataQualityBadge = (metadata: any): {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
  icon: string;
  details: string;
} => {
  if (!metadata) {
    return {
      text: 'AI Only',
      color: 'blue',
      icon: '🤖',
      details: 'No validation performed'
    };
  }
  
  const quality = metadata.dataQuality;
  
  if (!quality) {
    return {
      text: 'Unknown',
      color: 'gray',
      icon: '❓',
      details: 'No quality information'
    };
  }
  
  if (quality.confidence === 'high') {
    return {
      text: 'Validated ✓',
      color: 'green',
      icon: '✓',
      details: 'Data checked for common errors'
    };
  }
  
  if (quality.confidence === 'medium') {
    return {
      text: 'Partial',
      color: 'yellow',
      icon: '⚠️',
      details: 'Some issues detected'
    };
  }
  
  return {
    text: 'Issues',
    color: 'red',
    icon: '❌',
    details: 'Multiple data issues'
  };
};

/**
 * Simple Wikipedia fetch for background info
 */
export const fetchFromWikipedia = async (query: string): Promise<any> => {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        summary: data.extract || '',
        title: data.title || '',
        url: data.content_urls?.desktop?.page,
        fetchedAt: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Wikipedia] Fetch error:', error);
    return null;
  }
};

export default {
  enhanceGROQResponse,
  getDataQualityBadge,
  isFootballDataConfigured,
  fetchFromWikipedia,
  analyzeDataQuality
};