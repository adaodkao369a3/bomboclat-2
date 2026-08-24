import { HF_API_TOKEN } from '../config/index.js';
import { InferenceClient } from '@huggingface/inference';

const CLIP_IMAGE_MODELS: Array<{ model: string; provider: 'fal-ai' }> = [
  {
    model: 'Qwen/Qwen-Image',
    provider: 'fal-ai',
  },
  {
    model: 'black-forest-labs/FLUX.1-schnell',
    provider: 'fal-ai',
  },
];

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

  // Explicitly steer the model toward illustrating the actual scene/events
  // described in the summary (multiple characters, action, setting) instead
  // of defaulting to a single centered character portrait.
  const fullPrompt = `Wide cinematic movie-still illustrating this exact scene: ${prompt}. Depict the specific characters, actions, and setting described above interacting together in a dynamic ensemble composition — this is a scene from a story, not a single centered character portrait. ${stylePrompt}, landscape orientation, cinematic, high quality`;

  const hf = new InferenceClient(HF_API_TOKEN);

  // Try each model/provider combination
  for (const candidate of CLIP_IMAGE_MODELS) {
    try {
      console.log(`[$clip] Attempting image generation (model=${candidate.model}, provider=${candidate.provider})`);

      const image = await hf.textToImage({
        model: candidate.model,
        provider: candidate.provider,
        inputs: fullPrompt,
        parameters: {
          width: 1024,
          height: 576,
        },
      });

      // The SDK may return a Blob or base64 string, handle both
      let buffer: Buffer;
      
      if (typeof image === 'string') {
        // Handle base64 string response
        buffer = Buffer.from(image, 'base64');
      } else {
        // Handle Blob response
        const arrayBuffer = await (image as Blob).arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      if (buffer.length === 0) {
        console.warn(`[$clip] Image generation returned empty buffer (model=${candidate.model}, provider=${candidate.provider})`);
        continue;
      }

      console.log(`[$clip] Image generation successful (model=${candidate.model}, provider=${candidate.provider})`);
      return buffer;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[$clip] Image generation failed (model=${candidate.model}, provider=${candidate.provider}, error=${errorMessage.substring(0, 200)})`);
      // Continue to next candidate
    }
  }

  console.error('[$clip] All image generation attempts failed, publishing summary without artwork');
  return null;
}
