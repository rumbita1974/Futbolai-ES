'use client'

import { useState } from 'react';

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
  const [query, setQuery] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    console.log('🔍 [SEARCH] Starting search for:', query);
    onLoadingChange(true);
    
    // Clear previous selections
    onPlayerSelect(null);
    onTeamSelect(null);
    onWorldCupUpdate(null);
    onTeamsUpdate([]);
    onVideoFound('');
    onAnalysisUpdate('');
    
    try {
      // Call your API endpoint
      const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(query)}`;
      console.log('🔍 [API] Calling:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('🔍 [API] Response status:', response.status);
      
      const data = await response.json();
      console.log('🔍 [API] Full response:', data);
      
      if (data.success) {
        console.log('✅ [API] Success! Type:', data.type);
        
        // Clear everything first
        onPlayerSelect(null);
        onTeamSelect(null);
        onWorldCupUpdate(null);
        
        const responseType = data.type || 
          (data.playerInfo ? 'player' : 
           data.teamInfo ? 'team' : 
           data.worldCupInfo ? 'worldCup' : 'general');
        
        console.log('🎯 Processing as type:', responseType);
        
        if (responseType === 'player' && data.playerInfo) {
          console.log('👤 Setting player data:', data.playerInfo.name);
          
          // Extract stats from various possible locations
          const stats = data.playerInfo.stats || {};
          const careerStats = data.playerInfo.careerStats || {};
          
          const playerData = {
            id: Date.now(),
            name: data.playerInfo.name || data.playerInfo.fullName || query,
            position: data.playerInfo.position || 'Unknown',
            nationality: data.playerInfo.nationality || 'Unknown',
            club: data.playerInfo.currentClub || data.playerInfo.club || 'Unknown',
            age: data.playerInfo.age || null,
            
            // Goals from various possible locations
            goals: stats.careerGoals || 
                   stats.goals || 
                   careerStats.totalGoals || 
                   careerStats.goals || 
                   data.playerInfo.goals || 
                   0,
                   
            // Assists from various possible locations  
            assists: stats.careerAssists || 
                    stats.assists || 
                    careerStats.totalAssists || 
                    careerStats.assists || 
                    data.playerInfo.assists || 
                    0,
                    
            // Appearances from various possible locations
            appearances: stats.careerAppearances || 
                        stats.appearances || 
                        careerStats.totalAppearances || 
                        careerStats.appearances || 
                        data.playerInfo.appearances || 
                        0,
                        
            rating: (data.confidence || 0.8) * 10,
            marketValue: data.playerInfo.marketValue || 'Unknown',
            achievements: data.playerInfo.achievements || [],
            
            // Enhanced fields
            previousClubs: data.playerInfo.previousClubs || [],
            dateOfBirth: data.playerInfo.dateOfBirth || null,
            height: data.playerInfo.height || null,
            playingStyle: data.playerInfo.playingStyle || '',
            strongFoot: data.playerInfo.strongFoot || 
                       data.playerInfo.preferredFoot || 
                       'Unknown',
                       
            // International stats if available
            internationalCaps: stats.internationalCaps || 
                              careerStats.international?.caps || 
                              data.playerInfo.internationalCaps || 
                              0,
                              
            internationalGoals: stats.internationalGoals || 
                               careerStats.international?.goals || 
                               data.playerInfo.internationalGoals || 
                               0
          };
          
          console.log('👤 Player data prepared:', playerData);
          onPlayerSelect(playerData);
        } 
        else if (responseType === 'team' && data.teamInfo) {
          console.log('🏟️ Setting team data:', data.teamInfo.name);
          
          const teamData = {
            id: Date.now(),
            name: data.teamInfo.name,
            type: data.teamInfo.type || 'club',
            
            // Ranking/position
            ranking: data.teamInfo.currentRanking || 
                    data.teamInfo.ranking || 
                    data.teamInfo.fifaRanking || 
                    'N/A',
                    
            // Coach/manager  
            coach: data.teamInfo.managerCoach || 
                  data.teamInfo.coach || 
                  data.teamInfo.currentManager?.name || 
                  'Unknown',
                  
            // Stadium
            stadium: data.teamInfo.stadium || 
                    data.teamInfo.homeStadium || 
                    data.teamInfo.stadium?.name || 
                    'Unknown',
                    
            stadiumCapacity: data.teamInfo.stadiumCapacity || 
                            data.teamInfo.stadium?.capacity || 
                            'Unknown',
                            
            league: data.teamInfo.league || 'Unknown',
            founded: data.teamInfo.founded || 'Unknown',
            
            // Achievements/trophies
            achievements: data.teamInfo.achievements || 
                         data.teamInfo.trophies?.domestic || 
                         data.teamInfo.majorHonors || 
                         [],
                         
            keyPlayers: data.teamInfo.keyPlayers || 
                       data.teamInfo.currentSquad?.keyPlayers || 
                       [],
                       
            // Enhanced fields
            location: data.teamInfo.location || 
                     data.teamInfo.country?.capital || 
                     'Unknown',
                     
            mainRivalries: data.teamInfo.mainRivalries || [],
            clubValue: data.teamInfo.clubValue || 
                      data.teamInfo.financials?.estimatedValue || 
                      'Unknown',
                      
            // For national teams
            fifaCode: data.teamInfo.fifaCode,
            confederation: data.teamInfo.confederation,
            allTimeTopScorer: data.teamInfo.allTimeTopScorer,
            mostCaps: data.teamInfo.mostCaps,
            playingStyle: data.teamInfo.playingStyle
          };
          
          console.log('🏟️ Team data prepared:', teamData);
          onTeamSelect(teamData);
        }
        else if (responseType === 'worldCup' && data.worldCupInfo) {
          console.log('🌍 Setting World Cup data:', data.worldCupInfo.year);
          
          const worldCupData = {
            year: data.worldCupInfo.year,
            host: data.worldCupInfo.host,
            details: data.worldCupInfo.details,
            qualifiedTeams: data.worldCupInfo.qualifiedTeams || [],
            venues: data.worldCupInfo.venues || [],
            hostCities: data.worldCupInfo.hostCities || [],
            format: data.worldCupInfo.format,
            defendingChampion: data.worldCupInfo.defendingChampion,
            mostTitles: data.worldCupInfo.mostTitles
          };
          
          console.log('🌍 World Cup data prepared:', worldCupData);
          onWorldCupUpdate(worldCupData);
        }
        else {
          console.log('📝 General query - only showing analysis');
        }
        
        // Update analysis (always available)
        if (data.analysis) {
          console.log('💭 Setting analysis');
          onAnalysisUpdate(data.analysis);
        }
        
        // Update video
        if (data.youtubeUrl) {
          console.log('🎥 Setting video URL');
          onVideoFound(data.youtubeUrl);
        }
        
        // Handle any additional teams data
        if (data.teams) {
          onTeamsUpdate(data.teams);
        }
      } else {
        console.error('❌ API Error:', data.error);
        // Show error in analysis
        onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
      }
    } catch (error) {
      console.error('❌ Search failed:', error);
      onAnalysisUpdate('Network error. Please check your connection and try again.');
    } finally {
      onLoadingChange(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    // Trigger search after a short delay
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }, 100);
  };

  const quickSearches = [
    'Messi', 
    'World Cup 2026', 
    'Argentina', 
    'Brazil', 
    'Mbappé', 
    'Real Madrid', 
    'Champions League',
    'Germany',
    'Karim Benzema',
    'Carvajal',
    'Modrić',
    'Kroos',
    'Vinicius'
  ];

  return (
    <div>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>
        ⚽ Football AI Search
      </h2>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '1.25rem',
          }}>
            🔍
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, teams, World Cup 2026..."
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.75rem',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.borderColor = '#4ade80';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '1rem 2rem',
            background: 'linear-gradient(to right, #4ade80, #22d3ee)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(74, 222, 128, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Search
        </button>
      </form>
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {quickSearches.map((term) => (
          <button
            key={term}
            onClick={() => {
              setQuery(term);
              // Auto-search when clicking quick search
              const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
              handleSearch(syntheticEvent);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '999px',
              color: 'white',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)';
              e.currentTarget.style.borderColor = '#4ade80';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {term}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
        <p>Try searching for players, clubs, national teams, or World Cup info.</p>
      </div>
    </div>
  );
}