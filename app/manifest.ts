import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FutbolAI Explorer - AI-Powered Football Intelligence',
    short_name: 'FutbolAI',
    description: 'AI-powered football intelligence with detailed stats, achievements, and video highlights for World Cup 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1a2e',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['sports', 'entertainment', 'technology'],
    lang: 'en',
    dir: 'ltr',
    orientation: 'portrait',
  };
}