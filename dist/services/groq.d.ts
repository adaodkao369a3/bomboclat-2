export interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface GroqResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}
export declare function generateText(prompt: string, systemInstruction?: string): Promise<string | null>;
export declare function generateClipSummary(messages: Array<{
    author: string;
    content: string;
}>): Promise<{
    title: string;
    summary: string;
} | null>;
//# sourceMappingURL=groq.d.ts.map