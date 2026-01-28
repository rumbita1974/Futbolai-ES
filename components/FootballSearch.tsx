// components/footballsearch.tsx - UPDATED WITH REAL-TIME VERIFICATION
'use client'

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface FootballSearchProps {
  onPlayerSelect: (player: any) => void;
  onTeamSelect: (team: any) => void;
  onVideoFound: (url: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onAnalysisUpdate: (analysis: string) => void;
  onTeamsUpdate: (teams: any[]) => void;
  onWorldCupUpdate: (worldCupInfo: any) => void;
}

export default function FootballSearch({
  onPlayerSelect,
  onTeamSelect,
  onVideoFound,
  onLoadingChange,
  onAnalysisUpdate,
  onTeamsUpdate,
  onWorldCupUpdate,
}: FootballSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  
  // Use refs to track the current search and prevent race conditions
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to clear ALL previous data
  const clearAllPreviousData = useCallback(() => {
    console.log('🧹 Clearing all previous data...');
    onPlayerSelect(null);
    onTeamSelect(null);
    onWorldCupUpdate(null);
    onTeamsUpdate([]);
    onVideoFound('');
    onAnalysisUpdate('');
    setConfidence(null);
  }, [onPlayerSelect, onTeamSelect, onWorldCupUpdate, onTeamsUpdate, onVideoFound, onAnalysisUpdate]);

  // Cleanup function
  const cleanupSearch = useCallback(() => {
    // Cancel any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // Abort any ongoing fetch request
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    
    setIsSearching(false);
  }, []);

  // Handle World Cup 2026 button click
  const handleWorldCup2026Click = () => {
    router.push('/worldcup-2026');
  };

  // Check if query is related to World Cup 2026
  const isWorldCup2026Query = (searchQuery: string): boolean => {
    const worldCupTerms = [
      '2026 fifa world cup',
      'fifa world cup 2026',
      'world cup 2026',
      'worldcup 2026',
      'fifa 2026',
      'copa mundial 2026',
      'mundial 2026',
      'world cup north america',
      'world cup usa canada mexico'
    ];
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return worldCupTerms.some(term => normalizedQuery.includes(term));
  };
// ADD this function right after the cleanupSearch function in FootballSearch.tsx:
const verifyTeamDataWithSportsDB = async (teamName: string) => {
  console.log(`🔍 [SPORTSDB-VERIFY] Starting verification for: ${teamName}`);
  
  try {
    // Step 1: Search for team
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`;
    console.log(`[SPORTSDB-VERIFY] Searching: ${searchUrl}`);
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      console.warn(`[SPORTSDB-VERIFY] Search failed: ${searchResponse.status}`);
      return null;
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.teams || searchData.teams.length === 0) {
      console.log(`[SPORTSDB-VERIFY] No team found: ${teamName}`);
      return null;
    }
    
    const team = searchData.teams[0];
    console.log(`✅ [SPORTSDB-VERIFY] Found: ${team.strTeam}, ID: ${team.idTeam}`);
    
    // Step 2: Get honors/trophies
    let honors = [];
    if (team.idTeam) {
      try {
        const honorsUrl = `https://www.thesportsdb.com/api/v1/json/3/lookuphonors.php?id=${team.idTeam}`;
        console.log(`[SPORTSDB-VERIFY] Fetching honors: ${honorsUrl}`);
        
        const honorsResponse = await fetch(honorsUrl);
        if (honorsResponse.ok) {
          const honorsData = await honorsResponse.json();
          honors = honorsData.honours || [];
          console.log(`✅ [SPORTSDB-VERIFY] Found ${honors.length} honor records`);
        }
      } catch (e) {
        console.error(`[SPORTSDB-VERIFY] Honors error:`, e);
      }
    }
    
    // Step 3: Analyze trophies
    const trophyAnalysis = {
      championsLeague: 0,
      clubWorldCup: 0,
      domesticLeague: 0,
      domesticCup: 0,
      superCup: 0
    };
    
    // Count each trophy type
    honors.forEach((honor: any) => {
      if (!honor.strHonour) return;
      
      const honorName = honor.strHonour.toLowerCase();
      
      if (honorName.includes('champions league') || honorName.includes('european cup')) {
        trophyAnalysis.championsLeague++;
      } else if (honorName.includes('club world cup') || honorName.includes('intercontinental')) {
        trophyAnalysis.clubWorldCup++;
      } else if (honorName.includes('la liga') || honorName.includes('premier league') || 
                 honorName.includes('bundesliga') || honorName.includes('serie a') || 
                 honorName.includes('ligue 1')) {
        trophyAnalysis.domesticLeague++;
      } else if (honorName.includes('copa del rey') || honorName.includes('fa cup') || 
                 honorName.includes('dfb-pokal') || honorName.includes('coppa italia')) {
        trophyAnalysis.domesticCup++;
      } else if (honorName.includes('supercopa') || honorName.includes('super cup')) {
        trophyAnalysis.superCup++;
      }
    });
    
    console.log(`🏆 [SPORTSDB-VERIFY] Trophy analysis:`, trophyAnalysis);
    
    return {
      verified: true,
      coach: team.strManager,
      stadium: team.strStadium,
      founded: team.intFormedYear,
      league: team.strLeague,
      country: team.strCountry,
      honors,
      trophyAnalysis,
      rawData: team
    };
    
  } catch (error) {
    console.error(`[SPORTSDB-VERIFY] Verification failed for ${teamName}:`, error);
    return null;
  }
};

