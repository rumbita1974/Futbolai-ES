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
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    console.log('🔍 [SEARCH] Starting search for:', query);
    onLoadingChange(true);
    setError(null);
    
    // Clear previous selections
    onPlayerSelect(null);
    onTeamSelect(null);
    onWorldCupUpdate(null);
    onTeamsUpdate([]);
    onVideoFound('');
    onAnalysisUpdate('');
    
    try {
      const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(query)}`;
      console.log('🔍 [API] Calling:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('🔍 [API] Response status:', response.status);
      
      const data = await response.json();
      console.log('🔍 [API] Response received, success:', data.success);
      
      if (data.success) {
        console.log('✅ [API] Success! Type:', data.type);
        
        const responseType = data.type || 'general';
        console.log('🎯 Processing as type:', responseType);
        
        if (responseType === 'player' && data.playerInfo) {
          console.log('👤 Setting player data:', data.playerInfo.name);
          
          const playerData = {
            id: Date.now(),
            name: data.playerInfo.name || query,
            fullName: data.playerInfo.fullName || data.playerInfo.name || query,
            position: data.playerInfo.position || 'Unknown',
            nationality: data.playerInfo.nationality || 'Unknown',
            club: data.playerInfo.currentClub || data.playerInfo.club || 'Unknown',
            age: data.playerInfo.age || null,
            
            // Extract stats from various locations
            goals: data.playerInfo.stats?.goals || 
                   data.playerInfo.careerStats?.club?.totalGoals || 
                   data.playerInfo.careerStats?.totalGoals || 0,
                   
            assists: data.playerInfo.stats?.assists || 
                     data.playerInfo.careerStats?.club?.totalAssists || 
                     data.playerInfo.careerStats?.totalAssists || 0,
                     
            appearances: data.playerInfo.stats?.appearances || 
                         data.playerInfo.careerStats?.club?.totalAppearances || 
                         data.playerInfo.careerStats?.totalAppearances || 0,
                         
            marketValue: data.playerInfo.marketValue || 'Unknown',
            achievements: data.playerInfo.achievements || 
                         data.playerInfo.individualAwards || [],
            
            // Enhanced fields
            dateOfBirth: data.playerInfo.dateOfBirth || null,
            height: data.playerInfo.height || null,
            weight: data.playerInfo.weight || null,
            preferredFoot: data.playerInfo.preferredFoot || 
                          data.playerInfo.strongFoot || 'Unknown',
            playingStyle: data.playerInfo.playingStyle || '',
            
            // International stats
            internationalCaps: data.playerInfo.careerStats?.international?.caps || 
                              data.playerInfo.internationalCaps || 0,
            internationalGoals: data.playerInfo.careerStats?.international?.goals || 
                               data.playerInfo.internationalGoals || 0,
            
            // Club career
            previousClubs: data.playerInfo.previousClubs || 
                          data.playerInfo.clubCareer?.map((c: any) => c.club) || [],
            
            // Current season
            currentSeason: data.playerInfo.currentSeason || null
          };
          
          console.log('👤 Enhanced player data prepared');
          onPlayerSelect(playerData);
        } 
        else if (responseType === 'team' && data.teamInfo) {
          console.log('🏟️ Setting team data:', data.teamInfo.name);
          
          const teamData = {
            id: Date.now(),
            name: data.teamInfo.name,
            type: data.teamInfo.type || 'club',
            nicknames: data.teamInfo.nicknames || [],
            
            // Ranking
            ranking: data.teamInfo.fifaRanking || 
                    data.teamInfo.currentRanking || 
                    data.teamInfo.ranking || 'N/A',
            
            // Manager/Coach - handle multiple possible field names
            coach: data.teamInfo.currentManager?.name || 
                  data.teamInfo.managerCoach || 
                  data.teamInfo.coach || 
                  data.teamInfo.currentCoach?.name || 'Unknown',
            
            coachNationality: data.teamInfo.currentManager?.nationality || 
                            data.teamInfo.currentCoach?.nationality,
            coachAppointed: data.teamInfo.currentManager?.appointed || 
                          data.teamInfo.currentCoach?.appointed,
            
            // Stadium
            stadium: data.teamInfo.stadium?.name || 
                    data.teamInfo.stadium || 
                    data.teamInfo.homeStadium || 'Unknown',
            
            stadiumCapacity: data.teamInfo.stadium?.capacity || 
                            data.teamInfo.stadiumCapacity || 'Unknown',
            
            stadiumOpened: data.teamInfo.stadium?.opened,
            
            // Location
            location: data.teamInfo.location?.city || 
                     data.teamInfo.location || 'Unknown',
            country: data.teamInfo.location?.country || 
                    data.teamInfo.country || 'Unknown',
            
            // Basic info
            league: data.teamInfo.league || 'Unknown',
            founded: data.teamInfo.founded || 'Unknown',
            
            // Trophies - new detailed structure
            trophies: data.teamInfo.trophies || 
                     data.teamInfo.majorHonors || null,
            
            achievements: data.teamInfo.achievements || [],
            
            // Squad
            keyPlayers: data.teamInfo.currentSquad?.keyPlayers || 
                       data.teamInfo.keyPlayers || [],
            captain: data.teamInfo.currentSquad?.captain || 
                    data.teamInfo.captain,
            
            // Rivalries
            mainRivalries: data.teamInfo.mainRivalries || [],
            
            // Financial
            clubValue: data.teamInfo.clubValue || 'Unknown',
            
            // National team specific
            fifaCode: data.teamInfo.fifaCode,
            confederation: data.teamInfo.confederation,
            playingStyle: data.teamInfo.playingStyle,
            
            // Records
            records: data.teamInfo.records || null,
            
            // Current season
            currentSeason: data.teamInfo.currentSeason || null
          };
          
          console.log('🏟️ Enhanced team data prepared');
          onTeamSelect(teamData);
        }
        else if (responseType === 'worldCup' && data.worldCupInfo) {
          console.log('🌍 Setting World Cup data');
          
          const worldCupData = {
            year: data.worldCupInfo.year,
            edition: data.worldCupInfo.edition,
            host: data.worldCupInfo.host,
            hostCities: data.worldCupInfo.hostCities || [],
            qualifiedTeams: data.worldCupInfo.qualifiedTeams || [],
            venues: data.worldCupInfo.venues || [],
            defendingChampion: data.worldCupInfo.defendingChampion,
            mostTitles: data.worldCupInfo.mostTitles,
            details: data.worldCupInfo.details
          };
          
          console.log('🌍 World Cup data prepared');
          onWorldCupUpdate(worldCupData);
        }
        else {
          console.log('📝 General query - only showing analysis');
        }
        
        // Update analysis
        if (data.analysis) {
          console.log('💭 Setting analysis');
          onAnalysisUpdate(data.analysis);
        }
        
        // Update video
        if (data.youtubeUrl) {
          console.log('🎥 Setting video URL');
          onVideoFound(data.youtubeUrl);
        }
      } else {
        console.error('❌ API Error from response:', data.error);
        setError(data.error || 'Failed to fetch data');
        onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
      }
    } catch (error) {
      console.error('❌ Search failed:', error);
      setError('Network error. Please check your connection.');
      onAnalysisUpdate('Network error. Please check your connection and try again.');
    } finally {
      onLoadingChange(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setError(null);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }, 100);
  };

  const quickSearches = [
    'Messi', 
    'Cristiano Ronaldo',
    'Real Madrid', 
    'Barcelona',
    'Spain',
    'Brazil',
    'Argentina',
    'World Cup 2026',
    'Manchester City',
    'Bayern Munich'
  ];

  return (
    <div>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>
        ⚽ Football AI Search
      </h2>
      
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
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder="Search players, teams, World Cup 2026..."
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.75rem',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
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
            onClick={() => handleExampleClick(term)}
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
        <p>Get detailed stats, trophy counts, current managers, and AI analysis</p>
      </div>
    </div>
  );
}