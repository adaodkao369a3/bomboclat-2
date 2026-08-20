import { KLIPY_KEY, KLIPY_URL } from '../config/index.js';

export interface KlipyResponse {
  data: Array<{
    url: string;
    title: string;
    // ... other fields
  }>;
}

export async function fetchGIF(query: string): Promise<string | null> {
  try {
    if (!KLIPY_KEY) {
      console.error('KLIPY_KEY is not configured');
      return null;
    }

    const url = new URL(KLIPY_URL);
    url.searchParams.append('q', query);
    url.searchParams.append('key', KLIPY_KEY);
    
    console.log(`Fetching GIF from Klipy: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Klipy API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data: any = await response.json();
    console.log(`Klipy API response for query "${query}":`, JSON.stringify(data, null, 2));
    
    // Handle different possible response structures
    let results: any[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      results = data.data;
    } else if (Array.isArray(data)) {
      results = data;
    } else if (data.results && Array.isArray(data.results)) {
      results = data.results;
    } else if (data.gifs && Array.isArray(data.gifs)) {
      results = data.gifs;
    }
    
    if (results.length === 0) {
      console.log(`No GIFs found for query: ${query}`);
      return null;
    }
    
    // Try to find URL in various possible structures
    const firstResult = results[0];
    const gifUrl = firstResult.url || firstResult.gif?.url || firstResult.media?.url || firstResult.images?.original?.url;
    
    if (!gifUrl) {
      console.error(`Could not extract URL from GIF result:`, JSON.stringify(firstResult, null, 2));
      return null;
    }
    
    console.log(`Successfully fetched GIF: ${gifUrl}`);
    return gifUrl;
  } catch (error) {
    console.error('Error fetching GIF from Klipy:', error);
    return null;
  }
}