// THEN in your handleSearch method, FIND this section and ADD the verification code:
// Look for where you process team data (around line where you have: if ((data.type === 'club' || data.type === 'national') && data.teamInfo) {

// Add this RIGHT AFTER you create teamData object but BEFORE onTeamSelect(teamData):
if ((data.type === 'club' || data.type === 'national') && data.teamInfo) {
  console.log('🏟️ Setting team data:', data.teamInfo.name);
  
  // ... your existing team data processing code ...
  
  // Create teamData object first (your existing code)
  const teamData = {
    // ... your existing teamData properties ...
  };
  
  // ====== CRITICAL FIX: ADD VERIFICATION HERE ======
  console.log('🔄 Starting SportsDB verification...');
  const verifiedData = await verifyTeamDataWithSportsDB(data.teamInfo.name);
  
  if (verifiedData && verifiedData.verified) {
    console.log('✅ SportsDB verification successful!');
    
    // Update coach
    if (verifiedData.coach && verifiedData.coach !== 'Unknown') {
      teamData.currentManager = { name: verifiedData.coach };
      teamData.currentCoach = verifiedData.coach;
      teamData.coach = verifiedData.coach;
      console.log(`✅ Coach updated to: ${verifiedData.coach}`);
    }
    
    // Update stadium
    if (verifiedData.stadium) {
      teamData.stadium = verifiedData.stadium;
      teamData.homeStadium = verifiedData.stadium;
    }
    
    // Update founded year
    if (verifiedData.founded) {
      teamData.founded = verifiedData.founded;
    }
    
    // ====== CRITICAL: FIX ACHIEVEMENTS ======
    if (verifiedData.trophyAnalysis) {
      const analysis = verifiedData.trophyAnalysis;
      
      // Clear and rebuild achievements with VERIFIED data
      teamData.achievements = [];
      teamData.majorAchievements = {
        worldCup: [],
        clubWorldCup: [],
        international: [],
        continental: [],
        domestic: []
      };
      
      // Add Champions League titles
      if (analysis.championsLeague > 0) {
        const uclEntry = `${analysis.championsLeague}x UEFA Champions League`;
        teamData.achievements.push(uclEntry);
        teamData.majorAchievements.international.push(uclEntry);
        console.log(`✅ Champions League: ${analysis.championsLeague} titles`);
      }
      
      // Add Club World Cup titles
      if (analysis.clubWorldCup > 0) {
        const cwcEntry = `${analysis.clubWorldCup}x FIFA Club World Cup`;
        teamData.achievements.push(cwcEntry);
        teamData.majorAchievements.international.push(cwcEntry);
        console.log(`✅ Club World Cup: ${analysis.clubWorldCup} titles`);
      }
      
      // Add domestic league titles
      if (analysis.domesticLeague > 0) {
        const leagueName = verifiedData.league || 'Domestic League';
        const leagueEntry = `${analysis.domesticLeague}x ${leagueName}`;
        teamData.achievements.push(leagueEntry);
        teamData.majorAchievements.domestic.push(leagueEntry);
        console.log(`✅ Domestic League: ${analysis.domesticLeague} titles`);
      }
      
      // Add domestic cup titles
      if (analysis.domesticCup > 0) {
        const cupName = data.teamInfo.name.toLowerCase().includes('barcelona') 
          ? 'Copa del Rey' 
          : 'Domestic Cup';
        const cupEntry = `${analysis.domesticCup}x ${cupName}`;
        teamData.achievements.push(cupEntry);
        teamData.majorAchievements.domestic.push(cupEntry);
        console.log(`✅ Domestic Cup: ${analysis.domesticCup} titles`);
      }
      
      // Add super cup titles
      if (analysis.superCup > 0) {
        const superCupEntry = `${analysis.superCup}x Super Cup`;
        teamData.achievements.push(superCupEntry);
        teamData.majorAchievements.domestic.push(superCupEntry);
      }
      
      // Mark as verified
      teamData._verified = true;
      teamData._verificationSource = 'TheSportsDB';
      teamData._verificationDate = new Date().toISOString();
    }
  } else {
    console.log('⚠️ SportsDB verification failed or no data');
  }
  // ====== END OF CRITICAL FIX ======
  
  console.log('🏟️ Enhanced team data with verification');
  onTeamSelect(teamData);
}
  // NEW: Enhanced verification function
  const verifyTeamWithMultipleSources = async (teamName: string): Promise<any> => {
    console.log(`[VERIFICATION] Verifying ${teamName} with multiple sources...`);
    
    const verificationResults = {
      sportsDb: null as any,
      footballData: null as any,
      wikipedia: null as any,
      confidence: 0
    };
    
    try {
      // Try SportsDB first (most reliable for current season)
      const sportsDbResponse = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
      );
      
      if (sportsDbResponse.ok) {
        const sportsDbData = await sportsDbResponse.json();
        if (sportsDbData.teams && sportsDbData.teams.length > 0) {
          verificationResults.sportsDb = sportsDbData.teams[0];
          verificationResults.confidence += 40;
          console.log(`[VERIFICATION] SportsDB found: ${verificationResults.sportsDb.strTeam}`);
          
          // Fetch honors if team ID available
          if (verificationResults.sportsDb.idTeam) {
            try {
              const honorsResponse = await fetch(
                `https://www.thesportsdb.com/api/v1/json/3/lookuphonors.php?id=${verificationResults.sportsDb.idTeam}`
              );
              if (honorsResponse.ok) {
                const honorsData = await honorsResponse.json();
                verificationResults.sportsDb.honors = honorsData.honours || [];
              }
            } catch (e) {
              console.error("Error fetching honors:", e);
            }
          }
        }
      }
    } catch (e) {
      console.error("SportsDB verification failed:", e);
    }
    
    // Try Football Data API
    try {
      const footballDataResponse = await fetch(`/api/football-data?team=${encodeURIComponent(teamName)}`);
      if (footballDataResponse.ok) {
        const footballData = await footballDataResponse.json();
        verificationResults.footballData = footballData;
        verificationResults.confidence += 30;
        console.log(`[VERIFICATION] Football Data API found data`);
      }
    } catch (e) {
      console.error("Football Data API verification failed:", e);
    }
    
    // Try Wikipedia for additional info
    try {
      const wikipediaResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(teamName)}`
      );
      if (wikipediaResponse.ok) {
        const wikipediaData = await wikipediaResponse.json();
        verificationResults.wikipedia = wikipediaData;
        verificationResults.confidence += 20;
        console.log(`[VERIFICATION] Wikipedia found: ${wikipediaData.title}`);
      }
    } catch (e) {
      console.error("Wikipedia verification failed:", e);
    }
    
    return verificationResults;
  };

  // NEW: Enhanced achievement extraction from verified data
  const extractVerifiedAchievements = (verificationData: any, teamData: any) => {
    const achievements = {
      worldCup: [] as string[],
      clubWorldCup: [] as string[],
      international: [] as string[],
      continental: [] as string[],
      domestic: [] as string[]
    };
    
    // Start with SportsDB honors (most reliable for trophy counts)
    if (verificationData.sportsDb?.honors && Array.isArray(verificationData.sportsDb.honors)) {
      const honorCounts: Record<string, number> = {};
      const honorYears: Record<string, string[]> = {};
      
      verificationData.sportsDb.honors.forEach((honor: any) => {
        const honorName = honor.strHonour;
        const season = honor.strSeason || '';
        
        // Extract year from season
        const yearMatch = season.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : '';
        
        if (!honorCounts[honorName]) {
          honorCounts[honorName] = 0;
          honorYears[honorName] = [];
        }
        
        honorCounts[honorName]++;
        if (year) {
          honorYears[honorName].push(year);
        }
      });
      
      // Convert to categorized achievements
      Object.entries(honorCounts).forEach(([honorName, count]) => {
        const honorLower = honorName.toLowerCase();
        const years = honorYears[honorName] || [];
        const recentYear = years.length > 0 ? years[years.length - 1] : '';
        
        let achievementText = `${count}x ${honorName}`;
        if (recentYear) {
          achievementText += ` (last: ${recentYear})`;
        }
        
        if (honorLower.includes('world cup') && !honorLower.includes('club')) {
          achievements.worldCup.push(achievementText);
        } else if (honorLower.includes('club world cup') || honorLower.includes('intercontinental')) {
          achievements.clubWorldCup.push(achievementText);
        } else if (honorLower.includes('champions league') || honorLower.includes('european cup')) {
          achievements.international.push(achievementText);
        } else if (honorLower.includes('uefa') || honorLower.includes('europa') || 
                   honorLower.includes('libertadores') || honorLower.includes('concacaf')) {
          achievements.continental.push(achievementText);
        } else {
          achievements.domestic.push(achievementText);
        }
      });
    }
    
    // Fallback to AI achievements if no verified data
    if (teamData.achievements && achievements.domestic.length === 0) {
      teamData.achievements.forEach((ach: string) => {
        const lower = ach.toLowerCase();
        if (lower.includes('world cup') && !lower.includes('club')) {
          achievements.worldCup.push(ach);
        } else if (lower.includes('club world cup') || lower.includes('intercontinental')) {
          achievements.clubWorldCup.push(ach);
        } else if (lower.includes('champions league') || lower.includes('european cup')) {
          achievements.international.push(ach);
        } else if (lower.includes('uefa') || lower.includes('europa') || 
                   lower.includes('libertadores') || lower.includes('concacaf')) {
          achievements.continental.push(ach);
        } else {
          achievements.domestic.push(ach);
        }
      });
    }
    
    return achievements;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    console.log('🔍 [SEARCH] Starting search for:', query);
    
    // Check if this is a World Cup 2026 query
    if (isWorldCup2026Query(query)) {
      console.log('🌍 Detected World Cup 2026 query, redirecting...');
      handleWorldCup2026Click();
      return;
    }
    
    setIsSearching(true);
    onLoadingChange(true);
    setError(null);
    setConfidence(null);
    
    // Clean up any previous search
    cleanupSearch();
    
    // Create new abort controller
    searchControllerRef.current = new AbortController();
    
    // Clear ALL previous selections
    clearAllPreviousData();
    
    try {
      const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(query.trim())}`;
      console.log('🔍 [API] Calling:', apiUrl);
      
      const response = await fetch(apiUrl, {
        signal: searchControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🔍 [API] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 [API] Response received, success:', data.success);
      
      if (!searchControllerRef.current?.signal.aborted) {
        if (data.success) {
          console.log('✅ [API] Success! Type from API:', data.type);
          
          // Clear all data again before setting new data
          clearAllPreviousData();
          
          if (data.type === 'player' && data.playerInfo) {
            console.log('👤 Setting player data:', data.playerInfo.name);
            
            // Process player achievements
            let playerAchievements = [];
            if (data.playerInfo.achievementsSummary) {
              const { achievementsSummary } = data.playerInfo;
              
              if (achievementsSummary.worldCupTitles > 0) {
                playerAchievements.push(`World Cup Titles: ${achievementsSummary.worldCupTitles}`);
              }
              if (achievementsSummary.continentalTitles > 0) {
                playerAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
              }
              if (achievementsSummary.clubDomesticTitles?.leagues > 0) {
                playerAchievements.push(`Domestic Leagues: ${achievementsSummary.clubDomesticTitles.leagues}`);
              }
              if (achievementsSummary.clubDomesticTitles?.cups > 0) {
                playerAchievements.push(`Domestic Cups: ${achievementsSummary.clubDomesticTitles.cups}`);
              }
              
              if (achievementsSummary.individualAwards && Array.isArray(achievementsSummary.individualAwards)) {
                achievementsSummary.individualAwards.forEach((award: string) => {
                  playerAchievements.push(award);
                });
              }
            }
            
            const playerData = {
              id: Date.now(),
              name: data.playerInfo.name || query,
              fullName: data.playerInfo.name || query,
              position: data.playerInfo.position || 'Unknown',
              nationality: data.playerInfo.nationality || 'Unknown',
              currentClub: data.playerInfo.currentClub || 'Unknown',
              age: data.playerInfo.age || null,
              careerStats: data.playerInfo.careerStats || null,
              goals: data.playerInfo.careerStats?.club?.totalGoals || 0,
              assists: data.playerInfo.careerStats?.club?.totalAssists || 0,
              appearances: data.playerInfo.careerStats?.club?.totalAppearances || 0,
              marketValue: data.playerInfo.marketValue || 'Unknown',
              achievementsSummary: data.playerInfo.achievementsSummary || null,
              achievements: playerAchievements,
              dateOfBirth: data.playerInfo.dateOfBirth || null,
              height: data.playerInfo.height || null,
              weight: data.playerInfo.weight || null,
              preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
              playingStyle: data.playerInfo.playingStyle || '',
              internationalCaps: data.playerInfo.careerStats?.international?.caps || 0,
              internationalGoals: data.playerInfo.careerStats?.international?.goals || 0,
              internationalDebut: data.playerInfo.careerStats?.international?.debut,
              currentYear: data.playerInfo.currentYear || new Date().getFullYear(),
              lastUpdated: data.playerInfo.lastUpdated || new Date().toISOString(),
              language: data.language,
              isSpanish: data.isSpanish,
              _confidence: data._metadata?.confidenceScore || 70
            };
            
            console.log('👤 Enhanced player data prepared');
            onPlayerSelect(playerData);
            setConfidence(data._metadata?.confidenceScore || 70);
          } 
          else if ((data.type === 'club' || data.type === 'national') && data.teamInfo) {
            console.log('🏟️ Setting team data:', data.teamInfo.name);
            
            // Clear player data
            onPlayerSelect(null);
            
            // Initialize achievements structure
            const majorAchievements = {
              worldCup: [] as string[],
              clubWorldCup: [] as string[],
              international: [] as string[],
              continental: [] as string[],
              domestic: [] as string[]
            };
            
            // Process team achievements from Groq data
            let teamAchievements: string[] = [];
            const isNationalTeam = data.teamInfo.type === 'national';
            
            if (data.teamInfo.achievementsSummary) {
              const { achievementsSummary } = data.teamInfo;
              
              if (isNationalTeam) {
                if (achievementsSummary.worldCupTitles > 0) {
                  teamAchievements.push(`World Cup Titles: ${achievementsSummary.worldCupTitles}`);
                }
                if (achievementsSummary.continentalTitles > 0) {
                  teamAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
                }
                if (achievementsSummary.olympicTitles > 0) {
                  teamAchievements.push(`Olympic Titles: ${achievementsSummary.olympicTitles}`);
                }
              } else {
                if (achievementsSummary.continentalTitles > 0) {
                  teamAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
                }
                if (achievementsSummary.internationalTitles > 0) {
                  teamAchievements.push(`International Titles: ${achievementsSummary.internationalTitles}`);
                }
                if (achievementsSummary.domesticTitles?.leagues > 0) {
                  teamAchievements.push(`Domestic Leagues: ${achievementsSummary.domesticTitles.leagues}`);
                }
                if (achievementsSummary.domesticTitles?.cups > 0) {
                  teamAchievements.push(`Domestic Cups: ${achievementsSummary.domesticTitles.cups}`);
                }
              }
            }
            
            // Add trophy details
            if (data.teamInfo.trophies) {
              const { trophies } = data.teamInfo;
              
              if (trophies.continental && Array.isArray(trophies.continental)) {
                trophies.continental.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins} wins (last: ${trophy.lastWin})`);
                });
              }
              
              if (trophies.international && Array.isArray(trophies.international)) {
                trophies.international.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins} wins (last: ${trophy.lastWin})`);
                });
              }
              
              if (trophies.domestic?.league && Array.isArray(trophies.domestic.league)) {
                trophies.domestic.league.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins} league titles (last: ${trophy.lastWin})`);
                });
              }
              
              if (trophies.domestic?.cup && Array.isArray(trophies.domestic.cup)) {
                trophies.domestic.cup.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins} cup titles (last: ${trophy.lastWin})`);
                });
              }
            }
            
            // Categorize achievements
            teamAchievements.forEach(ach => {
              const lower = ach.toLowerCase();
              if (lower.includes('world cup') && !lower.includes('club')) {
                 majorAchievements.worldCup.push(ach);
              } else if (lower.includes('club world cup') || lower.includes('intercontinental')) {
                 majorAchievements.clubWorldCup.push(ach);
              } else if (lower.includes('continental') || lower.includes('champions') || 
                         lower.includes('uefa') || lower.includes('libertadores') || lower.includes('concacaf')) {
                 majorAchievements.continental.push(ach);
              } else if (lower.includes('international')) {
                 majorAchievements.international.push(ach);
              } else {
                 majorAchievements.domestic.push(ach);
              }
            });

            const teamData = {
              id: Date.now(),
              name: data.teamInfo.name || query,
              type: data.teamInfo.type || 'club',
              fifaRanking: data.teamInfo.fifaRanking,
              ranking: data.teamInfo.fifaRanking || 'N/A',
              currentManager: data.teamInfo.currentManager || null,
              currentCoach: (typeof data.teamInfo.currentCoach === 'object' ? 
                data.teamInfo.currentCoach.name : data.teamInfo.currentCoach) || null,
              coach: data.teamInfo.currentManager?.name || 
                (typeof data.teamInfo.currentCoach === 'object' ? 
                 data.teamInfo.currentCoach.name : data.teamInfo.currentCoach) || 'Unknown',
              stadium: data.teamInfo.stadium || null,
              homeStadium: data.teamInfo.homeStadium,
              league: data.teamInfo.league || 'Unknown',
              founded: data.teamInfo.founded || 'Unknown',
              achievementsSummary: data.teamInfo.achievementsSummary || null,
              trophies: data.teamInfo.trophies || null,
              majorHonors: data.teamInfo.majorHonors || null,
              achievements: teamAchievements,
              majorAchievements,
              squad: data.teamInfo.squad || [],
              currentSeason: data.teamInfo.currentSeason || null,
              currentYear: data.teamInfo.currentYear || new Date().getFullYear(),
              lastUpdated: data.teamInfo.lastUpdated || new Date().toISOString(),
              playingStyle: data.teamInfo.playingStyle,
              confederation: data.teamInfo.confederation,
              fifaCode: data.teamInfo.fifaCode,
              language: data.language,
              isSpanish: data.isSpanish,
              _confidence: data._metadata?.confidenceScore || 70,
              _verificationLevel: data._metadata?.verificationLevel || 'medium'
            };
            
            // ENHANCED: Real-time verification with multiple sources
            console.log('🔄 Starting real-time verification...');
            try {
              const verificationResults = await verifyTeamWithMultipleSources(data.teamInfo.name);
              
              // Update confidence
              const newConfidence = verificationResults.confidence || data._metadata?.confidenceScore || 70;
              setConfidence(newConfidence);
              teamData._confidence = newConfidence;
              
              // Update coach if verified data is available
              if (verificationResults.sportsDb?.strManager) {
                const verifiedCoach = verificationResults.sportsDb.strManager;
                if (verifiedCoach !== teamData.coach && verifiedCoach !== 'Unknown') {
                  console.log(`✅ Coach updated to verified: ${verifiedCoach}`);
                  teamData.currentManager = { name: verifiedCoach };
                  teamData.currentCoach = verifiedCoach;
                  teamData.coach = verifiedCoach;
                }
              }
              
              // Update stadium
              if (verificationResults.sportsDb?.strStadium) {
                teamData.stadium = verificationResults.sportsDb.strStadium;
                teamData.homeStadium = verificationResults.sportsDb.strStadium;
              }
              
              // Update founded year
              if (verificationResults.sportsDb?.intFormedYear) {
                teamData.founded = verificationResults.sportsDb.intFormedYear;
              }
              
              // Update league
              if (verificationResults.sportsDb?.strLeague) {
                teamData.league = verificationResults.sportsDb.strLeague;
              }
              
              // Extract verified achievements
              const verifiedAchievements = extractVerifiedAchievements(verificationResults, teamData);
              
              // Replace or merge achievements with verified ones
              if (verifiedAchievements.domestic.length > 0 || verifiedAchievements.international.length > 0) {
                teamData.majorAchievements = verifiedAchievements;
                teamData.achievements = [
                  ...verifiedAchievements.worldCup,
                  ...verifiedAchievements.clubWorldCup,
                  ...verifiedAchievements.international,
                  ...verifiedAchievements.continental,
                  ...verifiedAchievements.domestic
                ];
                
                console.log(`✅ Achievements verified: ${teamData.achievements.length} entries`);
              }
              
            } catch (verificationError) {
              console.error('Verification failed:', verificationError);
            }
            
            console.log('🏟️ Enhanced team data with verification');
            onTeamSelect(teamData);
          }
          else if (data.type === 'worldcup' && data.worldCupInfo) {
            console.log('🌍 Setting World Cup data');
            
            onPlayerSelect(null);
            onTeamSelect(null);
            
            const worldCupData = {
              year: data.worldCupInfo.year,
              edition: data.worldCupInfo.edition,
              host: data.worldCupInfo.host,
              hostCities: data.worldCupInfo.hostCities || [],
              qualifiedTeams: data.worldCupInfo.qualifiedTeams || [],
              venues: data.worldCupInfo.venues || [],
              defendingChampion: data.worldCupInfo.defendingChampion,
              mostTitles: data.worldCupInfo.mostTitles,
              details: data.worldCupInfo.details,
              currentYear: data.worldCupInfo.currentYear || new Date().getFullYear(),
              lastUpdated: data.worldCupInfo.lastUpdated || new Date().toISOString(),
              language: data.language,
              isSpanish: data.isSpanish
            };
            
            console.log('🌍 World Cup data prepared');
            onWorldCupUpdate(worldCupData);
          }
          else {
            console.log('📝 General query - only showing analysis');
            onPlayerSelect(null);
            onTeamSelect(null);
            onWorldCupUpdate(null);
          }
          
          // Update analysis
          if (data.analysis) {
            console.log('💭 Setting analysis');
            onAnalysisUpdate(data.analysis);
          }
          
          // Update video
          if (data.youtubeUrl) {
            console.log('🎥 Setting video URL:', data.youtubeUrl);
            onVideoFound(data.youtubeUrl);
          }
        } else {
          console.error('❌ API Error from response:', data.error);
          setError(data.error || 'Failed to fetch data');
          onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Search failed:', error);
        setError('Network error. Please check your connection.');
        onAnalysisUpdate('Network error. Please check your connection and try again.');
      }
    } finally {
      cleanupSearch();
      onLoadingChange(false);
    }
  };

  const handleExampleClick = (example: string) => {
    if (example.toLowerCase().includes('2026')) {
      console.log('🌍 Quick search for World Cup 2026, redirecting...');
      handleWorldCup2026Click();
      return;
    }
    
    const trimmedExample = example.trim();
    setQuery(trimmedExample);
    setError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    
    clearAllPreviousData();
    
    console.log('🔍 [QUICK SEARCH] Starting search for:', trimmedExample);
    setIsSearching(true);
    onLoadingChange(true);
    
    searchControllerRef.current = new AbortController();
    
    const performQuickSearch = async () => {
      try {
        const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(trimmedExample)}`;
        console.log('🔍 [API] Quick search calling:', apiUrl);
        
        const response = await fetch(apiUrl, {
          signal: searchControllerRef.current?.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (!searchControllerRef.current?.signal.aborted) {
          if (data.success) {
            console.log('✅ [API] Quick search success! Type:', data.type);
            
            clearAllPreviousData();
            
            if (data.type === 'player' && data.playerInfo) {
              const playerData = {
                id: Date.now(),
                name: data.playerInfo.name || trimmedExample,
                position: data.playerInfo.position || 'Unknown',
                nationality: data.playerInfo.nationality || 'Unknown',
                currentClub: data.playerInfo.currentClub || 'Unknown',
                age: data.playerInfo.age || null,
                achievementsSummary: data.playerInfo.achievementsSummary || null,
                dateOfBirth: data.playerInfo.dateOfBirth || null,
                height: data.playerInfo.height || null,
                preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
                playingStyle: data.playerInfo.playingStyle || '',
                careerStats: data.playerInfo.careerStats || null,
                _confidence: data._metadata?.confidenceScore || 70
              };
              
              onPlayerSelect(playerData);
              setConfidence(data._metadata?.confidenceScore || 70);
            } 
            else if ((data.type === 'club' || data.type === 'national') && data.teamInfo) {
              const teamData = {
                id: Date.now(),
                name: data.teamInfo.name || trimmedExample,
                type: data.teamInfo.type || 'club',
                fifaRanking: data.teamInfo.fifaRanking,
                league: data.teamInfo.league || 'Unknown',
                founded: data.teamInfo.founded || 'Unknown',
                achievementsSummary: data.teamInfo.achievementsSummary || null,
                stadium: data.teamInfo.stadium || null,
                currentManager: data.teamInfo.currentManager || null,
                currentCoach: data.teamInfo.currentCoach || null,
                trophies: data.teamInfo.trophies || null,
                squad: data.teamInfo.squad || [],
                _confidence: data._metadata?.confidenceScore || 70,
                _verificationLevel: data._metadata?.verificationLevel || 'medium'
              };
              
              onTeamSelect(teamData);
              setConfidence(data._metadata?.confidenceScore || 70);
            }
            
            if (data.analysis) onAnalysisUpdate(data.analysis);
            if (data.youtubeUrl) onVideoFound(data.youtubeUrl);
            
          } else {
            setError(data.error || 'Failed to fetch data');
            onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('❌ Quick search failed:', error);
          setError('Search failed. Please try again.');
          onAnalysisUpdate('Search failed. Please try again.');
        }
      } finally {
        setIsSearching(false);
        onLoadingChange(false);
      }
    };
    
    performQuickSearch();
  };

  // Cleanup on unmount
  useState(() => {
    return () => {
      cleanupSearch();
    };
  });

  const quickSearches = [
    'Lionel Messi', 
    'Cristiano Ronaldo',
    'Kylian Mbappé',
    'Real Madrid', 
    'FC Barcelona',
    'Selección Española',
    'Selección Brasileña',
    'Selección Argentina',
    'Copa Mundial 2026',
    'FIFA World Cup 2026',
    'Manchester City',
    'Bayern Munich',
    'Liverpool FC',
    'Paris Saint-Germain'
  ];

  // NEW: Confidence badge component
  const ConfidenceBadge = ({ score }: { score: number | null }) => {
    if (!score) return null;
    
    let color = 'gray';
    let text = 'Low Confidence';
    
    if (score >= 80) {
      color = 'green';
      text = 'High Confidence';
    } else if (score >= 60) {
      color = 'yellow';
      text = 'Medium Confidence';
    } else {
      color = 'red';
      text = 'Low Confidence';
    }
    
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        background: `rgba(${color === 'green' ? '34, 197, 94' : color === 'yellow' ? '234, 179, 8' : '239, 68, 68'}, 0.1)`,
        border: `1px solid rgba(${color === 'green' ? '34, 197, 94' : color === 'yellow' ? '234, 179, 8' : '239, 68, 68'}, 0.3)`,
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: `rgb(${color === 'green' ? '34, 197, 94' : color === 'yellow' ? '234, 179, 8' : '239, 68, 68'})`,
        marginLeft: '0.5rem'
      }}>
        <span style={{ marginRight: '0.25rem' }}>
          {score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❓'}
        </span>
        {text} ({score}%)
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', margin: 0 }}>
          ⚽ Football AI Search
        </h2>
        {confidence !== null && <ConfidenceBadge score={confidence} />}
      </div>
      
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          color: '#ef4444',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}
      
      {/* World Cup 2026 Banner */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, #0066b2 0%, #002244 50%, #DBA506 100%)',
        borderRadius: '0.75rem',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100px',
          background: 'url("https://digitalhub.fifa.com/transform/8858ac27-b36a-4542-9505-76e3ee5d5d4d/Groups-and-match-ups-revealed-for-game-changing-FIFA-World-Cup-2026?focuspoint=0.52,0.5&io=transform:fill,width:300&quality=75")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              fontSize: '2rem',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.5rem',
              borderRadius: '50%',
            }}>
              🏆
            </div>
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: '0.25rem',
              }}>
                2026 FIFA World Cup
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                North America • June 11 - July 19, 2026
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleWorldCup2026Click}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(to right, #FFD700, #FFA500)',
              color: '#002244',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 215, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>🌍</span>
            <span>Explore Interactive World Cup 2026</span>
          </button>
          
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
            <span>✨</span>
            <span>Interactive fixtures • Team rosters • Venue maps • Live updates</span>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '1.25rem',
            zIndex: 1,
          }}>
            🔍
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder="Search players, teams, or type 'World Cup 2026'..."
            disabled={isSearching}
            style={{
              width: '100%',
              padding: '0.875rem 0.875rem 0.875rem 3rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.75rem',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              opacity: isSearching ? 0.7 : 1,
              cursor: isSearching ? 'not-allowed' : 'text',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          style={{
            padding: '0.875rem 1.5rem',
            background: isSearching 
              ? 'linear-gradient(to right, #64748b, #475569)' 
              : 'linear-gradient(to right, #4ade80, #22d3ee)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 600,
            cursor: isSearching ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '1rem',
            width: '100%',
            opacity: isSearching ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSearching) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(74, 222, 128, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSearching) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {isSearching ? 'Searching...' : 'Search with AI'}
        </button>
      </form>
      
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Try current examples (2024):
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {quickSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleExampleClick(term)}
              disabled={isSearching}
              style={{
                padding: '0.5rem 1rem',
                background: term.toLowerCase().includes('2026') 
                  ? 'rgba(255, 215, 0, 0.2)' 
                  : 'rgba(255, 255, 255, 0.1)',
                border: term.toLowerCase().includes('2026')
                  ? '1px solid rgba(255, 215, 0, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '999px',
                color: term.toLowerCase().includes('2026') ? '#FFD700' : 'white',
                fontSize: '0.875rem',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                opacity: isSearching ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSearching) {
                  e.currentTarget.style.background = term.toLowerCase().includes('2026')
                    ? 'rgba(255, 215, 0, 0.3)'
                    : 'rgba(74, 222, 128, 0.2)';
                  e.currentTarget.style.borderColor = term.toLowerCase().includes('2026')
                    ? '#FFD700'
                    : '#4ade80';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSearching) {
                  e.currentTarget.style.background = term.toLowerCase().includes('2026') 
                    ? 'rgba(255, 215, 0, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = term.toLowerCase().includes('2026')
                    ? '1px solid rgba(255, 215, 0, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
        <p>Get detailed stats, verified trophy counts, current managers, and AI analysis</p>
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>🌐</span>
          <span>Spanish searches will use Spanish Wikipedia for accurate data</span>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          Powered by GROQ AI + SportsDB + Football Data API • Verified 2024-2025 data • Confidence scoring
        </p>
      </div>
    </div>
  );
}