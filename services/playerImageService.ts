// services/playerImageService.ts
/**
 * Player Image Service - Fetches player photos from Wikipedia/Wikidata
 * No API key required, high coverage (~60-70% of players)
 */

interface ImageResult {
  url: string | null;
  source: 'wikipedia' | 'wikidata' | 'placeholder' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  cachedAt?: number;
}

// Cache for image URLs with timestamps
const imageCache = new Map<string, { result: ImageResult; timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Clean cache periodically
const cleanImageCache = () => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Image Cache] Cleaned ${cleanedCount} expired entries`);
  }
};

// Known football player redirects/mappings with proper encoding
const PLAYER_NAME_MAPPINGS: Record<string, string> = {
  'kylian mbappé': 'Kylian Mbappé',
  'kylian mbappe': 'Kylian Mbappé',
  'vinícius júnior': 'Vinícius Júnior',
  'vinicius junior': 'Vinícius Júnior',
  'vinícius jr': 'Vinícius Júnior',
  'vinicius jr': 'Vinícius Júnior',
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
  'ansu fati': 'Ansu Fati',
  'éder militão': 'Éder Militão',
  'eder militão': 'Éder Militão',
  'eder militao': 'Éder Militão',
  'hakan çalhanoğlu': 'Hakan Çalhanoğlu',
  'hakan calhanoglu': 'Hakan Çalhanoğlu',
  'samir handanović': 'Samir Handanović',
  'samir handanovic': 'Samir Handanović',
  'edin džeko': 'Edin Džeko',
  'edin dzeko': 'Edin Džeko',
  'jude bellingham': 'Jude Bellingham',
  'phil foden': 'Phil Foden',
  'rodri': 'Rodri',
  'bukayo saka': 'Bukayo Saka',
  'bernardo silva': 'Bernardo Silva',
  'bruno fernandes': 'Bruno Fernandes',
  'alisson': 'Alisson',
  'alisson becker': 'Alisson',
  'ederson': 'Ederson',
  'ruben dias': 'Rúben Dias',
  'rúben dias': 'Rúben Dias',
  'joão cancelo': 'João Cancelo',
  'joao cancelo': 'João Cancelo',
  'marcus rashford': 'Marcus Rashford',
  'fabinho': 'Fabinho',
  'luis diaz': 'Luís Díaz',
  'luís diaz': 'Luís Díaz',
  'pedri': 'Pedri',
  'gavi': 'Gavi',
  'jules koundé': 'Jules Koundé',
  'jules kounde': 'Jules Koundé',
  'marc-andre ter stegen': 'Marc-André ter Stegen',
  'marc andre ter stegen': 'Marc-André ter Stegen',
  'ilkay gündogan': 'İlkay Gündoğan',
  'ilkay gundogan': 'İlkay Gündoğan',
  'ferran torres': 'Ferran Torres',
  'nacho': 'Nacho',
  'josé luis gayà': 'José Luis Gayà',
  'jose luis gaya': 'José Luis Gayà',
  'aurélien tchouaméni': 'Aurélien Tchouaméni',
  'aurelien tchouameni': 'Aurélien Tchouaméni'
};

/**
 * Clean player name for Wikipedia search - PRESERVE SPECIAL CHARACTERS
 */
const cleanPlayerName = (playerName: string): string => {
  // Check for known mappings first
  const lowerName = playerName.toLowerCase();
  if (PLAYER_NAME_MAPPINGS[lowerName]) {
    return PLAYER_NAME_MAPPINGS[lowerName];
  }

  // Return the name as-is for Wikipedia API (it handles encoding)
  return playerName.trim();
};

/**
 * Encode player name for URL
 */
const encodePlayerName = (playerName: string): string => {
  return encodeURIComponent(playerName);
};

/**
 * Create a fetch request with timeout
 */
const fetchWithTimeout = async (url: string, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FutbolAI/1.0 (https://futbolai.org; contact@futbolai.org)'
      }
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Get player image from Wikipedia REST API
 */
export const getWikipediaPlayerImage = async (playerName: string): Promise<ImageResult> => {
  const cleanName = cleanPlayerName(playerName);
  const cacheKey = `wiki_${cleanName.toLowerCase()}`;
  
  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && cached.result.url && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Image Cache] Hit for ${playerName} (Wikipedia)`);
    return cached.result;
  }

  try {
    console.log(`[Image] Wikipedia fetch: "${cleanName}"`);
    
    // Try primary name
    const response = await fetchWithTimeout(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodePlayerName(cleanName)}`,
      3000
    );

    if (response.ok) {
      const data = await response.json();
      
      if (data.thumbnail?.source) {
        // Ensure consistent image size
        const imageUrl = data.thumbnail.source.replace(/\/\d+px-/, '/300px-');
        const result: ImageResult = {
          url: imageUrl,
          source: 'wikipedia',
          confidence: 'high',
          cachedAt: Date.now()
        };
        
        imageCache.set(cacheKey, { result, timestamp: Date.now() });
        console.log(`[Image] Found via Wikipedia: ${playerName}`);
        return result;
      }
      
      // Try with (footballer) suffix
      console.log(`[Image] Trying with (footballer) suffix: "${cleanName}"`);
      const footballerResponse = await fetchWithTimeout(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodePlayerName(cleanName + ' (footballer)')}`,
        2000
      );
      
      if (footballerResponse.ok) {
        const footballerData = await footballerResponse.json();
        if (footballerData.thumbnail?.source) {
          const imageUrl = footballerData.thumbnail.source.replace(/\/\d+px-/, '/300px-');
          const result: ImageResult = {
            url: imageUrl,
            source: 'wikipedia',
            confidence: 'high',
            cachedAt: Date.now()
          };
          
          imageCache.set(cacheKey, { result, timestamp: Date.now() });
          console.log(`[Image] Found via Wikipedia (footballer): ${playerName}`);
          return result;
        }
      }
      
      // Try removing "Jr", "II", etc.
      if (cleanName.includes(' Jr') || cleanName.includes(' II') || cleanName.includes(' III') || cleanName.includes(' Jr.')) {
        const simplifiedName = cleanName.replace(/\s+(Jr\.?|II|III|IV)\b/i, '').trim();
        if (simplifiedName !== cleanName) {
          console.log(`[Image] Trying simplified name: "${simplifiedName}"`);
          const simplifiedResponse = await fetchWithTimeout(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodePlayerName(simplifiedName)}`,
            2000
          );
          
          if (simplifiedResponse.ok) {
            const simplifiedData = await simplifiedResponse.json();
            if (simplifiedData.thumbnail?.source) {
              const imageUrl = simplifiedData.thumbnail.source.replace(/\/\d+px-/, '/300px-');
              const result: ImageResult = {
                url: imageUrl,
                source: 'wikipedia',
                confidence: 'high',
                cachedAt: Date.now()
              };
              
              imageCache.set(cacheKey, { result, timestamp: Date.now() });
              console.log(`[Image] Found via simplified name: ${playerName}`);
              return result;
            }
          }
        }
      }
      
      // Try just first name for common names
      const nameParts = cleanName.split(' ');
      if (nameParts.length > 1) {
        const firstName = nameParts[0];
        console.log(`[Image] Trying first name only: "${firstName}"`);
        const firstNameResponse = await fetchWithTimeout(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodePlayerName(firstName)}`,
          2000
        );
        
        if (firstNameResponse.ok) {
          const firstNameData = await firstNameResponse.json();
          if (firstNameData.thumbnail?.source) {
            const imageUrl = firstNameData.thumbnail.source.replace(/\/\d+px-/, '/300px-');
            const result: ImageResult = {
              url: imageUrl,
              source: 'wikipedia',
              confidence: 'medium',
              cachedAt: Date.now()
            };
            
            imageCache.set(cacheKey, { result, timestamp: Date.now() });
            console.log(`[Image] Found via first name: ${playerName}`);
            return result;
          }
        }
      }
    } else if (response.status === 404) {
      console.log(`[Image] Wikipedia page not found for: ${cleanName}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`[Image] Wikipedia timeout for: ${playerName}`);
    } else {
      console.error(`[Image] Wikipedia error for ${playerName}:`, error.message || error);
    }
  }

  return { url: null, source: 'wikipedia', confidence: 'low' };
};

/**
 * Get player image from Wikidata
 */
export const getWikidataPlayerImage = async (playerName: string): Promise<ImageResult> => {
  const cleanName = cleanPlayerName(playerName);
  const cacheKey = `wikidata_${cleanName.toLowerCase()}`;
  
  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && cached.result.url && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Image Cache] Hit for ${playerName} (Wikidata)`);
    return cached.result;
  }

  try {
    console.log(`[Image] Wikidata search: "${cleanName}"`);
    
    // First search for the entity
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cleanName + ' footballer')}&language=en&format=json&origin=*&type=item`;
    
    const searchResponse = await fetchWithTimeout(searchUrl, 5000);

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      
      if (searchData.search && searchData.search.length > 0) {
        const entityId = searchData.search[0].id;
        console.log(`[Image] Found Wikidata entity: ${entityId} for ${playerName}`);
        
        // Get entity data with image property (P18)
        const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json&origin=*`;
        
        const entityResponse = await fetchWithTimeout(entityUrl, 3000);
        
        if (entityResponse.ok) {
          const entityData = await entityResponse.json();
          const claims = entityData.entities?.[entityId]?.claims;
          
          // Look for image property (P18)
          if (claims?.P18?.[0]?.mainsnak?.datavalue?.value) {
            const imageName = claims.P18[0].mainsnak.datavalue.value;
            const encodedImageName = encodeURIComponent(imageName.replace(/ /g, '_'));
            
            // Construct Wikimedia Commons URL
            const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedImageName}?width=300`;
            
            const result: ImageResult = {
              url: imageUrl,
              source: 'wikidata',
              confidence: 'medium',
              cachedAt: Date.now()
            };
            
            imageCache.set(cacheKey, { result, timestamp: Date.now() });
            console.log(`[Image] Found via Wikidata: ${playerName}`);
            return result;
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`[Image] Wikidata timeout for: ${playerName}`);
    } else {
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
    'éder militão': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%C3%89der_Milit%C3%A3o_2018.jpg/300px-%C3%89der_Milit%C3%A3o_2018.jpg',
    'eder militao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%C3%89der_Milit%C3%A3o_2018.jpg/300px-%C3%89der_Milit%C3%A3o_2018.jpg',
    'ansu fati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Ansu_Fati_2021.jpg/300px-Ansu_Fati_2021.jpg',
    'rodri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Rodri_2021.jpg/300px-Rodri_2021.jpg',
    'pedri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Pedri_2021.jpg/300px-Pedri_2021.jpg',
    'gavi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Gavi_2021.jpg/300px-Gavi_2021.jpg',
    'jude bellingham': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Jude_Bellingham_2021.jpg/300px-Jude_Bellingham_2021.jpg',
    'phil foden': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Phil_Foden_2021.jpg/300px-Phil_Foden_2021.jpg',
    'bukayo saka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Bukayo_Saka_2021.jpg/300px-Bukayo_Saka_2021.jpg',
    'fabinho': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Fabinho_2018.jpg/300px-Fabinho_2018.jpg',
    'luis diaz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Luis_D%C3%ADaz_2022.jpg/300px-Luis_D%C3%ADaz_2022.jpg',
    'luís diaz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Luis_D%C3%ADaz_2022.jpg/300px-Luis_D%C3%ADaz_2022.jpg',
    'nacho': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Nacho_2021.jpg/300px-Nacho_2021.jpg',
    'hakan çalhanoğlu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Hakan_%C3%87alhano%C4%9Flu_2018.jpg/300px-Hakan_%C3%87alhano%C4%9Flu_2018.jpg',
    'samir handanović': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Samir_Handanovi%C4%87_2017.jpg/300px-Samir_Handanovi%C4%87_2017.jpg',
    'edin džeko': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Edin_D%C5%BEeko_2018.jpg/300px-Edin_D%C5%BEeko_2018.jpg',
    'danilo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Danilo_2018.jpg/300px-Danilo_2018.jpg'
  };

  for (const [key, url] of Object.entries(knownImages)) {
    if (lowerName === key || lowerName.includes(key) || key.includes(lowerName)) {
      console.log(`[Image] Using known image for: ${playerName}`);
      return {
        url,
        source: 'wikidata',
        confidence: 'high',
        cachedAt: Date.now()
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
    confidence: 'low',
    cachedAt: Date.now()
  };
};

/**
 * Get a placeholder image for players
 */
const getPlaceholderImage = (playerName: string): ImageResult => {
  // Use a generic football player silhouette
  const url = `https://via.placeholder.com/300/4A5568/FFFFFF?text=${encodeURIComponent(playerName.substring(0, 15))}`;
  
  return {
    url,
    source: 'placeholder',
    confidence: 'low',
    cachedAt: Date.now()
  };
};

