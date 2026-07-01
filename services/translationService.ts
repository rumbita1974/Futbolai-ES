// services/translationService.ts
'use client';

// Hard-coded translations for Spanish version
const TEAM_TRANSLATIONS = {
  // Club teams
  'Real Madrid': { es: 'Real Madrid' },
  'Barcelona': { es: 'Barcelona' },
  'FC Barcelona': { es: 'FC Barcelona' },
  'Atlético Madrid': { es: 'Atlético Madrid' },
  'Manchester City': { es: 'Manchester City' },
  'Liverpool': { es: 'Liverpool' },
  'Bayern Munich': { es: 'Bayern de Múnich' },
  'Paris Saint-Germain': { es: 'Paris Saint-Germain' },
  'Juventus': { es: 'Juventus' },
  'AC Milan': { es: 'AC Milan' },
  'Inter Milan': { es: 'Inter de Milán' },
  'Arsenal': { es: 'Arsenal' },
  'Chelsea': { es: 'Chelsea' },
  'Manchester United': { es: 'Manchester United' },
  'Tottenham': { es: 'Tottenham' },
  'Borussia Dortmund': { es: 'Borussia Dortmund' },
  'Ajax': { es: 'Ajax' },
  'Porto': { es: 'Porto' },
  'Benfica': { es: 'Benfica' },
  'Sporting CP': { es: 'Sporting de Lisboa' },
  'Olympique Lyonnais': { es: 'Olympique de Lyon' },
  'Olympique Marseille': { es: 'Olympique de Marsella' },
  'Monaco': { es: 'Mónaco' },
  'Lille': { es: 'Lille' },
  'Nice': { es: 'Niza' },
  'Lens': { es: 'Lens' },
  'Rennes': { es: 'Rennes' },
  'Napoli': { es: 'Nápoles' },
  'Roma': { es: 'Roma' },
  'Lazio': { es: 'Lazio' },
  'Atalanta': { es: 'Atalanta' },
  'Fiorentina': { es: 'Fiorentina' },
  'Torino': { es: 'Turín' },
  'Bologna': { es: 'Bolonia' },
  'Sevilla': { es: 'Sevilla' },
  'Valencia': { es: 'Valencia' },
  'Villarreal': { es: 'Villarreal' },
  'Real Sociedad': { es: 'Real Sociedad' },
  'Real Betis': { es: 'Real Betis' },
  'Athletic Bilbao': { es: 'Athletic Club' },
  'Girona': { es: 'Girona' },
  'Celta Vigo': { es: 'Celta de Vigo' },
  'Getafe': { es: 'Getafe' },
  'Mallorca': { es: 'Mallorca' },
  'Osasuna': { es: 'Osasuna' },
  'Rayo Vallecano': { es: 'Rayo Vallecano' },
  'Alavés': { es: 'Alavés' },
  'Las Palmas': { es: 'Las Palmas' },
  
  // National teams
  'France': { es: 'Francia' },
  'Argentina': { es: 'Argentina' },
  'Brazil': { es: 'Brasil' },
  'England': { es: 'Inglaterra' },
  'Germany': { es: 'Alemania' },
  'Spain': { es: 'España' },
  'Italy': { es: 'Italia' },
  'Portugal': { es: 'Portugal' },
  'Netherlands': { es: 'Países Bajos' },
  'Belgium': { es: 'Bélgica' },
  'Croatia': { es: 'Croacia' },
  'Switzerland': { es: 'Suiza' },
  'Denmark': { es: 'Dinamarca' },
  'Sweden': { es: 'Suecia' },
  'Norway': { es: 'Noruega' },
  'Poland': { es: 'Polonia' },
  'Austria': { es: 'Austria' },
  'Turkey': { es: 'Turquía' },
  'Türkiye': { es: 'Turquía' },
  'Scotland': { es: 'Escocia' },
  'Wales': { es: 'Gales' },
  'Northern Ireland': { es: 'Irlanda del Norte' },
  'Republic of Ireland': { es: 'Irlanda' },
  'Mexico': { es: 'México' },
  'USA': { es: 'Estados Unidos' },
  'Canada': { es: 'Canadá' },
  'Colombia': { es: 'Colombia' },
  'Chile': { es: 'Chile' },
  'Uruguay': { es: 'Uruguay' },
  'Paraguay': { es: 'Paraguay' },
  'Ecuador': { es: 'Ecuador' },
  'Peru': { es: 'Perú' },
  'Venezuela': { es: 'Venezuela' },
  'Bolivia': { es: 'Bolivia' },
  'Costa Rica': { es: 'Costa Rica' },
  'Panama': { es: 'Panamá' },
  'Honduras': { es: 'Honduras' },
  'El Salvador': { es: 'El Salvador' },
  'Jamaica': { es: 'Jamaica' },
  'Haiti': { es: 'Haití' },
  'Japan': { es: 'Japón' },
  'South Korea': { es: 'Corea del Sur' },
  'Korea Republic': { es: 'Corea del Sur' },
  'Australia': { es: 'Australia' },
  'New Zealand': { es: 'Nueva Zelanda' },
  'Saudi Arabia': { es: 'Arabia Saudita' },
  'Iran': { es: 'Irán' },
  'Qatar': { es: 'Catar' },
  'Iraq': { es: 'Irak' },
  'Uzbekistan': { es: 'Uzbekistán' },
  'Jordan': { es: 'Jordania' },
  'Morocco': { es: 'Marruecos' },
  'Algeria': { es: 'Argelia' },
  'Tunisia': { es: 'Túnez' },
  'Egypt': { es: 'Egipto' },
  'Senegal': { es: 'Senegal' },
  'Nigeria': { es: 'Nigeria' },
  'Ghana': { es: 'Ghana' },
  'Ivory Coast': { es: 'Costa de Marfil' },
  'Côte d\'Ivoire': { es: 'Costa de Marfil' },
  'Cameroon': { es: 'Camerún' },
  'South Africa': { es: 'Sudáfrica' },
  'Czechia': { es: 'República Checa' },
  'Czech Republic': { es: 'República Checa' },
  'Slovakia': { es: 'Eslovaquia' },
  'Hungary': { es: 'Hungría' },
  'Romania': { es: 'Rumania' },
  'Bulgaria': { es: 'Bulgaria' },
  'Serbia': { es: 'Serbia' },
  'Slovenia': { es: 'Eslovenia' },
  'Bosnia and Herzegovina': { es: 'Bosnia y Herzegovina' },
  'Bosnia & Herzegovina': { es: 'Bosnia y Herzegovina' },
  'North Macedonia': { es: 'Macedonia del Norte' },
  'Albania': { es: 'Albania' },
  'Greece': { es: 'Grecia' },
  'Israel': { es: 'Israel' },
  'Finland': { es: 'Finlandia' },
  'Iceland': { es: 'Islandia' },
  'Faroe Islands': { es: 'Islas Feroe' },
  'Cabo Verde': { es: 'Cabo Verde' },
  'Cape Verde': { es: 'Cabo Verde' },
  'Curaçao': { es: 'Curazao' },
  'Congo DR': { es: 'República Democrática del Congo' },
  'DR Congo': { es: 'República Democrática del Congo' },
  
  // Positions
  'Goalkeeper': { es: 'Portero' },
  'Defender': { es: 'Defensa' },
  'Midfielder': { es: 'Centrocampista' },
  'Forward': { es: 'Delantero' },
  'Striker': { es: 'Delantero centro' },
  'Winger': { es: 'Extremo' },
  'Center Back': { es: 'Defensa central' },
  'Full Back': { es: 'Lateral' },
  'Central Midfielder': { es: 'Mediocentro' },
  'Attacking Midfielder': { es: 'Mediocentro ofensivo' },
  'Defensive Midfielder': { es: 'Mediocentro defensivo' },
  'Right Back': { es: 'Lateral derecho' },
  'Left Back': { es: 'Lateral izquierdo' },
  'Right Midfielder': { es: 'Centrocampista derecho' },
  'Left Midfielder': { es: 'Centrocampista izquierdo' },
  'Right Winger': { es: 'Extremo derecho' },
  'Left Winger': { es: 'Extremo izquierdo' },
  'Centre-Forward': { es: 'Delantero centro' },
  'Second Striker': { es: 'Segundo delantero' },
  'Defensive Midfield': { es: 'Mediocentro defensivo' }
};

