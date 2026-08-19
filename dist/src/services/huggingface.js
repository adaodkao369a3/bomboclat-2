"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImage = generateImage;
const index_js_1 = require("../config/index.js");
const DEFAULT_MODEL = 'black-forest-labs/FLUX.1-schnell';
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE = 2000; // 2 seconds
const REQUEST_TIMEOUT_SECONDS = 60;
async function generateImage(prompt, style = 'anime') {
    if (!index_js_1.HF_API_TOKEN) {
        console.error('HF_API_TOKEN is not set');
        return null;
    }
    // Style-specific prompt modifications
    const stylePrompts = {
        anime: 'anime style, vibrant colors, dynamic composition, cinematic lighting',
        jojos: 'JoJo style, dramatic poses, bold colors, manga aesthetic, stylized',
        ghibli: 'Studio Ghibli style, soft colors, peaceful atmosphere, hand-drawn aesthetic',
        jjk: 'Jujutsu Kaisen style, dark atmosphere, intense energy, modern anime aesthetic',
    };
    const stylePrompt = stylePrompts[style] || stylePrompts.anime;
    const fullPrompt = `${prompt}, ${stylePrompt}, landscape orientation, cinematic, high quality`;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        let timeoutId;
        try {
            console.log(`HF image: attempt ${attempt}/${MAX_RETRIES} (model=${DEFAULT_MODEL})`);
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_SECONDS * 1000);
            const response = await fetch(`https://router.huggingface.co/hf-inference/models/${DEFAULT_MODEL}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${index_js_1.HF_API_TOKEN}`,
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
            });
            if (!response.ok) {
                let errorBody = '';
                try {
                    errorBody = await response.text();
                    // Redact any potential tokens from error body
                    errorBody = errorBody.replace(/hf_[a-zA-Z0-9]{34}/g, 'hf_****');
                }
                catch (e) {
                    errorBody = '(unable to read error body)';
                }
                if (response.status === 401 || response.status === 403) {
                    console.error(`HF image: auth rejected (status=${response.status}, model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES}, error=${errorBody.substring(0, 200)})`);
                    return null;
                }
                if (response.status === 429) {
                    console.warn(`HF image: rate limited (status=${response.status}, model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES}, error=${errorBody.substring(0, 200)})`);
                    lastError = new Error(`Rate limited: ${response.status}`);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
                        continue;
                    }
                    return null;
                }
                if (response.status >= 500) {
                    console.warn(`HF image: server error (status=${response.status}, model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES}, error=${errorBody.substring(0, 200)})`);
                    lastError = new Error(`Server error: ${response.status}`);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
                        continue;
                    }
                    return null;
                }
                console.error(`HF image: generation failed (status=${response.status}, model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES}, error=${errorBody.substring(0, 200)})`);
                return null;
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length === 0) {
                console.error('HF image: API returned an empty image');
                return null;
            }
            console.log('HF image: generation complete');
            return buffer;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn(`HF image: request timed out (model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES})`);
                lastError = error;
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
                    continue;
                }
            }
            else {
                lastError = error instanceof Error ? error : new Error('Unknown network error');
                // Check if it's a DNS/connection error - don't retry these
                const errorMessage = lastError.message.toLowerCase();
                if (errorMessage.includes('enotfound') || errorMessage.includes('getaddrinfo') || errorMessage.includes('econnrefused')) {
                    console.error(`HF image: DNS/connection error (model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES}, error=${lastError.message}) - not retrying`);
                    return null;
                }
                console.warn(`HF image: network error (model=${DEFAULT_MODEL}, attempt=${attempt}/${MAX_RETRIES}, error=${lastError.message})`);
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_BASE * attempt));
                    continue;
                }
            }
        }
        finally {
            if (timeoutId)
                clearTimeout(timeoutId);
        }
    }
    console.error(`HF image: failed after ${MAX_RETRIES} attempts:`, lastError);
    return null;
}
//# sourceMappingURL=huggingface.js.map