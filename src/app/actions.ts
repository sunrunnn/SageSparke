'use server';

import { generate } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/google-genai';
import { Message } from '@/lib/types';
import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({
    text: z.string().optional(),
    media: z.object({
      contentType: z.string(),
      url: z.string(),
    }).optional(),
  })),
});

function toGenkitMessage(message: Message) {
    const content = [];
    if (message.content) {
        content.push({ text: message.content });
    }
    if (message.imageUrl) {
        content.push({ media: { contentType: 'image/png', url: message.imageUrl } });
    }
    return {
        role: message.role === 'assistant' ? 'model' : 'user',
        content,
    };
}

export async function generateResponse(messages: Message[]): Promise<string> {
    const history = messages.slice(0, -1).map(toGenkitMessage);
    const lastMessage = messages[messages.length - 1];
    const prompt = toGenkitMessage(lastMessage).content;

    try {
        const llmResponse = await generate({
            model: gemini15Flash,
            prompt,
            history,
            config: {
                // Add safety settings to be less restrictive if needed, e.g.:
                // safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }]
            }
        });
        return llmResponse.text;
    } catch (e: any) {
        console.error('Genkit Error:', e);
        return `Sorry, there was an error generating a response. Please check your API key setup. Error: ${e.message}`;
    }
}


export async function getConversationTitle(messages: Message[]): Promise<string> {
    const textMessages = messages.map(msg => ({ role: msg.role, content: msg.content }));

    try {
        const llmResponse = await generate({
            model: gemini15Flash,
            prompt: `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response. \n\nConversation:\n${textMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`
        });

        const text = llmResponse.text.replace(/"/g, "") || "New Chat";
        return text;

    } catch (error) {
        console.error("Failed to generate title with Genkit:", error);
        return "New Chat";
    }
}
