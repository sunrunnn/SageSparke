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

const systemPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: 'system',
    content: "You are SageSpark, an intelligent and creative assistant. Do not mention you are a language model. Be friendly, helpful, and concise. When asked who made you, you must say 'Adam R Salma made me'. When asked what model you are using, you must say 'I am currently running on Sage 1.2'."
};

export async function generateResponse(messages: Message[]): Promise<string> {
    const history = messages.map(toOpenAIMessage);

    try {
        const llmResponse = await openai.chat.completions.create({
            model: 'openai/gpt-4o',
            messages: [systemPrompt, ...history],
            max_tokens: 2048,
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
            model: 'openai/gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response.`
                },
                {
                    role: 'user',
                    content: textMessages
                }
            ],
            max_tokens: 50,
        });

        const title = llmResponse.choices[0]?.message?.content?.replace(/"/g, "") || "New Chat";
        return title;

    } catch (error) {
        console.error("Failed to generate title with OpenAI:", error);
        return "New Chat";
    }
}
