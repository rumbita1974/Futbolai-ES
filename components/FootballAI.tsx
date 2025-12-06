import { useEffect } from 'react';

interface FootballAIProps {
  player: any;
  team: any;
  isLoading: boolean;
  analysis?: string;
  teams?: any[];
  worldCupInfo?: any;
}

// Add CSS for spinner animation - moved OUTSIDE component
const SPINNER_STYLES = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function FootballAI({ 
  player, 
  team, 
  isLoading,
  analysis,
  teams,
  worldCupInfo 
}: FootballAIProps) {
  // Add spinner styles safely for SSR
  const addSpinnerStyles = () => {
    if (typeof document !== 'undefined') {
      // Check if style already exists
      if (!document.querySelector('style[data-spinner]')) {
        const styleTag = document.createElement('style');
        styleTag.setAttribute('data-spinner', 'true');
        styleTag.textContent = SPINNER_STYLES;
        document.head.appendChild(styleTag);
      }
    }
  };

  // Add styles on component mount
  useEffect(() => {
    addSpinnerStyles();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '500px',
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

  if (player || team || worldCupInfo) {
    const entity = player || team;
    const isNationalTeam = team?.type === 'national';
    
    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            marginBottom: '0.5rem', 
            color: 'white',
            background: player ? 'linear-gradient(to right, #4ade80, #22d3ee)' : 
                      team ? 'linear-gradient(to right, #fbbf24, #f97316)' :
                      'linear-gradient(to right, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {entity?.name || worldCupInfo ? `World Cup ${worldCupInfo.year}` : 'Football Analysis'}
          </h2>
          
          {entity?.type === 'national' && (
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
        </div>
        
        {/* AI Analysis Section */}
        {analysis && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            padding: '1.75rem',
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
        
        {/* BASIC INFO GRID */}
        {(player || team) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            animation: 'fadeIn 0.6s ease-out 0.2s both',
          }}>
            {player && (
              <>
                <InfoCard label="Position" value={player.position} color="#4ade80" />
                <InfoCard label="Nationality" value={player.nationality} color="#22d3ee" />
                <InfoCard label="Current Club" value={player.club} color="#fbbf24" />
                {player.marketValue && player.marketValue !== 'Unknown' && (
                  <InfoCard label="Market Value" value={player.marketValue} color="#8b5cf6" />
                )}
              </>
            )}
            
            {team && (
              <>
                {team.ranking && team.ranking !== 'N/A' && (
                  <InfoCard 
                    label={isNationalTeam ? "FIFA Ranking" : "Current Ranking"} 
                    value={team.ranking} 
                    color="#4ade80" 
                  />
                )}
                <InfoCard label={isNationalTeam ? "Coach" : "Manager"} value={team.coach} color="#22d3ee" />
                <InfoCard label="Stadium" value={team.stadium} color="#fbbf24" />
                {team.stadiumCapacity && team.stadiumCapacity !== 'Unknown' && (
                  <InfoCard label="Capacity" value={team.stadiumCapacity} color="#8b5cf6" />
                )}
                {team.league && team.league !== 'Unknown' && !isNationalTeam && (
                  <InfoCard label="League" value={team.league} color="#ef4444" />
                )}
                {team.founded && team.founded !== 'Unknown' && (
                  <InfoCard label="Founded" value={team.founded} color="#10b981" />
                )}
              </>
            )}
          </div>
        )}
        
        {/* PLAYER SPECIFIC SECTIONS */}
        {player && (
          <>
            {/* Career Statistics */}
            {(player.goals > 0 || player.assists > 0 || player.appearances > 0) && (
              <Section title="Career Statistics" icon="📊" animationDelay="0.3s">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: player.internationalCaps > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
                  gap: '1.5rem',
                  textAlign: 'center',
                }}>
                  <StatCard value={player.goals || 0} label="Total Goals" color="#4ade80" />
                  <StatCard value={player.assists || 0} label="Total Assists" color="#22d3ee" />
                  <StatCard value={player.appearances || 0} label="Appearances" color="#fbbf24" />
                  {player.internationalCaps > 0 && (
                    <StatCard 
                      value={player.internationalCaps} 
                      label="International Caps" 
                      color="#8b5cf6"
                      subValue={player.internationalGoals > 0 ? `${player.internationalGoals} goals` : undefined}
                    />
                  )}
                </div>
              </Section>
            )}
            
            {/* Player Details */}
            {(player.height || player.strongFoot || player.dateOfBirth || player.playingStyle) && (
              <Section title="Player Details" icon="ℹ️" animationDelay="0.4s">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem',
                }}>
                  {player.dateOfBirth && (
                    <InfoCard label="Date of Birth" value={player.dateOfBirth} color="#10b981" />
                  )}
                  {player.height && (
                    <InfoCard label="Height" value={player.height} color="#3b82f6" />
                  )}
                  {player.strongFoot && player.strongFoot !== 'Unknown' && (
                    <InfoCard label="Preferred Foot" value={player.strongFoot} color="#f59e0b" />
                  )}
                  {player.age && (
                    <InfoCard label="Age" value={player.age} color="#ef4444" />
                  )}
                </div>
                {player.playingStyle && (
                  <div style={{ marginTop: '1rem' }}>
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
              </Section>
            )}
            
            {/* Previous Clubs */}
            {player.previousClubs && player.previousClubs.length > 0 && (
              <Section title="Previous Clubs" icon="🏛️" animationDelay="0.5s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {player.previousClubs.map((club: string, index: number) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(34, 211, 238, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(34, 211, 238, 0.2)',
                        fontSize: '0.9375rem',
                        color: '#22d3ee',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🏟️</span>
                      {club}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            
            {/* Achievements */}
            {player.achievements && player.achievements.length > 0 && (
              <Section title="Achievements & Trophies" icon="🏆" animationDelay="0.6s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {player.achievements.map((achievement: string, index: number) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        fontSize: '0.9375rem',
                        color: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🏅</span>
                      {achievement}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
        
        {/* TEAM SPECIFIC SECTIONS */}
        {team && (
          <>
            {/* Key Players */}
            {team.keyPlayers && team.keyPlayers.length > 0 && (
              <Section title="Key Players" icon="⭐" animationDelay="0.3s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {team.keyPlayers.map((player: string | any, index: number) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        fontSize: '0.9375rem',
                        color: '#8b5cf6',
                      }}
                    >
                      {typeof player === 'string' ? player : player.name}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            
            {/* Achievements */}
            {team.achievements && team.achievements.length > 0 && (
              <Section title="Trophies & Achievements" icon="🏆" animationDelay="0.4s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {team.achievements.map((achievement: string, index: number) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        fontSize: '0.9375rem',
                        color: '#fbbf24',
                      }}
                    >
                      {achievement}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            
            {/* Main Rivalries */}
            {team.mainRivalries && team.mainRivalries.length > 0 && (
              <Section title="Main Rivalries" icon="⚔️" animationDelay="0.5s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {team.mainRivalries.map((rivalry: string, index: number) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '0.9375rem',
                        color: '#ef4444',
                      }}
                    >
                      {rivalry}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            
            {/* National Team Specific */}
            {isNationalTeam && (
              <>
                {team.fifaCode && (
                  <InfoCard label="FIFA Code" value={team.fifaCode} color="#3b82f6" />
                )}
                {team.confederation && (
                  <InfoCard label="Confederation" value={team.confederation} color="#10b981" />
                )}
                {team.allTimeTopScorer && (
                  <InfoCard label="All-time Top Scorer" value={team.allTimeTopScorer} color="#ef4444" />
                )}
                {team.mostCaps && (
                  <InfoCard label="Most Caps" value={team.mostCaps} color="#8b5cf6" />
                )}
                {team.playingStyle && (
                  <InfoCard label="Playing Style" value={team.playingStyle} color="#f59e0b" />
                )}
              </>
            )}
          </>
        )}
        
        {/* WORLD CUP INFO */}
        {worldCupInfo && (
          <Section title={`World Cup ${worldCupInfo.year}`} icon="🌍" animationDelay="0.3s">
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <InfoCard label="Host" value={worldCupInfo.host} color="#4ade80" />
              {worldCupInfo.format && (
                <InfoCard label="Format" value={worldCupInfo.format} color="#22d3ee" />
              )}
              {worldCupInfo.defendingChampion && (
                <InfoCard label="Defending Champion" value={worldCupInfo.defendingChampion} color="#fbbf24" />
              )}
              {worldCupInfo.mostTitles && (
                <InfoCard label="Most Titles" value={worldCupInfo.mostTitles} color="#ef4444" />
              )}
              
              {worldCupInfo.qualifiedTeams && worldCupInfo.qualifiedTeams.length > 0 && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    Qualified Teams ({worldCupInfo.qualifiedTeams.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {worldCupInfo.qualifiedTeams.slice(0, 12).map((team: string | any, index: number) => (
                      <span 
                        key={index}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '0.5rem',
                          fontSize: '0.8125rem',
                          color: '#93c5fd',
                        }}
                      >
                        {typeof team === 'string' ? team : team.country}
                      </span>
                    ))}
                    {worldCupInfo.qualifiedTeams.length > 12 && (
                      <span style={{ color: '#64748b', fontSize: '0.8125rem', alignSelf: 'center' }}>
                        +{worldCupInfo.qualifiedTeams.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    );
  }

  // Default state - no search yet
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '500px',
      textAlign: 'center',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <div style={{
        fontSize: '5rem',
        marginBottom: '1.5rem',
        opacity: 0.8,
        animation: 'fadeIn 1s ease-out',
      }}>
        ⚽
      </div>
      <h3 style={{
        fontSize: '2rem',
        fontWeight: 700,
        marginBottom: '1rem',
        color: 'white',
        background: 'linear-gradient(to right, #4ade80, #22d3ee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        FutbolAI Analysis
      </h3>
      <p style={{
        color: '#94a3b8',
        maxWidth: '500px',
        lineHeight: 1.7,
        fontSize: '1.125rem',
        marginBottom: '2rem',
      }}>
        Search for players, teams, or tournaments to get comprehensive AI-powered football analysis, detailed statistics, and expert insights.
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
        <FeatureBadge icon="🌍" text="World Cup 2026" color="#3b82f6" />
        <FeatureBadge icon="📊" text="Detailed Insights" color="#22d3ee" />
        <FeatureBadge icon="⚽" text="Live Updates" color="#ef4444" />
        <FeatureBadge icon="🤖" text="AI Powered" color="#8b5cf6" />
      </div>
    </div>
  );
}

// Helper Components
function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
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

function StatCard({ value, label, color, subValue }: { value: number; label: string; color: string; subValue?: string }) {
  return (
    <div>
      <div style={{ 
        fontSize: '2.5rem', 
        fontWeight: 800, 
        color: color,
        lineHeight: 1,
        marginBottom: '0.25rem',
      }}>
        {value.toLocaleString()}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{label}</div>
      {subValue && (
        <div style={{ 
          color: `${color}cc`, 
          fontSize: '0.75rem',
          marginTop: '0.25rem',
        }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children, animationDelay }: { 
  title: string; 
  icon: string;
  children: React.ReactNode;
  animationDelay?: string;
}) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      padding: '1.75rem',
      borderRadius: '1rem',
      marginTop: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      animation: animationDelay ? `fadeIn 0.6s ease-out ${animationDelay} both` : 'none',
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
          {icon}
        </div>
        <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>{title}</h3>
      </div>
      {children}
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