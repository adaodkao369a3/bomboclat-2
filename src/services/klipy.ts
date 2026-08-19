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
    const url = new URL(KLIPY_URL);
    url.searchParams.append('q', query);
    url.searchParams.append('key', KLIPY_KEY);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Klipy API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json() as KlipyResponse;
    
    if (!data.data || data.data.length === 0) {
      console.log(`No GIFs found for query: ${query}`);
      return null;
    }
    
    // Return the first GIF URL
    return data.data[0].url;
  } catch (error) {
    console.error('Error fetching GIF from Klipy:', error);
    return null;
  }
}