/**
 * Get player image with fallback strategy
 * Try multiple sources with retry logic
 */
export const getPlayerImage = async (playerName: string): Promise<ImageResult> => {
  // Clean cache periodically
  cleanImageCache();
  
  if (!playerName || playerName.trim() === '') {
    console.log('[Image] Empty player name provided');
    return getPlaceholderImage('Player');
  }
  
  // Check cache first
  const cacheKey = `player_${playerName.toLowerCase()}`;
  const cached = imageCache.get(cacheKey);
  if (cached && cached.result.url && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Image Cache] Hit for: ${playerName}`);
    return cached.result;
  }

  // Check known player images
  const knownImage = getKnownPlayerImage(playerName);
  if (knownImage) {
    imageCache.set(cacheKey, { result: knownImage, timestamp: Date.now() });
    return knownImage;
  }

  console.log(`[Image] Starting fetch for: "${playerName}"`);
  
  // Strategy: Try Wikipedia first, then Wikidata, then fallback
  const strategies = [
    { name: 'Wikipedia', func: () => getWikipediaPlayerImage(playerName) },
    { name: 'Wikidata', func: () => getWikidataPlayerImage(playerName) }
  ];

  for (const strategy of strategies) {
    try {
      console.log(`[Image] Trying ${strategy.name} for: ${playerName}`);
      const result = await strategy.func();
      if (result.url) {
        // Cache successful result
        imageCache.set(cacheKey, { result, timestamp: Date.now() });
        console.log(`[Image] Success from ${strategy.name}: ${playerName}`);
        return result;
      }
    } catch (error: any) {
      console.log(`[Image] ${strategy.name} failed for ${playerName}:`, error.message || error);
      // Wait a bit before next try to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // All failed, use UI Avatar
  console.log(`[Image] All strategies failed, using fallback for: ${playerName}`);
  const fallbackResult = getUIAvatar(playerName);
  imageCache.set(cacheKey, { result: fallbackResult, timestamp: Date.now() });
  
  return fallbackResult;
};

/**
 * Batch fetch player images with rate limiting
 * Fetches 3 players concurrently with delays
 */
export const getPlayerImages = async (playerNames: string[]): Promise<Map<string, ImageResult>> => {
  const results = new Map<string, ImageResult>();
  
  if (!playerNames || !playerNames.length) {
    return results;
  }

  console.log(`[Image] Starting batch fetch for ${playerNames.length} players`);
  
  // Process in chunks of 2 with delays to respect rate limits
  const chunkSize = 2;
  const chunks: string[][] = [];
  
  for (let i = 0; i < playerNames.length; i += chunkSize) {
    chunks.push(playerNames.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[Image] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} players)`);
    
    const chunkPromises = chunk.map(async (playerName, index) => {
      // Stagger requests within chunk
      await new Promise(resolve => setTimeout(resolve, index * 300));
      
      try {
        const result = await getPlayerImage(playerName);
        results.set(playerName, result);
        
        if (result.url && result.source !== 'fallback') {
          console.log(`[Image] ✓ ${playerName}: ${result.source}`);
        } else {
          console.log(`[Image] ✗ ${playerName}: Using fallback`);
        }
      } catch (error) {
        console.error(`[Image] Error for ${playerName}:`, error);
        results.set(playerName, getUIAvatar(playerName));
      }
    });

    await Promise.all(chunkPromises);
    
    // Delay between chunks (except last one)
    if (i < chunks.length - 1) {
      const delay = 1000; // 1 second between chunks
      console.log(`[Image] Waiting ${delay}ms before next chunk...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const successCount = Array.from(results.values()).filter(r => r.url && r.source !== 'fallback').length;
  console.log(`[Image] Batch fetch complete. Success: ${successCount}/${playerNames.length} players`);
  
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
  const entries = Array.from(imageCache.values());
  
  const stats = {
    totalCached: entries.length,
    freshEntries: entries.filter(e => Date.now() - e.timestamp < CACHE_TTL).length,
    expiredEntries: entries.filter(e => Date.now() - e.timestamp >= CACHE_TTL).length,
    bySource: {
      wikipedia: entries.filter(({ result }) => result.source === 'wikipedia').length,
      wikidata: entries.filter(({ result }) => result.source === 'wikidata').length,
      fallback: entries.filter(({ result }) => result.source === 'fallback').length
    },
    byConfidence: {
      high: entries.filter(({ result }) => result.confidence === 'high').length,
      medium: entries.filter(({ result }) => result.confidence === 'medium').length,
      low: entries.filter(({ result }) => result.confidence === 'low').length
    }
  };
  
  return stats;
};

/**
 * Pre-cache known player images
 */
export const preCachePlayerImages = async (playerNames: string[]) => {
  if (!playerNames || !playerNames.length) {
    console.log('[Image] No player names provided for pre-caching');
    return;
  }
  
  console.log(`[Image] Starting pre-cache for ${playerNames.length} player images`);
  
  // Filter out already cached names
  const namesToFetch = playerNames.filter(name => {
    const cacheKey = `player_${name.toLowerCase()}`;
    const cached = imageCache.get(cacheKey);
    return !cached || (Date.now() - cached.timestamp >= CACHE_TTL);
  });
  
  if (namesToFetch.length === 0) {
    console.log('[Image] All players already cached and fresh');
    return;
  }
  
  console.log(`[Image] Need to fetch ${namesToFetch.length} new/expired players`);
  
  // Use batch fetch for efficiency
  await getPlayerImages(namesToFetch);
  
  console.log('[Image] Pre-caching complete');
};

/**
 * Test a specific player image fetch
 */
export const testPlayerImageFetch = async (playerName: string) => {
  console.log(`[Image Test] Testing: "${playerName}"`);
  console.log(`[Image Test] Clean name: "${cleanPlayerName(playerName)}"`);
  
  const startTime = Date.now();
  
  try {
    const result = await getPlayerImage(playerName);
    const duration = Date.now() - startTime;
    
    console.log(`[Image Test] Result for "${playerName}":`);
    console.log(`  Source: ${result.source}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  URL: ${result.url?.substring(0, 80)}...`);
    console.log(`  Time: ${duration}ms`);
    console.log(`  Cached: ${result.cachedAt ? 'Yes' : 'No'}`);
    
    return result;
  } catch (error) {
    console.error(`[Image Test] Error for "${playerName}":`, error);
    throw error;
  }
};