const ACHIEVEMENT_TRANSLATIONS = {
  'UEFA Champions League': { es: 'Liga de Campeones de la UEFA' },
  'UEFA Europa League': { es: 'Liga Europa de la UEFA' },
  'UEFA Europa Conference League': { es: 'Liga Conferencia de la UEFA' },
  'Premier League': { es: 'Premier League' },
  'La Liga': { es: 'La Liga' },
  'Bundesliga': { es: 'Bundesliga' },
  'Serie A': { es: 'Serie A' },
  'Ligue 1': { es: 'Ligue 1' },
  'Eredivisie': { es: 'Eredivisie' },
  'Primeira Liga': { es: 'Primeira Liga' },
  'Liga MX': { es: 'Liga MX' },
  'Brasileirão': { es: 'Brasileirão' },
  'Copa Libertadores': { es: 'Copa Libertadores' },
  'Copa Sudamericana': { es: 'Copa Sudamericana' },
  'FIFA World Cup': { es: 'Copa Mundial de la FIFA' },
  'Copa América': { es: 'Copa América' },
  'UEFA European Championship': { es: 'Eurocopa' },
  'FA Cup': { es: 'FA Cup' },
  'Copa del Rey': { es: 'Copa del Rey' },
  'DFB-Pokal': { es: 'Copa de Alemania' },
  'Coppa Italia': { es: 'Copa de Italia' },
  'Coupe de France': { es: 'Copa de Francia' },
  'Taça de Portugal': { es: 'Copa de Portugal' },
  'FIFA Club World Cup': { es: 'Mundial de Clubes de la FIFA' },
  'UEFA Nations League': { es: 'Liga de Naciones de la UEFA' },
  'CONCACAF Gold Cup': { es: 'Copa Oro de la CONCACAF' },
  'AFC Asian Cup': { es: 'Copa Asiática de la AFC' },
  'Africa Cup of Nations': { es: 'Copa Africana de Naciones' },
  'OFC Nations Cup': { es: 'Copa de Naciones de la OFC' }
};

