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
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231a1a2e" width="192" height="192"/><circle cx="96" cy="96" r="80" fill="%232563eb"/><text x="96" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">⚽</text></svg>',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="%231a1a2e" width="512" height="512"/><circle cx="256" cy="256" r="220" fill="%232563eb"/><text x="256" y="330" font-size="220" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">⚽</text></svg>',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['sports', 'entertainment', 'technology'],
    lang: 'en',
    dir: 'ltr',
    orientation: 'portrait',
  };
}