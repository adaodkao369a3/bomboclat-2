import { HF_API_TOKEN } from '../config/index.js';

const DEFAULT_MODEL = 'black-forest-labs/FLUX.1-schnell';
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE = 2000; // 2 seconds
const REQUEST_TIMEOUT_SECONDS = 60;

export async function generateImage(prompt: string, style: string = 'anime'): Promise<Buffer | null> {
  if (!HF_API_TOKEN) {
    console.error('HF_API_TOKEN is not set');
    return null;
  }

  // Style-specific prompt modifications
  const stylePrompts: Record<string, string> = {
    anime: 'anime style, vibrant colors, dynamic composition, cinematic lighting',
    jojos: 'JoJo style, dramatic poses, bold colors, manga aesthetic, stylized',
    ghibli: 'Studio Ghibli style, soft colors, peaceful atmosphere, hand-drawn aesthetic',
    jjk: 'Jujutsu Kaisen style, dark atmosphere, intense energy, modern anime aesthetic',
  };

  const stylePrompt = stylePrompts[style] || stylePrompts.anime;
  const fullPrompt = `${prompt}, ${stylePrompt}, landscape orientation, cinematic, high quality`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      console.log(`HF image: attempt ${attempt}/${MAX_RETRIES} (model=${DEFAULT_MODEL})`);

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_SECONDS * 1000);

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${DEFAULT_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
              width: 1024,
              height: 576,
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error(`HF image: auth rejected (${response.status})`);
          return null;
        }
        if (response.status === 429) {
          console.warn(`HF image: rate limited (attempt ${attempt}/${MAX_RETRIES})`);
          lastError = new Error(`Rate limited: ${response.status}`);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
            continue;
          }
          return null;
        }
        if (response.status >= 500) {
          console.warn(`HF image: server error ${response.status} (attempt ${attempt}/${MAX_RETRIES})`);
          lastError = new Error(`Server error: ${response.status}`);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
            continue;
          }
          return null;
        }
        console.error(`HF image: generation failed (${response.status})`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) {
        console.error('HF image: API returned an empty image');
        return null;
      }
      console.log('HF image: generation complete');
      return buffer;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`HF image: request timed out (attempt ${attempt}/${MAX_RETRIES})`);
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
          continue;
        }
      } else {
        lastError = error instanceof Error ? error : new Error('Unknown network error');
        console.warn(`HF image: network error (attempt ${attempt}/${MAX_RETRIES}):`, lastError.message);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
          continue;
        }
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  console.error(`HF image: failed after ${MAX_RETRIES} attempts:`, lastError);
  return null;
}
