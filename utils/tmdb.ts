import axios from "axios";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY;

export async function searchMovies(query: string) {
  const res = await axios.get(
    `https://api.themoviedb.org/3/search/movie`,
    {
      params: {
        api_key: TMDB_KEY,
        query,
        include_adult: false,
      },
    }
  );
  return res.data.results;
}

export function getPosterUrl(path: string, size: string = "w500") {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
