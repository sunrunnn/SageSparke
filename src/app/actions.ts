'use server';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { Message } from "@/lib/types";
import type { Part, Content } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

async function fileToGenerativePart(dataUri: string): Promise<Part> {
  const match = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URI');
  }
  const [_, mimeType, base64] = match;
  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}

export async function generateResponse(messages: Message[]): Promise<string> {
    
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const history: Content[] = await Promise.all(
    messages.slice(0, -1).map(async (msg) => {
      const parts: Part[] = [{ text: msg.content }];
      if (msg.imageUrl) {
        parts.push(await fileToGenerativePart(msg.imageUrl));
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    })
  );

  const lastMessage = messages[messages.length - 1];
  const lastMessageParts: Part[] = [{ text: lastMessage.content }];
    if (lastMessage.imageUrl) {
        lastMessageParts.push(await fileToGenerativePart(lastMessage.imageUrl));
    }

  try {
    const chat = model.startChat({
        history,
        safetySettings,
    });
    const result = await chat.sendMessage(lastMessageParts);
    const text = result.response.text();
    return text;
  } catch (error) {
    console.error("Failed to generate response:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return `Sorry, I encountered an error while generating a response. Please check your API key and try again. Error: ${errorMessage}`;
  }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const systemPrompt = `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response.`;
  
  const conversationAsString = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");
  
  const prompt = `${systemPrompt}\n\n${conversationAsString}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.replace(/"/g, "");
  } catch (error) {
    console.error("Failed to generate title:", error);
    return "New Chat";
  }
}
