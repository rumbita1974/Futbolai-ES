// services/translationService.ts
'use client';

// Hard-coded translations for Spanish version
const TEAM_TRANSLATIONS = {
  // Team names
  'Real Madrid': { es: 'Real Madrid' },
  'Barcelona': { es: 'Barcelona' },
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
  'Defensive Midfielder': { es: 'Mediocentro defensivo' }
};

const ACHIEVEMENT_TRANSLATIONS = {
  'UEFA Champions League': { es: 'Liga de Campeones de la UEFA' },
  'UEFA Europa League': { es: 'Liga Europa de la UEFA' },
  'Premier League': { es: 'Premier League' },
  'La Liga': { es: 'La Liga' },
  'Bundesliga': { es: 'Bundesliga' },
  'Serie A': { es: 'Serie A' },
  'Ligue 1': { es: 'Ligue 1' },
  'FIFA World Cup': { es: 'Copa Mundial de la FIFA' },
  'Copa América': { es: 'Copa América' },
  'UEFA European Championship': { es: 'Eurocopa' },
  'FA Cup': { es: 'FA Cup' },
  'Copa del Rey': { es: 'Copa del Rey' },
  'DFB-Pokal': { es: 'DFB-Pokal' },
  'Coppa Italia': { es: 'Coppa Italia' }
};

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
      return achievementList.map((achievement: string) => {
        let translated = achievement;
        
        Object.keys(ACHIEVEMENT_TRANSLATIONS).forEach(key => {
          if (achievement.includes(key) && ACHIEVEMENT_TRANSLATIONS[key]?.[language]) {
            translated = achievement.replace(key, ACHIEVEMENT_TRANSLATIONS[key][language]);
          }
        });
        
        return translated;
      });
    };
    
    if (achievements.worldCup) {
      achievements.worldCup = translateAchievements(achievements.worldCup);
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