// utils/i18n.js
'use client';

// Complete translations for the app
const translations = {
  en: {
    homepage: {
      title: "FutbolAI Explorer",
      subtitle: "AI-powered football intelligence with detailed stats, achievements, and video highlights",
      playerSearch: "Player Search",
      teamSearch: "Team Search",
      searchPlaceholderPlayer: "Search for a player (e.g., Lionel Messi)...",
      searchPlaceholderTeam: "Search for a team (e.g., Real Madrid)...",
      searchButton: "Search",
      searching: "Searching...",
      tryExamples: "Try these examples:",
      featuresTitle: "Explore Football Intelligence",
      worldCupTitle: "World Cup 2026",
      worldCupDesc: "Official schedule, groups, and match information for the upcoming tournament",
      viewSchedule: "View Schedule →",
      analyticsTitle: "Detailed Analytics",
      analyticsDesc: "Player stats, team achievements, career summaries, and performance metrics",
      searchAbove: "Search Above ↑",
      videosTitle: "Video Highlights",
      videosDesc: "AI-curated YouTube highlights for every player and team search result",
      trySearch: "Try a Search ↑",
      dataCoverage: "Football Data Coverage",
      players: "Players",
      teams: "Teams",
      leagues: "Leagues",
      countries: "Countries",
      quickAccess: "Quick Access",
      worldCupSchedule: "World Cup Schedule",
      apiData: "API Data",
      playerDatabase: "Player Database",
      teamAnalysis: "Team Analysis",
      footerNote: "FutbolAI Explorer • AI-powered football intelligence platform",
      dataSource: "Data is powered by GROQ AI with llama-3.1-8b-instant model. Video highlights from YouTube API.",
      copyright: "© {year} FutbolAI Explorer • All football data and videos are property of their respective owners",
      fromGroup: "Viewing players from Group",
      groupBack: "You came from World Cup 2026 Group Stage",
      backToGroup: "Back to Group",
      aiAnalysis: "AI Analysis",
      detailedStats: "Detailed Stats",
      achievements: "Achievements",
      videoHighlights: "Video Highlights",
      searchError: "Search Error",
      dismissError: "Dismiss error",
      analyzing: "Analyzing football data...",
      fetching: "Fetching stats, achievements, and highlights"
    },
    nav: {
      home: "Home",
      worldCup: "World Cup 2026",
      matches: "Matches",
      players: "Players",
      teams: "Teams",
      highlights: "Highlights",
      search: "Search",
      aiInsights: "AI Insights"
    },
    header: {
      title: "FutbolAI Explorer",
      subtitle: "AI-Powered Football Intelligence Platform",
      searchPlaceholder: "Search players, teams, matches...",
      welcome: "Welcome to FutbolAI"
    },
    common: {
      loading: "Loading...",
      error: "Error",
      readMore: "Read more",
      viewDetails: "View details",
      close: "Close",
      select: "Select"
    },
    language: {
      english: "English",
      spanish: "Spanish",
      switchTo: "Switch to"
    }
  },
  es: {
    homepage: {
      title: "FutbolAI Explorer",
      subtitle: "Inteligencia de fútbol con IA con estadísticas detalladas, logros y vídeos destacados",
      playerSearch: "Búsqueda de Jugadores",
      teamSearch: "Búsqueda de Equipos",
      searchPlaceholderPlayer: "Busca un jugador (ej: Lionel Messi)...",
      searchPlaceholderTeam: "Busca un equipo (ej: Real Madrid)...",
      searchButton: "Buscar",
      searching: "Buscando...",
      tryExamples: "Prueba estos ejemplos:",
      featuresTitle: "Explora la Inteligencia del Fútbol",
      worldCupTitle: "Copa del Mundo 2026",
      worldCupDesc: "Calendario oficial, grupos e información de partidos del próximo torneo",
      viewSchedule: "Ver Calendario →",
      analyticsTitle: "Análisis Detallado",
      analyticsDesc: "Estadísticas de jugadores, logros de equipos, resúmenes de carrera y métricas de rendimiento",
      searchAbove: "Buscar Arriba ↑",
      videosTitle: "Vídeos Destacados",
      videosDesc: "Vídeos destacados de YouTube seleccionados por IA para cada jugador y equipo",
      trySearch: "Prueba una Búsqueda ↑",
      dataCoverage: "Cobertura de Datos de Fútbol",
      players: "Jugadores",
      teams: "Equipos",
      leagues: "Ligas",
      countries: "Países",
      quickAccess: "Acceso Rápido",
      worldCupSchedule: "Calendario del Mundial",
      apiData: "Datos API",
      playerDatabase: "Base de Datos",
      teamAnalysis: "Análisis de Equipos",
      footerNote: "FutbolAI Explorer • Plataforma de inteligencia de fútbol con IA",
      dataSource: "Datos potenciados por GROQ AI con modelo llama-3.1-8b-instant. Vídeos destacados de YouTube API.",
      copyright: "© {year} FutbolAI Explorer • Todos los datos y vídeos de fútbol son propiedad de sus respectivos dueños",
      fromGroup: "Viendo jugadores del Grupo",
      groupBack: "Viniste desde la Fase de Grupos de la Copa del Mundo 2026",
      backToGroup: "Volver al Grupo",
      aiAnalysis: "Análisis IA",
      detailedStats: "Estadísticas",
      achievements: "Logros",
      videoHighlights: "Vídeos Destacados",
      searchError: "Error de Búsqueda",
      dismissError: "Descartar error",
      analyzing: "Analizando datos de fútbol...",
      fetching: "Obteniendo estadísticas, logros y destacados"
    },
    nav: {
      home: "Inicio",
      worldCup: "Copa del Mundo 2026",
      matches: "Partidos",
      players: "Jugadores",
      teams: "Equipos",
      highlights: "Destacados",
      search: "Buscar",
      aiInsights: "Perspectivas IA"
    },
    header: {
      title: "FutbolAI Explorer",
      subtitle: "Plataforma de Inteligencia de Fútbol con IA",
      searchPlaceholder: "Buscar jugadores, equipos, partidos...",
      welcome: "Bienvenido a FutbolAI"
    },
    common: {
      loading: "Cargando...",
      error: "Error",
      readMore: "Leer más",
      viewDetails: "Ver detalles",
      close: "Cerrar",
      select: "Seleccionar"
    },
    language: {
      english: "Inglés",
      spanish: "Español",
      switchTo: "Cambiar a"
    }
  }
};

export function getTranslations(lang = 'en') {
  return translations[lang] || translations.en;
}

export function t(key, lang = 'en') {
  const keys = key.split('.');
  let value = translations[lang] || translations.en;
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation key "${key}" not found for language "${lang}"`);
      return key;
    }
  }
  
  return value || key;
}