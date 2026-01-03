/**
 * YouTube Service for fetching football highlights
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  error?: string;
}

/**
 * Search YouTube for football highlights
 */
export const searchYouTubeHighlights = async (
  query: string,
  apiKey: string,
  maxResults: number = 3
): Promise<YouTubeSearchResult> => {
  if (!apiKey) {
    return {
      videos: [],
      error: 'YouTube API key is missing. Please check your .env.local file.'
    };
  }

  if (!query) {
    return {
      videos: [],
      error: 'Search query is required.'
    };
  }

  try {
    // Add "football highlights" to the query for better results
    const searchQuery = `${query} football highlights`;
    
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    const videos: YouTubeVideo[] = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt
    }));

    return { videos };

  } catch (error: any) {
    console.error('YouTube API error:', error);
    return {
      videos: [],
      error: `Failed to fetch YouTube videos: ${error.message || 'Unknown error'}`
    };
  }
};

/**
 * Get video duration (requires separate API call)
 */
export const getVideoDuration = async (
  videoId: string,
  apiKey: string
): Promise<string | null> => {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.items[0]?.contentDetails?.duration || null;
  } catch (error) {
    console.error('Error fetching video duration:', error);
    return null;
  }
};

export default {
  searchYouTubeHighlights,
  getVideoDuration
};