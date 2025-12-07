import { useEffect } from 'react';

interface FootballAIProps {
  player: any;
  team: any;
  isLoading: boolean;
  analysis?: string;
  teams?: any[];
  worldCupInfo?: any;
}

export default function FootballAI({ 
  player, 
  team, 
  isLoading,
  analysis,
  teams,
  worldCupInfo 
}: FootballAIProps) {
  // Add animation styles safely for SSR
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!document.querySelector('style[data-footballai-animations]')) {
        const styleTag = document.createElement('style');
        styleTag.setAttribute('data-footballai-animations', 'true');
        styleTag.textContent = `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
        `;
        document.head.appendChild(styleTag);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '5px solid rgba(74, 222, 128, 0.2)',
          borderTopColor: '#4ade80',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
        <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '1.125rem' }}>
          ⚽ Analyzing football data with AI...
        </p>
        <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
          Gathering comprehensive stats and insights...
        </p>
      </div>
    );
  }

  const entity = player || team;
  const isNationalTeam = team?.type === 'national';
  const isClub = team?.type === 'club';

  if (player || team || worldCupInfo) {
    let title = 'Football Analysis';
    if (player?.name) {
      title = player.name;
    } else if (team?.name) {
      title = team.name;
    } else if (worldCupInfo?.year) {
      title = `World Cup ${worldCupInfo.year}`;
    } else if (worldCupInfo) {
      title = 'World Cup';
    }

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '2rem',
            fontWeight: 800, 
            marginBottom: '0.5rem', 
            color: 'white',
            background: player ? 'linear-gradient(to right, #4ade80, #22d3ee)' : 
                      team ? 'linear-gradient(to right, #fbbf24, #f97316)' :
                      worldCupInfo ? 'linear-gradient(to right, #3b82f6, #8b5cf6)' :
                      'linear-gradient(to right, #4ade80, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {title}
          </h2>
          
          {isNationalTeam && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 1rem',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '999px',
              marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>🌍</span>
              <span style={{ fontSize: '0.875rem', color: '#93c5fd' }}>National Team</span>
            </div>
          )}
          
          {isClub && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 1rem',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '999px',
              marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>🏟️</span>
              <span style={{ fontSize: '0.875rem', color: '#fde68a' }}>Football Club</span>
            </div>
          )}
        </div>
        
        {/* AI Analysis Section */}
        {analysis && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            padding: '1.5rem',
            borderRadius: '1rem',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.6s ease-out 0.1s both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(74, 222, 128, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                🤖
              </div>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>AI Analysis</h3>
            </div>
            <p style={{ 
              color: '#e2e8f0', 
              lineHeight: 1.7,
              fontSize: '1.0625rem',
            }}>
              {analysis}
            </p>
          </div>
        )}
        
        {/* Achievements Section */}
        {entity?.achievementsSummary && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '1.5rem',
            borderRadius: '1rem',
            marginTop: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'fadeIn 0.6s ease-out 0.2s both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                🏆
              </div>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>Achievements</h3>
            </div>
            
            {renderAchievements(entity)}
          </div>
        )}
        
        {/* Basic Info Grid */}
        {entity && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            animation: 'fadeIn 0.6s ease-out 0.4s both',
          }}>
            {player && (
              <>
                {player.position && (
                  <InfoCard label="Position" value={player.position} color="#4ade80" />
                )}
                {player.nationality && (
                  <InfoCard label="Nationality" value={player.nationality} color="#22d3ee" />
                )}
                {player.currentClub && (
                  <InfoCard label="Current Club" value={player.currentClub} color="#fbbf24" />
                )}
                {player.age && (
                  <InfoCard label="Age" value={player.age} color="#8b5cf6" />
                )}
              </>
            )}
            
            {team && (
              <>
                {team.fifaRanking && (
                  <InfoCard 
                    label={isNationalTeam ? "FIFA Ranking" : "Current Ranking"} 
                    value={team.fifaRanking} 
                    color="#4ade80" 
                  />
                )}
                {team.league && !isNationalTeam && (
                  <InfoCard label="League" value={team.league} color="#22d3ee" />
                )}
                {team.founded && (
                  <InfoCard label="Founded" value={team.founded} color="#fbbf24" />
                )}
                {team.stadium?.name && (
                  <InfoCard label="Stadium" value={team.stadium.name} color="#8b5cf6" />
                )}
              </>
            )}
          </div>
        )}
        
        {/* Player Specific Details */}
        {player && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '1.5rem',
            borderRadius: '1rem',
            marginTop: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'fadeIn 0.6s ease-out 0.5s both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                ℹ️
              </div>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>Player Details</h3>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '1rem',
            }}>
              {player.dateOfBirth && (
                <InfoCard label="Date of Birth" value={player.dateOfBirth} color="#10b981" />
              )}
              {player.height && (
                <InfoCard label="Height" value={player.height} color="#3b82f6" />
              )}
              {player.preferredFoot && (
                <InfoCard label="Preferred Foot" value={player.preferredFoot} color="#f59e0b" />
              )}
              {player.playingStyle && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Playing Style</div>
                  <div style={{ 
                    color: 'white', 
                    fontSize: '1rem',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '0.75rem',
                    borderLeft: '4px solid #fbbf24',
                  }}>
                    {player.playingStyle}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* World Cup Info */}
        {worldCupInfo && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '1.5rem',
            borderRadius: '1rem',
            marginTop: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'fadeIn 0.6s ease-out 0.3s both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                🌍
              </div>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>
                {worldCupInfo.year ? `World Cup ${worldCupInfo.year}` : "World Cup"}
              </h3>
            </div>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {worldCupInfo.host && (
                <InfoCard label="Host" value={worldCupInfo.host} color="#4ade80" />
              )}
              {worldCupInfo.defendingChampion && (
                <InfoCard label="Defending Champion" value={worldCupInfo.defendingChampion} color="#22d3ee" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default state - no data yet
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '400px',
      textAlign: 'center',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.8,
        animation: 'fadeIn 1s ease-out',
      }}>
        ⚽
      </div>
      <h3 style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        marginBottom: '1rem',
        color: 'white',
        background: 'linear-gradient(to right, #4ade80, #22d3ee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        FootballAI Analysis
      </h3>
      <p style={{
        color: '#94a3b8',
        maxWidth: '500px',
        lineHeight: 1.7,
        fontSize: '1.125rem',
        marginBottom: '2rem',
      }}>
        Search for players, teams, or tournaments to get comprehensive AI-powered football analysis.
      </p>
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '600px',
      }}>
        <FeatureBadge icon="🎯" text="Player Stats" color="#4ade80" />
        <FeatureBadge icon="🏆" text="Team Analysis" color="#fbbf24" />
        <FeatureBadge icon="🌍" text="World Cup" color="#3b82f6" />
        <FeatureBadge icon="🤖" text="AI Powered" color="#8b5cf6" />
      </div>
    </div>
  );
}

