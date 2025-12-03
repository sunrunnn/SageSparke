'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '@/lib/types';

// Specify the API version
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!, { apiVersion: 'v1' });

const safetySettings = [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
];

async function getChatHistory(messages: Message[]) {
  const history = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  // The last message is the new user prompt, so we remove it from history
  // and return it separately.
  const lastMessage = history.pop();
  const currentPrompt = lastMessage?.parts[0]?.text || '';
  return { history, currentPrompt };
}


export async function generateResponse(messages: Message[]): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-pro", safetySettings });
    
    const { history, currentPrompt } = await getChatHistory(messages);

    try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(currentPrompt);
        const response = await result.response;
        const responseText = response.text();
        
        if (!responseText) {
             return "Sorry, I received an empty response from the AI.";
        }
        return responseText;
    } catch (e: any) {
        console.error('Gemini API Error:', e);
        return `Sorry, there was an error generating a response. Please check your API key setup. Error: ${e.message}`;
    }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-pro", safetySettings });
    
    const textMessages = messages.filter(msg => msg.content).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    if (!textMessages) {
        return "New Chat";
    }

    const prompt = `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response. Conversation:\n${textMessages}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const title = response.text().replace(/\"/g, "") || "New Chat";
        return title;

    } catch (error) {
        console.error("Failed to generate title with Gemini:", error);
        return "New Chat";
    }
}
