'use server';

import OpenAI from 'openai';
import type { Message } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateResponse(messages: Message[]): Promise<string> {
    const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    const systemInstruction = "You are a helpful assistant.";

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemInstruction },
                ...history
            ],
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
             return "Sorry, I received an empty response from the AI.";
        }
        return responseText;
    } catch (e: any) {
        console.error('OpenAI API Error:', e);
        if (e instanceof OpenAI.APIError) {
             return `Sorry, there was an error generating a response. Please check your API key setup. Error: ${e.status} ${e.name}`;
        }
        return `Sorry, there was an error generating a response. Please check your API key setup. Error: ${e.message}`;
    }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
    const textMessages = messages.filter(msg => msg.content).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    if (!textMessages) {
        return "New Chat";
    }

    const prompt = `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response. Conversation:\n${textMessages}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
        });

        const title = completion.choices[0]?.message?.content?.replace(/\"/g, "") || "New Chat";
        return title;

    } catch (error) {
        console.error("Failed to generate title with OpenAI:", error);
        return "New Chat";
    }
}