// Common translation keys used across the app
const COMMON_TRANSLATIONS: { [key: string]: { en: string; es: string } } = {
  'worldCup.refreshNow': { en: 'Refresh Now', es: 'Actualizar ahora' },
  'worldCup.refreshData': { en: 'Refresh Data', es: 'Actualizar datos' },
  'worldCup.errorLoading': { en: 'Error Loading Data', es: 'Error al cargar datos' },
  'worldCup.loadingFixtures': { en: 'Loading fixtures...', es: 'Cargando partidos...' },
  'worldCup.noData': { en: 'No Data Available', es: 'No hay datos disponibles' },
  'worldCup.failedToLoad': { en: 'Failed to load World Cup data', es: 'Error al cargar los datos del Mundial' },
  'worldCup.fixturesTitle': { en: 'Group Stage Fixtures', es: 'Partidos de la Fase de Grupos' },
  'worldCup.fixturesDescription': { en: 'Official match schedule with venues and dates', es: 'Calendario oficial con sedes y fechas' },
  'worldCup.selectGroup': { en: 'Select Group', es: 'Seleccionar Grupo' },
  'worldCup.tapHint': { en: 'Tap on team cards to search for players and get detailed stats.', es: 'Toca en las tarjetas de los equipos para buscar jugadores y ver estadísticas detalladas.' },
  'worldCup.tapHintShort': { en: 'Tap to search', es: 'Toca para buscar' },
  'worldCup.team': { en: 'Team', es: 'Equipo' },
  'worldCup.searchPlayers': { en: 'Search players', es: 'Buscar jugadores' },
  'worldCup.groupHint': { en: 'Searching players from this group? Use the "Back to Group A" button on the results page.', es: '¿Buscas jugadores de este grupo? Usa el botón "Volver al Grupo A" en la página de resultados.' },
  'worldCup.date': { en: 'Date', es: 'Fecha' },
  'worldCup.match': { en: 'Match', es: 'Partido' },
  'worldCup.venue': { en: 'Venue', es: 'Sede' },
  'worldCup.status': { en: 'Status', es: 'Estado' },
  'worldCup.scheduled': { en: 'Scheduled', es: 'Programado' },
  'worldCup.notPlayed': { en: 'Not played yet', es: 'No jugado aún' },
  'worldCup.totalMatches': { en: 'Total matches in Group {group}', es: 'Total de partidos en el Grupo {group}' },
  'worldCup.tournamentStarts': { en: 'Tournament starts', es: 'El torneo comienza' },
  'worldCup.viewAPI': { en: 'View API Data', es: 'Ver datos de la API' },
  'worldCup.backToSearch': { en: 'Back to Search', es: 'Volver a la búsqueda' },
  'common.retry': { en: 'Retry', es: 'Reintentar' },
  'common.tryAgain': { en: 'Try Again', es: 'Intentar de nuevo' },
  'common.unknownError': { en: 'An unknown error occurred', es: 'Ocurrió un error desconocido' },
  'common.tip': { en: 'Tip', es: 'Consejo' }
};

