// services/internationalService.ts - NEW FILE
export const fetchInternationalNews = async () => {
  const tournaments = [
    { name: 'Copa América', year: 2024, next: 2028 },
    { name: 'UEFA Nations League', year: 2025, next: 2027 },
    { name: 'UEFA Euro Cup', year: 2024, next: 2028 },
    { name: 'Africa Cup of Nations', year: 2025, next: 2027 },
    { name: 'Asian Cup', year: 2023, next: 2027 }
  ];

  // Use GROQ to get latest news about each tournament
  return await Promise.all(
    tournaments.map(async (tournament) => {
      const news = await fetchTournamentNews(tournament.name);
      return {
        competition: tournament.name,
        latestResult: `Last: ${tournament.year}, Next: ${tournament.next}`,
        news: news.items || [`${tournament.name} updates coming soon`]
      };
    })
  );
};