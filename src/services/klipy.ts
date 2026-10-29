import { KLIPY_KEY } from '../config/index.js';

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

    // Use the correct Klipy v1 API endpoint
    const url = `https://api.klipy.com/api/v1/${KLIPY_KEY}/gifs/search?q=${encodeURIComponent(query)}&per_page=10`;

    console.log(`Fetching GIF from Klipy for query: "${query}"`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Klipy API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();

    // Handle Klipy API response structure
    let results: any[] = [];

    if (data.data && Array.isArray(data.data)) {
      results = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      results = data.results;
    } else if (Array.isArray(data)) {
      results = data;
    }

    if (results.length === 0) {
      console.log(`No GIFs found for query: ${query}`);
      return null;
    }

    // Randomly select one result from the available results
    const randomIndex = Math.floor(Math.random() * results.length);
    const selectedResult = results[randomIndex];

    // Try to find URL in various possible structures from Klipy response
    const gifUrl = selectedResult.url ||
                   selectedResult.media?.url ||
                   selectedResult.media_formats?.gif?.url ||
                   selectedResult.images?.original?.url ||
                   selectedResult.item?.url;

    if (!gifUrl) {
      console.error(`Could not extract URL from GIF result at index ${randomIndex}:`, JSON.stringify(selectedResult, null, 2));
      return null;
    }

    console.log(`Successfully fetched GIF (random selection from ${results.length} results): ${gifUrl}`);
    return gifUrl;
  } catch (error) {
    console.error('Error fetching GIF from Klipy:', error);
    return null;
  }
}
