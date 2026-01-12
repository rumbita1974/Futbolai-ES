// components/EnhancedTeamResults.tsx - UPDATED VERSION WITH SPANISH SUPPORT AND HISTORICAL DATA
'use client';

import { useState, useEffect } from 'react';
import { searchYouTubeHighlights, YouTubeVideo } from '@/services/youtubeService';
import { Team, Player, needsDataVerification, getDataSourceInfo, getHistoricalPlayers } from '@/services/groqService';
import { getDataCurrencyBadge } from '@/services/dataEnhancerService';

interface EnhancedTeamResultsProps {
  teams: Team[];
  players: Player[];
  youtubeQuery: string;
  searchTerm: string;
  getTeamFlagUrl: (teamName: string, teamType: string, country?: string) => string;
  language?: string;
}

export default function EnhancedTeamResults({
  teams,
  players,
  youtubeQuery,
  searchTerm,
  getTeamFlagUrl,
  language = 'en'
}: EnhancedTeamResultsProps) {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'achievements' | 'history' | 'videos'>('overview');
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>(players);
  const [legendaryPlayers, setLegendaryPlayers] = useState<Player[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Get data from metadata if available
  const team = teams[0];
  const teamMetadata = team?._dataCurrency;

  // Update the useEffect in EnhancedTeamResults.tsx:
  useEffect(() => {
    if (team && players.length === 0) {
      // Only show warning, don't generate fake data
      console.warn(`No players returned for team: ${team.name}. GROQ AI returned empty player data.`);
      
      // Instead of generating fake data, set empty array
      setDisplayPlayers([]);
    } else {
      setDisplayPlayers(players);
    }
  }, [team, players, language]);

  // Fetch YouTube videos when component mounts or query changes
  useEffect(() => {
    const fetchVideos = async () => {
      if (!youtubeQuery) return;

      setLoadingVideos(true);
      setVideoError(null);

      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      const result = await searchYouTubeHighlights(youtubeQuery, apiKey || '');

      if (result.error) {
        setVideoError(result.error);
      } else {
        setYoutubeVideos(result.videos);
      }

      setLoadingVideos(false);
    };

    fetchVideos();
  }, [youtubeQuery]);

  // Fetch historical players when history tab is selected
  useEffect(() => {
    const fetchHistoricalPlayers = async () => {
      if (activeTab === 'history' && team && legendaryPlayers.length === 0) {
        setLoadingHistory(true);
        try {
          const historical = await getHistoricalPlayers(team.name, team.type, language);
          if (historical.length > 0) {
            setLegendaryPlayers(historical);
          }
        } catch (error) {
          console.error('Error fetching historical players:', error);
        } finally {
          setLoadingHistory(false);
        }
      }
    };

    fetchHistoricalPlayers();
  }, [activeTab, team, language]);

  // Helper function for translations
  const t = (en: string, es: string) => language === 'es' ? es : en;

  // Helper component for player cards in squad tab
  const PlayerCard = ({ player, index, isHistorical = false }: { player: Player; index: number; isHistorical?: boolean }) => {
    const isPlaceholder = player._source?.includes('Placeholder') || 
                         player._source?.includes('ejemplo') || 
                         player.name.startsWith('Player') || 
                         player.name.startsWith('Jugador');
    const isLegendary = player._source?.includes('Historical') || isHistorical;
    
    return (
      <div className={`bg-gradient-to-br from-gray-900 to-gray-800 border ${isLegendary ? 'border-purple-700' : 'border-gray-700'} rounded-xl p-4 hover:border-blue-500/50 transition-all hover:-translate-y-1`}>
        <div className="flex items-start gap-4">
          {/* Player photo placeholder */}
          <div className="flex-shrink-0">
            <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border ${isLegendary ? 'border-purple-600' : 'border-gray-700'} flex items-center justify-center`}>
              <span className="text-2xl">{isLegendary ? '⭐' : '👤'}</span>
            </div>
          </div>
          
          {/* Player info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <h4 className="font-bold text-white text-lg">{player.name}</h4>
              <div className="flex items-center gap-2">
                {isLegendary && (
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded-full">
                    {t('Legend', 'Leyenda')}
                  </span>
                )}
                <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full">
                  #{index + 1}
                </span>
              </div>
            </div>
            
            {player._era && (
              <div className="mb-2">
                <div className="text-gray-400 text-xs">{t('Era', 'Época')}</div>
                <div className="text-yellow-300 font-medium text-sm">{player._era}</div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-400 text-xs">
                  {t('Position', 'Posición')}
                </div>
                <div className="text-white font-medium">{player.position}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">
                  {t('Nationality', 'Nacionalidad')}
                </div>
                <div className="text-white font-medium">{player.nationality}</div>
              </div>
              {player.age && !isLegendary && (
                <div>
                  <div className="text-gray-400 text-xs">
                    {t('Age', 'Edad')}
                  </div>
                  <div className="text-white font-medium">{player.age}</div>
                </div>
              )}
              {player.careerGoals !== undefined && (
                <div>
                  <div className="text-gray-400 text-xs">
                    {t('Career Goals', 'Goles en carrera')}
                  </div>
                  <div className="text-white font-medium">{player.careerGoals}</div>
                </div>
              )}
            </div>
            
            {player.currentTeam && !isPlaceholder && !isLegendary && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-gray-400 text-xs">
                  {t('Current Club', 'Club actual')}
                </div>
                <div className="text-white font-medium text-sm">{player.currentTeam}</div>
              </div>
            )}
            
            {player._yearsAtTeam && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-gray-400 text-xs">
                  {t('Years at Team', 'Años en el equipo')}
                </div>
                <div className="text-white font-medium text-sm">{player._yearsAtTeam}</div>
              </div>
            )}
            
            {/* Placeholder data indicator */}
            {isPlaceholder && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-yellow-500 text-xs">
                  {t(
                    'Placeholder data - Real squad details would load here',
                    'Datos de ejemplo - Los detalles reales del equipo se cargarían aquí'
                  )}
                </div>
              </div>
            )}
            
            {/* Legendary player indicator */}
            {isLegendary && !isPlaceholder && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-purple-400 text-xs">
                  {t(
                    'Historical legend of the club',
                    'Leyenda histórica del club'
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper component for achievement items
  const AchievementItem = ({ achievement, index }: { achievement: string; index: number }) => (
    <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg hover:border-yellow-500/50 transition">
      <div className="flex-shrink-0 pt-1">
        <span className="text-yellow-500">🏆</span>
      </div>
      <div className="flex-1">
        <p className="text-white text-sm">{achievement}</p>
      </div>
    </div>
  );

  // Format date for YouTube videos
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        return t(`${diffDays} day${diffDays !== 1 ? 's' : ''} ago`, 
                 `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`);
      } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7);
        return t(`${weeks} week${weeks !== 1 ? 's' : ''} ago`, 
                 `Hace ${weeks} semana${weeks !== 1 ? 's' : ''}`);
      } else {
        return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (e) {
      return dateString;
    }
  };

  if (teams.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🏟️</div>
        <h3 className="text-xl font-bold text-gray-200 mb-3">
          {t('No Team Found', 'Equipo no encontrado')}
        </h3>
        <p className="text-gray-400">
          {t(`No detailed team information found for "${searchTerm}". Try searching for a specific club or national team.`,
             `No se encontró información detallada para "${searchTerm}". Intenta buscar un club o selección nacional específica.`)}
        </p>
      </div>
    );
  }

  // Format achievements
  const allAchievements = [
    ...(team.majorAchievements?.worldCup || []),
    ...(team.majorAchievements?.continental || []),
    ...(team.majorAchievements?.domestic || [])
  ];

  // Calculate team type display
  const teamTypeDisplay = team.type === 'national' 
    ? t('National Team', 'Selección Nacional') 
    : t('Football Club', 'Club de Fútbol');
  
  const teamColor = team.type === 'national' ? 'from-blue-500 to-green-500' : 'from-purple-500 to-pink-500';

  // Most successful squad data
  const successfulSquad = {
    era: team.type === 'club' 
      ? t('Golden Generation', 'Generación Dorada') 
      : t('World Cup Winning Era', 'Era de Campeones del Mundo'),
    years: team.type === 'club' 
      ? "2014-2022" 
      : new Date().getFullYear() - 10 + "-" + new Date().getFullYear(),
    achievements: allAchievements.slice(0, 3),
    keyPlayers: displayPlayers.length > 0 
      ? displayPlayers.slice(0, 4).map(p => p.name)
      : [t('Legendary players would appear here', 'Jugadores legendarios aparecerían aquí')]
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Team Flag/Crest */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 flex items-center justify-center p-2">
              <img
                src={getTeamFlagUrl(team.name, team.type, team.country)}
                alt={`${team.name} flag`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://img.icons8.com/color/96/soccer-ball--v1.png';
                }}
              />
            </div>
          </div>

          {/* Team Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {team.name}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${teamColor} text-white`}>
                {teamTypeDisplay}
              </span>
              {team.country && team.type === 'club' && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-gray-300">
                  {team.country}
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {team.currentCoach && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    {t('Current Manager', 'Entrenador actual')}
                  </div>
                  <div className="font-medium text-white">{team.currentCoach}</div>
                </div>
              )}
              
              {team.foundedYear && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    {t('Founded', 'Fundado')}
                  </div>
                  <div className="font-medium text-white">{team.foundedYear}</div>
                  <div className="text-xs text-gray-500">
                    ({new Date().getFullYear() - team.foundedYear} {t('years', 'años')})
                  </div>
                </div>
              )}
              
              {team.stadium && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    {t('Stadium', 'Estadio')}
                  </div>
                  <div className="font-medium text-white">{team.stadium}</div>
                </div>
              )}
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">
                  {t('Total Achievements', 'Logros totales')}
                </div>
                <div className="font-medium text-green-400">{allAchievements.length}+ {t('Trophies', 'Trofeos')}</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700/30">
                {allAchievements.length}+ {t('Achievements', 'Logros')}
              </div>
              {team.type === 'national' && team.country && (
                <div className="px-3 py-1.5 bg-green-900/30 text-green-300 rounded-full text-sm border border-green-700/30">
                  {team.country}
                </div>
              )}
              <div className="px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full text-sm border border-purple-700/30">
                {displayPlayers.length > 0 ? `${displayPlayers.length} ${t('Players', 'Jugadores')}` : t('Squad Loading...', 'Cargando equipo...')}
              </div>
              <div className="px-3 py-1.5 bg-yellow-900/30 text-yellow-300 rounded-full text-sm border border-yellow-700/30">
                {t('AI Analysis', 'Análisis IA')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-4 z-10 bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl p-1">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'overview' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            📋 {t('Overview', 'Resumen')}
          </button>
          <button
            onClick={() => setActiveTab('squad')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'squad' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            👥 {displayPlayers.length > 0 ? t('Current Squad', 'Equipo actual') : t('No Squad', 'Sin equipo')}
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'achievements' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            🏆 {t('Achievements', 'Logros')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'history' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            📜 {t('History', 'Historia')}
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'videos' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            🎥 {t('Highlights', 'Destacados')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Team Summary */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="mr-3">📊</span> {t('Team Overview', 'Resumen del equipo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    {t('Team Profile', 'Perfil del equipo')}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('Team Type:', 'Tipo de equipo:')}</span>
                      <span className="text-white font-medium">{teamTypeDisplay}</span>
                    </div>
                    {team.country && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Country:', 'País:')}</span>
                        <span className="text-white font-medium">{team.country}</span>
                      </div>
                    )}
                    {team.foundedYear && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Founded:', 'Fundado:')}</span>
                        <span className="text-white font-medium">{team.foundedYear} ({new Date().getFullYear() - team.foundedYear} {t('years', 'años')})</span>
                      </div>
                    )}
                    {team.currentCoach && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Current Manager:', 'Entrenador actual:')}</span>
                        <span className="text-white font-medium">{team.currentCoach}</span>
                      </div>
                    )}
                    {team.stadium && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Home Stadium:', 'Estadio local:')}</span>
                        <span className="text-white font-medium">{team.stadium}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    {t('Achievements Summary', 'Resumen de logros')}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">{t('World Cup Titles:', 'Copas del Mundo:')}</span>
                        <span className="text-yellow-400 font-medium">{team.majorAchievements.worldCup?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (team.majorAchievements.worldCup?.length || 0) * 20)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">{t('Continental Titles:', 'Títulos continentales:')}</span>
                        <span className="text-blue-400 font-medium">{team.majorAchievements.continental?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (team.majorAchievements.continental?.length || 0) * 10)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">{t('Domestic Titles:', 'Títulos nacionales:')}</span>
                        <span className="text-green-400 font-medium">{team.majorAchievements.domestic?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (team.majorAchievements.domestic?.length || 0) * 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Data Source */}
            {teamMetadata && (
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">🤖</span> {t('AI Analysis Information', 'Información de análisis IA')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{t('Data Source:', 'Fuente de datos:')}</span>
                    <span className="ml-2 text-white font-medium">
                      {teamMetadata.verification?.source || 'GROQ AI + Wikipedia'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('Confidence Level:', 'Nivel de confianza:')}</span>
                    <span className={`ml-2 font-medium ${
                      teamMetadata.verification?.confidence === 'high' ? 'text-green-400' :
                      teamMetadata.verification?.confidence === 'medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {teamMetadata.verification?.confidence?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('Last Updated:', 'Última actualización:')}</span>
                    <span className="ml-2 text-white font-medium">
                      {teamMetadata.lastTrained ? new Date(teamMetadata.lastTrained).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US') : '2024'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('Current Season:', 'Temporada actual:')}</span>
                    <span className="ml-2 text-white font-medium">
                      {teamMetadata.currentSeason || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
                    </span>
                  </div>
                </div>
                {teamMetadata.disclaimer && (
                  <p className="text-gray-400 text-sm mt-4 italic">{teamMetadata.disclaimer}</p>
                )}
              </div>
            )}

            {/* No Players Warning */}
            {displayPlayers.length === 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center">
                  <span className="mr-2">⚠️</span> {t('Squad Data Unavailable', 'Datos del equipo no disponibles')}
                </h4>
                <p className="text-yellow-200 text-sm">
                  {t('The GROQ AI service did not return player data for this team. This could be because:',
                     'El servicio GROQ AI no devolvió datos de jugadores para este equipo. Esto podría deberse a:')}
                </p>
                <ul className="text-yellow-200 text-xs mt-2 list-disc list-inside">
                  <li>{t('The team may not have current players in the database',
                          'El equipo puede no tener jugadores actuales en la base de datos')}</li>
                  <li>{t('There might be an issue with the AI response',
                          'Puede haber un problema con la respuesta de la IA')}</li>
                  <li>{t('Try searching for a more specific team name',
                          'Intenta buscar un nombre de equipo más específico')}</li>
                  <li>{t('The 2024-2025 squad data is still being updated',
                          'Los datos del equipo 2024-2025 aún se están actualizando')}</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Squad Tab */}
        {activeTab === 'squad' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {displayPlayers.length > 0 
                    ? t('Current Squad', 'Equipo actual')
                    : t('No Squad Data Available', 'Sin datos del equipo disponibles')}
                </h3>
                <p className="text-gray-400">
                  {displayPlayers.length > 0 
                    ? t(`Showing ${displayPlayers.length} key players for ${team.name}`,
                        `Mostrando ${displayPlayers.length} jugadores clave de ${team.name}`)
                    : t('GROQ AI did not return player data for this team',
                        'GROQ AI no devolvió datos de jugadores para este equipo')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {displayPlayers.length > 0 ? (
                  <>
                    <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm">
                      {t('Filter by Position', 'Filtrar por posición')}
                    </button>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 text-sm">
                      {t('View Full Roster', 'Ver plantilla completa')}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-500 text-white rounded-lg hover:opacity-90 text-sm"
                  >
                    {t('Retry Search', 'Reintentar búsqueda')}
                  </button>
                )}
              </div>
            </div>

            {displayPlayers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayPlayers.map((player, index) => (
                    <PlayerCard key={index} player={player} index={index} />
                  ))}
                </div>

                {/* Squad Statistics */}
                <div className="mt-8 pt-8 border-t border-gray-700">
                  <h4 className="text-xl font-bold text-white mb-6">
                    {t('Squad Statistics', 'Estadísticas del equipo')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {Math.round(displayPlayers.reduce((avg, p) => avg + (p.age || 0), 0) / displayPlayers.length) || 0}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {t('Average Age', 'Edad promedio')}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {displayPlayers.filter(p => 
                          p.position?.toLowerCase().includes('forward') || 
                          p.position?.toLowerCase().includes('delantero') ||
                          p.position?.toLowerCase().includes('atacante')
                        ).length}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {t('Forwards', 'Delanteros')}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {displayPlayers.filter(p => 
                          p.position?.toLowerCase().includes('midfielder') || 
                          p.position?.toLowerCase().includes('centrocampista') ||
                          p.position?.toLowerCase().includes('mediocampista')
                        ).length}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {t('Midfielders', 'Centrocampistas')}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {displayPlayers.filter(p => 
                          p.position?.toLowerCase().includes('defender') || 
                          p.position?.toLowerCase().includes('defensa') ||
                          p.position?.toLowerCase().includes('goalkeeper') ||
                          p.position?.toLowerCase().includes('portero') ||
                          p.position?.toLowerCase().includes('arquero')
                        ).length}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {t('Defenders + GK', 'Defensas + Portero')}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                <div className="text-5xl mb-4">👥</div>
                <h4 className="text-xl font-semibold text-white mb-2">
                  {t('No Squad Data', 'Sin datos del equipo')}
                </h4>
                <p className="text-gray-400 max-w-md mx-auto">
                  {t('The GROQ AI service did not return player data for this team. This is common for:',
                     'El servicio GROQ AI no devolvió datos de jugadores para este equipo. Esto es común para:')}
                </p>
                <ul className="text-gray-400 text-sm mt-3 max-w-md mx-auto text-left">
                  <li>• {t('Very new or obscure teams', 'Equipos muy nuevos o desconocidos')}</li>
                  <li>• {t('Teams from lower divisions', 'Equipos de divisiones inferiores')}</li>
                  <li>• {t('National teams with limited recent data', 'Selecciones con datos recientes limitados')}</li>
                  <li>• {t('Teams whose 2024-2025 squad is still being compiled', 'Equipos cuya plantilla 2024-2025 aún se está compilando')}</li>
                </ul>
                <div className="mt-6 flex justify-center gap-4">
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90"
                  >
                    {t('Try Again', 'Intentar de nuevo')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('achievements')}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                  >
                    {t('View Achievements Instead', 'Ver logros en su lugar')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {t('Team Achievements', 'Logros del equipo')}
                </h3>
                <p className="text-gray-400">
                  {t('Complete trophy history and major accomplishments',
                     'Historia completa de trofeos y principales logros')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-300 rounded-full text-sm">
                  {team.majorAchievements.worldCup?.length || 0} {t('World Cup', 'Copa del Mundo')}
                </span>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
                  {team.majorAchievements.continental?.length || 0} {t('Continental', 'Continental')}
                </span>
                <span className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm">
                  {team.majorAchievements.domestic?.length || 0} {t('Domestic', 'Nacional')}
                </span>
              </div>
            </div>

            {/* Achievement Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* World Cup Achievements */}
              <div className="bg-gradient-to-br from-yellow-900/20 to-gray-900 border border-yellow-700/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-900 to-yellow-800 flex items-center justify-center">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {t('World Cup', 'Copa del Mundo')}
                    </h4>
                    <p className="text-yellow-300 text-sm">
                      {team.majorAchievements.worldCup?.length || 0} {t('titles', 'títulos')}
                    </p>
                  </div>
                </div>
                {team.majorAchievements.worldCup?.length > 0 ? (
                  <div className="space-y-3">
                    {team.majorAchievements.worldCup.map((achievement, index) => (
                      <AchievementItem key={index} achievement={achievement} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    {t('No World Cup achievements', 'Sin logros en Copa del Mundo')}
                  </p>
                )}
              </div>

              {/* Continental Achievements */}
              <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-700/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
                    <span className="text-2xl">🗺️</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {t('Continental', 'Continental')}
                    </h4>
                    <p className="text-blue-300 text-sm">
                      {team.majorAchievements.continental?.length || 0} {t('titles', 'títulos')}
                    </p>
                  </div>
                </div>
                {team.majorAchievements.continental?.length > 0 ? (
                  <div className="space-y-3">
                    {team.majorAchievements.continental.map((achievement, index) => (
                      <AchievementItem key={index} achievement={achievement} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    {t('No continental achievements', 'Sin logros continentales')}
                  </p>
                )}
              </div>

              {/* Domestic Achievements */}
              <div className="bg-gradient-to-br from-green-900/20 to-gray-900 border border-green-700/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-900 to-green-800 flex items-center justify-center">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {t('Domestic', 'Nacional')}
                    </h4>
                    <p className="text-green-300 text-sm">
                      {team.majorAchievements.domestic?.length || 0} {t('titles', 'títulos')}
                    </p>
                  </div>
                </div>
                {team.majorAchievements.domestic?.length > 0 ? (
                  <div className="space-y-3">
                    {team.majorAchievements.domestic.map((achievement, index) => (
                      <AchievementItem key={index} achievement={achievement} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    {t('No domestic achievements', 'Sin logros nacionales')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">
                {t('Historical Legacy', 'Legado histórico')}
              </h3>
              <p className="text-gray-400 mb-8">
                {t(`Explore the legendary players and most successful eras in ${team.name}'s history`,
                   `Explora los jugadores legendarios y las épocas más exitosas en la historia de ${team.name}`)}
              </p>
            </div>

            {/* Most Successful Squad */}
            <div className="bg-gradient-to-r from-purple-900/20 to-gray-900 border border-purple-700/30 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-900 to-purple-800 flex items-center justify-center">
                  <span className="text-3xl">👑</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {t('Most Successful Squad', 'Equipo más exitoso')}
                  </h4>
                  <p className="text-purple-300">{successfulSquad.era} ({successfulSquad.years})</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-white mb-3">
                    {t('Key Achievements', 'Logros clave')}
                  </h5>
                  <div className="space-y-2">
                    {successfulSquad.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-purple-400">✓</span>
                        <span className="text-white">{achievement}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-lg font-semibold text-white mb-3">
                    {t('Key Players', 'Jugadores clave')}
                  </h5>
                  <div className="space-y-2">
                    {successfulSquad.keyPlayers.map((player, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-white">{player}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legendary Players */}
            <div>
              <h4 className="text-xl font-bold text-white mb-6">
                {t('Legendary Players', 'Jugadores legendarios')}
              </h4>
              
              {loadingHistory ? (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {t('Loading Historical Data', 'Cargando datos históricos')}
                  </h4>
                  <p className="text-gray-400">
                    {t('Fetching legendary players from the database...',
                       'Obteniendo jugadores legendarios de la base de datos...')}
                  </p>
                </div>
              ) : legendaryPlayers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {legendaryPlayers.map((player, index) => (
                    <PlayerCard key={index} player={player} index={index} isHistorical={true} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/30 rounded-xl p-8 text-center">
                  <div className="text-5xl mb-4">📜</div>
                  <h5 className="text-lg font-semibold text-white mb-2">
                    {t('No Historical Data Found', 'No se encontraron datos históricos')}
                  </h5>
                  <p className="text-gray-400 max-w-md mx-auto">
                    {t('Could not load legendary players. Try searching again or check your connection.',
                       'No se pudieron cargar jugadores legendarios. Intenta buscar de nuevo o verifica tu conexión.')}
                  </p>
                  <button
                    onClick={() => {
                      setLegendaryPlayers([]);
                      setLoadingHistory(true);
                      const fetchHistorical = async () => {
                        if (team) {
                          const historical = await getHistoricalPlayers(team.name, team.type, language);
                          setLegendaryPlayers(historical);
                          setLoadingHistory(false);
                        }
                      };
                      fetchHistorical();
                    }}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:opacity-90"
                  >
                    {t('Retry Loading', 'Reintentar carga')}
                  </button>
                </div>
              )}
            </div>

            {/* Historical Timeline */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h4 className="text-xl font-bold text-white mb-6">
                {t('Historical Timeline', 'Línea de tiempo histórica')}
              </h4>
              <div className="bg-gray-800/30 rounded-xl p-6 text-center">
                <div className="text-5xl mb-4">📅</div>
                <h5 className="text-lg font-semibold text-white mb-2">
                  {t('Interactive Timeline', 'Línea de tiempo interactiva')}
                </h5>
                <p className="text-gray-400 max-w-md mx-auto">
                  {t(`Showing key moments in ${team.name}'s history from ${team.foundedYear || 'early'} to present.`,
                     `Mostrando momentos clave en la historia de ${team.name} desde ${team.foundedYear || 'sus inicios'} hasta la actualidad.`)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {t('Match Highlights & Videos', 'Destacados y videos de partidos')}
                </h3>
                <p className="text-gray-400">
                  {t(`Watch ${team.name}'s best moments, goals, and historic matches`,
                     `Mira los mejores momentos, goles y partidos históricos de ${team.name}`)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-900/30 text-red-300 rounded-full text-sm">
                  YouTube
                </span>
                <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm">
                  {youtubeVideos.length} {t('Videos', 'Videos')}
                </span>
              </div>
            </div>

            {/* YouTube Videos */}
            {loadingVideos ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {t('Loading Videos', 'Cargando videos')}
                </h4>
                <p className="text-gray-400">
                  {t('Fetching the latest highlights from YouTube...',
                     'Obteniendo los últimos destacados de YouTube...')}
                </p>
              </div>
            ) : videoError ? (
              <div className="text-center py-12 bg-red-900/20 border border-red-700/30 rounded-xl">
                <div className="text-5xl mb-4">⚠️</div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {t('Error Loading Videos', 'Error al cargar videos')}
                </h4>
                <p className="text-gray-300">{videoError}</p>
                <p className="text-gray-400 text-sm mt-2">
                  {t('Please check your YouTube API key or try again later.',
                     'Por favor, verifica tu clave API de YouTube o intenta de nuevo más tarde.')}
                </p>
              </div>
            ) : youtubeVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {youtubeVideos.map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-red-500/50 transition-all hover:-translate-y-1">
                      {/* Thumbnail */}
                      <div className="relative aspect-video overflow-hidden bg-gray-900">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                              <span className="text-xs">▶</span>
                            </div>
                            <span className="text-white text-sm font-medium">
                              {t('Watch on YouTube', 'Ver en YouTube')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Video Info */}
                      <div className="p-4">
                        <h4 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition">
                          {video.title}
                        </h4>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">
                            {formatDate(video.publishedAt)}
                          </span>
                          <span className="text-gray-400">
                            {video.viewCount} {t('views', 'vistas')}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <span className="text-xs">📺</span>
                          </div>
                          <span className="text-gray-400 text-sm">{video.channelTitle}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                <div className="text-5xl mb-4">🎥</div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {t('No Videos Found', 'No se encontraron videos')}
                </h4>
                <p className="text-gray-400 max-w-md mx-auto">
                  {t(`Could not find videos for "${youtubeQuery}". Try a different search term or check the YouTube API configuration.`,
                     `No se encontraron videos para "${youtubeQuery}". Prueba con un término de búsqueda diferente o verifica la configuración de la API de YouTube.`)}
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      // Refresh videos
                      setLoadingVideos(true);
                      const fetchVideos = async () => {
                        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
                        const result = await searchYouTubeHighlights(youtubeQuery, apiKey || '');
                        if (!result.error) {
                          setYoutubeVideos(result.videos);
                        }
                        setLoadingVideos(false);
                      };
                      fetchVideos();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90"
                  >
                    {t('Refresh Videos', 'Actualizar videos')}
                  </button>
                </div>
              </div>
            )}

            {/* Video Search Info */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="bg-gray-800/30 rounded-xl p-6">
                <h5 className="text-lg font-semibold text-white mb-3">
                  {t('About These Videos', 'Acerca de estos videos')}
                </h5>
                <p className="text-gray-400 text-sm">
                  {t(`Videos are fetched from YouTube using the search query "${youtubeQuery}". The system looks for:`,
                     `Los videos se obtienen de YouTube usando la búsqueda "${youtubeQuery}". El sistema busca:`)}
                </p>
                <ul className="text-gray-400 text-sm mt-2 list-disc list-inside">
                  <li>{t('Official match highlights', 'Destacados oficiales de partidos')}</li>
                  <li>{t('Goal compilations', 'Compilaciones de goles')}</li>
                  <li>{t('Historic moments and trophy celebrations', 'Momentos históricos y celebraciones de trofeos')}</li>
                  <li>{t('Player interviews and team features', 'Entrevistas a jugadores y reportajes del equipo')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Quality Notice */}
      {needsDataVerification({ players, teams, youtubeQuery: '' }) && (
        <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <div>
              <p className="text-yellow-300 text-sm">
                <span className="font-bold">
                  {t('Data Quality Notice:', 'Aviso de calidad de datos:')}
                </span> {t('Some information may require verification.',
                           'Alguna información puede requerir verificación.')}
              </p>
              <p className="text-yellow-200 text-xs mt-1">
                {t('AI-generated data is based on available sources and may contain inaccuracies.',
                   'Los datos generados por IA se basan en fuentes disponibles y pueden contener inexactitudes.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}