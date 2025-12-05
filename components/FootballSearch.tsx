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

    onLoadingChange(true);
    
    try {
      // Call your REAL API endpoint
      const response = await fetch(`/api/ai?action=search&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      console.log('📡 API Response:', {
        type: data.type,
        hasPlayer: !!data.playerInfo,
        hasTeam: !!data.teamInfo,
        hasWorldCup: !!data.worldCupInfo
      });
      
      if (data.success) {
        // ALWAYS clear previous selections first
        onPlayerSelect(null);
        onTeamSelect(null);
        onWorldCupUpdate(null);
        onTeamsUpdate([]);
        
        // Use the type field from API, or determine from data
        const responseType = data.type || 
          (data.playerInfo ? 'player' : 
           data.teamInfo ? 'team' : 
           data.worldCupInfo ? 'worldCup' : 'general');
        
        console.log('🎯 Processing as type:', responseType);
        
        if (responseType === 'player' && data.playerInfo) {
          console.log('Setting player data:', data.playerInfo.name);
          onPlayerSelect({
            id: Date.now(),
            name: data.playerInfo.name,
            position: data.playerInfo.position,
            nationality: data.playerInfo.nationality,
            club: data.playerInfo.currentClub,
            age: null,
            goals: data.playerInfo.stats?.goals || 0,
            assists: data.playerInfo.stats?.assists || 0,
            appearances: data.playerInfo.stats?.appearances || 0,
            rating: data.confidence * 10,
            marketValue: data.playerInfo.marketValue,
            achievements: data.playerInfo.achievements || [],
          });
        } 
        else if (responseType === 'team' && data.teamInfo) {
          console.log('Setting team data:', data.teamInfo.name);
          onTeamSelect({
            id: Date.now(),
            name: data.teamInfo.name,
            ranking: data.teamInfo.ranking || 'N/A',
            coach: data.teamInfo.coach || 'Unknown',
            stadium: data.teamInfo.stadium || 'Unknown',
            league: data.teamInfo.league || 'Unknown',
            founded: data.teamInfo.founded || 'Unknown',
            achievements: data.teamInfo.achievements || [],
            keyPlayers: data.teamInfo.keyPlayers || [],
          });
        }
        else if (responseType === 'worldCup' && data.worldCupInfo) {
          console.log('Setting World Cup data:', data.worldCupInfo.year);
          onWorldCupUpdate({
            year: data.worldCupInfo.year,
            host: data.worldCupInfo.host,
            details: data.worldCupInfo.details,
            qualifiedTeams: data.worldCupInfo.qualifiedTeams || [],
            venues: data.worldCupInfo.venues || [],
          });
        }
        else {
          console.log('General query - only showing analysis');
          // For general queries, just show analysis
        }
        
        // Update analysis (always available)
        onAnalysisUpdate(data.analysis || `Analysis for ${query}`);
        
        // Update video
        onVideoFound(data.youtubeUrl);
        
      } else {
        // Handle API error
        console.error('API Error:', data.error);
        fallbackToMockData();
      }
    } catch (error) {
      console.error('Search failed:', error);
      fallbackToMockData();
    }
    
    onLoadingChange(false);
  };

  const fallbackToMockData = () => {
    // Clear previous
    onPlayerSelect(null);
    onTeamSelect(null);
    onWorldCupUpdate(null);
    
    // Fallback mock data - TEAM example
    const mockTeam = {
      id: 1,
      name: 'Brazil National Team',
      ranking: '1st in FIFA Rankings',
      coach: 'Tite',
      stadium: 'Various',
      league: 'International',
      founded: 1914,
      achievements: ['5 World Cup titles', '9 Copa América titles'],
      keyPlayers: ['Neymar', 'Vinícius Júnior', 'Alisson'],
    };
    
    onTeamSelect(mockTeam);
    onVideoFound('https://www.youtube.com/embed/eJXWcJeGXlM');
    onAnalysisUpdate('Brazil is the most successful national team in FIFA World Cup history, having won five titles.');
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
    'Karim Benzema'
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
            }}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}