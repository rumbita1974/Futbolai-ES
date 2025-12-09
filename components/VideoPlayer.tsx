'use client'

import { useState, useEffect } from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

export default function VideoPlayer({ url, title = "Football Highlights" }: VideoPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if URL is a valid YouTube embed URL
  const isValidYouTubeUrl = url && url.startsWith('https://www.youtube.com/embed/');

  // Extract video ID for fallback
  const getVideoId = (url: string) => {
    try {
      const match = url.match(/embed\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const videoId = getVideoId(url);
  
  // Fallback URL using YouTube nocookie domain (more privacy-friendly)
  const fallbackUrl = videoId 
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
    : 'https://www.youtube.com/embed/dZqkf1ZnQh4';

  const handleIframeError = () => {
    console.log('❌ Iframe failed to load, using fallback');
    setUseFallback(true);
    setError('Video failed to load. Trying alternative player...');
  };

  // Reset state when URL changes
  useEffect(() => {
    setUseFallback(false);
    setError(null);
  }, [url]);

  if (!url || !isValidYouTubeUrl) {
    return (
      <div style={{
        width: '100%',
        paddingBottom: '56.25%',
        position: 'relative',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '2px solid rgba(239, 68, 68, 0.5)',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
          color: '#ef4444',
        }}>
          <div style={{ fontSize: '2rem' }}>❌</div>
          <p>Invalid video URL</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {error && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          color: '#fca5a5',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}
      
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '2px solid rgba(74, 222, 128, 0.5)',
      }}>
        <iframe
          key={useFallback ? fallbackUrl : url}
          src={useFallback ? fallbackUrl : url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          onError={handleIframeError}
        />
      </div>
      
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '0.5rem',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        fontSize: '0.75rem',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}>
        <span>💡</span>
        <span>If video doesn't load, try refreshing or clicking the YouTube logo</span>
      </div>
    </div>
  );
}