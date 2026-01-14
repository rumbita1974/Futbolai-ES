// services/playerImageService.ts
/**
 * Player Image Service - Fetches player photos from Wikipedia/Wikidata
 * No API key required, high coverage (~60-70% of players)
 */

interface ImageResult {
  url: string | null;
  source: 'wikipedia' | 'wikidata' | 'placeholder' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

// Cache for image URLs to avoid repeated fetches
const imageCache = new Map<string, ImageResult>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Clean cache periodically
const cleanImageCache = () => {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    // We don't have timestamps in cache, so we'll just keep cache until manual clear
    // or use a different approach
  }
};

// Known football player redirects/mappings
const PLAYER_NAME_MAPPINGS: Record<string, string> = {
  'kylian mbappé': 'Kylian Mbappé',
  'kylian mbappe': 'Kylian Mbappé',
  'vinícius júnior': 'Vinícius Júnior',
  'vinicius junior': 'Vinícius Júnior',
  'cristiano ronaldo': 'Cristiano Ronaldo',
  'lionel messi': 'Lionel Messi',
  'néymar': 'Neymar',
  'neymar jr': 'Neymar',
  'manuel neuer': 'Manuel Neuer',
  'robert lewandowski': 'Robert Lewandowski',
  'kevin de bruyne': 'Kevin De Bruyne',
  'virgil van dijk': 'Virgil van Dijk',
  'mohamed salah': 'Mohamed Salah',
  'harry kane': 'Harry Kane',
  'erling haaland': 'Erling Haaland',
  'toni kroos': 'Toni Kroos',
  'luka modrić': 'Luka Modrić',
  'luka modric': 'Luka Modrić',
  'antoine griezmann': 'Antoine Griezmann',
  'karim benzema': 'Karim Benzema',
  'ansu fati': 'Ansu Fati'
};

/**
 * Clean player name for Wikipedia search
 */
const cleanPlayerName = (playerName: string): string => {
  // Check for known mappings first
  const lowerName = playerName.toLowerCase();
  if (PLAYER_NAME_MAPPINGS[lowerName]) {
    return PLAYER_NAME_MAPPINGS[lowerName];
  }

  // Clean special characters and format for URL
  return playerName
    .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ\-']/g, '')
    .trim();
};

/**
 * Get player image from Wikipedia REST API
 * Fast (~300-500ms), covers ~60% of players
 */
export const getWikipediaPlayerImage = async (playerName: string): Promise<ImageResult> => {
  const cleanName = cleanPlayerName(playerName);
  const cacheKey = `wiki_${cleanName.toLowerCase()}`;
  
  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && cached.url) {
    console.log(`[Image Cache] Hit for ${playerName} (Wikipedia)`);
    return cached;
  }

  try {
    console.log(`[Image] Wikipedia fetch: ${cleanName}`);
    
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FutbolAI/1.0 (https://futbolai.org; contact@futbolai.org)'
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
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
      
      // Try with (footballer) suffix
      const footballerResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName + ' (footballer)')}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FutbolAI/1.0'
          },
          signal: AbortSignal.timeout(2000)
        }
      );
      
      if (footballerResponse.ok) {
        const footballerData = await footballerResponse.json();
        if (footballerData.thumbnail?.source) {
          const result: ImageResult = {
            url: footballerData.thumbnail.source,
            source: 'wikipedia',
            confidence: 'high'
          };
          
          imageCache.set(cacheKey, result);
          console.log(`[Image] Found via Wikipedia (footballer): ${playerName}`);
          return result;
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error(`[Image] Wikipedia error for ${playerName}:`, error.message || error);
    }
  }

  return { url: null, source: 'wikipedia', confidence: 'low' };
};

/**
 * Get player image from Wikidata using simpler search
 */
export const getWikidataPlayerImage = async (playerName: string): Promise<ImageResult> => {
  const cleanName = cleanPlayerName(playerName);
  const cacheKey = `wikidata_${cleanName.toLowerCase()}`;
  
  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && cached.url) {
    console.log(`[Image Cache] Hit for ${playerName} (Wikidata)`);
    return cached;
  }

  try {
    console.log(`[Image] Wikidata search: ${cleanName}`);
    
    // Try Wikimedia Commons search for football player
    const searchQuery = `${cleanName} football player`;
    const commonsSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json&origin=*`;
    
    const response = await fetch(commonsSearchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FutbolAI/1.0'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      const pages = data.query?.pages;
      
      if (pages) {
        // Find first image page
        const pageId = Object.keys(pages)[0];
        if (pageId && pages[pageId].imageinfo?.[0]?.thumburl) {
          const result: ImageResult = {
            url: pages[pageId].imageinfo[0].thumburl,
            source: 'wikidata',
            confidence: 'medium'
          };
          
          imageCache.set(cacheKey, result);
          console.log(`[Image] Found via Wikidata: ${playerName}`);
          return result;
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error(`[Image] Wikidata error for ${playerName}:`, error.message || error);
    }
  }

  return { url: null, source: 'wikidata', confidence: 'low' };
};

/**
 * Try Wikimedia API directly for specific known players
 */
const getKnownPlayerImage = (playerName: string): ImageResult | null => {
  const lowerName = playerName.toLowerCase();
  
  // Manual mappings for problematic players
  const knownImages: Record<string, string> = {
    'eder militao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%C3%89der_Milit%C3%A3o_2018.jpg/300px-%C3%89der_Milit%C3%A3o_2018.jpg',
    'eder militão': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%C3%89der_Milit%C3%A3o_2018.jpg/300px-%C3%89der_Milit%C3%A3o_2018.jpg',
    'éder militão': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%C3%89der_Milit%C3%A3o_2018.jpg/300px-%C3%89der_Milit%C3%A3o_2018.jpg',
    'éder gabriel militão': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%C3%89der_Milit%C3%A3o_2018.jpg/300px-%C3%89der_Milit%C3%A3o_2018.jpg',
    'ansu fati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Ansu_Fati_2021.jpg/300px-Ansu_Fati_2021.jpg'
  };

  for (const [key, url] of Object.entries(knownImages)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      console.log(`[Image] Using known image for: ${playerName}`);
      return {
        url,
        source: 'wikidata',
        confidence: 'high'
      };
    }
  }
  
  return null;
};

/**
 * Get UI Avatar as fallback
 */
const getUIAvatar = (playerName: string): ImageResult => {
  // Generate consistent color based on player name
  const hash = playerName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue = Math.abs(hash % 360);
  
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=hsl(${hue},70%,40%)&color=fff&size=300&bold=true&font-size=0.5&format=png`;
  
  return {
    url,
    source: 'fallback',
    confidence: 'low'
  };
};

