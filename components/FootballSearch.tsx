'use client'

import { useState } from 'react';
// REMOVED: import { Search } from 'lucide-react';

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
      
      if (data.success) {
        // Update player info if available
        if (data.playerInfo) {
          onPlayerSelect({
            id: Date.now(), // Generate unique ID
            name: data.playerInfo.name,
            position: data.playerInfo.position,
            nationality: data.playerInfo.nationality,
            club: data.playerInfo.currentClub,
            age: null, // Your API doesn't return age
            goals: data.playerInfo.stats?.goals,
            assists: data.playerInfo.stats?.assists,
            appearances: data.playerInfo.stats?.appearances,
            rating: data.confidence * 10, // Convert 0.95 to 9.5
            marketValue: data.playerInfo.marketValue,
            achievements: data.playerInfo.achievements,
          });
        }
        
        // Update team info if available
        if (data.teamInfo) {
          onTeamSelect(data.teamInfo);
          onTeamsUpdate(data.teams || []);
        } else {
          onTeamsUpdate(data.teams || []);
        }
        
        // Update analysis
        onAnalysisUpdate(data.analysis || `Analysis for ${query}`);
        
        // Update World Cup info
        if (data.worldCupInfo) {
          onWorldCupUpdate(data.worldCupInfo);
        }
        
        // Update video
        onVideoFound(data.youtubeUrl);
        
      } else {
        // Handle API error
        console.error('API Error:', data.error);
        // Fallback to mock data for now
        fallbackToMockData();
      }
    } catch (error) {
      console.error('Search failed:', error);
      fallbackToMockData();
    }
    
    onLoadingChange(false);
  };

  const fallbackToMockData = () => {
    // Fallback mock data
    const mockPlayer = {
      id: 1,
      name: 'Lionel Messi',
      position: 'Forward',
      nationality: 'Argentina',
      club: 'Inter Miami',
      age: 36,
      goals: 821,
      assists: 357,
      appearances: 1034,
      rating: 9.3,
    };
    
    onPlayerSelect(mockPlayer);
    onVideoFound('https://www.youtube.com/embed/ZO0d8r_2qGI');
    onAnalysisUpdate('Football analysis service is temporarily unavailable. Showing sample data.');
  };

  const quickSearches = ['Messi', 'World Cup 2026', 'Argentina', 'Brazil', 'Mbappé', 'Real Madrid', 'Champions League'];

  return (
    <div>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>
        ⚽ Football AI Search
      </h2>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {/* REMOVED: Search icon component */}
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