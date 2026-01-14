/**
 * Hook to fetch player images with batching and caching
 * Usage: const { images, loading } = usePlayerImages(players)
 */

'use client';

import { useEffect, useState } from 'react';
import { Player } from '@/services/groqService';
import { getPlayerImages } from '@/services/playerImageService';

interface PlayerImageMap {
  [playerName: string]: string | null;
}

export const usePlayerImages = (players: Player[]) => {
  const [images, setImages] = useState<PlayerImageMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!players || players.length === 0) {
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const playerNames = players.map(p => p.name);
        console.log(`[usePlayerImages] Fetching images for ${playerNames.length} players`);
        
        const imageResults = await getPlayerImages(playerNames);
        
        // Convert results to simple URL map
        const imageMap: PlayerImageMap = {};
        imageResults.forEach((result, playerName) => {
          imageMap[playerName] = result.url || '/images/player-placeholder.png';
        });
        
        setImages(imageMap);
        console.log(`[usePlayerImages] Fetched ${imageResults.size} images`);
      } catch (err) {
        console.error('[usePlayerImages] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
        
        // Set placeholders on error
        const placeholderMap: PlayerImageMap = {};
        players.forEach(player => {
          placeholderMap[player.name] = '/images/player-placeholder.png';
        });
        setImages(placeholderMap);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [players]);

  return { images, loading, error };
};

/**
 * Hook to get a single player image
 */
export const usePlayerImage = (playerName: string | null) => {
  const [imageUrl, setImageUrl] = useState<string>('/images/player-placeholder.png');
  const [loading, setLoading] = useState(!!playerName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName) {
      setImageUrl('/images/player-placeholder.png');
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const imageResults = await getPlayerImages([playerName]);
        const result = imageResults.get(playerName);
        
        setImageUrl(result?.url || '/images/player-placeholder.png');
      } catch (err) {
        console.error('[usePlayerImage] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch image');
        setImageUrl('/images/player-placeholder.png');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [playerName]);

  return { imageUrl, loading, error };
};