/**
 * Get player image with fallback strategy
 * Try multiple sources with retry logic
 */
export const getPlayerImage = async (playerName: string): Promise<ImageResult> => {
  // Check cache first
  const cacheKey = `player_${playerName.toLowerCase()}`;
  const cached = imageCache.get(cacheKey);
  if (cached && cached.url) {
    return cached;
  }

  // Check known player images
  const knownImage = getKnownPlayerImage(playerName);
  if (knownImage) {
    imageCache.set(cacheKey, knownImage);
    return knownImage;
  }

  console.log(`[Image] Starting fetch for: ${playerName}`);
  
  // Strategy: Try Wikipedia first, then Wikidata, then fallback
  const strategies = [
    { name: 'Wikipedia', func: () => getWikipediaPlayerImage(playerName) },
    { name: 'Wikidata', func: () => getWikidataPlayerImage(playerName) }
  ];

  for (const strategy of strategies) {
    try {
      const result = await strategy.func();
      if (result.url) {
        // Cache successful result
        imageCache.set(cacheKey, result);
        console.log(`[Image] Success from ${strategy.name}: ${playerName}`);
        return result;
      }
    } catch (error) {
      console.log(`[Image] ${strategy.name} failed for ${playerName}:`, error.message || error);
      // Continue to next strategy
    }
  }

  // All failed, use UI Avatar
  console.log(`[Image] All strategies failed, using fallback for: ${playerName}`);
  const fallbackResult = getUIAvatar(playerName);
  imageCache.set(cacheKey, fallbackResult);
  
  return fallbackResult;
};

/**
 * Batch fetch player images with rate limiting
 * Fetches 3 players concurrently with delays
 */
export const getPlayerImages = async (playerNames: string[]): Promise<Map<string, ImageResult>> => {
  const results = new Map<string, ImageResult>();
  
  if (!playerNames.length) {
    return results;
  }

  console.log(`[Image] Starting batch fetch for ${playerNames.length} players`);
  
  // Process in chunks of 3 with delays
  const chunkSize = 3;
  const chunks: string[][] = [];
  
  for (let i = 0; i < playerNames.length; i += chunkSize) {
    chunks.push(playerNames.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[Image] Processing chunk ${i + 1}/${chunks.length}`);
    
    const chunkPromises = chunk.map(async (playerName, index) => {
      // Small delay between requests in same chunk
      await new Promise(resolve => setTimeout(resolve, index * 200));
      
      try {
        const result = await getPlayerImage(playerName);
        results.set(playerName, result);
      } catch (error) {
        console.error(`[Image] Error for ${playerName}:`, error);
        results.set(playerName, getUIAvatar(playerName));
      }
    });

    await Promise.all(chunkPromises);
    
    // Delay between chunks (except last one)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Image] Batch fetch complete. Success: ${Array.from(results.values()).filter(r => r.url && r.source !== 'fallback').length}/${playerNames.length}`);
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
  const entries = Array.from(imageCache.entries());
  
  const stats = {
    totalCached: entries.length,
    bySource: {
      wikipedia: entries.filter(([_, v]) => v.source === 'wikipedia').length,
      wikidata: entries.filter(([_, v]) => v.source === 'wikidata').length,
      placeholder: entries.filter(([_, v]) => v.source === 'placeholder').length,
      fallback: entries.filter(([_, v]) => v.source === 'fallback').length
    },
    byConfidence: {
      high: entries.filter(([_, v]) => v.confidence === 'high').length,
      medium: entries.filter(([_, v]) => v.confidence === 'medium').length,
      low: entries.filter(([_, v]) => v.confidence === 'low').length
    }
  };
  
  return stats;
};

/**
 * Pre-cache known player images
 */
export const preCachePlayerImages = async (playerNames: string[]) => {
  console.log(`[Image] Pre-caching ${playerNames.length} player images`);
  await getPlayerImages(playerNames);
};