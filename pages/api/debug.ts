import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    message: 'Debug endpoint',
    tmdbKeyExists: !!process.env.TMDB_API_KEY,
    tmdbKeyValue: process.env.TMDB_API_KEY ? 
      `Loaded: ${process.env.TMDB_API_KEY.substring(0, 5)}...` : 
      'NOT LOADED',
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('TMDB') || key.includes('GROQ') || key.includes('YOUTUBE')
    )
  });
}