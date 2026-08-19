"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateText = generateText;
exports.generateClipSummary = generateClipSummary;
const index_js_1 = require("../config/index.js");
const REQUEST_TIMEOUT_SECONDS = 60;
function isGroqResponse(value) {
    if (!value || typeof value !== 'object' || !('choices' in value))
        return false;
    const choices = value.choices;
    if (!Array.isArray(choices) || choices.length === 0)
        return false;
    const firstChoice = choices[0];
    if (!firstChoice || typeof firstChoice !== 'object' || !('message' in firstChoice))
        return false;
    const message = firstChoice.message;
    return (!!message &&
        typeof message === 'object' &&
        'content' in message &&
        typeof message.content === 'string');
}
async function generateText(prompt, systemInstruction) {
    if (!index_js_1.GROQ_API_KEY) {
        console.error('GROQ_API_KEY is not set');
        return null;
    }
    const messages = [];
    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_SECONDS * 1000);
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${index_js_1.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: index_js_1.GROQ_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048,
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            console.error(`Groq API error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        if (isGroqResponse(data)) {
            const content = data.choices[0].message.content.trim();
            if (content)
                return content;
        }
        return null;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('Groq request timed out');
        }
        else {
            console.error('Error generating text with Groq:', error instanceof Error ? error.message : 'unknown error');
        }
        return null;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
async function generateClipSummary(messages) {
    const messageText = messages.map(msg => `${msg.author}: ${msg.content}`).join('\n');
    const prompt = `Based on these Discord messages, create a funny summary for MI BOMBO Studios.

Messages:
${messageText}

Focus on:
- Funniest moments and memorable jokes
- Running jokes and community memes
- Unexpected events or chaotic moments
- Notable arguments or dramatic interactions
- "Main character" moments

Ignore:
- Private conversations
- Generic chatting
- Boring filler

Return a JSON object with these exact fields:
{
  "title": "A catchy, dramatic title (e.g., 'CHAOS ON SET', 'THE GREAT MELTDOWN')",
  "summary": "2-3 dramatic sentences capturing the most memorable events"
}

Make it entertaining and dramatic. Return ONLY valid JSON, no markdown or extra text.`;
    const response = await generateText(prompt);
    if (!response)
        return null;
    try {
        const parsed = JSON.parse(response);
        if (!parsed || typeof parsed !== 'object')
            return null;
        const title = 'title' in parsed && typeof parsed.title === 'string' ? parsed.title.trim() : '';
        const summary = 'summary' in parsed && typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
        if (!title || !summary || title.length > 256 || summary.length > 4096) {
            console.error('Groq response did not contain a valid clip title and summary');
            return null;
        }
        return {
            title,
            summary,
        };
    }
    catch (error) {
        console.error('Failed to parse Groq response as JSON:', error);
        return null;
    }
}
//# sourceMappingURL=groq.js.map