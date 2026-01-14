/**
 * Player Image Service - Fetches player photos from Wikipedia/Wikidata
 * No API key required, high coverage (~60-70% of players)
 */

interface ImageResult {
  url: string | null;
  source: 'wikipedia' | 'wikidata' | 'placeholder';
  confidence: 'high' | 'medium' | 'low';
}

// Cache for image URLs to avoid repeated fetches
const imageCache = new Map<string, ImageResult>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get player image from Wikipedia
 * Fast (~300-500ms), covers ~60% of players
 */
export const getWikipediaPlayerImage = async (playerName: string): Promise<ImageResult> => {
  const cacheKey = `wiki_${playerName.toLowerCase()}`;
  const cached = imageCache.get(cacheKey);
  
  if (cached) {
    console.log(`[Image Cache] Hit for ${playerName} (Wikipedia)`);
    return cached;
  }

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(playerName)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FutbolAI/1.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      if (data.thumbnail?.source) {
        const result: ImageResult = {
          url: data.thumbnail.source,
          source: 'wikipedia',
          confidence: 'high'
        };
        
        imageCache.set(cacheKey, result);
        console.log(`[Image] Found via Wikipedia: ${playerName}`);
        return result;
      }
    }
  } catch (error) {
    console.error(`[Image] Wikipedia error for ${playerName}:`, error);
  }

  return { url: null, source: 'wikipedia', confidence: 'low' };
};

/**
 * Get player image from Wikidata
 * Slower (~800ms-1.5s) but covers ~50% of players
 */
export const getWikidataPlayerImage = async (playerName: string): Promise<ImageResult> => {
  const cacheKey = `wikidata_${playerName.toLowerCase()}`;
  const cached = imageCache.get(cacheKey);
  
  if (cached) {
    console.log(`[Image Cache] Hit for ${playerName} (Wikidata)`);
    return cached;
  }

  try {
    // Use SPARQL query to find player image
    const sparqlQuery = `
      SELECT ?image WHERE {
        ?player ?label "${playerName}"@en ;
                wdt:P18 ?image .
        FILTER(REGEX(STR(?image), "commons.wikimedia.org"))
      }
      LIMIT 1
    `;

    const response = await fetch('https://query.wikidata.org/sparql?format=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FutbolAI/1.0'
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.results?.bindings?.[0]?.image?.value) {
        const imageUrl = data.results.bindings[0].image.value;
        // Convert Wikimedia URL to image URL
        const filename = imageUrl.split('/').pop();
        const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=300`;
        
        const result: ImageResult = {
          url: url,
          source: 'wikidata',
          confidence: 'high'
        };
        
        imageCache.set(cacheKey, result);
        console.log(`[Image] Found via Wikidata: ${playerName}`);
        return result;
      }
    }
  } catch (error) {
    console.error(`[Image] Wikidata error for ${playerName}:`, error);
  }

  return { url: null, source: 'wikidata', confidence: 'low' };
};

/**
 * Get player image with fallback strategy
 * Try Wikipedia first (fast), then Wikidata (thorough), then placeholder
 */
export const getPlayerImage = async (playerName: string): Promise<ImageResult> => {
  // Try Wikipedia first (fastest)
  let result = await getWikipediaPlayerImage(playerName);
  if (result.url) {
    return result;
  }

  // Try Wikidata as fallback (slower but more thorough)
  result = await getWikidataPlayerImage(playerName);
  if (result.url) {
    return result;
  }

  // Return placeholder
  const placeholder: ImageResult = {
    url: '/images/player-placeholder.png',
    source: 'placeholder',
    confidence: 'low'
  };
  
  console.log(`[Image] No image found, using placeholder for: ${playerName}`);
  return placeholder;
};

/**
 * Batch fetch player images with rate limiting
 * Fetches 2 players concurrently to avoid overwhelming APIs
 */
export const getPlayerImages = async (playerNames: string[]): Promise<Map<string, ImageResult>> => {
  const results = new Map<string, ImageResult>();
  
  // Chunk array into groups of 2
  const chunks: string[][] = [];
  for (let i = 0; i < playerNames.length; i += 2) {
    chunks.push(playerNames.slice(i, i + 2));
  }

  console.log(`[Image] Fetching images for ${playerNames.length} players in ${chunks.length} batches`);
  
  for (const chunk of chunks) {
    const promises = chunk.map(name => 
      getPlayerImage(name)
        .then(result => results.set(name, result))
        .catch(error => {
          console.error(`[Image] Error fetching ${name}:`, error);
          results.set(name, {
            url: '/images/player-placeholder.png',
            source: 'placeholder',
            confidence: 'low'
          });
        })
    );
    
    await Promise.all(promises);
    
    // Add small delay between batches to be respectful to APIs
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

/**
 * Clear image cache
 */
export const clearPlayerImageCache = () => {
  imageCache.clear();
  console.log('[Image] Cache cleared');
};

/**
 * Get cache statistics
 */
export const getPlayerImageCacheStats = () => {
  return {
    cachedPlayers: imageCache.size,
    entries: Array.from(imageCache.entries()).map(([key, value]) => ({
      playerName: key,
      source: value.source,
      confidence: value.confidence
    }))
  };
};