// Helper function to render achievements
function renderAchievements(entity: any) {
  const { achievementsSummary } = entity;
  const isNationalTeam = entity.type === 'national';
  const isClub = entity.type === 'club';

  if (isNationalTeam) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem',
      }}>
        {achievementsSummary.worldCupTitles > 0 && (
          <AchievementCard 
            icon="🌍" 
            label="World Cup Titles" 
            value={achievementsSummary.worldCupTitles}
            color="#3b82f6"
          />
        )}
        {achievementsSummary.continentalTitles > 0 && (
          <AchievementCard 
            icon="🏆" 
            label="Continental Titles" 
            value={achievementsSummary.continentalTitles}
            color="#10b981"
          />
        )}
      </div>
    );
  }

  if (isClub) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem',
      }}>
        {achievementsSummary.continentalTitles > 0 && (
          <AchievementCard 
            icon="⭐" 
            label="Continental Titles" 
            value={achievementsSummary.continentalTitles}
            color="#8b5cf6"
          />
        )}
        {achievementsSummary.domesticTitles?.leagues > 0 && (
          <AchievementCard 
            icon="🥇" 
            label="League Titles" 
            value={achievementsSummary.domesticTitles.leagues}
            color="#4ade80"
          />
        )}
        {achievementsSummary.domesticTitles?.cups > 0 && (
          <AchievementCard 
            icon="🏆" 
            label="Cup Titles" 
            value={achievementsSummary.domesticTitles.cups}
            color="#22d3ee"
          />
        )}
      </div>
    );
  }

  // Player achievements
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
      gap: '1rem',
    }}>
      {achievementsSummary.worldCupTitles > 0 && (
        <AchievementCard 
          icon="🌍" 
          label="World Cup Titles" 
          value={achievementsSummary.worldCupTitles}
          color="#3b82f6"
        />
      )}
      {achievementsSummary.continentalTitles > 0 && (
        <AchievementCard 
          icon="🏆" 
          label="Continental Titles" 
          value={achievementsSummary.continentalTitles}
          color="#10b981"
        />
      )}
      {achievementsSummary.clubDomesticTitles?.leagues > 0 && (
        <AchievementCard 
          icon="🥇" 
          label="League Titles" 
          value={achievementsSummary.clubDomesticTitles.leagues}
          color="#4ade80"
        />
      )}
    </div>
  );
}

// Helper Components
function InfoCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: '1rem',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '0.75rem',
      border: `1px solid ${color}20`,
    }}>
      <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ color: 'white', fontWeight: 600, fontSize: '1.125rem' }}>{value}</div>
    </div>
  );
}

function AchievementCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: '1.25rem',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '0.75rem',
      border: `1px solid ${color}30`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ color: color, fontWeight: 700, fontSize: '2.5rem', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{label}</div>
    </div>
  );
}

function FeatureBadge({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <div style={{
      padding: '0.75rem 1.25rem',
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: '999px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.9375rem',
      color: `${color}dd`,
      fontWeight: 500,
    }}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}