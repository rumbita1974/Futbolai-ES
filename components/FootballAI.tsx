import { useEffect } from 'react';

interface FootballAIProps {
  player: any;
  team: any;
  isLoading: boolean;
  analysis?: string;
  teams?: any[];
  worldCupInfo?: any;
}

// Add CSS for spinner animation - Moved to CSS-in-JS to avoid SSR issues
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
  // Add spinner styles safely - FIXED for SSR
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!document.querySelector('style[data-spinner]')) {
        const styleTag = document.createElement('style');
        styleTag.setAttribute('data-spinner', 'true');
        styleTag.textContent = SPINNER_STYLES;
        document.head.appendChild(styleTag);
      }
    }
  }, []);

  // Log when component receives new data
  useEffect(() => {
    console.log('🔄 FootballAI component updated with new data:', {
      player: !!player,
      team: !!team,
      worldCupInfo: !!worldCupInfo,
      isLoading
    });
  }, [player, team, worldCupInfo, isLoading]);

  // Helper function to render structured achievements
  const renderStructuredAchievements = (entity: any) => {
    if (!entity) return null;
    
    const isNationalTeam = entity.type === 'national';
    const isClub = entity.type === 'club';
    
    // New API format with achievementsSummary
    if (entity.achievementsSummary) {
      const { achievementsSummary } = entity;
      
      if (isNationalTeam) {
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem',
            marginTop: '1rem'
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
            marginTop: '1rem'
          }}>
            {achievementsSummary.continentalTitles > 0 && (
              <AchievementCard 
                icon="⭐" 
                label="Continental Titles" 
                value={achievementsSummary.continentalTitles}
                color="#8b5cf6"
              />
            )}
            {achievementsSummary.internationalTitles > 0 && (
              <AchievementCard 
                icon="🌎" 
                label="International Titles" 
                value={achievementsSummary.internationalTitles}
                color="#f59e0b"
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
    }
    
    // Old format fallback - trophies
    if (entity.trophies) {
      const trophyItems = [];
      const { trophies } = entity;
      
      if (trophies.domestic) trophyItems.push(...trophies.domestic);
      if (trophies.continental) trophyItems.push(...trophies.continental);
      if (trophies.worldwide) trophyItems.push(...trophies.worldwide);
      
      if (trophyItems.length > 0) {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
            {trophyItems.map((trophy: any, index: number) => (
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
                <span>{trophy.icon || '🏆'}</span>
                <span>{trophy.competition}: {trophy.wins}</span>
              </div>
            ))}
          </div>
        );
      }
    }
    
    // Fallback to achievements array
    if (entity.achievements && entity.achievements.length > 0) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          {entity.achievements.map((achievement: string, index: number) => (
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
      );
    }
    
    return null;
  };

  // Function to render detailed club trophies by category
  const renderDetailedClubTrophies = (team: any) => {
    if (!team || team.type !== 'club') return null;
    
    const hasTrophies = team.trophies || team.achievementsSummary?.specificTrophies;
    if (!hasTrophies) return null;
    
    const { trophies, achievementsSummary } = team;
    
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>Detailed Trophy Cabinet</h4>
        
        {/* Continental Trophies */}
        {trophies?.continental && trophies.continental.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ color: '#8b5cf6', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⭐</span>
              <span>Continental Trophies</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {trophies.continental.map((trophy: any, index: number) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span>{trophy.icon || '🏆'}</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.875rem' }}>{trophy.competition}</span>
                  </div>
                  <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '1.25rem' }}>{trophy.wins}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* International Trophies */}
        {trophies?.international && trophies.international.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ color: '#f59e0b', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🌎</span>
              <span>International Trophies</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {trophies.international.map((trophy: any, index: number) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span>{trophy.icon || '🏆'}</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.875rem' }}>{trophy.competition}</span>
                  </div>
                  <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.25rem' }}>{trophy.wins}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Domestic League Trophies */}
        {trophies?.domestic?.league && trophies.domestic.league.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ color: '#4ade80', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🥇</span>
              <span>Domestic League Titles</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {trophies.domestic.league.map((trophy: any, index: number) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  background: 'rgba(74, 222, 128, 0.1)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(74, 222, 128, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span>{trophy.icon || '🥇'}</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.875rem' }}>{trophy.competition}</span>
                  </div>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.25rem' }}>{trophy.wins}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Domestic Cup Trophies */}
        {trophies?.domestic?.cup && trophies.domestic.cup.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ color: '#22d3ee', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏆</span>
              <span>Domestic Cup Titles</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {trophies.domestic.cup.map((trophy: any, index: number) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  background: 'rgba(34, 211, 238, 0.1)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(34, 211, 238, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span>{trophy.icon || '🏆'}</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.875rem' }}>{trophy.competition}</span>
                  </div>
                  <div style={{ color: '#22d3ee', fontWeight: 700, fontSize: '1.25rem' }}>{trophy.wins}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Specific Key Trophies (from achievementsSummary) */}
        {achievementsSummary?.specificTrophies && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '0.75rem' }}>
            <div style={{ color: '#fbbf24', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏅</span>
              <span>Key Achievements</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {achievementsSummary.specificTrophies.championsLeague > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem' }}>⭐</div>
                  <div style={{ color: 'white', fontSize: '0.875rem' }}>UEFA Champions League</div>
                  <div style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '1.25rem' }}>{achievementsSummary.specificTrophies.championsLeague}</div>
                </div>
              )}
              {achievementsSummary.specificTrophies.europaLeague > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem' }}>🌟</div>
                  <div style={{ color: 'white', fontSize: '0.875rem' }}>UEFA Europa League</div>
                  <div style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '1.125rem' }}>{achievementsSummary.specificTrophies.europaLeague}</div>
                </div>
              )}
              {achievementsSummary.specificTrophies.clubWorldCup > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem' }}>🌍</div>
                  <div style={{ color: 'white', fontSize: '0.875rem' }}>FIFA Club World Cup</div>
                  <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.25rem' }}>{achievementsSummary.specificTrophies.clubWorldCup}</div>
                </div>
              )}
              {achievementsSummary.specificTrophies.domesticLeague > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem' }}>🥇</div>
                  <div style={{ color: 'white', fontSize: '0.875rem' }}>Domestic League</div>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.25rem' }}>{achievementsSummary.specificTrophies.domesticLeague}</div>
                </div>
              )}
              {achievementsSummary.specificTrophies.mainDomesticCup > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem' }}>🏆</div>
                  <div style={{ color: 'white', fontSize: '0.875rem' }}>Main Domestic Cup</div>
                  <div style={{ color: '#22d3ee', fontWeight: 700, fontSize: '1.25rem' }}>{achievementsSummary.specificTrophies.mainDomesticCup}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get player stats from new API format
  const getPlayerStats = () => {
    if (!player || !player.careerStats) return null;
    
    const { careerStats } = player;
    return {
      goals: careerStats.club?.totalGoals || 0,
      assists: careerStats.club?.totalAssists || 0,
      appearances: careerStats.club?.totalAppearances || 0,
      internationalCaps: careerStats.international?.caps || 0,
      internationalGoals: careerStats.international?.goals || 0,
    };
  };

  const playerStats = getPlayerStats();

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

  if (player || team || worldCupInfo) {
    const entity = player || team;
    const isNationalTeam = team?.type === 'national';
    const isClub = team?.type === 'club';
    
    let title = 'Football Analysis';
    if (player?.name || team?.name) {
      title = player?.name || team?.name;
    } else if (worldCupInfo) {
      title = worldCupInfo.year ? `World Cup ${worldCupInfo.year}` : 'World Cup';
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
          
          {entity?.type === 'club' && (
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
        
        {/* ACHIEVEMENTS SECTION */}
        {((team && (team.achievementsSummary || team.trophies || team.achievements)) || 
          (player && player.achievementsSummary)) && (
          <Section title="🏆 Achievements Summary" icon="🏆" animationDelay="0.2s">
            {renderStructuredAchievements(entity)}
          </Section>
        )}
        
        {/* Detailed Club Trophies Section */}
        {team && team.type === 'club' && (
          <Section title="📊 Detailed Trophy Cabinet" icon="📊" animationDelay="0.3s">
            {renderDetailedClubTrophies(team)}
          </Section>
        )}
        
        {/* BASIC INFO GRID */}
        {(player || team) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            animation: 'fadeIn 0.6s ease-out 0.4s both',
          }}>
            {player && (
              <>
                <InfoCard label="Position" value={player.position || 'Unknown'} color="#4ade80" />
                <InfoCard label="Nationality" value={player.nationality || 'Unknown'} color="#22d3ee" />
                <InfoCard label="Current Club" value={player.currentClub || 'Unknown'} color="#fbbf24" />
                {player.marketValue && (
                  <InfoCard label="Market Value" value={player.marketValue} color="#8b5cf6" />
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
                <InfoCard 
                  label={isNationalTeam ? "Coach" : "Manager"} 
                  value={team.currentCoach?.name || team.currentManager?.name || 'Unknown'} 
                  color="#22d3ee" 
                />
                <InfoCard label="Stadium" value={team.stadium?.name || team.homeStadium || 'Unknown'} color="#fbbf24" />
                {team.stadium?.capacity && (
                  <InfoCard label="Capacity" value={team.stadium.capacity} color="#8b5cf6" />
                )}
                {team.league && !isNationalTeam && (
                  <InfoCard label="League" value={team.league} color="#ef4444" />
                )}
                {team.founded && (
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
            {playerStats && (playerStats.goals > 0 || playerStats.assists > 0 || playerStats.appearances > 0) && (
              <Section title="Career Statistics" icon="📊" animationDelay="0.5s">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '1.5rem',
                  textAlign: 'center',
                }}>
                  <StatCard value={playerStats.goals} label="Total Goals" color="#4ade80" />
                  <StatCard value={playerStats.assists} label="Total Assists" color="#22d3ee" />
                  <StatCard value={playerStats.appearances} label="Appearances" color="#fbbf24" />
                  {playerStats.internationalCaps > 0 && (
                    <StatCard 
                      value={playerStats.internationalCaps} 
                      label="International Caps" 
                      color="#8b5cf6"
                      subValue={playerStats.internationalGoals > 0 ? `${playerStats.internationalGoals} goals` : undefined}
                    />
                  )}
                </div>
              </Section>
            )}
            
            {/* Player Details */}
            {(player.height || player.preferredFoot || player.dateOfBirth || player.playingStyle) && (
              <Section title="Player Details" icon="ℹ️" animationDelay="0.6s">
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
            
            {/* Club Career */}
            {player.clubCareer && player.clubCareer.length > 0 && (
              <Section title="Club Career" icon="🏛️" animationDelay="0.7s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {player.clubCareer.map((club: any, index: number) => (
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
                      <span>{club.club} ({club.period}) - {club.appearances} apps, {club.goals} goals</span>
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
            {team.currentSquad?.keyPlayers && team.currentSquad.keyPlayers.length > 0 && (
              <Section title="Key Players" icon="⭐" animationDelay="0.5s">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {team.currentSquad.keyPlayers.slice(0, 6).map((player: any, index: number) => (
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
                      {player.name} ({player.position}) - {player.nationality || player.club}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            
            {/* Main Rivalries */}
            {team.mainRivalries && team.mainRivalries.length > 0 && (
              <Section title="Main Rivalries" icon="⚔️" animationDelay="0.6s">
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
              }}>
                {team.fifaCode && (
                  <InfoCard label="FIFA Code" value={team.fifaCode} color="#3b82f6" />
                )}
                {team.confederation && (
                  <InfoCard label="Confederation" value={team.confederation} color="#10b981" />
                )}
                {team.records?.topScorer?.player && (
                  <InfoCard label="Top Scorer" value={`${team.records.topScorer.player} (${team.records.topScorer.goals} goals)`} color="#ef4444" />
                )}
                {team.records?.mostCaps?.player && (
                  <InfoCard label="Most Caps" value={`${team.records.mostCaps.player} (${team.records.mostCaps.caps} caps)`} color="#8b5cf6" />
                )}
                {team.playingStyle && (
                  <InfoCard label="Playing Style" value={team.playingStyle} color="#f59e0b" />
                )}
              </div>
            )}
          </>
        )}
        
        {/* WORLD CUP INFO */}
        {worldCupInfo && (
          <Section 
            title={worldCupInfo.year ? `World Cup ${worldCupInfo.year}` : "World Cup"} 
            icon="🌍" 
            animationDelay="0.3s"
          >
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {worldCupInfo.host && (
                <InfoCard label="Host" value={worldCupInfo.host} color="#4ade80" />
              )}
              {worldCupInfo.edition && (
                <InfoCard label="Edition" value={worldCupInfo.edition} color="#22d3ee" />
              )}
              {worldCupInfo.defendingChampion && (
                <InfoCard label="Defending Champion" value={worldCupInfo.defendingChampion} color="#fbbf24" />
              )}
              {worldCupInfo.mostTitles && (
                <InfoCard label="Most Titles" value={`${worldCupInfo.mostTitles.country} (${worldCupInfo.mostTitles.titles})`} color="#ef4444" />
              )}
            </div>
          </Section>
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
        <FeatureBadge icon="🌍" text="World Cup 2026" color="#3b82f6" />
        <FeatureBadge icon="📊" text="Detailed Insights" color="#22d3ee" />
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
      padding: '1.5rem',
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