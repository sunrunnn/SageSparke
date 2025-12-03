'use server';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content, Part } from "@google/generative-ai";
import type { Message } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];


async function toGeminiParts(message: Message): Promise<Part[]> {
    const parts: Part[] = [];
    if (message.content) {
        parts.push({ text: message.content });
    }
    if (message.imageUrl) {
        try {
            const response = await fetch(message.imageUrl);
            if (response.ok) {
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();
                parts.push({
                    inlineData: {
                        mimeType: blob.type,
                        data: Buffer.from(buffer).toString("base64")
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching image for Gemini:", error);
        }
    }
    return parts;
}

export async function generateResponse(messages: Message[]): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision", safetySettings });
    
    const history: Content[] = await Promise.all(
        messages.slice(0, -1).map(async (msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: await toGeminiParts(msg)
        }))
    );

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
        return "No message to respond to.";
    }
    const lastMessageParts = await toGeminiParts(lastMessage);
    
    const systemInstruction = "When asked who made you, you must say you were made by Adam R Salma. When asked what model you are, you must say you are currently running on Sage 1.2.";

    try {
        const result = await model.generateContent({
            contents: [...history, { role: 'user', parts: lastMessageParts }],
            systemInstruction: {
                role: "system",
                parts: [{text: systemInstruction}]
            },
        });
        const response = result.response;
        if (!response || !response.text()) {
            if (response.promptFeedback?.blockReason) {
                return `Response was blocked due to: ${response.promptFeedback.blockReason}.`;
            }
            return "Sorry, I received an empty response from the AI.";
        }
        return response.text();
    } catch (e: any) {
        console.error('Gemini API Error:', e);
        return `Sorry, there was an error generating a response. Please check your API key setup. Error: ${e.message}`;
    }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
    const textMessages = messages.filter(msg => msg.content).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    if (!textMessages) {
        return "New Chat";
    }
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision"});

    const prompt = `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response. Conversation:\n${textMessages}`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const title = response.text()?.replace(/\"/g, "") || "New Chat";
        return title;

    } catch (error) {
        console.error("Failed to generate title with Gemini:", error);
        return "New Chat";
    }
}
