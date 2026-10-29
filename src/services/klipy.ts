import { KLIPY_KEY } from '../config/index.js';

export interface KlipyResponse {
  result?: boolean;
  data: {
    data: Array<{
      id?: number | string;
      slug?: string;
      title?: string;
      file?: Record<string, Record<string, { url?: string }>>;
    }>;
  };
}

// Pull the best GIF url out of a Klipy item (file.<size>.gif.url)
function extractGifUrl(item: any): string | null {
  const file = item?.file;
  if (file) {
    for (const size of ['hd', 'md', 'sm', 'xs']) {
      const u = file[size]?.gif?.url;
      if (u) return u;
    }
    if (file.gif?.url) return file.gif.url;
  }
  // Legacy/fallback shapes
  return (
    item?.media_formats?.gif?.url ||
    item?.images?.original?.url ||
    item?.media?.url ||
    item?.item?.url ||
    null
  );
}

export async function fetchGIF(query: string): Promise<string | null> {
  try {
    if (!KLIPY_KEY) {
      console.error('KLIPY_KEY is not configured');
      return null;
    }

    const url =
      `https://api.klipy.com/api/v1/${KLIPY_KEY}/gifs/search` +
      `?q=${encodeURIComponent(query)}&per_page=10&customer_id=bomboclat&content_filter=medium`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Klipy API error: ${response.status} ${response.statusText} (query: "${query}")`);
      return null;
    }

    const data: any = await response.json();

    // Klipy nests the list: { data: { data: [...] } }. Handle flatter shapes too.
    let results: any[] = [];
    if (Array.isArray(data?.data?.data)) {
      results = data.data.data;
    } else if (Array.isArray(data?.data)) {
      results = data.data;
    } else if (Array.isArray(data?.results)) {
      results = data.results;
    } else if (Array.isArray(data)) {
      results = data;
    }

    if (results.length === 0) {
      console.log(
        `No GIFs found for query: "${query}" (response keys: ${Object.keys(data ?? {}).join(', ')})`
      );
      return null;
    }

    // Pick randomly, but only among results that actually have a usable URL
    const usable = results.map(extractGifUrl).filter((u): u is string => !!u);
    if (usable.length === 0) {
      console.error(
        `Could not extract a GIF URL for "${query}". Sample item keys: ${Object.keys(results[0] ?? {}).join(', ')}`
      );
      return null;
    }

    return usable[Math.floor(Math.random() * usable.length)];
  } catch (error) {
    console.error('Error fetching GIF from Klipy:', error);
    return null;
  }
}