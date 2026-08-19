"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateText = generateText;
exports.generateClipSummary = generateClipSummary;
const index_js_1 = require("../config/index.js");
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
        });
        if (!response.ok) {
            console.error(`Groq API error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message.content) {
            return data.choices[0].message.content.trim();
        }
        return null;
    }
    catch (error) {
        console.error('Error generating text with Groq:', error);
        return null;
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
        return {
            title: parsed.title || 'Untitled',
            summary: parsed.summary || 'No summary available',
        };
    }
    catch (error) {
        console.error('Failed to parse Groq response as JSON:', error);
        return null;
    }
}
//# sourceMappingURL=groq.js.map