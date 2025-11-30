'use server';

import OpenAI from 'openai';
import type { Message } from '@/lib/types';

// Initialize the OpenAI client with the API key and custom base URL from environment variables.
// The custom base URL is necessary for using OpenAI-compatible services like OpenRouter.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE, 
});

// This function converts the application's message format to the format expected by the OpenAI API.
function toOpenAIMessage(message: Message): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    let content: (OpenAI.Chat.Completions.ChatCompletionContentPartText | OpenAI.Chat.Completions.ChatCompletionContentPartImage)[] = [];
    
    if (message.content) {
        content.push({ type: 'text', text: message.content });
    }

    if (message.imageUrl) {
        // The vision model expects the image URL in a specific format.
        content.push({ type: 'image_url', image_url: { url: message.imageUrl } });
    }

    return {
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: content,
    };
}

export async function generateResponse(messages: Message[]): Promise<string> {
    // The history is all messages except the last one.
    const history = messages.slice(0, -1).map(toOpenAIMessage);
    const lastMessage = messages[messages.length - 1];

    try {
        const llmResponse = await openai.chat.completions.create({
            model: 'openai/gpt-4o', // Using a standard, reliable model
            messages: [...history, toOpenAIMessage(lastMessage)],
        });
        return llmResponse.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (e: any) {
        console.error('OpenAI API Error:', e);
        return `Sorry, there was an error generating a response. Please check your API key setup. Error: ${e.message}`;
    }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
    const textMessages = messages.filter(msg => msg.content).map(msg => `${msg.role}: ${msg.content}`).join('\n');

    try {
        const llmResponse = await openai.chat.completions.create({
            model: 'openai/gpt-4o', // Using a standard, reliable model
            messages: [
                {
                    role: 'system',
                    content: `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response.`
                },
                {
                    role: 'user',
                    content: textMessages
                }
            ]
        });

        const title = llmResponse.choices[0]?.message?.content?.replace(/"/g, "") || "New Chat";
        return title;

    } catch (error) {
        console.error("Failed to generate title with OpenAI:", error);
        return "New Chat";
    }
}