// Placeholder teams that shouldn't be translated
const PLACEHOLDER_TEAMS = ['W101', 'W102', 'L101', 'L102', 'W99', 'W100', 'W97', 'W98', 'W95', 'W96', 'W91', 'W92', 'W93', 'W94', 'W89', 'W90', 'W85', 'W87', 'W86', 'W88', 'W81', 'W82', 'W83', 'W84', 'W79', 'W80', 'Winner 101', 'Winner 102', 'Loser 101', 'Loser 102'];

export const translateTeamData = (data: any, language: string): any => {
  if (language === 'en' || !data) return data;
  
  const translated = JSON.parse(JSON.stringify(data));
  
  // Translate team names
  if (translated.teams && Array.isArray(translated.teams)) {
    translated.teams.forEach((team: any) => {
      if (team.name && TEAM_TRANSLATIONS[team.name]?.[language]) {
        team.name = TEAM_TRANSLATIONS[team.name][language];
      }
      
      // Translate country names
      if (team.country && TEAM_TRANSLATIONS[team.country]?.[language]) {
        team.country = TEAM_TRANSLATIONS[team.country][language];
      }
    });
  }
  
  // Translate player positions
  if (translated.players && Array.isArray(translated.players)) {
    translated.players.forEach((player: any) => {
      if (player.position && TEAM_TRANSLATIONS[player.position]?.[language]) {
        player.position = TEAM_TRANSLATIONS[player.position][language];
      }
      
      if (player.nationality && TEAM_TRANSLATIONS[player.nationality]?.[language]) {
        player.nationality = TEAM_TRANSLATIONS[player.nationality][language];
      }
      
      if (player.currentTeam && TEAM_TRANSLATIONS[player.currentTeam]?.[language]) {
        player.currentTeam = TEAM_TRANSLATIONS[player.currentTeam][language];
      }
    });
  }
  
  // Translate achievements
  if (translated.teams?.[0]?.majorAchievements) {
    const achievements = translated.teams[0].majorAchievements;
    
    const translateAchievements = (achievementList: string[]) => {
      if (!achievementList || !Array.isArray(achievementList)) return achievementList;
      
      return achievementList.map((achievement: string) => {
        let translated = achievement;
        
        Object.keys(ACHIEVEMENT_TRANSLATIONS).forEach(key => {
          if (achievement.includes(key) && ACHIEVEMENT_TRANSLATIONS[key]?.[language]) {
            translated = translated.replace(key, ACHIEVEMENT_TRANSLATIONS[key][language]);
          }
        });
        
        return translated;
      });
    };
    
    if (achievements.worldCup) {
      achievements.worldCup = translateAchievements(achievements.worldCup);
    }
    
    if (achievements.international) {
      achievements.international = translateAchievements(achievements.international);
    }
    
    if (achievements.continental) {
      achievements.continental = translateAchievements(achievements.continental);
    }
    
    if (achievements.domestic) {
      achievements.domestic = translateAchievements(achievements.domestic);
    }
  }
  
  return translated;
};

// Get translation for common keys
export const getTranslation = (key: string, language: string): string => {
  return COMMON_TRANSLATIONS[key]?.[language as 'en' | 'es'] || key;
};

// Check if a team name is a placeholder
export const isPlaceholderTeam = (teamName: string): boolean => {
  if (!teamName) return true;
  if (PLACEHOLDER_TEAMS.includes(teamName)) return true;
  if (teamName.includes('Winner')) return true;
  if (teamName.includes('Loser')) return true;
  if (teamName.match(/^[W|L]\d{3}$/)) return true;
  if (teamName.match(/^\d+[A-Z]/)) return true;
  if (teamName.includes('/')) return true;
  return false;
};